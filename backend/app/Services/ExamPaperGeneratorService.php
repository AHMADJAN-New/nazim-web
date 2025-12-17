<?php

namespace App\Services;

use App\Models\ExamPaperTemplate;
use App\Models\ExamPaperItem;
use App\Models\SchoolBranding;
use App\Models\Organization;
use App\Models\ExamPaperTemplateFile;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;
use Illuminate\Support\Facades\Log;

class ExamPaperGeneratorService
{
    /**
     * Generate HTML content for an exam paper
     */
    public function generatePaperHtml(
        ExamPaperTemplate $template,
        array $items,
        int $variant = 1,
        ?Organization $organization = null
    ): string {
        try {
            // 1. Get template HTML (from template file or default)
            $templateHtml = $this->getTemplateHtml($template, $organization);
            
            // 2. Get branding data
            $branding = $this->getBrandingData($template->school, $organization);
            
            // 3. Generate question content
            $questionContent = $this->generateQuestionContent($items, $template->language);
            
            // 4. Generate QR code
            $qrHtml = $this->generateQrCode($template->id, $variant);
            
            // 5. Generate logo HTML
            $logoHtml = $this->generateLogoHtml($template->school);
            
            // 6. Build paper variables
            $paperVars = $this->buildPaperVariables($template, $branding, $questionContent, $qrHtml, $logoHtml);
            
            // 7. Apply template and branding
            return $this->applyTemplateAndBranding($templateHtml, $branding, $paperVars);
            
        } catch (\Exception $e) {
            Log::error('Failed to generate paper HTML: ' . $e->getMessage(), [
                'template_id' => $template->id,
                'variant' => $variant,
                'exception' => $e,
            ]);
            return $this->getMinimalTemplate($template->isRtl());
        }
    }
    
    /**
     * Get template HTML (from template file or default)
     */
    private function getTemplateHtml(ExamPaperTemplate $template, ?Organization $org): string
    {
        // Try to get template file from database
        if ($template->templateFile && $template->templateFile->is_active) {
            return $template->templateFile->getTemplateHtml();
        }
        
        // Fallback to default template
        return $this->getDefaultTemplate($template->language);
    }
    
    /**
     * Get default template from storage
     */
    private function getDefaultTemplate(string $language): string
    {
        $path = "exam-templates/default_{$language}.html";
        
        if (Storage::exists($path)) {
            return Storage::get($path);
        }
        
        // Fallback to minimal template
        $isRtl = in_array($language, ['ps', 'fa', 'ar']);
        return $this->getMinimalTemplate($isRtl);
    }
    
    /**
     * Generate question content from items
     */
    private function generateQuestionContent(array $items, string $language): string
    {
        $content = [];
        $numbers = $this->getNumbering($language);
        
        foreach ($items as $index => $item) {
            $number = $numbers[$index] ?? ($index + 1);
            $content[] = $this->renderQuestion($item, $number, $language);
        }
        
        return implode("\n", $content);
    }
    
    /**
     * Detect if text contains RTL characters
     */
    private function isRtlText(string $text): bool
    {
        // Check for RTL character ranges (Arabic, Hebrew, Persian, Pashto, etc.)
        return (bool) preg_match('/[\x{0590}-\x{05FF}\x{0600}-\x{06FF}\x{0700}-\x{074F}\x{0750}-\x{077F}\x{08A0}-\x{08FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u', $text);
    }
    
    /**
     * Render a single question with proper RTL and font styling
     */
    private function renderQuestion($item, $number, string $language): string
    {
        $question = $item['question'] ?? null;
        if (!$question) {
            return '';
        }
        
        $questionText = strip_tags($question['text'] ?? '');
        $marks = $item['marks_override'] ?? $question['marks'] ?? 0;
        $type = $question['type'] ?? 'short';
        $templateIsRtl = in_array($language, ['ps', 'fa', 'ar']);
        
        // Determine RTL: check text_rtl field, template language, or detect from text content
        $textRtl = null;
        if (isset($question['text_rtl'])) {
            // Use explicit text_rtl value if set
            $textRtl = (bool) $question['text_rtl'];
        } else {
            // Auto-detect RTL from question text if not explicitly set
            $textRtl = $this->isRtlText($questionText) || $templateIsRtl;
        }
        
        // Always use RTL if template language is RTL OR question text is RTL
        $questionDir = ($templateIsRtl || $textRtl) ? 'rtl' : 'ltr';
        
        $html = '<section class="question" dir="' . $questionDir . '">';
        $html .= '<div class="question-header">';
        $html .= '<h3 class="question-title">' . htmlspecialchars($number) . ') ' . htmlspecialchars($questionText) . '</h3>';
        $html .= '<span class="question-marks">' . number_format($marks, 2) . ' ' . $this->translate('marks', $language) . '</span>';
        $html .= '</div>';
        
        // Add options for MCQ/True-False
        if (in_array($type, ['mcq', 'true_false']) && !empty($question['options'])) {
            $html .= '<ol class="question-options" dir="' . $questionDir . '">';
            foreach ($question['options'] as $option) {
                $optionText = strip_tags($option['text'] ?? '');
                if ($optionText) {
                    $html .= '<li class="question-option">' . htmlspecialchars($optionText) . '</li>';
                }
            }
            $html .= '</ol>';
        }
        
        // Add answer lines for written questions
        if (in_array($type, ['short', 'descriptive', 'essay'])) {
            // Check if answer lines should be shown (default: true for essay/descriptive/short)
            $showAnswerLines = $item['show_answer_lines'] ?? true;
            
            // Get custom line count or use default based on question type
            $lines = $item['answer_lines_count'] ?? ($type === 'short' ? 3 : ($type === 'essay' ? 6 : 4));
            
            if ($showAnswerLines && $lines > 0) {
                $html .= '<div class="answer-section" dir="' . $questionDir . '">';
                for ($i = 0; $i < $lines; $i++) {
                    $html .= '<div class="answer-line"></div>';
                }
                $html .= '</div>';
            }
        }
        
        $html .= '</section>';
        return $html;
    }
    
