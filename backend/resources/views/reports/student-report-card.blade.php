@extends('reports.base')

@section('content')
@php
    $labels = $labels ?? [];
    $L = fn (string $key, string $fallback = '') => $labels[$key] ?? $fallback;
    $cards = $cards ?? [];
    $dash = '—';
    $primary = $PRIMARY_COLOR ?? '#0b0b56';
    $secondary = $SECONDARY_COLOR ?? '#0056b3';
    $accent = $ACCENT_COLOR ?? '#c9a227';
    $logoMax = ($logo_height_px ?? 56).'px';
@endphp

@if(!empty($WATERMARK))
    <div class="watermark">
        @if(($WATERMARK['wm_type'] ?? null) === 'image' && !empty($WATERMARK['image_data_uri']))
            <img src="{{ $WATERMARK['image_data_uri'] }}" alt="Watermark" class="watermark-image">
        @elseif(!empty($WATERMARK['text']))
            <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
        @elseif(!empty($WATERMARK['image_url']))
            <img src="{{ $WATERMARK['image_url'] }}" class="watermark-image" alt="Watermark">
        @endif
    </div>
@endif

@forelse($cards as $card)
@php
    $student = $card['student'] ?? [];
    $exam = $card['exam'] ?? [];
    $subjects = $card['subjects'] ?? [];
    $summary = $card['summary'] ?? [];
    $overallResult = $summary['overall_result'] ?? null;
    $resultKey = strtolower((string) $overallResult);
    if (!in_array($resultKey, ['pass', 'fail', 'incomplete'], true)) {
        $resultKey = 'fail';
    }
    $resultLabel = $L($resultKey, $overallResult ?: $dash);
    $classLabel = trim(($student['class'] ?? '').(!empty($student['section']) ? ' — '.$student['section'] : ''));
@endphp

