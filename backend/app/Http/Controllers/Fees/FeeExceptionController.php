<?php

namespace App\Http\Controllers\Fees;

use App\Http\Controllers\Controller;
use App\Http\Requests\Fees\FeeExceptionStoreRequest;
use App\Models\FeeAssignment;
use App\Models\FeeException;
use Illuminate\Support\Facades\DB;

class FeeExceptionController extends Controller
{
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

        try {
            if (!$user->hasPermissionTo('fees.exceptions.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();

        $assignment = FeeAssignment::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->find($validated['fee_assignment_id']);

        if (!$assignment) {
            return response()->json(['error' => 'Fee assignment not found'], 404);
        }

        if ($assignment->student_id !== $validated['student_id']) {
            return response()->json(['error' => 'Exception student mismatch'], 400);
        }

        DB::transaction(function () use ($validated, $profile, $assignment) {
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

        return response()->json([
            'message' => 'Fee exception applied successfully',
            'assignment' => $assignment->fresh(['feeExceptions', 'feePayments']),
        ]);
    }
}