    /**
     * Generate QR code for paper verification
     * QR code contains the template ID for easy searching
     */
    private function generateQrCode(string $paperId, int $variant): string
    {
        try {
            // QR code contains just the template ID (UUID) for easy searching
            $qrData = $paperId;
            $qrSvg = QrCode::format('svg')
                ->size(100)
                ->margin(2)
                ->errorCorrection('H')
                ->generate($qrData);
            
            return '<img src="data:image/svg+xml;base64,' . base64_encode($qrSvg) . '" width="50" height="50" alt="QR Code" style="display: block; margin: 0 auto;" title="Template ID: ' . htmlspecialchars($paperId) . ', Variant: V' . $variant . '">';
        } catch (\Exception $e) {
            Log::warning('Failed to generate QR code: ' . $e->getMessage());
            return '<div style="width: 50px; height: 50px; border: 2px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center;">QR<br>V' . $variant . '<br>ID:' . substr($paperId, 0, 8) . '</div>';
        }
    }
    
    /**
     * Generate logo HTML from branding
     */
    private function generateLogoHtml(?SchoolBranding $branding): string
    {
        if (!$branding) {
            return $this->getPlaceholderLogo();
        }
        
        // Try primary logo binary first
        if ($branding->primary_logo_binary && $branding->primary_logo_mime_type) {
            $logoData = base64_encode($branding->primary_logo_binary);
            $mimeType = $branding->primary_logo_mime_type;
            return '<img src="data:' . htmlspecialchars($mimeType) . ';base64,' . $logoData . '" alt="' . htmlspecialchars($branding->school_name ?? 'Logo') . '" style="max-height: 80px; max-width: 120px; object-fit: contain; display: block;">';
        }
        
        // Fallback to logo path
        if ($branding->logo_path && Storage::exists($branding->logo_path)) {
            $logoData = base64_encode(Storage::get($branding->logo_path));
            $mimeType = $this->guessMimeType($branding->logo_path);
            return '<img src="data:' . htmlspecialchars($mimeType) . ';base64,' . $logoData . '" alt="' . htmlspecialchars($branding->school_name ?? 'Logo') . '" style="max-height: 80px; max-width: 120px; object-fit: contain; display: block;">';
        }
        
        return $this->getPlaceholderLogo();
    }
    
    /**
     * Get placeholder logo
     */
    private function getPlaceholderLogo(): string
    {
        return '<div style="width: 60px; height: 60px; border: 2px solid #0b0b56; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0b0b56, #1a1a6b); color: white; font-family: \'Bahij Nassim\', Arial, sans-serif; font-size: 12px; font-weight: bold; text-align: center; line-height: 1.2;">LOGO</div>';
    }
    
    /**
     * Guess MIME type from file path
     */
    private function guessMimeType(string $path): string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeTypes = [
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
        ];
        
