<?php

namespace Tests\Unit;

use App\Services\Storage\FileStorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FileStorageServiceTest extends TestCase
{
    private FileStorageService $service;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('public');
        $this->service = new FileStorageService();
    }

    // ==============================================
    // STUDENT FILES TESTS
    // ==============================================

    public function test_store_student_picture_creates_correct_path(): void
    {
        $file = UploadedFile::fake()->image('photo.jpg');
        $organizationId = 'org-123';
        $studentId = 'student-456';
        $schoolId = 'school-789';

        $path = $this->service->storeStudentPicture($file, $organizationId, $studentId, $schoolId);

        $this->assertStringStartsWith("organizations/{$organizationId}/schools/{$schoolId}/students/{$studentId}/pictures/", $path);
        $this->assertStringEndsWith('.jpg', $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_store_student_picture_without_school_id(): void
    {
        $file = UploadedFile::fake()->image('photo.png');
        $organizationId = 'org-123';
        $studentId = 'student-456';

        $path = $this->service->storeStudentPicture($file, $organizationId, $studentId, null);

        $this->assertStringStartsWith("organizations/{$organizationId}/students/{$studentId}/pictures/", $path);
        $this->assertStringEndsWith('.png', $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_store_student_document_creates_correct_path(): void
    {
        $file = UploadedFile::fake()->create('document.pdf', 100);
        $organizationId = 'org-123';
        $studentId = 'student-456';
        $schoolId = 'school-789';
        $documentType = 'birth_certificate';

        $path = $this->service->storeStudentDocument($file, $organizationId, $studentId, $schoolId, $documentType);

        $this->assertStringContains("organizations/{$organizationId}/schools/{$schoolId}/students/{$studentId}/documents/{$documentType}/", $path);
        $this->assertStringEndsWith('.pdf', $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // STAFF FILES TESTS
    // ==============================================

    public function test_store_staff_picture_public_uses_public_disk(): void
    {
        $file = UploadedFile::fake()->image('staff.jpg');
        $organizationId = 'org-123';
        $staffId = 'staff-456';
        $schoolId = 'school-789';

        $path = $this->service->storeStaffPicturePublic($file, $organizationId, $staffId, $schoolId);

        $this->assertStringStartsWith("organizations/{$organizationId}/schools/{$schoolId}/staff/{$staffId}/pictures/", $path);
        Storage::disk('public')->assertExists($path);
    }

    public function test_store_staff_document_uses_private_disk(): void
    {
        $file = UploadedFile::fake()->create('contract.pdf', 200);
        $organizationId = 'org-123';
        $staffId = 'staff-456';
        $documentType = 'contract';

        $path = $this->service->storeStaffDocument($file, $organizationId, $staffId, null, $documentType);

        $this->assertStringContains("staff/{$staffId}/documents/{$documentType}/", $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // COURSE DOCUMENTS TESTS
    // ==============================================

    public function test_store_course_document_creates_correct_path(): void
    {
        $file = UploadedFile::fake()->create('syllabus.docx', 150);
        $organizationId = 'org-123';
        $courseId = 'course-456';
        $schoolId = 'school-789';
        $documentType = 'syllabus';

        $path = $this->service->storeCourseDocument($file, $organizationId, $courseId, $schoolId, $documentType);

        $this->assertStringContains("courses/{$courseId}/{$documentType}/", $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // DMS FILES TESTS
    // ==============================================

    public function test_store_dms_file_creates_correct_path(): void
    {
        $file = UploadedFile::fake()->create('letter.pdf', 100);
        $organizationId = 'org-123';
        $schoolId = 'school-789';
        $documentType = 'incoming';
        $documentId = 'doc-456';

        $path = $this->service->storeDmsFile($file, $organizationId, $schoolId, $documentType, $documentId);

        $this->assertStringContains("dms/{$documentType}/{$documentId}/files/", $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // TEMPLATE FILES TESTS
    // ==============================================

    public function test_store_id_card_template_background(): void
    {
        $file = UploadedFile::fake()->image('background.png');
        $organizationId = 'org-123';
        $schoolId = 'school-789';
        $templateId = 'template-456';

        $path = $this->service->storeIdCardTemplateBackground($file, $organizationId, $schoolId, $templateId, 'front');

        $this->assertStringContains("templates/id-cards/{$templateId}/", $path);
        $this->assertStringContains('background_front.png', $path);
        Storage::disk('local')->assertExists($path);
    }

    public function test_store_certificate_template_background(): void
    {
        $file = UploadedFile::fake()->image('cert_bg.jpg');
        $organizationId = 'org-123';
        $templateId = 'template-456';

        $path = $this->service->storeCertificateTemplateBackground($file, $organizationId, null, $templateId);

        $this->assertStringContains("templates/certificates/{$templateId}/", $path);
        $this->assertStringContains('background.jpg', $path);
        Storage::disk('local')->assertExists($path);
    }

    // ==============================================
    // REPORT FILES TESTS
    // ==============================================

    public function test_store_report_creates_file(): void
    {
        $content = 'Report content here';
        $filename = 'report.pdf';
        $organizationId = 'org-123';
        $schoolId = 'school-789';
        $reportType = 'attendance';

        $path = $this->service->storeReport($content, $filename, $organizationId, $schoolId, $reportType);

        $this->assertStringContains("reports/{$reportType}/", $path);
        Storage::disk('local')->assertExists($path);
        $this->assertEquals($content, Storage::disk('local')->get($path));
    }

    // ==============================================
    // FILE OPERATIONS TESTS
    // ==============================================

    public function test_delete_file_removes_existing_file(): void
    {
        $file = UploadedFile::fake()->create('test.txt', 10);
        $path = Storage::disk('local')->putFile('test', $file);

        $this->assertTrue($this->service->fileExists($path));
        $this->assertTrue($this->service->deleteFile($path));
        $this->assertFalse($this->service->fileExists($path));
    }

    public function test_delete_file_returns_false_for_nonexistent_file(): void
    {
        $this->assertFalse($this->service->deleteFile('nonexistent/path.txt'));
    }

    public function test_file_exists_returns_correct_status(): void
    {
        $file = UploadedFile::fake()->create('test.txt', 10);
        $path = Storage::disk('local')->putFile('test', $file);

        $this->assertTrue($this->service->fileExists($path));
        $this->assertFalse($this->service->fileExists('nonexistent.txt'));
    }

    public function test_get_file_returns_content(): void
    {
        $content = 'Hello World';
        Storage::disk('local')->put('test.txt', $content);

        $this->assertEquals($content, $this->service->getFile('test.txt'));
    }

    public function test_get_file_returns_null_for_nonexistent_file(): void
    {
        $this->assertNull($this->service->getFile('nonexistent.txt'));
    }

    public function test_get_file_size_returns_correct_size(): void
    {
        $content = 'Hello World';
        Storage::disk('local')->put('test.txt', $content);

        $this->assertEquals(strlen($content), $this->service->getFileSize('test.txt'));
    }

    // ==============================================
    // BULK OPERATIONS TESTS
    // ==============================================

    public function test_delete_resource_files_removes_directory(): void
    {
        $organizationId = 'org-123';
        $schoolId = 'school-789';
        $studentId = 'student-456';

        // Create some test files
        $basePath = "organizations/{$organizationId}/schools/{$schoolId}/students/{$studentId}";
        Storage::disk('local')->put("{$basePath}/pictures/test.jpg", 'content');
        Storage::disk('local')->put("{$basePath}/documents/test.pdf", 'content');

        $this->assertTrue(Storage::disk('local')->exists("{$basePath}/pictures/test.jpg"));

        $result = $this->service->deleteResourceFiles($organizationId, 'students', $studentId, $schoolId);

        $this->assertTrue($result);
        $this->assertFalse(Storage::disk('local')->exists("{$basePath}/pictures/test.jpg"));
    }

    public function test_copy_file_creates_copy(): void
    {
        Storage::disk('local')->put('source.txt', 'content');

        $result = $this->service->copyFile('source.txt', 'dest.txt');

        $this->assertTrue($result);
        Storage::disk('local')->assertExists('source.txt');
        Storage::disk('local')->assertExists('dest.txt');
    }

    public function test_move_file_moves_file(): void
    {
        Storage::disk('local')->put('source.txt', 'content');

        $result = $this->service->moveFile('source.txt', 'dest.txt');

        $this->assertTrue($result);
        $this->assertFalse(Storage::disk('local')->exists('source.txt'));
        Storage::disk('local')->assertExists('dest.txt');
    }

    // ==============================================
    // HELPER METHODS TESTS
    // ==============================================

    public function test_get_mime_type_from_extension(): void
    {
        $this->assertEquals('image/jpeg', $this->service->getMimeTypeFromExtension('photo.jpg'));
        $this->assertEquals('image/jpeg', $this->service->getMimeTypeFromExtension('photo.jpeg'));
        $this->assertEquals('image/png', $this->service->getMimeTypeFromExtension('image.png'));
        $this->assertEquals('application/pdf', $this->service->getMimeTypeFromExtension('document.pdf'));
        $this->assertEquals('application/vnd.openxmlformats-officedocument.wordprocessingml.document', $this->service->getMimeTypeFromExtension('file.docx'));
        $this->assertEquals('application/octet-stream', $this->service->getMimeTypeFromExtension('file.unknown'));
    }

    public function test_is_allowed_extension(): void
    {
        $allowedImages = $this->service->getAllowedImageExtensions();

        $this->assertTrue($this->service->isAllowedExtension('photo.jpg', $allowedImages));
        $this->assertTrue($this->service->isAllowedExtension('photo.jpeg', $allowedImages));
        $this->assertTrue($this->service->isAllowedExtension('photo.png', $allowedImages));
        $this->assertFalse($this->service->isAllowedExtension('document.pdf', $allowedImages));
        $this->assertFalse($this->service->isAllowedExtension('script.js', $allowedImages));
    }

    public function test_get_allowed_image_extensions(): void
    {
        $extensions = $this->service->getAllowedImageExtensions();

        $this->assertContains('jpg', $extensions);
        $this->assertContains('jpeg', $extensions);
        $this->assertContains('png', $extensions);
        $this->assertContains('gif', $extensions);
        $this->assertContains('webp', $extensions);
    }

    public function test_get_allowed_document_extensions(): void
    {
        $extensions = $this->service->getAllowedDocumentExtensions();

        $this->assertContains('pdf', $extensions);
        $this->assertContains('doc', $extensions);
        $this->assertContains('docx', $extensions);
        $this->assertContains('xls', $extensions);
        $this->assertContains('xlsx', $extensions);
    }

    public function test_get_public_disk(): void
    {
        $this->assertEquals('public', $this->service->getPublicDisk());
    }

    public function test_get_private_disk(): void
    {
        $this->assertEquals('local', $this->service->getPrivateDisk());
    }

    public function test_get_private_download_url(): void
    {
        $path = 'organizations/org-123/students/456/pictures/test.jpg';
        $url = $this->service->getPrivateDownloadUrl($path);

        $this->assertStringContains('/api/storage/download/', $url);
        $this->assertStringContains(base64_encode($path), $url);
    }

    // ==============================================
    // HELPER ASSERTION METHODS
    // ==============================================

    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            "Failed asserting that '{$haystack}' contains '{$needle}'"
        );
    }
}
