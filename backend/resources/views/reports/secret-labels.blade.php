<!DOCTYPE html>
<html lang="ps" dir="rtl">

<head>
    <meta charset="utf-8">
    <title>د سری نمبر لیبلونه</title>
    <style>
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

        html,
        body {
            margin: 0;
            padding: 0;
            direction: rtl;
        }

        body {
            font-family: "BahijNassim", "Arial", sans-serif;
            direction: rtl;
        }

        @page {
            size: A4 portrait;
            margin: 5mm;
        }

        @page.single-label {
            size: 25.4mm 50.8mm;
            /* 1 inch x 2 inches */
            margin: 0;
        }

        /* Single label per page layout (for label printers) */
        .page.single-label {
            width: 25.4mm;
            /* 1 inch */
            height: 50.8mm;
            /* 2 inches */
            box-sizing: border-box;
            padding: 0;
            direction: rtl;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            page-break-after: always;
        }

        /* A4 grid layout */
        .page.grid-layout {
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            padding: 5mm;
            direction: rtl;
            margin: 0;
        }

        @media print {

            html,
            body {
                margin: 0;
                padding: 0;
            }

            .page.single-label {
                width: 25.4mm;
                height: 50.8mm;
                page-break-after: always;
                margin: 0;
                padding: 0;
            }

            .page.grid-layout {
                width: 210mm;
                height: 297mm;
                page-break-after: always;
                margin: 0;
                padding: 5mm;
            }
        }

        .labels-container {
            display: grid;
            grid-template-columns: repeat(7, 25.4mm);
            /* 7 columns of 1 inch each */
            grid-template-rows: repeat(5, 50.8mm);
            /* 5 rows of 2 inches each */
            gap: 2mm;
            width: 100%;
            height: calc(5 * 50.8mm + 4 * 2mm);
            /* 5 rows + 4 gaps */
            justify-content: center;
            align-content: start;
        }

        .label {
            width: 25.4mm;
            /* 1 inch */
            height: 50.8mm;
            /* 2 inches */
            border: 1px solid #000;
            padding: 1.5mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            page-break-inside: avoid;
            background: #fff;
            direction: rtl;
            font-size: 8pt;
            overflow: hidden;
        }

        /* Single label layout - centered on page */
        .single-label .label {
            margin: 0 auto;
        }

        .label-header {
            width: 100%;
            text-align: center;
            font: 700 9pt "BahijNassim", "Arial", sans-serif;
            margin-bottom: 1mm;
            line-height: 1.2;
        }

        .secret-number {
            font: 700 14pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            letter-spacing: 1px;
            margin: 1mm 0;
            line-height: 1.2;
        }

        .class-info {
            font: 400 7pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            margin: 0.5mm 0;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
        }

        .subject-info {
            font: 700 7pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            margin: 0.5mm 0;
            line-height: 1.1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
        }

        .exam-date {
            font: 400 6pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            margin: 0.5mm 0;
            line-height: 1.1;
        }

        .barcode {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 1mm;
            flex-shrink: 0;
        }

        .barcode img {
            width: 100%;
            max-width: 20mm;
            height: auto;
            max-height: 15mm;
            display: block;
            object-fit: contain;
        }

        .barcode-placeholder {
            width: 100%;
            height: 12mm;
            border: 1px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 6pt;
            color: #999;
            background: #fff;
        }

        @media print {
            .label {
                page-break-inside: avoid;
            }
        }
    </style>
</head>

<body>
    @if ($layout === 'single')
        {{-- Single label per page layout (for label printers) --}}
        @foreach ($labels as $label)
            <div class="page single-label">
                <div class="label" data-secret-number="{{ $label['exam_secret_number'] }}">
                    <div class="label-header">
                        {{ $examName }}
                    </div>
                    <div class="secret-number">
                        {{ $label['exam_secret_number'] }}
                    </div>
                    <div class="class-info">
                        {{ $label['class_name'] }}{{ $label['section'] ? ' - ' . $label['section'] : '' }}
                    </div>
                    @if (!empty($label['subject_name']))
                        <div class="subject-info">
                            {{ $label['subject_name'] }}
                        </div>
                        @if (!empty($label['subject_exam_date']))
                            <div class="exam-date">
                                {{ $label['subject_exam_date'] }}
                            </div>
                        @endif
                    @endif
                    <div class="barcode">
                        @if (!empty($label['barcode']) && !empty($label['exam_secret_number']))
                            <img src="{{ $label['barcode'] }}" alt="Barcode: {{ $label['exam_secret_number'] }}"
                                title="سری نمبر: {{ $label['exam_secret_number'] }}" />
                        @else
                            <div class="barcode-placeholder">
                                {{ $label['exam_secret_number'] ?? '' }}
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        @endforeach
    @else
        {{-- A4 grid layout (multiple labels per page) --}}
        @php
            $labelsPerPage = 35; // 7 columns x 5 rows
            $chunks = array_chunk($labels, $labelsPerPage);
        @endphp

        @foreach ($chunks as $pageLabels)
            <div class="page grid-layout">
                <div class="labels-container">
                    @foreach ($pageLabels as $label)
                        <div class="label" data-secret-number="{{ $label['exam_secret_number'] }}">
                            <div class="label-header">
                                {{ $examName }}
                            </div>
                            <div class="secret-number">
                                {{ $label['exam_secret_number'] }}
                            </div>
                            <div class="class-info">
                                {{ $label['class_name'] }}{{ $label['section'] ? ' - ' . $label['section'] : '' }}
                            </div>
                            @if (!empty($label['subject_name']))
                                <div class="subject-info">
                                    {{ $label['subject_name'] }}
                                </div>
                                @if (!empty($label['subject_exam_date']))
                                    <div class="exam-date">
                                        {{ $label['subject_exam_date'] }}
                                    </div>
                                @endif
                            @endif
                            <div class="barcode">
                                @if (!empty($label['barcode']) && !empty($label['exam_secret_number']))
                                    <img src="{{ $label['barcode'] }}"
                                        alt="Barcode: {{ $label['exam_secret_number'] }}"
                                        title="سری نمبر: {{ $label['exam_secret_number'] }}" />
                                @else
                                    <div class="barcode-placeholder">
                                        {{ $label['exam_secret_number'] ?? '' }}
                                    </div>
                                @endif
                            </div>
                        </div>
                    @endforeach

                    @for ($i = count($pageLabels); $i < $labelsPerPage; $i++)
                        <div class="label" style="visibility: hidden;"></div>
                    @endfor
                </div>
            </div>
        @endforeach
    @endif
</body>

</html>
