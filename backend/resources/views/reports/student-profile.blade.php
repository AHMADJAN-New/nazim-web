@extends('reports.base')

@section('content')

@php
    $isRtl = ($rtl ?? true) ? true : false;
    $dir   = $isRtl ? 'rtl' : 'ltr';

    // Safe defaults
    $student = $student ?? [];
    $labels  = $labels ?? [];
    $rules_labels = $rules_labels ?? [];
    $sections = $sections ?? [];
@endphp

{{-- =========================
    Styles (scoped to this report)
========================= --}}
<style>
    :root{
        --ink:#12143a;
        --muted:#6b7280;
        --brand:#0b0b56;
        --brand-2:#14146f;
        --line:#e6e8f0;
        --soft:#f7f8fc;
        --chip:#eef0ff;
        --ok:#0ea5e9;
        --good:#16a34a;
        --warn:#f59e0b;
        --bad:#dc2626;
        --shadow: 0 10px 30px rgba(0,0,0,.06);
        --radius: 14px;
    }

    /* Overall page spacing */
    .rpt-wrap{
        direction: {{ $dir }};
        color: var(--ink);
        font-size: 11pt;
        line-height: 1.55;
    }

    /* Watermark */
    .watermark{
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
        z-index: 0;
        opacity: .08;
        transform: rotate(-20deg);
    }
    .watermark-text{
        font-size: 56pt;
        font-weight: 800;
        color: #000;
        letter-spacing: 2px;
        white-space: nowrap;
    }
    .watermark-image{
        max-width: 65%;
        max-height: 65%;
        filter: grayscale(100%);
    }

    /* Header */
    .rpt-header{
        position: relative;
        z-index: 2;
        display: grid;
        grid-template-columns: 90px 1fr 90px;
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: linear-gradient(180deg, #ffffff 0%, #fbfbff 100%);
        box-shadow: var(--shadow);
        margin-bottom: 12px;
    }
    .rpt-logo{
        width: 72px;
        height: 72px;
        object-fit: contain;
        border-radius: 12px;
        background: #fff;
        border: 1px solid var(--line);
        padding: 6px;
    }
    .rpt-head-center{
        text-align: center;
    }
    .rpt-school{
        font-size: 16pt;
        font-weight: 800;
        color: var(--brand);
        margin: 0;
        line-height: 1.1;
    }
    .rpt-title{
        font-size: 12.5pt;
        font-weight: 700;
        color: #1f2a5a;
        margin: 6px 0 0;
    }
    .rpt-subtext{
        margin-top: 6px;
        color: var(--muted);
        font-size: 10pt;
    }

    /* Card */
    .card{
        position: relative;
        z-index: 2;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #fff;
        box-shadow: var(--shadow);
        overflow: hidden;
    }
    .card-topbar{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 14px;
        background: var(--soft);
        border-bottom: 1px solid var(--line);
    }
    .chip{
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--chip);
        color: var(--brand);
        font-size: 9.5pt;
        font-weight: 700;
        border: 1px solid #dde1ff;
        white-space: nowrap;
    }
    .chip small{
        font-weight: 600;
        color: #3b3f7a;
    }

    /* Profile area layout */
    .profile{
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 12px;
        padding: 14px;
    }
    .photo{
        width: 140px;
        height: 170px;
        border-radius: 14px;
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #fff 0%, #fafbff 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }
    .photo img{
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .photo .no-photo{
        width: 100%;
        height: 100%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size: 44pt;
        font-weight: 900;
        color: var(--brand);
        background: radial-gradient(circle at 30% 30%, #eef0ff 0%, #ffffff 55%, #f7f8fc 100%);
    }

    /* Key-value grid */
    .kv{
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 10px 12px;
        align-items: start;
    }
    .kv-item{
        grid-column: span 6;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 10px 12px;
        background: #fff;
    }
    .kv-item.wide{ grid-column: span 12; }
    .kv-label{
        font-size: 9.5pt;
        color: var(--muted);
        margin: 0 0 4px;
    }
    .kv-value{
        margin: 0;
        font-size: 11pt;
        font-weight: 700;
        color: var(--ink);
        word-break: break-word;
    }
    .kv-value.light{
        font-weight: 600;
    }

    /* Status badge */
    .badge{
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 9.5pt;
        font-weight: 800;
        border: 1px solid transparent;
        white-space: nowrap;
    }
    .badge.active, .badge.enrolled, .badge.approved{
        background: #eafff2;
        color: #0f7a3a;
        border-color: #b9f6cf;
    }
    .badge.pending{
        background: #fff7ed;
        color: #9a5b00;
        border-color: #ffd7a8;
    }
    .badge.inactive, .badge.suspended, .badge.rejected{
        background: #fff1f2;
        color: #9f1239;
        border-color: #fecdd3;
    }
    .badge.unknown{
        background: #f3f4f6;
        color: #374151;
        border-color: #e5e7eb;
    }

    /* Section blocks */
    .section{
        margin-top: 12px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #fff;
        box-shadow: var(--shadow);
        position: relative;
        z-index: 2;
    }
    .section-title{
        display:flex;
        align-items:center;
        justify-content: space-between;
        gap: 10px;
        margin: 0 0 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--line);
        color: var(--brand);
        font-size: 12.5pt;
        font-weight: 900;
    }
    .section-title small{
        color: var(--muted);
        font-weight: 600;
        font-size: 9.5pt;
    }

    /* Table */
    .tbl{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
    }
    .tbl thead th{
        background: linear-gradient(180deg, #f6f7ff 0%, #eef0ff 100%);
        color: #1f2a5a;
        font-weight: 900;
        font-size: 10pt;
        padding: 10px 8px;
        border-bottom: 1px solid var(--line);
        text-align: center;
    }
    .tbl td{
        padding: 9px 8px;
        border-bottom: 1px solid var(--line);
        font-size: 10.5pt;
        vertical-align: top;
    }
    .tbl tbody tr:last-child td{ border-bottom: 0; }
    .row-number{
        width: 34px;
        text-align: center;
        color: #334155;
        font-weight: 800;
        background: #fafafa;
    }
    .empty-row{
        text-align: center;
        color: var(--muted);
        padding: 16px !important;
        font-style: italic;
    }
    .description-cell{
        background: #fcfcff;
        color: #374151;
        border-top: 0;
        font-size: 10pt;
        padding: 10px 12px !important;
    }

    /* Severity color */
    .severity-minor{ color: #1f2a5a; font-weight: 700; }
    .severity-medium{ color: #9a5b00; font-weight: 800; }
    .severity-major, .severity-high{ color: #b91c1c; font-weight: 900; }

    /* Rules page */
    .page-break-before{ page-break-before: always; }
    .rules-page{
        min-height: 240mm;
        padding: 0 5mm;
        position: relative;
        z-index: 2;
    }
    .rules-hero{
        text-align: center;
        padding: 12px 12px 14px;
        border-radius: var(--radius);
        border: 1px solid var(--line);
        background: linear-gradient(180deg, #ffffff 0%, #f6f7ff 100%);
        box-shadow: var(--shadow);
        margin-bottom: 12px;
    }
    .rules-title{
        margin: 0;
        font-size: 18pt;
        font-weight: 900;
        color: var(--brand);
        letter-spacing: .2px;
    }
    .rules-sub{
        margin-top: 6px;
        color: var(--muted);
        font-size: 10pt;
    }
    .rules-block{
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: #fff;
        box-shadow: var(--shadow);
        padding: 12px 14px;
        margin-bottom: 12px;
    }
    .rules-block h3{
        margin: 0 0 10px;
        font-size: 13pt;
        font-weight: 900;
        color: var(--brand-2);
        padding-bottom: 8px;
        border-bottom: 1px solid var(--line);
    }
    .rules-block ul{
        margin: 0;
        padding-{{ $isRtl ? 'right' : 'left' }}: 22px;
        font-size: 11pt;
        line-height: 1.75;
    }
    .sig-line{
        display:inline-block;
        border-bottom: 1px solid #111;
        min-width: 150px;
        height: 20px;
        vertical-align: middle;
        margin: 0 8px;
    }
    .stamp-box{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width: 95px;
        height: 48px;
        border: 2px dashed #777;
        border-radius: 10px;
        color: #666;
        font-weight: 800;
        font-size: 9pt;
    }
    .rules-footer{
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid var(--line);
        text-align: center;
        color: var(--muted);
        font-size: 9pt;
    }

    /* Footer */
    .rpt-footer{
        margin-top: 12px;
        position: relative;
        z-index: 2;
        padding: 8px 10px 0;
        color: var(--muted);
        font-size: 9.5pt;
        display:flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border-top: 1px solid var(--line);
    }

    /* Print tweaks */
    @media print{
        .rpt-header, .card, .section, .rules-hero, .rules-block { box-shadow: none; }
        .watermark{ opacity: .06; }
    }

    /* Make it look like a real compact form */
    .profile-compact{
        grid-template-columns: 145px 1fr;
        gap: 12px;
        padding: 14px;
    }

    .form-grid{
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px 10px;
        align-content: start;
    }

    /* Each field looks like a form box */
    .f{
        border: 1px solid var(--line);
        border-radius: 12px;
        background: #fff;
        padding: 8px 10px;
        min-height: 56px;
    }
    .f-label{
        font-size: 9pt;
        color: var(--muted);
        margin-bottom: 4px;
        font-weight: 700;
    }
    .f-value{
        font-size: 10.5pt;
        font-weight: 800;
        color: var(--ink);
        word-break: break-word;
        line-height: 1.35;
    }
    .f-muted{
        color: var(--muted);
        font-weight: 800;
    }

    /* Spans for wide fields */
    .span-2{ grid-column: span 2; }
    .span-3{ grid-column: span 3; }
    .span-4{ grid-column: span 4; }

    /* Divider inside the form */
    .form-divider{
        display:flex;
        align-items:center;
        gap: 10px;
        padding: 6px 2px;
        border: none;
        background: transparent;
        font-weight: 900;
        color: var(--brand);
        margin-top: 2px;
    }
    .form-divider::before,
    .form-divider::after{
        content:"";
        flex: 1;
        height: 1px;
        background: var(--line);
    }
    .form-divider span{
        padding: 0 10px;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 9.5pt;
        color: var(--brand);
    }

    /* Print safety */
    @media print{
        .f{ break-inside: avoid; page-break-inside: avoid; }
    }
</style>

<div class="rpt-wrap">

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

    {{-- Header --}}
    <div class="rpt-header">
        <div style="display:flex; justify-content: {{ $isRtl ? 'flex-start' : 'flex-start' }};">
            @if(!empty($PRIMARY_LOGO))
                <img src="{{ $PRIMARY_LOGO }}" alt="Logo" class="rpt-logo">
            @endif
        </div>

        <div class="rpt-head-center">
            <div class="rpt-school">{{ $SCHOOL_NAME ?? 'School Name' }}</div>
            <div class="rpt-title">{{ $TABLE_TITLE ?? 'Student Profile' }}</div>
            @if(!empty($HEADER_TEXT))
                <div class="rpt-subtext">{!! $HEADER_TEXT !!}</div>
            @endif
        </div>

        <div style="display:flex; justify-content: {{ $isRtl ? 'flex-end' : 'flex-end' }};">
            @if(!empty($SECONDARY_LOGO))
                <img src="{{ $SECONDARY_LOGO }}" alt="Secondary Logo" class="rpt-logo">
            @endif
        </div>
    </div>

    {{-- Student Profile Card --}}
    <div class="card">
        <div class="card-topbar">
            <div class="chip">
                <span>👤</span>
                <span>{{ $labels['studentProfile'] ?? 'Student Profile' }}</span>
            </div>

            <div class="chip">
                <small>{{ $labels['generatedAt'] ?? 'Generated At' }}:</small>
                <span>{{ $generatedAt ?? now()->format('Y-m-d H:i') }}</span>
            </div>
        </div>

        {{-- Compact form wrapper --}}
        <div class="profile profile-compact">
            {{-- Photo --}}
            <div class="photo">
                @if(!empty($student['picture_path']))
                    <img src="{{ $student['picture_path'] }}" alt="Student Photo">
                @else
                    <div class="no-photo">
                        <span>{{ mb_substr($student['full_name'] ?? 'S', 0, 1) }}</span>
                    </div>
                @endif
            </div>

            {{-- FORM GRID --}}
            <div class="form-grid">
                {{-- Row 1 --}}
                <div class="f">
                    <div class="f-label">{{ $labels['fullName'] ?? 'Full Name' }}</div>
                    <div class="f-value">{{ $student['full_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['admissionNo'] ?? 'Admission No' }}</div>
                    <div class="f-value">{{ $student['admission_no'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['studentCode'] ?? 'Student Code' }}</div>
                    <div class="f-value">{{ $student['student_code'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['status'] ?? 'Status' }}</div>
                    @php
                        $statusRaw = strtolower((string)($student['status'] ?? 'unknown'));
                        $statusClass = in_array($statusRaw, ['active','enrolled','approved']) ? $statusRaw
                                     : (in_array($statusRaw, ['pending']) ? 'pending'
                                     : (in_array($statusRaw, ['inactive','suspended','rejected']) ? $statusRaw : 'unknown'));
                    @endphp
                    <div class="f-value">
                        <span class="badge {{ $statusClass }}">{{ $student['status'] ?? '—' }}</span>
                    </div>
                </div>

                {{-- Row 2 --}}
                <div class="f">
                    <div class="f-label">{{ $labels['fatherName'] ?? 'Father Name' }}</div>
                    <div class="f-value">{{ $student['father_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['grandfatherName'] ?? 'Grandfather Name' }}</div>
                    <div class="f-value">{{ $student['grandfather_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['motherName'] ?? 'Mother Name' }}</div>
                    <div class="f-value">{{ $student['mother_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['tazkiraNumber'] ?? 'Tazkira No' }}</div>
                    <div class="f-value">{{ $student['tazkira_number'] ?? '—' }}</div>
                </div>

                {{-- Row 3 --}}
                <div class="f">
                    <div class="f-label">{{ $labels['dob'] ?? 'Date of Birth' }}</div>
                    <div class="f-value">{{ $student['birth_date'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['birthYear'] ?? 'Birth Year' }}</div>
                    <div class="f-value">{{ $student['birth_year'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['age'] ?? 'Age' }}</div>
                    <div class="f-value">{{ $student['age'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['gender'] ?? 'Gender' }}</div>
                    <div class="f-value">{{ $student['gender'] ?? '—' }}</div>
                </div>

                {{-- Row 4 --}}
                <div class="f">
                    <div class="f-label">{{ $labels['currentClass'] ?? 'Current Class' }}</div>
                    <div class="f-value">
                        {{ $student['current_class'] ?? '—' }}
                        @if(!empty($student['current_section']))
                            <span class="f-muted">({{ $student['current_section'] }})</span>
                        @endif
                    </div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['currentAcademicYear'] ?? 'Academic Year' }}</div>
                    <div class="f-value">{{ $student['current_academic_year'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['admissionYear'] ?? 'Admission Year' }}</div>
                    <div class="f-value">{{ $student['admission_year'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['cardNumber'] ?? 'Card Number' }}</div>
                    <div class="f-value">{{ $student['card_number'] ?? '—' }}</div>
                </div>

                {{-- Row 5 --}}
                <div class="f">
                    <div class="f-label">{{ $labels['studentPhone'] ?? 'Student Phone' }}</div>
                    <div class="f-value">{{ $student['phone'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['guardianPhone'] ?? 'Guardian Phone' }}</div>
                    <div class="f-value">{{ $student['guardian_phone'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['emergencyContactName'] ?? 'Emergency Contact' }}</div>
                    <div class="f-value">{{ $student['emergency_contact_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['emergencyContactPhone'] ?? 'Emergency Contact Phone' }}</div>
                    <div class="f-value">{{ $student['emergency_contact_phone'] ?? '—' }}</div>
                </div>

                {{-- Row 6 (address wide like a real form) --}}
                <div class="f span-2">
                    <div class="f-label">{{ $labels['address'] ?? 'Address' }}</div>
                    <div class="f-value">{{ $student['home_address'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['nationality'] ?? 'Nationality' }}</div>
                    <div class="f-value">{{ $student['nationality'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['preferredLanguage'] ?? 'Preferred Language' }}</div>
                    <div class="f-value">{{ $student['preferred_language'] ?? '—' }}</div>
                </div>

                {{-- Guardian + Zamin section divider --}}
                <div class="form-divider span-4">
                    <span>{{ $labels['guardianSection'] ?? 'Guardian & Guarantor Details' }}</span>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['guardianName'] ?? 'Guardian' }}</div>
                    <div class="f-value">
                        {{ $student['guardian_name'] ?? '—' }}
                        @if(!empty($student['guardian_relation']))
                            <span class="f-muted">({{ $student['guardian_relation'] }})</span>
                        @endif
                    </div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['guardianTazkira'] ?? 'Guardian Tazkira' }}</div>
                    <div class="f-value">{{ $student['guardian_tazkira'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['zaminName'] ?? 'Zamin (Guarantor) Name' }}</div>
                    <div class="f-value">{{ $student['zamin_name'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['zaminPhone'] ?? 'Zamin Phone' }}</div>
                    <div class="f-value">{{ $student['zamin_phone'] ?? '—' }}</div>
                </div>

                <div class="f">
                    <div class="f-label">{{ $labels['zaminTazkira'] ?? 'Zamin Tazkira' }}</div>
                    <div class="f-value">{{ $student['zamin_tazkira'] ?? '—' }}</div>
                </div>

                <div class="f span-3">
                    <div class="f-label">{{ $labels['zaminAddress'] ?? 'Zamin Address' }}</div>
                    <div class="f-value">{{ $student['zamin_address'] ?? '—' }}</div>
                </div>

                {{-- Notes (optional, wide) --}}
                @if(!empty($student['notes']))
                    <div class="f span-4">
                        <div class="f-label">{{ $labels['notes'] ?? 'Notes' }}</div>
                        <div class="f-value">{{ $student['notes'] ?? '—' }}</div>
                    </div>
                @endif

                {{-- Guardian Photo (optional) --}}
                @if(!empty($student['guardian_picture_path']))
                    <div class="f span-4">
                        <div class="f-label">{{ $labels['guardianPhoto'] ?? 'Guardian Photo' }}</div>
                        <div class="f-value" style="padding-top:6px;">
                            <img src="{{ $student['guardian_picture_path'] }}"
                                 alt="Guardian Photo"
                                 style="width: 92px; height: 92px; object-fit: cover; border-radius: 14px; border:1px solid var(--line);">
                        </div>
                    </div>
                @endif
            </div>
        </div>
    </div>

    {{-- Educational History --}}
    @if(!empty($sections['educational_history']) && count($sections['educational_history']) > 0)
        <div class="section">
            <div class="section-title">
                <span>{{ $labels['educationalHistory'] ?? 'Educational History' }}</span>
                <small>{{ count($sections['educational_history']) }} {{ $labels['records'] ?? 'records' }}</small>
            </div>

            <table class="tbl">
                <thead>
                <tr>
                    <th style="width:44px;">#</th>
                    <th>{{ $labels['schoolName'] ?? 'School Name' }}</th>
                    <th style="width:120px;">{{ $labels['startDate'] ?? 'Start Date' }}</th>
                    <th style="width:120px;">{{ $labels['endDate'] ?? 'End Date' }}</th>
                    <th style="width:110px;">{{ $labels['grade'] ?? 'Grade' }}</th>
                    <th>{{ $labels['description'] ?? 'Description' }}</th>
                </tr>
                </thead>
                <tbody>
                @forelse($sections['educational_history'] as $index => $history)
                    <tr>
                        <td class="row-number">{{ (int)$index + 1 }}</td>
                        <td>{{ $history['school_name'] ?? '—' }}</td>
                        <td style="text-align:center;">{{ $history['start_date'] ?? '—' }}</td>
                        <td style="text-align:center;">{{ $history['end_date'] ?? '—' }}</td>
                        <td style="text-align:center;">{{ $history['grade'] ?? '—' }}</td>
                        <td>{{ $history['description'] ?? '—' }}</td>
                    </tr>
                @empty
                    <tr><td colspan="6" class="empty-row">{{ $labels['noEducationalHistory'] ?? 'No educational history records found' }}</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
    @endif

    {{-- Discipline Records --}}
    @if(!empty($sections['discipline_records']) && count($sections['discipline_records']) > 0)
        <div class="section">
            <div class="section-title">
                <span>{{ $labels['disciplineRecords'] ?? 'Discipline Records' }}</span>
                <small>{{ count($sections['discipline_records']) }} {{ $labels['records'] ?? 'records' }}</small>
            </div>

            <table class="tbl">
                <thead>
                <tr>
                    <th style="width:44px;">#</th>
                    <th style="width:120px;">{{ $labels['incidentDate'] ?? 'Date' }}</th>
                    <th>{{ $labels['incidentType'] ?? 'Type' }}</th>
                    <th style="width:120px;">{{ $labels['severity'] ?? 'Severity' }}</th>
                    <th>{{ $labels['actionTaken'] ?? 'Action' }}</th>
                    <th style="width:140px;">{{ $labels['status'] ?? 'Status' }}</th>
                </tr>
                </thead>
                <tbody>
                @forelse($sections['discipline_records'] as $index => $record)
                    @php
                        $sev = strtolower((string)($record['severity'] ?? 'minor'));
                        $sevClass = in_array($sev, ['major','high']) ? 'major' : (in_array($sev, ['medium']) ? 'medium' : 'minor');
                    @endphp
                    <tr>
                        <td class="row-number">{{ (int)$index + 1 }}</td>
                        <td style="text-align:center;">{{ $record['incident_date'] ?? '—' }}</td>
                        <td>{{ $record['incident_type'] ?? '—' }}</td>
                        <td class="severity-{{ $sevClass }}" style="text-align:center;">{{ $record['severity'] ?? '—' }}</td>
                        <td>{{ $record['action_taken'] ?? '—' }}</td>
                        <td style="text-align:center;">
                            @if(!empty($record['resolved']) && $record['resolved'])
                                <span class="badge approved">{{ $labels['resolved'] ?? 'Resolved' }}</span>
                                @if(!empty($record['resolved_date']))
                                    <div style="margin-top:4px; color:var(--muted); font-size:9.5pt;">{{ $record['resolved_date'] }}</div>
                                @endif
                            @else
                                <span class="badge pending">{{ $labels['pending'] ?? 'Pending' }}</span>
                            @endif
                        </td>
                    </tr>

                    @if(!empty($record['description']))
                        <tr>
                            <td></td>
                            <td colspan="5" class="description-cell">{{ $record['description'] }}</td>
                        </tr>
                    @endif
                @empty
                    <tr><td colspan="6" class="empty-row">{{ $labels['noDisciplineRecords'] ?? 'No discipline records found' }}</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
    @endif

    {{-- Documents --}}
    @if(!empty($sections['documents']) && count($sections['documents']) > 0)
        <div class="section">
            <div class="section-title">
                <span>{{ $labels['documents'] ?? 'Documents' }}</span>
                <small>{{ count($sections['documents']) }} {{ $labels['files'] ?? 'files' }}</small>
            </div>

            <table class="tbl">
                <thead>
                <tr>
                    <th style="width:44px;">#</th>
                    <th style="width:160px;">{{ $labels['documentType'] ?? 'Type' }}</th>
                    <th>{{ $labels['fileName'] ?? 'File Name' }}</th>
                    <th style="width:140px;">{{ $labels['uploadDate'] ?? 'Upload Date' }}</th>
                    <th style="width:110px;">{{ $labels['fileSize'] ?? 'Size' }}</th>
                </tr>
                </thead>
                <tbody>
                @forelse($sections['documents'] as $index => $document)
                    <tr>
                        <td class="row-number">{{ (int)$index + 1 }}</td>
                        <td>{{ $document['document_type'] ?? '—' }}</td>
                        <td>{{ $document['file_name'] ?? '—' }}</td>
                        <td style="text-align:center;">{{ $document['uploaded_at'] ?? '—' }}</td>
                        <td style="text-align:center;">{{ $document['file_size'] ?? '—' }}</td>
                    </tr>

                    @if(!empty($document['description']))
                        <tr>
                            <td></td>
                            <td colspan="4" class="description-cell">{{ $document['description'] }}</td>
                        </tr>
                    @endif
                @empty
                    <tr><td colspan="5" class="empty-row">{{ $labels['noDocuments'] ?? 'No documents found' }}</td></tr>
                @endforelse
                </tbody>
            </table>
        </div>
    @endif

    {{-- =========================
        Page 2: Rules / Commitments
    ========================= --}}
    <div class="page-break-before"></div>

    <div class="rules-page" dir="{{ $dir }}">
        <div class="rules-hero">
            <h1 class="rules-title">{{ $rules_labels['commitments_title'] ?? 'تعهدات، ضمانت، او تائید' }}</h1>
            <div class="rules-sub">
                {{ $SCHOOL_NAME ?? '' }}
                @if(!empty($SCHOOL_NAME)) • @endif
                {{ $TABLE_TITLE ?? 'Student Profile' }}
            </div>
        </div>

        {{-- Commitment --}}
        <div class="rules-block">
            <h3>{{ $rules_labels['commitment_title'] ?? 'تعهد نامه' }}</h3>
            <ul>
                @foreach($commitment_items ?? [] as $item)
                    <li style="margin-bottom: 8px;">{{ $item }}</li>
                @endforeach
            </ul>

            <div style="margin-top: 14px; font-size: 10.5pt;">
                {{ $rules_labels['signature'] ?? 'امضا' }}:
                <span class="sig-line"></span>
            </div>
        </div>

        {{-- Guarantee --}}
        <div class="rules-block">
            <h3>{{ $rules_labels['guarantee_title'] ?? 'ضمانت نامه' }}</h3>
            <div style="font-size: 11pt; line-height: 1.8; color: #111827;">
                {{ $guarantee_text ?? '' }}
            </div>

            <div style="margin-top: 14px; font-size: 10.5pt;">
                {{ $rules_labels['guarantor_signature'] ?? 'د ضامن لاسلیک' }}:
                <span class="sig-line"></span>
            </div>
        </div>

        {{-- Approval --}}
        <div class="rules-block">
            <h3>{{ $rules_labels['approval_title'] ?? 'تائيد نامه' }}</h3>

            <table style="width:100%; border-collapse: collapse; font-size: 11pt;">
                <tr>
                    <td style="padding: 10px 8px; vertical-align: top;">
                        {{ $rules_labels['approval_admission'] ?? 'د داخلې ناظم له لوري مذکور طالب العلم ته په درجه' }}
                        <span class="sig-line" style="min-width: 120px;"></span>
                        {{ $rules_labels['was_admitted'] ?? 'کې داخله ورکړل شوه.' }}
                    </td>
                    <td style="padding: 10px 8px;"></td>
                </tr>

                <tr>
                    <td style="padding: 10px 8px;">
                        {{ $rules_labels['approval_fee'] ?? 'داخله فيس:' }}
                        <span class="sig-line" style="min-width: 160px;"></span>
                    </td>
                    <td style="padding: 10px 8px;"></td>
                </tr>

                <tr>
                    <td style="padding: 10px 8px;">
                        {{ $rules_labels['approval_date'] ?? 'د داخلې تاريخ:' }}
                        <span class="sig-line" style="min-width: 140px;"></span>
                    </td>
                    <td style="padding: 10px 8px;"></td>
                </tr>

                <tr>
                    <td style="padding: 10px 8px;">
                        {{ $rules_labels['approval_signature'] ?? 'د ناظم لاسليک:' }}
                        <span class="sig-line" style="min-width: 140px;"></span>
                    </td>
                    <td style="padding: 10px 8px; text-align: {{ $isRtl ? 'left' : 'right' }};">
                        {{ $rules_labels['stamp'] ?? 'مهر' }}:
                        <span class="stamp-box">{{ $rules_labels['stamp'] ?? 'مهر' }}</span>
                    </td>
                </tr>
            </table>

            <div class="rules-footer">
                {{ $rules_labels['note'] ?? '' }}
            </div>
        </div>
    </div>

    {{-- Footer --}}
    <div class="rpt-footer">
        <div>
            @if(!empty($FOOTER_TEXT))
                <span>{!! $FOOTER_TEXT !!}</span>
            @else
                <span>{{ $SCHOOL_NAME ?? '' }}</span>
            @endif
        </div>

        @if($show_page_numbers ?? true)
            <div class="page-number"></div>
        @endif
    </div>

</div>
@endsection
