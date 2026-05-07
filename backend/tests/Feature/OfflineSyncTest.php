<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceRoundName;
use App\Models\AttendanceSession;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\StudentAdmission;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class OfflineSyncTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function snapshot_returns_school_slice_for_authenticated_admin()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        ClassModel::factory()->count(2)->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
        ]);
        Student::factory()->count(3)->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
        ]);
        $this->createRoundName($org->id, $school->id);

        $response = $this->jsonAs($user, 'GET', "/api/schools/{$school->id}/offline-snapshot");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'server_time', 'school',
                'students' => ['data', 'next_cursor'],
                'classes' => ['data', 'next_cursor'],
                'attendance_round_names' => ['data', 'next_cursor'],
                'academic_years' => ['data', 'next_cursor'],
                'attendance_sessions' => ['data', 'next_cursor'],
                'attendance_records' => ['data', 'next_cursor'],
                'tombstones', 'complete',
            ]);

        $this->assertCount(3, $response->json('students.data'));
        $this->assertCount(2, $response->json('classes.data'));
        $this->assertCount(1, $response->json('attendance_round_names.data'));
        $this->assertTrue($response->json('complete'));
    }

    /** @test */
    public function snapshot_delta_only_returns_entities_updated_since_timestamp()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        // baseline rows that pre-date our cutoff
        // NOTE: students table has a BEFORE UPDATE trigger that overwrites updated_at,
        // so backdating via UPDATE won't work. Use Carbon test time instead.
        Carbon::setTestNow(now()->subDays(2));
        $oldStudent = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        Carbon::setTestNow();

        $cutoff = now()->subDay()->toIso8601String();

        // add a new student after the cutoff
        $newStudent = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);

        $response = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$school->id}/offline-snapshot?since={$cutoff}"
        );

        $response->assertStatus(200);
        $studentIds = collect($response->json('students.data'))->pluck('id')->all();
        $this->assertContains($newStudent->id, $studentIds);
        $this->assertNotContains($oldStudent->id, $studentIds);
    }

    /** @test */
    public function snapshot_returns_tombstones_for_soft_deleted_entities_in_delta_window()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $student = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $cutoff = now()->subSecond()->toIso8601String();
        $student->delete();

        $response = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$school->id}/offline-snapshot?since={$cutoff}"
        );

        $response->assertStatus(200);
        $this->assertContains($student->id, $response->json('tombstones.students'));
    }

    /** @test */
    public function snapshot_paginates_via_cursor_and_returns_complete_false_when_more_remaining()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        // create more students than the requested page size
        Student::factory()->count(3)->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);

        $first = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$school->id}/offline-snapshot?limit=1"
        );
        $first->assertStatus(200);
        $this->assertCount(1, $first->json('students.data'));
        $this->assertNotNull($first->json('students.next_cursor'));
        $this->assertFalse($first->json('complete'));

        $cursor = urlencode($first->json('students.next_cursor'));
        $second = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$school->id}/offline-snapshot?limit=1&students_cursor={$cursor}"
        );
        $second->assertStatus(200);
        $this->assertCount(1, $second->json('students.data'));
        $this->assertNotEquals(
            $first->json('students.data.0.id'),
            $second->json('students.data.0.id')
        );
    }

    /** @test */
    public function snapshot_rejects_school_id_that_does_not_match_user_context()
    {
        $user = $this->authenticate();
        $bogusSchoolId = (string) Str::uuid();

        $response = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$bogusSchoolId}/offline-snapshot"
        );

        $response->assertStatus(403);
    }

    /** @test */
    public function snapshot_is_denied_when_user_lacks_offline_sync_permission()
    {
        // teacher role does not auto-receive attendance.offline_sync
        $user = $this->authenticate(options: ['role' => 'teacher']);
        $school = $this->getUserSchool($user);

        $response = $this->jsonAs(
            $user,
            'GET',
            "/api/schools/{$school->id}/offline-snapshot"
        );

        $response->assertStatus(403);
    }

    /** @test */
    public function bulk_sync_creates_session_with_client_supplied_uuid_and_records()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $student = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        StudentAdmission::create([
            'organization_id' => $org->id, 'school_id' => $school->id,
            'student_id' => $student->id, 'class_id' => $class->id,
        ]);
        $round = $this->createRoundName($org->id, $school->id);

        $sessionId = (string) Str::uuid();
        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', [
            'items' => [
                [
                    'client_ref' => 'a1',
                    'operation' => 'session.create',
                    'session' => [
                        'id' => $sessionId,
                        'class_id' => $class->id,
                        'session_date' => now()->toDateString(),
                        'attendance_round_name_id' => $round->id,
                        'method' => 'manual',
                    ],
                    'records' => [[
                        'student_id' => $student->id,
                        'status' => 'present',
                    ]],
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('summary.ok', 1)
            ->assertJsonPath('results.0.status', 'ok')
            ->assertJsonPath('results.0.session_id', $sessionId);

        $this->assertDatabaseHas('attendance_sessions', ['id' => $sessionId]);
        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $sessionId,
            'student_id' => $student->id,
            'status' => 'present',
        ]);
    }

    /** @test */
    public function bulk_sync_replay_is_idempotent()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $student = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        StudentAdmission::create([
            'organization_id' => $org->id, 'school_id' => $school->id,
            'student_id' => $student->id, 'class_id' => $class->id,
        ]);
        $round = $this->createRoundName($org->id, $school->id);

        $sessionId = (string) Str::uuid();
        $payload = [
            'items' => [[
                'client_ref' => 'a1',
                'operation' => 'session.create',
                'session' => [
                    'id' => $sessionId,
                    'class_id' => $class->id,
                    'session_date' => now()->toDateString(),
                    'attendance_round_name_id' => $round->id,
                    'method' => 'manual',
                ],
                'records' => [[
                    'student_id' => $student->id,
                    'status' => 'present',
                ]],
            ]],
        ];

        $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', $payload)->assertStatus(200);
        $replay = $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', $payload);

        $replay->assertStatus(200)
            ->assertJsonPath('results.0.status', 'ok')
            ->assertJsonPath('results.0.idempotent', true);

        // No duplicate session, no duplicate record.
        $this->assertSame(1, AttendanceSession::where('id', $sessionId)->count());
        $this->assertSame(1, AttendanceRecord::where('attendance_session_id', $sessionId)
            ->where('student_id', $student->id)
            ->count());
    }

    /** @test */
    public function bulk_sync_close_session_marks_unmarked_students_absent()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $marked = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $unmarked = Student::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        foreach ([$marked, $unmarked] as $s) {
            StudentAdmission::create([
                'organization_id' => $org->id, 'school_id' => $school->id,
                'student_id' => $s->id, 'class_id' => $class->id,
            ]);
        }

        $session = AttendanceSession::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
            'class_id' => $class->id, 'method' => 'manual', 'status' => 'open',
        ]);
        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'student_id' => $marked->id,
            'status' => 'present',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', [
            'items' => [[
                'operation' => 'session.close',
                'session_id' => $session->id,
            ]],
        ]);

        $response->assertStatus(200)->assertJsonPath('results.0.status', 'ok');
        $this->assertDatabaseHas('attendance_sessions', [
            'id' => $session->id, 'status' => 'closed',
        ]);
        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $unmarked->id,
            'status' => 'absent',
        ]);
    }

    /** @test */
    public function bulk_sync_returns_per_item_errors_without_failing_whole_batch()
    {
        $user = $this->authenticate();
        $org = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $org->id, 'school_id' => $school->id,
        ]);
        $round = $this->createRoundName($org->id, $school->id);

        $goodId = (string) Str::uuid();
        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', [
            'items' => [
                [
                    'client_ref' => 'good',
                    'operation' => 'session.create',
                    'session' => [
                        'id' => $goodId,
                        'class_id' => $class->id,
                        'session_date' => now()->toDateString(),
                        'attendance_round_name_id' => $round->id,
                        'method' => 'manual',
                    ],
                ],
                [
                    'client_ref' => 'bad',
                    'operation' => 'session.close',
                    'session_id' => (string) Str::uuid(), // does not exist
                ],
            ],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('summary.ok', 1)
            ->assertJsonPath('summary.errors', 1)
            ->assertJsonPath('results.0.status', 'ok')
            ->assertJsonPath('results.1.status', 'error');
    }

    /** @test */
    public function bulk_sync_is_denied_when_user_lacks_permission()
    {
        $user = $this->authenticate(options: ['role' => 'teacher']);

        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions/bulk-sync', [
            'items' => [['operation' => 'session.close', 'session_id' => (string) Str::uuid()]],
        ]);

        $response->assertStatus(403);
    }

    private function createRoundName(string $organizationId, string $schoolId, array $overrides = []): AttendanceRoundName
    {
        return AttendanceRoundName::create(array_merge([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'name' => 'Morning '.substr((string) now()->timestamp, -4),
            'order_index' => 1,
            'is_active' => true,
        ], $overrides));
    }
}
