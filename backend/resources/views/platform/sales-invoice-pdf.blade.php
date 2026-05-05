@php
    $organization = $organization ?? null;
    $invoice = $invoice ?? [];
    $items = $items ?? [];
    $payments = $payments ?? [];
    $paymentSummary = $payment_summary ?? null;
    $nazimLogoDataUri = $nazimLogoDataUri ?? null;
    $formatDateFn = $formatDate ?? fn ($d, $f = 'full') => $d ? \Carbon\Carbon::parse($d)->format('Y-m-d') : '—';

    $fontDir = public_path('fonts');
    $regularPath = $fontDir . DIRECTORY_SEPARATOR . 'Bahij Nassim-Regular.ttf';
    $boldPath = $fontDir . DIRECTORY_SEPARATOR . 'Bahij Nassim-Bold.ttf';
    $regularFont = file_exists($regularPath) ? 'data:font/truetype;charset=utf-8;base64,' . base64_encode(file_get_contents($regularPath)) : null;
    $boldFont = file_exists($boldPath) ? 'data:font/truetype;charset=utf-8;base64,' . base64_encode(file_get_contents($boldPath)) : $regularFont;

    $text = static fn ($value) => filled($value) ? $value : '—';
    $money = static fn ($value) => filled($value) ? number_format((float) $value, 2) : '—';

    $currency = $invoice['currency'] ?? 'AFN';
    $total = (float) ($invoice['total_amount'] ?? 0);
    $paid = (float) ($paymentSummary['paid'] ?? 0);
    $due = (float) ($paymentSummary['due'] ?? max($total - $paid, 0));

    $statusLabel = match ($invoice['status'] ?? null) {
        'sent' => 'Sent',
        'paid' => 'Paid',
        'cancelled' => 'Cancelled',
        default => 'Draft',
    };
