<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Building;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\ClassSubject;
use App\Models\Exam;
use App\Models\ExamClass;
use App\Models\ExamSubject;
use App\Models\ExamTime;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Room;
use App\Models\SchoolBranding;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExamTimetableSlotEditTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
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
            'name' => 'Grade 1',
            'grade_level' => 1,
        ]);

        $classAcademicYear = ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'capacity' => 30,
            'current_student_count' => 0,
            'is_active' => true,
        ]);

        $otherClass = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Grade 2',
            'grade_level' => 2,
        ]);

        $otherClassYear = ClassAcademicYear::create([
            'class_id' => $otherClass->id,
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
            'status' => Exam::STATUS_DRAFT,
        ]);

        $examClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $classAcademicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $otherExamClass = ExamClass::create([
            'exam_id' => $exam->id,
            'class_academic_year_id' => $otherClassYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $subjectA = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Math',
            'code' => 'MATH-'.Str::lower(Str::random(4)),
            'is_active' => true,
        ]);

        $subjectB = Subject::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'English',
            'code' => 'ENG-'.Str::lower(Str::random(4)),
            'is_active' => true,
        ]);

        $classSubjectA = ClassSubject::create([
            'class_academic_year_id' => $classAcademicYear->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $classSubjectB = ClassSubject::create([
            'class_academic_year_id' => $classAcademicYear->id,
            'subject_id' => $subjectB->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $otherClassSubject = ClassSubject::create([
            'class_academic_year_id' => $otherClassYear->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'is_required' => true,
        ]);

        $examSubjectA = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $examClass->id,
            'class_subject_id' => $classSubjectA->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $otherExamSubject = ExamSubject::create([
            'exam_id' => $exam->id,
            'exam_class_id' => $otherExamClass->id,
            'class_subject_id' => $otherClassSubject->id,
            'subject_id' => $subjectA->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $building = Building::create([
            'building_name' => 'Exam Hall',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => 'R-'.Str::upper(Str::random(4)),
            'building_id' => $building->id,
            'school_id' => $school->id,
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
        $permission = Permission::firstOrCreate([
            'name' => 'exams.manage_timetable',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'exams',
            'action' => 'manage_timetable',
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return compact(
            'organization',
            'school',
            'exam',
            'examClass',
            'otherExamClass',
            'classSubjectA',
            'classSubjectB',
            'examSubjectA',
            'otherExamSubject',
            'room',
            'user'
        );
    }

    /** @test */
    public function update_persists_clock_with_seconds_and_switches_class_subject(): void
    {
        $fixture = $this->createFixture();
        $date = now()->addDays(2)->toDateString();
        $newDate = now()->addDays(3)->toDateString();

        $examTime = ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectA']->id,
            'date' => $date,
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
            'is_locked' => false,
            'sort_order' => 0,
        ]);

        $response = $this->jsonAs($fixture['user'], 'PUT', "/api/exam-times/{$examTime->id}", [
            'date' => $newDate,
            'start_time' => '10:15:00',
            'end_time' => '12:00:00',
            'room_id' => $fixture['room']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'sync_slot' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('room_id', $fixture['room']->id);

        $this->assertDatabaseHas('exam_times', [
            'id' => $examTime->id,
            'date' => $newDate,
            'start_time' => '10:15:00',
            'end_time' => '12:00:00',
            'room_id' => $fixture['room']->id,
        ]);

        $examTime->refresh();
        $this->assertNotSame($fixture['examSubjectA']->id, $examTime->exam_subject_id);
        $this->assertDatabaseHas('exam_subjects', [
            'id' => $examTime->exam_subject_id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'exam_class_id' => $fixture['examClass']->id,
        ]);
    }

    /** @test */
    public function a_class_subject_can_share_a_slot_and_room_then_be_reordered(): void
    {
        $fixture = $this->createFixture();
        $date = now()->addDays(4)->toDateString();

        $first = ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectA']->id,
            'date' => $date,
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
            'room_id' => $fixture['room']->id,
            'is_locked' => false,
            'sort_order' => 0,
        ]);

        $created = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/times", [
            'exam_class_id' => $fixture['examClass']->id,
            'class_subject_id' => $fixture['classSubjectB']->id,
            'date' => $date,
            'start_time' => '08:00',
            'end_time' => '10:00',
            'room_id' => $fixture['room']->id,
        ]);

        $created->assertCreated();
        $secondId = $created->json('id');
        $this->assertNotEmpty($secondId);

        $reordered = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/times/reorder", [
            'exam_time_ids' => [$secondId, $first->id],
        ]);

        $reordered->assertOk();
        $this->assertDatabaseHas('exam_times', ['id' => $secondId, 'sort_order' => 0]);
        $this->assertDatabaseHas('exam_times', ['id' => $first->id, 'sort_order' => 1]);
    }

    /** @test */
    public function a_different_class_cannot_overlap_the_same_room(): void
    {
        $fixture = $this->createFixture();
        $date = now()->addDays(5)->toDateString();

        ExamTime::create([
            'organization_id' => $fixture['organization']->id,
            'school_id' => $fixture['school']->id,
            'exam_id' => $fixture['exam']->id,
            'exam_class_id' => $fixture['examClass']->id,
            'exam_subject_id' => $fixture['examSubjectA']->id,
            'date' => $date,
            'start_time' => '08:00:00',
            'end_time' => '10:00:00',
            'room_id' => $fixture['room']->id,
            'is_locked' => false,
            'sort_order' => 0,
        ]);

        $response = $this->jsonAs($fixture['user'], 'POST', "/api/exams/{$fixture['exam']->id}/times", [
            'exam_class_id' => $fixture['otherExamClass']->id,
            'exam_subject_id' => $fixture['otherExamSubject']->id,
            'date' => $date,
            'start_time' => '09:00',
            'end_time' => '11:00',
            'room_id' => $fixture['room']->id,
        ]);

        $response->assertStatus(422);
    }
}
