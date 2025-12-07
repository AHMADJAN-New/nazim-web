<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStudentDisciplineRecordRequest;
use App\Http\Requests\UpdateStudentDisciplineRecordRequest;
use App\Models\CourseStudent;
use App\Models\CourseStudentDisciplineRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CourseStudentDisciplineRecordController extends Controller
{
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

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $records = CourseStudentDisciplineRecord::where('course_student_id', $student->id)
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

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $student = CourseStudent::where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->find($courseStudentId);

        if (!$student) {
            return response()->json(['error' => 'Course student not found'], 404);
        }

        $validated = $request->validated();
        $validated['course_student_id'] = $student->id;
        $validated['organization_id'] = $student->organization_id;
        $validated['course_id'] = $student->course_id;
        $validated['created_by'] = (string) $user->id;

        $record = CourseStudentDisciplineRecord::create($validated);

        return response()->json($record, 201);
    }

    public function update(UpdateStudentDisciplineRecordRequest $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        $record->update($request->validated());

        return response()->json($record);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = $this->getProfile($user);

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
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

        try {
            if (!$user->hasPermissionTo('course_student_discipline_records.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('[CourseStudentDisciplineRecordController] permission check failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $record = CourseStudentDisciplineRecord::whereNull('deleted_at')
            ->find($id);

        if (!$record || $record->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Record not found'], 404);
        }

        $record->resolve($request->input('resolved_date'), (string) $user->id);

        return response()->json($record);
    }
}
