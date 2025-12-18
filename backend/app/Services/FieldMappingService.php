<?php

namespace App\Services;

use App\Models\Student;
use App\Models\Staff;
use App\Models\StudentAdmission;
use Illuminate\Support\Facades\DB;

class FieldMappingService
{
    /**
     * Get available fields for a given recipient type
     *
     * @param string $recipientType student|staff|applicant|general
     * @return array
     */
    public function getAvailableFields(string $recipientType): array
    {
        return match ($recipientType) {
            'student' => $this->getStudentFields(),
            'staff' => $this->getStaffFields(),
            'applicant' => $this->getApplicantFields(),
            'general' => $this->getGeneralFields(),
            default => $this->getGeneralFields(),
        };
    }

    /**
     * Get student-specific fields
     *
     * @return array
     */
    private function getStudentFields(): array
    {
        return [
            // Basic Info
            ['key' => 'student_name', 'label' => 'نام محصل', 'label_en' => 'Student Name', 'group' => 'basic'],
            ['key' => 'student_id', 'label' => 'آیدی محصل', 'label_en' => 'Student ID', 'group' => 'basic'],
            ['key' => 'student_code', 'label' => 'کود محصل', 'label_en' => 'Student Code', 'group' => 'basic'],
            ['key' => 'father_name', 'label' => 'نام پدر', 'label_en' => 'Father Name', 'group' => 'basic'],
            ['key' => 'grandfather_name', 'label' => 'نام نیکه', 'label_en' => 'Grandfather Name', 'group' => 'basic'],
            ['key' => 'mother_name', 'label' => 'نام مادر', 'label_en' => 'Mother Name', 'group' => 'basic'],
            ['key' => 'gender', 'label' => 'جنسیت', 'label_en' => 'Gender', 'group' => 'basic'],
            ['key' => 'date_of_birth', 'label' => 'تاریخ تولد', 'label_en' => 'Date of Birth', 'group' => 'basic'],
            ['key' => 'place_of_birth', 'label' => 'محل تولد', 'label_en' => 'Place of Birth', 'group' => 'basic'],
            ['key' => 'nationality', 'label' => 'ملیت', 'label_en' => 'Nationality', 'group' => 'basic'],
            ['key' => 'tazkira_number', 'label' => 'نمبر تذکره', 'label_en' => 'Tazkira Number', 'group' => 'basic'],

            // Academic Info
            ['key' => 'class_name', 'label' => 'صنف', 'label_en' => 'Class', 'group' => 'academic'],
            ['key' => 'grade', 'label' => 'نمره', 'label_en' => 'Grade', 'group' => 'academic'],
            ['key' => 'section', 'label' => 'بخش', 'label_en' => 'Section', 'group' => 'academic'],
            ['key' => 'roll_number', 'label' => 'نمبر حاضری', 'label_en' => 'Roll Number', 'group' => 'academic'],
            ['key' => 'enrollment_date', 'label' => 'تاریخ شمولیت', 'label_en' => 'Enrollment Date', 'group' => 'academic'],
            ['key' => 'academic_year', 'label' => 'سال تحصیلی', 'label_en' => 'Academic Year', 'group' => 'academic'],
            ['key' => 'shift', 'label' => 'شفت', 'label_en' => 'Shift', 'group' => 'academic'],
            ['key' => 'status', 'label' => 'حالت', 'label_en' => 'Status', 'group' => 'academic'],

            // Contact Info
            ['key' => 'phone', 'label' => 'تلیفون', 'label_en' => 'Phone', 'group' => 'contact'],
            ['key' => 'email', 'label' => 'ایمیل', 'label_en' => 'Email', 'group' => 'contact'],
            ['key' => 'address', 'label' => 'آدرس', 'label_en' => 'Address', 'group' => 'contact'],
            ['key' => 'province', 'label' => 'ولایت', 'label_en' => 'Province', 'group' => 'contact'],
            ['key' => 'district', 'label' => 'ولسوالی', 'label_en' => 'District', 'group' => 'contact'],
            ['key' => 'village', 'label' => 'کلی', 'label_en' => 'Village', 'group' => 'contact'],

            // Guardian Info
            ['key' => 'guardian_name', 'label' => 'نام سرپرست', 'label_en' => 'Guardian Name', 'group' => 'guardian'],
            ['key' => 'guardian_phone', 'label' => 'تلیفون سرپرست', 'label_en' => 'Guardian Phone', 'group' => 'guardian'],
            ['key' => 'guardian_relation', 'label' => 'نسبت سرپرست', 'label_en' => 'Guardian Relation', 'group' => 'guardian'],
            ['key' => 'guardian_occupation', 'label' => 'وظیفه سرپرست', 'label_en' => 'Guardian Occupation', 'group' => 'guardian'],
        ];
    }

