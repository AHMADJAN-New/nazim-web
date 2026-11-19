@extends('reports.base')

@section('content')
@php
    $labels = $labels ?? [];
    $L = fn (string $key, string $fallback = '') => $labels[$key] ?? $fallback;
    $cards = $cards ?? [];
    $dash = '—';
    $fmt = function ($value) use ($dash) {
        if ($value === null || $value === '') {
            return $dash;
        }
        $number = (float) $value;
        if (abs($number - round($number)) < 0.001) {
            return (string) (int) round($number);
        }
        return rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.');
    };
@endphp

@forelse($cards as $card)
@php
    $student = $card['student'] ?? [];
    $examA = $card['exam_a'] ?? [];
    $examB = $card['exam_b'] ?? [];
    $subjects = $card['subjects'] ?? [];
    $summary = $card['summary'] ?? [];
    $overall = strtolower((string) ($summary['overall_result'] ?? 'incomplete'));
    if (!in_array($overall, ['pass', 'fail', 'incomplete'], true)) {
        $overall = 'incomplete';
    }
    $classLabel = trim(($student['class'] ?? '').(!empty($student['section']) ? ' — '.$student['section'] : ''));
    $schoolTitle = $SCHOOL_NAME_PASHTO ?? $SCHOOL_NAME ?? ($card['organization_name'] ?? '');
    $periodA = trim(($examA['start_date_formatted'] ?? '').((!empty($examA['start_date_formatted']) && !empty($examA['end_date_formatted'])) ? ' — ' : '').($examA['end_date_formatted'] ?? ''));
    $periodB = trim(($examB['start_date_formatted'] ?? '').((!empty($examB['start_date_formatted']) && !empty($examB['end_date_formatted'])) ? ' — ' : '').($examB['end_date_formatted'] ?? ''));
