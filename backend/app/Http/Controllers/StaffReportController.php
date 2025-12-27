<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\ReportService;
use App\Services\Reports\DateConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StaffReportController extends Controller
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
            if (!$user->hasPermissionTo('staff_reports.read')) {
                return [null, response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'staff_reports.read',
                ], 403)];
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for staff_reports.read: ' . $e->getMessage());
            return [null, response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'staff_reports.read',
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

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('staff_type_id')) {
            $query->where('staff_type_id', $request->staff_type_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                    ->orWhere('father_name', 'ilike', "%{$search}%")
                    ->orWhere('grandfather_name', 'ilike', "%{$search}%")
                    ->orWhere('employee_id', 'ilike', "%{$search}%")
                    ->orWhere('staff_code', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone_number', 'ilike', "%{$search}%");
            });
        }

        return $query;
    }

    private function mapStaff($staff)
    {
        return $staff->map(function (Staff $staffMember) {
            // Calculate full_name from first_name, father_name, grandfather_name
            $fullName = trim(collect([
                $staffMember->first_name,
                $staffMember->father_name,
                $staffMember->grandfather_name
            ])->filter()->implode(' '));
            
            return [
                'Staff Code' => $staffMember->staff_code ?? '—',
                'Employee ID' => $staffMember->employee_id ?? '—',
                'Status' => $staffMember->status ?? '—',
                'Full Name' => $fullName ?: '—',
                'First Name' => $staffMember->first_name ?? '—',
                'Father Name' => $staffMember->father_name ?? '—',
                'Grandfather Name' => $staffMember->grandfather_name ?? '—',
                'Tazkira Number' => $staffMember->tazkira_number ?? '—',
                'Birth Date' => $staffMember->birth_date ? $staffMember->birth_date->format('Y-m-d') : '—',
                'Birth Year' => $staffMember->birth_year ?? '—',
                'Phone Number' => $staffMember->phone_number ?? '—',
                'Email' => $staffMember->email ?? '—',
                'Home Address' => $staffMember->home_address ?? '—',
                'Staff Type' => optional($staffMember->staffType)->name ?? $staffMember->staff_type ?? '—',
                'Position' => $staffMember->position ?? '—',
                'Duty' => $staffMember->duty ?? '—',
                'Salary' => $staffMember->salary ?? '—',
                'Teaching Section' => $staffMember->teaching_section ?? '—',
                'School' => optional($staffMember->school)->school_name ?? '—',
                'Organization' => optional($staffMember->organization)->name ?? '—',
                'Origin Location' => collect([$staffMember->origin_province, $staffMember->origin_district, $staffMember->origin_village])
                    ->filter()
                    ->implode(', '),
                'Current Location' => collect([$staffMember->current_province, $staffMember->current_district, $staffMember->current_village])
                    ->filter()
                    ->implode(', '),
                'Religious Education Level' => $staffMember->religious_education ?? '—',
                'Religious Institution' => $staffMember->religious_university ?? '—',
                'Religious Graduation Year' => $staffMember->religious_graduation_year ?? '—',
                'Religious Department' => $staffMember->religious_department ?? '—',
                'Modern Education Level' => $staffMember->modern_education ?? '—',
                'Modern Institution' => $staffMember->modern_school_university ?? '—',
                'Modern Graduation Year' => $staffMember->modern_graduation_year ?? '—',
                'Modern Department' => $staffMember->modern_department ?? '—',
                'Notes' => $staffMember->notes ?? '—',
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
        if ($request->filled('status')) {
            $filters['status'] = $request->status;
        }
        if ($request->filled('staff_type_id')) {
            $filters['staff_type_id'] = $request->staff_type_id;
        }
        if ($request->filled('search')) {
            $filters['search'] = $request->search;
        }

        // Build filter summary
        $filterSummary = [];
        if (!empty($filters['status'])) {
            $filterSummary[] = 'Status: ' . $filters['status'];
        }
        if (!empty($filters['staff_type_id'])) {
            $filterSummary[] = 'Staff Type: ' . $filters['staff_type_id'];
        }
        if (!empty($filters['search'])) {
            $filterSummary[] = 'Search: ' . $filters['search'];
        }

        // Query staff with filters
        $query = Staff::with(['staffType', 'organization', 'school']);
        $this->applyFilters($request, $query, $orgId, $currentSchoolId);

        $staff = $query->orderBy('full_name')->get();

        // Get calendar preference and language from request or use defaults
        $calendarPreference = $request->get('calendar_preference', 'jalali');
        $language = $request->get('language', 'ps');

        // Map staff to report rows with date formatting
        $columns = [
            ['key' => 'staff_code', 'label' => $language === 'ps' ? 'د کارکوونکو کوډ' : ($language === 'fa' ? 'کد کارکن' : ($language === 'ar' ? 'رمز الموظف' : 'Staff Code'))],
            ['key' => 'employee_id', 'label' => $language === 'ps' ? 'د کارکوونکو شمیره' : ($language === 'fa' ? 'شماره کارمند' : ($language === 'ar' ? 'رقم الموظف' : 'Employee ID'))],
            ['key' => 'status', 'label' => $language === 'ps' ? 'حالت' : ($language === 'fa' ? 'وضعیت' : ($language === 'ar' ? 'الحالة' : 'Status'))],
            ['key' => 'full_name', 'label' => $language === 'ps' ? 'بشپړه نوم' : ($language === 'fa' ? 'نام کامل' : ($language === 'ar' ? 'الاسم الكامل' : 'Full Name'))],
            ['key' => 'first_name', 'label' => $language === 'ps' ? 'نوم' : ($language === 'fa' ? 'نام' : ($language === 'ar' ? 'الاسم الأول' : 'First Name'))],
            ['key' => 'father_name', 'label' => $language === 'ps' ? 'د پلار نوم' : ($language === 'fa' ? 'نام پدر' : ($language === 'ar' ? 'اسم الأب' : 'Father Name'))],
            ['key' => 'grandfather_name', 'label' => $language === 'ps' ? 'د نیکه نوم' : ($language === 'fa' ? 'نام پدربزرگ' : ($language === 'ar' ? 'اسم الجد' : 'Grandfather Name'))],
            ['key' => 'tazkira_number', 'label' => $language === 'ps' ? 'د تذکیرې شمیره' : ($language === 'fa' ? 'شماره تذکره' : ($language === 'ar' ? 'رقم الهوية' : 'Tazkira Number'))],
            ['key' => 'birth_date', 'label' => $language === 'ps' ? 'د زیږون نیټه' : ($language === 'fa' ? 'تاریخ تولد' : ($language === 'ar' ? 'تاريخ الميلاد' : 'Birth Date'))],
            ['key' => 'birth_year', 'label' => $language === 'ps' ? 'د زیږون کال' : ($language === 'fa' ? 'سال تولد' : ($language === 'ar' ? 'سنة الميلاد' : 'Birth Year'))],
            ['key' => 'phone_number', 'label' => $language === 'ps' ? 'تلیفون' : ($language === 'fa' ? 'تلفن' : ($language === 'ar' ? 'الهاتف' : 'Phone Number'))],
            ['key' => 'email', 'label' => $language === 'ps' ? 'بریښنالیک' : ($language === 'fa' ? 'ایمیل' : ($language === 'ar' ? 'البريد الإلكتروني' : 'Email'))],
            ['key' => 'home_address', 'label' => $language === 'ps' ? 'د کور پته' : ($language === 'fa' ? 'آدرس منزل' : ($language === 'ar' ? 'عنوان المنزل' : 'Home Address'))],
            ['key' => 'staff_type', 'label' => $language === 'ps' ? 'د کارکوونکو ډول' : ($language === 'fa' ? 'نوع کارکن' : ($language === 'ar' ? 'نوع الموظف' : 'Staff Type'))],
            ['key' => 'position', 'label' => $language === 'ps' ? 'دنده' : ($language === 'fa' ? 'سمت' : ($language === 'ar' ? 'المنصب' : 'Position'))],
            ['key' => 'duty', 'label' => $language === 'ps' ? 'مسئولیت' : ($language === 'fa' ? 'وظیفه' : ($language === 'ar' ? 'المسؤولية' : 'Duty'))],
            ['key' => 'salary', 'label' => $language === 'ps' ? 'معاش' : ($language === 'fa' ? 'حقوق' : ($language === 'ar' ? 'الراتب' : 'Salary'))],
            ['key' => 'teaching_section', 'label' => $language === 'ps' ? 'د تدریس برخه' : ($language === 'fa' ? 'بخش تدریس' : ($language === 'ar' ? 'قسم التدريس' : 'Teaching Section'))],
            ['key' => 'school', 'label' => $language === 'ps' ? 'ښوونځی' : ($language === 'fa' ? 'مدرسه' : ($language === 'ar' ? 'المدرسة' : 'School'))],
            ['key' => 'organization', 'label' => $language === 'ps' ? 'سازمان' : ($language === 'fa' ? 'سازمان' : ($language === 'ar' ? 'المنظمة' : 'Organization'))],
            ['key' => 'origin_location', 'label' => $language === 'ps' ? 'اصلي ځای' : ($language === 'fa' ? 'محل اصلی' : ($language === 'ar' ? 'المكان الأصلي' : 'Origin Location'))],
            ['key' => 'current_location', 'label' => $language === 'ps' ? 'اوسنی ځای' : ($language === 'fa' ? 'محل فعلی' : ($language === 'ar' ? 'المكان الحالي' : 'Current Location'))],
            ['key' => 'religious_education', 'label' => $language === 'ps' ? 'د مذهبي زده کړو کچه' : ($language === 'fa' ? 'مقطع تحصیلات دینی' : ($language === 'ar' ? 'مستوى التعليم الديني' : 'Religious Education'))],
            ['key' => 'religious_institution', 'label' => $language === 'ps' ? 'د مذهبي زده کړو بنسټ' : ($language === 'fa' ? 'موسسه تحصیلات دینی' : ($language === 'ar' ? 'مؤسسة التعليم الديني' : 'Religious Institution'))],
            ['key' => 'religious_graduation_year', 'label' => $language === 'ps' ? 'د مذهبي زده کړو د فراغت کال' : ($language === 'fa' ? 'سال فراغت تحصیلات دینی' : ($language === 'ar' ? 'سنة التخرج من التعليم الديني' : 'Religious Graduation Year'))],
            ['key' => 'religious_department', 'label' => $language === 'ps' ? 'د مذهبي زده کړو څانګه' : ($language === 'fa' ? 'بخش تحصیلات دینی' : ($language === 'ar' ? 'قسم التعليم الديني' : 'Religious Department'))],
            ['key' => 'modern_education', 'label' => $language === 'ps' ? 'د عصري زده کړو کچه' : ($language === 'fa' ? 'مقطع تحصیلات مدرن' : ($language === 'ar' ? 'مستوى التعليم الحديث' : 'Modern Education'))],
            ['key' => 'modern_institution', 'label' => $language === 'ps' ? 'د عصري زده کړو بنسټ' : ($language === 'fa' ? 'موسسه تحصیلات مدرن' : ($language === 'ar' ? 'مؤسسة التعليم الحديث' : 'Modern Institution'))],
            ['key' => 'modern_graduation_year', 'label' => $language === 'ps' ? 'د عصري زده کړو د فراغت کال' : ($language === 'fa' ? 'سال فراغت تحصیلات مدرن' : ($language === 'ar' ? 'سنة التخرج من التعليم الحديث' : 'Modern Graduation Year'))],
            ['key' => 'modern_department', 'label' => $language === 'ps' ? 'د عصري زده کړو څانګه' : ($language === 'fa' ? 'بخش تحصیلات مدرن' : ($language === 'ar' ? 'قسم التعليم الحديث' : 'Modern Department'))],
            ['key' => 'notes', 'label' => $language === 'ps' ? 'یادښتونه' : ($language === 'fa' ? 'یادداشت‌ها' : ($language === 'ar' ? 'ملاحظات' : 'Notes'))],
        ];

        $rows = [];
        foreach ($staff as $staffMember) {
            $fullName = trim(collect([
                $staffMember->first_name,
                $staffMember->father_name,
                $staffMember->grandfather_name
            ])->filter()->implode(' '));

            $rows[] = [
                'staff_code' => $staffMember->staff_code ?? '—',
                'employee_id' => $staffMember->employee_id ?? '—',
                'status' => $staffMember->status ?? '—',
                'full_name' => $fullName ?: '—',
                'first_name' => $staffMember->first_name ?? '—',
                'father_name' => $staffMember->father_name ?? '—',
                'grandfather_name' => $staffMember->grandfather_name ?? '—',
                'tazkira_number' => $staffMember->tazkira_number ?? '—',
                'birth_date' => $staffMember->birth_date ? $this->dateService->formatDate($staffMember->birth_date, $calendarPreference, 'full', $language) : '—',
                'birth_year' => $staffMember->birth_year ?? '—',
                'phone_number' => $staffMember->phone_number ?? '—',
                'email' => $staffMember->email ?? '—',
                'home_address' => $staffMember->home_address ?? '—',
                'staff_type' => optional($staffMember->staffType)->name ?? $staffMember->staff_type ?? '—',
                'position' => $staffMember->position ?? '—',
                'duty' => $staffMember->duty ?? '—',
                'salary' => $staffMember->salary ?? '—',
                'teaching_section' => $staffMember->teaching_section ?? '—',
                'school' => optional($staffMember->school)->school_name ?? '—',
                'organization' => optional($staffMember->organization)->name ?? '—',
                'origin_location' => collect([$staffMember->origin_province, $staffMember->origin_district, $staffMember->origin_village])->filter()->implode(', ') ?: '—',
                'current_location' => collect([$staffMember->current_province, $staffMember->current_district, $staffMember->current_village])->filter()->implode(', ') ?: '—',
                'religious_education' => $staffMember->religious_education ?? '—',
                'religious_institution' => $staffMember->religious_university ?? '—',
                'religious_graduation_year' => $staffMember->religious_graduation_year ?? '—',
                'religious_department' => $staffMember->religious_department ?? '—',
                'modern_education' => $staffMember->modern_education ?? '—',
                'modern_institution' => $staffMember->modern_school_university ?? '—',
                'modern_graduation_year' => $staffMember->modern_graduation_year ?? '—',
                'modern_department' => $staffMember->modern_department ?? '—',
                'notes' => $staffMember->notes ?? '—',
            ];
        }

        // Get format (pdf or excel)
        $format = strtolower($request->get('format', 'pdf'));
        $reportType = $format === 'xlsx' ? 'excel' : 'pdf';

        // Create report config
        $config = ReportConfig::fromArray([
            'report_key' => 'staff_list',
            'report_type' => $reportType,
            'branding_id' => $currentSchoolId,
            'title' => $language === 'ps' ? 'د کارکوونکو راپور' : ($language === 'fa' ? 'گزارش کارکنان' : ($language === 'ar' ? 'تقرير الموظفين' : 'Staff Report')),
            'calendar_preference' => $calendarPreference,
            'language' => $language,
            'parameters' => [
                'filters_summary' => !empty($filterSummary) ? implode(' | ', $filterSummary) : null,
                'total_count' => count($rows),
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
            Log::error('Staff report generation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Failed to generate report: ' . $e->getMessage(),
            ], 500);
        }
    }
}

