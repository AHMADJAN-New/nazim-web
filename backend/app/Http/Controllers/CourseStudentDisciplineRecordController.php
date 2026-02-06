<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStudentDisciplineRecordRequest;
use App\Http\Requests\UpdateStudentDisciplineRecordRequest;
use App\Models\CourseStudent;
use App\Models\CourseStudentDisciplineRecord;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseStudentDisciplineRecordController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {
    }

    private function getProfile($user)
    {
        return DB::table('profiles')->where('id', (string) $user->id)->first();
    }

    public function index(Request $request, string $courseStudentId)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $records = CourseStudentDisciplineRecord::where('course_student_id', $student->id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('incident_date', 'desc')
            ->get();

        return response()->json($records);
    }

    public function store(StoreStudentDisciplineRecordRequest $request, string $courseStudentId)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $validated = $request->validated();
        $validated['course_student_id'] = $student->id;
        $validated['organization_id'] = $student->organization_id;
        $validated['school_id'] = $currentSchoolId;
        $validated['course_id'] = $student->course_id;
        $validated['created_by'] = (string) $user->id;

        $record = CourseStudentDisciplineRecord::create($validated);

        // Log discipline record creation
        try {
            $studentName = $student->full_name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $record,
                description: "Created discipline record for course student {$studentName}",
                properties: [
                    'course_student_discipline_record_id' => $record->id,
                    'course_student_id' => $record->course_student_id,
                    'incident_date' => $record->incident_date,
                    'violation_type' => $record->violation_type,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log discipline record creation: ' . $e->getMessage());
        }

        return response()->json($record, 201);
    }

    public function update(UpdateStudentDisciplineRecordRequest $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        // Capture old values before update
        $oldValues = $record->only(['incident_date', 'violation_type', 'description', 'action_taken', 'resolved']);

        $payload = $request->validated();
        unset($payload['organization_id'], $payload['school_id']);
        $record->update($payload);

        // Log discipline record update
        try {
            $student = CourseStudent::find($record->course_student_id);
            $studentName = $student?->full_name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $record,
                description: "Updated discipline record for course student {$studentName}",
                properties: [
                    'course_student_discipline_record_id' => $record->id,
                    'course_student_id' => $record->course_student_id,
                    'old_values' => $oldValues,
                    'new_values' => $record->only(['incident_date', 'violation_type', 'description', 'action_taken', 'resolved']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log discipline record update: ' . $e->getMessage());
        }

        return response()->json($record);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        // Load student for logging
        $student = CourseStudent::find($record->course_student_id);

        // Log discipline record deletion
        try {
            $studentName = $student?->full_name ?? 'Unknown';
            $this->activityLogService->logDelete(
                subject: $record,
                description: "Deleted discipline record for course student {$studentName}",
                properties: [
                    'course_student_discipline_record_id' => $record->id,
                    'course_student_id' => $record->course_student_id,
                    'violation_type' => $record->violation_type,
                    'deleted_entity' => $record->toArray(),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log discipline record deletion: ' . $e->getMessage());
        }

        $record->delete();

        return response()->noContent();
    }

    public function resolve(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        $record->resolve($request->input('resolved_date'), (string) $user->id);

        return response()->json($record);
    }
}
