<?php

namespace App\Services\Reports;

/**
 * Builds multi-sheet Excel data for student lifetime history exports.
 */
class StudentHistoryExcelSheets
{
    /**
     * @param  array<string, mixed>  $student  CamelCase student payload from StudentHistoryService
     * @param  array<string, mixed>  $summary
     * @param  array<string, mixed>  $sections
     * @param  array<string, string>  $labels
     * @return array<string, array<string, mixed>>
     */
    public static function build(array $student, array $summary, array $sections, array $labels): array
    {
        $yes = $labels['yes'] ?? 'Yes';
        $no = $labels['no'] ?? 'No';

        return [
            'overview' => [
                'sheet_name' => $labels['overviewSheet'] ?? 'Overview',
                'title' => $labels['overviewTitle'] ?? 'Student Overview',
                'columns' => [
                    ['key' => 'field', 'label' => $labels['field'] ?? 'Field'],
                    ['key' => 'value', 'label' => $labels['value'] ?? 'Value'],
                ],
                'rows' => [
                    ['field' => $labels['fullName'] ?? 'Full Name', 'value' => $student['fullName'] ?? ''],
                    ['field' => $labels['firstName'] ?? 'First Name', 'value' => $student['firstName'] ?? ''],
                    ['field' => $labels['lastName'] ?? 'Last Name', 'value' => $student['lastName'] ?? ''],
                    ['field' => $labels['fatherName'] ?? 'Father Name', 'value' => $student['fatherName'] ?? ''],
                    ['field' => $labels['grandfatherName'] ?? 'Grandfather Name', 'value' => $student['grandfatherName'] ?? ''],
                    ['field' => $labels['motherName'] ?? 'Mother Name', 'value' => $student['motherName'] ?? ''],
                    ['field' => $labels['gender'] ?? 'Gender', 'value' => $student['gender'] ?? ''],
                    ['field' => $labels['dob'] ?? 'Date of Birth', 'value' => $student['dateOfBirth'] ?? ''],
                    ['field' => $labels['birthYear'] ?? 'Birth Year', 'value' => (string) ($student['birthYear'] ?? '')],
                    ['field' => $labels['age'] ?? 'Age', 'value' => (string) ($student['age'] ?? '')],
                    ['field' => $labels['nationality'] ?? 'Nationality', 'value' => $student['nationality'] ?? ''],
                    ['field' => $labels['preferredLanguage'] ?? 'Preferred Language', 'value' => $student['preferredLanguage'] ?? ''],
                    ['field' => $labels['isOrphan'] ?? 'Is Orphan', 'value' => ($student['isOrphan'] ?? false) ? $yes : $no],
                    ['field' => $labels['phone'] ?? 'Phone', 'value' => $student['phone'] ?? ''],
                    ['field' => $labels['homeAddress'] ?? 'Home Address', 'value' => $student['homeAddress'] ?? ''],
                    ['field' => $labels['emergencyContactName'] ?? 'Emergency Contact Name', 'value' => $student['emergencyContactName'] ?? ''],
                    ['field' => $labels['emergencyContactPhone'] ?? 'Emergency Contact Phone', 'value' => $student['emergencyContactPhone'] ?? ''],
                    ['field' => $labels['originProvince'] ?? 'Origin Province', 'value' => $student['origProvince'] ?? ''],
                    ['field' => $labels['originDistrict'] ?? 'Origin District', 'value' => $student['origDistrict'] ?? ''],
                    ['field' => $labels['originVillage'] ?? 'Origin Village', 'value' => $student['origVillage'] ?? ''],
                    ['field' => $labels['currentProvince'] ?? 'Current Province', 'value' => $student['currProvince'] ?? ''],
                    ['field' => $labels['currentDistrict'] ?? 'Current District', 'value' => $student['currDistrict'] ?? ''],
                    ['field' => $labels['currentVillage'] ?? 'Current Village', 'value' => $student['currVillage'] ?? ''],
                    ['field' => $labels['guardianName'] ?? 'Guardian Name', 'value' => $student['guardianName'] ?? ''],
                    ['field' => $labels['guardianRelation'] ?? 'Relation', 'value' => $student['guardianRelation'] ?? ''],
                    ['field' => $labels['guardianPhone'] ?? 'Guardian Phone', 'value' => $student['guardianPhone'] ?? ''],
                    ['field' => $labels['guardianTazkira'] ?? 'Guardian Tazkira', 'value' => $student['guardianTazkira'] ?? ''],
                    ['field' => $labels['guarantorName'] ?? 'Guarantor Name', 'value' => $student['zaminName'] ?? ''],
                    ['field' => $labels['guarantorPhone'] ?? 'Guarantor Phone', 'value' => $student['zaminPhone'] ?? ''],
                    ['field' => $labels['guarantorTazkira'] ?? 'Guarantor Tazkira', 'value' => $student['zaminTazkira'] ?? ''],
                    ['field' => $labels['guarantorAddress'] ?? 'Guarantor Address', 'value' => $student['zaminAddress'] ?? ''],
                    ['field' => $labels['admissionNo'] ?? 'Admission Number', 'value' => $student['admissionNumber'] ?? ''],
                    ['field' => $labels['admissionYear'] ?? 'Admission Year', 'value' => (string) ($student['admissionYear'] ?? '')],
                    ['field' => $labels['applyingGrade'] ?? 'Applying Grade', 'value' => $student['applyingGrade'] ?? ''],
                    ['field' => $labels['admissionFeeStatus'] ?? 'Admission Fee Status', 'value' => $student['admissionFeeStatus'] ?? ''],
                    ['field' => $labels['familyIncome'] ?? 'Family Income', 'value' => (string) ($student['familyIncome'] ?? '')],
                    ['field' => $labels['status'] ?? 'Status', 'value' => $student['status'] ?? ''],
                    ['field' => $labels['studentCode'] ?? 'Student Code', 'value' => $student['studentCode'] ?? ''],
                    ['field' => $labels['cardNumber'] ?? 'Card Number', 'value' => $student['cardNumber'] ?? ''],
                    ['field' => $labels['schoolName'] ?? 'School Name', 'value' => $student['schoolName'] ?? ''],
                    ['field' => $labels['organizationName'] ?? 'Organization Name', 'value' => $student['organizationName'] ?? ''],
                    ['field' => $labels['previousSchool'] ?? 'Previous School', 'value' => $student['previousSchool'] ?? ''],
                    ['field' => $labels['createdAt'] ?? 'Created At', 'value' => $student['createdAt'] ?? ''],
                    ['field' => $labels['totalAcademicYears'] ?? 'Total Academic Years', 'value' => (string) ($summary['totalAcademicYears'] ?? 0)],
                    ['field' => $labels['attendanceRate'] ?? 'Attendance Rate', 'value' => ($summary['attendanceRate'] ?? 0).'%'],
                    ['field' => $labels['averageExamScore'] ?? 'Average Exam Score', 'value' => ($summary['averageExamScore'] ?? 0).'%'],
                    ['field' => $labels['outstandingFees'] ?? 'Outstanding Fees', 'value' => (string) ($summary['outstandingFees'] ?? 0)],
                ],
            ],
            'admissions' => [
                'sheet_name' => $labels['admissionsSheet'] ?? 'Admissions',
                'title' => $labels['admissionsTitle'] ?? 'Admission History',
                'columns' => [
                    ['key' => 'admissionDate', 'label' => $labels['admissionDate'] ?? 'Admission Date'],
                    ['key' => 'class', 'label' => $labels['class'] ?? 'Class'],
                    ['key' => 'academicYear', 'label' => $labels['academicYear'] ?? 'Academic Year'],
                    ['key' => 'status', 'label' => $labels['status'] ?? 'Status'],
                ],
                'rows' => array_map(function ($admission) {
                    return [
                        'admissionDate' => isset($admission['admissionDate']) && $admission['admissionDate'] ? \Carbon\Carbon::parse($admission['admissionDate'])->format('Y-m-d') : '',
                        'class' => $admission['class']['name'] ?? '',
                        'academicYear' => $admission['academicYear']['name'] ?? '',
                        'status' => $admission['enrollmentStatus'] ?? '',
                    ];
                }, $sections['admissions'] ?? []),
            ],
            'exams' => [
                'sheet_name' => $labels['examsSheet'] ?? 'Exams',
                'title' => $labels['examResultsTitle'] ?? 'Exam Results',
                'columns' => [
                    ['key' => 'examName', 'label' => $labels['examName'] ?? 'Exam Name'],
                    ['key' => 'className', 'label' => $labels['class'] ?? 'Class'],
                    ['key' => 'totalMarks', 'label' => $labels['obtainedMarks'] ?? 'Marks Obtained'],
                    ['key' => 'maxMarks', 'label' => $labels['maxMarks'] ?? 'Max Marks'],
                    ['key' => 'percentage', 'label' => $labels['percentage'] ?? 'Percentage'],
                ],
                'rows' => array_map(function ($exam) {
                    return [
                        'examName' => $exam['examName'] ?? '',
                        'className' => $exam['className'] ?? '',
                        'totalMarks' => (string) ($exam['totalMarks'] ?? 0),
                        'maxMarks' => (string) ($exam['maxMarks'] ?? 0),
                        'percentage' => ($exam['percentage'] ?? 0).'%',
                    ];
                }, $sections['exams']['exams'] ?? []),
            ],
            'fees' => [
                'sheet_name' => $labels['feesSheet'] ?? 'Fees',
                'title' => $labels['feesTitle'] ?? 'Fee History',
                'columns' => [
                    ['key' => 'feeStructure', 'label' => $labels['feeStructure'] ?? 'Fee Structure'],
                    ['key' => 'academicYear', 'label' => $labels['academicYear'] ?? 'Academic Year'],
                    ['key' => 'assignedAmount', 'label' => $labels['assigned'] ?? 'Assigned'],
                    ['key' => 'paidAmount', 'label' => $labels['paid'] ?? 'Paid'],
                    ['key' => 'remainingAmount', 'label' => $labels['remaining'] ?? 'Remaining'],
                    ['key' => 'status', 'label' => $labels['status'] ?? 'Status'],
                ],
                'rows' => array_map(function ($assignment) {
                    return [
                        'feeStructure' => $assignment['feeStructure']['name'] ?? '',
                        'academicYear' => $assignment['academicYear']['name'] ?? '',
                        'assignedAmount' => (string) ($assignment['assignedAmount'] ?? 0),
                        'paidAmount' => (string) ($assignment['paidAmount'] ?? 0),
                        'remainingAmount' => (string) ($assignment['remainingAmount'] ?? 0),
                        'status' => $assignment['status'] ?? '',
                    ];
                }, $sections['fees']['assignments'] ?? []),
            ],
            'library' => [
                'sheet_name' => $labels['librarySheet'] ?? 'Library',
                'title' => $labels['libraryTitle'] ?? 'Library Loans',
                'columns' => [
                    ['key' => 'bookTitle', 'label' => $labels['bookTitle'] ?? 'Book Title'],
                    ['key' => 'author', 'label' => $labels['author'] ?? 'Author'],
                    ['key' => 'accessionNumber', 'label' => $labels['accessionNumber'] ?? 'Accession #'],
                    ['key' => 'loanDate', 'label' => $labels['loanDate'] ?? 'Loan Date'],
                    ['key' => 'dueDate', 'label' => $labels['dueDate'] ?? 'Due Date'],
                    ['key' => 'returnedAt', 'label' => $labels['returned'] ?? 'Returned'],
                    ['key' => 'status', 'label' => $labels['status'] ?? 'Status'],
                ],
                'rows' => array_map(function ($loan) {
                    return [
                        'bookTitle' => $loan['book']['title'] ?? '',
                        'author' => $loan['book']['author'] ?? '',
                        'accessionNumber' => $loan['book']['accessionNumber'] ?? '',
                        'loanDate' => isset($loan['loanDate']) && $loan['loanDate'] ? \Carbon\Carbon::parse($loan['loanDate'])->format('Y-m-d') : '',
                        'dueDate' => isset($loan['dueDate']) && $loan['dueDate'] ? \Carbon\Carbon::parse($loan['dueDate'])->format('Y-m-d') : '',
                        'returnedAt' => isset($loan['returnedAt']) && $loan['returnedAt'] ? \Carbon\Carbon::parse($loan['returnedAt'])->format('Y-m-d') : '',
                        'status' => $loan['status'] ?? '',
                    ];
                }, $sections['library']['loans'] ?? []),
            ],
            'attendance' => [
                'sheet_name' => $labels['attendanceSheet'] ?? 'Attendance',
                'title' => $labels['attendanceTitle'] ?? 'Attendance Summary',
                'columns' => [
                    ['key' => 'month', 'label' => $labels['month'] ?? 'Month'],
                    ['key' => 'present', 'label' => $labels['present'] ?? 'Present'],
                    ['key' => 'absent', 'label' => $labels['absent'] ?? 'Absent'],
                    ['key' => 'late', 'label' => $labels['late'] ?? 'Late'],
                    ['key' => 'rate', 'label' => $labels['rate'] ?? 'Rate (%)'],
                ],
                'rows' => array_map(function ($item) {
                    return [
                        'month' => $item['month'] ?? '',
                        'present' => (string) ($item['present'] ?? 0),
                        'absent' => (string) ($item['absent'] ?? 0),
                        'late' => (string) ($item['late'] ?? 0),
                        'rate' => round($item['rate'] ?? 0, 2).'%',
                    ];
                }, $sections['attendance']['monthlyBreakdown'] ?? []),
            ],
            'id_cards' => [
                'sheet_name' => $labels['idCardsSheet'] ?? 'ID Cards',
                'title' => $labels['idCardsTitle'] ?? 'ID Card History',
                'columns' => [
                    ['key' => 'cardNumber', 'label' => $labels['cardNumber'] ?? 'Card Number'],
                    ['key' => 'template', 'label' => $labels['template'] ?? 'Template'],
                    ['key' => 'academicYear', 'label' => $labels['academicYear'] ?? 'Academic Year'],
                    ['key' => 'class', 'label' => $labels['class'] ?? 'Class'],
                    ['key' => 'issueDate', 'label' => $labels['issueDate'] ?? 'Issue Date'],
                    ['key' => 'isPrinted', 'label' => $labels['printed'] ?? 'Printed'],
                    ['key' => 'feePaid', 'label' => $labels['feePaid'] ?? 'Fee Paid'],
                ],
                'rows' => array_map(function ($card) use ($yes, $no) {
                    return [
                        'cardNumber' => $card['cardNumber'] ?? '',
                        'template' => $card['template']['name'] ?? '',
                        'academicYear' => $card['academicYear']['name'] ?? '',
                        'class' => $card['class']['name'] ?? '',
                        'issueDate' => isset($card['createdAt']) && $card['createdAt'] ? \Carbon\Carbon::parse($card['createdAt'])->format('Y-m-d') : '',
                        'isPrinted' => ($card['isPrinted'] ?? false) ? $yes : $no,
                        'feePaid' => ($card['cardFeePaid'] ?? false) ? $yes : $no,
                    ];
                }, $sections['idCards']['cards'] ?? []),
            ],
            'courses' => [
                'sheet_name' => $labels['coursesSheet'] ?? 'Courses',
                'title' => $labels['shortTermCourses'] ?? 'Short-Term Courses',
                'columns' => [
                    ['key' => 'courseName', 'label' => $labels['courseName'] ?? 'Course Name'],
                    ['key' => 'registrationDate', 'label' => $labels['registrationDate'] ?? 'Registration Date'],
                    ['key' => 'completionDate', 'label' => $labels['completionDate'] ?? 'Completion Date'],
                    ['key' => 'completionStatus', 'label' => $labels['status'] ?? 'Status'],
                    ['key' => 'grade', 'label' => $labels['grade'] ?? 'Grade'],
                    ['key' => 'certificateIssued', 'label' => $labels['certificateIssued'] ?? 'Certificate Issued'],
                ],
                'rows' => array_map(function ($course) use ($yes, $no) {
                    return [
                        'courseName' => $course['course']['name'] ?? '',
                        'registrationDate' => isset($course['registrationDate']) && $course['registrationDate'] ? \Carbon\Carbon::parse($course['registrationDate'])->format('Y-m-d') : '',
                        'completionDate' => isset($course['completionDate']) && $course['completionDate'] ? \Carbon\Carbon::parse($course['completionDate'])->format('Y-m-d') : '',
                        'completionStatus' => $course['completionStatus'] ?? '',
                        'grade' => $course['grade'] ?? '',
                        'certificateIssued' => ! empty($course['certificateIssued']) ? $yes : $no,
                    ];
                }, $sections['courses'] ?? []),
            ],
            'graduations' => [
                'sheet_name' => $labels['graduationsSheet'] ?? 'Graduations',
                'title' => $labels['graduationRecords'] ?? 'Graduation Records',
                'columns' => [
                    ['key' => 'batchName', 'label' => $labels['batchName'] ?? 'Batch Name'],
                    ['key' => 'graduationDate', 'label' => $labels['graduationDate'] ?? 'Graduation Date'],
                    ['key' => 'finalResult', 'label' => $labels['finalResult'] ?? 'Final Result'],
                    ['key' => 'certificateNumber', 'label' => $labels['certificateNumber'] ?? 'Certificate #'],
                ],
                'rows' => array_map(function ($graduation) {
                    return [
                        'batchName' => $graduation['batch']['name'] ?? '',
                        'graduationDate' => isset($graduation['createdAt']) && $graduation['createdAt'] ? \Carbon\Carbon::parse($graduation['createdAt'])->format('Y-m-d') : '',
                        'finalResult' => $graduation['finalResultStatus'] ?? '',
                        'certificateNumber' => $graduation['certificateNumber'] ?? '',
                    ];
                }, $sections['graduations'] ?? []),
            ],
        ];
    }
}
