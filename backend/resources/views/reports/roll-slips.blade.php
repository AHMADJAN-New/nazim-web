<!DOCTYPE html>
<html lang="ps" dir="rtl">
<head>
    <meta charset="utf-8">
    <title>د رقم الجلوس کارت</title>
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
        @font-face {
            font-family: "BahijTitr";
            src: url("/fonts/Bahij Titr-Bold.woff") format("woff"),
                 url("/fonts/Bahij Titr-Bold.ttf") format("truetype");
            font-weight: 700;
            font-style: normal;
            font-display: swap;
        }
        html, body {
            margin:0;
            padding:0;
            direction: rtl;
        }
        body {
            font-family: "BahijNassim", "Arial", sans-serif;
            direction: rtl;
        }
        @page {
            size: A4 portrait;
            margin: 3mm;
        }
        .page {
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            padding: 3mm;
            direction: rtl;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
        }
        @media print {
            html, body {
                margin: 0;
                padding: 0;
                width: 210mm;
                height: 297mm;
            }
            .page {
                page-break-after: always;
                margin: 0;
                padding: 3mm;
                width: 210mm;
                height: 297mm;
                display: flex;
                justify-content: center;
                align-items: flex-start;
            }
        }
        .grid {
            display: grid;
            grid-template-columns: 1fr;
            grid-template-rows: repeat(4, 1fr);
            grid-row-gap: 5mm;
            width: calc(100% - 20.32mm); /* Reduce by 0.8 inches (20.32mm) */
            max-width: calc(210mm - 20.32mm - 6mm); /* Page width - reduction - padding */
            height: 291mm; /* 297mm - 6mm padding */
            margin: 0 auto; /* Center horizontally */
        }
        .slip {
            border: 2px solid #000;
            padding: 4mm;
            box-sizing: border-box;
            min-height: 0; /* Allow flex shrinking */
            display: flex;
            flex-direction: column;
            overflow: hidden;
            font-family: "BahijNassim", "Arial", sans-serif;
            direction: rtl;
            background: #fff;
            border-radius: 1mm;
        }
        .title {
            font: 700 13pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            margin: 0 0 1mm 0;
            line-height: 1.1;
        }
        .row {
            display: grid;
            grid-template-columns: 1fr 1fr 25mm;
            grid-column-gap: 4mm;
            align-items: start;
            flex: 1;
            margin-bottom: 2mm;
        }
        .qr {
            text-align: center;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2mm;
            border: 1px solid #e0e0e0;
            background: #fafafa;
            border-radius: 2mm;
        }
        .qr img {
            width: 100%;
            height: auto;
            max-width: 21mm;
            max-height: 21mm;
            display: block;
            object-fit: contain;
        }
        .qr-placeholder {
            width: 100%;
            height: 21mm;
            border: 2px dashed #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            color: #999;
            background: #fff;
            border-radius: 2mm;
        }
        .info {
            font-size: 13pt;
            line-height: 1.2;
        }
        .info .label {
            font-weight: 700;
            display: inline;
        }
        .info .value {
            font-weight: 400;
            display: inline;
        }
        .info div {
            margin-bottom: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            padding: 0.5mm 0;
        }
        .subjects {
            display: flex;
            flex-wrap: wrap;
            gap: 1mm;
            margin: 1.5mm 0;
            flex-shrink: 0;
            max-height: 25mm;
            overflow: hidden;
        }
        .subjects .box {
            border: 1px solid #000;
            font: 400 11pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            padding: 0.5mm;
            min-height: 8mm;
            min-width: 15mm;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            word-wrap: break-word;
            overflow: hidden;
        }
        .subjects .box .subject-name {
            font-weight: 700;
            margin-bottom: 0.5mm;
        }
        .subjects .box .subject-date {
            font-size: 9pt;
            font-weight: 400;
        }
        .note {
            font: 700 13pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
            margin: 0 0 1mm 0;
            flex-shrink: 0;
            line-height: 1.2;
        }
        .signature {
            display: flex;
            justify-content: flex-end;
            align-items: end;
            margin: 2mm 0 0 0;
            flex-shrink: 0;
            padding-right: 3mm;
        }
        .signature .line {
            border-bottom: 2px solid #000;
            width: 35mm;
            height: 12mm;
            display: flex;
            align-items: end;
            justify-content: center;
            font: 700 13pt "BahijNassim", "Arial", sans-serif;
            text-align: center;
        }
    </style>