<div class="src-page @if(!$loop->last) src-page-break @endif">
    {{-- Standard branded header (same pattern as other reports) --}}
    <div class="report-header">
        <div class="header-left">
            @php
                $leftLogos = [];
                if (($show_primary_logo ?? true) && !empty($PRIMARY_LOGO_URI) && ($primary_logo_position ?? 'left') === 'left') {
                    $leftLogos[] = ['uri' => $PRIMARY_LOGO_URI, 'alt' => 'Primary Logo'];
                }
                if (($show_secondary_logo ?? false) && !empty($SECONDARY_LOGO_URI) && ($secondary_logo_position ?? 'right') === 'left') {
                    $leftLogos[] = ['uri' => $SECONDARY_LOGO_URI, 'alt' => 'Secondary Logo'];
                }
                if (($show_ministry_logo ?? false) && !empty($MINISTRY_LOGO_URI) && ($ministry_logo_position ?? 'right') === 'left') {
                    $leftLogos[] = ['uri' => $MINISTRY_LOGO_URI, 'alt' => 'Ministry Logo'];
                }
                // Fallbacks used by some custom templates
                if (empty($leftLogos) && !empty($PRIMARY_LOGO)) {
                    $leftLogos[] = ['uri' => $PRIMARY_LOGO, 'alt' => 'Primary Logo'];
                }
            @endphp
            @foreach($leftLogos as $logo)
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="max-height: {{ $logoMax }};">
            @endforeach
        </div>

        <div class="header-center">
            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'above_school_name')
                <div class="header-text">{{ $header_text }}</div>
            @endif

            @if(!empty($SCHOOL_NAME_PASHTO))
                <div class="school-name">{{ $SCHOOL_NAME_PASHTO }}</div>
            @elseif(!empty($SCHOOL_NAME))
                <div class="school-name">{{ $SCHOOL_NAME }}</div>
            @endif

            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'below_school_name')
                <div class="header-text">{{ $header_text }}</div>
            @endif

            <div class="report-title">{{ $TABLE_TITLE ?? $L('reportTitle', 'Student Report Card') }}</div>

            @if(!empty($exam['name']) || !empty($exam['academic_year']))
                <div class="header-text src-exam-line">
                    {{ $exam['name'] ?? '' }}
                    @if(!empty($exam['name']) && !empty($exam['academic_year'])) — @endif
                    {{ $exam['academic_year'] ?? '' }}
                </div>
            @endif

            @if(!empty($header_html))
                <div class="custom-header">{!! $header_html !!}</div>
            @endif
        </div>

        <div class="header-right">
            @php
                $rightLogos = [];
                if (($show_primary_logo ?? true) && !empty($PRIMARY_LOGO_URI) && ($primary_logo_position ?? 'left') === 'right') {
                    $rightLogos[] = ['uri' => $PRIMARY_LOGO_URI, 'alt' => 'Primary Logo'];
                }
                if (($show_secondary_logo ?? false) && !empty($SECONDARY_LOGO_URI) && ($secondary_logo_position ?? 'right') === 'right') {
                    $rightLogos[] = ['uri' => $SECONDARY_LOGO_URI, 'alt' => 'Secondary Logo'];
                }
                if (($show_ministry_logo ?? false) && !empty($MINISTRY_LOGO_URI) && ($ministry_logo_position ?? 'right') === 'right') {
                    $rightLogos[] = ['uri' => $MINISTRY_LOGO_URI, 'alt' => 'Ministry Logo'];
                }
                if (empty($rightLogos) && !empty($SECONDARY_LOGO)) {
                    $rightLogos[] = ['uri' => $SECONDARY_LOGO, 'alt' => 'Secondary Logo'];
                }
            @endphp
            @foreach($rightLogos as $logo)
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="max-height: {{ $logoMax }};">
            @endforeach
        </div>
    </div>

    @if(!empty($NOTES_HEADER))
        <div class="notes-section header-notes">
            @foreach($NOTES_HEADER as $note)
                <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
            @endforeach
        </div>
    @endif

    <div class="src-body">
        <section class="src-identity">
            <div class="src-photo-wrap">
                @if(!empty($student['picture_data_url']))
                    <img src="{{ $student['picture_data_url'] }}" alt="" class="src-photo">
                @else
                    <div class="src-photo src-photo-fallback">{{ mb_substr($student['full_name'] ?? 'S', 0, 1) }}</div>
                @endif
                <div class="src-photo-caption">{{ $L('studentPhoto', 'Student Photo') }}</div>
            </div>
            <div class="src-facts">
                <div class="src-fact">
                    <span>{{ $L('fullName', 'Full Name') }}</span>
                    <strong>{{ $student['full_name'] ?? $dash }}</strong>
                </div>
                <div class="src-fact">
                    <span>{{ $L('fatherName', 'Father Name') }}</span>
                    <strong>{{ $student['father_name'] ?? $dash }}</strong>
                </div>
                <div class="src-fact">
                    <span>{{ $L('class', 'Class') }}</span>
                    <strong>{{ $classLabel !== '' ? $classLabel : $dash }}</strong>
                </div>
                <div class="src-fact">
                    <span>{{ $L('rollNumber', 'Roll Number') }}</span>
                    <strong>{{ $student['roll_number'] ?? $dash }}</strong>
                </div>
                <div class="src-fact">
                    <span>{{ $L('admissionNo', 'Admission No') }}</span>
                    <strong>{{ $student['admission_no'] ?? $dash }}</strong>
                </div>
                <div class="src-fact">
                    <span>{{ $L('dateOfBirth', 'Date of Birth') }}</span>
                    <strong>{{ $student['birth_date_formatted'] ?? ($student['birth_date'] ?? $dash) }}</strong>
                </div>
            </div>
        </section>

        <table class="data-table src-marks">
            <thead>
                <tr>
                    <th style="width: 8%;">#</th>
                    <th>{{ $L('subjectName', 'Subject') }}</th>
                    <th style="width: 14%;">{{ $L('maxMarks', 'Max Marks') }}</th>
                    <th style="width: 14%;">{{ $L('marksObtained', 'Marks Obtained') }}</th>
                    <th style="width: 12%;">{{ $L('percentage', 'Percentage') }}</th>
                    <th style="width: 12%;">{{ $L('grade', 'Grade') }}</th>
                </tr>
            </thead>
            <tbody>
                @foreach($subjects as $i => $subject)
                @php
                    $isAbsent = !empty($subject['is_absent']);
                    $marks = $subject['marks'] ?? [];
                    $subjectPass = $subject['is_pass'] ?? null;
                @endphp
                <tr>
                    <td class="text-center">{{ $i + 1 }}</td>
                    <td>{{ $subject['subject']['name'] ?? ($subject['name'] ?? $dash) }}</td>
                    <td class="text-center">{{ $marks['total'] ?? $dash }}</td>
                    <td class="text-center @if($subjectPass === true) src-pass @elseif($subjectPass === false) src-fail @endif">
                        @if($isAbsent)
                            {{ $L('absent', 'Absent') }}
                        @else
                            {{ $marks['obtained'] ?? $dash }}
                        @endif
                    </td>
                    <td class="text-center">
                        @if($isAbsent || !isset($marks['percentage']) || $marks['percentage'] === null)
                            {{ $dash }}
                        @else
                            {{ number_format((float) $marks['percentage'], 1) }}%
                        @endif
                    </td>
                    <td class="text-center">{{ $subject['grade_name'] ?? $dash }}</td>
                </tr>
                @endforeach
            </tbody>
            <tfoot>
                <tr class="totals-row">
                    <td colspan="2"><strong>{{ $L('grandTotal', 'Grand Total') }}</strong></td>
                    <td class="text-center"><strong>{{ $summary['total_maximum_marks'] ?? $dash }}</strong></td>
                    <td class="text-center"><strong>{{ $summary['total_marks_obtained'] ?? $dash }}</strong></td>
                    <td class="text-center">
                        <strong>
                            @if(isset($summary['overall_percentage']))
                                {{ number_format((float) $summary['overall_percentage'], 1) }}%
                            @else
                                {{ $dash }}
                            @endif
                        </strong>
                    </td>
                    <td class="text-center"><strong>{{ $summary['overall_grade'] ?? $dash }}</strong></td>
                </tr>
            </tfoot>
        </table>

        <section class="src-result-bar src-result-{{ $resultKey }}">
            <div class="src-stat">
                <span>{{ $L('overallPercentage', 'Overall Percentage') }}</span>
                <strong>
                    @if(isset($summary['overall_percentage']))
                        {{ number_format((float) $summary['overall_percentage'], 1) }}%
                    @else
                        {{ $dash }}
                    @endif
                </strong>
            </div>
            <div class="src-stat">
                <span>{{ $L('overallGrade', 'Overall Grade') }}</span>
                <strong>{{ $summary['overall_grade'] ?? $dash }}</strong>
            </div>
            <div class="src-stat src-verdict">
                <span>{{ $L('overallResult', 'Overall Result') }}</span>
                <strong>{{ $resultLabel }}</strong>
            </div>
            @if(isset($summary['marks_cut']))
                <div class="src-stat src-penalty">
                    <span>{{ $L('absenceCount', 'Absences') }}: {{ $summary['absence_count'] ?? 0 }}</span>
                    <strong>{{ $L('marksCut', 'Marks Cut') }}: {{ $summary['marks_cut'] }}</strong>
                </div>
            @endif
        </section>

        @if(!empty($NOTES_BODY))
            <div class="notes-section body-notes">
                @foreach($NOTES_BODY as $note)
                    <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
                @endforeach
            </div>
        @endif

        <section class="src-signatures">
            <div class="src-sig"><i></i>{{ $L('classTeacher', 'Class Teacher') }}</div>
            <div class="src-sig"><i></i>{{ $L('principal', 'Principal') }}</div>
            <div class="src-sig"><i></i>{{ $L('parent', 'Parent / Guardian') }}</div>
        </section>
    </div>

    {{-- Standard branded footer --}}
    <div class="report-footer">
        @if(!empty($footer_text))
            <div class="footer-text">{{ $footer_text }}</div>
        @endif

        <div class="footer-row">
            <div class="footer-left">
                @if(!empty($SCHOOL_PHONE))
                    {{ $SCHOOL_PHONE }}
                @endif
                @if(!empty($SCHOOL_EMAIL))
                    @if(!empty($SCHOOL_PHONE)) · @endif
                    {{ $SCHOOL_EMAIL }}
                @endif
            </div>
            <div class="footer-center">
                @if(!empty($SCHOOL_WEBSITE))
                    {{ $SCHOOL_WEBSITE }}
                @endif
            </div>
            <div class="footer-right">
                @if($show_generation_date ?? true)
                    {{ $L('dateIssued', 'Date Issued') }}: {{ $CURRENT_DATE ?? ($CURRENT_DATETIME ?? now()->format('Y-m-d')) }}
                @endif
            </div>
        </div>

        @if(!empty($SCHOOL_ADDRESS))
            <div class="footer-row">
                <div class="footer-left"></div>
                <div class="footer-center">{{ $SCHOOL_ADDRESS }}</div>
                <div class="footer-right"></div>
            </div>
        @endif

        @if(!empty($footer_html))
            <div class="custom-footer">{!! $footer_html !!}</div>
        @endif

        @if(!empty($NOTES_FOOTER))
            <div class="notes-section footer-notes">
                @foreach($NOTES_FOOTER as $note)
                    <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
                @endforeach
            </div>
        @endif

        <div class="system-note">
            دا راپور د ناظم سیستم په مټ جوړ شوی دی.
        </div>
    </div>
