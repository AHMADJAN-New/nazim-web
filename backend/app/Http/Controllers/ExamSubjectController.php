<?php

namespace App\Http\Controllers;

use App\Models\ExamSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ClassSubject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamSubjectController extends Controller
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
            if (!$user->hasPermissionTo('exams.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = ExamSubject::with(['subject', 'classSubject.classAcademicYear', 'examClass'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);

        if ($request->filled('exam_id')) {
            $query->where('exam_id', $request->exam_id);
        }

        if ($request->filled('exam_class_id')) {
            $query->where('exam_class_id', $request->exam_class_id);
        }

        $subjects = $query->orderBy('created_at', 'desc')->get();

        return response()->json($subjects);
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
            'exam_class_id' => 'required|uuid|exists:exam_classes,id',
            'class_subject_id' => 'required|uuid|exists:class_subjects,id',
            'total_marks' => 'nullable|integer|min:0',
            'passing_marks' => 'nullable|integer|min:0',
            'scheduled_at' => 'nullable|date',
        ]);

        $exam = Exam::where('organization_id', $profile->organization_id)
            ->where('id', $validated['exam_id'])
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $examClass = ExamClass::where('organization_id', $profile->organization_id)
            ->where('id', $validated['exam_class_id'])
            ->where('exam_id', $exam->id)
            ->first();

        if (!$examClass) {
            return response()->json(['error' => 'Class not linked to this exam'], 422);
        }

        $classSubject = ClassSubject::with('classAcademicYear')->find($validated['class_subject_id']);
        if (!$classSubject || $classSubject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Class subject not found in your organization'], 403);
        }

        if ($classSubject->class_academic_year_id !== $examClass->class_academic_year_id) {
            return response()->json(['error' => 'Subject must belong to the selected exam class'], 422);
        }

        $existing = ExamSubject::where('exam_class_id', $examClass->id)
            ->where('class_subject_id', $validated['class_subject_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Subject already enrolled for this exam class'], 422);
        }

        $examSubject = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $validated['class_subject_id'],
            'subject_id' => $classSubject->subject_id,
            'organization_id' => $profile->organization_id,
            'total_marks' => $validated['total_marks'] ?? null,
            'passing_marks' => $validated['passing_marks'] ?? null,
            'scheduled_at' => $validated['scheduled_at'] ?? null,
        ]);

        $examSubject->load(['subject', 'classSubject', 'examClass']);

        return response()->json($examSubject, 201);
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examSubject = ExamSubject::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        $examSubject->delete();

        return response()->json(['message' => 'Subject removed from exam']);
    }

    public function update(Request $request, string $id)
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
            if (!$user->hasPermissionTo('exams.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $examSubject = ExamSubject::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        $validated = $request->validate([
            'total_marks' => 'nullable|integer|min:0',
            'passing_marks' => 'nullable|integer|min:0',
            'scheduled_at' => 'nullable|date',
        ]);

        $examSubject->fill($validated);
        $examSubject->save();

        $examSubject->load(['subject', 'classSubject', 'examClass']);

        return response()->json($examSubject);
    }
}
