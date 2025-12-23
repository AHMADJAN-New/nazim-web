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

        html, body {
            font-family: '{{ $FONT_FAMILY ?? 'Bahij Nassim' }}', 'DejaVu Sans', Arial, sans-serif;
            font-size: {{ $FONT_SIZE ?? '12px' }};
            line-height: 1.5;
            color: #333;
            direction: {{ $rtl ?? true ? 'rtl' : 'ltr' }};
            text-align: {{ $rtl ?? true ? 'right' : 'left' }};
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
            width: {{ $logo_height_px ?? 60 }}px;
            text-align: center;
        }

        .header-center {
            flex: 1;
            text-align: center;
            padding: 0 15px;
        }

        .header-logo {
            max-height: {{ $logo_height_px ?? 60 }}px;
            max-width: {{ $logo_height_px ?? 60 }}px;
            object-fit: contain;
        }

        .school-name {
            font-size: 18px;
            font-weight: bold;
            color: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
            margin-bottom: 5px;
        }

        .report-title {
            font-size: 14px;
            font-weight: 600;
            color: {{ $SECONDARY_COLOR ?? '#0056b3' }};
        }

        /* Notes sections */
        .notes-section {
            margin: 10px 0;
            font-size: 10px;
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
            font-size: 11px;
        }

        .data-table td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            text-align: center;
            font-size: 10px;
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
            font-size: 9px;
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
            font-size: 8px;
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
            font-size: 60px;
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
