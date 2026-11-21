@extends('reports.base')

@section('content')
@php
    $labels = $labels ?? [];
    $L = fn (string $key, string $fallback = '') => $labels[$key] ?? $fallback;
    $cards = $cards ?? [];
    $dash = '—';
    $primary = $PRIMARY_COLOR ?? '#0b0b56';
    $accent = $ACCENT_COLOR ?? '#c9a227';
    $fmt = function ($value) use ($dash) {
        if ($value === null || $value === '') {
            return $dash;
        }
        $number = (float) $value;
        if (abs($number - round($number)) < 0.001) {
            return (string) (int) round($number);
        }
        return rtrim(rtrim(number_format($number, 1, '.', ''), '0'), '.');
    };
    $sideText = function (array $side) use ($L, $fmt) {
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
    $resultLabel = $L($overall, ucfirst($overall));
    $passingValues = [];
    $fullValues = [];
    foreach ($subjects as $subject) {
        if (($subject['combined_passing'] ?? null) !== null) {
            $passingValues[] = (float) $subject['combined_passing'];
        }
        if (($subject['combined_total'] ?? null) !== null) {
            $fullValues[] = (float) $subject['combined_total'];
        }
    }
    $passingUniform = $passingValues !== [] && count(array_unique($passingValues)) === 1;
    $fullUniform = $fullValues !== [] && count(array_unique($fullValues)) === 1;
    $minimumValue = $passingValues === []
        ? null
        : ($passingUniform ? $passingValues[0] : ($summary['combined_passing'] ?? null));
    $maximumValue = $fullUniform ? $fullValues[0] : ($summary['combined_total'] ?? null);
    $minimumLabel = $passingUniform ? $L('minimumMarks', 'Minimum marks') : $L('passingTotal', 'Passing total');
    $classLabel = trim(($student['class'] ?? '').(!empty($student['section']) ? ' — '.$student['section'] : ''));
    $schoolTitle = $SCHOOL_NAME_PASHTO ?? $SCHOOL_NAME ?? ($card['organization_name'] ?? '');
    $examTitle = trim(($examA['name'] ?? '').((!empty($examA['name']) && !empty($examB['name'])) ? ' + ' : '').($examB['name'] ?? ''));
    $attestKey = $overall === 'pass' ? 'attestation' : ($overall === 'fail' ? 'attestationFail' : 'attestationIncomplete');
    $attestHtml = e($L($attestKey, $L('attestation', '')));
    foreach ([
        'school' => $schoolTitle !== '' ? $schoolTitle : $dash,
        'student' => $student['full_name'] ?? $dash,
        'father' => $student['father_name'] ?? $dash,
        'exam' => $examTitle !== '' ? $examTitle : $dash,
        'grade' => $summary['overall_grade'] ?? $dash,
    ] as $token => $value) {
        $safe = e((string) $value);
        if ($token === 'student' || $token === 'father') {
            $safe = '<strong>'.$safe.'</strong>';
        }
        $attestHtml = str_replace('{'.$token.'}', $safe, $attestHtml);
    }
@endphp
<div class="kashf-page @if(!$loop->last) kashf-break @endif">
    <div class="kashf-frame">
        <header class="kashf-head">
            <div>
                @if(!empty($PRIMARY_LOGO_URI))
                    <img src="{!! $PRIMARY_LOGO_URI !!}" alt="" class="kashf-logo">
                @endif
            </div>
            <div class="kashf-head-text">
                @if($schoolTitle !== '')
                    <div class="kashf-school">{{ $schoolTitle }}</div>
                @endif
                <div class="kashf-title">{{ $L('kashfTitle', 'Kashf al-Darajat') }}</div>
                <div class="kashf-exam">{{ $examTitle }}@if(!empty($card['academic_year'])) — {{ $card['academic_year'] }}@endif</div>
            </div>
            <div>
                @if(!empty($student['picture_data_url']))
                    <img src="{{ $student['picture_data_url'] }}" alt="" class="kashf-photo">
                @endif
            </div>
        </header>

        <div class="kashf-identity">
            <div><span>{{ $L('fullName', 'Full Name') }}</span><strong>{{ $student['full_name'] ?? $dash }}</strong></div>
            <div><span>{{ $L('fatherName', 'Father Name') }}</span><strong>{{ $student['father_name'] ?? $dash }}</strong></div>
            <div><span>{{ $L('rollNumber', 'Roll Number') }}</span><strong class="num">{{ $student['roll_number'] ?? $dash }}</strong></div>
            <div><span>{{ $L('class', 'Class') }}</span><strong>{{ $classLabel !== '' ? $classLabel : $dash }}</strong></div>
            <div><span>{{ $L('examA', 'Exam A') }}</span><strong>{{ $examA['name'] ?? $dash }}</strong></div>
            <div><span>{{ $L('examB', 'Exam B') }}</span><strong>{{ $examB['name'] ?? $dash }}</strong></div>
        </div>

        @if(empty($card['enrolled_in_second_exam']))
            <p class="kashf-warn">{{ $L('notEnrolledSecond') }}</p>
        @endif

        <table class="kashf-table">
            <thead>
                <tr>
                    <th>{{ $L('subjectName', 'Subject') }}</th>
                    <th class="num">{{ $examA['name'] ?? $L('examA', 'Exam A') }}</th>
                    <th class="num">{{ $examB['name'] ?? $L('examB', 'Exam B') }}</th>
                    <th class="num">{{ $L('combined', 'Combined') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($subjects as $subject)
                    <tr>
                        <td>{{ $subject['subject_name'] ?? $dash }}</td>
                        <td class="num">{{ $sideText($subject['exam_a'] ?? []) }}</td>
                        <td class="num">{{ $sideText($subject['exam_b'] ?? []) }}</td>
                        <td class="num">
                            @if(($subject['combined_obtained'] ?? null) === null)
                                {{ $L('incomplete', 'Incomplete') }}
                            @else
                                {{ $fmt($subject['combined_obtained']) }}@if(($subject['combined_total'] ?? null) !== null) / {{ $fmt($subject['combined_total']) }}@endif
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <div class="kashf-totals">
            <div><span>{{ $minimumLabel }}</span><strong class="num">{{ $fmt($minimumValue) }}</strong></div>
            <div><span>{{ $L('maximumMarks', 'Full marks') }}</span><strong class="num">{{ $fmt($maximumValue) }}</strong></div>
            <div><span>{{ $L('obtainedMarks', 'Marks obtained') }}</span><strong class="num">{{ $fmt($summary['combined_obtained'] ?? null) }}</strong></div>
            <div><span>{{ $L('totalMarks', 'Total marks') }}</span><strong class="num">{{ $fmt($summary['combined_total'] ?? null) }}</strong></div>
            <div><span>{{ $L('overallPercentage', 'Overall Percentage') }}</span><strong class="num">{{ isset($summary['overall_percentage']) ? $fmt($summary['overall_percentage']).'%' : $dash }}</strong></div>
            <div><span>{{ $L('overallGrade', 'Overall Grade') }}</span><strong>{{ $summary['overall_grade'] ?? $dash }}</strong></div>
            @if(isset($summary['marks_cut']))
                <div><span>{{ $L('absenceCount', 'Absences') }}</span><strong class="num">{{ $summary['absence_count'] ?? 0 }}</strong></div>
                <div><span>{{ $L('marksCut', 'Marks Cut') }}</span><strong class="num">{{ $fmt($summary['marks_cut']) }}</strong></div>
            @endif
            <div class="kashf-verdict kashf-{{ $overall }}"><span>{{ $L('overallResult', 'Overall Result') }}</span><strong>{{ $resultLabel }}</strong></div>
        </div>

        <p class="kashf-attest">{!! $attestHtml !!}</p>
        <p class="kashf-conduct">{{ $L('attestationConduct') }}</p>

        <div class="kashf-signs">
            <div><i></i>{{ $L('principal', 'Principal') }}</div>
            <div><i></i>{{ $L('schoolSeal', 'School seal') }}</div>
        </div>
    </div>
</div>
@empty
<p>{{ $dash }}</p>
@endforelse

<style>
    html, body { height: 100%; }
    .kashf-page { min-height: 100%; }
    .kashf-break { page-break-after: always; break-after: page; }
    .kashf-frame {
        box-sizing: border-box;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        border: 2.5px solid {{ $primary }};
        box-shadow: inset 0 0 0 1px {{ $accent }}, inset 0 0 0 5px #fff, inset 0 0 0 6.5px {{ $accent }};
        padding: 10px 8px 8px;
        font-size: 14px;
        line-height: 1.35;
    }
    .kashf-head { display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; text-align: center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 4px; }
    .kashf-logo { max-height: 48px; max-width: 48px; object-fit: contain; }
    .kashf-photo { width: 44px; height: 54px; object-fit: cover; border: 1px solid {{ $primary }}; }
    .kashf-school { font-size: 14px; font-weight: 800; color: {{ $primary }}; line-height: 1.3; }
    .kashf-title { font-size: 14px; font-weight: 800; margin-top: 2px; }
    .kashf-exam { font-size: 14px; margin-top: 2px; }
    .kashf-identity { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 8px; margin: 6px 0; font-size: 14px; }
    .kashf-identity span { display: block; color: #52525b; font-size: 14px; }
    .kashf-warn, .kashf-raw { margin: 4px 0; color: #92400e; font-size: 14px; font-weight: 700; }
    .kashf-table { width: 100%; border-collapse: collapse; }
    .kashf-table th, .kashf-table td { border: 1px solid #c4c4cc; padding: 2px 4px; font-size: 14px; }
    .kashf-table th { background: {{ $primary }}; color: #fff; }
    .num { text-align: center; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    .kashf-totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin-top: 6px; }
    .kashf-totals > div { border: 1px solid #e4e4e7; padding: 2px 3px; text-align: center; background: #fafafa; }
    .kashf-totals span { display: block; font-size: 14px; color: #52525b; }
    .kashf-totals strong { display: block; font-size: 14px; color: {{ $primary }}; }
    .kashf-verdict.kashf-pass { background: #ecfdf3; color: #166534; }
    .kashf-verdict.kashf-fail { background: #fef2f2; color: #b91c1c; }
    .kashf-verdict.kashf-incomplete { background: #fffbeb; color: #92400e; }
    .kashf-attest, .kashf-conduct { margin: 6px 0 0; font-size: 14px; line-height: 1.45; text-align: justify; }
    .kashf-conduct { color: #3f3f46; }
    .kashf-signs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 6px; text-align: center; font-size: 14px; font-weight: 700; }
    .kashf-signs i { display: block; height: 16mm; border-bottom: 1px solid {{ $primary }}; margin-bottom: 2px; }
</style>
@endsection
