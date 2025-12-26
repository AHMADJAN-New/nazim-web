<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeExceptionStoreRequest;
use App\Http\Requests\Fees\FeeExceptionUpdateRequest;
use App\Models\FeeAssignment;
use App\Models\FeeException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeeExceptionController extends Controller
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
            'academic_year_id' => 'nullable|uuid|exists:academic_years,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'student_id' => 'nullable|uuid|exists:students,id',
            'fee_assignment_id' => 'nullable|uuid|exists:fee_assignments,id',
            'exception_type' => 'nullable|in:discount_percentage,discount_fixed,waiver,custom',
            'is_active' => 'nullable|boolean',
        ]);

        $query = FeeException::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->with([
                'feeAssignment.feeStructure',
                'feeAssignment.classAcademicYear.class',
                'student',
                'approvedBy',
            ]);

        // Strict school scoping via fee assignment (fee_exceptions table has no school_id column)
        $query->whereHas('feeAssignment', function ($q) use ($currentSchoolId) {
            $q->where('school_id', $currentSchoolId);
        });

        // Filter by academic year through fee assignment
        if (!empty($validated['academic_year_id'])) {
            $query->whereHas('feeAssignment', function ($q) use ($validated) {
                $q->where('academic_year_id', $validated['academic_year_id']);
            });
        }

        // Filter by class academic year through fee assignment
        if (!empty($validated['class_academic_year_id'])) {
            $query->whereHas('feeAssignment', function ($q) use ($validated) {
                $q->where('class_academic_year_id', $validated['class_academic_year_id']);
            });
        }

        if (!empty($validated['student_id'])) {
            $query->where('student_id', $validated['student_id']);
        }

        if (!empty($validated['fee_assignment_id'])) {
            $query->where('fee_assignment_id', $validated['fee_assignment_id']);
        }

        if (isset($validated['exception_type'])) {
            $query->where('exception_type', $validated['exception_type']);
        }

        if (isset($validated['is_active'])) {
            $query->where('is_active', $validated['is_active']);
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->get());
    }

    public function show(Request $request, string $id)
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

        $exception = FeeException::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->with([
                'feeAssignment.feeStructure',
                'feeAssignment.classAcademicYear.class',
                'student',
                'approvedBy',
            ])
            ->find($id);

        if (!$exception) {
            return response()->json(['error' => 'Fee exception not found'], 404);
        }

        if (!$exception->relationLoaded('feeAssignment')) {
            $exception->load('feeAssignment');
        }
        if (!$exception->feeAssignment || $exception->feeAssignment->school_id !== $currentSchoolId) {
            return response()->json(['error' => 'Fee exception not found'], 404);
        }

        return response()->json($exception);
    }

    public function store(FeeExceptionStoreRequest $request)
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
            \Log::warning("Permission check failed for fees.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['fee_assignment_id']);

        if (!$assignment) {
            return response()->json(['error' => 'Fee assignment not found'], 404);
        }

        if ($assignment->student_id !== $validated['student_id']) {
            return response()->json(['error' => 'Exception student mismatch'], 400);
        }

        $exception = null;
        DB::transaction(function () use ($validated, $profile, $assignment, &$exception) {
            $exception = FeeException::create([
                'organization_id' => $profile->organization_id,
                'fee_assignment_id' => $assignment->id,
                'student_id' => $assignment->student_id,
                'exception_type' => $validated['exception_type'],
                'exception_amount' => $validated['exception_amount'],
                'exception_reason' => $validated['exception_reason'],
                'approved_by_user_id' => $validated['approved_by_user_id'],
                'approved_at' => $validated['approved_at'] ?? now(),
                'valid_from' => $validated['valid_from'],
                'valid_to' => $validated['valid_to'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'notes' => $validated['notes'] ?? null,
            ]);

            $assignment->applyException(
                $exception->exception_type,
                (float) $exception->exception_amount,
                $exception->exception_reason,
                $exception->approved_by_user_id,
                $exception->approved_at ? $exception->approved_at->toDateTimeString() : null
            );

            $assignment->save();
        });

        return response()->json($exception->fresh([
            'feeAssignment.feeStructure',
            'feeAssignment.classAcademicYear.class',
            'student',
            'approvedBy',
        ]), 201);
    }

    public function update(FeeExceptionUpdateRequest $request, string $id)
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
            \Log::warning("Permission check failed for fees.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exception = FeeException::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$exception) {
            return response()->json(['error' => 'Fee exception not found'], 404);
        }

        $validated = $request->validated();

        // If fee_assignment_id is being updated, validate it
        if (isset($validated['fee_assignment_id'])) {
            $assignment = FeeAssignment::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->find($validated['fee_assignment_id']);

            if (!$assignment) {
                return response()->json(['error' => 'Fee assignment not found'], 404);
            }

            // If student_id is also provided, validate it matches
            if (isset($validated['student_id']) && $assignment->student_id !== $validated['student_id']) {
                return response()->json(['error' => 'Exception student mismatch'], 400);
            }
        }

        $exception->update($validated);

        return response()->json($exception->fresh([
            'feeAssignment.feeStructure',
            'feeAssignment.classAcademicYear.class',
            'student',
            'approvedBy',
        ]));
    }

    public function destroy(Request $request, string $id)
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
            if (!$user->hasPermissionTo('fees.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for fees.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $exception = FeeException::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->find($id);

        if (!$exception) {
            return response()->json(['error' => 'Fee exception not found'], 404);
        }

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($exception->fee_assignment_id);
        if (!$assignment) {
            return response()->json(['error' => 'Fee exception not found'], 404);
        }

        // Soft delete
        $exception->delete();

        return response()->noContent();
    }
}

