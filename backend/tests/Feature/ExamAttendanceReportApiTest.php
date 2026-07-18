<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamAttendance;
use App\Models\ExamClass;
use App\Models\ExamStudent;
use App\Models\ExamSubject;
use App\Models\ExamTime;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\Subject;
use App\Services\Exams\ExamAttendanceReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamAttendanceReportApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{
     *     organization: Organization,
     *     school: SchoolBranding,
     *     exam: Exam,
     *     examClass: ExamClass,
     *     examSubject: ExamSubject,
     *     examTime: ExamTime,
     *     student: Student,
     *     user: \App\Models\User
     * }
     */
    private function createFixture(): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Class 10A',
        ]);

        $cay = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $exam = Exam::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'start_date' => now()->addDays(1)->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
            'status' => Exam::STATUS_SCHEDULED,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $cay->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $subject = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Mathematics',
            'code' => 'MATH',
            'is_active' => true,
        ]);

        $classSubject = ClassSubject::create([
            'class_academic_year_id' => $cay->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $examSubject = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubject->id,
            'subject_id' => $subject->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $examTime = ExamTime::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'exam_subject_id' => $examSubject->id,
            'date' => now()->addDays(2)->toDateString(),
            'start_time' => '08:00',
            'end_time' => '11:00',
            'is_locked' => false,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'full_name' => 'Test Student',
        ]);

        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cay->id,
            'admission_year' => (string) now()->year,
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        ExamStudent::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'student_admission_id' => $admission->id,
            'exam_roll_number' => 'R-1001',
        ]);

        ExamAttendance::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'exam_id' => $exam->id,
            'exam_time_id' => $examTime->id,
            'exam_class_id' => $examClass->id,
            'exam_subject_id' => $examSubject->id,
            'student_id' => $student->id,
            'status' => ExamAttendance::STATUS_PRESENT,
            'seat_number' => '12',
        ]);

        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        setPermissionsTeamId($organization->id);

        $permission = Permission::firstOrCreate([
            'name' => 'exams.view_attendance_reports',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'exams',
            'action' => 'view_attendance_reports',
        ]);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return compact('organization', 'school', 'exam', 'examClass', 'examSubject', 'examTime', 'student', 'user');
    }

    /** @test */
    public function summary_includes_by_class_subject_matrix(): void
    {
        $fx = $this->createFixture();

        $response = $this->jsonAs(
            $fx['user'],
            'GET',
            "/api/exams/{$fx['exam']->id}/attendance/summary"
        );

        $response->assertOk()
            ->assertJsonPath('by_class_subject.0.subject_name', 'Mathematics')
            ->assertJsonPath('by_class_subject.0.present', 1)
            ->assertJsonPath('by_class_subject.0.unmarked', 0);
    }

    /** @test */
    public function report_detail_returns_students(): void
    {
        $fx = $this->createFixture();

        $response = $this->jsonAs(
            $fx['user'],
            'GET',
            '/api/exams/'.$fx['exam']->id.'/attendance/report/detail?'.http_build_query([
                'exam_class_id' => $fx['examClass']->id,
                'exam_subject_id' => $fx['examSubject']->id,
            ])
        );

        $response->assertOk()
            ->assertJsonPath('students.0.student_name', 'Test Student')
            ->assertJsonPath('students.0.status_key', 'present')
            ->assertJsonPath('counts.present', 1);
    }

    /** @test */
    public function excel_zip_pack_contains_class_subject_file(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamAttendanceReportService::class);
        $result = $service->generateStoredZip(
            'exam_attendance_excel_zip',
            $fx['organization']->id,
            $fx['school']->id,
            ['exam_id' => $fx['exam']->id]
        );

        $this->assertNotEmpty($result['path']);
        $this->assertStringEndsWith('.zip', $result['filename']);
        $this->assertGreaterThan(0, $result['row_count']);
    }

    /** @test */
    public function excel_zip_respects_class_filter(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamAttendanceReportService::class);
        $result = $service->generateStoredZip(
            'exam_attendance_excel_zip',
            $fx['organization']->id,
            $fx['school']->id,
            [
                'exam_id' => $fx['exam']->id,
                'exam_class_id' => $fx['examClass']->id,
                'exam_subject_id' => $fx['examSubject']->id,
            ]
        );

        $this->assertGreaterThan(0, $result['row_count']);
    }

    /** @test */
    public function session_excel_report_builds_for_hall_sitting(): void
    {
        $fx = $this->createFixture();

        $service = app(ExamAttendanceReportService::class);
        $result = $service->generateStoredSessionReport(
            'exam_attendance_session_excel',
            $fx['organization']->id,
            $fx['school']->id,
            [
                'exam_id' => $fx['exam']->id,
                'session_date' => $fx['examTime']->date->format('Y-m-d'),
                'session_start_time' => '08:00',
            ]
        );

        $this->assertNotEmpty($result['path']);
        $this->assertStringEndsWith('.xlsx', $result['filename']);
        $this->assertGreaterThan(0, $result['row_count']);
    }
}
