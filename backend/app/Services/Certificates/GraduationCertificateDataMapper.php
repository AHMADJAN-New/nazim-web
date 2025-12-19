<?php

namespace App\Services\Certificates;

use App\Models\AcademicYear;
use App\Models\ClassModel;
use App\Models\GraduationStudent;
use App\Models\IssuedCertificate;
use App\Models\SchoolBranding;
use App\Models\Student;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class GraduationCertificateDataMapper
{
    /**
     * Map certificate data to field values for layout-based rendering
     *
     * @param IssuedCertificate $certificate
     * @param array $context Additional context (class_id, academic_year_id, graduation_date, verification_url, etc.)
     * @return array Field values keyed by field ID
     */
    public function mapToFields(IssuedCertificate $certificate, array $context = []): array
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

        // Format graduation date
        $graduationDate = '';
        if (isset($context['graduation_date'])) {
            $date = \Illuminate\Support\Carbon::parse($context['graduation_date']);
            $graduationDate = $date->format('F d, Y'); // e.g., "January 15, 2024"
        }

        // Format position
        $position = '';
        if ($graduationStudent && $graduationStudent->position) {
            $pos = $graduationStudent->position;
            $suffix = match ($pos % 10) {
                1 => 'st',
                2 => 'nd',
                3 => 'rd',
                default => 'th',
            };
            // Handle 11th, 12th, 13th specially
            if ($pos % 100 >= 11 && $pos % 100 <= 13) {
                $suffix = 'th';
            }
            $position = $pos . $suffix;
        }

        return [
            'header' => 'Graduation Certificate', // Default, can be overridden by layout_config['headerText']
            'studentName' => $student?->full_name ?? '',
            'fatherName' => $student?->father_name ?? '',
            'grandfatherName' => $student?->grandfather_name ?? '',
            'motherName' => $student?->mother_name ?? '',
            'className' => $class?->name ?? '',
            'schoolName' => $school?->school_name ?? '',
            'academicYear' => $academicYear?->name ?? '',
            'graduationDate' => $graduationDate,
            'certificateNumber' => $certificate->certificate_no ?? '',
            'position' => $position,
            'province' => $student?->curr_province ?? '',
            'district' => $student?->curr_district ?? '',
            'village' => $student?->curr_village ?? '',
            'nationality' => $student?->nationality ?? '',
            'guardianName' => $student?->guardian_name ?? '',
            'studentPhoto' => $student?->picture_path ?? '',
            'qrCode' => $qrBase64,
        ];
    }
}
