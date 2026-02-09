<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use App\Services\ActivityLogService;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LibraryLoanController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService,
        private NotificationService $notificationService
    ) {
    }
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json([]);
        }

        try {
            if (!$user->hasPermissionTo('library_loans.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = LibraryLoan::with([
            'book' => function ($builder) {
                $builder->with('category');
            },
            'copy'
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->orderByDesc('loan_date');

        if ($request->boolean('open_only')) {
            $query->whereNull('returned_at');
        }

        if ($request->get('due_before')) {
            $query->whereDate('due_date', '<=', $request->get('due_before'));
        }

        $loans = $query->get();

        return response()->json($loans);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'book_id' => 'required|uuid|exists:library_books,id',
            'book_copy_id' => 'required|uuid|exists:library_copies,id',
            'student_id' => 'nullable|uuid',
            'staff_id' => 'nullable|uuid',
            'loan_date' => 'required|date',
            'due_date' => 'nullable|date',
            'deposit_amount' => 'nullable|numeric|min:0',
            'fee_retained' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('library_loans.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $copy = LibraryCopy::where('school_id', $currentSchoolId)->findOrFail($data['book_copy_id']);
        if ($copy->status !== 'available') {
            return response()->json(['error' => 'Copy not available'], 422);
        }

        // Validate book belongs to current school
        $book = LibraryBook::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($data['book_id']);
        if (!$book) {
            return response()->json(['error' => 'Book not found'], 404);
        }

        $loan = LibraryLoan::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'book_id' => $data['book_id'],
            'book_copy_id' => $data['book_copy_id'],
            'student_id' => $data['student_id'] ?? null,
            'staff_id' => $data['staff_id'] ?? null,
            'assigned_by' => $user->id,
            'loan_date' => $data['loan_date'],
            'due_date' => $data['due_date'] ?? null,
            'deposit_amount' => $data['deposit_amount'] ?? 0,
            'fee_retained' => $data['fee_retained'] ?? 0,
            'notes' => $data['notes'] ?? null,
        ]);

        $copy->update(['status' => 'loaned']);

        // Load relationships for notification
        $loan->load(['book', 'copy']);

        // Log library loan creation
        try {
            $bookTitle = $loan->book?->title ?? 'Unknown';
            $borrowerType = $loan->student_id ? 'student' : ($loan->staff_id ? 'staff' : 'unknown');
            $this->activityLogService->logCreate(
                subject: $loan,
                description: "Loaned library book {$bookTitle} to {$borrowerType}",
                properties: [
                    'library_loan_id' => $loan->id,
                    'book_id' => $loan->book_id,
                    'book_copy_id' => $loan->book_copy_id,
                    'student_id' => $loan->student_id,
                    'staff_id' => $loan->staff_id,
                    'loan_date' => $loan->loan_date,
                    'due_date' => $loan->due_date,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            \Log::warning('Failed to log library loan creation: ' . $e->getMessage());
        }

        // Notify if book is overdue or due soon
        try {
            $now = Carbon::now();
            $dueDate = $loan->due_date ? Carbon::parse($loan->due_date) : null;
            
            if ($dueDate) {
                if ($dueDate->isPast()) {
                    // Book is already overdue
                    $this->notificationService->notify(
                        'library.book_overdue',
                        $loan,
                        $user,
                        [
                            'title' => '📚 Book Overdue',
                            'body' => "The book '{$loan->book->title}' is overdue. Please return it as soon as possible.",
                            'url' => "/library/loans/{$loan->id}",
                        ]
                    );
                } elseif ($dueDate->diffInDays($now) <= 3) {
                    // Book is due within 3 days
                    $this->notificationService->notify(
                        'library.book_due_soon',
                        $loan,
                        $user,
                        [
                            'title' => '📚 Book Due Soon',
                            'body' => "The book '{$loan->book->title}' is due in {$dueDate->diffInDays($now)} day(s).",
                            'url' => "/library/loans/{$loan->id}",
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to send library loan notification', [
                'loan_id' => $loan->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($loan, 201);
    }

    public function returnCopy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('library_loans.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for library_loans.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Validate UUID format
        if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id)) {
            return response()->json(['error' => 'Invalid loan ID format'], 400);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $loan = LibraryLoan::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->first();

        if (!$loan) {
            return response()->json(['error' => 'Loan not found'], 404);
        }

        if ($loan->returned_at) {
            return response()->json(['error' => 'This loan has already been returned'], 422);
        }

        $data = $request->validate([
            'returned_at' => 'nullable|date',
            'fee_retained' => 'nullable|numeric|min:0',
            'refunded' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        try {
            // Capture old values before update
            $oldValues = $loan->only(['returned_at', 'fee_retained', 'refunded', 'notes']);

            $loan->update([
                'returned_at' => $data['returned_at'] ?? Carbon::now()->toDateString(),
                'fee_retained' => $data['fee_retained'] ?? $loan->fee_retained,
                'refunded' => $data['refunded'] ?? $loan->refunded,
                'notes' => $data['notes'] ?? $loan->notes,
            ]);

            // Update copy status to available
            if ($loan->copy) {
                $loan->copy->update(['status' => 'available']);
            }

            // Load relationships
            $loan->fresh()->load(['book', 'copy']);

            // Log library loan return
            try {
                $bookTitle = $loan->book?->title ?? 'Unknown';
                $this->activityLogService->logEvent(
                    subject: $loan,
                    event: 'library_loan_returned',
                    description: "Returned library book {$bookTitle}",
                    properties: [
                        'library_loan_id' => $loan->id,
                        'book_id' => $loan->book_id,
                        'book_copy_id' => $loan->book_copy_id,
                        'old_values' => $oldValues,
                        'new_values' => $loan->only(['returned_at', 'fee_retained', 'refunded', 'notes']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                \Log::warning('Failed to log library loan return: ' . $e->getMessage());
            }

            // Notify about return (optional - asset.returned equivalent)
            // Note: Library doesn't have a specific "returned" event, but we could add one if needed

            return response()->json($loan);
        } catch (\Exception $e) {
            \Log::error('Error returning loan: ' . $e->getMessage(), [
                'loan_id' => $id,
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to return loan. Please try again.'], 500);
        }
    }

    public function dueSoon(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json([]);
        }

        $days = (int)($request->get('days') ?? 7);
        $date = Carbon::now()->addDays($days)->toDateString();

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $loans = LibraryLoan::with([
            'book' => function ($builder) {
                $builder->with('category');
            },
            'copy'
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('returned_at')
            ->whereDate('due_date', '<=', $date)
            ->orderBy('due_date')
            ->get();

        return response()->json($loans);
    }
}
