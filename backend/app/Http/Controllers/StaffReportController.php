<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StaffReportController extends Controller
{
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

        $query = Staff::with(['staffType', 'organization', 'school']);
        $this->applyFilters($request, $query, $orgId, $currentSchoolId);

        $staff = $query->orderBy('full_name')->get();
        $rows = $this->mapStaff($staff);

        $format = strtolower($request->get('format', 'csv'));

        if ($format === 'pdf') {
            $html = View::make('reports.staff-registration', [
                'rows' => $rows,
                'generatedAt' => now()->format('Y-m-d H:i'),
                'organization' => $profile->organization_id,
            ])->render();

            $pdf = app('dompdf.wrapper');
            $pdf->loadHTML($html)->setPaper('a4', 'landscape');

            return $pdf->download('staff-registration-report.pdf');
        }

        $filename = $format === 'xlsx' ? 'staff-registration-report.xlsx' : 'staff-registration-report.csv';
        $header = array_keys($rows->first() ?? [
            'Staff Code' => '',
            'Employee ID' => '',
            'Status' => '',
            'Full Name' => '',
            'Father Name' => '',
            'Grandfather Name' => '',
            'Tazkira Number' => '',
            'Birth Date' => '',
            'Birth Year' => '',
            'Phone Number' => '',
            'Email' => '',
            'Home Address' => '',
            'Staff Type' => '',
            'Position' => '',
            'Duty' => '',
            'Salary' => '',
            'Teaching Section' => '',
            'School' => '',
            'Organization' => '',
            'Origin Location' => '',
            'Current Location' => '',
            'Religious Education Level' => '',
            'Religious Institution' => '',
            'Religious Graduation Year' => '',
            'Religious Department' => '',
            'Modern Education Level' => '',
            'Modern Institution' => '',
            'Modern Graduation Year' => '',
            'Modern Department' => '',
            'Notes' => '',
        ]);

        $response = new StreamedResponse(function () use ($rows, $header) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $header);
            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');

        return $response;
    }
}

