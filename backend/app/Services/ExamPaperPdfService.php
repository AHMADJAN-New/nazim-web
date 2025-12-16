<?php

namespace App\Services;

use App\Models\ExamPaperTemplate;
use App\Models\Organization;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ExamPaperPdfService
{
    protected DocumentPdfService $pdfService;
    protected ExamPaperGeneratorService $generatorService;

    public function __construct(
        DocumentPdfService $pdfService,
        ExamPaperGeneratorService $generatorService
    ) {
        $this->pdfService = $pdfService;
        $this->generatorService = $generatorService;
    }

    /**
     * Generate PDF from template
     */
    public function generateFromTemplate(
        ExamPaperTemplate $template,
        array $items,
        int $variant = 1,
        ?Organization $organization = null,
        string $pageLayout = 'A4_portrait'
    ): string {
        try {
            // Generate HTML using generator service
            $html = $this->generatorService->generatePaperHtml($template, $items, $variant, $organization);
            
            // Generate PDF
            $directory = 'exam-papers/' . ($organization?->id ?? 'default');
            $path = $this->pdfService->generate($html, $pageLayout, $directory);
            
            return $path;
        } catch (\Exception $e) {
            Log::error('Failed to generate PDF from template: ' . $e->getMessage(), [
                'template_id' => $template->id,
                'variant' => $variant,
                'exception' => $e,
            ]);
            throw $e;
        }
    }

    /**
     * Generate multiple variants (A, B, C, etc.)
     */
    public function generateVariants(
        ExamPaperTemplate $template,
        array $items,
        array $variants = [1, 2, 3],
        ?Organization $organization = null,
        string $pageLayout = 'A4_portrait'
    ): array {
        $results = [];
        
        foreach ($variants as $variant) {
            try {
                $path = $this->generateFromTemplate($template, $items, $variant, $organization, $pageLayout);
                
                // Generate download URL using API endpoint
                // Use relative URL that frontend can resolve with its own base URL
                $variantLabel = $variant === 1 ? 'A' : ($variant === 2 ? 'B' : 'C');
                // Return relative URL - frontend will construct full URL using its API_URL
                $downloadUrl = '/api/exam/paper-templates/' . $template->id . '/download-pdf?path=' . urlencode($path) . '&variant=' . urlencode($variantLabel);
                
                $results[] = [
                    'variant' => $variant,
                    'path' => $path,
                    'download_url' => $downloadUrl,
                ];
            } catch (\Exception $e) {
                Log::error("Failed to generate variant {$variant}: " . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'template_id' => $template->id,
                    'variant' => $variant,
                ]);
                $results[] = [
                    'variant' => $variant,
                    'error' => $e->getMessage(),
                ];
            }
        }
        
        return $results;
    }
}

