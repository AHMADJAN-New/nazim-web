<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeAssignmentStoreRequest;
use App\Http\Requests\Fees\FeeAssignmentUpdateRequest;
use App\Models\FeeAssignment;
use App\Models\FeeStructure;
use App\Models\StudentAdmission;
use App\Services\Notifications\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeeAssignmentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {
    }
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('fees.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for fees.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'student_id' => 'nullable|uuid|exists:students,id',
            'student_admission_id' => 'nullable|uuid|exists:student_admissions,id',
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'class_id' => 'nullable|uuid|exists:classes,id',
            'status' => 'nullable|in:pending,partial,paid,overdue,waived,cancelled',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->with([
                'feeStructure',
                'student',
                'studentAdmission',
                'feePayments',
                'currency',
            ]);

        foreach (['student_id', 'student_admission_id', 'academic_year_id', 'class_academic_year_id', 'class_id', 'status'] as $filter) {
            if (!empty($validated[$filter])) {
                $query->where($filter, $validated[$filter]);
            }
        }

        $query->orderBy('due_date');

        // Check if pagination is requested
        if (!empty($validated['page']) || !empty($validated['per_page'])) {
            $perPage = $validated['per_page'] ?? 25;
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function store(FeeAssignmentStoreRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('fees.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();

        // Ensure related models belong to the same organization
        $structure = FeeStructure::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['fee_structure_id']);

        if (!$structure) {
            return response()->json(['error' => 'Invalid fee structure for organization'], 400);
        }

        $admission = StudentAdmission::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['student_admission_id']);

        if (!$admission) {
            return response()->json(['error' => 'Invalid student admission for organization'], 400);
        }

        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $currentSchoolId;
        $validated['original_amount'] = $validated['original_amount'] ?? $structure->amount;
        $validated['assigned_amount'] = $validated['assigned_amount'] ?? $structure->amount;
        $validated['remaining_amount'] = $validated['assigned_amount'];
        $validated['academic_year_id'] = $validated['academic_year_id'] ?? $structure->academic_year_id;
        $validated['class_academic_year_id'] = $validated['class_academic_year_id'] ?? $structure->class_academic_year_id;
        $validated['currency_id'] = $validated['currency_id'] ?? $structure->currency_id;
        $validated['status'] = $validated['status'] ?? 'pending';

        $assignment = FeeAssignment::create($validated);
        $assignment->calculateRemainingAmount();
        $assignment->updateStatus();
        $assignment->save();

        // Load relationships for notification
        $assignment->load(['feeStructure', 'student', 'studentAdmission', 'currency']);

        // Notify about fee assignment created
        try {
            $feeStructureName = $assignment->feeStructure?->name ?? 'Fee';
            $studentName = $assignment->student?->full_name ?? 'Student';
            $amount = number_format((float) $assignment->assigned_amount, 2);
            $currencyCode = $assignment->currency?->code ?? '';
            $dueDate = $assignment->due_date ? Carbon::parse($assignment->due_date)->format('Y-m-d') : 'Not set';

            $this->notificationService->notify(
                'fee.assignment.created',
                $assignment,
                $user,
                [
                    'title' => '📋 Fee Assignment Created',
                    'body' => "Fee assignment of {$amount} {$currencyCode} created for {$studentName} ({$feeStructureName}). Due date: {$dueDate}",
                    'url' => "/fees/assignments/{$assignment->id}",
                ]
            );

            // Check if already overdue
            if ($assignment->due_date && Carbon::parse($assignment->due_date)->isPast()) {
                $this->notificationService->notify(
                    'fee.assignment.overdue',
                    $assignment,
                    $user,
                    [
                        'title' => '⚠️ Fee Overdue',
                        'body' => "Fee assignment for {$studentName} ({$feeStructureName}) is overdue. Amount: {$amount} {$currencyCode}",
                        'url' => "/fees/assignments/{$assignment->id}",
                    ]
                );
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to send fee assignment notification', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($assignment->fresh(['feeStructure', 'student', 'studentAdmission']), 201);
    }

    public function update(FeeAssignmentUpdateRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('fees.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Fee assignment not found'], 404);
        }

        $validated = $request->validated();

        // If fee_structure_id is being updated, validate it belongs to organization
        if (isset($validated['fee_structure_id'])) {
            $structure = FeeStructure::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($validated['fee_structure_id']);

            if (!$structure) {
                return response()->json(['error' => 'Invalid fee structure for organization'], 400);
            }

            // Update amounts if structure changed
            if ($assignment->fee_structure_id !== $validated['fee_structure_id']) {
                $validated['original_amount'] = $validated['original_amount'] ?? $structure->amount;
                $validated['assigned_amount'] = $validated['assigned_amount'] ?? $structure->amount;
            }
        }

        // Recalculate remaining amount if assigned_amount changed
        if (isset($validated['assigned_amount'])) {
            $validated['remaining_amount'] = $validated['assigned_amount'] - $assignment->paid_amount;
        }

        unset($validated['organization_id'], $validated['school_id']);
        
        // Track old status and due date for status change notification (before update)
        $oldStatus = $assignment->status;
        $oldDueDate = $assignment->due_date ? Carbon::parse($assignment->due_date)->toDateString() : null;
        $wasOverdue = $oldDueDate && Carbon::parse($oldDueDate)->isPast() && $oldStatus === 'overdue';
        
        $assignment->update($validated);
        $assignment->calculateRemainingAmount();
        $assignment->updateStatus();
        $assignment->save();

        // Load relationships for notification
        $assignment->load(['feeStructure', 'student', 'studentAdmission', 'currency']);

        // Notify about status changes and overdue
        try {
            $feeStructureName = $assignment->feeStructure?->name ?? 'Fee';
            $studentName = $assignment->student?->full_name ?? 'Student';
            $amount = number_format((float) $assignment->assigned_amount, 2);
            $currencyCode = $assignment->currency?->code ?? '';

            // Check if status changed
            if ($assignment->status !== $oldStatus) {
                $this->notificationService->notify(
                    'fee.assignment.status_changed',
                    $assignment,
                    $user,
                    [
                        'title' => '📊 Fee Status Changed',
                        'body' => "Fee assignment for {$studentName} ({$feeStructureName}) status changed from {$oldStatus} to {$assignment->status}.",
                        'url' => "/fees/assignments/{$assignment->id}",
                    ]
                );
            }

            // Check if fully paid
            if ($assignment->status === 'paid' && (float) $assignment->remaining_amount <= 0) {
                $this->notificationService->notify(
                    'fee.assignment.paid',
                    $assignment,
                    $user,
                    [
                        'title' => '✅ Fee Fully Paid',
                        'body' => "Fee assignment for {$studentName} ({$feeStructureName}) has been fully paid.",
                        'url' => "/fees/assignments/{$assignment->id}",
                    ]
                );
            }

            // Check if became overdue (wasn't overdue before, but is now)
            $isNowOverdue = $assignment->due_date && Carbon::parse($assignment->due_date)->isPast() && $assignment->status === 'overdue';
            if ($isNowOverdue && !$wasOverdue) {
                $this->notificationService->notify(
                    'fee.assignment.overdue',
                    $assignment,
                    $user,
                    [
                        'title' => '⚠️ Fee Overdue',
                        'body' => "Fee assignment for {$studentName} ({$feeStructureName}) is now overdue. Amount: {$amount} {$currencyCode}",
                        'url' => "/fees/assignments/{$assignment->id}",
                    ]
                );

                // Also notify using generic invoice.overdue for finance module compatibility
                $this->notificationService->notify(
                    'invoice.overdue',
                    $assignment,
                    $user,
                    [
                        'title' => '⚠️ Invoice Overdue',
                        'body' => "Fee assignment for {$studentName} ({$feeStructureName}) is overdue. Amount: {$amount} {$currencyCode}",
                        'url' => "/fees/assignments/{$assignment->id}",
                    ]
                );
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to send fee assignment notification', [
                'assignment_id' => $assignment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($assignment->fresh(['feeStructure', 'student', 'studentAdmission']));
    }

    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        try {
            if (!$user->hasPermissionTo('fees.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Fee assignment not found'], 404);
        }

        // Check if assignment has payments
        if ($assignment->feePayments()->whereNull('deleted_at')->exists()) {
            return response()->json(['error' => 'This fee assignment has payments and cannot be deleted'], 409);
        }

        $assignment->delete();

        return response()->noContent();
    }
}

