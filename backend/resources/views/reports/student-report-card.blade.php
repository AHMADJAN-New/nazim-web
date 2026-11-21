@extends('reports.base')

@section('content')
@php
    $labels = $labels ?? [];
    $L = fn (string $key, string $fallback = '') => $labels[$key] ?? $fallback;
    $cards = $cards ?? [];
    $dash = '—';
    $primary = $PRIMARY_COLOR ?? '#0b0b56';
    $accent = $ACCENT_COLOR ?? '#c9a227';
    $logoMax = ($logo_height_px ?? 48).'px';
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
@endphp

@if(!empty($WATERMARK))
    <div class="watermark">
        @if(($WATERMARK['wm_type'] ?? null) === 'image' && !empty($WATERMARK['image_data_uri']))
            <img src="{{ $WATERMARK['image_data_uri'] }}" alt="" class="watermark-image">
        @elseif(!empty($WATERMARK['text']))
            <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
        @endif
    </div>
@endif

@forelse($cards as $card)
@php
    $student = $card['student'] ?? [];
    $exam = $card['exam'] ?? [];
    $subjects = array_values($card['subjects'] ?? []);
    $summary = $card['summary'] ?? [];
    $overallResult = $summary['overall_result'] ?? null;
    $resultKey = strtolower((string) $overallResult);
    if (!in_array($resultKey, ['pass', 'fail', 'incomplete'], true)) {
        $resultKey = 'fail';
    }
    $resultLabel = $L($resultKey, $overallResult ?: $dash);
    $classLabel = trim(($student['class'] ?? '').(!empty($student['section']) ? ' — '.$student['section'] : ''));
    $schoolTitle = $SCHOOL_NAME_PASHTO ?? $SCHOOL_NAME ?? '';
    $half = (int) ceil(max(count($subjects), 1) / 2);
    $leftSubjects = array_slice($subjects, 0, $half);
    $rightSubjects = array_slice($subjects, $half);
    $rowCount = max(count($leftSubjects), count($rightSubjects));
    $passingValues = [];
    $fullValues = [];
    foreach ($subjects as $subject) {
        $marks = $subject['marks'] ?? [];
        if (($marks['passing'] ?? null) !== null && $marks['passing'] !== '') {
            $passingValues[] = (float) $marks['passing'];
        }
        if (($marks['total'] ?? null) !== null && $marks['total'] !== '') {
            $fullValues[] = (float) $marks['total'];
        }
    }
    $passingUniform = $passingValues !== [] && count(array_unique($passingValues)) === 1;
    $fullUniform = $fullValues !== [] && count(array_unique($fullValues)) === 1;
    $minimumValue = $passingUniform ? $passingValues[0] : ($passingValues === [] ? null : array_sum($passingValues));
    $minimumLabel = $passingUniform ? $L('minimumMarks', 'Minimum marks') : $L('passingTotal', 'Passing total');
    $maximumValue = $fullUniform ? $fullValues[0] : ($summary['total_maximum_marks'] ?? null);
    $attestKey = $resultKey === 'pass' ? 'attestation' : ($resultKey === 'fail' ? 'attestationFail' : 'attestationIncomplete');
    $attestHtml = e($L($attestKey, $L('attestation', '')));
    foreach ([
        'school' => $schoolTitle !== '' ? $schoolTitle : $dash,
        'student' => $student['full_name'] ?? $dash,
        'father' => $student['father_name'] ?? $dash,
        'exam' => $exam['name'] ?? $dash,
        'grade' => $summary['overall_grade'] ?? $dash,
    ] as $token => $value) {
        $safe = e((string) $value);
        if ($token === 'student' || $token === 'father') {
            $safe = '<strong>'.$safe.'</strong>';
        }
        $attestHtml = str_replace('{'.$token.'}', $safe, $attestHtml);
    }
    $markBits = function (?array $subject) use ($L, $dash, $fmt) {
        if ($subject === null) {
            return ['main' => '', 'meta' => '', 'tone' => ''];
        }
        $marks = $subject['marks'] ?? [];
        $pass = $subject['is_pass'] ?? null;
        $tone = $pass === true ? 'pass' : ($pass === false ? 'fail' : '');
        if (!empty($subject['is_absent'])) {
            return ['main' => $L('absent', 'Absent'), 'meta' => '', 'tone' => 'fail'];
        }
        if (($marks['obtained'] ?? null) === null) {
            return ['main' => $dash, 'meta' => '', 'tone' => ''];
        }
        $total = $marks['total'] ?? null;
        $metaParts = [];
        if (($marks['percentage'] ?? null) !== null) {
            $metaParts[] = $fmt($marks['percentage']).'%';
        }
        if (!empty($subject['grade_name'])) {
            $metaParts[] = $subject['grade_name'];
        }
        return [
            'main' => $fmt($marks['obtained']).($total !== null ? ' / '.$fmt($total) : ''),
            'meta' => implode(' · ', $metaParts),
            'tone' => $tone,
        ];
    };
