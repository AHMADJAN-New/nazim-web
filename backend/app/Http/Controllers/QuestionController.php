<?php

namespace App\Http\Controllers;

use App\Models\Question;
use App\Models\Subject;
use App\Models\ClassAcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class QuestionController extends Controller
{
    /**
     * Get all questions for the organization/school
     */
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
            if (!$user->hasPermissionTo('exams.questions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $query = Question::with(['subject', 'classAcademicYear.class', 'classAcademicYear.academicYear', 'creator'])
                ->whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            // Filter by school_id (required)
            if ($request->filled('school_id')) {
                $query->where('school_id', $request->school_id);
            }

            // Filter by subject_id
            if ($request->filled('subject_id')) {
                $query->where('subject_id', $request->subject_id);
            }

            // Filter by class_academic_year_id
            if ($request->filled('class_academic_year_id')) {
                if ($request->class_academic_year_id === 'null' || $request->class_academic_year_id === 'generic') {
                    $query->whereNull('class_academic_year_id');
                } else {
                    $query->compatibleWithClassAcademicYear($request->class_academic_year_id);
                }
            }

            // Filter by type
            if ($request->filled('type')) {
                $query->where('type', $request->type);
            }

            // Filter by difficulty
            if ($request->filled('difficulty')) {
                $query->where('difficulty', $request->difficulty);
            }

            // Filter by active status
            if ($request->filled('is_active')) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            }

            // Search
            if ($request->filled('search')) {
                $query->search($request->search);
            }

            // Pagination
            $perPage = min((int) ($request->per_page ?? 50), 100);
            $questions = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json($questions);
        } catch (\Exception $e) {
            Log::error('Error fetching questions: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json(['error' => 'Failed to fetch questions: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific question
     */
    public function show(string $id)
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
            if (!$user->hasPermissionTo('exams.questions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $question = Question::with(['subject', 'classAcademicYear.class', 'classAcademicYear.academicYear', 'creator', 'updater'])
            ->where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        return response()->json($question);
    }

    /**
     * Create a new question
     */
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
            if (!$user->hasPermissionTo('exams.questions.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'school_id' => 'required|uuid|exists:school_branding,id',
            'subject_id' => 'required|uuid|exists:subjects,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'type' => ['required', 'string', Rule::in(Question::TYPES)],
            'difficulty' => ['sometimes', 'string', Rule::in(Question::DIFFICULTIES)],
            'marks' => 'sometimes|numeric|min:0.01|max:1000',
            'text' => 'required|string|max:10000',
            'text_rtl' => 'sometimes|boolean',
            'options' => 'nullable|array|max:6',
            'options.*.id' => 'required_with:options|string',
            'options.*.label' => 'sometimes|string|max:10',
            'options.*.text' => 'required_with:options|string|max:1000',
            'options.*.is_correct' => 'sometimes|boolean',
            'correct_answer' => 'nullable|string|max:5000',
            'reference' => 'nullable|string|max:255',
            'tags' => 'nullable|array|max:20',
            'tags.*' => 'string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        // Validate subject belongs to organization
        $subject = Subject::find($validated['subject_id']);
        if ($subject && $subject->organization_id && $subject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Subject does not belong to your organization'], 403);
        }

        // Validate class_academic_year belongs to organization if provided
        if (!empty($validated['class_academic_year_id'])) {
            $classAcademicYear = ClassAcademicYear::find($validated['class_academic_year_id']);
            if ($classAcademicYear && $classAcademicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Class academic year does not belong to your organization'], 403);
            }
        }

        // Validate options for MCQ/True-False
        if (in_array($validated['type'], [Question::TYPE_MCQ, Question::TYPE_TRUE_FALSE])) {
            $options = $validated['options'] ?? [];
            if (count($options) < 2) {
                return response()->json(['error' => 'At least 2 options are required for MCQ/True-False questions'], 422);
            }
            if ($validated['type'] === Question::TYPE_MCQ) {
                $correctCount = collect($options)->filter(fn($o) => !empty($o['is_correct']))->count();
                if ($correctCount !== 1) {
                    return response()->json(['error' => 'MCQ questions must have exactly one correct option'], 422);
                }
            }
        }

        $question = Question::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $validated['school_id'],
            'subject_id' => $validated['subject_id'],
            'class_academic_year_id' => $validated['class_academic_year_id'] ?? null,
            'type' => $validated['type'],
            'difficulty' => $validated['difficulty'] ?? Question::DIFFICULTY_MEDIUM,
            'marks' => $validated['marks'] ?? 1,
            'text' => $validated['text'],
            'text_rtl' => $validated['text_rtl'] ?? false,
            'options' => $validated['options'] ?? null,
            'correct_answer' => $validated['correct_answer'] ?? null,
            'reference' => $validated['reference'] ?? null,
            'tags' => $validated['tags'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $user->id,
        ]);

        $question->load(['subject', 'classAcademicYear.class', 'classAcademicYear.academicYear', 'creator']);

        return response()->json($question, 201);
    }

    /**
     * Update a question
     */
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
            if (!$user->hasPermissionTo('exams.questions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $question = Question::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        $validated = $request->validate([
            'subject_id' => 'sometimes|required|uuid|exists:subjects,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'type' => ['sometimes', 'required', 'string', Rule::in(Question::TYPES)],
            'difficulty' => ['sometimes', 'string', Rule::in(Question::DIFFICULTIES)],
            'marks' => 'sometimes|numeric|min:0.01|max:1000',
            'text' => 'sometimes|required|string|max:10000',
            'text_rtl' => 'sometimes|boolean',
            'options' => 'nullable|array|max:6',
            'options.*.id' => 'required_with:options|string',
            'options.*.label' => 'sometimes|string|max:10',
            'options.*.text' => 'required_with:options|string|max:1000',
            'options.*.is_correct' => 'sometimes|boolean',
            'correct_answer' => 'nullable|string|max:5000',
            'reference' => 'nullable|string|max:255',
            'tags' => 'nullable|array|max:20',
            'tags.*' => 'string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        // Validate subject if being changed
        if (isset($validated['subject_id'])) {
            $subject = Subject::find($validated['subject_id']);
            if ($subject && $subject->organization_id && $subject->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Subject does not belong to your organization'], 403);
            }
        }

        // Validate class_academic_year if provided
        if (array_key_exists('class_academic_year_id', $validated) && $validated['class_academic_year_id'] !== null) {
            $classAcademicYear = ClassAcademicYear::find($validated['class_academic_year_id']);
            if ($classAcademicYear && $classAcademicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Class academic year does not belong to your organization'], 403);
            }
        }

        // Validate options for MCQ/True-False
        $type = $validated['type'] ?? $question->type;
        if (in_array($type, [Question::TYPE_MCQ, Question::TYPE_TRUE_FALSE])) {
            $options = $validated['options'] ?? $question->options ?? [];
            if (count($options) < 2) {
                return response()->json(['error' => 'At least 2 options are required for MCQ/True-False questions'], 422);
            }
            if ($type === Question::TYPE_MCQ) {
                $correctCount = collect($options)->filter(fn($o) => !empty($o['is_correct']))->count();
                if ($correctCount !== 1) {
                    return response()->json(['error' => 'MCQ questions must have exactly one correct option'], 422);
                }
            }
        }

        // Update the question
        $validated['updated_by'] = $user->id;
        $question->fill($validated);
        $question->save();

        $question->load(['subject', 'classAcademicYear.class', 'classAcademicYear.academicYear', 'creator', 'updater']);

        return response()->json($question);
    }

    /**
     * Delete a question (soft delete)
     */
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
            if (!$user->hasPermissionTo('exams.questions.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $question = Question::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        // Check if question is used in any exam paper
        $usedInPapers = DB::table('exam_paper_items')
            ->where('question_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($usedInPapers) {
            return response()->json([
                'error' => 'This question is used in one or more exam papers and cannot be deleted. Deactivate it instead.',
                'in_use' => true
            ], 409);
        }

        $question->deleted_by = $user->id;
        $question->save();
        $question->delete();

        return response()->noContent();
    }

    /**
     * Duplicate a question
     */
    public function duplicate(string $id)
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
            if (!$user->hasPermissionTo('exams.questions.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $original = Question::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$original) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        $duplicate = $original->replicate();
        $duplicate->id = null;
        $duplicate->created_by = $user->id;
        $duplicate->updated_by = null;
        $duplicate->deleted_by = null;
        $duplicate->created_at = now();
        $duplicate->updated_at = now();
        $duplicate->save();

        $duplicate->load(['subject', 'classAcademicYear.class', 'classAcademicYear.academicYear', 'creator']);

        return response()->json($duplicate, 201);
    }

    /**
     * Bulk update questions (activate/deactivate)
     */
    public function bulkUpdate(Request $request)
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
            if (!$user->hasPermissionTo('exams.questions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.questions.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'question_ids' => 'required|array|min:1|max:100',
            'question_ids.*' => 'required|uuid',
            'is_active' => 'required|boolean',
        ]);

        $updatedCount = Question::where('organization_id', $profile->organization_id)
            ->whereIn('id', $validated['question_ids'])
            ->whereNull('deleted_at')
            ->update([
                'is_active' => $validated['is_active'],
                'updated_by' => $user->id,
                'updated_at' => now(),
            ]);

        return response()->json([
            'message' => 'Questions updated successfully',
            'updated_count' => $updatedCount,
        ]);
    }
}
