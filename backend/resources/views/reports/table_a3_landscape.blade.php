@extends('reports.base')

@php
    // Override page settings for A3 landscape
    $page_size = 'A3';
    $orientation = 'landscape';
@endphp

@section('content')
<style>
    /* A3 Landscape footer adjustments */
    .report-footer .footer-row {
        gap: 30px;
    }
    .report-footer .footer-left, 
    .report-footer .footer-right, 
    .report-footer .footer-center {
        padding: 0 15px;
    }
</style>
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
        {{-- Left side logos --}}
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
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="display: block; max-height: 100px; max-width: 100%; width: auto; height: auto; object-fit: contain; object-position: center; margin-bottom: 5px;">
            @endforeach
        </div>

        {{-- Center content --}}
        <div class="header-center">
            {{-- Header text above school name --}}
            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'above_school_name')
                <div class="header-text" style="margin-bottom: 5px;">{{ $header_text }}</div>
            @endif

            @if(!empty($SCHOOL_NAME_PASHTO))
                <div class="school-name" style="font-size: 22px;">{{ $SCHOOL_NAME_PASHTO }}</div>
            @elseif(!empty($SCHOOL_NAME))
                <div class="school-name" style="font-size: 22px;">{{ $SCHOOL_NAME }}</div>
            @endif

            {{-- Header text below school name (default) --}}
            @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'below_school_name')
                <div class="header-text" style="margin-top: 5px;">{{ $header_text }}</div>
            @endif

            @if(!empty($TABLE_TITLE))
                <div class="report-title" style="font-size: 16px;">{{ $TABLE_TITLE }}</div>
            @endif

            {{-- Custom header HTML (overrides header text if provided) --}}
            @if(!empty($header_html))
                <div class="custom-header">{!! $header_html !!}</div>
            @endif
        </div>

        {{-- Right side logos --}}
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
                <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="display: block; max-height: 100px; max-width: 100%; width: auto; height: auto; object-fit: contain; object-position: center; margin-bottom: 5px;">
            @endforeach
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
    @php
        // Ensure COLUMNS is defined, default to empty array if not set
        $COLUMNS = $COLUMNS ?? [];
        $ROWS = $ROWS ?? [];
    @endphp
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
                            // Convert value to string to avoid htmlspecialchars() errors with arrays
                            if (is_array($value) || is_object($value)) {
                                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                            } else {
                                $value = (string) $value;
                            }
                            // Only show non-empty values, otherwise show em dash
                            // NOTE: "0" is a valid value and must be shown.
                            $displayValue = ($value !== null && $value !== '') ? $value : '—';
                        @endphp
                        <td style="padding: 3px 2px; font-size: 7px;">{{ $displayValue }}</td>
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
        {{-- Footer text (from template) --}}
        @if(!empty($footer_text))
            <div class="footer-text">{{ $footer_text }}</div>
        @endif

        {{-- First row: Contact info, website, and date --}}
        <div class="footer-row">
            <div class="footer-left">
                @if(!empty($SCHOOL_PHONE))
                    تلیفون: {{ $SCHOOL_PHONE }}
                @endif
                @if(!empty($SCHOOL_EMAIL))
                    @if(!empty($SCHOOL_PHONE)) | @endif
                    ایمیل: {{ $SCHOOL_EMAIL }}
                @endif
            </div>
            <div class="footer-center">
                @if(!empty($SCHOOL_WEBSITE))
                    {{ $SCHOOL_WEBSITE }}
                @endif
            </div>
            <div class="footer-right">
                @if($show_generation_date ?? true)
                    نیټه: {{ $CURRENT_DATETIME ?? now()->format('Y-m-d H:i') }}
                @endif
            </div>
        </div>

        {{-- Second row: Address (if available) --}}
        @if(!empty($SCHOOL_ADDRESS))
            <div class="footer-row">
                <div class="footer-left"></div>
                <div class="footer-center">
                    {{ $SCHOOL_ADDRESS }}
                </div>
                <div class="footer-right"></div>
            </div>
        @endif

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
