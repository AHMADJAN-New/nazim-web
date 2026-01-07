@extends('reports.base')

@section('content')
{{-- Watermark --}}
@if(!empty($WATERMARK))
<div class="watermark">
    @if(!empty($WATERMARK['text']))
        <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
    @elseif(!empty($WATERMARK['image_url']))
        <img src="{{ $WATERMARK['image_url'] }}" class="watermark-image" alt="Watermark">
    @endif
</div>
@endif

{{-- Header Section --}}
<div class="report-header">
    <div class="header-left">
        @if(!empty($PRIMARY_LOGO))
            <img src="{{ $PRIMARY_LOGO }}" alt="Logo" class="header-logo">
        @endif
    </div>
    <div class="header-center">
        <div class="school-name">{{ $SCHOOL_NAME ?? 'School Name' }}</div>
        <div class="report-title">{{ $TABLE_TITLE ?? 'Student Lifetime History Report' }}</div>
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

{{-- Header Notes --}}
@if(!empty($header_notes))
<div class="notes-section header-notes">
    @foreach($header_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

{{-- Student Information Card --}}
<div class="student-info-card">
    <table class="info-table">
        <tr>
            <td class="photo-cell" rowspan="4">
                @if(!empty($student['picture_path']))
                    <img src="{{ $student['picture_path'] }}" alt="Student Photo" class="student-photo">
                @else
                    <div class="no-photo">
                        <span>{{ mb_substr($student['full_name'] ?? 'S', 0, 1) }}</span>
                    </div>
                @endif
            </td>
            <td class="info-label">{{ $labels['fullName'] ?? 'Full Name' }}:</td>
            <td class="info-value"><strong>{{ $student['full_name'] ?? '—' }}</strong></td>
            <td class="info-label">{{ $labels['admissionNo'] ?? 'Admission No' }}:</td>
            <td class="info-value">{{ $student['admission_no'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['fatherName'] ?? 'Father Name' }}:</td>
            <td class="info-value">{{ $student['father_name'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['currentClass'] ?? 'Current Class' }}:</td>
            <td class="info-value">
                {{ $student['current_class'] ?? '—' }}
                @if(!empty($student['current_section']))
                    ({{ $student['current_section'] }})
                @endif
                @if(!empty($student['current_academic_year']))
                    - {{ $student['current_academic_year'] }}
                @endif
            </td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['dob'] ?? 'Date of Birth' }}:</td>
            <td class="info-value">{{ $student['birth_date'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['status'] ?? 'Status' }}:</td>
            <td class="info-value">
                <span class="status-badge {{ strtolower($student['status'] ?? 'unknown') }}">
                    {{ $student['status'] ?? '—' }}
                </span>
            </td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['phone'] ?? 'Phone' }}:</td>
            <td class="info-value">{{ $student['guardian_phone'] ?? ($student['phone'] ?? '—') }}</td>
            <td class="info-label">{{ $labels['generatedAt'] ?? 'Generated At' }}:</td>
            <td class="info-value">{{ $generatedAt ?? now()->format('Y-m-d H:i') }}</td>
        </tr>
    </table>

    {{-- Extended Details (matches UI "cards/tabs" info) --}}
    <table class="info-table" style="margin-top: 10px;">
        <tr>
            <td class="info-label">{{ $labels['studentCode'] ?? 'Student Code' }}:</td>
            <td class="info-value">{{ $student['student_code'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['cardNumber'] ?? 'Card Number' }}:</td>
            <td class="info-value">{{ $student['card_number'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['school'] ?? 'School' }}:</td>
            <td class="info-value">{{ $student['school_name'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['organization'] ?? 'Organization' }}:</td>
            <td class="info-value">{{ $student['organization_name'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['guardianName'] ?? 'Guardian' }}:</td>
            <td class="info-value">
                {{ $student['guardian_name'] ?? '—' }}
                @if(!empty($student['guardian_relation']))
                    ({{ $student['guardian_relation'] }})
                @endif
            </td>
            <td class="info-label">{{ $labels['emergencyContact'] ?? 'Emergency Contact' }}:</td>
            <td class="info-value">
                {{ $student['emergency_contact_name'] ?? '—' }}
                @if(!empty($student['emergency_contact_phone']))
                    - {{ $student['emergency_contact_phone'] }}
                @endif
            </td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['nationality'] ?? 'Nationality' }}:</td>
            <td class="info-value">{{ $student['nationality'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['preferredLanguage'] ?? 'Preferred Language' }}:</td>
            <td class="info-value">{{ $student['preferred_language'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['address'] ?? 'Address' }}:</td>
            <td class="info-value" colspan="3">{{ $student['home_address'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['previousSchool'] ?? 'Previous School' }}:</td>
            <td class="info-value" colspan="3">{{ $student['previous_school'] ?? '—' }}</td>
        </tr>
    </table>
</div>

{{-- Summary Cards --}}
@if(!empty($summary))
<div class="summary-section">
    <h3 class="section-title">{{ $labels['summary'] ?? 'Summary' }}</h3>
    <div class="summary-cards">
        @if(isset($summary['academic_years']))
        <div class="summary-card">
            <div class="summary-value">{{ $summary['academic_years'] }}</div>
            <div class="summary-label">{{ $labels['academicYears'] ?? 'Academic Years' }}</div>
        </div>
        @endif
        @if(isset($summary['attendance_rate']))
        <div class="summary-card">
            <div class="summary-value">{{ $summary['attendance_rate'] }}%</div>
            <div class="summary-label">{{ $labels['attendanceRate'] ?? 'Attendance Rate' }}</div>
        </div>
        @endif
        @if(isset($summary['exam_average']))
        <div class="summary-card">
            <div class="summary-value">{{ $summary['exam_average'] }}%</div>
            <div class="summary-label">{{ $labels['examAverage'] ?? 'Exam Average' }}</div>
        </div>
        @endif
        @if(isset($summary['total_fees_paid']))
        <div class="summary-card">
            <div class="summary-value">{{ number_format($summary['total_fees_paid'], 0) }}</div>
            <div class="summary-label">{{ $labels['totalFeesPaid'] ?? 'Total Fees Paid' }}</div>
        </div>
        @endif
        @if(isset($summary['library_loans']))
        <div class="summary-card">
            <div class="summary-value">{{ $summary['library_loans'] }}</div>
            <div class="summary-label">{{ $labels['libraryLoans'] ?? 'Library Loans' }}</div>
        </div>
        @endif
        @if(isset($summary['courses_completed']))
        <div class="summary-card">
            <div class="summary-value">{{ $summary['courses_completed'] }}</div>
            <div class="summary-label">{{ $labels['coursesCompleted'] ?? 'Courses Completed' }}</div>
        </div>
        @endif
    </div>
</div>
@endif

{{-- Body Notes --}}
@if(!empty($body_notes))
<div class="notes-section body-notes">
    @foreach($body_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

{{-- Admissions Section --}}
@if(!empty($sections['admissions']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['admissionsTitle'] ?? 'Admissions History' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['academicYear'] ?? 'Academic Year' }}</th>
                <th>{{ $labels['class'] ?? 'Class' }}</th>
                <th>{{ $labels['admissionDate'] ?? 'Admission Date' }}</th>
                <th>{{ $labels['enrollmentStatus'] ?? 'Status' }}</th>
                <th>{{ $labels['enrollmentType'] ?? 'Type' }}</th>
                <th>{{ $labels['residencyType'] ?? 'Residency' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['admissions'] as $index => $admission)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $admission['academic_year'] ?? '—' }}</td>
                <td>{{ $admission['class'] ?? '—' }}</td>
                <td>{{ $admission['admission_date'] ?? '—' }}</td>
                <td>{{ $admission['enrollment_status'] ?? '—' }}</td>
                <td>{{ $admission['enrollment_type'] ?? '—' }}</td>
                <td>{{ $admission['residency_type'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" class="empty-row">{{ $labels['noAdmissions'] ?? 'No admission records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Attendance Section --}}
@if(!empty($sections['attendance']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['attendanceTitle'] ?? 'Attendance Summary' }}</h3>
    @php
        $attendanceSummary = $sections['attendance']['summary'] ?? [];
        $attendanceMonthly = $sections['attendance']['monthly_breakdown'] ?? [];
    @endphp

    {{-- Summary --}}
    <table class="data-table">
        <thead>
            <tr>
                <th>{{ $labels['totalDays'] ?? 'Total Days' }}</th>
                <th>{{ $labels['present'] ?? 'Present' }}</th>
                <th>{{ $labels['absent'] ?? 'Absent' }}</th>
                <th>{{ $labels['late'] ?? 'Late' }}</th>
                <th>{{ $labels['attendanceRate'] ?? 'Rate' }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $attendanceSummary['total_days'] ?? 0 }}</td>
                <td class="present-cell">{{ $attendanceSummary['present'] ?? 0 }}</td>
                <td class="absent-cell">{{ $attendanceSummary['absent'] ?? 0 }}</td>
                <td class="late-cell">{{ $attendanceSummary['late'] ?? 0 }}</td>
                <td>{{ $attendanceSummary['rate'] ?? 0 }}%</td>
            </tr>
        </tbody>
    </table>

    {{-- Monthly breakdown --}}
    @if(!empty($attendanceMonthly))
        <div style="height: 8px;"></div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>{{ $labels['month'] ?? 'Month' }}</th>
                    <th>{{ $labels['present'] ?? 'Present' }}</th>
                    <th>{{ $labels['absent'] ?? 'Absent' }}</th>
                    <th>{{ $labels['late'] ?? 'Late' }}</th>
                    <th>{{ $labels['attendanceRate'] ?? 'Rate' }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($attendanceMonthly as $m)
                    <tr>
                        <td>{{ $m['month'] ?? '—' }}</td>
                        <td class="present-cell">{{ $m['present'] ?? 0 }}</td>
                        <td class="absent-cell">{{ $m['absent'] ?? 0 }}</td>
                        <td class="late-cell">{{ $m['late'] ?? 0 }}</td>
                        <td>{{ $m['rate'] ?? 0 }}%</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</div>
@endif

{{-- Exams Section --}}
@if(!empty($sections['exams']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['examsTitle'] ?? 'Exam History' }}</h3>
    @php
        $examsSummary = $sections['exams']['summary'] ?? [];
        $examRows = $sections['exams']['exams'] ?? [];
    @endphp

    {{-- Summary --}}
    <table class="data-table">
        <thead>
            <tr>
                <th>{{ $labels['totalExams'] ?? 'Total Exams' }}</th>
                <th>{{ $labels['averagePercentage'] ?? 'Average %' }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ $examsSummary['total_exams'] ?? 0 }}</td>
                <td>{{ $examsSummary['average_percentage'] ?? 0 }}%</td>
            </tr>
        </tbody>
    </table>

    {{-- Exams --}}
    @if(!empty($examRows))
        <div style="height: 8px;"></div>
        @foreach($examRows as $idx => $exam)
            <div class="history-subsection" style="margin-top: 6px;">
                <div style="font-weight: 700; margin-bottom: 4px;">
                    {{ ((int)$idx + 1) }}. {{ $exam['exam_name'] ?? '—' }} — {{ $exam['class_name'] ?? '' }} @if(!empty($exam['exam_date'])) ({{ $exam['exam_date'] }}) @endif
                </div>

                <table class="data-table" style="margin-bottom: 6px;">
                    <thead>
                        <tr>
                            <th>{{ $labels['totalMarks'] ?? 'Total' }}</th>
                            <th>{{ $labels['maxMarks'] ?? 'Max' }}</th>
                            <th>{{ $labels['percentage'] ?? '%' }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ $exam['total_marks'] ?? 0 }}</td>
                            <td>{{ $exam['max_marks'] ?? 0 }}</td>
                            <td>{{ $exam['percentage'] ?? 0 }}%</td>
                        </tr>
                    </tbody>
                </table>

                @if(!empty($exam['subject_results']))
                    <table class="data-table" style="font-size: 11px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{{ $labels['subject'] ?? 'Subject' }}</th>
                                <th>{{ $labels['obtainedMarks'] ?? 'Obtained' }}</th>
                                <th>{{ $labels['maxMarks'] ?? 'Max' }}</th>
                                <th>{{ $labels['percentage'] ?? '%' }}</th>
                                <th>{{ $labels['absent'] ?? 'Absent' }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($exam['subject_results'] as $sIdx => $sr)
                                <tr>
                                    <td class="row-number">{{ (int)$sIdx + 1 }}</td>
                                    <td>{{ $sr['subject_name'] ?? '—' }}</td>
                                    <td>{{ $sr['marks_obtained'] ?? 0 }}</td>
                                    <td>{{ $sr['max_marks'] ?? 0 }}</td>
                                    <td>{{ $sr['percentage'] ?? 0 }}%</td>
                                    <td>{{ !empty($sr['is_absent']) ? '✓' : '—' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        @endforeach
    @else
        <div class="empty-row">{{ $labels['noExams'] ?? 'No exam records found' }}</div>
    @endif
</div>
@endif

{{-- Fees Section --}}
@if(!empty($sections['fees']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['feesTitle'] ?? 'Fee History' }}</h3>
    @php
        $feesSummary = $sections['fees']['summary'] ?? [];
        $feeAssignments = $sections['fees']['assignments'] ?? [];
    @endphp

    {{-- Summary --}}
    <table class="data-table">
        <thead>
            <tr>
                <th>{{ $labels['totalAssigned'] ?? 'Total Assigned' }}</th>
                <th>{{ $labels['totalPaid'] ?? 'Total Paid' }}</th>
                <th>{{ $labels['totalOutstanding'] ?? 'Outstanding' }}</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{ number_format($feesSummary['total_assigned'] ?? 0, 0) }}</td>
                <td class="paid-cell">{{ number_format($feesSummary['total_paid'] ?? 0, 0) }}</td>
                <td class="balance-cell">{{ number_format($feesSummary['total_remaining'] ?? 0, 0) }}</td>
            </tr>
        </tbody>
    </table>

    {{-- Assignments --}}
    @if(!empty($feeAssignments))
        <div style="height: 8px;"></div>
        @foreach($feeAssignments as $idx => $fa)
            <div class="history-subsection" style="margin-top: 6px;">
                <div style="font-weight: 700; margin-bottom: 4px;">
                    {{ ((int)$idx + 1) }}. {{ $fa['fee_structure'] ?? '—' }} — {{ $fa['academic_year'] ?? '' }}
                    @if(!empty($fa['status'])) ({{ $fa['status'] }}) @endif
                </div>

                <table class="data-table" style="margin-bottom: 6px;">
                    <thead>
                        <tr>
                            <th>{{ $labels['assignedAmount'] ?? 'Assigned' }}</th>
                            <th>{{ $labels['paidAmount'] ?? 'Paid' }}</th>
                            <th>{{ $labels['balance'] ?? 'Balance' }}</th>
                            <th>{{ $labels['dueDate'] ?? 'Due Date' }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ number_format($fa['assigned_amount'] ?? 0, 0) }}</td>
                            <td class="paid-cell">{{ number_format($fa['paid_amount'] ?? 0, 0) }}</td>
                            <td class="balance-cell">{{ number_format($fa['remaining_amount'] ?? 0, 0) }}</td>
                            <td>{{ $fa['due_date'] ?? '—' }}</td>
                        </tr>
                    </tbody>
                </table>

                @if(!empty($fa['payments']))
                    <table class="data-table" style="font-size: 11px;">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{{ $labels['paymentDate'] ?? 'Payment Date' }}</th>
                                <th>{{ $labels['amount'] ?? 'Amount' }}</th>
                                <th>{{ $labels['paymentMethod'] ?? 'Method' }}</th>
                                <th>{{ $labels['referenceNo'] ?? 'Reference' }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($fa['payments'] as $pIdx => $p)
                                <tr>
                                    <td class="row-number">{{ (int)$pIdx + 1 }}</td>
                                    <td>{{ $p['payment_date'] ?? '—' }}</td>
                                    <td>{{ number_format($p['amount'] ?? 0, 0) }}</td>
                                    <td>{{ $p['payment_method'] ?? '—' }}</td>
                                    <td>{{ $p['reference_no'] ?? '—' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                @endif
            </div>
        @endforeach
    @else
        <div class="empty-row">{{ $labels['noFees'] ?? 'No fee records found' }}</div>
    @endif
</div>
@endif

{{-- Library Section --}}
@if(!empty($sections['library']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['libraryTitle'] ?? 'Library History' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['bookTitle'] ?? 'Book Title' }}</th>
                <th>{{ $labels['author'] ?? 'Author' }}</th>
                <th>{{ $labels['loanDate'] ?? 'Loan Date' }}</th>
                <th>{{ $labels['dueDate'] ?? 'Due Date' }}</th>
                <th>{{ $labels['returnDate'] ?? 'Return Date' }}</th>
                <th>{{ $labels['status'] ?? 'Status' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['library'] as $index => $loan)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $loan['book_title'] ?? '—' }}</td>
                <td>{{ $loan['author'] ?? '—' }}</td>
                <td>{{ $loan['loan_date'] ?? '—' }}</td>
                <td>{{ $loan['due_date'] ?? '—' }}</td>
                <td>{{ $loan['return_date'] ?? '—' }}</td>
                <td>{{ $loan['status'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" class="empty-row">{{ $labels['noLibrary'] ?? 'No library records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- ID Cards Section --}}
@if(!empty($sections['id_cards']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['idCardsTitle'] ?? 'ID Card History' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['cardNumber'] ?? 'Card Number' }}</th>
                <th>{{ $labels['template'] ?? 'Template' }}</th>
                <th>{{ $labels['academicYear'] ?? 'Year' }}</th>
                <th>{{ $labels['class'] ?? 'Class' }}</th>
                <th>{{ $labels['issueDate'] ?? 'Issue Date' }}</th>
                <th>{{ $labels['printed'] ?? 'Printed' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['id_cards'] as $index => $card)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $card['card_number'] ?? '—' }}</td>
                <td>{{ $card['template'] ?? '—' }}</td>
                <td>{{ $card['academic_year'] ?? '—' }}</td>
                <td>{{ $card['class'] ?? '—' }}</td>
                <td>{{ $card['issued_at'] ?? '—' }}</td>
                <td>{{ !empty($card['is_printed']) ? '✓' : '✗' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" class="empty-row">{{ $labels['noIdCards'] ?? 'No ID card records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Short-Term Courses Section --}}
@if(!empty($sections['courses']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['coursesTitle'] ?? 'Short-Term Courses' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['courseName'] ?? 'Course Name' }}</th>
                <th>{{ $labels['registrationDate'] ?? 'Registration' }}</th>
                <th>{{ $labels['completionDate'] ?? 'Completion' }}</th>
                <th>{{ $labels['status'] ?? 'Status' }}</th>
                <th>{{ $labels['grade'] ?? 'Grade' }}</th>
                <th>{{ $labels['certificateIssued'] ?? 'Certificate' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['courses'] as $index => $course)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $course['course_name'] ?? '—' }}</td>
                <td>{{ $course['registration_date'] ?? '—' }}</td>
                <td>{{ $course['completion_date'] ?? '—' }}</td>
                <td>{{ $course['status'] ?? '—' }}</td>
                <td>{{ $course['grade'] ?? '—' }}</td>
                <td>{{ $course['certificate_issued'] ? '✓' : '✗' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="7" class="empty-row">{{ $labels['noCourses'] ?? 'No course records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Graduations Section --}}
@if(!empty($sections['graduations']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['graduationsTitle'] ?? 'Graduation Records' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['batchName'] ?? 'Batch' }}</th>
                <th>{{ $labels['graduationDate'] ?? 'Date' }}</th>
                <th>{{ $labels['finalResult'] ?? 'Result' }}</th>
                <th>{{ $labels['certificateNumber'] ?? 'Certificate #' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['graduations'] as $index => $graduation)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $graduation['batch_name'] ?? '—' }}</td>
                <td>{{ $graduation['graduation_date'] ?? '—' }}</td>
                <td>{{ $graduation['final_result'] ?? '—' }}</td>
                <td>{{ $graduation['certificate_number'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" class="empty-row">{{ $labels['noGraduations'] ?? 'No graduation records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Educational History Section --}}
@if(!empty($sections['educational_history']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['educationalHistoryTitle'] ?? 'Educational History' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['institution'] ?? 'Institution' }}</th>
                <th>{{ $labels['gradeLevel'] ?? 'Grade Level' }}</th>
                <th>{{ $labels['period'] ?? 'Period' }}</th>
                <th>{{ $labels['achievements'] ?? 'Achievements' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['educational_history'] as $index => $history)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $history['institution'] ?? '—' }}</td>
                <td>{{ $history['grade_level'] ?? '—' }}</td>
                <td>{{ $history['period'] ?? '—' }}</td>
                <td>{{ $history['achievements'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="5" class="empty-row">{{ $labels['noEducationalHistory'] ?? 'No educational history records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Discipline Records Section --}}
@if(!empty($sections['discipline']))
<div class="history-section">
    <h3 class="section-title">{{ $labels['disciplineTitle'] ?? 'Discipline Records' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['incidentDate'] ?? 'Date' }}</th>
                <th>{{ $labels['incidentType'] ?? 'Type' }}</th>
                <th>{{ $labels['severity'] ?? 'Severity' }}</th>
                <th>{{ $labels['actionTaken'] ?? 'Action' }}</th>
                <th>{{ $labels['status'] ?? 'Status' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['discipline'] as $index => $record)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $record['incident_date'] ?? '—' }}</td>
                <td>{{ $record['incident_type'] ?? '—' }}</td>
                <td class="severity-{{ strtolower($record['severity'] ?? 'minor') }}">{{ $record['severity'] ?? '—' }}</td>
                <td>{{ $record['action_taken'] ?? '—' }}</td>
                <td>{{ $record['status'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="6" class="empty-row">{{ $labels['noDiscipline'] ?? 'No discipline records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Footer Notes --}}
@if(!empty($footer_notes))
<div class="notes-section footer-notes">
    @foreach($footer_notes as $note)
        <div class="note-item">{{ $note }}</div>
    @endforeach
</div>
@endif

{{-- Footer Section --}}
<div class="report-footer">
    @if(!empty($FOOTER_TEXT))
    <div class="footer-text">{!! $FOOTER_TEXT !!}</div>
    @endif
    
    <div class="footer-row">
        <div class="footer-left">
            {{ $labels['generatedAt'] ?? 'Generated' }}: {{ $generatedAt ?? now()->format('Y-m-d H:i') }}
        </div>
        <div class="footer-center">
            @if($show_page_numbers ?? true)
            {{ $labels['page'] ?? 'Page' }} <span class="page-number"></span>
            @endif
        </div>
        <div class="footer-right">
            {{ $labels['totalRecords'] ?? 'Total Records' }}: {{ $totalRecords ?? 0 }}
        </div>
    </div>
    
    <div class="system-note">
        {{ $labels['systemNote'] ?? 'This report was generated by Nazim School Management System' }}
    </div>
</div>

<style>
    /* Student Info Card Styles */
    .student-info-card {
        margin: 15px 0;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .info-table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .info-table td {
        padding: 6px 10px;
        vertical-align: middle;
    }
    
    .photo-cell {
        width: 100px;
        text-align: center;
    }
    
    .student-photo {
        width: 80px;
        height: 100px;
        object-fit: cover;
        border-radius: 4px;
        border: 2px solid {{ $PRIMARY_COLOR ?? '#0b0b56' }};
    }
    
    .no-photo {
        width: 80px;
        height: 100px;
        background: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 36px;
        font-weight: bold;
    }
    
    .info-label {
        color: #6c757d;
        font-size: 11px;
        width: 100px;
    }
    
    .info-value {
        font-size: 12px;
        min-width: 120px;
    }
    
    .status-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .status-badge.active, .status-badge.admitted {
        background: #d4edda;
        color: #155724;
    }
    
    .status-badge.inactive, .status-badge.withdrawn {
        background: #f8d7da;
        color: #721c24;
    }
    
    .status-badge.pending {
        background: #fff3cd;
        color: #856404;
    }
    
    /* Summary Section Styles */
    .summary-section {
        margin: 20px 0;
    }
    
    .summary-cards {
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-top: 10px;
    }
    
    .summary-card {
        flex: 1;
        min-width: 100px;
        max-width: 150px;
        padding: 12px;
        background: #fff;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        text-align: center;
        border-left: 4px solid {{ $PRIMARY_COLOR ?? '#0b0b56' }};
    }
    
    .summary-value {
        font-size: 24px;
        font-weight: bold;
        color: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
    }
    
    .summary-label {
        font-size: 10px;
        color: #6c757d;
        margin-top: 4px;
    }
    
    /* Section Styles */
    .history-section {
        margin: 20px 0;
        page-break-inside: avoid;
    }
    
    .section-title {
        font-size: 14px;
        font-weight: bold;
        color: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 2px solid {{ $SECONDARY_COLOR ?? '#0056b3' }};
    }
    
    /* Table Cell Styles */
    .empty-row {
        text-align: center;
        color: #6c757d;
        font-style: italic;
        padding: 20px !important;
    }
    
    .present-cell { color: #28a745; font-weight: 600; }
    .absent-cell { color: #dc3545; font-weight: 600; }
    .late-cell { color: #ffc107; font-weight: 600; }
    .pass-cell { color: #28a745; font-weight: 600; }
    .fail-cell { color: #dc3545; font-weight: 600; }
    .paid-cell { color: #28a745; }
    .balance-cell { color: #dc3545; font-weight: 600; }
    
    .severity-minor { color: #17a2b8; }
    .severity-moderate { color: #ffc107; }
    .severity-major { color: #fd7e14; }
    .severity-severe { color: #dc3545; font-weight: 600; }
    
    /* Totals Row */
    .totals-row {
        margin-top: 10px;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 4px;
        display: flex;
        justify-content: space-around;
        font-size: 12px;
    }
</style>
@endsection

