<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use App\Models\LibraryLoan;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LibraryLoanController extends Controller
{
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

        $query = LibraryLoan::with(['book', 'copy'])
            ->where('organization_id', $profile->organization_id)
            ->orderByDesc('loan_date');

        if ($request->boolean('open_only')) {
            $query->whereNull('returned_at');
        }

        if ($request->get('due_before')) {
            $query->whereDate('due_date', '<=', $request->get('due_before'));
        }

        $loans = $query->limit(200)->get();

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

        $copy = LibraryCopy::findOrFail($data['book_copy_id']);
        if ($copy->status !== 'available') {
            return response()->json(['error' => 'Copy not available'], 422);
        }

        $loan = LibraryLoan::create([
            'organization_id' => $profile->organization_id,
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

        return response()->json($loan->load(['book', 'copy']), 201);
    }

    public function returnCopy(Request $request, string $id)
    {
        $loan = LibraryLoan::findOrFail($id);
        $user = $request->user();

        try {
            if (!$user->hasPermissionTo('library_loans.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
        }

        $data = $request->validate([
            'returned_at' => 'nullable|date',
            'fee_retained' => 'nullable|numeric|min:0',
            'refunded' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $loan->update([
            'returned_at' => $data['returned_at'] ?? Carbon::now()->toDateString(),
            'fee_retained' => $data['fee_retained'] ?? $loan->fee_retained,
            'refunded' => $data['refunded'] ?? $loan->refunded,
            'notes' => $data['notes'] ?? $loan->notes,
        ]);

        $loan->copy?->update(['status' => 'available']);

        return response()->json($loan->fresh()->load(['book', 'copy']));
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

        $loans = LibraryLoan::with(['book', 'copy'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('returned_at')
            ->whereDate('due_date', '<=', $date)
            ->orderBy('due_date')
            ->get();

        return response()->json($loans);
    }
}
