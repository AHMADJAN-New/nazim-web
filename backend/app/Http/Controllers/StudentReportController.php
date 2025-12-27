<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use App\Services\Reports\DateConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentReportController extends Controller
{
    public function __construct(
        private ReportService $reportService,
        private DateConversionService $dateService
    ) {}
    private function ensureAuthorizedUser(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return [null, response()->json(['error' => 'Profile not found'], 404)];
        }

        if (!$profile->organization_id) {
            return [null, response()->json(['error' => 'User must be assigned to an organization'], 403)];
        }

        try {
            if (!$user->hasPermissionTo('student_reports.read')) {
                return [null, response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'student_reports.read',
                ], 403)];
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for student_reports.read: ' . $e->getMessage());
            return [null, response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'student_reports.read',
            ], 403)];
        }

        return [$profile, null];
    }

    private function applyFilters(Request $request, $query, string $orgId, string $currentSchoolId)
    {
        // Strict school scoping (ignore client-provided org/school ids)
        $query->where('organization_id', $orgId)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        if ($request->filled('student_status')) {
            $query->where('student_status', $request->student_status);
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->filled('is_orphan')) {
            $query->where('is_orphan', filter_var($request->is_orphan, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('admission_fee_status')) {
            $query->where('admission_fee_status', $request->admission_fee_status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                    ->orWhere('father_name', 'ilike', "%{$search}%")
                    ->orWhere('admission_no', 'ilike', "%{$search}%")
                    ->orWhere('guardian_name', 'ilike', "%{$search}%")
                    ->orWhere('guardian_phone', 'ilike', "%{$search}%");
            });
        }

        return $query;
    }

    private function mapStudents($students)
    {
        return $students->map(function (Student $student) {
            return [
                'Admission #' => $student->admission_no ?? '—',
                'Card #' => $student->card_number ?? '—',
                'Status' => $student->student_status ?? '—',
                'Full Name' => $student->full_name,
                'Father Name' => $student->father_name ?? '—',
                'Gender' => $student->gender ?? '—',
                'Age' => $student->age ?? '—',
                'Birth Date' => $student->birth_date ? $student->birth_date->format('Y-m-d') : '—',
                'Nationality' => $student->nationality ?? '—',
                'Address' => $student->home_address ?? '—',
                'Phone' => $student->guardian_phone ?? '—',
                'Guardian' => $student->guardian_name ?? '—',
                'Applying Grade' => $student->applying_grade ?? '—',
                'School' => optional($student->school)->school_name ?? '—',
                'Admission Year' => $student->admission_year ?? '—',
                'Admission Fee Status' => $student->admission_fee_status ?? '—',
                'Origin Location' => collect([$student->orig_province, $student->orig_district, $student->orig_village])
                    ->filter()
                    ->implode(', '),
                'Current Location' => collect([$student->curr_province, $student->curr_district, $student->curr_village])
                    ->filter()
                    ->implode(', '),
                'Previous School' => $student->previous_school ?? '—',
                'Orphan' => $student->is_orphan ? 'Yes' : 'No',
                'Disability' => $student->disability_status ?? '—',
                'Emergency Contact' => collect([$student->emergency_contact_name, $student->emergency_contact_phone])
                    ->filter()
                    ->implode(' '),
            ];
        });
    }

    public function export(Request $request)
    {
        [$profile, $errorResponse] = $this->ensureAuthorizedUser($request);

        if ($errorResponse) {
            return $errorResponse;
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $orgId = $profile->organization_id;

        // Get filters for summary
        $filters = [];
        if ($request->filled('student_status')) {
            $filters['student_status'] = $request->student_status;
        }
        if ($request->filled('gender')) {
            $filters['gender'] = $request->gender;
        }
        if ($request->filled('is_orphan')) {
            $filters['is_orphan'] = $request->is_orphan;
        }
        if ($request->filled('admission_fee_status')) {
            $filters['admission_fee_status'] = $request->admission_fee_status;
        }
        if ($request->filled('search')) {
            $filters['search'] = $request->search;
        }

        // Build filter summary
        $filterSummary = [];
        if (!empty($filters['student_status'])) {
            $filterSummary[] = 'Status: ' . $filters['student_status'];
        }
        if (!empty($filters['gender'])) {
            $filterSummary[] = 'Gender: ' . $filters['gender'];
        }
        if (!empty($filters['is_orphan'])) {
            $filterSummary[] = 'Orphan: ' . ($filters['is_orphan'] ? 'Yes' : 'No');
        }
        if (!empty($filters['admission_fee_status'])) {
            $filterSummary[] = 'Fee Status: ' . $filters['admission_fee_status'];
        }
        if (!empty($filters['search'])) {
            $filterSummary[] = 'Search: ' . $filters['search'];
        }

        // Query students with filters
        $query = Student::with(['school']);
        $this->applyFilters($request, $query, $orgId, $currentSchoolId);

        $students = $query->orderBy('full_name')->get();

        // Get calendar preference and language from request or use defaults
        $calendarPreference = $request->get('calendar_preference', 'jalali');
        $language = $request->get('language', 'ps');

        // Map students to report rows with date formatting
        $columns = [
            ['key' => 'admission_no', 'label' => $language === 'ps' ? 'د شمولیت شمیره' : ($language === 'fa' ? 'شماره پذیرش' : ($language === 'ar' ? 'رقم القبول' : 'Admission #'))],
            ['key' => 'card_number', 'label' => $language === 'ps' ? 'کارت شمیره' : ($language === 'fa' ? 'شماره کارت' : ($language === 'ar' ? 'رقم البطاقة' : 'Card #'))],
            ['key' => 'status', 'label' => $language === 'ps' ? 'حالت' : ($language === 'fa' ? 'وضعیت' : ($language === 'ar' ? 'الحالة' : 'Status'))],
            ['key' => 'full_name', 'label' => $language === 'ps' ? 'بشپړه نوم' : ($language === 'fa' ? 'نام کامل' : ($language === 'ar' ? 'الاسم الكامل' : 'Full Name'))],
            ['key' => 'father_name', 'label' => $language === 'ps' ? 'د پلار نوم' : ($language === 'fa' ? 'نام پدر' : ($language === 'ar' ? 'اسم الأب' : 'Father Name'))],
            ['key' => 'gender', 'label' => $language === 'ps' ? 'جنس' : ($language === 'fa' ? 'جنسیت' : ($language === 'ar' ? 'الجنس' : 'Gender'))],
            ['key' => 'age', 'label' => $language === 'ps' ? 'عمر' : ($language === 'fa' ? 'سن' : ($language === 'ar' ? 'العمر' : 'Age'))],
            ['key' => 'birth_date', 'label' => $language === 'ps' ? 'د زیږون نیټه' : ($language === 'fa' ? 'تاریخ تولد' : ($language === 'ar' ? 'تاريخ الميلاد' : 'Birth Date'))],
            ['key' => 'nationality', 'label' => $language === 'ps' ? 'تابعیت' : ($language === 'fa' ? 'ملیت' : ($language === 'ar' ? 'الجنسية' : 'Nationality'))],
            ['key' => 'address', 'label' => $language === 'ps' ? 'پته' : ($language === 'fa' ? 'آدرس' : ($language === 'ar' ? 'العنوان' : 'Address'))],
            ['key' => 'phone', 'label' => $language === 'ps' ? 'تلیفون' : ($language === 'fa' ? 'تلفن' : ($language === 'ar' ? 'الهاتف' : 'Phone'))],
            ['key' => 'guardian', 'label' => $language === 'ps' ? 'سرپرست' : ($language === 'fa' ? 'ولی' : ($language === 'ar' ? 'الولي' : 'Guardian'))],
            ['key' => 'applying_grade', 'label' => $language === 'ps' ? 'د درخواست کچه' : ($language === 'fa' ? 'مقطع درخواستی' : ($language === 'ar' ? 'الصف المطلوب' : 'Applying Grade'))],
            ['key' => 'school', 'label' => $language === 'ps' ? 'ښوونځی' : ($language === 'fa' ? 'مدرسه' : ($language === 'ar' ? 'المدرسة' : 'School'))],
            ['key' => 'admission_year', 'label' => $language === 'ps' ? 'د شمولیت کال' : ($language === 'fa' ? 'سال پذیرش' : ($language === 'ar' ? 'سنة القبول' : 'Admission Year'))],
            ['key' => 'admission_fee_status', 'label' => $language === 'ps' ? 'د فیس حالت' : ($language === 'fa' ? 'وضعیت هزینه' : ($language === 'ar' ? 'حالة الرسوم' : 'Fee Status'))],
            ['key' => 'origin_location', 'label' => $language === 'ps' ? 'اصلي ځای' : ($language === 'fa' ? 'محل اصلی' : ($language === 'ar' ? 'المكان الأصلي' : 'Origin Location'))],
            ['key' => 'current_location', 'label' => $language === 'ps' ? 'اوسنی ځای' : ($language === 'fa' ? 'محل فعلی' : ($language === 'ar' ? 'المكان الحالي' : 'Current Location'))],
            ['key' => 'previous_school', 'label' => $language === 'ps' ? 'پخوانی ښوونځی' : ($language === 'fa' ? 'مدرسه قبلی' : ($language === 'ar' ? 'المدرسة السابقة' : 'Previous School'))],
            ['key' => 'orphan', 'label' => $language === 'ps' ? 'یتیم' : ($language === 'fa' ? 'یتیم' : ($language === 'ar' ? 'يتيم' : 'Orphan'))],
            ['key' => 'disability', 'label' => $language === 'ps' ? 'معیوبیت' : ($language === 'fa' ? 'ناتوانی' : ($language === 'ar' ? 'الإعاقة' : 'Disability'))],
            ['key' => 'emergency_contact', 'label' => $language === 'ps' ? 'د اضطراري اړیکو' : ($language === 'fa' ? 'تماس اضطراری' : ($language === 'ar' ? 'جهة الاتصال الطارئة' : 'Emergency Contact'))],
        ];

        $rows = [];
        foreach ($students as $student) {
            $rows[] = [
                'admission_no' => $student->admission_no ?? '—',
                'card_number' => $student->card_number ?? '—',
                'status' => $student->student_status ?? '—',
                'full_name' => $student->full_name ?? '—',
                'father_name' => $student->father_name ?? '—',
                'gender' => $student->gender ?? '—',
                'age' => $student->age ?? '—',
                'birth_date' => $student->birth_date ? $this->dateService->formatDate($student->birth_date, $calendarPreference, 'full', $language) : '—',
                'nationality' => $student->nationality ?? '—',
                'address' => $student->home_address ?? '—',
                'phone' => $student->guardian_phone ?? '—',
                'guardian' => $student->guardian_name ?? '—',
                'applying_grade' => $student->applying_grade ?? '—',
                'school' => optional($student->school)->school_name ?? '—',
                'admission_year' => $student->admission_year ?? '—',
                'admission_fee_status' => $student->admission_fee_status ?? '—',
                'origin_location' => collect([$student->orig_province, $student->orig_district, $student->orig_village])->filter()->implode(', ') ?: '—',
                'current_location' => collect([$student->curr_province, $student->curr_district, $student->curr_village])->filter()->implode(', ') ?: '—',
                'previous_school' => $student->previous_school ?? '—',
                'orphan' => $student->is_orphan ? ($language === 'ps' ? 'هو' : ($language === 'fa' ? 'بله' : ($language === 'ar' ? 'نعم' : 'Yes'))) : ($language === 'ps' ? 'نه' : ($language === 'fa' ? 'خیر' : ($language === 'ar' ? 'لا' : 'No'))),
                'disability' => $student->disability_status ?? '—',
                'emergency_contact' => collect([$student->emergency_contact_name, $student->emergency_contact_phone])->filter()->implode(' ') ?: '—',
            ];
        }

        // Get format (pdf or excel)
        $format = strtolower($request->get('format', 'pdf'));
        $reportType = $format === 'xlsx' ? 'excel' : 'pdf';

        // Create report config
        $config = ReportConfig::fromArray([
            'report_key' => 'student_list',
            'report_type' => $reportType,
            'branding_id' => $currentSchoolId,
            'title' => $language === 'ps' ? 'د زده کړیالانو راپور' : ($language === 'fa' ? 'گزارش دانش آموزان' : ($language === 'ar' ? 'تقرير الطلاب' : 'Students Report')),
            'calendar_preference' => $calendarPreference,
            'language' => $language,
            'parameters' => [
                'filters_summary' => !empty($filterSummary) ? implode(' | ', $filterSummary) : null,
                'total_count' => count($rows),
                'date_range' => null, // Students report doesn't have date range
                'show_totals' => true, // Show totals row in Excel
            ],
        ]);

        // Prepare report data
        $data = [
            'columns' => $columns,
            'rows' => $rows,
        ];

        // Generate report
        try {
            $reportRun = $this->reportService->generateReport($config, $data, $orgId);

            // For synchronous requests, return download
            if ($reportRun->isCompleted()) {
                return redirect("/api/reports/{$reportRun->id}/download");
            }

            // For async requests, return report ID
            return response()->json([
                'success' => true,
                'report_id' => $reportRun->id,
                'status' => $reportRun->status,
                'message' => 'Report generation started',
            ]);
        } catch (\Exception $e) {
            Log::error('Student report generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to generate report: ' . $e->getMessage(),
            ], 500);
        }
    }
}
