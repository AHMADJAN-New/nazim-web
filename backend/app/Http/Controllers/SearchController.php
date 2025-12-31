<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\ClassModel;
use App\Models\Staff;
use App\Models\Subject;
use App\Models\AcademicYear;
use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SearchController extends Controller
{
    /**
     * Unified search across all resources
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get search query - try multiple methods
        // CRITICAL: Use query() for GET request query parameters
        $query = $request->query('q', '');
        if (empty($query)) {
            $query = $request->input('q', '');
        }
        if (empty($query)) {
            $query = $request->get('q', '');
        }
        // Also try reading directly from the query string
        if (empty($query) && $request->server('QUERY_STRING')) {
            parse_str($request->server('QUERY_STRING'), $parsed);
            $query = $parsed['q'] ?? '';
        }
        $query = trim($query);

        \Log::debug('[SearchController] Request method: ' . $request->method());
        \Log::debug('[SearchController] Request URI: ' . $request->getRequestUri());
        \Log::debug('[SearchController] Query string: ' . $request->server('QUERY_STRING'));
        \Log::debug('[SearchController] All request input: ' . json_encode($request->all()));
        \Log::debug('[SearchController] All query params: ' . json_encode($request->query()));
        \Log::debug('[SearchController] Raw query parameter: ' . $query);
        \Log::debug('[SearchController] Query length: ' . strlen($query));
        if (!empty($query)) {
            \Log::debug('[SearchController] Query bytes: ' . bin2hex($query));
        }

        if (empty($query) || strlen($query) < 2) {
            \Log::debug('[SearchController] Query too short or empty, returning empty results');
            return response()->json([
                'students' => [],
                'classes' => [],
                'staff' => [],
                'subjects' => [],
                'academic_years' => [],
                'schools' => [],
            ]);
        }

        // Get current school context
        $currentSchoolId = $this->getCurrentSchoolId($request);
        $schoolIds = $this->getAccessibleSchoolIds($profile, $request);

        // Debug logging
        \Log::debug('[SearchController] Search query: ' . $query);
        \Log::debug('[SearchController] Organization ID: ' . $profile->organization_id);
        \Log::debug('[SearchController] School IDs: ' . json_encode($schoolIds));
        \Log::debug('[SearchController] Current School ID: ' . $currentSchoolId);

        // Limit results per category
        $limit = 10;

        $results = [
            'students' => $this->searchStudents($query, $profile->organization_id, $schoolIds, $limit),
            'classes' => $this->searchClasses($query, $profile->organization_id, $schoolIds, $limit),
            'staff' => $this->searchStaff($query, $profile->organization_id, $schoolIds, $limit),
            'subjects' => $this->searchSubjects($query, $profile->organization_id, $limit),
            'academic_years' => $this->searchAcademicYears($query, $profile->organization_id, $limit),
            'schools' => $this->searchSchools($query, $profile->organization_id, $schoolIds, $limit),
        ];

        \Log::debug('[SearchController] Results: ' . json_encode([
            'students_count' => count($results['students']),
            'classes_count' => count($results['classes']),
            'staff_count' => count($results['staff']),
            'subjects_count' => count($results['subjects']),
            'academic_years_count' => count($results['academic_years']),
            'schools_count' => count($results['schools']),
        ]));

        return response()->json($results);
    }

    /**
     * Search students
     */
    private function searchStudents(string $query, string $organizationId, array $schoolIds, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $queryBuilder = Student::whereNull('deleted_at')
            ->where('organization_id', $organizationId);

        // Only filter by school_id if schoolIds array is not empty
        if (!empty($schoolIds)) {
            $queryBuilder->whereIn('school_id', $schoolIds);
        }

        $students = $queryBuilder
            ->where(function ($q) use ($searchTerm) {
                $q->where('full_name', 'ILIKE', $searchTerm)
                  ->orWhere('admission_no', 'ILIKE', $searchTerm)
                  ->orWhere('father_name', 'ILIKE', $searchTerm)
                  ->orWhere('card_number', 'ILIKE', $searchTerm);
            })
            ->limit($limit)
            ->get(['id', 'full_name', 'admission_no', 'father_name', 'card_number', 'school_id'])
            ->map(function ($student) {
                return [
                    'id' => $student->id,
                    'name' => $student->full_name,
                    'admission_no' => $student->admission_no,
                    'father_name' => $student->father_name,
                    'card_number' => $student->card_number,
                    'type' => 'student',
                ];
            })
            ->toArray();

        return $students;
    }

    /**
     * Search classes
     */
    private function searchClasses(string $query, string $organizationId, array $schoolIds, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $queryBuilder = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $organizationId);

        // Only filter by school_id if schoolIds array is not empty
        if (!empty($schoolIds)) {
            $queryBuilder->whereIn('school_id', $schoolIds);
        }

        $classes = $queryBuilder
            ->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', $searchTerm)
                  ->orWhere('code', 'ILIKE', $searchTerm);
            })
            ->limit($limit)
            ->get(['id', 'name', 'code', 'school_id'])
            ->map(function ($class) {
                return [
                    'id' => $class->id,
                    'name' => $class->name,
                    'code' => $class->code,
                    'type' => 'class',
                ];
            })
            ->toArray();

        return $classes;
    }

    /**
     * Search staff
     */
    private function searchStaff(string $query, string $organizationId, array $schoolIds, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $queryBuilder = Staff::whereNull('deleted_at')
            ->where('organization_id', $organizationId);

        // Only filter by school_id if schoolIds array is not empty
        if (!empty($schoolIds)) {
            $queryBuilder->whereIn('school_id', $schoolIds);
        }

        $staff = $queryBuilder
            ->where(function ($q) use ($searchTerm) {
                $q->where('full_name', 'ILIKE', $searchTerm)
                  ->orWhere('employee_id', 'ILIKE', $searchTerm)
                  ->orWhere('position', 'ILIKE', $searchTerm);
            })
            ->limit($limit)
            ->get(['id', 'full_name', 'employee_id', 'position', 'school_id'])
            ->map(function ($staff) {
                return [
                    'id' => $staff->id,
                    'name' => $staff->full_name,
                    'employee_id' => $staff->employee_id,
                    'position' => $staff->position,
                    'type' => 'staff',
                ];
            })
            ->toArray();

        return $staff;
    }

    /**
     * Search subjects
     */
    private function searchSubjects(string $query, string $organizationId, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $subjects = Subject::whereNull('deleted_at')
            ->where('organization_id', $organizationId)
            ->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', $searchTerm)
                  ->orWhere('code', 'ILIKE', $searchTerm);
            })
            ->limit($limit)
            ->get(['id', 'name', 'code'])
            ->map(function ($subject) {
                return [
                    'id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'type' => 'subject',
                ];
            })
            ->toArray();

        return $subjects;
    }

    /**
     * Search academic years
     */
    private function searchAcademicYears(string $query, string $organizationId, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $academicYears = AcademicYear::whereNull('deleted_at')
            ->where('organization_id', $organizationId)
            ->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', $searchTerm)
                  ->orWhere('start_year', 'ILIKE', $searchTerm)
                  ->orWhere('end_year', 'ILIKE', $searchTerm);
            })
            ->limit($limit)
            ->get(['id', 'name', 'start_year', 'end_year'])
            ->map(function ($year) {
                return [
                    'id' => $year->id,
                    'name' => $year->name,
                    'start_year' => $year->start_year,
                    'end_year' => $year->end_year,
                    'type' => 'academic_year',
                ];
            })
            ->toArray();

        return $academicYears;
    }

    /**
     * Search schools
     */
    private function searchSchools(string $query, string $organizationId, array $schoolIds, int $limit): array
    {
        $searchTerm = '%' . $query . '%';

        $queryBuilder = SchoolBranding::whereNull('deleted_at')
            ->where('organization_id', $organizationId);

        // Only filter by school_id if schoolIds array is not empty
        if (!empty($schoolIds)) {
            $queryBuilder->whereIn('id', $schoolIds);
        }

        $schools = $queryBuilder
            ->where('school_name', 'ILIKE', $searchTerm)
            ->limit($limit)
            ->get(['id', 'school_name'])
            ->map(function ($school) {
                return [
                    'id' => $school->id,
                    'name' => $school->school_name,
                    'type' => 'school',
                ];
            })
            ->toArray();

        return $schools;
    }
}

