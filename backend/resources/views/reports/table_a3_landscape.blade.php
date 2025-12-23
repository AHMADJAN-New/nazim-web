@extends('reports.base')

@php
    // Override page settings for A3 landscape
    $page_size = 'A3';
    $orientation = 'landscape';
@endphp

@section('content')
    {{-- Watermark --}}
    @if(!empty($WATERMARK))
        <div class="watermark">
            @if($WATERMARK['wm_type'] === 'image' && !empty($WATERMARK['image_data_uri']))
                <img src="{{ $WATERMARK['image_data_uri'] }}" alt="Watermark" class="watermark-image" style="max-width: 600px; max-height: 600px;">
            @elseif($WATERMARK['wm_type'] === 'text' && !empty($WATERMARK['text']))
                <span class="watermark-text" style="font-size: 80px;">{{ $WATERMARK['text'] }}</span>
            @endif
        </div>
    @endif

    {{-- Header --}}
    <div class="report-header">
        {{-- Left logo --}}
        <div class="header-left" style="width: 80px;">
            @if(($show_primary_logo ?? true) && !empty($PRIMARY_LOGO_URI))
                <img src="{{ $PRIMARY_LOGO_URI }}" alt="Primary Logo" class="header-logo" style="max-height: 70px; max-width: 70px;">
            @endif
        </div>

        {{-- Center content --}}
        <div class="header-center">
            @if(!empty($SCHOOL_NAME_PASHTO))
                <div class="school-name" style="font-size: 22px;">{{ $SCHOOL_NAME_PASHTO }}</div>
            @elseif(!empty($SCHOOL_NAME))
                <div class="school-name" style="font-size: 22px;">{{ $SCHOOL_NAME }}</div>
            @endif

            @if(!empty($TABLE_TITLE))
                <div class="report-title" style="font-size: 16px;">{{ $TABLE_TITLE }}</div>
            @endif

            {{-- Custom header HTML --}}
            @if(!empty($header_html))
                <div class="custom-header">{!! $header_html !!}</div>
            @endif
        </div>

        {{-- Right logo --}}
        <div class="header-right" style="width: 80px;">
            @if(($show_secondary_logo ?? true) && !empty($SECONDARY_LOGO_URI))
                <img src="{{ $SECONDARY_LOGO_URI }}" alt="Secondary Logo" class="header-logo" style="max-height: 70px; max-width: 70px;">
            @elseif(($show_ministry_logo ?? false) && !empty($MINISTRY_LOGO_URI))
                <img src="{{ $MINISTRY_LOGO_URI }}" alt="Ministry Logo" class="header-logo" style="max-height: 70px; max-width: 70px;">
            @endif
        </div>
    </div>

    {{-- Header notes --}}
    @if(!empty($NOTES_HEADER))
        <div class="notes-section header-notes">
            @foreach($NOTES_HEADER as $note)
                <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
            @endforeach
        </div>
    @endif

    {{-- Data table (A3 optimized for many columns) --}}
    <table class="data-table" style="font-size: 8px;">
        <thead>
            <tr>
                <th class="row-number" style="width: 20px; padding: 4px 2px;">#</th>
                @foreach($COLUMNS as $index => $column)
                    @php
                        $label = is_array($column) ? ($column['label'] ?? $column['key'] ?? '') : $column;
                        $width = isset($COL_WIDTHS[$index]) ? $COL_WIDTHS[$index] . '%' : 'auto';
                    @endphp
                    <th style="width: {{ $width }}; padding: 4px 2px; font-size: 7px;">{{ $label }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($ROWS as $rowIndex => $row)
                <tr>
                    <td class="row-number" style="padding: 3px 2px; font-size: 7px;">{{ $rowIndex + 1 }}</td>
                    @foreach($COLUMNS as $colIndex => $column)
                        @php
                            $key = is_array($column) ? ($column['key'] ?? $colIndex) : $colIndex;
                            $value = is_array($row) ? ($row[$key] ?? ($row[$colIndex] ?? '')) : '';
                        @endphp
                        <td style="padding: 3px 2px; font-size: 7px;">{{ $value !== null && $value !== '' ? $value : '—' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($COLUMNS) + 1 }}" style="text-align: center; padding: 20px;">
                        هیڅ معلومات ونه موندل شول.
                    </td>
                </tr>
            @endforelse
        </tbody>
    </table>

    {{-- Body notes --}}
    @if(!empty($NOTES_BODY))
        <div class="notes-section body-notes">
            @foreach($NOTES_BODY as $note)
                <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
            @endforeach
        </div>
    @endif

    {{-- Footer --}}
    <div class="report-footer">
        <div class="footer-row">
            <div class="footer-left">
                @if(!empty($SCHOOL_PHONE))
                    تلیفون: {{ $SCHOOL_PHONE }}
                @endif
                @if(!empty($SCHOOL_EMAIL))
                    | ایمیل: {{ $SCHOOL_EMAIL }}
                @endif
                @if(!empty($SCHOOL_WEBSITE))
                    | {{ $SCHOOL_WEBSITE }}
                @endif
                @if(!empty($SCHOOL_ADDRESS))
                    | {{ $SCHOOL_ADDRESS }}
                @endif
            </div>
            <div class="footer-right">
                @if($show_generation_date ?? true)
                    نیټه: {{ $CURRENT_DATETIME ?? now()->format('Y-m-d H:i') }}
                @endif
            </div>
        </div>

        {{-- Custom footer HTML --}}
        @if(!empty($footer_html))
            <div class="custom-footer">{!! $footer_html !!}</div>
        @endif

        {{-- Footer notes --}}
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
@endsection