@endphp
<div class="kashf-page @if(!$loop->last) kashf-break @endif">
    <div class="kashf-frame">
        <header class="kashf-head">
            <div class="kashf-logos">
                @if(!empty($PRIMARY_LOGO_URI))
                    <img src="{!! $PRIMARY_LOGO_URI !!}" alt="" style="max-height: {{ $logoMax }};">
                @endif
            </div>
            <div class="kashf-head-text">
                @if($schoolTitle !== '')
                    <div class="kashf-school">{{ $schoolTitle }}</div>
                @endif
                <div class="kashf-title">{{ $L('kashfTitle', 'Kashf al-Darajat') }}</div>
                <div class="kashf-exam">
                    {{ $exam['name'] ?? '' }}
                    @if(!empty($exam['name']) && !empty($exam['academic_year'])) — @endif
                    {{ $exam['academic_year'] ?? '' }}
                </div>
            </div>
            <div class="kashf-logos">
                @if(!empty($student['picture_data_url']))
                    <img src="{{ $student['picture_data_url'] }}" alt="" class="kashf-photo">
                @elseif(!empty($SECONDARY_LOGO_URI))
                    <img src="{!! $SECONDARY_LOGO_URI !!}" alt="" style="max-height: {{ $logoMax }};">
                @endif
            </div>
        </header>

        <div class="kashf-identity">
            <div><span>{{ $L('fullName', 'Full Name') }}</span><strong>{{ $student['full_name'] ?? $dash }}</strong></div>
            <div><span>{{ $L('fatherName', 'Father Name') }}</span><strong>{{ $student['father_name'] ?? $dash }}</strong></div>
            <div><span>{{ $L('rollNumber', 'Roll Number') }}</span><strong class="num">{{ $student['roll_number'] ?? $dash }}</strong></div>
            <div><span>{{ $L('class', 'Class') }}</span><strong>{{ $classLabel !== '' ? $classLabel : $dash }}</strong></div>
            <div><span>{{ $L('admissionNo', 'Admission No') }}</span><strong class="num">{{ $student['admission_no'] ?? $dash }}</strong></div>
            <div><span>{{ $L('dateOfBirth', 'Date of Birth') }}</span><strong>{{ $student['birth_date_formatted'] ?? ($student['birth_date'] ?? $dash) }}</strong></div>
        </div>

        <table class="kashf-table">
            <thead>
                <tr>
                    <th>{{ $L('subjectName', 'Subject') }}</th>
                    <th class="num">{{ $L('marks', 'Marks') }}</th>
                    <th>{{ $L('subjectName', 'Subject') }}</th>
                    <th class="num">{{ $L('marks', 'Marks') }}</th>
                </tr>
            </thead>
            <tbody>
                @for($i = 0; $i < $rowCount; $i++)
                    @php
                        $left = $markBits($leftSubjects[$i] ?? null);
                        $right = $markBits($rightSubjects[$i] ?? null);
                        $leftName = $leftSubjects[$i]['subject']['name'] ?? ($leftSubjects[$i]['name'] ?? '');
                        $rightName = $rightSubjects[$i]['subject']['name'] ?? ($rightSubjects[$i]['name'] ?? '');
                    @endphp
                    <tr>
                        <td>{{ $leftName !== '' ? $leftName : ($rowCount > 0 ? $dash : '') }}</td>
                        <td class="num kashf-{{ $left['tone'] }}">
                            <div>{{ $left['main'] !== '' ? $left['main'] : $dash }}</div>
                            @if($left['meta'] !== '')<div class="kashf-meta">{{ $left['meta'] }}</div>@endif
                        </td>
                        <td>{{ $rightName }}</td>
                        <td class="num kashf-{{ $right['tone'] }}">
                            @if($right['main'] !== '')
                                <div>{{ $right['main'] }}</div>
                                @if($right['meta'] !== '')<div class="kashf-meta">{{ $right['meta'] }}</div>@endif
                            @endif
                        </td>
                    </tr>
                @endfor
            </tbody>
        </table>

        <div class="kashf-totals">
            <div><span>{{ $minimumLabel }}</span><strong class="num">{{ $fmt($minimumValue) }}</strong></div>
            <div><span>{{ $L('maximumMarks', 'Full marks') }}</span><strong class="num">{{ $fmt($maximumValue) }}</strong></div>
            <div><span>{{ $L('obtainedMarks', 'Marks obtained') }}</span><strong class="num">{{ $fmt($summary['total_marks_obtained'] ?? null) }}</strong></div>
            <div><span>{{ $L('totalMarks', 'Total marks') }}</span><strong class="num">{{ $fmt($summary['total_maximum_marks'] ?? null) }}</strong></div>
            <div><span>{{ $L('overallPercentage', 'Overall Percentage') }}</span><strong class="num">{{ isset($summary['overall_percentage']) ? $fmt($summary['overall_percentage']).'%' : $dash }}</strong></div>
            <div><span>{{ $L('overallGrade', 'Overall Grade') }}</span><strong>{{ $summary['overall_grade'] ?? $dash }}</strong></div>
            @if(isset($summary['marks_cut']))
                <div><span>{{ $L('absenceCount', 'Absences') }}</span><strong class="num">{{ $summary['absence_count'] ?? 0 }}</strong></div>
                <div><span>{{ $L('marksCut', 'Marks Cut') }}</span><strong class="num">{{ $fmt($summary['marks_cut']) }}</strong></div>
            @endif
            <div class="kashf-verdict kashf-{{ $resultKey }}"><span>{{ $L('overallResult', 'Overall Result') }}</span><strong>{{ $resultLabel }}</strong></div>
        </div>

        <p class="kashf-attest">{!! $attestHtml !!}</p>
        <p class="kashf-conduct">{{ $L('attestationConduct') }}</p>

        <div class="kashf-signs">
            <div><i></i>{{ $L('principal', 'Principal') }}</div>
            <div><i></i>{{ $L('schoolSeal', 'School seal') }}</div>
        </div>

        <footer class="kashf-foot">
            <span>{{ $SCHOOL_ADDRESS ?? '' }}</span>
            <span>
                @if($show_generation_date ?? true)
                    {{ $L('dateIssued', 'Date Issued') }}: {{ $CURRENT_DATE ?? ($CURRENT_DATETIME ?? '') }}
                @endif
            </span>
        </footer>
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
    .kashf-head { display: grid; grid-template-columns: 52px 1fr 52px; align-items: center; gap: 4px; text-align: center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 4px; }
    .kashf-logos img { max-width: 48px; object-fit: contain; }
    .kashf-photo { width: 44px; height: 54px; object-fit: cover; border: 1px solid {{ $primary }}; }
    .kashf-school { font-size: 14px; font-weight: 800; color: {{ $primary }}; line-height: 1.3; }
    .kashf-title { font-size: 14px; font-weight: 800; margin-top: 2px; }
    .kashf-exam { font-size: 14px; margin-top: 2px; }
    .kashf-identity { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px 6px; margin: 6px 0; font-size: 14px; }
    .kashf-identity span { display: block; color: #52525b; font-size: 14px; }
    .kashf-table { width: 100%; border-collapse: collapse; }
    .kashf-table th, .kashf-table td { border: 1px solid #c4c4cc; padding: 2px 4px; vertical-align: middle; font-size: 14px; }
    .kashf-table th { background: {{ $primary }}; color: #fff; font-weight: 700; }
    .kashf-table td:nth-child(2) { border-inline-end-width: 2px; border-inline-end-color: {{ $accent }}; }
    .num { text-align: center; direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
    .kashf-meta { font-size: 14px; color: #3f3f46; font-weight: 600; }
    .kashf-pass { color: #166534; font-weight: 700; }
    .kashf-fail { color: #b91c1c; font-weight: 700; }
    .kashf-totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; margin-top: 6px; }
    .kashf-totals > div { border: 1px solid #e4e4e7; padding: 2px 3px; text-align: center; background: #fafafa; }
    .kashf-totals span { display: block; font-size: 14px; color: #52525b; }
    .kashf-totals strong { display: block; font-size: 14px; color: {{ $primary }}; }
    .kashf-verdict.kashf-pass { background: #ecfdf3; }
    .kashf-verdict.kashf-fail { background: #fef2f2; }
    .kashf-verdict.kashf-incomplete { background: #fffbeb; color: #92400e; }
    .kashf-attest, .kashf-conduct { margin: 6px 0 0; font-size: 14px; line-height: 1.45; }
    .kashf-conduct { color: #3f3f46; }
    .kashf-signs { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 6px; text-align: center; font-size: 14px; font-weight: 700; }
    .kashf-signs i { display: block; height: 16mm; border-bottom: 1px solid {{ $primary }}; margin-bottom: 2px; }
    .kashf-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 4px; padding-top: 3px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #52525b; }
</style>
@endsection
