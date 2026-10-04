@extends('reports.base')

@section('content')
@php
    $isRtl = \App\Services\Reports\LeaveRequestSlipLabels::isRtl((string) ($language ?? 'ps'));
    $dir = $isRtl ? 'rtl' : 'ltr';
    $labels = $labels ?? [];
    $slip = $slip ?? [];
    $baseFontSize = isset($FONT_SIZE) && !empty($FONT_SIZE) ? intval(str_replace(['px', 'pt'], '', $FONT_SIZE)) : 7;
    $status = $slip['status'] ?? 'pending';
    $statusClass = match ($status) {
        'approved' => 'status-approved',
        'rejected' => 'status-rejected',
        'cancelled' => 'status-cancelled',
        default => 'status-pending',
    };
@endphp
<style>
    .leave-slip {
        direction: {{ $dir }};
        color: #12143a;
        font-size: {{ $baseFontSize }}px;
        line-height: 1.3;
    }
    .leave-slip .report-header {
        margin-bottom: 4px;
        padding-bottom: 4px;
        border-bottom-width: 1px;
    }
    .leave-slip .header-logo {
        max-height: 26px !important;
    }
    .leave-slip .school-name {
        font-size: {{ max(9, $baseFontSize + 2) }}px;
        margin-bottom: 0;
        line-height: 1.1;
    }
    .leave-slip .report-title {
        font-size: {{ max(8, $baseFontSize + 1) }}px;
        margin-top: 1px;
    }
    .leave-slip .header-text {
        font-size: {{ max(6, $baseFontSize - 1) }}px;
    }
    .slip-card {
        border: 1px solid {{ $PRIMARY_COLOR ?? '#0b0b56' }};
        border-radius: 4px;
        padding: 4px 5px;
        background: #fff;
    }
    .slip-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        margin-bottom: 3px;
        padding-bottom: 3px;
        border-bottom: 1px solid #e5e7eb;
    }
    .slip-id {
        font-size: {{ max(7, $baseFontSize - 1) }}px;
        color: #666;
        font-weight: 600;
    }
    .slip-body {
        display: grid;
        /* Keep QR on physical left for scan convenience in LTR and RTL. */
        grid-template-columns: 62px 1fr;
        gap: 5px 7px;
        direction: ltr;
        align-items: start;
    }
    .slip-qr-rail {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        text-align: center;
    }
    .status-badge {
        display: inline-block;
        padding: 1px 5px;
        border-radius: 999px;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        max-width: 100%;
        line-height: 1.2;
    }
    .status-approved { background: #dcfce7; color: #166534; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #f1f5f9; color: #475569; }
    .slip-qr-rail img {
        width: 54px;
        height: 54px;
        display: block;
        border: 1px solid #e5e7eb;
        border-radius: 3px;
        padding: 2px;
        background: #fff;
    }
    .slip-qr-text {
        font-size: {{ max(5, $baseFontSize - 2) }}px;
        color: #555;
        line-height: 1.15;
        direction: {{ $dir }};
    }
    .slip-main {
        min-width: 0;
        direction: {{ $dir }};
    }
    .slip-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 6px;
    }
    .slip-field {
        min-width: 0;
    }
    .slip-field.full {
        grid-column: 1 / -1;
    }
    .slip-label {
        display: block;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
        color: #6b7280;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 0;
        line-height: 1.15;
    }
    .slip-value {
        font-size: {{ $baseFontSize }}px;
        font-weight: 600;
        word-break: break-word;
        line-height: 1.25;
    }
    .slip-reason {
        margin-top: 3px;
        padding-top: 3px;
        border-top: 1px dashed #d1d5db;
    }
    .slip-reason .slip-value {
        font-weight: 500;
        white-space: pre-wrap;
        font-size: {{ max(6, $baseFontSize) }}px;
        max-height: 28px;
        overflow: hidden;
    }
    .slip-sign {
        margin-top: 5px;
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 8px;
        direction: {{ $dir }};
    }
    .sign-box {
        border-top: 1px solid #9ca3af;
        padding-top: 2px;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
        color: #4b5563;
        text-align: center;
        min-height: 12px;
    }
    .leave-slip .report-footer {
        margin-top: 4px;
        padding-top: 3px;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
    }
    .leave-slip .footer-row {
        margin-bottom: 1px;
        min-height: 12px;
    }
    .leave-slip .system-note {
        margin-top: 4px;
        padding-top: 3px;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
    }
    .leave-slip .notes-section {
        margin: 3px 0;
        font-size: {{ max(6, $baseFontSize - 1) }}px;
    }
</style>

