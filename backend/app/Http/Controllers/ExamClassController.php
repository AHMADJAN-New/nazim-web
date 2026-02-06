<?php

namespace App\Http\Controllers;

use App\Models\ExamClass;
use App\Models\Exam;
use App\Models\ClassAcademicYear;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamClassController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
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
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = ExamClass::with(['classAcademicYear.class', 'classAcademicYear.academicYear'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);
        $query->whereHas('exam', function ($q) use ($currentSchoolId) {
            $q->where('school_id', $currentSchoolId);
        });

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        $examClasses = $query->orderBy('created_at', 'desc')->get();

        return response()->json($examClasses);
    }

    public function store(Request $request)
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'exam_id' => 'required|uuid|exists:exams,id',
            'class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $validated['exam_id'])
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $classAcademicYear = ClassAcademicYear::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['class_academic_year_id']);
        if (!$classAcademicYear) {
            return response()->json(['error' => 'Class academic year not found in your organization'], 403);
        }

        if ($classAcademicYear->academic_year_id !== $exam->academic_year_id) {
            return response()->json(['error' => 'Class must belong to the same academic year as the exam'], 422);
        }

        $existing = ExamClass::where('exam_id', $exam->id)
            ->where('class_academic_year_id', $validated['class_academic_year_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Class already assigned to this exam'], 422);
        }

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $validated['class_academic_year_id'],
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
        ]);

        $examClass->load(['classAcademicYear.class', 'classAcademicYear.academicYear', 'exam']);

        // Log exam class assignment
        try {
            $examName = $examClass->exam?->name ?? 'Unknown';
            $className = $examClass->classAcademicYear?->class?->name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $examClass,
                description: "Assigned class {$className} to exam {$examName}",
                properties: [
                    'exam_class_id' => $examClass->id,
                    'exam_id' => $examClass->exam_id,
                    'class_academic_year_id' => $examClass->class_academic_year_id,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam class assignment: ' . $e->getMessage());
        }

        return response()->json($examClass, 201);
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examClass = ExamClass::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        $schoolOk = Exam::where('id', $examClass->exam_id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->exists();
        if (!$schoolOk) {
            return response()->json(['error' => 'Exam class not found'], 404);
        }

        // Load relationships for logging
        $examClass->load(['classAcademicYear.class', 'exam']);

        // Log exam class removal
        try {
            $examName = $examClass->exam?->name ?? 'Unknown';
            $className = $examClass->classAcademicYear?->class?->name ?? 'Unknown';
            $this->activityLogService->logDelete(
                subject: $examClass,
                description: "Removed class {$className} from exam {$examName}",
                properties: [
                    'exam_class_id' => $examClass->id,
                    'exam_id' => $examClass->exam_id,
                    'class_academic_year_id' => $examClass->class_academic_year_id,
                    'deleted_entity' => $examClass->toArray(),
                ],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log exam class removal: ' . $e->getMessage());
        }

        $examClass->delete();

        return response()->noContent();
    }
}
