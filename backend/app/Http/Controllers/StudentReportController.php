<?php

namespace App\Http\Controllers;

use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentReportController extends Controller
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

        $query = Student::with(['school']);
        $this->applyFilters($request, $query, $orgId, $currentSchoolId);

        $students = $query->orderBy('full_name')->get();
        $rows = $this->mapStudents($students);

        $format = strtolower($request->get('format', 'csv'));

        if ($format === 'pdf') {
            $html = View::make('reports.student-registration', [
                'rows' => $rows,
                'generatedAt' => now()->format('Y-m-d H:i'),
                'organization' => $profile->organization_id,
            ])->render();

            $pdf = app('dompdf.wrapper');
            $pdf->loadHTML($html)->setPaper('a4', 'landscape');

            return $pdf->download('student-registration-report.pdf');
        }

        $filename = $format === 'xlsx' ? 'student-registration-report.xlsx' : 'student-registration-report.csv';
        $header = array_keys($rows->first() ?? [
            'Admission #' => '',
            'Card #' => '',
            'Status' => '',
            'Full Name' => '',
            'Father Name' => '',
            'Gender' => '',
            'Age' => '',
            'Birth Date' => '',
            'Nationality' => '',
            'Address' => '',
            'Phone' => '',
            'Guardian' => '',
            'Applying Grade' => '',
            'School' => '',
            'Admission Year' => '',
            'Admission Fee Status' => '',
            'Origin Location' => '',
            'Current Location' => '',
            'Previous School' => '',
            'Orphan' => '',
            'Disability' => '',
            'Emergency Contact' => '',
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
