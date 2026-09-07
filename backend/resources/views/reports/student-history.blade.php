@extends('reports.base')

@section('content')
@php
    $labels = $labels ?? [];
    $L = fn (string $key, string $fallback = '') => $labels[$key] ?? $fallback;
    $dash = '—';
    $primary = $PRIMARY_COLOR ?? '#0b0b56';
    $secondary = $SECONDARY_COLOR ?? '#0056b3';

    $rawGeneratedAt = $generatedAt ?? null;
    $generatedAtDisplay = $rawGeneratedAt
        ? \Carbon\Carbon::parse($rawGeneratedAt)->format('Y-m-d H:i')
        : now()->format('Y-m-d H:i');

    $rawCreatedAt = $student['created_at'] ?? ($student['createdAt'] ?? null);
    $createdAtDisplay = $rawCreatedAt ? \Carbon\Carbon::parse($rawCreatedAt)->format('Y-m-d H:i') : $dash;

    $phoneDisplay = $student['guardian_phone'] ?? ($student['phone'] ?? $dash);
    $isOrphan = (bool) ($student['is_orphan'] ?? ($student['isOrphan'] ?? false));
    $statusRaw = strtolower((string) ($student['status'] ?? 'unknown'));
    $classLine = trim(implode(' ', array_filter([
        $student['current_class'] ?? null,
        !empty($student['current_section']) ? '(' . $student['current_section'] . ')' : null,
        !empty($student['current_academic_year']) ? '- ' . $student['current_academic_year'] : null,
    ]))) ?: $dash;
@endphp

@if(!empty($WATERMARK))
<div class="watermark">
    @if(!empty($WATERMARK['text']))
        <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
    @elseif(!empty($WATERMARK['image_url']))
        <img src="{{ $WATERMARK['image_url'] }}" class="watermark-image" alt="Watermark">
    @endif
</div>
@endif

{{-- Branding header --}}
<div class="report-header">
    <div class="header-left">
        @if(!empty($PRIMARY_LOGO))
            <img src="{{ $PRIMARY_LOGO }}" alt="Logo" class="header-logo">
        @endif
    </div>
    <div class="header-center">
        <div class="school-name">{{ $SCHOOL_NAME ?? '' }}</div>
        <div class="report-title">{{ $TABLE_TITLE ?? $L('reportTitle', 'Student Lifetime History') }}</div>
        @if(!empty($HEADER_TEXT))
            <div class="header-text">{!! $HEADER_TEXT !!}</div>
        @endif
    </div>
    <div class="header-right">
        @if(!empty($SECONDARY_LOGO))
            <img src="{{ $SECONDARY_LOGO }}" alt="Secondary Logo" class="header-logo">
        @endif
    </div>
</div>

