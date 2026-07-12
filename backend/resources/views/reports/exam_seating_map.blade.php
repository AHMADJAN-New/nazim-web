@extends('reports.base')

@php
    $orientation = 'landscape';
    $gridRows = (int) ($grid['rows'] ?? ($map['rows'] ?? 0));
    $gridColumns = (int) ($grid['columns'] ?? ($map['columns'] ?? 0));
    $cells = collect($grid['cells'] ?? [])->keyBy(fn ($cell) => ($cell['row_number'] ?? 0).'-'.($cell['column_number'] ?? 0));
    $mapName = $map['name'] ?? ($filters['map_name'] ?? '');
    $roomLabel = $filters['room'] ?? null;
    $startSeat = $filters['start_seat_number'] ?? ($map['start_seat_number'] ?? null);
    $endSeat = $filters['seat_range_end'] ?? null;
@endphp

@section('content')
<style>
    .seating-meta {
        margin: 8px 0 14px;
        font-size: 11px;
        line-height: 1.5;
    }
    .seating-meta span {
        display: inline-block;
        margin-inline-end: 16px;
    }
    .seating-grid {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
    }
    .seating-grid th,
    .seating-grid td {
        border: 1px solid #cbd5e1;
        padding: 4px;
        vertical-align: top;
        text-align: center;
        font-size: 9px;
        word-wrap: break-word;
    }
    .seating-grid th {
        background: #f1f5f9;
        font-weight: 700;
    }
    .seat-cell {
        min-height: 42px;
        border-radius: 4px;
    }
    .seat-cell.disabled {
        background: #e2e8f0 !important;
        color: #64748b;
    }
    .seat-cell.empty {
        background: #ffffff;
    }
    .seat-number {
        font-weight: 700;
        font-size: 10px;
        margin-bottom: 2px;
    }
    .student-name {
        font-size: 8px;
        line-height: 1.2;
        max-height: 24px;
        overflow: hidden;
    }
    .roll-number {
        font-size: 8px;
        margin-top: 2px;
    }
    .class-legend {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        font-size: 10px;
    }
    .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .legend-swatch {
        width: 12px;
        height: 12px;
        border: 1px solid #94a3b8;
        display: inline-block;
    }
</style>

@if(!empty($WATERMARK))
<div class="watermark">
    @if(!empty($WATERMARK['text']))
        <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
    @elseif(!empty($WATERMARK['image_url']))
        <img src="{{ $WATERMARK['image_url'] }}" class="watermark-image" alt="Watermark">
    @endif
</div>
@endif

<div class="report-header">
    <div class="header-left">
        @if(!empty($PRIMARY_LOGO_URI))
            <img src="{!! $PRIMARY_LOGO_URI !!}" alt="Logo" class="header-logo">
        @endif
    </div>
    <div class="header-center">
        @if(!empty($SCHOOL_NAME_PASHTO))
            <div class="school-name">{{ $SCHOOL_NAME_PASHTO }}</div>
        @elseif(!empty($SCHOOL_NAME))
            <div class="school-name">{{ $SCHOOL_NAME }}</div>
        @endif
        <div class="report-title">{{ $TABLE_TITLE ?? 'Exam Seating Map' }}</div>
        @if(!empty($mapName))
            <div class="header-text">{{ $mapName }}</div>
        @endif
    </div>
    <div class="header-right">
        @if(!empty($SECONDARY_LOGO_URI))
            <img src="{!! $SECONDARY_LOGO_URI !!}" alt="Secondary Logo" class="header-logo">
        @endif
    </div>
</div>

<div class="seating-meta" dir="rtl">
    @if(!empty($roomLabel))
        <span>{{ __('Room') }}: <span class="ltr">{{ $roomLabel }}</span></span>
    @endif
    @if(!empty($startSeat) && !empty($endSeat))
        <span>{{ __('Seat range') }}: <span class="ltr">{{ $startSeat }} - {{ $endSeat }}</span></span>
    @endif
    <span>{{ __('Grid') }}: <span class="ltr">{{ $gridRows }} × {{ $gridColumns }}</span></span>
    <span>{{ __('Generated') }}: <span class="ltr">{{ $CURRENT_DATETIME ?? now()->format('Y-m-d H:i') }}</span></span>
</div>

<table class="seating-grid" dir="rtl">
    <thead>
        <tr>
            <th>#</th>
            @for ($col = 1; $col <= $gridColumns; $col++)
                <th><span class="ltr">{{ $col }}</span></th>
            @endfor
        </tr>
    </thead>
    <tbody>
        @for ($row = 1; $row <= $gridRows; $row++)
            <tr>
                <th><span class="ltr">{{ $row }}</span></th>
                @for ($col = 1; $col <= $gridColumns; $col++)
                    @php
                        $cell = $cells->get($row.'-'.$col, []);
                        $isDisabled = (bool) ($cell['is_disabled'] ?? false);
                        $hasStudent = !empty($cell['student_name']);
                        $bg = $cell['color_hex'] ?? '#ffffff';
                    @endphp
                    <td>
                        <div
                            class="seat-cell {{ $isDisabled ? 'disabled' : ($hasStudent ? 'occupied' : 'empty') }}"
                            style="{{ $hasStudent && !$isDisabled ? 'background-color: '.$bg.';' : '' }}"
                        >
                            @if(!empty($cell['seat_number']))
                                <div class="seat-number ltr">{{ $cell['seat_number'] }}</div>
                            @endif
                            @if($isDisabled)
                                <div class="student-name">—</div>
                            @elseif($hasStudent)
                                <div class="student-name">{{ $cell['student_name'] }}</div>
                                @if(!empty($cell['exam_roll_number']))
                                    <div class="roll-number ltr">{{ $cell['exam_roll_number'] }}</div>
                                @endif
                            @else
                                <div class="student-name">&nbsp;</div>
                            @endif
                        </div>
                    </td>
                @endfor
            </tr>
        @endfor
    </tbody>
</table>

@if(!empty($class_colors))
<div class="class-legend" dir="rtl">
    @foreach($class_colors as $color)
        <span class="legend-item">
            <span class="legend-swatch" style="background-color: {{ $color['color_hex'] ?? '#ffffff' }};"></span>
            <span>{{ $color['class_name'] ?? $color['exam_class_id'] ?? '' }}</span>
        </span>
    @endforeach
</div>
@endif
@endsection
