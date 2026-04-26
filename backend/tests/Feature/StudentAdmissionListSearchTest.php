<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class StudentAdmissionListSearchTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function admissions_list_search_matches_only_student_name_admission_number_and_card_number(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $classAcademicYear = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);

        $student = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'AdmissionSearch Student',
            'admission_no' => 'ADM-LIST-SEARCH-55',
            'card_number' => 'CARD-LIST-SEARCH-66',
            'father_name' => 'FatherTokenAdmissionList77192xx',
        ]);

        $this->createStudentAdmissionForSchool($organization, $school, $student, $academicYear, $class, $classAcademicYear);

        $params = ['page' => 1, 'per_page' => 25];

        $byFather = $this->jsonAs($user, 'GET', '/api/student-admissions', array_merge($params, [
            'search' => 'FatherTokenAdmissionList77192xx',
        ]));
        $byFather->assertStatus(200);
        $this->assertSame([], $byFather->json('data'));

        $byCard = $this->jsonAs($user, 'GET', '/api/student-admissions', array_merge($params, [
            'search' => 'CARD-LIST-SEARCH-66',
        ]));
        $byCard->assertStatus(200);
        $rows = $byCard->json('data');
        $this->assertNotEmpty($rows);
        $this->assertSame($student->id, $rows[0]['student_id']);
    }

    #[Test]
    public function admissions_report_search_matches_only_student_name_admission_number_and_card_number(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $classAcademicYear = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);

        $student = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'ReportSearch Student',
            'admission_no' => 'ADM-REPORT-SEARCH-88',
            'card_number' => 'CARD-REPORT-SEARCH-99',
            'father_name' => 'FatherTokenReportSearch88192xx',
        ]);

        $this->createStudentAdmissionForSchool($organization, $school, $student, $academicYear, $class, $classAcademicYear);

        $byFather = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'page' => 1,
            'per_page' => 25,
            'search' => 'FatherTokenReportSearch88192xx',
        ]);
        $byFather->assertStatus(200);
        $this->assertSame(0, $byFather->json('pagination.total'));

        $byCard = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'page' => 1,
            'per_page' => 25,
            'search' => 'CARD-REPORT-SEARCH-99',
        ]);
        $byCard->assertStatus(200);
        $this->assertSame(1, $byCard->json('pagination.total'));
    }

    #[Test]
    public function admissions_report_admission_presence_filter_supports_with_and_without_values(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $classAcademicYear = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);

        $student = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'Presence Filter Student',
            'admission_no' => 'ADM-PRES-01',
        ]);

        $this->createStudentAdmissionForSchool($organization, $school, $student, $academicYear, $class, $classAcademicYear);

        $withAdmission = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'page' => 1,
            'per_page' => 25,
            'admission_presence' => 'with_admission',
        ]);
        $withAdmission->assertStatus(200);
        $this->assertSame(1, $withAdmission->json('pagination.total'));

        $withoutAdmission = $this->jsonAs($user, 'GET', '/api/student-admissions/report', [
            'page' => 1,
            'per_page' => 25,
            'admission_presence' => 'without_admission',
        ]);
        $withoutAdmission->assertStatus(200);
        $this->assertSame(0, $withoutAdmission->json('pagination.total'));
    }

    #[Test]
    public function admissions_list_can_be_filtered_by_student_origin_province(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $classAcademicYear = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);

        $kabulStudent = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'Kabul Province Student',
            'orig_province' => 'Kabul',
        ]);
        $this->createStudentAdmissionForSchool($organization, $school, $kabulStudent, $academicYear, $class, $classAcademicYear);

        $heratStudent = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'Herat Province Student',
            'orig_province' => 'Herat',
        ]);
        $this->createStudentAdmissionForSchool($organization, $school, $heratStudent, $academicYear, $class, $classAcademicYear);

        $response = $this->jsonAs($user, 'GET', '/api/student-admissions', [
            'page' => 1,
            'per_page' => 25,
            'orig_province' => 'Kabul',
        ]);

        $response->assertStatus(200);
        $rows = $response->json('data');
        $this->assertCount(1, $rows);
        $this->assertSame($kabulStudent->id, $rows[0]['student_id']);
    }
}