@if(!empty($header_notes))
<div class="notes-section header-notes">
    @foreach($header_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

{{-- Hero profile card --}}
<div class="sh-card sh-hero">
    <div class="sh-hero-accent"></div>
    <div class="sh-hero-body">
        <div class="sh-photo-wrap">
            @if(!empty($student['picture_path']))
                <img src="{{ $student['picture_path'] }}" alt="Student Photo" class="sh-photo">
            @else
                <div class="sh-photo sh-photo-fallback">
                    <span>{{ mb_substr($student['full_name'] ?? 'S', 0, 1) }}</span>
                </div>
            @endif
        </div>
        <div class="sh-hero-main">
            <div class="sh-hero-name">{{ $student['full_name'] ?? $dash }}</div>
            <div class="sh-hero-meta">
                <span>{{ $L('admissionNo', 'Admission No') }}: <strong class="ltr">{{ $student['admission_no'] ?? $dash }}</strong></span>
                <span>{{ $L('currentClass', 'Current Class') }}: <strong>{{ $classLine }}</strong></span>
                <span>{{ $L('generatedAt', 'Generated At') }}: <strong class="ltr">{{ $generatedAtDisplay }}</strong></span>
            </div>
            <div class="sh-hero-badges">
                <span class="sh-badge status-{{ $statusRaw }}">{{ $student['status'] ?? $dash }}</span>
                @if($isOrphan)
                    <span class="sh-badge sh-badge-orphan">{{ $L('isOrphan', 'Orphan') }}</span>
                @endif
            </div>
        </div>
    </div>
</div>

{{-- Summary metrics --}}
@if(!empty($summary))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('summary', 'Summary') }}</div>
    <div class="sh-metrics">
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ $summary['academic_years'] ?? 0 }}</div>
            <div class="sh-metric-label">{{ $L('academicYears', 'Academic Years') }}</div>
        </div>
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ $summary['attendance_rate'] ?? 0 }}%</div>
            <div class="sh-metric-label">{{ $L('attendanceRate', 'Attendance Rate') }}</div>
        </div>
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ $summary['exam_average'] ?? 0 }}%</div>
            <div class="sh-metric-label">{{ $L('examAverage', 'Exam Average') }}</div>
        </div>
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ number_format($summary['total_fees_paid'] ?? 0, 0) }}</div>
            <div class="sh-metric-label">{{ $L('totalFeesPaid', 'Fees Paid') }}</div>
        </div>
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ $summary['library_loans'] ?? 0 }}</div>
            <div class="sh-metric-label">{{ $L('libraryLoans', 'Library Loans') }}</div>
        </div>
        <div class="sh-metric">
            <div class="sh-metric-value ltr">{{ $summary['courses_completed'] ?? 0 }}</div>
            <div class="sh-metric-label">{{ $L('coursesCompleted', 'Courses Completed') }}</div>
        </div>
    </div>
</div>
@endif

@php
    $fieldPairs = function (array $pairs) use ($dash) {
        $rows = [];
        for ($i = 0; $i < count($pairs); $i += 2) {
            $rows[] = [$pairs[$i], $pairs[$i + 1] ?? [null, null]];
        }
        return $rows;
    };

    $personalPairs = $fieldPairs([
        [$L('fullName', 'Full Name'), $student['full_name'] ?? $dash],
        [$L('admissionNo', 'Admission No'), $student['admission_no'] ?? $dash],
        [$L('firstName', 'First Name'), $student['first_name'] ?? $dash],
        [$L('lastName', 'Last Name'), $student['last_name'] ?? $dash],
        [$L('fatherName', 'Father Name'), $student['father_name'] ?? $dash],
        [$L('grandfatherName', 'Grandfather Name'), $student['grandfather_name'] ?? $dash],
        [$L('motherName', 'Mother Name'), $student['mother_name'] ?? $dash],
        [$L('gender', 'Gender'), $student['gender'] ?? $dash],
        [$L('dob', 'Date of Birth'), $student['birth_date'] ?? $dash],
        [$L('birthYear', 'Birth Year'), $student['birth_year'] ?? $dash],
        [$L('age', 'Age'), $student['age'] ?? $dash],
        [$L('isOrphan', 'Is Orphan'), $isOrphan ? $L('yes', 'Yes') : $L('no', 'No')],
        [$L('nationality', 'Nationality'), $student['nationality'] ?? $dash],
        [$L('preferredLanguage', 'Preferred Language'), $student['preferred_language'] ?? $dash],
    ]);

    $contactPairs = $fieldPairs([
        [$L('phone', 'Phone'), $student['phone'] ?? $dash],
        [$L('homeAddress', 'Home Address'), $student['home_address'] ?? $dash],
        [$L('emergencyContactName', 'Emergency Contact Name'), $student['emergency_contact_name'] ?? $dash],
        [$L('emergencyContactPhone', 'Emergency Contact Phone'), $student['emergency_contact_phone'] ?? $dash],
    ]);

    $locationPairs = $fieldPairs([
        [$L('originProvince', 'Origin Province'), $student['orig_province'] ?? $dash],
        [$L('originDistrict', 'Origin District'), $student['orig_district'] ?? $dash],
        [$L('originVillage', 'Origin Village'), $student['orig_village'] ?? $dash],
        [$L('currentProvince', 'Current Province'), $student['curr_province'] ?? $dash],
        [$L('currentDistrict', 'Current District'), $student['curr_district'] ?? $dash],
        [$L('currentVillage', 'Current Village'), $student['curr_village'] ?? $dash],
    ]);

    $guardianPairs = $fieldPairs([
        [$L('guardianName', 'Guardian'), $student['guardian_name'] ?? $dash],
        [$L('guardianRelation', 'Relation'), $student['guardian_relation'] ?? $dash],
        [$L('guardianPhone', 'Guardian Phone'), $student['guardian_phone'] ?? $dash],
        [$L('guardianTazkira', 'Guardian Tazkira'), $student['guardian_tazkira'] ?? $dash],
    ]);

    $guarantorPairs = $fieldPairs([
        [$L('guarantorName', 'Guarantor Name'), $student['zamin_name'] ?? $dash],
        [$L('guarantorPhone', 'Guarantor Phone'), $student['zamin_phone'] ?? $dash],
        [$L('guarantorTazkira', 'Guarantor Tazkira'), $student['zamin_tazkira'] ?? $dash],
        [$L('guarantorAddress', 'Guarantor Address'), $student['zamin_address'] ?? $dash],
    ]);

    $academicPairs = $fieldPairs([
        [$L('currentClass', 'Current Class'), $classLine],
        [$L('currentAcademicYear', 'Academic Year'), $student['current_academic_year'] ?? $dash],
        [$L('admissionYear', 'Admission Year'), $student['admission_year'] ?? $dash],
        [$L('applyingGrade', 'Applying Grade'), $student['applying_grade'] ?? $dash],
        [$L('previousSchool', 'Previous School'), $student['previous_school'] ?? $dash],
        [$L('studentCode', 'Student Code'), $student['student_code'] ?? $dash],
    ]);

    $financialPairs = $fieldPairs([
        [$L('admissionFeeStatus', 'Admission Fee Status'), $student['admission_fee_status'] ?? $dash],
        [$L('familyIncome', 'Family Income'), $student['family_income'] ?? $dash],
        [$L('cardNumber', 'Card Number'), $student['card_number'] ?? $dash],
        [$L('status', 'Status'), $student['status'] ?? $dash],
    ]);

    $systemPairs = $fieldPairs([
        [$L('school', 'School'), $student['school_name'] ?? $dash],
        [$L('organization', 'Organization'), $student['organization_name'] ?? $dash],
        [$L('createdAt', 'Created At'), $createdAtDisplay],
        [$L('generatedAt', 'Generated At'), $generatedAtDisplay],
    ]);