<div class="leave-slip">
    @if(!empty($WATERMARK))
        <div class="watermark">
            @if(($WATERMARK['wm_type'] ?? '') === 'image' && !empty($WATERMARK['image_data_uri']))
                <img src="{{ $WATERMARK['image_data_uri'] }}" alt="Watermark" class="watermark-image">
            @elseif(($WATERMARK['wm_type'] ?? '') === 'text' && !empty($WATERMARK['text']))
                <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
            @endif
        </div>
    @endif

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
            @endphp
            @foreach($leftLogos as $logo)
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo">
            @endforeach
        </div>

        <div class="header-center">
            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'above_school_name')
                <div class="header-text" style="margin-bottom: 4px;">{{ $header_text }}</div>
            @endif

            @if(!empty($SCHOOL_NAME_PASHTO))
                <div class="school-name">{{ $SCHOOL_NAME_PASHTO }}</div>
            @elseif(!empty($SCHOOL_NAME))
                <div class="school-name">{{ $SCHOOL_NAME }}</div>
            @endif

            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'below_school_name')
                <div class="header-text" style="margin-top: 4px;">{{ $header_text }}</div>
            @endif

            <div class="report-title">{{ $TABLE_TITLE ?? ($labels['title'] ?? 'Leave Request Slip') }}</div>

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
            @endphp
            @foreach($rightLogos as $logo)
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo">
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

    <div class="slip-card">
        <div class="slip-meta">
            <div class="slip-id">{{ $labels['leaveId'] ?? 'Leave ID' }}: {{ $slip['short_id'] ?? '—' }}</div>
            <div class="slip-id">{{ $labels['printedOn'] ?? 'Printed On' }}: {{ $CURRENT_DATETIME ?? '' }}</div>
        </div>

        <div class="slip-body">
            <aside class="slip-qr-rail">
                <span class="status-badge {{ $statusClass }}">{{ $slip['status_label'] ?? ($labels[$status] ?? $status) }}</span>
                @if(!empty($qr_data_uri))
                    <img src="{{ $qr_data_uri }}" alt="QR">
                    <div class="slip-qr-text">{{ $labels['scanToVerify'] ?? 'Scan QR to verify this leave request' }}</div>
                @endif
            </aside>

            <div class="slip-main">
                <div class="slip-grid">
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['student'] ?? 'Student' }}</span>
                        <div class="slip-value">{{ $slip['student_name'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['fatherName'] ?? 'Father Name' }}</span>
                        <div class="slip-value">{{ $slip['father_name'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['code'] ?? 'Student Code' }}</span>
                        <div class="slip-value">{{ $slip['student_code'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['class'] ?? 'Class' }}</span>
                        <div class="slip-value">{{ $slip['class_name'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['leaveType'] ?? 'Leave Type' }}</span>
                        <div class="slip-value">{{ $slip['leave_type_label'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['duration'] ?? 'Duration' }}</span>
                        <div class="slip-value">{{ $slip['duration'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['startDate'] ?? 'Start Date' }}</span>
                        <div class="slip-value">{{ $slip['start_date'] ?? '—' }}</div>
                    </div>
                    <div class="slip-field">
                        <span class="slip-label">{{ $labels['endDate'] ?? 'End Date' }}</span>
                        <div class="slip-value">{{ $slip['end_date'] ?? '—' }}</div>
                    </div>
                    @if(!empty($slip['time_range']))
                        <div class="slip-field full">
                            <span class="slip-label">{{ $labels['time'] ?? 'Time' }}</span>
                            <div class="slip-value">{{ $slip['time_range'] }}</div>
                        </div>
                    @endif
                    @if(!empty($slip['approved_by']))
                        <div class="slip-field">
                            <span class="slip-label">{{ $labels['approvedBy'] ?? 'Approved By' }}</span>
                            <div class="slip-value">{{ $slip['approved_by'] }}</div>
                        </div>
                    @endif
                    @if(!empty($slip['approved_at']))
                        <div class="slip-field">
                            <span class="slip-label">{{ $labels['approvedAt'] ?? 'Approved At' }}</span>
                            <div class="slip-value">{{ $slip['approved_at'] }}</div>
                        </div>
                    @endif
                </div>

                <div class="slip-reason">
                    <span class="slip-label">{{ $labels['reason'] ?? 'Reason' }}</span>
                    <div class="slip-value">{{ $slip['reason'] ?? '—' }}</div>
                </div>

                @if(!empty($slip['approval_note']))
                    <div class="slip-reason">
                        <span class="slip-label">{{ $labels['approvalNote'] ?? 'Approval Note' }}</span>
                        <div class="slip-value">{{ $slip['approval_note'] }}</div>
                    </div>
                @endif
            </div>
        </div>

        <div class="slip-sign">
            <div class="sign-box">{{ $labels['signatureGuard'] ?? 'Guard / Staff Signature' }}</div>
            <div class="sign-box">{{ $labels['signatureDate'] ?? 'Date' }}</div>
        </div>
    </div>

    @if(!empty($NOTES_BODY))
        <div class="notes-section body-notes">
            @foreach($NOTES_BODY as $note)
                <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
            @endforeach
        </div>
    @endif

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
                    @if(!empty($SCHOOL_PHONE)) | @endif
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
                    {{ $CURRENT_DATETIME ?? now()->format('Y-m-d H:i') }}
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

        @if(!empty($labels['systemNote']))
            <div class="system-note">{{ $labels['systemNote'] }}</div>
        @endif
    </div>
</div>
@endsection