</div>
@empty
<div class="src-empty">{{ $L('reportTitle', 'Student Report Card') }}</div>
@endforelse

<style>
    .src-page {
        min-height: calc(210mm - 18mm);
        display: flex;
        flex-direction: column;
    }
    .src-page-break {
        page-break-after: always;
        break-after: page;
    }
    .src-page .report-header {
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom-width: 2.5px;
        border-bottom-color: {{ $primary }};
    }
    .src-page .school-name {
        font-size: 15px;
        line-height: 1.3;
    }
    .src-page .report-title {
        font-size: 12px;
        margin-top: 2px;
        color: {{ $secondary }};
    }
    .src-exam-line {
        margin-top: 2px;
        font-size: 10px;
    }
    .src-body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .src-identity {
        display: flex;
        gap: 12px;
        align-items: stretch;
        padding: 8px 10px;
        border: 1px solid {{ $primary }}33;
        border-radius: 8px;
        background: linear-gradient(180deg, {{ $primary }}0F 0%, #ffffff 70%);
    }
    .src-photo-wrap {
        width: 72px;
        flex-shrink: 0;
        text-align: center;
    }
    .src-photo {
        width: 68px;
        height: 84px;
        object-fit: cover;
        border-radius: 6px;
        border: 2px solid {{ $accent }};
        background: #f4f1e8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 800;
        color: {{ $primary }};
        margin: 0 auto;
    }
    .src-photo-caption {
        font-size: 8px;
        color: #666;
        margin-top: 3px;
    }
    .src-facts {
        flex: 1;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        align-content: center;
    }
    .src-fact span {
        display: block;
        font-size: 8.5px;
        color: {{ $secondary }};
        font-weight: 700;
    }
    .src-fact strong {
        display: block;
        font-size: 11px;
        color: #1c2430;
        line-height: 1.25;
    }
    .src-marks {
        width: 100%;
        margin: 0;
        font-size: 10px;
    }
    .src-marks th {
        background-color: {{ $primary }} !important;
        padding: 6px 4px !important;
        font-size: 9.5px !important;
    }
    .src-marks td {
        padding: 5px 4px !important;
        font-size: 10px !important;
    }
    .src-marks tbody tr:nth-child(even) td {
        background: {{ $primary }}0A;
    }
    .src-pass { color: #0f7a45; font-weight: 700; }
    .src-fail { color: #b42318; font-weight: 700; }
    .text-center { text-align: center; }
    .src-result-bar {
        display: flex;
        border: 1.5px solid {{ $primary }}40;
        border-radius: 8px;
        overflow: hidden;
        margin-top: 2px;
    }
    .src-stat {
        flex: 1;
        padding: 8px 6px;
        text-align: center;
        background: #f8fafc;
    }
    .src-stat + .src-stat {
        border-inline-start: 1px solid {{ $primary }}22;
    }
    .src-stat span {
        display: block;
        font-size: 8.5px;
        color: #5c6570;
        font-weight: 700;
        margin-bottom: 2px;
    }
    .src-stat strong {
        display: block;
        font-size: 14px;
        color: {{ $primary }};
        line-height: 1.2;
    }
    .src-verdict strong { font-size: 15px; }
    .src-result-pass .src-verdict { background: #e8f7ee; }
    .src-result-pass .src-verdict strong { color: #0f7a45; }
    .src-result-fail .src-verdict { background: #fdecec; }
    .src-result-fail .src-verdict strong { color: #b42318; }
    .src-result-incomplete .src-verdict { background: #fff6e0; }
    .src-result-incomplete .src-verdict strong { color: #8a5a00; }
    .src-penalty strong { font-size: 11px; color: #5c6570; }
    .src-signatures {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 14px;
        margin-top: auto;
        padding-top: 10px;
        text-align: center;
        font-size: 10px;
        font-weight: 700;
        color: #3d4654;
    }
    .src-sig i {
        display: block;
        height: 28px;
        border-bottom: 1.5px solid {{ $primary }};
        margin-bottom: 4px;
    }
    .src-page .report-footer {
        margin-top: 10px;
        padding-top: 8px;
    }
    .src-empty {
        padding: 24px;
        text-align: center;
    }
</style>
@endsection