@endphp

@foreach([
    ['title' => $L('personalInfo', 'Personal Information'), 'rows' => $personalPairs],
    ['title' => $L('contactInfo', 'Contact Information'), 'rows' => $contactPairs],
    ['title' => $L('locationInfo', 'Location Information'), 'rows' => $locationPairs],
    ['title' => $L('guardianInfo', 'Guardian Information'), 'rows' => $guardianPairs],
    ['title' => $L('guarantorInfo', 'Guarantor Information'), 'rows' => $guarantorPairs],
    ['title' => $L('academicInfo', 'Academic Information'), 'rows' => $academicPairs],
    ['title' => $L('financialInfo', 'Financial Information'), 'rows' => $financialPairs],
    ['title' => $L('systemInfo', 'System Information'), 'rows' => $systemPairs],
] as $sectionCard)
<div class="sh-card">
    <div class="sh-card-title">{{ $sectionCard['title'] }}</div>
    <table class="sh-fields">
        @foreach($sectionCard['rows'] as $row)
            <tr>
                @foreach($row as $cell)
                    @if($cell)
                        <td class="sh-field-label">{{ $cell[0] }}</td>
                        <td class="sh-field-value">{{ $cell[1] !== null && $cell[1] !== '' ? $cell[1] : $dash }}</td>
                    @endif
                @endforeach
            </tr>
        @endforeach
    </table>
</div>
@endforeach