@endphp
<!DOCTYPE html>
<html lang="ps" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>د ناظم سافټویر انوایس</title>
    <style>
        @page { size: A4; margin: 10mm; }
        @font-face {
            font-family: "BahijNassim";
            src: url("{{ $regularFont }}") format("truetype");
            font-weight: 400;
        }
        @font-face {
            font-family: "BahijNassim";
            src: url("{{ $boldFont }}") format("truetype");
            font-weight: 700;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            background: #f2f6fb;
            color: #142640;
            font: 13px/1.7 "BahijNassim", "DejaVu Sans", sans-serif;
        }
        .page {
            background: #fff;
            border: 1px solid #d7e0ed;
            border-radius: 18px;
            overflow: hidden;
        }
        .hero {
            padding: 18px 22px;
            color: #fff;
            background:
                radial-gradient(circle at top left, rgba(255,255,255,.18), transparent 35%),
                linear-gradient(135deg, #0b2c6b 0%, #1c4ea7 65%, #235fcc 100%);
        }
        .hero-table { width: 100%; border-collapse: separate; border-spacing: 10px; margin: -10px; }
        .hero-meta { text-align: left; width: 38%; vertical-align: top; }
        .hero-logo { width: 80px; height: auto; max-height: 56px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,.2); padding: 4px; }
        h1 { margin: 0 0 4px; font-size: 24px; line-height: 1.3; }
        .subtitle { font-size: 13px; opacity: .92; }
        .chip {
            display: inline-block;
            min-width: 140px;
            margin-bottom: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(255,255,255,.14);
            text-align: center;
            font-size: 11px;
            font-weight: 700;
        }
        .status-chip { background: rgba(201,164,77,.22); }
        .content { padding: 18px; }
        .intro, .card {
            border: 1px solid #dce5f2;
            border-radius: 14px;
            background: #fbfdff;
            padding: 12px 14px;
        }
        .section { margin-top: 16px; border: 1px solid #dce5f2; border-radius: 16px; overflow: hidden; }
        .section-title {
            padding: 10px 14px;
            border-right: 5px solid #c9a44d;
            background: linear-gradient(90deg, #edf4ff 0%, #fff 100%);
            color: #0b2c6b;
            font-size: 16px;
            font-weight: 700;
        }
        .section-body { padding: 14px; }
        .kv { width: 100%; border-collapse: collapse; }
        .kv td { padding: 5px 0; border-bottom: 1px dashed #d7e0ed; vertical-align: top; }
        .kv tr:last-child td { border-bottom: none; }
        .label { width: 34%; color: #5c6f8d; font-weight: 700; }
        .ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }
        .summary { width: 100%; border-collapse: collapse; margin-top: 0; }
        .summary th, .summary td {
            border: 1px solid #dce5f2;
            padding: 9px 10px;
            vertical-align: top;
        }
        .summary th {
            background: #edf4ff;
            color: #0b2c6b;
            font-weight: 700;
        }
        .highlight td {
            background: #fff8e8;
            color: #6d5419;
            font-weight: 700;
        }
        .totals td.label { width: 55%; }
        .muted { color: #5c6f8d; font-weight: 700; }
    </style>
</head>
<body>
    <div class="page">
        <div class="hero">
            <table class="hero-table">
                <tr>
                    <td style="width: 80px; vertical-align: top; padding-right: 12px;">
                        @if($nazimLogoDataUri)
                            <img src="{{ $nazimLogoDataUri }}" alt="Nazim" class="hero-logo" />
                        @endif
                    </td>
                    <td>
                        <h1>د ناظم سافټویر انوایس</h1>
                        <div class="subtitle">Nazim Software Sales Invoice</div>
                    </td>
                    <td class="hero-meta">
                        <div class="chip">شمېره: <span class="ltr">{{ $text($invoice['invoice_number'] ?? null) }}</span></div>
                        <div class="chip">نېټه: <span class="ltr">{{ !empty($invoice['issued_at']) ? $formatDateFn($invoice['issued_at']) : '—' }}</span></div>
                        <div class="chip status-chip">حالت: <span class="ltr">{{ $statusLabel }}</span></div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="content">
            <div class="intro">
                دا انوایس د یو ځل (One-time) فیسونو لپاره صادرېږي. ټولې تادیې د تادیاتو په ریکارډ کې ثبتېږي.
            </div>

            <div class="section">
                <div class="section-title">۱. د انوایس معلومات</div>
                <div class="section-body">
                    <table class="kv">
                        <tr>
                            <td class="label">سازمان</td>
                            <td>{{ $text($organization?->name ?? null) }}</td>
                        </tr>
                        <tr>
                            <td class="label">د صادرېدو نېټه</td>
                            <td><span class="ltr">{{ !empty($invoice['issued_at']) ? $formatDateFn($invoice['issued_at']) : '—' }}</span></td>
                        </tr>
                        <tr>
                            <td class="label">د ورکړې نېټه</td>
                            <td><span class="ltr">{{ !empty($invoice['due_date']) ? $formatDateFn($invoice['due_date']) : '—' }}</span></td>
                        </tr>
                        <tr>
                            <td class="label">یادښت</td>
                            <td>{{ $text($invoice['notes'] ?? null) }}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۲. توکي (Items)</div>
                <div class="section-body">
                    <table class="summary">
                        <thead>
                            <tr>
                                <th style="width: 48%">عنوان</th>
                                <th style="width: 14%">Qty</th>
                                <th style="width: 19%">Unit</th>
                                <th style="width: 19%">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($items as $item)
                                <tr>
                                    <td>{{ $text($item['title'] ?? null) }}</td>
                                    <td class="ltr">{{ (int) ($item['quantity'] ?? 1) }}</td>
                                    <td class="ltr">{{ $money($item['unit_price'] ?? 0) }}</td>
                                    <td class="ltr">{{ $money($item['line_total'] ?? 0) }}</td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="4" style="text-align:center; color:#5c6f8d;">هیڅ توکي نشته</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۳. ټولیز (Totals)</div>
                <div class="section-body">
                    <table class="summary totals">
                        <tbody>
                            <tr>
                                <td class="label">Subtotal</td>
                                <td class="ltr">{{ $money($invoice['subtotal'] ?? 0) }} {{ $currency }}</td>
                            </tr>
                            <tr>
                                <td class="label">Tax</td>
                                <td class="ltr">{{ $money($invoice['tax_amount'] ?? 0) }} {{ $currency }}</td>
                            </tr>
                            <tr>
                                <td class="label">Discount</td>
                                <td class="ltr">-{{ $money($invoice['discount_amount'] ?? 0) }} {{ $currency }}</td>
                            </tr>
                            <tr class="highlight">
                                <td class="label">Total</td>
                                <td class="ltr">{{ $money($invoice['total_amount'] ?? 0) }} {{ $currency }}</td>
                            </tr>
                            <tr>
                                <td class="label">Paid</td>
                                <td class="ltr">{{ $money($paid) }} {{ $currency }}</td>
                            </tr>
                            <tr class="highlight">
                                <td class="label">Remaining</td>
                                <td class="ltr">{{ $money($due) }} {{ $currency }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۴. د تادیاتو ریکارډ</div>
                <div class="section-body">
                    @if(count($payments) > 0)
                        <table class="summary">
                            <thead>
                                <tr>
                                    <th style="width: 22%">مبلغ</th>
                                    <th style="width: 22%">نېټه</th>
                                    <th style="width: 22%">طریقه</th>
                                    <th>یادښت</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($payments as $p)
                                    <tr>
                                        <td class="ltr">{{ $money($p['amount'] ?? 0) }} {{ $p['currency'] ?? $currency }}</td>
                                        <td class="ltr">{{ !empty($p['payment_date']) ? $formatDateFn($p['payment_date']) : '—' }}</td>
                                        <td class="ltr">{{ $text($p['payment_method'] ?? null) }}</td>
                                        <td>{{ $text($p['notes'] ?? null) }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @else
                        <div class="card">
                            <div class="muted">تر اوسه کومه تادیه نه ده ثبت شوې.</div>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</body>
</html>

