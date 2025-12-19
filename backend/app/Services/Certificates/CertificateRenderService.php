<?php

namespace App\Services\Certificates;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\ClassModel;
use App\Models\GraduationStudent;
use App\Models\IssuedCertificate;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Services\DocumentPdfService;
use App\Services\DocumentRenderingService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificateRenderService
{
    public function __construct(
        private readonly DocumentRenderingService $renderer,
        private readonly DocumentPdfService $pdfService
    ) {
    }

    public function renderSingle(CertificateTemplate $template, IssuedCertificate $certificate, array $context = []): ?string
    {
        // Check if template uses layout_config (new layout-based rendering)
        if ($template->layout_config && is_array($template->layout_config) && !empty($template->layout_config)) {
            return $this->renderWithLayoutConfig($template, $certificate, $context);
        }

        // Fall back to body_html rendering (backward compatibility)
        return $this->renderWithBodyHtml($template, $certificate, $context);
    }

    /**
     * Render certificate using layout_config (new layout-based rendering)
     */
    private function renderWithLayoutConfig(CertificateTemplate $template, IssuedCertificate $certificate, array $context = []): ?string
    {
        $dataMapper = new GraduationCertificateDataMapper();
        $fieldValues = $dataMapper->mapToFields($certificate, $context);

        $layoutConfig = $template->layout_config;
        $direction = $layoutConfig['rtl'] ?? $template->rtl ?? true ? 'rtl' : 'ltr';
        $fontFamily = $layoutConfig['fontFamily'] ?? $template->font_family ?? 'Inter, Arial, sans-serif';
        $globalFontSize = $layoutConfig['fontSize'] ?? 16;
        $textColor = $layoutConfig['textColor'] ?? '#000000';
        $enabledFields = $layoutConfig['enabledFields'] ?? [];

        // Get background image as base64
        $backgroundStyle = '';
        if ($template->background_image_path && Storage::exists($template->background_image_path)) {
            $imageContent = Storage::get($template->background_image_path);
            $imageExtension = pathinfo($template->background_image_path, PATHINFO_EXTENSION);
            $mimeType = match (strtolower($imageExtension)) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/png',
            };
            $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
            $backgroundStyle = "background: url('{$base64Image}') center center / cover no-repeat;";
        }

        // Build field HTML elements
        $fieldElements = [];
        $fieldConfigs = [
            'header' => ['key' => 'headerPosition', 'defaultFontSize' => 36],
            'studentName' => ['key' => 'studentNamePosition', 'defaultFontSize' => 28],
            'fatherName' => ['key' => 'fatherNamePosition', 'defaultFontSize' => 16],
            'grandfatherName' => ['key' => 'grandfatherNamePosition', 'defaultFontSize' => 14],
            'motherName' => ['key' => 'motherNamePosition', 'defaultFontSize' => 14],
            'className' => ['key' => 'classNamePosition', 'defaultFontSize' => 24],
            'schoolName' => ['key' => 'schoolNamePosition', 'defaultFontSize' => 20],
            'academicYear' => ['key' => 'academicYearPosition', 'defaultFontSize' => 18],
            'graduationDate' => ['key' => 'graduationDatePosition', 'defaultFontSize' => 14],
            'certificateNumber' => ['key' => 'certificateNumberPosition', 'defaultFontSize' => 12],
            'position' => ['key' => 'positionPosition', 'defaultFontSize' => 14],
            'province' => ['key' => 'provincePosition', 'defaultFontSize' => 12],
            'district' => ['key' => 'districtPosition', 'defaultFontSize' => 12],
            'village' => ['key' => 'villagePosition', 'defaultFontSize' => 12],
            'nationality' => ['key' => 'nationalityPosition', 'defaultFontSize' => 12],
            'guardianName' => ['key' => 'guardianNamePosition', 'defaultFontSize' => 14],
            'studentPhoto' => ['key' => 'studentPhotoPosition', 'isImage' => true, 'defaultWidth' => 100, 'defaultHeight' => 100],
            'qrCode' => ['key' => 'qrCodePosition', 'isImage' => true, 'defaultWidth' => 120, 'defaultHeight' => 120],
        ];

        foreach ($fieldConfigs as $fieldId => $config) {
            // Check if field is enabled (if enabledFields array is provided)
            if (!empty($enabledFields) && !in_array($fieldId, $enabledFields)) {
                continue;
            }

            $positionKey = $config['key'];
            $position = $layoutConfig[$positionKey] ?? null;

            if (!$position || !isset($position['x']) || !isset($position['y'])) {
                continue;
            }

            $x = $position['x'];
            $y = $position['y'];

            // Get field-specific font settings
            $fieldFonts = $layoutConfig['fieldFonts'] ?? [];
            $fieldFont = $fieldFonts[$fieldId] ?? [];
            $fieldFontSize = $fieldFont['fontSize'] ?? $config['defaultFontSize'] ?? $globalFontSize;
            $fieldFontFamily = $fieldFont['fontFamily'] ?? $fontFamily;

            if (isset($config['isImage']) && $config['isImage']) {
                // Image field (student photo or QR code)
                $width = $position['width'] ?? $config['defaultWidth'] ?? 100;
                $height = $position['height'] ?? $config['defaultHeight'] ?? 100;

                $imageSrc = '';
                if ($fieldId === 'studentPhoto' && !empty($fieldValues['studentPhoto'])) {
                    // Load student photo
                    if (Storage::exists($fieldValues['studentPhoto'])) {
                        $imageContent = Storage::get($fieldValues['studentPhoto']);
                        $imageExtension = pathinfo($fieldValues['studentPhoto'], PATHINFO_EXTENSION);
                        $mimeType = match (strtolower($imageExtension)) {
                            'jpg', 'jpeg' => 'image/jpeg',
                            'png' => 'image/png',
                            'gif' => 'image/gif',
                            'webp' => 'image/webp',
                            default => 'image/png',
                        };
                        $imageSrc = 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
                    }
                } elseif ($fieldId === 'qrCode' && !empty($fieldValues['qrCode'])) {
                    $imageSrc = $fieldValues['qrCode'];
                }

                if ($imageSrc) {
                    $fieldElements[] = sprintf(
                        '<img src="%s" alt="%s" style="position: absolute; left: %s%%; top: %s%%; width: %dpx; height: %dpx; transform: translate(-50%%, -50%%);" />',
                        e($imageSrc),
                        e($fieldId),
                        $x,
                        $y,
                        $width,
                        $height
                    );
                }
            } else {
                // Text field
                $text = $fieldValues[$fieldId] ?? '';
                
                // Use custom text from layout_config if available (for header, etc.)
                if ($fieldId === 'header' && isset($layoutConfig['headerText'])) {
                    $text = $layoutConfig['headerText'];
                } elseif ($fieldId === 'className' && isset($layoutConfig['classNameText']) && !empty($text)) {
                    // Add classNameText prefix if provided
                    $text = $layoutConfig['classNameText'] . ' ' . $text;
                } elseif ($fieldId === 'graduationDate' && isset($layoutConfig['dateText']) && !empty($text)) {
                    // Add dateText prefix if provided
                    $text = $layoutConfig['dateText'] . ' ' . $text;
                } elseif ($fieldId === 'certificateNumber' && !empty($text)) {
                    // Format certificate number with label
                    $text = 'Certificate No: ' . $text;
                }

                // Skip empty fields (except header which might be custom text)
                if (empty($text) && $fieldId !== 'header') {
                    continue;
                }

                $fieldElements[] = sprintf(
                    '<div style="position: absolute; left: %s%%; top: %s%%; transform: translate(-50%%, -50%%); font-family: %s; font-size: %dpx; font-weight: bold; color: %s; white-space: nowrap; text-align: center;">%s</div>',
                    $x,
                    $y,
                    e($fieldFontFamily),
                    $fieldFontSize,
                    e($textColor),
                    e($text)
                );
            }
        }

        $fieldsHtml = implode("\n        ", $fieldElements);

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en" dir="{$direction}">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { 
            font-family: {$fontFamily}; 
            direction: {$direction}; 
            margin: 0; 
            padding: 0; 
            width: 210mm; 
            height: 297mm; 
            position: relative; 
            overflow: hidden;
            {$backgroundStyle}
        }
        .certificate-container { 
            position: relative; 
            width: 100%; 
            height: 100%; 
            box-sizing: border-box; 
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        {$fieldsHtml}
    </div>
</body>
</html>
HTML;

        $layout = $this->mapLayout($template->page_size ?? 'A4');
        return $this->pdfService->generate($html, $layout, $this->pdfDirectory($certificate));
    }

    /**
     * Render certificate using body_html (backward compatibility)
     */
    private function renderWithBodyHtml(CertificateTemplate $template, IssuedCertificate $certificate, array $context = []): ?string
    {
        $student = Student::with('school')->find($certificate->student_id);
        $school = $student?->school ?? SchoolBranding::find($certificate->school_id);
        $class = isset($context['class_id']) ? ClassModel::find($context['class_id']) : null;
        $academicYear = isset($context['academic_year_id']) ? AcademicYear::find($context['academic_year_id']) : null;
        $graduationStudent = $certificate->batch_id
            ? GraduationStudent::where('batch_id', $certificate->batch_id)
                ->where('student_id', $certificate->student_id)
                ->first()
            : null;

        $verificationUrl = $context['verification_url'] ?? url('/verify/certificate/' . $certificate->verification_hash);
        $qr = QrCode::format('png')->size(240)->generate($certificate->qr_payload ?: $verificationUrl);
        $qrBase64 = 'data:image/png;base64,' . base64_encode($qr);

        $placeholders = [
            'student_name' => e($student?->full_name ?? ''),
            'father_name' => e($student?->father_name ?? ''),
            'class_name' => e($class?->name ?? ''),
            'school_name' => e($school?->school_name ?? ''),
            'academic_year' => e($academicYear?->name ?? ''),
            'graduation_date' => isset($context['graduation_date']) ? e(\Illuminate\Support\Carbon::parse($context['graduation_date'])->format('Y-m-d')) : '',
            'certificate_no' => e($certificate->certificate_no),
            'position' => e($graduationStudent?->position ?? ''),
            'qr_code_image' => sprintf('<img src="%s" alt="QR Code" style="width:120px;height:120px;" />', $qrBase64),
            'verification_url' => e($verificationUrl),
        ];

        // Check if template uses layout_config or body_html
        $layoutConfig = $template->layout_config;
        
        if ($layoutConfig && is_array($layoutConfig) && !empty($layoutConfig)) {
            // Use layout-based rendering
            return $this->renderWithLayoutConfig($template, $certificate, $context);
        }
        
        // Fall back to body_html rendering (backward compatibility)
        $body = $template->body_html ?: $this->defaultBody();
        $bodyWithData = $this->applyPlaceholders($body, $placeholders);

        $html = $this->wrapHtml($bodyWithData, $template, $school?->font_family ?? null);

        $layout = $this->mapLayout($template->page_size ?? 'A4');

        return $this->pdfService->generate($html, $layout, $this->pdfDirectory($certificate));
    }

    private function applyPlaceholders(string $html, array $variables): string
    {
        foreach ($variables as $key => $value) {
            $patterns = [
                '{{' . $key . '}}',
                '{{ ' . $key . ' }}',
                '{{ ' . $key . '}}',
                '{{' . $key . ' }}',
            ];
            $html = str_replace($patterns, $value, $html);
        }

        return $html;
    }

    private function wrapHtml(string $body, CertificateTemplate $template, ?string $fallbackFont = null): string
    {
        $direction = $template->rtl ? 'rtl' : 'ltr';
        $fontFamily = $template->font_family ?: $fallbackFont ?: 'Inter, Arial, sans-serif';

        $backgroundStyle = '';
        if ($template->background_image_path && Storage::exists($template->background_image_path)) {
            // Convert background image to base64 data URI for Browsershot compatibility
            $imageContent = Storage::get($template->background_image_path);
            $imageExtension = pathinfo($template->background_image_path, PATHINFO_EXTENSION);
            $mimeType = match (strtolower($imageExtension)) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/png',
            };
            $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
            $backgroundStyle = "background: url('{$base64Image}') center center / cover no-repeat;";
        }

        $qrPosition = $direction === 'rtl' ? 'left' : 'right';

        return <<<HTML