</head>
<body>
    @php
        $slipsPerPage = 4;
        $chunks = array_chunk($slips, $slipsPerPage);
        $noteText = 'نوټ: له دې سلپ پرته د امتحان تالار ته د ننوتو اجازه نشته.';
    @endphp

    @foreach($chunks as $pageSlips)
        <div class="page">
            <div class="grid">
                @foreach($pageSlips as $slip)
                    <div class="slip">
                        <div class="title">
                            {{ $schoolName }} – د {{ $examName }} د امتحان د رقم الجلوس کارت
                        </div>
                        <div class="row">
                            <div class="info">
                                <div><span class="label">نوم:</span> <span class="value">{{ $slip['full_name'] }}</span></div>
                                <div><span class="label">د پلار نوم:</span> <span class="value">{{ $slip['father_name'] ?? '' }}</span></div>
                                <div><span class="label">د نوم لیک نمبر:</span> <span class="value">{{ $slip['admission_number'] ?? '' }}</span></div>
                                <div><span class="label">اطاق نمبر:</span> <span class="value">{{ $slip['room_number'] ?? '' }}</span></div>
                            </div>
                            <div class="info">
                                <div><span class="label">رقم الجلوس:</span> <span class="value">{{ $slip['exam_roll_number'] }}</span></div>
                                <div><span class="label">ولایت:</span> <span class="value">{{ $slip['province'] ?? '' }}</span></div>
                                <div><span class="label">درجه:</span> <span class="value">{{ $slip['class_name'] }}{{ $slip['section'] ? ' - ' . $slip['section'] : '' }}</span></div>
                            </div>
                            <div class="qr">
                                @if(!empty($slip['qr_code']) && !empty($slip['exam_roll_number']))
                                    <img src="{{ $slip['qr_code'] }}" alt="QR Code: {{ $slip['exam_roll_number'] }}" title="رقم الجلوس: {{ $slip['exam_roll_number'] }}" />
                                @else
                                    <div class="qr-placeholder">
                                        QR<br/>
                                        <span style="font-size: 7pt;">{{ $slip['exam_roll_number'] ?? '' }}</span>
                                    </div>
                                @endif
                            </div>
                        </div>
                        <div class="note">
                            {{ $noteText }}
                        </div>
                        <div class="subjects">
                            @foreach($slip['subjects'] as $subject)
                                @php
                                    $subjectName = is_array($subject) ? ($subject['name'] ?? '') : $subject;
                                    $subjectDate = is_array($subject) ? ($subject['date'] ?? '') : '';
                                    $dateDisplay = $subjectDate ? date('Y-m-d', strtotime($subjectDate)) : '';
                                @endphp
                                @if(!empty($subjectName))
                                    <div class="box">
                                        <div class="subject-name">{{ $subjectName }}</div>
                                        @if($dateDisplay)
                                            <div class="subject-date">{{ $dateDisplay }}</div>
                                        @endif
                                    </div>
                                @endif
                            @endforeach
                        </div>
                        <div class="signature">
                            <div class="line">د ممتحن امضاء</div>
                        </div>
                    </div>
                @endforeach

                @for($i = count($pageSlips); $i < $slipsPerPage; $i++)
                    <div class="slip" style="visibility: hidden;"></div>
                @endfor
            </div>
        </div>
    @endforeach
</body>
</html>