    /**
     * Get staff-specific fields
     *
     * @return array
     */
    private function getStaffFields(): array
    {
        return [
            // Basic Info
            ['key' => 'staff_name', 'label' => 'نام کارمند', 'label_en' => 'Staff Name', 'group' => 'basic'],
            ['key' => 'staff_id', 'label' => 'آیدی کارمند', 'label_en' => 'Staff ID', 'group' => 'basic'],
            ['key' => 'staff_code', 'label' => 'کود کارمند', 'label_en' => 'Staff Code', 'group' => 'basic'],
            ['key' => 'father_name', 'label' => 'نام پدر', 'label_en' => 'Father Name', 'group' => 'basic'],
            ['key' => 'gender', 'label' => 'جنسیت', 'label_en' => 'Gender', 'group' => 'basic'],
            ['key' => 'date_of_birth', 'label' => 'تاریخ تولد', 'label_en' => 'Date of Birth', 'group' => 'basic'],
            ['key' => 'nationality', 'label' => 'ملیت', 'label_en' => 'Nationality', 'group' => 'basic'],
            ['key' => 'tazkira_number', 'label' => 'نمبر تذکره', 'label_en' => 'Tazkira Number', 'group' => 'basic'],

            // Employment Info
            ['key' => 'position', 'label' => 'موقف', 'label_en' => 'Position', 'group' => 'employment'],
            ['key' => 'department', 'label' => 'دیپارتمنت', 'label_en' => 'Department', 'group' => 'employment'],
            ['key' => 'staff_type', 'label' => 'نوع کارمند', 'label_en' => 'Staff Type', 'group' => 'employment'],
            ['key' => 'employment_status', 'label' => 'حالت استخدام', 'label_en' => 'Employment Status', 'group' => 'employment'],
            ['key' => 'join_date', 'label' => 'تاریخ شمولیت', 'label_en' => 'Join Date', 'group' => 'employment'],
            ['key' => 'salary', 'label' => 'معاش', 'label_en' => 'Salary', 'group' => 'employment'],
            ['key' => 'contract_type', 'label' => 'نوع قرارداد', 'label_en' => 'Contract Type', 'group' => 'employment'],

            // Education
            ['key' => 'education_level', 'label' => 'سطح تحصیلات', 'label_en' => 'Education Level', 'group' => 'education'],
            ['key' => 'degree', 'label' => 'درجه تحصیلی', 'label_en' => 'Degree', 'group' => 'education'],
            ['key' => 'specialization', 'label' => 'تخصص', 'label_en' => 'Specialization', 'group' => 'education'],

            // Contact Info
            ['key' => 'phone', 'label' => 'تلیفون', 'label_en' => 'Phone', 'group' => 'contact'],
            ['key' => 'email', 'label' => 'ایمیل', 'label_en' => 'Email', 'group' => 'contact'],
            ['key' => 'address', 'label' => 'آدرس', 'label_en' => 'Address', 'group' => 'contact'],
            ['key' => 'province', 'label' => 'ولایت', 'label_en' => 'Province', 'group' => 'contact'],
            ['key' => 'district', 'label' => 'ولسوالی', 'label_en' => 'District', 'group' => 'contact'],
        ];
    }

