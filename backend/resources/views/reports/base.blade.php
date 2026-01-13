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
            $fontSize = isset($FONT_SIZE) && !empty($FONT_SIZE) ? trim($FONT_SIZE) : '12px';
            
            // Log font settings for debugging (only in development)
            if (config('app.debug')) {
                \Log::debug("Blade template: Font settings", [
                    'FONT_FAMILY_var' => $FONT_FAMILY ?? 'NOT SET',
                    'FONT_SIZE_var' => $FONT_SIZE ?? 'NOT SET',
                    'fontFamily_processed' => $fontFamily,
                    'fontSize_processed' => $fontSize,
                ]);
            }
            
            // Normalize font name (remove spaces for @font-face, keep spaces for CSS font-family)
            $fontFamilyNormalized = str_replace(' ', '', $fontFamily); // "BahijNassim" for @font-face
            // Escape and quote font name properly for CSS
            $fontFamilyEscaped = str_replace("'", "\\'", $fontFamily);
            $fontFamilyQuoted = "'" . $fontFamilyEscaped . "'";
            // Parse font size to get numeric value for calculations
            $baseFontSize = intval(str_replace(['px', 'pt'], '', $fontSize));
            
            // CRITICAL: Always load Bahij Nassim fonts by default (they're the standard font for this system)
            // Check if font family matches Bahij Nassim (case-insensitive, with or without spaces)
            $loadBahijNassim = in_array(strtolower($fontFamilyNormalized), ['bahijnassim', 'bahij nassim']) || 
                              strtolower($fontFamily) === 'bahij nassim' ||
                              stripos($fontFamily, 'bahij') !== false;
            
            // Log for debugging
            if (config('app.debug')) {
                \Log::debug("Blade base template: Font processing", [
                    'FONT_FAMILY_input' => $FONT_FAMILY ?? 'NOT SET',
                    'FONT_SIZE_input' => $FONT_SIZE ?? 'NOT SET',
                    'fontFamily_processed' => $fontFamily,
                    'fontSize_processed' => $fontSize,
                    'baseFontSize_calculated' => $baseFontSize,
                    'loadBahijNassim' => $loadBahijNassim,
                ]);
            }
        @endphp

        /* Bahij Nassim Font Faces - Always load for PDF reports */
        @php
            // CRITICAL: This block MUST execute to load fonts
            \Log::info("Font loading block started");
            
            // CRITICAL: Browsershot needs fonts accessible via HTTP or base64
            // Use base64 data URLs for fonts (same pattern as images/logos)
            $fontBasePath = public_path('fonts');
            
            // Log the path being used
            \Log::info("Font base path: {$fontBasePath}", [
                'public_path_exists' => is_dir($fontBasePath),
                'public_path_readable' => is_readable($fontBasePath),
            ]);
            
            // Use DIRECTORY_SEPARATOR for cross-platform compatibility
            $ds = DIRECTORY_SEPARATOR;
            $regularTtfPath = $fontBasePath . $ds . 'Bahij Nassim-Regular.ttf';
            $regularWoffPath = $fontBasePath . $ds . 'Bahij Nassim-Regular.woff';
            $boldTtfPath = $fontBasePath . $ds . 'Bahij Nassim-Bold.ttf';
            $boldWoffPath = $fontBasePath . $ds . 'Bahij Nassim-Bold.woff';
            
            // Log all paths being checked
            \Log::info("Font file paths", [
                'regular_ttf' => $regularTtfPath,
                'regular_woff' => $regularWoffPath,
                'bold_ttf' => $boldTtfPath,
                'bold_woff' => $boldWoffPath,
            ]);
            
            // Convert fonts to base64 data URLs - prefer TTF, fallback to WOFF
            $regularTtfBase64 = null;
            $regularWoffBase64 = null;
            $boldTtfBase64 = null;
            $boldWoffBase64 = null;
            
            // Load Regular font (prefer TTF, fallback to WOFF)
            $regularTtfExists = file_exists($regularTtfPath);
            $regularWoffExists = file_exists($regularWoffPath);
            
            if ($regularTtfExists) {
                try {
                    $fontData = file_get_contents($regularTtfPath);
                    $base64 = base64_encode($fontData);
                    $regularTtfBase64 = "data:font/truetype;charset=utf-8;base64,{$base64}";
                } catch (\Exception $e) {
                    \Log::error("Failed to load Bahij Nassim Regular TTF: " . $e->getMessage());
                }
            } elseif ($regularWoffExists) {
                try {
                    $fontData = file_get_contents($regularWoffPath);
                    $base64 = base64_encode($fontData);
                    $regularWoffBase64 = "data:font/woff;charset=utf-8;base64,{$base64}";
                } catch (\Exception $e) {
                    \Log::error("Failed to load Bahij Nassim Regular WOFF: " . $e->getMessage());
                }
            }
            
            // Load Bold font (prefer TTF, fallback to WOFF)
            $boldTtfExists = file_exists($boldTtfPath);
            $boldWoffExists = file_exists($boldWoffPath);
            
            if ($boldTtfExists) {
                try {
                    $fontData = file_get_contents($boldTtfPath);
                    $base64 = base64_encode($fontData);
                    $boldTtfBase64 = "data:font/truetype;charset=utf-8;base64,{$base64}";
                } catch (\Exception $e) {
                    \Log::error("Failed to load Bahij Nassim Bold TTF: " . $e->getMessage());
                }
            } elseif ($boldWoffExists) {
                try {
                    $fontData = file_get_contents($boldWoffPath);
                    $base64 = base64_encode($fontData);
                    $boldWoffBase64 = "data:font/woff;charset=utf-8;base64,{$base64}";
                } catch (\Exception $e) {
                    \Log::error("Failed to load Bahij Nassim Bold WOFF: " . $e->getMessage());
                }
            }
            
            // Build src strings for @font-face declarations
            // Prefer base64, but fallback to HTTP URLs if base64 fails
            $regularSrc = [];
            if ($regularTtfBase64) {
                $regularSrc[] = 'url("' . $regularTtfBase64 . '") format("truetype")';
            }
            if ($regularWoffBase64) {
                $regularSrc[] = 'url("' . $regularWoffBase64 . '") format("woff")';
            }
            // Fallback to HTTP URL if base64 failed but file exists
            if (empty($regularSrc) && ($regularTtfExists || $regularWoffExists)) {
                $fontUrl = url('fonts/Bahij Nassim-Regular.' . ($regularTtfExists ? 'ttf' : 'woff'));
                $format = $regularTtfExists ? 'truetype' : 'woff';
                $regularSrc[] = 'url("' . $fontUrl . '") format("' . $format . '")';
            }
            $regularSrcString = implode(', ', $regularSrc);
            
            $boldSrc = [];
            if ($boldTtfBase64) {
                $boldSrc[] = 'url("' . $boldTtfBase64 . '") format("truetype")';
            }
            if ($boldWoffBase64) {
                $boldSrc[] = 'url("' . $boldWoffBase64 . '") format("woff")';
            }
            // Fallback to HTTP URL if base64 failed but file exists
            if (empty($boldSrc) && ($boldTtfExists || $boldWoffExists)) {
                $fontUrl = url('fonts/Bahij Nassim-Bold.' . ($boldTtfExists ? 'ttf' : 'woff'));
                $format = $boldTtfExists ? 'truetype' : 'woff';
                $boldSrc[] = 'url("' . $fontUrl . '") format("' . $format . '")';
            }
            $boldSrcString = implode(', ', $boldSrc);
            
            // ALWAYS log font loading status (not just in debug mode) for troubleshooting
            \Log::info("Blade template: Font loading status", [
                'font_base_path' => $fontBasePath,
                'regular_ttf_path' => $regularTtfPath,
                'regular_ttf_exists' => $regularTtfExists,
                'regular_woff_exists' => $regularWoffExists,
                'bold_ttf_exists' => $boldTtfExists,
                'bold_woff_exists' => $boldWoffExists,
                'regular_base64_length' => ($regularTtfBase64 ?: $regularWoffBase64) ? strlen($regularTtfBase64 ?: $regularWoffBase64) : 0,
                'bold_base64_length' => ($boldTtfBase64 ?: $boldWoffBase64) ? strlen($boldTtfBase64 ?: $boldWoffBase64) : 0,
                'regular_src_string_length' => strlen($regularSrcString),
                'bold_src_string_length' => strlen($boldSrcString),
                'regular_src_string_preview' => substr($regularSrcString, 0, 100),
                'bold_src_string_preview' => substr($boldSrcString, 0, 100),
            ]);
        @endphp
        @if(!empty($regularSrcString))
        @font-face {
            font-family: "BahijNassim";
            src: {!! $regularSrcString !!};
            font-weight: 400;
            font-style: normal;
            font-display: block;
            unicode-range: U+0000-10FFFF;
        }
        @else
        {{-- Fallback: Try HTTP URL if base64 failed --}}
        @font-face {
            font-family: "BahijNassim";
            src: url("{{ url('fonts/Bahij Nassim-Regular.ttf') }}") format("truetype"),
                 url("{{ url('fonts/Bahij Nassim-Regular.woff') }}") format("woff");
            font-weight: 400;
            font-style: normal;
            font-display: block;
            unicode-range: U+0000-10FFFF;
        }
        @endif
        @if(!empty($boldSrcString))
        @font-face {
            font-family: "BahijNassim";
            src: {!! $boldSrcString !!};
            font-weight: 700;
            font-style: normal;
            font-display: block;
            unicode-range: U+0000-10FFFF;
        }
        @else
        {{-- Fallback: Try HTTP URL if base64 failed --}}
        @font-face {
            font-family: "BahijNassim";
            src: url("{{ url('fonts/Bahij Nassim-Bold.ttf') }}") format("truetype"),
                 url("{{ url('fonts/Bahij Nassim-Bold.woff') }}") format("woff");
            font-weight: 700;
            font-style: normal;
            font-display: block;
            unicode-range: U+0000-10FFFF;
        }
        @endif

        /* CRITICAL: Always use Bahij Nassim as primary font for all PDF reports */
        html, body {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            font-size: {{ $fontSize }} !important;
            line-height: 1.5;
            color: #333;
            direction: {{ $rtl ?? true ? 'rtl' : 'ltr' }};
            text-align: {{ $rtl ?? true ? 'right' : 'left' }};
        }
        
        /* CRITICAL: Apply font to ALL elements with !important to override any defaults */
        * {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
        }
        
        /* Specific elements with font size - ensure font size is applied */
        body, p, div, span, td, th, h1, h2, h3, h4, h5, h6, .school-name, .report-title, .header-text, .data-table,
        table, thead, tbody, tfoot, tr, caption, li, ul, ol, a, label, input, textarea, select, button {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            font-size: {{ $fontSize }} !important;
        }
        
        /* Bold text should use bold font weight */
        .school-name, .report-title, th, strong, b, h1, h2, h3, h4, h5, h6 {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
            font-weight: 700 !important;
        }
        
        /* Ensure all table elements use Bahij font */
        .data-table, .data-table *, .data-table th, .data-table td, .data-table tr {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
        }
        
        /* Footer and header elements */
        .report-footer, .report-footer *, .report-header, .report-header *,
        .footer-text, .footer-left, .footer-right, .footer-center,
        .header-text, .header-left, .header-right, .header-center {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
        }
        
        /* Notes sections */
        .notes-section, .notes-section *, .note-item {
            font-family: "BahijNassim", 'DejaVu Sans', Arial, sans-serif !important;
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
            min-width: {{ $logo_height_px ?? 90 }}px;
            max-width: 150px;
            width: auto;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
        }

        .header-center {
            flex: 1;
            text-align: center;
            padding: 0 15px;
        }

        .header-logo {
            max-height: {{ $logo_height_px ?? 90 }}px;
            max-width: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            object-position: center;
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
            font-size: {{ $fontSize }};
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
            font-size: {{ $fontSize }} !important;
        }

        .data-table td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            text-align: center;
            font-size: {{ $fontSize }} !important;
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
            align-items: center;
            margin-bottom: 6px;
            gap: 12px;
            min-height: 20px;
        }

        .footer-left, .footer-right, .footer-center {
            flex: 1;
            text-align: center;
            padding: 0 6px;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.4;
        }

        .footer-left {
            text-align: {{ $rtl ?? true ? 'right' : 'left' }};
        }

        .footer-right {
            text-align: {{ $rtl ?? true ? 'left' : 'right' }};
        }

        .footer-center {
            text-align: center;
            flex: 1.2;
            padding: 0 8px;
        }

        .footer-text {
            text-align: center;
            margin-bottom: 10px;
            padding: 8px;
            font-size: {{ $fontSize }};
            color: #666;
        }

        .custom-footer {
            text-align: center;
            margin: 10px 0;
            padding: 5px 0;
        }

        .system-note {
            text-align: center;
            font-size: {{ ($baseFontSize * 0.67) }}px;
            color: #999;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #eee;
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
