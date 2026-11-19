<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\ExamStudent;
use App\Services\Exams\CombinedExamResultCardService;
use App\Services\Exams\CombinedExamResultException;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use App\Services\Reports\StudentExamReportCardLabels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CombinedExamResultCardController extends Controller
{
    public function __construct(
        private CombinedExamResultCardService $combinedExamResultCardService,
        private ReportService $reportService,
    ) {}

    /**
     * Combined result cards for students on exam A plus a second exam.
     * GET /api/exams/{exam}/reports/students/combined
     */
    public function index(Request $request, string $examId): JsonResponse
    {
        $context = $this->authorizeReport($request);
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'second_exam_id' => 'required|uuid',
            'exam_student_ids' => 'required|array|min:1|max:100',
            'exam_student_ids.*' => 'required|uuid',
            'language' => 'nullable|string|in:en,ps,fa,ar,dari',
            'calendar_preference' => 'nullable|string|in:gregorian,jalali,qamari,hijri_shamsi,hijri_qamari',
        ]);

        $examA = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        $examB = $this->findExam($validated['second_exam_id'], $profile->organization_id, $currentSchoolId);

        if (! $examA || ! $examB) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $students = $this->studentsForExport($examA, $validated['exam_student_ids'], $profile->organization_id, $currentSchoolId);
        if ($students->isEmpty()) {
            return response()->json(['error' => 'No enrolled students found'], 404);
        }

        $language = $this->language($validated['language'] ?? 'ar');
        $calendar = (string) ($validated['calendar_preference'] ?? 'jalali');

        try {
            $cards = $this->combinedExamResultCardService->buildCards(
                $examA,
                $examB,
                $students,
                $profile->organization_id,
                $currentSchoolId,
                $language,
                $calendar,
                embedPicture: false,
            );
        } catch (CombinedExamResultException $e) {
            return response()->json(['message' => $e->errorCode, 'error' => $e->errorCode], 422);
        }

        return response()->json(['cards' => $cards]);
    }

    /**
     * Branded PDF of the same combined cards.
     * POST /api/exams/{exam}/reports/students/combined/export/pdf
     */
    public function exportPdf(Request $request, string $examId): JsonResponse
    {
        $context = $this->authorizeReport($request);
        if ($context instanceof JsonResponse) {
            return $context;
        }

        [$profile, $currentSchoolId] = $context;

        $validated = $request->validate([
            'second_exam_id' => 'required|uuid',
            'exam_student_ids' => 'required|array|min:1|max:100',
            'exam_student_ids.*' => 'required|uuid',
            'language' => 'nullable|string|in:en,ps,fa,ar,dari',
            'calendar_preference' => 'nullable|string|in:gregorian,jalali,qamari,hijri_shamsi,hijri_qamari',
            'branding_id' => 'nullable|uuid',
        ]);

        $examA = $this->findExam($examId, $profile->organization_id, $currentSchoolId);
        $examB = $this->findExam($validated['second_exam_id'], $profile->organization_id, $currentSchoolId);

        if (! $examA || ! $examB) {
            return response()->json(['error' => 'Exam not found'], 404);
        }

        $students = $this->studentsForExport($examA, $validated['exam_student_ids'], $profile->organization_id, $currentSchoolId);
        if ($students->isEmpty()) {
            return response()->json(['error' => 'No enrolled students found for export'], 404);
        }

        $language = $this->language($validated['language'] ?? 'ar');
        $calendar = (string) ($validated['calendar_preference'] ?? 'jalali');

        try {
            $reportData = $this->combinedExamResultCardService->buildPdfPayload(
                $examA,
                $examB,
                $students,
                $profile->organization_id,
                $currentSchoolId,
                $language,
                $calendar,
            );

            $config = ReportConfig::fromArray([
                'report_key' => 'combined_student_report_card',
                'report_type' => 'pdf',
                'branding_id' => $validated['branding_id'] ?? $currentSchoolId,
                'title' => StudentExamReportCardLabels::combinedReportTitle($language, $examA->name, $examB->name),
                'calendar_preference' => $calendar,
                'language' => $language,
                'template_name' => 'combined-student-report-card',
                'parameters' => [
                    'exam_id' => $examId,
                    'second_exam_id' => $validated['second_exam_id'],
                    'exam_student_ids' => $validated['exam_student_ids'],
                ],
            ]);

            $reportRun = $this->reportService->generateReport(
                $config,
                $reportData,
                $profile->organization_id
            );

            return response()->json([
                'id' => $reportRun->id,
                'status' => $reportRun->status,
                'message' => 'Report generation started',
            ], 202);
        } catch (CombinedExamResultException $e) {
            return response()->json(['message' => $e->errorCode, 'error' => $e->errorCode], 422);
        } catch (\Exception $e) {
            Log::error('Error exporting combined student report cards PDF: '.$e->getMessage(), [
                'exam_id' => $examId,
                'second_exam_id' => $validated['second_exam_id'],
                'exception' => $e,
            ]);

            return response()->json(['error' => 'Failed to generate PDF report'], 500);
        }
    }

    /**
     * @return array{0: object, 1: string}|JsonResponse
     */
    private function authorizeReport(Request $request): array|JsonResponse
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('exams.view_reports')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for exams.view_reports: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        return [$profile, $currentSchoolId];
    }

    private function findExam(string $examId, string $organizationId, string $schoolId): ?Exam
    {
        return Exam::query()
            ->with('academicYear')
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereKey($examId)
            ->whereNull('deleted_at')
            ->first();
    }

    /**
     * @param  list<string>  $examStudentIds
     */
    private function studentsForExport(Exam $exam, array $examStudentIds, string $organizationId, string $schoolId)
    {
        $students = ExamStudent::query()
            ->with([
                'studentAdmission.student',
                'examClass.classAcademicYear.class',
            ])
            ->where('exam_id', $exam->id)
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereIn('id', $examStudentIds)
            ->whereNull('deleted_at')
            ->withLiveActiveAdmission($exam->academic_year_id)
            ->get();

        return collect($examStudentIds)
            ->map(fn (string $id) => $students->firstWhere('id', $id))
            ->filter()
            ->values();
    }

    private function language(string $language): string
    {
        return $language === 'dari' ? 'fa' : $language;
    }
}