    /**
     * Get applicant-specific fields
     *
     * @return array
     */
    private function getApplicantFields(): array
    {
        return [
            // Basic Info
            ['key' => 'applicant_name', 'label' => 'نام متقاضی', 'label_en' => 'Applicant Name', 'group' => 'basic'],
            ['key' => 'applicant_id', 'label' => 'آیدی متقاضی', 'label_en' => 'Applicant ID', 'group' => 'basic'],
            ['key' => 'father_name', 'label' => 'نام پدر', 'label_en' => 'Father Name', 'group' => 'basic'],
            ['key' => 'gender', 'label' => 'جنسیت', 'label_en' => 'Gender', 'group' => 'basic'],
            ['key' => 'date_of_birth', 'label' => 'تاریخ تولد', 'label_en' => 'Date of Birth', 'group' => 'basic'],
            ['key' => 'nationality', 'label' => 'ملیت', 'label_en' => 'Nationality', 'group' => 'basic'],
            ['key' => 'tazkira_number', 'label' => 'نمبر تذکره', 'label_en' => 'Tazkira Number', 'group' => 'basic'],

            // Application Info
            ['key' => 'application_number', 'label' => 'نمبر درخواست', 'label_en' => 'Application Number', 'group' => 'application'],
            ['key' => 'application_date', 'label' => 'تاریخ درخواست', 'label_en' => 'Application Date', 'group' => 'application'],
            ['key' => 'applied_for_class', 'label' => 'صنف درخواستی', 'label_en' => 'Applied For Class', 'group' => 'application'],
            ['key' => 'application_status', 'label' => 'حالت درخواست', 'label_en' => 'Application Status', 'group' => 'application'],
            ['key' => 'previous_school', 'label' => 'مکتب قبلی', 'label_en' => 'Previous School', 'group' => 'application'],
            ['key' => 'previous_grade', 'label' => 'نمره قبلی', 'label_en' => 'Previous Grade', 'group' => 'application'],

            // Contact Info
            ['key' => 'phone', 'label' => 'تلیفون', 'label_en' => 'Phone', 'group' => 'contact'],
            ['key' => 'email', 'label' => 'ایمیل', 'label_en' => 'Email', 'group' => 'contact'],
            ['key' => 'address', 'label' => 'آدرس', 'label_en' => 'Address', 'group' => 'contact'],
            ['key' => 'province', 'label' => 'ولایت', 'label_en' => 'Province', 'group' => 'contact'],

            // Guardian Info
            ['key' => 'guardian_name', 'label' => 'نام سرپرست', 'label_en' => 'Guardian Name', 'group' => 'guardian'],
            ['key' => 'guardian_phone', 'label' => 'تلیفون سرپرست', 'label_en' => 'Guardian Phone', 'group' => 'guardian'],
        ];
    }

    /**
     * Get general fields (for official letters, announcements, etc.)
     *
     * @return array
     */
    private function getGeneralFields(): array
    {
        return [
            // Organization/School Info
            ['key' => 'organization_name', 'label' => 'نام اداره', 'label_en' => 'Organization Name', 'group' => 'organization'],
            ['key' => 'school_name', 'label' => 'نام مکتب', 'label_en' => 'School Name', 'group' => 'organization'],
            ['key' => 'school_code', 'label' => 'کود مکتب', 'label_en' => 'School Code', 'group' => 'organization'],
            ['key' => 'school_address', 'label' => 'آدرس مکتب', 'label_en' => 'School Address', 'group' => 'organization'],
            ['key' => 'school_phone', 'label' => 'تلیفون مکتب', 'label_en' => 'School Phone', 'group' => 'organization'],
            ['key' => 'school_email', 'label' => 'ایمیل مکتب', 'label_en' => 'School Email', 'group' => 'organization'],

            // Document Info
            ['key' => 'document_number', 'label' => 'نمبر سند', 'label_en' => 'Document Number', 'group' => 'document'],
            ['key' => 'document_date', 'label' => 'تاریخ سند', 'label_en' => 'Document Date', 'group' => 'document'],
            ['key' => 'issue_date', 'label' => 'تاریخ صدور', 'label_en' => 'Issue Date', 'group' => 'document'],
            ['key' => 'subject', 'label' => 'موضوع', 'label_en' => 'Subject', 'group' => 'document'],

            // Recipient Info (for official letters)
            ['key' => 'recipient_name', 'label' => 'نام گیرنده', 'label_en' => 'Recipient Name', 'group' => 'recipient'],
            ['key' => 'recipient_organization', 'label' => 'اداره گیرنده', 'label_en' => 'Recipient Organization', 'group' => 'recipient'],
            ['key' => 'recipient_position', 'label' => 'موقف گیرنده', 'label_en' => 'Recipient Position', 'group' => 'recipient'],
            ['key' => 'recipient_address', 'label' => 'آدرس گیرنده', 'label_en' => 'Recipient Address', 'group' => 'recipient'],

            // Dates & Times
            ['key' => 'current_date', 'label' => 'تاریخ جاری', 'label_en' => 'Current Date', 'group' => 'datetime'],
            ['key' => 'current_year', 'label' => 'سال جاری', 'label_en' => 'Current Year', 'group' => 'datetime'],
            ['key' => 'hijri_date', 'label' => 'تاریخ هجری', 'label_en' => 'Hijri Date', 'group' => 'datetime'],
            ['key' => 'shamsi_date', 'label' => 'تاریخ شمسی', 'label_en' => 'Shamsi Date', 'group' => 'datetime'],

            // Custom Fields
            ['key' => 'custom_field_1', 'label' => 'فیلد اضافی ۱', 'label_en' => 'Custom Field 1', 'group' => 'custom'],
            ['key' => 'custom_field_2', 'label' => 'فیلد اضافی ۲', 'label_en' => 'Custom Field 2', 'group' => 'custom'],
            ['key' => 'custom_field_3', 'label' => 'فیلد اضافی ۳', 'label_en' => 'Custom Field 3', 'group' => 'custom'],
        ];
    }

