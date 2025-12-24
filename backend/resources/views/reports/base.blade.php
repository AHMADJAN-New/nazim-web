<!DOCTYPE html>
<html lang="{{ $rtl ?? true ? 'fa' : 'en' }}" dir="{{ $rtl ?? true ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $TABLE_TITLE ?? 'Report' }}</title>
    <style>
        /* Base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: {{ $page_size ?? 'A4' }} {{ $orientation ?? 'portrait' }};
            margin: {{ $margins ?? '15mm 12mm 18mm 12mm' }};
        }

        @php
            // Set up font family and size variables at the top for use throughout the template
            $fontFamily = isset($FONT_FAMILY) && !empty(trim($FONT_FAMILY)) ? trim($FONT_FAMILY) : 'Bahij Nassim';
            // Normalize font name (remove spaces for @font-face, keep spaces for CSS font-family)
            $fontFamilyNormalized = str_replace(' ', '', $fontFamily); // "BahijNassim" for @font-face
            // Escape and quote font name properly for CSS
            $fontFamilyEscaped = str_replace("'", "\\'", $fontFamily);
            $fontFamilyQuoted = "'" . $fontFamilyEscaped . "'";
            // Parse font size to get numeric value for calculations
            $baseFontSize = isset($FONT_SIZE) && !empty($FONT_SIZE) ? intval(str_replace(['px', 'pt'], '', $FONT_SIZE)) : 12;
            
            // Load Bahij Nassim fonts if the font family matches
            $loadBahijNassim = in_array(strtolower($fontFamilyNormalized), ['bahijnassim', 'bahij nassim']) || 
                              strtolower($fontFamily) === 'bahij nassim';
        @endphp

        @if($loadBahijNassim)
        /* Bahij Nassim Font Faces */
        @font-face {
            font-family: "BahijNassim";
            src: url("/fonts/Bahij Nassim-Regular.woff") format("woff"),
                 url("/fonts/Bahij Nassim-Regular.ttf") format("truetype");
            font-weight: 400;
            font-style: normal;
            font-display: swap;
        }

        @font-face {
            font-family: "BahijNassim";
            src: url("/fonts/Bahij Nassim-Bold.woff") format("woff"),
                 url("/fonts/Bahij Nassim-Bold.ttf") format("truetype");
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }
        @endif

        html, body {
            @if($loadBahijNassim)
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif;
            @else
            font-family: {!! $fontFamilyQuoted !!}, 'DejaVu Sans', Arial, sans-serif;
            @endif
            font-size: {{ $FONT_SIZE ?? '12px' }};
            line-height: 1.5;
            color: #333;
            direction: {{ $rtl ?? true ? 'rtl' : 'ltr' }};
            text-align: {{ $rtl ?? true ? 'right' : 'left' }};
        }
        
        /* Apply font to all text elements */
        * {
            font-family: inherit;
        }
        
        /* Ensure all text uses the specified font */
        /* Apply font to ALL elements */
        * {
            @if($loadBahijNassim)
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            @else
            font-family: {!! $fontFamilyQuoted !!}, 'DejaVu Sans', Arial, sans-serif !important;
            @endif
        }
        
        /* Specific elements with font size based on base font size */
        body, p, div, span, td, th, h1, h2, h3, h4, h5, h6, .school-name, .report-title, .header-text, .data-table {
            @if($loadBahijNassim)
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            @else
            font-family: {!! $fontFamilyQuoted !!}, 'DejaVu Sans', Arial, sans-serif !important;
            @endif
        }
        
        /* Bold text should use bold font weight */
        .school-name, .report-title, th, strong, b {
            @if($loadBahijNassim)
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            font-weight: 700 !important;
            @else
            font-weight: bold !important;
            @endif
        }

        /* Header section */
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid {{ $PRIMARY_COLOR ?? '#0b0b56' }};
        }

        .header-left, .header-right {
            width: {{ $logo_height_px ?? 90 }}px;
            text-align: center;
        }

        .header-center {
            flex: 1;
            text-align: center;
            padding: 0 15px;
        }

        .header-logo {
            max-height: {{ $logo_height_px ?? 90 }}px;
            max-width: {{ $logo_height_px ?? 90 }}px;
            object-fit: contain;
        }

        .school-name {
            font-size: {{ ($baseFontSize * 1.5) }}px;
            font-weight: bold;
            color: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
            margin-bottom: 5px;
        }

        .report-title {
            font-size: {{ ($baseFontSize * 1.17) }}px;
            font-weight: 600;
            color: {{ $SECONDARY_COLOR ?? '#0056b3' }};
        }
        
        .header-text {
            font-size: {{ $FONT_SIZE ?? '12px' }};
            color: #666;
        }

        /* Notes sections */
        .notes-section {
            margin: 10px 0;
            font-size: {{ ($baseFontSize * 0.83) }}px;
            color: #666;
        }

        .notes-section.header-notes {
            margin-bottom: 15px;
        }

        .notes-section.body-notes {
            margin: 15px 0;
        }

        .notes-section.footer-notes {
            margin-top: 15px;
        }

        .note-item {
            margin-bottom: 3px;
            font-style: italic;
        }

        /* Table styles */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }

        .data-table thead {
            display: table-header-group;
        }

        .data-table th {
            background-color: {{ $SECONDARY_COLOR ?? '#0056b3' }};
            color: #ffffff;
            font-weight: bold;
            padding: 8px 6px;
            border: 1px solid {{ $PRIMARY_COLOR ?? '#0b0b56' }};
            text-align: center;
            font-size: {{ $FONT_SIZE ?? '12px' }} !important;
        }

        .data-table td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            text-align: center;
            font-size: {{ $FONT_SIZE ?? '12px' }} !important;
        }

        .data-table tr:nth-child(even) td {
            @if($table_alternating_colors ?? true)
            background-color: #f9f9f9;
            @endif
        }

        .data-table tbody tr {
            page-break-inside: avoid;
        }

        .row-number {
            width: 30px;
            font-weight: bold;
            background-color: #f0f0f0;
        }

        /* Footer section */
        .report-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: {{ ($baseFontSize * 0.75) }}px;
            color: #666;
        }

        .footer-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }

        .footer-left, .footer-right {
            max-width: 50%;
        }

        .footer-center {
            text-align: center;
        }

        .system-note {
            text-align: center;
            font-size: {{ ($baseFontSize * 0.67) }}px;
            color: #999;
            margin-top: 10px;
        }

        /* Watermark */
        .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate({{ $WATERMARK['rotation_deg'] ?? 35 }}deg);
            opacity: {{ $WATERMARK['opacity'] ?? 0.08 }};
            z-index: -1;
            pointer-events: none;
        }

        .watermark-text {
            font-size: {{ ($baseFontSize * 5) }}px;
            color: {{ $WATERMARK['color'] ?? '#000000' }};
            font-family: {{ $WATERMARK['font_family'] ?? $FONT_FAMILY ?? 'Bahij Nassim' }};
        }

        .watermark-image {
            max-width: 400px;
            max-height: 400px;
        }

        /* Page numbers (printed via CSS counter) */
        @media print {
            .page-number::after {
                counter-increment: page;
                content: counter(page);
            }
        }

        /* Extra CSS from layout */
        {!! $extra_css ?? '' !!}
    </style>
</head>
<body>
    @yield('content')
</body>
</html>