@if(!empty($body_notes))
<div class="notes-section body-notes">
    @foreach($body_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

{{-- Admissions --}}
@if(!empty($sections['admissions']))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('admissionsTitle', 'Admissions History') }}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('academicYear', 'Academic Year') }}</th>
                <th>{{ $L('class', 'Class') }}</th>
                <th>{{ $L('admissionDate', 'Admission Date') }}</th>
                <th>{{ $L('enrollmentStatus', 'Status') }}</th>
                <th>{{ $L('enrollmentType', 'Type') }}</th>
                <th>{{ $L('residencyType', 'Residency') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['admissions'] as $index => $admission)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $admission['academic_year'] ?? $dash }}</td>
                <td>{{ $admission['class'] ?? $dash }}</td>
                <td class="ltr">{{ $admission['admission_date'] ?? $dash }}</td>
                <td>{{ $admission['enrollment_status'] ?? $dash }}</td>
                <td>{{ $admission['enrollment_type'] ?? $dash }}</td>
                <td>{{ $admission['residency_type'] ?? $dash }}</td>
            </tr>
            @empty
            <tr><td colspan="7" class="empty-row">{{ $L('noAdmissions', 'No admission records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Attendance --}}
@if(!empty($sections['attendance']))
@php
    $attSummary = $sections['attendance']['summary'] ?? [];
    $attMonths = $sections['attendance']['monthly_breakdown'] ?? [];
@endphp
<div class="sh-card">
    <div class="sh-card-title">{{ $L('attendanceTitle', 'Attendance') }}</div>
    <table class="data-table" style="margin-bottom: 8px;">
        <thead>
            <tr>
                <th>{{ $L('totalDays', 'Total Days') }}</th>
                <th>{{ $L('present', 'Present') }}</th>
                <th>{{ $L('absent', 'Absent') }}</th>
                <th>{{ $L('late', 'Late') }}</th>
                <th>{{ $L('rate', 'Rate (%)') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="ltr">{{ $attSummary['total_days'] ?? 0 }}</td>
                <td class="present-cell ltr">{{ $attSummary['present'] ?? 0 }}</td>
                <td class="absent-cell ltr">{{ $attSummary['absent'] ?? 0 }}</td>
                <td class="late-cell ltr">{{ $attSummary['late'] ?? 0 }}</td>
                <td class="ltr">{{ $attSummary['rate'] ?? 0 }}%</td>
            </tr>
        </tbody>
    </table>
    @if(!empty($attMonths))
    <table class="data-table">
        <thead>
            <tr>
                <th>{{ $L('month', 'Month') }}</th>
                <th>{{ $L('present', 'Present') }}</th>
                <th>{{ $L('absent', 'Absent') }}</th>
                <th>{{ $L('late', 'Late') }}</th>
                <th>{{ $L('rate', 'Rate (%)') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach($attMonths as $m)
            <tr>
                <td>{{ $m['month'] ?? $dash }}</td>
                <td class="present-cell ltr">{{ $m['present'] ?? 0 }}</td>
                <td class="absent-cell ltr">{{ $m['absent'] ?? 0 }}</td>
                <td class="late-cell ltr">{{ $m['late'] ?? 0 }}</td>
                <td class="ltr">{{ $m['rate'] ?? 0 }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @else
        <div class="empty-row">{{ $L('noAttendance', 'No attendance records found') }}</div>
    @endif
</div>
@endif

{{-- Exams --}}
@if(!empty($sections['exams']))
@php
    $examsSummary = $sections['exams']['summary'] ?? [];
    $examRows = $sections['exams']['exams'] ?? [];
@endphp
<div class="sh-card">
    <div class="sh-card-title">{{ $L('examsTitle', 'Exam History') }}</div>
    <table class="data-table" style="margin-bottom: 8px;">
        <thead>
            <tr>
                <th>{{ $L('totalExams', 'Total Exams') }}</th>
                <th>{{ $L('averagePercentage', 'Average %') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="ltr">{{ $examsSummary['total_exams'] ?? 0 }}</td>
                <td class="ltr">{{ $examsSummary['average_percentage'] ?? 0 }}%</td>
            </tr>
        </tbody>
    </table>
    @forelse($examRows as $idx => $exam)
        <div class="sh-subcard">
            <div class="sh-subcard-title">
                {{ ((int)$idx + 1) }}. {{ $exam['exam_name'] ?? $dash }}
                @if(!empty($exam['class_name'])) — {{ $exam['class_name'] }} @endif
                @if(!empty($exam['exam_date'])) <span class="ltr">({{ $exam['exam_date'] }})</span> @endif
            </div>
            <table class="data-table" style="margin-bottom: 6px;">
                <thead>
                    <tr>
                        <th>{{ $L('totalMarks', 'Total') }}</th>
                        <th>{{ $L('maxMarks', 'Max') }}</th>
                        <th>{{ $L('percentage', '%') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="ltr">{{ $exam['total_marks'] ?? 0 }}</td>
                        <td class="ltr">{{ $exam['max_marks'] ?? 0 }}</td>
                        <td class="ltr">{{ $exam['percentage'] ?? 0 }}%</td>
                    </tr>
                </tbody>
            </table>
            @if(!empty($exam['subject_results']))
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>{{ $L('subject', 'Subject') }}</th>
                        <th>{{ $L('obtainedMarks', 'Obtained') }}</th>
                        <th>{{ $L('maxMarks', 'Max') }}</th>
                        <th>{{ $L('percentage', '%') }}</th>
                        <th>{{ $L('absent', 'Absent') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($exam['subject_results'] as $sIdx => $sr)
                    <tr>
                        <td class="row-number">{{ (int)$sIdx + 1 }}</td>
                        <td>{{ $sr['subject_name'] ?? $dash }}</td>
                        <td class="ltr">{{ $sr['marks_obtained'] ?? 0 }}</td>
                        <td class="ltr">{{ $sr['max_marks'] ?? 0 }}</td>
                        <td class="ltr">{{ $sr['percentage'] ?? 0 }}%</td>
                        <td>{{ !empty($sr['is_absent']) ? '✓' : $dash }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            @endif
        </div>
    @empty
        <div class="empty-row">{{ $L('noExams', 'No exam records found') }}</div>
    @endforelse
</div>
@endif

{{-- Fees --}}
@if(!empty($sections['fees']))
@php
    $feesSummary = $sections['fees']['summary'] ?? [];
    $feeAssignments = $sections['fees']['assignments'] ?? [];
@endphp
<div class="sh-card">
    <div class="sh-card-title">{{ $L('feesTitle', 'Fee History') }}</div>
    <table class="data-table" style="margin-bottom: 8px;">
        <thead>
            <tr>
                <th>{{ $L('totalAssigned', 'Total Assigned') }}</th>
                <th>{{ $L('totalPaid', 'Total Paid') }}</th>
                <th>{{ $L('totalOutstanding', 'Outstanding') }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="ltr">{{ number_format($feesSummary['total_assigned'] ?? 0, 0) }}</td>
                <td class="paid-cell ltr">{{ number_format($feesSummary['total_paid'] ?? 0, 0) }}</td>
                <td class="balance-cell ltr">{{ number_format($feesSummary['total_remaining'] ?? 0, 0) }}</td>
            </tr>
        </tbody>
    </table>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('feeStructure', 'Fee Structure') }}</th>
                <th>{{ $L('academicYear', 'Academic Year') }}</th>
                <th>{{ $L('assigned', 'Assigned') }}</th>
                <th>{{ $L('paid', 'Paid') }}</th>
                <th>{{ $L('remaining', 'Remaining') }}</th>
                <th>{{ $L('status', 'Status') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($feeAssignments as $index => $assignment)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $assignment['fee_structure'] ?? $dash }}</td>
                <td>{{ $assignment['academic_year'] ?? $dash }}</td>
                <td class="ltr">{{ number_format($assignment['assigned_amount'] ?? 0, 0) }}</td>
                <td class="paid-cell ltr">{{ number_format($assignment['paid_amount'] ?? 0, 0) }}</td>
                <td class="balance-cell ltr">{{ number_format($assignment['remaining_amount'] ?? 0, 0) }}</td>
                <td>{{ $assignment['status'] ?? $dash }}</td>
            </tr>
            @empty
            <tr><td colspan="7" class="empty-row">{{ $L('noFees', 'No fee records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Library --}}
@if(!empty($sections['library']))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('libraryTitle', 'Library Loans') }}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('bookTitle', 'Book Title') }}</th>
                <th>{{ $L('author', 'Author') }}</th>
                <th>{{ $L('loanDate', 'Loan Date') }}</th>
                <th>{{ $L('dueDate', 'Due Date') }}</th>
                <th>{{ $L('returned', 'Returned') }}</th>
                <th>{{ $L('status', 'Status') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['library'] as $index => $loan)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $loan['book_title'] ?? $dash }}</td>
                <td>{{ $loan['author'] ?? $dash }}</td>
                <td class="ltr">{{ $loan['loan_date'] ?? $dash }}</td>
                <td class="ltr">{{ $loan['due_date'] ?? $dash }}</td>
                <td class="ltr">{{ $loan['return_date'] ?? $dash }}</td>
                <td>{{ $loan['status'] ?? $dash }}</td>
            </tr>
            @empty
            <tr><td colspan="7" class="empty-row">{{ $L('noLibrary', 'No library records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- ID Cards --}}
@if(!empty($sections['id_cards']))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('idCardsTitle', 'ID Card History') }}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('cardNumber', 'Card Number') }}</th>
                <th>{{ $L('template', 'Template') }}</th>
                <th>{{ $L('academicYear', 'Academic Year') }}</th>
                <th>{{ $L('class', 'Class') }}</th>
                <th>{{ $L('issueDate', 'Issue Date') }}</th>
                <th>{{ $L('printed', 'Printed') }}</th>
                <th>{{ $L('feePaid', 'Fee Paid') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['id_cards'] as $index => $card)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td class="ltr">{{ $card['card_number'] ?? $dash }}</td>
                <td>{{ $card['template'] ?? $dash }}</td>
                <td>{{ $card['academic_year'] ?? $dash }}</td>
                <td>{{ $card['class'] ?? $dash }}</td>
                <td class="ltr">{{ $card['issued_at'] ?? ($card['issue_date'] ?? ($card['created_at'] ?? $dash)) }}</td>
                <td>{{ !empty($card['is_printed']) ? $L('yes', 'Yes') : $L('no', 'No') }}</td>
                <td>{{ !empty($card['fee_paid']) || !empty($card['card_fee_paid']) ? $L('yes', 'Yes') : $L('no', 'No') }}</td>
            </tr>
            @empty
            <tr><td colspan="8" class="empty-row">{{ $L('noIdCards', 'No ID card records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Courses --}}
@if(!empty($sections['courses']))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('coursesTitle', 'Courses') }}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('courseName', 'Course Name') }}</th>
                <th>{{ $L('registrationDate', 'Registration Date') }}</th>
                <th>{{ $L('completionDate', 'Completion Date') }}</th>
                <th>{{ $L('status', 'Status') }}</th>
                <th>{{ $L('grade', 'Grade') }}</th>
                <th>{{ $L('certificateIssued', 'Certificate Issued') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['courses'] as $index => $course)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $course['course_name'] ?? ($course['name'] ?? $dash) }}</td>
                <td class="ltr">{{ $course['registration_date'] ?? $dash }}</td>
                <td class="ltr">{{ $course['completion_date'] ?? $dash }}</td>
                <td>{{ $course['completion_status'] ?? ($course['status'] ?? $dash) }}</td>
                <td>{{ $course['grade'] ?? $dash }}</td>
                <td>{{ !empty($course['certificate_issued']) ? $L('yes', 'Yes') : $L('no', 'No') }}</td>
            </tr>
            @empty
            <tr><td colspan="7" class="empty-row">{{ $L('noCourses', 'No course records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Graduations --}}
@if(!empty($sections['graduations']))
<div class="sh-card">
    <div class="sh-card-title">{{ $L('graduationsTitle', 'Graduations') }}</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $L('batchName', 'Batch Name') }}</th>
                <th>{{ $L('graduationDate', 'Graduation Date') }}</th>
                <th>{{ $L('finalResult', 'Final Result') }}</th>
                <th>{{ $L('certificateNumber', 'Certificate #') }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['graduations'] as $index => $graduation)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $graduation['batch_name'] ?? ($graduation['batch'] ?? $dash) }}</td>
                <td class="ltr">{{ $graduation['graduation_date'] ?? ($graduation['created_at'] ?? $dash) }}</td>
                <td>{{ $graduation['final_result'] ?? ($graduation['final_result_status'] ?? $dash) }}</td>
                <td class="ltr">{{ $graduation['certificate_number'] ?? $dash }}</td>
            </tr>
            @empty
            <tr><td colspan="5" class="empty-row">{{ $L('noGraduations', 'No graduation records found') }}</td></tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

@if(!empty($footer_notes))
<div class="notes-section footer-notes">
    @foreach($footer_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

<style>
    .sh-card {
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 12px 14px;
        margin: 12px 0;
        page-break-inside: avoid;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
    }
    .sh-card-title {
        font-size: 13px;
        font-weight: 700;
        color: {{ $primary }};
        margin: 0 0 10px 0;
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(11, 11, 86, 0.08);
        border-inline-start: 4px solid {{ $primary }};
        font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
    }
    .sh-hero {
        padding: 0;
        overflow: hidden;
    }
    .sh-hero-accent {
        height: 6px;
        background: linear-gradient(90deg, {{ $primary }}, {{ $secondary }});
    }
    .sh-hero-body {
        display: flex;
        gap: 14px;
        padding: 14px;
        align-items: flex-start;
    }
    .sh-photo-wrap { flex-shrink: 0; }
    .sh-photo {
        width: 78px;
        height: 95px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #f3f4f6;
    }
    .sh-photo-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        color: {{ $primary }};
    }
    .sh-hero-main { flex: 1; min-width: 0; }
    .sh-hero-name {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 6px;
    }
    .sh-hero-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
        font-size: 11px;
        color: #4b5563;
        margin-bottom: 8px;
    }
    .sh-hero-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .sh-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        background: #eef2ff;
        color: {{ $primary }};
    }
    .sh-badge-orphan { background: #fef3c7; color: #92400e; }
    .status-active, .status-admitted { background: #dcfce7; color: #166534; }
    .status-withdrawn, .status-inactive { background: #fee2e2; color: #991b1b; }
    .status-pending, .status-applied, .status-suspended { background: #fef3c7; color: #92400e; }

    .sh-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
    .sh-metric {
        flex: 1 1 90px;
        min-width: 90px;
        text-align: center;
        padding: 10px 6px;
        border-radius: 8px;
        background: #f3f4f8;
        border: 1px solid #d8dbe7;
    }
    .sh-metric-value {
        font-size: 18px;
        font-weight: 700;
        color: {{ $primary }};
        line-height: 1.2;
    }
    .sh-metric-label {
        font-size: 9px;
        color: #6b7280;
        margin-top: 4px;
    }

    .sh-fields {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
    }
    .sh-fields td {
        padding: 5px 8px;
        vertical-align: top;
        border-bottom: 1px solid #f3f4f6;
        font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
    }
    .sh-field-label {
        width: 18%;
        color: #6b7280;
        font-weight: 600;
    }
    .sh-field-value {
        width: 32%;
        color: #111827;
        font-weight: 500;
    }

    .sh-subcard {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 8px;
        margin-top: 8px;
        background: #fafafa;
    }
    .sh-subcard-title {
        font-weight: 700;
        font-size: 11px;
        margin-bottom: 6px;
        color: {{ $primary }};
    }

    .empty-row {
        text-align: center;
        color: #6b7280;
        font-style: italic;
        padding: 14px !important;
    }
    .present-cell { color: #16a34a; font-weight: 600; }
    .absent-cell { color: #dc2626; font-weight: 600; }
    .late-cell { color: #d97706; font-weight: 600; }
    .paid-cell { color: #16a34a; }
    .balance-cell { color: #dc2626; font-weight: 600; }
    .ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
        font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
    }
    .data-table th,
    .data-table td {
        border: 1px solid #e5e7eb;
        padding: 5px 6px;
        text-align: start;
        font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
    }
    .data-table th {
        background: #eef0f7;
        color: {{ $primary }};
        font-weight: 700;
    }
    .row-number { width: 28px; text-align: center; color: #6b7280; }
</style>
@endsection