    /**
     * Replace field placeholders with actual data
     *
     * @param string $text Text with placeholders like {{student_name}}
     * @param string $recipientType Type of recipient
     * @param string|null $recipientId ID of the recipient
     * @param array $customData Additional custom data to merge
     * @return string Text with placeholders replaced
     */
    public function replaceFieldsWithData(
        string $text,
        string $recipientType,
        ?string $recipientId = null,
        array $customData = []
    ): string {
        // Get data based on recipient type
        $data = $this->getRecipientData($recipientType, $recipientId);

        // Merge with custom data (custom data takes precedence)
        $data = array_merge($data, $customData);

        // Replace all placeholders
        foreach ($data as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $text = str_replace($placeholder, $value ?? '', $text);
        }

        return $text;
    }

    /**
     * Get actual data for a recipient
     *
     * @param string $recipientType
     * @param string|null $recipientId
     * @return array
     */
    private function getRecipientData(string $recipientType, ?string $recipientId): array
    {
        if (!$recipientId) {
            return $this->getGeneralData();
        }

        return match ($recipientType) {
            'student' => $this->getStudentData($recipientId),
            'staff' => $this->getStaffData($recipientId),
            'applicant' => $this->getApplicantData($recipientId),
            default => $this->getGeneralData(),
        };
    }

    /**
     * Get student data from database
     *
     * @param string $studentId
     * @return array
     */
    private function getStudentData(string $studentId): array
    {
        $student = Student::with(['class', 'academicYear', 'school', 'organization'])
            ->find($studentId);

        if (!$student) {
            return [];
        }

        return [
            'student_name' => $student->name,
            'student_id' => $student->id,
            'student_code' => $student->code,
            'father_name' => $student->father_name,
            'grandfather_name' => $student->grandfather_name,
            'mother_name' => $student->mother_name,
            'gender' => $student->gender,
            'date_of_birth' => $student->date_of_birth?->format('Y-m-d'),
            'place_of_birth' => $student->place_of_birth,
            'nationality' => $student->nationality,
            'tazkira_number' => $student->tazkira_number,
            'class_name' => $student->class->name ?? '',
            'grade' => $student->grade,
            'section' => $student->section,
            'roll_number' => $student->roll_number,
            'enrollment_date' => $student->enrollment_date?->format('Y-m-d'),
            'academic_year' => $student->academicYear->name ?? '',
            'shift' => $student->shift,
            'status' => $student->status,
            'phone' => $student->phone,
            'email' => $student->email,
            'address' => $student->address,
            'province' => $student->province,
            'district' => $student->district,
            'village' => $student->village,
            'guardian_name' => $student->guardian_name,
            'guardian_phone' => $student->guardian_phone,
            'guardian_relation' => $student->guardian_relation,
            'guardian_occupation' => $student->guardian_occupation,
        ];
    }

