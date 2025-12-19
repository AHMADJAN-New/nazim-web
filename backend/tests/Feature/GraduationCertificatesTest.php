<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\ClassModel;
use App\Models\Exam;
use App\Models\GraduationBatch;
use App\Models\IssuedCertificate;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class GraduationCertificatesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test that certificate verification endpoint returns 404 for invalid hash
     */
    public function test_verify_endpoint_returns_not_found_for_invalid_hash(): void
    {
        $response = $this->getJson('/api/verify/certificate/not-a-real-hash');
        $response->assertStatus(404);
        $response->assertJsonStructure(['status', 'message']);
        $response->assertJson(['status' => 'invalid']);
    }

    /**
     * Test that graduation batch creation requires authentication
     */
    public function test_graduation_batch_creation_requires_authentication(): void
    {
        $response = $this->postJson('/api/graduation/batches', []);
        $response->assertStatus(401);
    }

    /**
     * Test that users cannot access graduation batches without proper permission
     */
    public function test_graduation_batch_list_requires_permission(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/graduation/batches');

        $response->assertStatus(403);
        $response->assertJson(['error' => 'This action is unauthorized']);
    }

    /**
     * Test that exam status cannot be rolled back if graduation batches exist
     * This test verifies CB-5 fix
     */
    public function test_exam_status_cannot_rollback_with_graduation_batches(): void
    {
        // Setup: Create organization, school, exam, and graduation batch
        $org = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $org->id]);
        $academicYear = AcademicYear::factory()->create(['organization_id' => $org->id]);
        $class = ClassModel::factory()->create(['organization_id' => $org->id]);

        $exam = Exam::factory()->create([
            'organization_id' => $org->id,
            'academic_year_id' => $academicYear->id,
            'status' => Exam::STATUS_COMPLETED,
        ]);

        $batch = GraduationBatch::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'exam_id' => $exam->id,
        ]);

        $user = User::factory()->create();
        Permission::create(['name' => 'exams.update', 'guard_name' => 'web']);
        $user->givePermissionTo('exams.update');

        // Attempt to change exam status from completed to in_progress
        $response = $this->actingAs($user)
            ->postJson("/api/exams/{$exam->id}/status", [
                'status' => Exam::STATUS_IN_PROGRESS,
            ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'error' => 'Cannot change exam status because graduation batches have been created for this exam',
        ]);
    }

    /**
     * Test that certificate verification shows revoked status
     */
    public function test_certificate_verification_shows_revoked_status(): void
    {
        $org = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $org->id]);
        $student = Student::factory()->create(['organization_id' => $org->id, 'school_id' => $school->id]);
        $template = CertificateTemplate::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
        ]);

        $certificate = IssuedCertificate::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'template_id' => $template->id,
            'student_id' => $student->id,
            'verification_hash' => 'test-hash-123',
            'revoked_at' => now(),
            'revoke_reason' => 'Test revocation',
        ]);

        $response = $this->getJson('/api/verify/certificate/test-hash-123');

        $response->assertStatus(200);
        $response->assertJson(['status' => 'revoked']);
        $response->assertJsonStructure([
            'status',
            'student_name',
            'school_name',
            'certificate_no',
            'issued_at',
            'revoked_at',
            'revoke_reason',
        ]);
    }

    /**
     * Test that valid certificate verification shows valid status
     */
    public function test_certificate_verification_shows_valid_status(): void
    {
        $org = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $org->id, 'school_name' => 'Test School']);
        $student = Student::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'full_name' => 'John Doe',
        ]);
        $template = CertificateTemplate::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
        ]);

        $certificate = IssuedCertificate::factory()->create([
            'organization_id' => $org->id,
            'school_id' => $school->id,
            'template_id' => $template->id,
            'student_id' => $student->id,
            'certificate_no' => 'NZM-GRAD-2024-0001',
            'verification_hash' => 'valid-hash-456',
            'revoked_at' => null,
        ]);

        $response = $this->getJson('/api/verify/certificate/valid-hash-456');

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'valid',
            'student_name' => 'John Doe',
            'school_name' => 'Test School',
            'certificate_no' => 'NZM-GRAD-2024-0001',
        ]);
        $response->assertJsonMissing(['revoked_at']);
    }
}