@endphp
<div class="crc-page @if(!$loop->last) crc-break @endif">
    <div class="report-header">
        <div class="header-left">
            @if(!empty($PRIMARY_LOGO_URI))
                <img src="{!! $PRIMARY_LOGO_URI !!}" alt="" class="header-logo">
            @endif
        </div>
        <div class="header-center">
            @if($schoolTitle !== '')
                <div class="school-name">{{ $schoolTitle }}</div>
            @endif
            @if(!empty($card['organization_name']) && $card['organization_name'] !== $schoolTitle)
                <div class="header-text">{{ $card['organization_name'] }}</div>
            @endif
            <div class="report-title">{{ $TABLE_TITLE ?? $L('combinedReportTitle', 'Combined result card') }}</div>
            <div class="header-text">
                {{ $card['academic_year'] ?? '' }}
                @if(!empty($classLabel))
                    · {{ $classLabel }}
                @endif
            </div>
        </div>
        <div class="header-right">
            @if(!empty($student['picture_data_url']))
                <img src="{{ $student['picture_data_url'] }}" alt="" class="crc-photo">
            @endif
        </div>
    </div>

    <div class="crc-identity">
        <div><span>{{ $L('fullName', 'Full Name') }}</span><strong>{{ $student['full_name'] ?? $dash }}</strong></div>
        <div><span>{{ $L('fatherName', 'Father Name') }}</span><strong>{{ $student['father_name'] ?? $dash }}</strong></div>
        <div><span>{{ $L('admissionNo', 'Admission No') }}</span><strong class="num">{{ $student['admission_no'] ?? $dash }}</strong></div>
        <div><span>{{ $L('rollNumber', 'Roll Number') }}</span><strong class="num">{{ $student['roll_number'] ?? $dash }}</strong></div>
        <div><span>{{ $L('examA', 'Exam A') }}</span><strong>{{ $examA['name'] ?? $dash }}@if($periodA !== '') <em class="crc-period">{{ $periodA }}</em>@endif</strong></div>
        <div><span>{{ $L('examB', 'Exam B') }}</span><strong>{{ $examB['name'] ?? $dash }}@if($periodB !== '') <em class="crc-period">{{ $periodB }}</em>@endif</strong></div>
    </div>

    @if(empty($card['enrolled_in_second_exam']))
        <p class="crc-warning">{{ $L('notEnrolledSecond', 'This student is not enrolled in the second exam, so the combined total is incomplete.') }}</p>
    @endif

    <p class="crc-formula">{{ $L('formulaHint') }}</p>

    <table class="crc-table">
        <thead>
            <tr>
                <th>{{ $L('subjectName', 'Subject') }}</th>
                <th class="num">{{ $examA['name'] ?? $L('examA', 'Exam A') }}</th>
                <th class="num">{{ $L('passingMark', 'Passing mark') }}</th>
                <th class="num">{{ $examB['name'] ?? $L('examB', 'Exam B') }}</th>
                <th class="num">{{ $L('passingMark', 'Passing mark') }}</th>
                <th class="num">{{ $L('combined', 'Combined') }}</th>
                <th class="num">{{ $L('combinedPassingMark', 'Combined passing mark') }}</th>
                <th class="num">{{ $L('result', 'Result') }}</th>
            </tr>
        </thead>
        <tbody>
            @foreach($subjects as $subject)
                @php
                    $a = $subject['exam_a'] ?? [];
                    $b = $subject['exam_b'] ?? [];
                    $cell = function (array $side) use ($L, $dash, $fmt) {
                        if (empty($side['enrolled'])) {
                            return $L('notInExam', 'Not in this exam');
                        }
                        if (!empty($side['is_absent'])) {
                            return $L('absent', 'Absent');
                        }
                        if (!empty($side['missing_mark']) || ($side['marks_obtained'] ?? null) === null) {
                            return $L('missingMark', 'Missing mark');
                        }
                        $total = $side['total_marks'] ?? null;
                        return $fmt($side['marks_obtained']).($total !== null ? ' / '.$fmt($total) : '');
                    };
                    $resultKey = 'incomplete';
                    if (!empty($subject['is_complete'])) {
                        $resultKey = !empty($subject['is_pass']) ? 'pass' : 'fail';
                    }
                @endphp
                <tr>
                    <td>{{ $subject['subject_name'] ?? $dash }}</td>
                    <td class="num {{ empty($a['enrolled']) || !empty($a['is_absent']) || !empty($a['missing_mark']) ? 'crc-missing' : '' }}">{{ $cell($a) }}</td>
                    <td class="num">{{ $fmt($a['passing_marks'] ?? null) }}</td>
                    <td class="num {{ empty($b['enrolled']) || !empty($b['is_absent']) || !empty($b['missing_mark']) ? 'crc-missing' : '' }}">{{ $cell($b) }}</td>
                    <td class="num">{{ $fmt($b['passing_marks'] ?? null) }}</td>
                    <td class="num {{ empty($subject['is_complete']) ? 'crc-missing' : '' }}">
                        @if(($subject['combined_obtained'] ?? null) === null)
                            {{ $L('incomplete', 'Incomplete') }}
                        @else
                            {{ $fmt($subject['combined_obtained']) }}@if(($subject['combined_total'] ?? null) !== null) / {{ $fmt($subject['combined_total']) }}@endif
                        @endif
                    </td>
                    <td class="num">{{ $fmt($subject['combined_passing'] ?? null) }}</td>
                    <td class="num crc-{{ $resultKey }}">{{ $L($resultKey, ucfirst($resultKey)) }}</td>
                </tr>
            @endforeach
            <tr class="crc-total">
                <td>{{ $L('grandTotal', 'Grand Total') }}</td>
                <td colspan="4"></td>
                <td class="num">
                    @if(($summary['is_complete'] ?? false) && ($summary['combined_obtained'] ?? null) !== null)
                        {{ $fmt($summary['combined_obtained']) }} / {{ $fmt($summary['combined_total'] ?? null) }}
                    @else
                        {{ $L('incompleteCombined', 'Incomplete — combined total is not final') }}
                    @endif
                </td>
                <td class="num">{{ ($summary['is_complete'] ?? false) ? $fmt($summary['combined_passing'] ?? null) : $dash }}</td>
                <td class="num crc-{{ $overall }}">{{ $L($overall, ucfirst($overall)) }}</td>
            </tr>
        </tbody>
    </table>

    <div class="crc-summary">
        <span>{{ $L('passedSubjects', 'Passed') }}: <strong class="num">{{ $summary['passed_subjects'] ?? 0 }}</strong></span>
        <span>{{ $L('failedSubjects', 'Failed') }}: <strong class="num">{{ $summary['failed_subjects'] ?? 0 }}</strong></span>
        <span>{{ $L('subjectsIncomplete', 'Incomplete subjects') }}: <strong class="num">{{ $summary['incomplete_subjects'] ?? 0 }}</strong></span>
        @if(($summary['overall_percentage'] ?? null) !== null)
            <span>{{ $L('overallPercentage', 'Overall Percentage') }}: <strong class="num">{{ $fmt($summary['overall_percentage']) }}%</strong></span>
        @endif
    </div>

    <div class="report-footer">
        <div class="footer-row">
            <div class="footer-left">{{ $SCHOOL_PHONE ?? '' }}</div>
            <div class="footer-center">{{ $SCHOOL_ADDRESS ?? '' }}</div>
            <div class="footer-right">
                {{ $L('dateIssued', 'Date Issued') }}: {{ $CURRENT_DATE ?? $CURRENT_DATETIME ?? '' }}
            </div>
        </div>
    </div>
</div>
@empty
    <p>{{ $dash }}</p>
@endforelse

<style>
    .crc-page { page-break-inside: avoid; }
    .crc-break { page-break-after: always; break-after: page; }
    .crc-photo { width: 42px; height: 52px; object-fit: cover; border: 1px solid #d4d4d8; }
    .crc-identity { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 8px 0; font-size: 0.92em; }
    .crc-identity span { display: block; color: #52525b; font-size: 0.85em; }
    .crc-period { font-style: normal; font-weight: 500; color: #3f3f46; }
    .crc-formula, .crc-warning { margin: 6px 0; font-size: 0.85em; line-height: 1.45; }
    .crc-warning { color: #92400e; font-weight: 600; }
    .crc-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .crc-table th, .crc-table td { border: 1px solid #d4d4d8; padding: 4px 6px; vertical-align: middle; }
    .crc-table th { background: #f4f4f5; font-weight: 700; }
    .crc-table td:first-child, .crc-table th:first-child { text-align: start; }
    .num { text-align: center; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    .crc-missing { color: #92400e; font-weight: 600; }
    .crc-pass { color: #166534; font-weight: 700; }
    .crc-fail { color: #b91c1c; font-weight: 700; }
    .crc-incomplete { color: #92400e; font-weight: 700; }
    .crc-total td { background: #fffbeb; font-weight: 700; }
    .crc-summary { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 8px; font-size: 0.9em; }
</style>
@endsection
