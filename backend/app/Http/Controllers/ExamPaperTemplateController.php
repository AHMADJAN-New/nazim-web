<?php

namespace App\Http\Controllers;

use App\Models\ExamPaperTemplate;
use App\Models\ExamPaperItem;
use App\Models\Question;
use App\Models\Exam;
use App\Models\ExamSubject;
use App\Models\Subject;
use App\Models\ClassAcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class ExamPaperTemplateController extends Controller
{
    /**
     * Get all exam paper templates for the organization/school
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
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        try {
            $query = ExamPaperTemplate::with([
                'subject',
                'exam',
                'examSubject.subject',
                'classAcademicYear.class',
                'classAcademicYear.academicYear',
                'creator',
            ])
                ->withCount('items')
                ->whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id);

            // Filter by school_id
            if ($request->filled('school_id')) {
                $query->where('school_id', $request->school_id);
            }

            // Filter by exam_id
            if ($request->filled('exam_id')) {
                if ($request->exam_id === 'null' || $request->exam_id === 'generic') {
                    $query->whereNull('exam_id');
                } else {
                    $query->where('exam_id', $request->exam_id);
                }
            }

            // Filter by exam_subject_id
            if ($request->filled('exam_subject_id')) {
                $query->where('exam_subject_id', $request->exam_subject_id);
            }

            // Filter by subject_id
            if ($request->filled('subject_id')) {
                $query->where('subject_id', $request->subject_id);
            }

            // Filter by class_academic_year_id
            if ($request->filled('class_academic_year_id')) {
                if ($request->class_academic_year_id === 'null') {
                    $query->whereNull('class_academic_year_id');
                } else {
                    $query->where('class_academic_year_id', $request->class_academic_year_id);
                }
            }

            // Filter by is_default_for_exam_subject
            if ($request->filled('is_default')) {
                $query->where('is_default_for_exam_subject', filter_var($request->is_default, FILTER_VALIDATE_BOOLEAN));
            }

            // Filter by active status
            if ($request->filled('is_active')) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            }

            $templates = $query->orderBy('created_at', 'desc')->get();

            return response()->json($templates);
        } catch (\Exception $e) {
            Log::error('Error fetching exam paper templates: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json(['error' => 'Failed to fetch templates: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific template with all items
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
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ExamPaperTemplate::with([
            'subject',
            'exam',
            'examSubject.subject',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'school',
            'creator',
            'updater',
            'items' => function ($query) {
                $query->with(['question.subject'])
                    ->orderBy('section_label')
                    ->orderBy('position');
            },
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Add computed total marks
        $template->computed_total_marks = $template->calculateTotalMarks();
        $template->has_marks_discrepancy = $template->hasMarksDiscrepancy();

        return response()->json($template);
    }

    /**
     * Create a new exam paper template
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
            if (!$user->hasPermissionTo('exams.papers.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'school_id' => 'required|uuid|exists:school_branding,id',
            'exam_id' => 'nullable|uuid|exists:exams,id',
            'exam_subject_id' => 'nullable|uuid|exists:exam_subjects,id',
            'subject_id' => 'required|uuid|exists:subjects,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'title' => 'required|string|max:255',
            'language' => ['sometimes', 'string', Rule::in(ExamPaperTemplate::LANGUAGES)],
            'total_marks' => 'nullable|numeric|min:0|max:10000',
            'duration_minutes' => 'nullable|integer|min:1|max:600',
            'header_html' => 'nullable|string|max:10000',
            'footer_html' => 'nullable|string|max:5000',
            'instructions' => 'nullable|string|max:10000',
            'is_default_for_exam_subject' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        // Validate subject belongs to organization
        $subject = Subject::find($validated['subject_id']);
        if ($subject && $subject->organization_id && $subject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Subject does not belong to your organization'], 403);
        }

        // Validate exam if provided
        if (!empty($validated['exam_id'])) {
            $exam = Exam::find($validated['exam_id']);
            if ($exam && $exam->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Exam does not belong to your organization'], 403);
            }
        }

        // Validate exam_subject if provided
        if (!empty($validated['exam_subject_id'])) {
            $examSubject = ExamSubject::find($validated['exam_subject_id']);
            if (!$examSubject) {
                return response()->json(['error' => 'Exam subject not found'], 404);
            }
            if ($examSubject->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Exam subject does not belong to your organization'], 403);
            }
            // Ensure subject_id matches exam_subject's subject
            if ($examSubject->subject_id !== $validated['subject_id']) {
                return response()->json(['error' => 'Subject ID must match the exam subject\'s subject'], 422);
            }
        }

        // Validate class_academic_year if provided
        if (!empty($validated['class_academic_year_id'])) {
            $classAcademicYear = ClassAcademicYear::find($validated['class_academic_year_id']);
            if ($classAcademicYear && $classAcademicYear->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Class academic year does not belong to your organization'], 403);
            }
        }

        // If setting as default, unset other defaults for this exam_subject
        if (!empty($validated['is_default_for_exam_subject']) && !empty($validated['exam_subject_id'])) {
            ExamPaperTemplate::where('exam_subject_id', $validated['exam_subject_id'])
                ->where('is_default_for_exam_subject', true)
                ->whereNull('deleted_at')
                ->update(['is_default_for_exam_subject' => false, 'updated_by' => $user->id]);
        }

        $template = ExamPaperTemplate::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $validated['school_id'],
            'exam_id' => $validated['exam_id'] ?? null,
            'exam_subject_id' => $validated['exam_subject_id'] ?? null,
            'subject_id' => $validated['subject_id'],
            'class_academic_year_id' => $validated['class_academic_year_id'] ?? null,
            'title' => $validated['title'],
            'language' => $validated['language'] ?? ExamPaperTemplate::LANGUAGE_ENGLISH,
            'total_marks' => $validated['total_marks'] ?? null,
            'duration_minutes' => $validated['duration_minutes'] ?? null,
            'header_html' => $validated['header_html'] ?? null,
            'footer_html' => $validated['footer_html'] ?? null,
            'instructions' => $validated['instructions'] ?? null,
            'is_default_for_exam_subject' => $validated['is_default_for_exam_subject'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => $user->id,
        ]);

        $template->load([
            'subject',
            'exam',
            'examSubject.subject',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'creator',
        ]);

        return response()->json($template, 201);
    }

    /**
     * Update a template
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
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ExamPaperTemplate::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'exam_id' => 'nullable|uuid|exists:exams,id',
            'exam_subject_id' => 'nullable|uuid|exists:exam_subjects,id',
            'subject_id' => 'sometimes|required|uuid|exists:subjects,id',
            'class_academic_year_id' => 'nullable|uuid|exists:class_academic_years,id',
            'title' => 'sometimes|required|string|max:255',
            'language' => ['sometimes', 'string', Rule::in(ExamPaperTemplate::LANGUAGES)],
            'total_marks' => 'nullable|numeric|min:0|max:10000',
            'duration_minutes' => 'nullable|integer|min:1|max:600',
            'header_html' => 'nullable|string|max:10000',
            'footer_html' => 'nullable|string|max:5000',
            'instructions' => 'nullable|string|max:10000',
            'is_default_for_exam_subject' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        // Validate subject if changed
        if (isset($validated['subject_id'])) {
            $subject = Subject::find($validated['subject_id']);
            if ($subject && $subject->organization_id && $subject->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Subject does not belong to your organization'], 403);
            }
        }

        // Validate exam if provided
        if (array_key_exists('exam_id', $validated) && $validated['exam_id'] !== null) {
            $exam = Exam::find($validated['exam_id']);
            if ($exam && $exam->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Exam does not belong to your organization'], 403);
            }
        }

        // Validate exam_subject if provided
        if (array_key_exists('exam_subject_id', $validated) && $validated['exam_subject_id'] !== null) {
            $examSubject = ExamSubject::find($validated['exam_subject_id']);
            if ($examSubject && $examSubject->organization_id !== $profile->organization_id) {
                return response()->json(['error' => 'Exam subject does not belong to your organization'], 403);
            }
        }

        // If setting as default, unset other defaults
        $examSubjectId = $validated['exam_subject_id'] ?? $template->exam_subject_id;
        if (!empty($validated['is_default_for_exam_subject']) && $examSubjectId) {
            ExamPaperTemplate::where('exam_subject_id', $examSubjectId)
                ->where('id', '!=', $id)
                ->where('is_default_for_exam_subject', true)
                ->whereNull('deleted_at')
                ->update(['is_default_for_exam_subject' => false, 'updated_by' => $user->id]);
        }

        $validated['updated_by'] = $user->id;
        $template->fill($validated);
        $template->save();

        $template->load([
            'subject',
            'exam',
            'examSubject.subject',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'creator',
            'updater',
        ]);

        return response()->json($template);
    }

    /**
     * Delete a template (soft delete)
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
            if (!$user->hasPermissionTo('exams.papers.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ExamPaperTemplate::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Soft delete all items first
        ExamPaperItem::where('exam_paper_template_id', $id)
            ->whereNull('deleted_at')
            ->update([
                'deleted_by' => $user->id,
                'deleted_at' => now(),
            ]);

        $template->deleted_by = $user->id;
        $template->save();
        $template->delete();

        return response()->noContent();
    }

    /**
     * Add a question to a template
     */
    public function addItem(Request $request, string $id)
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
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ExamPaperTemplate::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'question_id' => 'required|uuid|exists:questions,id',
            'section_label' => 'nullable|string|max:50',
            'position' => 'nullable|integer|min:0',
            'marks_override' => 'nullable|numeric|min:0|max:1000',
            'is_mandatory' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Validate question belongs to same organization and school
        $question = Question::where('id', $validated['question_id'])
            ->whereNull('deleted_at')
            ->first();

        if (!$question) {
            return response()->json(['error' => 'Question not found'], 404);
        }

        if ($question->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Question does not belong to your organization'], 403);
        }

        if ($question->school_id !== $template->school_id) {
            return response()->json(['error' => 'Question must belong to the same school as the template'], 403);
        }

        // Check if question already exists in template
        $exists = ExamPaperItem::where('exam_paper_template_id', $id)
            ->where('question_id', $validated['question_id'])
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'This question is already in the template'], 422);
        }

        // Get next position if not provided
        if (!isset($validated['position'])) {
            $maxPosition = ExamPaperItem::where('exam_paper_template_id', $id)
                ->whereNull('deleted_at')
                ->max('position') ?? -1;
            $validated['position'] = $maxPosition + 1;
        }

        $item = ExamPaperItem::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $template->school_id,
            'exam_paper_template_id' => $id,
            'question_id' => $validated['question_id'],
            'section_label' => $validated['section_label'] ?? null,
            'position' => $validated['position'],
            'marks_override' => $validated['marks_override'] ?? null,
            'is_mandatory' => $validated['is_mandatory'] ?? true,
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        $item->load(['question.subject']);

        return response()->json($item, 201);
    }

    /**
     * Update an item in a template
     */
    public function updateItem(Request $request, string $id, string $itemId)
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
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $item = ExamPaperItem::where('organization_id', $profile->organization_id)
            ->where('exam_paper_template_id', $id)
            ->where('id', $itemId)
            ->whereNull('deleted_at')
            ->first();

        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        $validated = $request->validate([
            'section_label' => 'nullable|string|max:50',
            'position' => 'nullable|integer|min:0',
            'marks_override' => 'nullable|numeric|min:0|max:1000',
            'is_mandatory' => 'sometimes|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['updated_by'] = $user->id;
        $item->fill($validated);
        $item->save();

        $item->load(['question.subject']);

        return response()->json($item);
    }

    /**
     * Remove an item from a template
     */
    public function removeItem(string $id, string $itemId)
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
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $item = ExamPaperItem::where('organization_id', $profile->organization_id)
            ->where('exam_paper_template_id', $id)
            ->where('id', $itemId)
            ->whereNull('deleted_at')
            ->first();

        if (!$item) {
            return response()->json(['error' => 'Item not found'], 404);
        }

        $item->deleted_by = $user->id;
        $item->save();
        $item->delete();

        return response()->noContent();
    }

    /**
     * Reorder items in a template
     */
    public function reorderItems(Request $request, string $id)
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
            if (!$user->hasPermissionTo('exams.papers.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ExamPaperTemplate::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|uuid',
            'items.*.position' => 'required|integer|min:0',
            'items.*.section_label' => 'nullable|string|max:50',
        ]);

        foreach ($validated['items'] as $itemData) {
            ExamPaperItem::where('id', $itemData['id'])
                ->where('exam_paper_template_id', $id)
                ->whereNull('deleted_at')
                ->update([
                    'position' => $itemData['position'],
                    'section_label' => $itemData['section_label'] ?? null,
                    'updated_by' => $user->id,
                    'updated_at' => now(),
                ]);
        }

        return response()->json(['message' => 'Items reordered successfully']);
    }

    /**
     * Duplicate a template
     */
    public function duplicate(Request $request, string $id)
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
            if (!$user->hasPermissionTo('exams.papers.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $original = ExamPaperTemplate::with('items')
            ->where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$original) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Duplicate template
        $duplicate = $original->replicate();
        $duplicate->id = null;
        $duplicate->title = $original->title . ' (Copy)';
        $duplicate->is_default_for_exam_subject = false; // Don't copy default status
        $duplicate->created_by = $user->id;
        $duplicate->updated_by = null;
        $duplicate->deleted_by = null;
        $duplicate->created_at = now();
        $duplicate->updated_at = now();
        $duplicate->save();

        // Duplicate items
        foreach ($original->items as $item) {
            $newItem = $item->replicate();
            $newItem->id = null;
            $newItem->exam_paper_template_id = $duplicate->id;
            $newItem->created_by = $user->id;
            $newItem->updated_by = null;
            $newItem->deleted_by = null;
            $newItem->created_at = now();
            $newItem->updated_at = now();
            $newItem->save();
        }

        $duplicate->load([
            'subject',
            'exam',
            'examSubject.subject',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'creator',
            'items.question.subject',
        ]);

        return response()->json($duplicate, 201);
    }

    /**
     * Get paper completeness stats for an exam
     */
    public function examPaperStats(string $examId)
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
            if (!$user->hasPermissionTo('exams.papers.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for exams.papers.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get exam
        $exam = Exam::where('id', $examId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$exam) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        // Get all exam subjects
        $examSubjects = ExamSubject::with(['subject', 'examClass.classAcademicYear.class'])
            ->where('exam_id', $examId)
            ->whereNull('deleted_at')
            ->get();

        $totalSubjects = $examSubjects->count();
        $subjectsWithTemplate = 0;
        $subjectDetails = [];

        foreach ($examSubjects as $examSubject) {
            $hasDefaultTemplate = ExamPaperTemplate::where('exam_subject_id', $examSubject->id)
                ->where('is_default_for_exam_subject', true)
                ->whereNull('deleted_at')
                ->exists();

            if ($hasDefaultTemplate) {
                $subjectsWithTemplate++;
            }

            $subjectDetails[] = [
                'exam_subject_id' => $examSubject->id,
                'subject_id' => $examSubject->subject_id,
                'subject_name' => $examSubject->subject->name ?? 'Unknown',
                'class_name' => $examSubject->examClass->classAcademicYear->class->name ?? 'Unknown',
                'has_paper_template' => $hasDefaultTemplate,
            ];
        }

        return response()->json([
            'exam_id' => $examId,
            'total_subjects' => $totalSubjects,
            'subjects_with_template' => $subjectsWithTemplate,
            'subjects_without_template' => $totalSubjects - $subjectsWithTemplate,
            'completion_percentage' => $totalSubjects > 0 
                ? round(($subjectsWithTemplate / $totalSubjects) * 100, 1) 
                : 0,
            'subjects' => $subjectDetails,
        ]);
    }
}
