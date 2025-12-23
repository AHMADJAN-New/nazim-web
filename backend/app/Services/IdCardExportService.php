<?php

namespace App\Services;

use App\Models\StudentIdCard;
use App\Services\IdCardRenderService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use ZipArchive;

class IdCardExportService
{
    protected IdCardRenderService $renderService;

    public function __construct(IdCardRenderService $renderService)
    {
        $this->renderService = $renderService;
    }

    /**
     * Generate card image for a single card
     * 
     * @param StudentIdCard $card
     * @param string $side 'front' or 'back'
     * @return string Path to generated image file
     */
    public function generateCardImage(StudentIdCard $card, string $side = 'front'): string
    {
        try {
            // Load relationships if not already loaded
            if (!$card->relationLoaded('student')) {
                $card->load('student');
            }
            if (!$card->relationLoaded('template')) {
                $card->load('template');
            }
            if (!$card->relationLoaded('academicYear')) {
                $card->load('academicYear');
            }
            if (!$card->relationLoaded('class')) {
                $card->load('class');
            }
            if (!$card->relationLoaded('studentAdmission')) {
                $card->load('studentAdmission');
            }

            // Check if template exists
            if (!$card->template) {
                throw new \RuntimeException('ID card template not found');
            }

            // Prepare student data for rendering
            $studentData = $this->prepareStudentData($card);

            // Use IdCardRenderService to render the card
            $imagePath = $this->renderService->render($card->template, $studentData, $side);

            if (!$imagePath) {
                throw new \RuntimeException('Failed to render card image - render service returned null');
            }

            return $imagePath;
        } catch (\Exception $e) {
            Log::error("Failed to generate card image: " . $e->getMessage(), [
                'card_id' => $card->id,
                'side' => $side,
                'template_id' => $card->template?->id,
                'has_template' => $card->template !== null,
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Export bulk cards as ZIP file
     * 
     * @param array $cardIds Array of card UUIDs
     * @param array $sides Array of sides to export ['front', 'back']
     * @param string $quality 'standard' (96 DPI) or 'high' (300 DPI)
     * @return string Path to generated ZIP file
     */
    public function exportBulkZip(array $cardIds, array $sides = ['front'], string $quality = 'standard'): string
    {
        try {
            $cards = StudentIdCard::whereIn('id', $cardIds)
                ->with(['student', 'template', 'academicYear', 'class'])
                ->get();

            if ($cards->isEmpty()) {
                throw new \RuntimeException('No cards found for export');
            }

            // Create temporary directory for card images
            $tempDir = 'id-cards/export/' . Str::uuid()->toString();
            $fullTempDir = storage_path('app/' . $tempDir);
            
            if (!is_dir($fullTempDir)) {
                mkdir($fullTempDir, 0755, true);
            }

            $zip = new ZipArchive();
            $zipFileName = 'id-cards-export-' . date('Y-m-d-His') . '.zip';
            $zipPath = $tempDir . '/' . $zipFileName;
            $fullZipPath = storage_path('app/' . $zipPath);

            if ($zip->open($fullZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
                throw new \RuntimeException('Cannot create ZIP file');
            }

            $filesAdded = 0;
            foreach ($cards as $card) {
                foreach ($sides as $side) {
                    try {
                        $imagePath = $this->generateCardImage($card, $side);
                        
                        // Generate filename
                        $studentName = Str::slug($card->student->full_name ?? 'student');
                        $admissionNo = $card->student->admission_no ?? $card->id;
                        $fileName = "{$admissionNo}-{$studentName}-{$side}.png";
                        
                        // Add to ZIP
                        if (Storage::exists($imagePath)) {
                            $fullImagePath = Storage::path($imagePath);
                            if (file_exists($fullImagePath) && filesize($fullImagePath) > 0) {
                                if ($zip->addFile($fullImagePath, $fileName)) {
                                    $filesAdded++;
                                } else {
                                    Log::warning("Failed to add file to ZIP", [
                                        'card_id' => $card->id,
                                        'side' => $side,
                                        'image_path' => $imagePath,
                                    ]);
                                }
                            } else {
                                Log::warning("Image file does not exist or is empty", [
                                    'card_id' => $card->id,
                                    'side' => $side,
                                    'image_path' => $imagePath,
                                    'full_path' => $fullImagePath,
                                ]);
                            }
                        } else {
                            Log::warning("Image path does not exist in storage", [
                                'card_id' => $card->id,
                                'side' => $side,
                                'image_path' => $imagePath,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::warning("Failed to add card to ZIP: " . $e->getMessage(), [
                            'card_id' => $card->id,
                            'side' => $side,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                        // Continue with next card
                    }
                }
            }

            if ($filesAdded === 0) {
                $zip->close();
                unlink($fullZipPath);
                throw new \RuntimeException('No card images were added to the ZIP file. Please check that cards have valid templates and student data.');
            }

            Log::info("Added {$filesAdded} files to ZIP", [
                'card_count' => count($cards),
                'sides_count' => count($sides),
            ]);

            $zip->close();

            // Verify ZIP file was created and has content
            if (!file_exists($fullZipPath)) {
                throw new \RuntimeException('ZIP file was not created');
            }

            $zipSize = filesize($fullZipPath);
            if ($zipSize === 0) {
                unlink($fullZipPath);
                throw new \RuntimeException('ZIP file is empty - no card images were added');
            }

            // Ensure exports directory exists
            $permanentDir = 'id-cards/exports';
            $fullPermanentDir = storage_path('app/' . $permanentDir);
            if (!is_dir($fullPermanentDir)) {
                mkdir($fullPermanentDir, 0755, true);
            }

            // Move ZIP to permanent storage
            $permanentPath = $permanentDir . '/' . $zipFileName;
            $fullPermanentPath = storage_path('app/' . $permanentPath);

            // Use rename for moving (more reliable than Storage::move)
            if (!rename($fullZipPath, $fullPermanentPath)) {
                throw new \RuntimeException('Failed to move ZIP file to permanent storage');
            }

            // Verify file was moved successfully
            if (!file_exists($fullPermanentPath)) {
                throw new \RuntimeException('ZIP file was not found after moving to permanent storage');
            }

            // Clean up temporary directory
            $this->cleanupDirectory($fullTempDir);

            Log::info('ZIP export completed successfully', [
                'file_path' => $permanentPath,
                'file_size' => filesize($fullPermanentPath),
                'card_count' => count($cardIds),
            ]);

            return $permanentPath;
        } catch (\Exception $e) {
            Log::error("Bulk ZIP export failed: " . $e->getMessage(), [
                'card_ids' => $cardIds,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Export bulk cards as PDF file
     * 
     * @param array $cardIds Array of card UUIDs
     * @param array $sides Array of sides to export ['front', 'back']
     * @param int $cardsPerPage Number of cards per page (1, 2, 4, 6, 9)
     * @param string $quality 'standard' (96 DPI) or 'high' (300 DPI)
     * @return string Path to generated PDF file
     */
    public function exportBulkPdf(array $cardIds, array $sides = ['front'], int $cardsPerPage = 6, string $quality = 'standard'): string
    {
        try {
            $cards = StudentIdCard::whereIn('id', $cardIds)
                ->with(['student', 'template', 'academicYear', 'class'])
                ->get();

            if ($cards->isEmpty()) {
                throw new \RuntimeException('No cards found for export');
            }

            // Generate card images first
            $cardImages = [];
            foreach ($cards as $card) {
                foreach ($sides as $side) {
                    try {
                        $imagePath = $this->generateCardImage($card, $side);
                        if (Storage::exists($imagePath)) {
                            $cardImages[] = [
                                'card' => $card,
                                'side' => $side,
                                'image_path' => $imagePath,
                            ];
                        }
                    } catch (\Exception $e) {
                        Log::warning("Failed to generate card image for PDF: " . $e->getMessage(), [
                            'card_id' => $card->id,
                            'side' => $side,
                        ]);
                    }
                }
            }

            if (empty($cardImages)) {
                throw new \RuntimeException('No card images generated for PDF');
            }

            // Generate HTML for PDF
            $html = $this->generatePdfHtml($cardImages, $cardsPerPage);

            // Use DocumentPdfService to generate PDF
            $pdfService = app(DocumentPdfService::class);
            $pdfPath = $pdfService->generate($html, 'A4_portrait', 'id-cards/exports');

            return $pdfPath;
        } catch (\Exception $e) {
            Log::error("Bulk PDF export failed: " . $e->getMessage(), [
                'card_ids' => $cardIds,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Export individual card
     * 
     * @param StudentIdCard $card
     * @param string $format 'png' or 'pdf'
     * @param string $side 'front' or 'back'
     * @return string Path to generated file
     */
    public function exportIndividual(StudentIdCard $card, string $format = 'png', string $side = 'front'): string
    {
        try {
            $card->load(['student', 'template', 'academicYear', 'class']);

            if ($format === 'pdf') {
                // Generate HTML for single card PDF
                $imagePath = $this->generateCardImage($card, $side);
                $html = $this->generateSingleCardPdfHtml($card, $imagePath, $side);
                
                $pdfService = app(DocumentPdfService::class);
                $pdfPath = $pdfService->generate($html, 'A4_portrait', 'id-cards/exports');
                
                return $pdfPath;
            } else {
                // Return PNG image path
                return $this->generateCardImage($card, $side);
            }
        } catch (\Exception $e) {
            Log::error("Individual card export failed: " . $e->getMessage(), [
                'card_id' => $card->id,
                'format' => $format,
                'side' => $side,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Prepare student data for card rendering
     */
    protected function prepareStudentData(StudentIdCard $card): array
    {
        $student = $card->student;
        $admission = $card->studentAdmission;
        $academicYear = $card->academicYear;
        $class = $card->class;

        // Get school name if available
        $schoolName = '';
        if ($card->school_id) {
            $school = \DB::table('school_branding')
                ->where('id', $card->school_id)
                ->whereNull('deleted_at')
                ->first();
            $schoolName = $school->school_name ?? '';
        }

        return [
            'student_name' => $student->full_name ?? '',
            'father_name' => $student->father_name ?? '',
            'admission_number' => $student->admission_no ?? '',
            'student_code' => $student->student_code ?? '',
            'class_name' => $class->name ?? '',
            'academic_year' => $academicYear->name ?? '',
            'card_number' => $card->card_number ?? '',
            'student_photo' => $student->picture_path ?? null,
            'school_name' => $schoolName,
            'organization_id' => $card->organization_id,
        ];
    }

    /**
     * Generate HTML for PDF with multiple cards per page
     */
    protected function generatePdfHtml(array $cardImages, int $cardsPerPage): string
    {
        // Calculate grid layout
        $gridCols = match($cardsPerPage) {
            1 => 1,
            2 => 2,
            4 => 2,
            6 => 3,
            9 => 3,
            default => 3,
        };
        $gridRows = match($cardsPerPage) {
            1 => 1,
            2 => 1,
            4 => 2,
            6 => 2,
            9 => 3,
            default => 2,
        };

        $html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .page { page-break-after: always; }
            .page:last-child { page-break-after: auto; }
            .card-grid { display: grid; grid-template-columns: repeat(' . $gridCols . ', 1fr); gap: 20px; }
            .card { width: 100%; height: auto; border: 1px solid #ddd; }
            .card img { width: 100%; height: auto; display: block; }
        </style></head><body>';

        $chunks = array_chunk($cardImages, $cardsPerPage);
        foreach ($chunks as $chunk) {
            $html .= '<div class="page"><div class="card-grid">';
            foreach ($chunk as $item) {
                $imageBase64 = $this->imageToBase64($item['image_path']);
                $html .= '<div class="card"><img src="data:image/png;base64,' . $imageBase64 . '" alt="ID Card" /></div>';
            }
            $html .= '</div></div>';
        }

        $html .= '</body></html>';

        return $html;
    }

    /**
     * Generate HTML for single card PDF
     */
    protected function generateSingleCardPdfHtml(StudentIdCard $card, string $imagePath, string $side): string
    {
        $imageBase64 = $this->imageToBase64($imagePath);

        $html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
            body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .card { max-width: 100%; height: auto; }
            .card img { width: 100%; height: auto; display: block; }
        </style></head><body>
            <div class="card">
                <img src="data:image/png;base64,' . $imageBase64 . '" alt="ID Card" />
            </div>
        </body></html>';

        return $html;
    }

    /**
     * Convert image file to base64
     */
    protected function imageToBase64(string $imagePath): string
    {
        if (!Storage::exists($imagePath)) {
            throw new \RuntimeException("Image file not found: {$imagePath}");
        }

        $imageContent = Storage::get($imagePath);
        return base64_encode($imageContent);
    }

    /**
     * Clean up temporary directory
     */
    protected function cleanupDirectory(string $dir): void
    {
        if (is_dir($dir)) {
            $files = array_diff(scandir($dir), ['.', '..']);
            foreach ($files as $file) {
                $filePath = $dir . '/' . $file;
                if (is_file($filePath)) {
                    unlink($filePath);
                }
            }
            rmdir($dir);
        }
    }
}