        return $mimeTypes[$ext] ?? 'image/png';
    }
    
    /**
     * Get branding data from SchoolBranding
     */
    private function getBrandingData(?SchoolBranding $branding, ?Organization $org): array
    {
        if (!$branding) {
            return $this->getDefaultBranding($org);
        }
        
        // Convert binary logos to data URIs
        $primaryLogoUri = null;
        if ($branding->primary_logo_binary && $branding->primary_logo_mime_type) {
            $primaryLogoUri = 'data:' . $branding->primary_logo_mime_type . ';base64,' . base64_encode($branding->primary_logo_binary);
        }
        
        $secondaryLogoUri = null;
        if ($branding->secondary_logo_binary && $branding->secondary_logo_mime_type) {
            $secondaryLogoUri = 'data:' . $branding->secondary_logo_mime_type . ';base64,' . base64_encode($branding->secondary_logo_binary);
        }
        
        $ministryLogoUri = null;
        if ($branding->ministry_logo_binary && $branding->ministry_logo_mime_type) {
            $ministryLogoUri = 'data:' . $branding->ministry_logo_mime_type . ';base64,' . base64_encode($branding->ministry_logo_binary);
        }
        
        return [
            'SCHOOL_NAME' => $branding->school_name_pashto ?? $branding->school_name ?? '',
            'SCHOOL_NAME_AR' => $branding->school_name_arabic ?? '',
            'SCHOOL_ADDRESS' => $branding->school_address ?? '',
            'SCHOOL_PHONE' => $branding->school_phone ?? '',
            'SCHOOL_EMAIL' => $branding->school_email ?? '',
            'SCHOOL_WEBSITE' => $branding->school_website ?? '',
            'FOOTER_TEXT' => $branding->footer_text ?? '',
            'PRIMARY_COLOR' => $branding->primary_color ?? '#0b0b56',
            'SECONDARY_COLOR' => $branding->secondary_color ?? '#666666',
            'ACCENT_COLOR' => $branding->accent_color ?? '#ff6b35',
            'FONT_FAMILY' => $branding->font_family ?? 'Bahij Nassim',
            'PRIMARY_LOGO_URI' => $primaryLogoUri,
            'SECONDARY_LOGO_URI' => $secondaryLogoUri,
            'MINISTRY_LOGO_URI' => $ministryLogoUri,
        ];
    }
    
    /**
     * Get default branding
     */
    private function getDefaultBranding(?Organization $org): array
    {
        return [
            'SCHOOL_NAME' => $org?->name ?? 'School',
            'SCHOOL_NAME_AR' => '',
            'SCHOOL_ADDRESS' => '',
            'SCHOOL_PHONE' => '',
            'SCHOOL_EMAIL' => '',
            'SCHOOL_WEBSITE' => '',
            'FOOTER_TEXT' => '',
            'PRIMARY_COLOR' => '#0b0b56',
            'SECONDARY_COLOR' => '#666666',
            'ACCENT_COLOR' => '#ff6b35',
            'FONT_FAMILY' => 'Bahij Nassim',
            'PRIMARY_LOGO_URI' => null,
            'SECONDARY_LOGO_URI' => null,
            'MINISTRY_LOGO_URI' => null,
        ];
    }
    
    /**
     * Build paper variables for template replacement
     */
    private function buildPaperVariables(
        ExamPaperTemplate $template,
        array $branding,
        string $questionContent,
        string $qrHtml,
        string $logoHtml
    ): array {
        $totalMarks = $template->total_marks ?? $template->calculateTotalMarks();
        $templateIsRtl = in_array($template->language, ['ps', 'fa', 'ar']);
        
        // Check if question content contains RTL text (auto-detect)
        $contentHasRtl = $this->isRtlText($questionContent);
        
        // Use RTL if template language is RTL OR if content contains RTL text
        $effectiveRtl = $templateIsRtl || $contentHasRtl;
        
        // Generate notes section from instructions
        $instructionsText = $template->instructions ?? '';
        $notesSection = '';
        if ($instructionsText) {
            // Preserve line breaks in instructions (convert \n to <br>)
            $formattedInstructions = nl2br(htmlspecialchars($instructionsText, ENT_QUOTES, 'UTF-8'));
            $notesSection = '<section class="notes-section info-card" dir="' . ($effectiveRtl ? 'rtl' : 'ltr') . '">';
            $notesSection .= '<div class="notes-row">';
            $notesSection .= '<div class="notes-title-inline">' . htmlspecialchars($this->translate('instructions', $template->language)) . ':</div>';
            $notesSection .= '<div class="notes-content">' . $formattedInstructions . '</div>';
            $notesSection .= '</div>';
            $notesSection .= '</section>';
        }
        
        // Generate footer with contact information
        $footerHtml = $this->generateFooterHtml($branding, $effectiveRtl);
        
        // Get custom header HTML from template (if provided)
        $headerHtml = $template->header_html ?? '';
        
        return [
            'PAPER_TITLE' => $template->title,
            'DATE' => now()->format('Y-m-d'),
            'DURATION' => $template->duration_minutes ?? 60,
            'TOTAL_MARKS' => number_format($totalMarks, 2),
            'CLASS_NAME' => $template->classAcademicYear?->class?->name ?? '',
            'SUBJECT_NAME' => $template->subject?->name ?? '',
            'EXAM_NAME' => $template->exam?->name ?? '',
            'YEAR_NAME' => $template->classAcademicYear?->academicYear?->name ?? '',
            'INSTRUCTIONS' => $instructionsText,
            'CONTENT' => $questionContent,
            'QR_HTML' => $qrHtml,
            'LOGO_HTML' => $logoHtml,
            'NOTES_SECTION' => $notesSection,
            'FOOTER_HTML' => $footerHtml,
            'HEADER_HTML' => $headerHtml, // Custom header HTML from template
            'SCHOOL_NAME' => $branding['SCHOOL_NAME'],
            'SCHOOL_NAME_AR' => $branding['SCHOOL_NAME_AR'],
            'SCHOOL_ADDRESS' => $branding['SCHOOL_ADDRESS'],
            'SCHOOL_PHONE' => $branding['SCHOOL_PHONE'],
            'SCHOOL_EMAIL' => $branding['SCHOOL_EMAIL'],
            'SCHOOL_WEBSITE' => $branding['SCHOOL_WEBSITE'],
            'FOOTER_TEXT' => $branding['FOOTER_TEXT'],
            'PRIMARY_LOGO_URI' => $branding['PRIMARY_LOGO_URI'] ?? '',
            'SECONDARY_LOGO_URI' => $branding['SECONDARY_LOGO_URI'] ?? '',
            'MINISTRY_LOGO_URI' => $branding['MINISTRY_LOGO_URI'] ?? '',
            'DIRECTION' => $effectiveRtl ? 'rtl' : 'ltr', // Add direction variable for template
        ];
    }
    
    /**
     * Apply template and branding to generate final HTML
     */
    private function applyTemplateAndBranding(string $templateHtml, array $branding, array $paperVars): string
    {
        // Inject branding CSS
        $brandingCss = $this->generateBrandingCss($branding);
        $templateHtml = str_replace('</head>', "<style>{$brandingCss}</style></head>", $templateHtml);
        
        // Replace all placeholders
        foreach ($paperVars as $key => $value) {
            $templateHtml = str_replace("{{$key}}", $value, $templateHtml);
            $templateHtml = str_replace("{{{$key}}}", $value, $templateHtml);
        }
        
        // Add MathJax if mathematical formulas detected
        if (str_contains($templateHtml, '\\(') || str_contains($templateHtml, '\\[') || str_contains($templateHtml, '$$')) {
            $mathjax = '<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>'
                . '<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>';
            if (strpos($templateHtml, 'MathJax') === false) {
                $templateHtml = str_replace('</head>', "{$mathjax}</head>", $templateHtml);
            }
        }
        
        return $templateHtml;
    }
    
    /**
     * Generate branding CSS with proper font declarations and RTL support
     */
    private function generateBrandingCss(array $branding): string
    {
        $primaryColor = $branding['PRIMARY_COLOR'] ?? '#0b0b56';
        $secondaryColor = $branding['SECONDARY_COLOR'] ?? '#666666';
        $accentColor = $branding['ACCENT_COLOR'] ?? '#ff6b35';
        $fontFamily = $branding['FONT_FAMILY'] ?? 'Bahij Nassim';
        
        // Map font family name to CSS font-family (remove spaces for @font-face)
        $fontFamilyName = str_replace(' ', '', $fontFamily);
        // Use "BahijNassim" for CSS font-family, but keep original for display
        if (stripos($fontFamily, 'Bahij Nassim') !== false) {
            $fontFamilyName = 'BahijNassim';
        } elseif (stripos($fontFamily, 'Bahij Titr') !== false) {
            $fontFamilyName = 'BahijTitr';
        }
        
        // Generate @font-face declarations (same as roll slips)
        $fontFaces = $this->generateFontFaces($fontFamilyName);
        
        return $fontFaces . "
        :root {
            --primary-color: {$primaryColor};
            --secondary-color: {$secondaryColor};
            --accent-color: {$accentColor};
            --brand-font: '{$fontFamilyName}', 'Arial', sans-serif;
        }
        html, body {
            margin: 0;
            padding: 0;
            font-family: var(--brand-font) !important;
        }
        body {
            font-family: var(--brand-font) !important;
        }
        .a4-page {
            font-family: var(--brand-font) !important;
        }
        .masthead-text .name-ar,
        .masthead-text .name-ps {
            color: var(--primary-color) !important;
            font-weight: 700;
        }
        .title,
        h1, h2, h3 {
            color: var(--primary-color) !important;
            font-weight: 700;
        }
        .question-number {
            color: var(--primary-color) !important;
            font-weight: 700;
        }
        .question {
            font-family: var(--font-base) !important;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px dotted #bbb;
        }
        .question-header {
            display: grid;
            grid-template-columns: 1fr auto;
            align-items: baseline;
            column-gap: 8px;
            width: 100%;
            margin-bottom: 8px;
        }
        [dir='rtl'] .question-header {
            grid-template-columns: auto 1fr;
        }
        .question-title {
            font-family: var(--font-base) !important;
            font-weight: 700;
            margin: 0;
            color: var(--text);
            line-height: 1.6;
            font-size: 13pt;
            text-align: start;
        }
        .question-marks {
            font-family: var(--font-base) !important;
            white-space: nowrap;
            color: var(--text);
            font-weight: 700;
            margin-inline-start: 8px;
            font-size: 13pt;
        }
        .question-options {
            font-family: var(--font-base) !important;
            list-style-type: lower-alpha;
            margin: 12px 0;
            padding-inline-start: 30px;
        }
        [dir='rtl'] .question-options {
            list-style-type: arabic-indic;
            padding-inline-start: 30px;
            padding-inline-end: 0;
        }
        .question-option {
            font-family: var(--font-base) !important;
            margin-bottom: 8px;
            line-height: 1.6;
            font-size: 13pt;
            text-align: start;
        }
        .answer-section {
            margin-top: 12px;
        }
        .answer-line {
            border-bottom: 1px solid #ccc;
            margin-bottom: 8px;
            min-height: 20px;
        }
        .answer-section {
            margin-top: 12px;
        }
        .answer-line {
            border-bottom: 1px solid #ccc;
            margin-bottom: 8px;
            min-height: 20px;
        }
        .notes-section {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
            border-right: 4px solid var(--primary-color);
        }
        [dir='rtl'] .notes-section {
            border-right: none;
            border-left: 4px solid var(--primary-color);
        }
        .notes-row {
            display: grid;
            grid-template-columns: auto 1fr;
            column-gap: 8px;
            align-items: baseline;
        }
        [dir='rtl'] .notes-row {
            grid-template-columns: 1fr auto;
        }
        .notes-title-inline {
            font-family: var(--brand-font) !important;
            font-weight: 700;
            color: var(--primary-color);
        }
        .notes-content {
            font-family: var(--brand-font) !important;
            line-height: 1.6;
        }
        .header-section {
            border-bottom: 2px solid var(--primary-color);
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .footer-section {
            border-top: 2px solid var(--secondary-color);
            padding-top: 12px;
            margin-top: 24px;
            color: var(--secondary-color);
            font-size: 0.85em;
            text-align: center;
        }
        .footer-section .footer-row {
            margin-bottom: 4px;
        }
        .footer-section .footer-label {
            font-weight: 700;
            margin-inline-end: 6px;
        }
        .footer-section .footer-value {
            font-family: var(--brand-font) !important;
        }
        ";
    }
    
    /**
     * Generate footer HTML with contact information (matching Python template)
     */
    private function generateFooterHtml(array $branding, bool $isRtl): string
    {
        // Build footer HTML matching Python template structure
        $footerRows = [];
        
        // Phone, Email, Website in 3 columns
        $phone = !empty($branding['SCHOOL_PHONE']) ? htmlspecialchars($branding['SCHOOL_PHONE']) : '';
        $email = !empty($branding['SCHOOL_EMAIL']) ? htmlspecialchars($branding['SCHOOL_EMAIL']) : '';
        $website = !empty($branding['SCHOOL_WEBSITE']) ? htmlspecialchars($branding['SCHOOL_WEBSITE']) : '';
        
        $footerRows[] = '<div class="footer">';
        $footerRows[] = '<div>' . ($isRtl ? 'تلیفون: ' : 'Phone: ') . $phone . '</div>';
        $footerRows[] = '<div>' . ($isRtl ? 'بریښنالیک: ' : 'Email: ') . $email . '</div>';
        $footerRows[] = '<div>' . ($isRtl ? 'ویب پاڼه: ' : 'Website: ') . $website . '</div>';
        $footerRows[] = '</div>';
        
        // Footer text
        if (!empty($branding['FOOTER_TEXT'])) {
            $footerRows[] = '<div class="paper-footer">' . htmlspecialchars($branding['FOOTER_TEXT']) . '</div>';
        }
        
        return '<footer>' . implode('', $footerRows) . '</footer>';
    }
    
    /**
     * Load font file and convert to base64 data URI
     */
    private function getFontBase64(string $fontPath): ?string
    {
        try {
            $fullPath = public_path($fontPath);
            if (!file_exists($fullPath)) {
                Log::warning("Font file not found: {$fullPath}");
                return null;
            }
            
            $fontData = file_get_contents($fullPath);
            $base64 = base64_encode($fontData);
            
            // Determine MIME type based on file extension
            $extension = strtolower(pathinfo($fontPath, PATHINFO_EXTENSION));
            $mimeType = match($extension) {
                'woff' => 'font/woff',
                'woff2' => 'font/woff2',
                'ttf' => 'font/truetype',
                'otf' => 'font/opentype',
                default => 'application/octet-stream',
            };
            
            return "data:{$mimeType};charset=utf-8;base64,{$base64}";
        } catch (\Exception $e) {
            Log::error("Failed to load font: {$fontPath}", ['exception' => $e]);
            return null;
        }
    }
    
    /**
     * Generate @font-face declarations for fonts with base64 embedding for PDF
     */
    private function generateFontFaces(string $fontFamilyName): string
    {
        // Generate font faces for BahijNassim and BahijTitr with base64 embedding
        $fontFaces = '';
        
        if ($fontFamilyName === 'BahijNassim' || $fontFamilyName === 'BahijTitr') {
            // Load fonts as base64 for PDF embedding
            $nassimRegularBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Regular.woff');
            $nassimRegularTtfBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Regular.ttf');
            $nassimBoldBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Bold.woff');
            $nassimBoldTtfBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Bold.ttf');
            
            // BahijNassim Regular
            if ($nassimRegularBase64 || $nassimRegularTtfBase64) {
                $src = [];
                if ($nassimRegularBase64) {
                    $src[] = "url(\"{$nassimRegularBase64}\") format(\"woff\")";
                }
                if ($nassimRegularTtfBase64) {
                    $src[] = "url(\"{$nassimRegularTtfBase64}\") format(\"truetype\")";
                }
                
                $fontFaces .= "
        @font-face {
            font-family: \"BahijNassim\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }";
            }
            
            // BahijNassim Bold
            if ($nassimBoldBase64 || $nassimBoldTtfBase64) {
                $src = [];
                if ($nassimBoldBase64) {
                    $src[] = "url(\"{$nassimBoldBase64}\") format(\"woff\")";
                }
                if ($nassimBoldTtfBase64) {
                    $src[] = "url(\"{$nassimBoldTtfBase64}\") format(\"truetype\")";
                }
                
                $fontFaces .= "
        @font-face {
            font-family: \"BahijNassim\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }";
            }
        }
        
        // Always include BahijTitr for headings
        $titrBoldBase64 = $this->getFontBase64('/fonts/Bahij Titr-Bold.woff');
        $titrBoldTtfBase64 = $this->getFontBase64('/fonts/Bahij Titr-Bold.ttf');
        
        if ($titrBoldBase64 || $titrBoldTtfBase64) {
            $src = [];
            if ($titrBoldBase64) {
                $src[] = "url(\"{$titrBoldBase64}\") format(\"woff\")";
            }
            if ($titrBoldTtfBase64) {
                $src[] = "url(\"{$titrBoldTtfBase64}\") format(\"truetype\")";
            }
            
            $fontFaces .= "
        @font-face {
            font-family: \"BahijTitr\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }";
        }
        
        return $fontFaces;
    }
    
    /**
     * Get numbering array for language
     */
    private function getNumbering(string $language): array
    {
        return match($language) {
            'ps' => ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۱۰'],
            'fa' => ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۱۰'],
            'ar' => ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠'],
            default => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
        };
    }
    
    /**
     * Translate key to language
     */
    private function translate(string $key, string $language): string
    {
        $translations = [
            'marks' => [
                'en' => 'marks',
                'ps' => 'نمرې',
                'fa' => 'نمره',
                'ar' => 'علامات',
            ],
            'instructions' => [
                'en' => 'Instructions',
                'ps' => 'لارښوونې',
                'fa' => 'دستورالعمل',
                'ar' => 'التعليمات',
            ],
        ];
        
        return $translations[$key][$language] ?? $translations[$key]['en'] ?? $key;
    }
    
    /**
     * Get minimal template fallback with RTL support (matching Python template design)
     */
    private function getMinimalTemplate(bool $isRtl): string
    {
        $dir = $isRtl ? 'rtl' : 'ltr';
        $lang = $isRtl ? 'ps' : 'en';
        
        // Load fonts as base64 for PDF embedding
        $nassimRegularBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Regular.woff');
        $nassimRegularTtfBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Regular.ttf');
        $nassimBoldBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Bold.woff');
        $nassimBoldTtfBase64 = $this->getFontBase64('/fonts/Bahij Nassim-Bold.ttf');
        $titrBoldBase64 = $this->getFontBase64('/fonts/Bahij Titr-Bold.woff');
        $titrBoldTtfBase64 = $this->getFontBase64('/fonts/Bahij Titr-Bold.ttf');
        
        // Build font faces with base64
        $fontFaces = '';
        
        // BahijNassim Regular
        if ($nassimRegularBase64 || $nassimRegularTtfBase64) {
            $src = [];
            if ($nassimRegularBase64) {
                $src[] = "url(\"{$nassimRegularBase64}\") format(\"woff\")";
            }
            if ($nassimRegularTtfBase64) {
                $src[] = "url(\"{$nassimRegularTtfBase64}\") format(\"truetype\")";
            }
            $fontFaces .= "
        @font-face {
            font-family: \"BahijNassim\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }";
        }
        
        // BahijNassim Bold
        if ($nassimBoldBase64 || $nassimBoldTtfBase64) {
            $src = [];
            if ($nassimBoldBase64) {
                $src[] = "url(\"{$nassimBoldBase64}\") format(\"woff\")";
            }
            if ($nassimBoldTtfBase64) {
                $src[] = "url(\"{$nassimBoldTtfBase64}\") format(\"truetype\")";
            }
            $fontFaces .= "
        @font-face {
            font-family: \"BahijNassim\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }";
        }
        
        // BahijTitr Bold
        if ($titrBoldBase64 || $titrBoldTtfBase64) {
            $src = [];
            if ($titrBoldBase64) {
                $src[] = "url(\"{$titrBoldBase64}\") format(\"woff\")";
            }
            if ($titrBoldTtfBase64) {
                $src[] = "url(\"{$titrBoldTtfBase64}\") format(\"truetype\")";
            }
            $fontFaces .= "
        @font-face {
            font-family: \"BahijTitr\";
            src: " . implode(",\n                 ", $src) . ";
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }";
        }
        
        return <<<HTML
<!DOCTYPE html>
<html lang="{$lang}" dir="{DIRECTION}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:;">
    <title>{PAPER_TITLE}</title>
    <style>
{$fontFaces}
        :root {
            --font-base: "BahijNassim", "Noto Naskh Arabic", "Amiri", "Times New Roman", serif;
            --font-heading: "BahijNassim", "Amiri", "Times New Roman", serif;
            --font-en: "Times New Roman", serif;
            --text: #000;
            --muted: #555;
            --brand: #0b0b56;
            --border: #222;
            --strip-bg: #f7f7f7;
            --strip-border: #d0d0d0;
            --logo-max-h-mm: 22;
            --qr-size-mm: 22;
        }
        @page { 
            size: A4 portrait; 
            margin: 5mm; 
        }
        html, body {
            margin: 0;
            padding: 0;
        }
        body { 
            font-family: var(--font-base); 
            margin: 0; 
            line-height: 1.6;
        }
        .a4-page { 
            width: 210mm; 
            min-height: 297mm; 
            margin: 15mm auto; 
            padding: 5mm; 
            background: #fff; 
            box-sizing: border-box; 
        }
        @media print {
            @page { 
                size: A4 portrait; 
                margin: 5mm; 
            }
            * {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            html, body {
                margin: 0;
                padding: 0;
                height: auto;
                width: 100%;
                overflow: visible;
            }
            body {
                height: auto;
                overflow: visible;
                page-break-after: avoid;
            }
            .a4-page { 
                width: 100%;
                margin: 0;
                padding: 5mm;
                box-shadow: none;
                min-height: auto !important;
                height: auto !important;
                max-height: 100%;
                page-break-after: avoid;
                page-break-inside: avoid;
                overflow: visible;
            }
            header, footer {
                page-break-inside: avoid;
            }
            .question {
                page-break-inside: avoid;
                page-break-after: auto;
            }
            .question:last-child {
                page-break-after: avoid;
            }
        }
        header {
            position: relative;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
            margin-bottom: 16px;
        }
        /* QR box on LEFT (for RTL) */
        .qr-box {
            position: absolute;
            top: 0;
            left: 0;
            width: calc(var(--qr-size-mm) * 1mm);
            height: calc(var(--qr-size-mm) * 1mm);
        }
        .qr-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        /* Masthead row for logo and school name */
        .masthead-row {
            position: relative;
            min-height: calc(var(--logo-max-h-mm) * 1mm);
            margin-bottom: 12px;
        }
        /* Logo on RIGHT (for RTL) */
        .masthead-logo {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: calc(var(--logo-max-h-mm) * 1mm);
            height: calc(var(--logo-max-h-mm) * 1mm);
        }
        .masthead-logo img {
            max-height: 100%;
            max-width: 100%;
            object-fit: contain;
        }
        /* Centered school name */
        .masthead-text {
            text-align: center;
            padding: 0 16px;
        }
        .masthead-text .name-ar {
            margin: 0;
            font-family: var(--font-heading);
            font-size: 20pt;
            font-weight: 700;
            color: var(--brand);
            letter-spacing: 0.2px;
        }
        .masthead-text .name-en {
            font-family: var(--font-en);
            font-size: 10pt;
            color: var(--muted);
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .masthead-text .address {
            margin-top: 2px;
            font-size: 10pt;
            color: var(--muted);
        }
        /* Exam strip table */
        .exam-strip {
            border: 1px solid var(--strip-border);
            background: var(--strip-bg);
            border-radius: 6px;
            overflow: hidden;
            font-family: var(--font-base);
            margin-bottom: 12px;
        }
        .exam-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12pt;
            direction: {DIRECTION};
        }
        .exam-table td {
            width: 25%;
            padding: 10px 12px;
            text-align: center;
            vertical-align: middle;
            border-top: 1px solid var(--strip-border);
            border-inline-start: 1px solid var(--strip-border);
            white-space: nowrap;
        }
        .exam-table tr:first-child td {
            border-top: 0;
        }
        .exam-table td:first-child {
            border-inline-start: 0;
        }
        .exam-table .row-2 td[colspan="2"] {
            width: 50%;
        }
        .exam-table .k {
            color: var(--brand);
            font-weight: 700;
            letter-spacing: 0.2px;
            margin-inline-end: 6px;
        }
        .exam-table .v {
            color: var(--text);
        }
        .exam-table tr:nth-child(odd) td {
            background: rgba(0, 0, 0, 0.02);
        }
        .title {
            font-family: var(--font-heading);
            font-size: 16pt;
            font-weight: 700;
            color: var(--brand);
            margin: 12px 0;
        }
        .questions {
            font-size: 13pt;
        }
        .questions[dir='rtl'] {
            direction: rtl;
        }
        .questions[dir='ltr'] {
            direction: ltr;
        }
        .question {
            font-family: var(--font-base) !important;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px dotted #bbb;
        }
        .question-header { 
            display: grid; 
            grid-template-columns: 1fr auto; 
            align-items: baseline; 
            column-gap: 8px; 
            width: 100%;
            margin-bottom: 8px;
        }
        [dir='rtl'] .question-header {
            grid-template-columns: auto 1fr;
        }
        .question-title { 
            font-family: var(--font-base) !important;
            font-weight: 700; 
            margin: 0; 
            color: var(--text);
            line-height: 1.6;
            font-size: 13pt;
            text-align: start;
        }
        .question-marks { 
            font-family: var(--font-base) !important;
            white-space: nowrap; 
            color: var(--text);
            font-weight: 700; 
            margin-inline-start: 8px;
            font-size: 13pt;
        }
        .question-options {
            font-family: var(--font-base) !important;
            list-style-type: lower-alpha;
            margin: 12px 0;
            padding-inline-start: 30px;
        }
        [dir='rtl'] .question-options {
            list-style-type: arabic-indic;
            padding-inline-start: 30px;
            padding-inline-end: 0;
        }
        .question-option {
            font-family: var(--font-base) !important;
            margin-bottom: 8px;
            line-height: 1.6;
            font-size: 13pt;
            text-align: start;
        }
        .answer-section {
            margin-top: 12px;
        }
        .answer-line {
            border-bottom: 1px solid #ccc;
            margin-bottom: 8px;
            min-height: 20px;
        }
        .notes-section {
            background: #fffef6;
            padding: 10px 12px;
            border-radius: 6px;
            margin: 16px 0;
            border: 1px solid var(--strip-border);
        }
        .notes-row {
            display: grid;
            grid-template-columns: auto 1fr;
            column-gap: 8px;
            align-items: baseline;
        }
        [dir='rtl'] .notes-row {
            grid-template-columns: 1fr auto;
        }
        .notes-title-inline {
            font-family: var(--font-base) !important;
            font-weight: 700;
            color: var(--brand);
            margin-bottom: 0;
            white-space: nowrap;
        }
        .notes-content {
            font-family: var(--font-base) !important;
            font-size: 11pt;
            line-height: 1.6;
        }
        footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid var(--border);
        }
        .footer {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            font-size: 10pt;
            align-items: center;
            margin-bottom: 4px;
        }
        .footer > div {
            text-align: center;
            color: var(--muted);
            font-family: var(--font-base);
        }
        .paper-footer {
            margin-top: 4px;
            text-align: center;
            font-size: 10pt;
            color: var(--muted);
            font-family: var(--font-base);
        }
    </style>
</head>
<body>
    <div class="a4-page">
        <header>
            <!-- Custom Header HTML (if provided) -->
            {HEADER_HTML}
            
            <!-- QR box on LEFT -->
            <div class="qr-box">
                {QR_HTML}
            </div>
            
            <div class="masthead-row">
                <!-- Logo on RIGHT -->
                <div class="masthead-logo">
                    {LOGO_HTML}
                </div>
                
                <!-- Centered school identity -->
                <div class="masthead-text">
                    <h1 class="name-ar">{SCHOOL_NAME_AR}</h1>
                    <div class="name-en">{SCHOOL_NAME}</div>
                    <div class="address">{SCHOOL_ADDRESS}</div>
                </div>
            </div>
            
            <!-- Exam strip table -->
            <div class="exam-strip">
                <table class="exam-table" role="presentation">
                    <tbody>
                        <tr class="row-1">
                            <td><span class="k">نیټه:</span><span class="v">{DATE}</span></td>
                            <td><span class="k">موده:</span><span class="v">{DURATION} دقیقې</span></td>
                            <td><span class="k">ټول نمرې:</span><span class="v">{TOTAL_MARKS}</span></td>
                            <td><span class="k">کال:</span><span class="v">{YEAR_NAME}</span></td>
                        </tr>
                        <tr class="row-2">
                            <td><span class="k">امتحان:</span><span class="v">{EXAM_NAME}</span></td>
                            <td><span class="k">ټولګی:</span><span class="v">{CLASS_NAME}</span></td>
                            <td colspan="2"><span class="k">مضمون:</span><span class="v">{SUBJECT_NAME}</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <h2 class="title">{PAPER_TITLE}</h2>
        </header>
        
        {NOTES_SECTION}
        
        <main class="questions" dir="{DIRECTION}">
            {CONTENT}
        </main>
        
        <footer>
            <div class="footer">
                <div>تلیفون: {SCHOOL_PHONE}</div>
                <div>بریښنالیک: {SCHOOL_EMAIL}</div>
                <div>ویب پاڼه: {SCHOOL_WEBSITE}</div>
            </div>
            <div class="paper-footer">{FOOTER_TEXT}</div>
        </footer>
    </div>
</body>
</html>
HTML;
    }
}

