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

        return <<<HTML
<!DOCTYPE html>
<html lang="en" dir="{$direction}">
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: {$fontFamily}; direction: {$direction}; {$backgroundStyle} }
        .certificate-container { position: relative; min-height: 100vh; padding: 30px; box-sizing: border-box; }
        .qr { position: absolute; bottom: 20px; {$direction === 'rtl' ? 'left' : 'right'}: 20px; }
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
