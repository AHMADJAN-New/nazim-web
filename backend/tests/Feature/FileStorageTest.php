<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\Student;
use App\Models\Staff;
use App\Services\Storage\FileStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileStorageTest extends TestCase
{
    use RefreshDatabase;

    private FileStorageService $fileStorageService;
    private Organization $organization;
    private Profile $profile;
    private string $schoolId;

    protected function setUp(): void
    {
        parent::setUp();
        
        Storage::fake('local');
        Storage::fake('public');
        
        $this->fileStorageService = app(FileStorageService::class);
        
        // Create test organization
        $this->organization = Organization::factory()->create();
        $this->ensureActiveSubscription($this->organization, 'enterprise');
        
        // Create test profile
        $this->profile = Profile::factory()->create([
            'organization_id' => $this->organization->id,
        ]);
        
        // Create test school (using school_branding table)
        $school = \App\Models\SchoolBranding::factory()->create([
            'organization_id' => $this->organization->id,
        ]);
        $this->schoolId = $school->id;
    }

    // ==============================================
    // STUDENT FILE TESTS
    // ==============================================

    public function test_student_picture_upload_creates_private_file(): void
    {
        $student = Student::factory()->create([
            'organization_id' => $this->organization->id,
            'school_id' => $this->schoolId,
        ]);

        $file = UploadedFile::fake()->image('student.jpg', 200, 200);

        $path = $this->fileStorageService->storeStudentPicture(
            $file,
            $this->organization->id,
            $student->id,
            $student->school_id
        );

        // Verify file is stored in private disk
        Storage::disk('local')->assertExists($path);
        Storage::disk('public')->assertMissing($path);
        
        // Verify path structure
        $this->assertStringStartsWith("organizations/{$this->organization->id}/schools/{$this->schoolId}/students/{$student->id}/pictures/", $path);
    }

    public function test_student_document_upload_creates_private_file(): void
    {
        $student = Student::factory()->create([
            'organization_id' => $this->organization->id,
            'school_id' => $this->schoolId,
        ]);

        $file = UploadedFile::fake()->create('document.pdf', 100);

        $path = $this->fileStorageService->storeStudentDocument(
            $file,
            $this->organization->id,
            $student->id,
            $student->school_id,
            'birth_certificate'
        );

        Storage::disk('local')->assertExists($path);
        $this->assertStringContainsString("students/{$student->id}/documents/birth_certificate/", $path);
    }

    // ==============================================
    // STAFF FILE TESTS
    // ==============================================

    public function test_staff_picture_upload_creates_public_file(): void
    {
        $staff = Staff::factory()->create([
            'organization_id' => $this->organization->id,
            'school_id' => $this->schoolId,
        ]);

        $file = UploadedFile::fake()->image('staff.jpg', 200, 200);

        $path = $this->fileStorageService->storeStaffPicturePublic(
            $file,
            $this->organization->id,
            $staff->id,
            $staff->school_id
        );

        // Verify file is stored in public disk
        Storage::disk('public')->assertExists($path);
        
        // Verify public URL can be generated
        $url = $this->fileStorageService->getPublicUrl($path);
        $this->assertStringContainsString('/storage/', $url);
    }

    public function test_staff_document_upload_creates_private_file(): void
    {
        $staff = Staff::factory()->create([
            'organization_id' => $this->organization->id,
            'school_id' => $this->schoolId,
        ]);

        $file = UploadedFile::fake()->create('contract.pdf', 200);

        $path = $this->fileStorageService->storeStaffDocument(
            $file,
            $this->organization->id,
            $staff->id,
            $staff->school_id,
            'contract'
        );

        Storage::disk('local')->assertExists($path);
        
        // Verify private download URL
        $url = $this->fileStorageService->getPrivateDownloadUrl($path);
        $this->assertStringContainsString('/api/storage/download/', $url);
    }

    // ==============================================
    // DMS FILE TESTS (School-Scoped)
    // ==============================================

    public function test_dms_file_upload_is_school_scoped(): void
    {
        $file = UploadedFile::fake()->create('letter.pdf', 100);
        $documentId = 'doc-123';

        $path = $this->fileStorageService->storeDmsFile(
            $file,
            $this->organization->id,
            $this->schoolId,
            'incoming',
            $documentId
        );

        // Verify path includes school_id
        $this->assertStringContainsString("organizations/{$this->organization->id}/schools/{$this->schoolId}/dms/incoming/{$documentId}/files/", $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // TEMPLATE FILE TESTS
    // ==============================================

    public function test_id_card_template_background_includes_template_id(): void
    {
        $file = UploadedFile::fake()->image('background.png');
        $templateId = 'template-123';

        $path = $this->fileStorageService->storeIdCardTemplateBackground(
            $file,
            $this->organization->id,
            $this->schoolId,
            $templateId,
            'front'
        );

        $this->assertStringContainsString("templates/id-cards/{$templateId}/background_front.png", $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_certificate_template_background_includes_template_id(): void
    {
        $file = UploadedFile::fake()->image('background.jpg');
        $templateId = 'template-456';

        $path = $this->fileStorageService->storeCertificateTemplateBackground(
            $file,
            $this->organization->id,
            $this->schoolId,
            $templateId
        );

        $this->assertStringContainsString("templates/certificates/{$templateId}/background.jpg", $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // REPORT FILE TESTS
    // ==============================================

    public function test_report_storage_includes_organization_and_school(): void
    {
        $content = 'PDF Report Content';
        $filename = 'report_2024.pdf';
        $reportKey = 'attendance';

        $path = $this->fileStorageService->storeReport(
            $content,
            $filename,
            $this->organization->id,
            $this->schoolId,
            $reportKey
        );

        $this->assertStringContainsString("organizations/{$this->organization->id}/schools/{$this->schoolId}/reports/{$reportKey}/", $path);
        Storage::disk('local')->assertExists($path);
        $this->assertEquals($content, Storage::disk('local')->get($path));
    }

    // ==============================================
    // FILE OPERATIONS TESTS
    // ==============================================

    public function test_file_deletion_removes_file(): void
    {
        $file = UploadedFile::fake()->create('test.txt', 10);
        $path = Storage::disk('local')->putFile('test', $file);

        $this->assertTrue($this->fileStorageService->fileExists($path));
        $this->assertTrue($this->fileStorageService->deleteFile($path));
        $this->assertFalse($this->fileStorageService->fileExists($path));
    }

    public function test_get_file_size_returns_correct_size(): void
    {
        $content = 'Test content';
        Storage::disk('local')->put('test.txt', $content);

        $size = $this->fileStorageService->getFileSize('test.txt');
        $this->assertEquals(strlen($content), $size);
    }

    public function test_get_mime_type_returns_correct_type(): void
    {
        $file = UploadedFile::fake()->image('photo.jpg');
        $path = Storage::disk('local')->putFile('test', $file);

        $mimeType = $this->fileStorageService->getMimeType($path);
        $this->assertEquals('image/jpeg', $mimeType);
    }

    // ==============================================
    // ORGANIZATION ISOLATION TESTS
    // ==============================================

    public function test_files_are_isolated_by_organization(): void
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();
        $this->ensureActiveSubscription($org1, 'enterprise');
        $this->ensureActiveSubscription($org2, 'enterprise');

        $file1 = UploadedFile::fake()->image('photo1.jpg');
        $file2 = UploadedFile::fake()->image('photo2.jpg');

        $path1 = $this->fileStorageService->storeStudentPicture($file1, $org1->id, 'student-1', 'school-1');
        $path2 = $this->fileStorageService->storeStudentPicture($file2, $org2->id, 'student-2', 'school-2');

        // Verify paths are different
        $this->assertStringContainsString($org1->id, $path1);
        $this->assertStringContainsString($org2->id, $path2);
        $this->assertNotEquals($path1, $path2);
    }

    public function test_files_are_isolated_by_school(): void
    {
        $school1 = \App\Models\SchoolBranding::factory()->create([
            'organization_id' => $this->organization->id,
        ]);
        $school2 = \App\Models\SchoolBranding::factory()->create([
            'organization_id' => $this->organization->id,
        ]);

        $file1 = UploadedFile::fake()->image('photo1.jpg');
        $file2 = UploadedFile::fake()->image('photo2.jpg');

        $path1 = $this->fileStorageService->storeStudentPicture($file1, $this->organization->id, 'student-1', $school1->id);
        $path2 = $this->fileStorageService->storeStudentPicture($file2, $this->organization->id, 'student-2', $school2->id);

        // Verify paths include different school IDs
        $this->assertStringContainsString($school1->id, $path1);
        $this->assertStringContainsString($school2->id, $path2);
    }
}
