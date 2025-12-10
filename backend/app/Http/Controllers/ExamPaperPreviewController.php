<?php

namespace App\Http\Controllers;

use App\Models\ExamPaperTemplate;
use App\Models\ExamSubject;
use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ExamPaperPreviewController extends Controller
{
    /**
     * Get student view (questions only, no answers)
     */
    public function studentView(Request $request, string $templateId)
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

        $template = $this->getTemplateWithDetails($templateId, $profile->organization_id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json($this->buildPreviewData($template, false));
    }

    /**
     * Get teacher view (with answers/keys)
     */
    public function teacherView(Request $request, string $templateId)
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

        $template = $this->getTemplateWithDetails($templateId, $profile->organization_id);

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        return response()->json($this->buildPreviewData($template, true));
    }

    /**
     * Get preview for a specific exam_subject (use default template)
     */
    public function examSubjectPreview(Request $request, string $examSubjectId)
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

        // Get the exam subject
        $examSubject = ExamSubject::with(['exam', 'subject', 'examClass.classAcademicYear.class'])
            ->where('id', $examSubjectId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        // Find the default template for this exam subject
        $template = ExamPaperTemplate::with([
            'subject',
            'school',
            'exam',
            'examSubject.subject',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'items' => function ($query) {
                $query->with(['question.subject'])
                    ->whereNull('deleted_at')
                    ->orderBy('section_label')
                    ->orderBy('position');
            },
        ])
            ->where('exam_subject_id', $examSubjectId)
            ->where('is_default_for_exam_subject', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json([
                'error' => 'No default template found for this exam subject',
                'exam_subject_id' => $examSubjectId,
                'has_template' => false,
            ], 404);
        }

        $showAnswers = $request->boolean('show_answers', false);
        
        return response()->json($this->buildPreviewData($template, $showAnswers));
    }

    /**
     * Get available templates for an exam subject
     */
    public function availableTemplates(Request $request, string $examSubjectId)
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

        // Get the exam subject
        $examSubject = ExamSubject::with(['exam', 'subject', 'examClass.classAcademicYear'])
            ->where('id', $examSubjectId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        $classAcademicYearId = $examSubject->examClass->classAcademicYear->id ?? null;

        // Find compatible templates:
        // 1. Templates specifically for this exam_subject
        // 2. Templates for the same subject and class_academic_year
        // 3. Generic templates for the same subject
        $templates = ExamPaperTemplate::with(['subject', 'classAcademicYear.class', 'exam'])
            ->withCount('items')
            ->where('organization_id', $profile->organization_id)
            ->where('subject_id', $examSubject->subject_id)
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->where(function ($query) use ($examSubjectId, $classAcademicYearId) {
                $query->where('exam_subject_id', $examSubjectId)
                    ->orWhere(function ($q) use ($classAcademicYearId) {
                        $q->whereNull('exam_subject_id')
                          ->where(function ($q2) use ($classAcademicYearId) {
                              $q2->where('class_academic_year_id', $classAcademicYearId)
                                 ->orWhereNull('class_academic_year_id');
                          });
                    });
            })
            ->orderByRaw('CASE WHEN exam_subject_id = ? THEN 0 ELSE 1 END', [$examSubjectId])
            ->orderByRaw('CASE WHEN is_default_for_exam_subject = true THEN 0 ELSE 1 END')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'exam_subject' => [
                'id' => $examSubject->id,
                'subject_name' => $examSubject->subject->name ?? 'Unknown',
                'class_name' => $examSubject->examClass->classAcademicYear->class->name ?? 'Unknown',
            ],
            'templates' => $templates,
        ]);
    }

    /**
     * Set a template as default for an exam subject
     */
    public function setDefaultTemplate(Request $request, string $examSubjectId)
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

        $validated = $request->validate([
            'template_id' => 'required|uuid|exists:exam_paper_templates,id',
        ]);

        // Get the exam subject
        $examSubject = ExamSubject::where('id', $examSubjectId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$examSubject) {
            return response()->json(['error' => 'Exam subject not found'], 404);
        }

        // Get the template
        $template = ExamPaperTemplate::where('id', $validated['template_id'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Template not found'], 404);
        }

        // Verify template is compatible (same subject)
        if ($template->subject_id !== $examSubject->subject_id) {
            return response()->json(['error' => 'Template subject does not match exam subject'], 422);
        }

        // Unset any existing default for this exam_subject
        ExamPaperTemplate::where('exam_subject_id', $examSubjectId)
            ->where('is_default_for_exam_subject', true)
            ->whereNull('deleted_at')
            ->update([
                'is_default_for_exam_subject' => false,
                'updated_by' => $user->id,
                'updated_at' => now(),
            ]);

        // Update the template to be linked and default
        $template->exam_id = $examSubject->exam_id;
        $template->exam_subject_id = $examSubjectId;
        $template->is_default_for_exam_subject = true;
        $template->updated_by = $user->id;
        $template->save();

        $template->load(['subject', 'exam', 'examSubject.subject']);

        return response()->json([
            'message' => 'Default template set successfully',
            'template' => $template,
        ]);
    }

    /**
     * Get template with all details
     */
    private function getTemplateWithDetails(string $templateId, string $organizationId): ?ExamPaperTemplate
    {
        return ExamPaperTemplate::with([
            'subject',
            'school',
            'exam',
            'examSubject.subject',
            'examSubject.examClass.classAcademicYear.class',
            'examSubject.examClass.classAcademicYear.academicYear',
            'classAcademicYear.class',
            'classAcademicYear.academicYear',
            'items' => function ($query) {
                $query->with(['question.subject'])
                    ->whereNull('deleted_at')
                    ->orderBy('section_label')
                    ->orderBy('position');
            },
        ])
            ->where('id', $templateId)
            ->where('organization_id', $organizationId)
            ->whereNull('deleted_at')
            ->first();
    }

    /**
     * Build preview data structure
     */
    private function buildPreviewData(ExamPaperTemplate $template, bool $showAnswers): array
    {
        // Get school branding for header
        $school = $template->school;

        // Build sections from items
        $sections = [];
        $totalMarks = 0;
        $questionNumber = 0;

        foreach ($template->items as $item) {
            $sectionLabel = $item->section_label ?? 'default';
            
            if (!isset($sections[$sectionLabel])) {
                $sections[$sectionLabel] = [
                    'label' => $sectionLabel,
                    'questions' => [],
                    'total_marks' => 0,
                ];
            }

            $questionNumber++;
            $marks = $item->getEffectiveMarks();
            $totalMarks += $marks;
            $sections[$sectionLabel]['total_marks'] += $marks;

            $question = $item->question;
            $questionData = [
                'number' => $questionNumber,
                'item_id' => $item->id,
                'question_id' => $question->id,
                'type' => $question->type,
                'difficulty' => $question->difficulty,
                'text' => $question->text,
                'text_rtl' => $question->text_rtl,
                'marks' => $marks,
                'is_mandatory' => $item->is_mandatory,
                'reference' => $question->reference,
            ];

            // Add options for MCQ/True-False
            if ($question->hasOptions()) {
                $options = [];
                foreach ($question->options ?? [] as $option) {
                    $optionData = [
                        'id' => $option['id'] ?? '',
                        'label' => $option['label'] ?? '',
                        'text' => $option['text'] ?? '',
                    ];
                    
                    if ($showAnswers) {
                        $optionData['is_correct'] = $option['is_correct'] ?? false;
                    }
                    
                    $options[] = $optionData;
                }
                $questionData['options'] = $options;
            }

            // Add correct answer for teacher view
            if ($showAnswers) {
                if ($question->hasOptions()) {
                    $correctOption = $question->getCorrectOption();
                    $questionData['correct_option'] = $correctOption;
                } else {
                    $questionData['correct_answer'] = $question->correct_answer;
                }
            }

            $sections[$sectionLabel]['questions'][] = $questionData;
        }

        // Convert to array and sort by label
        $sectionsArray = array_values($sections);
        usort($sectionsArray, function ($a, $b) {
            return strcmp($a['label'], $b['label']);
        });

        // Build header info
        $headerInfo = [
            'school_name' => $school->school_name ?? 'School Name',
            'school_name_arabic' => $school->school_name_arabic ?? null,
            'school_name_pashto' => $school->school_name_pashto ?? null,
            'school_address' => $school->school_address ?? null,
            'exam_name' => $template->exam->name ?? null,
            'subject_name' => $template->subject->name ?? 'Subject',
            'class_name' => $this->getClassName($template),
            'academic_year' => $this->getAcademicYearName($template),
            'duration_minutes' => $template->duration_minutes,
            'total_marks' => $template->total_marks ?? $totalMarks,
            'date' => $template->exam?->start_date?->format('Y-m-d') ?? null,
        ];

        return [
            'template_id' => $template->id,
            'title' => $template->title,
            'language' => $template->language,
            'is_rtl' => $template->isRtl(),
            'header' => $headerInfo,
            'header_html' => $template->header_html,
            'footer_html' => $template->footer_html,
            'instructions' => $template->instructions,
            'sections' => $sectionsArray,
            'total_questions' => $questionNumber,
            'total_marks' => $template->total_marks ?? $totalMarks,
            'computed_total_marks' => $totalMarks,
            'show_answers' => $showAnswers,
        ];
    }

    /**
     * Get class name from template
     */
    private function getClassName(ExamPaperTemplate $template): ?string
    {
        // Try from exam subject first
        if ($template->examSubject?->examClass?->classAcademicYear?->class) {
            return $template->examSubject->examClass->classAcademicYear->class->name;
        }

        // Fall back to template's class academic year
        if ($template->classAcademicYear?->class) {
            return $template->classAcademicYear->class->name;
        }

        return null;
    }

    /**
     * Get academic year name from template
     */
    private function getAcademicYearName(ExamPaperTemplate $template): ?string
    {
        // Try from exam subject first
        if ($template->examSubject?->examClass?->classAcademicYear?->academicYear) {
            return $template->examSubject->examClass->classAcademicYear->academicYear->name;
        }

        // Fall back to template's class academic year
        if ($template->classAcademicYear?->academicYear) {
            return $template->classAcademicYear->academicYear->name;
        }

        // Fall back to exam's academic year
        if ($template->exam?->academicYear) {
            return $template->exam->academicYear->name;
        }

        return null;
    }
}
