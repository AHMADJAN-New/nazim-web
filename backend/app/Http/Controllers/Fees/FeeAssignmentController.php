<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeAssignmentStoreRequest;
use App\Http\Requests\Fees\FeeAssignmentUpdateRequest;
use App\Models\FeeAssignment;
use App\Models\FeeStructure;
use App\Models\StudentAdmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeeAssignmentController extends Controller
{
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
            ->find($validated['fee_structure_id']);

        if (!$structure) {
            return response()->json(['error' => 'Invalid fee structure for organization'], 400);
        }

        $admission = StudentAdmission::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->find($validated['student_admission_id']);

        if (!$admission) {
            return response()->json(['error' => 'Invalid student admission for organization'], 400);
        }

        $validated['organization_id'] = $profile->organization_id;
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

        try {
            if (!$user->hasPermissionTo('fees.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$assignment) {
            return response()->json(['error' => 'Fee assignment not found'], 404);
        }

        $validated = $request->validated();

        // If fee_structure_id is being updated, validate it belongs to organization
        if (isset($validated['fee_structure_id'])) {
            $structure = FeeStructure::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
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

        $assignment->update($validated);
        $assignment->calculateRemainingAmount();
        $assignment->updateStatus();
        $assignment->save();

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

        try {
            if (!$user->hasPermissionTo('fees.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
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