    /**
     * Get staff data from database
     *
     * @param string $staffId
     * @return array
     */
    private function getStaffData(string $staffId): array
    {
        $staff = Staff::with(['staffType', 'school', 'organization'])
            ->find($staffId);

        if (!$staff) {
            return [];
        }

        return [
            'staff_name' => $staff->name,
            'staff_id' => $staff->id,
            'staff_code' => $staff->code,
            'father_name' => $staff->father_name,
            'gender' => $staff->gender,
            'date_of_birth' => $staff->date_of_birth?->format('Y-m-d'),
            'nationality' => $staff->nationality,
            'tazkira_number' => $staff->tazkira_number,
            'position' => $staff->position,
            'department' => $staff->department,
            'staff_type' => $staff->staffType->name ?? '',
            'employment_status' => $staff->employment_status,
            'join_date' => $staff->join_date?->format('Y-m-d'),
            'salary' => $staff->salary,
            'contract_type' => $staff->contract_type,
            'education_level' => $staff->education_level,
            'degree' => $staff->degree,
            'specialization' => $staff->specialization,
            'phone' => $staff->phone,
            'email' => $staff->email,
            'address' => $staff->address,
            'province' => $staff->province,
            'district' => $staff->district,
        ];
    }

    /**
     * Get applicant data from database
     *
     * @param string $applicantId
     * @return array
     */
    private function getApplicantData(string $applicantId): array
    {
        $applicant = StudentAdmission::with(['appliedClass', 'school', 'organization'])
            ->find($applicantId);

        if (!$applicant) {
            return [];
        }

        return [
            'applicant_name' => $applicant->name,
            'applicant_id' => $applicant->id,
            'father_name' => $applicant->father_name,
            'gender' => $applicant->gender,
            'date_of_birth' => $applicant->date_of_birth?->format('Y-m-d'),
            'nationality' => $applicant->nationality,
            'tazkira_number' => $applicant->tazkira_number,
            'application_number' => $applicant->application_number,
            'application_date' => $applicant->created_at?->format('Y-m-d'),
            'applied_for_class' => $applicant->appliedClass->name ?? '',
            'application_status' => $applicant->status,
            'previous_school' => $applicant->previous_school,
            'previous_grade' => $applicant->previous_grade,
            'phone' => $applicant->phone,
            'email' => $applicant->email,
            'address' => $applicant->address,
            'province' => $applicant->province,
            'guardian_name' => $applicant->guardian_name,
            'guardian_phone' => $applicant->guardian_phone,
        ];
    }

    /**
     * Get general/organization data
     *
     * @return array
     */
    private function getGeneralData(): array
    {
        // Get current organization and school from context
        // This would be injected from the controller
        return [
            'current_date' => now()->format('Y-m-d'),
            'current_year' => now()->year,
            'hijri_date' => now()->format('Y-m-d'), // TODO: Implement Hijri calendar
            'shamsi_date' => now()->format('Y-m-d'), // TODO: Implement Shamsi calendar
        ];
    }

    /**
     * Get mock data for preview purposes
     *
     * @param string $recipientType
     * @return array
     */
    public function getMockData(string $recipientType): array
    {
        return match ($recipientType) {
            'student' => [
                'student_name' => 'احمد خان',
                'student_id' => '12345',
                'student_code' => 'STU-001',
                'father_name' => 'علی خان',
                'grandfather_name' => 'محمد خان',
                'gender' => 'ذکور',
                'date_of_birth' => '2010-01-15',
                'nationality' => 'افغان',
                'tazkira_number' => '12345-67890',
                'class_name' => 'دهم',
                'grade' => '85',
                'section' => 'الف',
                'roll_number' => '15',
                'enrollment_date' => '2025-01-01',
                'academic_year' => '1404',
                'phone' => '0700123456',
                'address' => 'کابل، افغانستان',
            ],
            'staff' => [
                'staff_name' => 'محمد رحیم',
                'staff_id' => '54321',
                'staff_code' => 'STF-001',
                'father_name' => 'کریم الله',
                'gender' => 'ذکور',
                'position' => 'استاد',
                'department' => 'ریاضیات',
                'join_date' => '2020-03-15',
                'phone' => '0700654321',
                'email' => 'teacher@school.af',
            ],
            'applicant' => [
                'applicant_name' => 'فاطمه احمدی',
                'applicant_id' => '98765',
                'father_name' => 'احمد علی',
                'application_number' => 'APP-2025-001',
                'application_date' => '2025-12-15',
                'applied_for_class' => 'نهم',
                'phone' => '0700987654',
            ],
            default => [
                'organization_name' => 'وزارت معارف',
                'school_name' => 'لیسه حبیبیه',
                'document_number' => 'OUT/2025/00156',
                'document_date' => now()->format('Y-m-d'),
                'current_date' => now()->format('Y-m-d'),
            ],
        };
    }
}