<!DOCTYPE html>
<html lang="en" dir="{$direction}">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: {$fontFamily}; direction: {$direction}; {$backgroundStyle} }
        .certificate-container { position: relative; min-height: 100vh; padding: 30px; box-sizing: border-box; }
        .qr { position: absolute; bottom: 20px; {$qrPosition}: 20px; }
    </style>
</head>
<body>
    <div class="certificate-container">
        {$body}
    </div>
</body>
</html>
HTML;
    }

    private function mapLayout(string $pageSize): string
    {
        $normalized = Str::upper($pageSize);
        return $normalized === 'A5' ? 'A4_portrait' : 'A4_portrait';
    }

    private function pdfDirectory(IssuedCertificate $certificate): string
    {
        return 'certificates/' . $certificate->school_id;
    }

    /**
     * Prepare field data for graduation certificates
     */
    private function prepareGraduationFieldData(
        ?Student $student,
        ?SchoolBranding $school,
        ?ClassModel $class,
        ?AcademicYear $academicYear,
        ?GraduationStudent $graduationStudent,
        IssuedCertificate $certificate,
        array $context,
        string $qrBase64,
        string $verificationUrl
    ): array {
        // Get student photo if available
        $studentPhotoBase64 = null;
        if ($student?->picture_path && Storage::exists($student->picture_path)) {
            $photoContent = Storage::get($student->picture_path);
            $photoExtension = pathinfo($student->picture_path, PATHINFO_EXTENSION);
            $photoMimeType = match (strtolower($photoExtension)) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/png',
            };
            $studentPhotoBase64 = 'data:' . $photoMimeType . ';base64,' . base64_encode($photoContent);
        }

        return [
            'header' => $layoutConfig['headerText'] ?? 'Graduation Certificate',
            'studentName' => e($student?->full_name ?? ''),
            'fatherName' => e($student?->father_name ?? ''),
            'grandfatherName' => e($student?->grandfather_name ?? ''),
            'motherName' => e($student?->mother_name ?? ''),
            'className' => e($class?->name ?? ''),
            'schoolName' => e($school?->school_name ?? ''),
            'academicYear' => e($academicYear?->name ?? ''),
            'graduationDate' => isset($context['graduation_date']) 
                ? e(\Illuminate\Support\Carbon::parse($context['graduation_date'])->format('Y-m-d')) 
                : '',
            'certificateNumber' => e($certificate->certificate_no),
            'position' => e($graduationStudent?->position ?? ''),
            'province' => e($student?->curr_province ?? ''),
            'district' => e($student?->curr_district ?? ''),
            'village' => e($student?->curr_village ?? ''),
            'nationality' => e($student?->nationality ?? ''),
            'guardianName' => e($student?->guardian_name ?? ''),
            'studentPhoto' => $studentPhotoBase64,
            'qrCode' => $qrBase64,
            'verificationUrl' => e($verificationUrl),
        ];
    }

    /**
     * Generate HTML from layout_config
     */
    private function generateHtmlFromLayoutConfig(
        CertificateTemplate $template,
        array $layoutConfig,
        array $fieldData,
        ?string $fallbackFont = null
    ): string {
        $direction = $layoutConfig['rtl'] ?? $template->rtl ?? false ? 'rtl' : 'ltr';
        $fontFamily = $layoutConfig['fontFamily'] ?? $template->font_family ?? $fallbackFont ?? 'Inter, Arial, sans-serif';
        $baseFontSize = $layoutConfig['fontSize'] ?? 24;
        $textColor = $layoutConfig['textColor'] ?? '#000000';
        $enabledFields = $layoutConfig['enabledFields'] ?? [];

        // Get background image
        $backgroundStyle = '';
        if ($template->background_image_path && Storage::exists($template->background_image_path)) {
            $imageContent = Storage::get($template->background_image_path);
            $imageExtension = pathinfo($template->background_image_path, PATHINFO_EXTENSION);
            $mimeType = match (strtolower($imageExtension)) {
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
                default => 'image/png',
            };
            $base64Image = 'data:' . $mimeType . ';base64,' . base64_encode($imageContent);
            $backgroundStyle = "background: url('{$base64Image}') center center / cover no-repeat;";
        }

        // Generate field HTML elements
        $fieldElements = [];
        $fieldFonts = $layoutConfig['fieldFonts'] ?? [];

        foreach ($enabledFields as $fieldId) {
            // For header field, use layout_config headerText if available
            if ($fieldId === 'header') {
                $fieldData['header'] = $layoutConfig['headerText'] ?? $fieldData['header'] ?? 'Graduation Certificate';
            }

            if (!isset($fieldData[$fieldId])) {
                continue;
            }

            $positionKey = $fieldId . 'Position';
            $position = $layoutConfig[$positionKey] ?? null;
            
            if (!$position || !isset($position['x']) || !isset($position['y'])) {
                continue;
            }

            $fieldFontSize = $fieldFonts[$fieldId]['fontSize'] ?? $layoutConfig[$fieldId . 'FontSize'] ?? $baseFontSize;
            $fieldFontFamily = $fieldFonts[$fieldId]['fontFamily'] ?? $fontFamily;
            $fieldColor = $fieldFonts[$fieldId]['textColor'] ?? $textColor;
            $fieldWidth = $fieldFonts[$fieldId]['width'] ?? null;
            $fieldHeight = $fieldFonts[$fieldId]['height'] ?? null;

            $value = $fieldData[$fieldId];
            $isImage = in_array($fieldId, ['studentPhoto', 'qrCode']) && $value;

            if ($isImage) {
                $width = $fieldWidth ?? ($fieldId === 'qrCode' ? 120 : 100);
                $height = $fieldHeight ?? ($fieldId === 'qrCode' ? 120 : 100);
                $fieldHtml = sprintf(
                    '<img src="%s" alt="%s" style="width:%dpx;height:%dpx;object-fit:cover;" />',
                    $value,
                    $fieldId,
                    $width,
                    $height
                );
            } else {
                $fieldHtml = e($value);
            }

            $style = sprintf(
                'position: absolute; left: %s%%; top: %s%%; transform: translate(-50%%, -50%%); font-family: %s; font-size: %dpx; color: %s;',
                $position['x'],
                $position['y'],
                $fieldFontFamily,
                $fieldFontSize,
                $fieldColor
            );

            if ($fieldWidth) {
                $style .= sprintf(' width: %dpx;', $fieldWidth);
            }
            if ($fieldHeight && !$isImage) {
                $style .= sprintf(' height: %dpx;', $fieldHeight);
            }

            $fieldElements[] = sprintf(
                '<div class="field-%s" style="%s">%s</div>',
                $fieldId,
                $style,
                $fieldHtml
            );
        }

        $fieldsHtml = implode("\n        ", $fieldElements);

        return <<<HTML
<!DOCTYPE html>
<html lang="en" dir="{$direction}">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 0; }
        body { 
            font-family: {$fontFamily}; 
            direction: {$direction}; 
            margin: 0; 
            padding: 0;
            {$backgroundStyle}
        }
        .certificate-container { 
            position: relative; 
            width: 100%; 
            height: 100vh; 
            min-height: 100vh;
            box-sizing: border-box;
        }
    </style>
</head>
<body>
    <div class="certificate-container">
        {$fieldsHtml}
    </div>
</body>
</html>
HTML;
    }

    private function defaultBody(): string
    {
        return <<<HTML
        <div style="text-align:center;">
            <h1>Graduation Certificate</h1>
            <p>This certifies that <strong>{{student_name}}</strong> has successfully graduated.</p>
            <p>{{school_name}} | {{academic_year}}</p>
            <p>{{graduation_date}}</p>
            <div class="qr">{{qr_code_image}}</div>
        </div>
HTML;
    }
}
