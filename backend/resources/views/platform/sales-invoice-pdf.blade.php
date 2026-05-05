@php
    $organization = $organization ?? null;
    $invoice = $invoice ?? [];
    $items = $items ?? [];
    $payments = $payments ?? [];
    $paymentSummary = $payment_summary ?? null;
    $nazimLogoDataUri = $nazimLogoDataUri ?? null;
    $formatDateFn = $formatDate ?? fn ($d, $f = 'full') => $d ? \Carbon\Carbon::parse($d)->format('Y-m-d') : '—';

    $locale = $language ?? 'ps';
    $isRtl = in_array($locale, ['ps', 'fa', 'ar'], true);

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

    $status = $invoice['status'] ?? 'draft';

    $paymentsCount = is_countable($payments) ? count($payments) : 0;
    $lastPayment = null;
    if ($paymentsCount > 0) {
        $sortedPayments = collect($payments)
            ->filter(fn ($p) => is_array($p))
            ->sortByDesc(fn ($p) => $p['payment_date'] ?? null)
            ->values();
        $lastPayment = $sortedPayments->first();
    }
@endphp
<!DOCTYPE html>
<html lang="{{ $locale }}" dir="{{ $isRtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ __('sales_invoice.title') }}</title>
    <style>
        @page { size: A4; margin: 10mm 10mm; }

        @font-face {
            font-family: "BahijNassim";
            src: url("{{ $regularFont }}") format("truetype");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "BahijNassim";
            src: url("{{ $boldFont }}") format("truetype");
            font-weight: 700;
            font-style: normal;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background: #ffffff;
            color: #1a2332;
            font-family: "BahijNassim", "DejaVu Sans", sans-serif;
            font-size: 11px;
            line-height: 1.55;
            -webkit-font-smoothing: antialiased;
        }

        /* ========== HEADER ========== */
        .header {
            position: relative;
            padding: 16px 18px 14px;
            color: #ffffff;
            background: linear-gradient(135deg, #0a2855 0%, #143d80 50%, #1c4ea7 100%);
            border-radius: 12px 12px 0 0;
            overflow: hidden;
        }

        .header-accent {
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #d4a94a 0%, #f0c869 50%, #d4a94a 100%);
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
        }

        .brand-cell {
            vertical-align: middle;
            width: 62%;
        }

        .brand-row {
            width: 100%;
            border-collapse: collapse;
        }

        .logo-wrap {
            width: 56px;
            vertical-align: middle;
            padding-left: 10px;
        }

        .hero-logo {
            width: 48px;
            height: 48px;
            object-fit: contain;
            background: rgba(255, 255, 255, 0.95);
            padding: 5px;
            border-radius: 9px;
        }

        .brand-text { vertical-align: middle; }

        .brand-title {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.25;
            margin-bottom: 3px;
            letter-spacing: 0.2px;
        }

        .brand-subtitle {
            font-size: 10px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.78);
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .invoice-meta-cell {
            vertical-align: middle;
            text-align: left;
            width: 38%;
        }

        .invoice-label-tag {
            display: inline-block;
            padding: 3px 9px;
            background: rgba(212, 169, 74, 0.22);
            border: 1px solid rgba(212, 169, 74, 0.5);
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #f0c869;
            margin-bottom: 5px;
        }

        .invoice-number {
            font-size: 15px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 6px;
            direction: ltr;
            display: block;
        }

        .invoice-dates {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.6;
        }

        .invoice-dates .date-label {
            color: rgba(255, 255, 255, 0.65);
            font-weight: 700;
        }

        /* ========== STATUS BANNER ========== */
        .status-banner {
            padding: 7px 18px;
            background: #f6f9fd;
            border-bottom: 1px solid #e3ebf5;
            text-align: left;
        }

        .status-pill {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .status-paid { background: #e8f5ec; color: #1d7a3a; border: 1px solid #b8dec5; }
        .status-sent { background: #e7f0fc; color: #1c4ea7; border: 1px solid #b8cdec; }
        .status-cancelled { background: #fce8e8; color: #a4232b; border: 1px solid #ecbcbe; }
        .status-draft { background: #f0f1f3; color: #5c6f8d; border: 1px solid #d7dde6; }

        /* ========== BODY WRAPPER ========== */
        .body-wrap {
            padding: 12px 0 0;
        }

        /* ========== INTRO ========== */
        .intro-note {
            margin: 0 0 10px;
            padding: 8px 10px;
            background: #fbfaf3;
            border-right: 3px solid #d4a94a;
            border-radius: 0 8px 8px 0;
            font-size: 10.5px;
            color: #5c5132;
            line-height: 1.7;
        }

        /* ========== CARDS ========== */
        .card {
            border: 1px solid #e3ebf5;
            border-radius: 10px;
            background: #ffffff;
            overflow: hidden;
        }

        /* ========== KEY-VALUE TABLE ========== */
        .kv {
            width: 100%;
            border-collapse: collapse;
        }

        .kv td {
            padding: 7px 10px;
            font-size: 10.5px;
            border-bottom: 1px solid #eef2f8;
            vertical-align: middle;
        }

        .kv tr:last-child td { border-bottom: none; }

        .kv tr:nth-child(even) td {
            background: #fafcfe;
        }

        .kv .label {
            width: 32%;
            color: #5c6f8d;
            font-weight: 700;
            font-size: 10px;
        }

        .kv .value {
            color: #1a2332;
            font-weight: 400;
        }

        /* ========== ITEMS / SUMMARY TABLE ========== */
        .summary {
            width: 100%;
            border-collapse: collapse;
        }

        .summary thead th {
            padding: 8px 10px;
            background: #0a2855;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            text-align: right;
            border: none;
        }

        .summary thead th.num { text-align: left; }

        .summary tbody td {
            padding: 8px 10px;
            font-size: 10.5px;
            border-bottom: 1px solid #eef2f8;
            color: #1a2332;
            vertical-align: middle;
        }

        .summary tbody tr:last-child td { border-bottom: none; }

        .summary tbody tr:nth-child(even) td {
            background: #fafcfe;
        }

        .summary td.num {
            text-align: left;
            direction: ltr;
            unicode-bidi: embed;
            font-feature-settings: "tnum";
        }

        .item-title {
            max-width: 320px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .empty-row td {
            text-align: center;
            color: #97a3b8;
            padding: 14px 10px !important;
            font-style: italic;
        }

        /* ========== TOTALS ========== */
        .totals-grid {
            width: 100%;
            border-collapse: collapse;
        }

        .totals-grid td {
            padding: 7px 10px;
            font-size: 10.5px;
            border-bottom: 1px solid #eef2f8;
        }

        .totals-grid tr:last-child td { border-bottom: none; }

        .totals-grid .label {
            width: 60%;
            color: #5c6f8d;
            font-weight: 700;
        }

        .totals-grid .amount {
            text-align: left;
            direction: ltr;
            unicode-bidi: embed;
            font-feature-settings: "tnum";
            color: #1a2332;
            font-weight: 700;
        }

        .totals-grid .row-total td {
            background: #f6f9fd;
            color: #0a2855;
            font-size: 11.5px;
            font-weight: 700;
            padding: 9px 10px;
            border-top: 2px solid #0a2855;
            border-bottom: 1px solid #d7e0ed;
        }

        .totals-grid .row-paid td {
            color: #1d7a3a;
        }
        .totals-grid .row-paid .amount { color: #1d7a3a; }

        .totals-grid .row-due td {
            background: #fdf6e9;
            color: #8a6818;
            font-size: 11.5px;
            font-weight: 700;
            padding: 9px 10px;
            border-top: 1px solid #e8d59a;
        }
        .totals-grid .row-due .amount { color: #8a6818; }

        .currency-tag {
            font-size: 10px;
            color: #97a3b8;
            font-weight: 400;
            margin-right: 4px;
        }

        /* ========== TOP GRID ========== */
        .top-grid {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 10px;
        }

        .top-grid td {
            vertical-align: top;
            width: 50%;
        }

        .top-grid td:first-child {
            padding-left: 8px;
        }

        .card-title {
            padding: 8px 10px;
            background: #f6f9fd;
            color: #0a2855;
            font-size: 11px;
            font-weight: 700;
            border-bottom: 1px solid #e3ebf5;
        }

        .card-title small {
            color: #5c6f8d;
            font-weight: 400;
            font-size: 10px;
        }

        /* ========== PAYMENTS SUMMARY ========== */
        .payment-summary {
            margin-top: 10px;
            padding: 10px;
            border: 1px solid #e3ebf5;
            border-radius: 10px;
            background: #ffffff;
        }

        .payment-summary .row {
            display: block;
            margin-bottom: 4px;
            color: #5c6f8d;
            font-size: 10px;
        }

        .payment-summary .row strong {
            color: #1a2332;
            font-weight: 700;
        }

        /* ========== UTILITIES ========== */
        .ltr {
            direction: ltr;
            unicode-bidi: embed;
            display: inline-block;
            font-feature-settings: "tnum";
        }

        /* ========== FOOTER ========== */
        .footer {
            margin-top: 10px;
            padding: 10px 0 0;
            border-top: 1px solid #e3ebf5;
            text-align: center;
            font-size: 10px;
            color: #97a3b8;
            line-height: 1.6;
        }

        .footer-brand {
            color: #0a2855;
            font-weight: 700;
            font-size: 10.5px;
            margin-bottom: 2px;
        }
    </style>
</head>
<body>

    {{-- HEADER --}}
    <div class="header">
        <div class="header-accent"></div>
        <table class="header-table">
            <tr>
                <td class="brand-cell">
                    <table class="brand-row">
                        <tr>
                            @if($nazimLogoDataUri)
                                <td class="logo-wrap">
                                    <img src="{{ $nazimLogoDataUri }}" alt="Nazim" class="hero-logo" />
                                </td>
                            @endif
                            <td class="brand-text">
                                <div class="brand-title">{{ __('sales_invoice.title') }}</div>
                                <div class="brand-subtitle">{{ __('sales_invoice.subtitle') }}</div>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="invoice-meta-cell">
                    <div class="invoice-label-tag">{{ __('sales_invoice.invoice_tag') }}</div>
                    <div class="invoice-number">{{ $text($invoice['invoice_number'] ?? null) }}</div>
                    <div class="invoice-dates">
                        <span class="date-label">{{ __('sales_invoice.issued_at') }}:</span>
                        <span class="ltr">{{ !empty($invoice['issued_at']) ? $formatDateFn($invoice['issued_at']) : '—' }}</span>
                        <br>
                        <span class="date-label">{{ __('sales_invoice.due_date') }}:</span>
                        <span class="ltr">{{ !empty($invoice['due_date']) ? $formatDateFn($invoice['due_date']) : '—' }}</span>
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- STATUS BANNER --}}
    <div class="status-banner">
        <span class="status-pill status-{{ $status }}">{{ __('sales_invoice.status.' . $status) }}</span>
    </div>

    <div class="body-wrap">

        {{-- INTRO NOTE --}}
        <div class="intro-note">
            {{ __('sales_invoice.intro_note') }}
        </div>

        {{-- TOP GRID: DETAILS + TOTALS (one-page compact) --}}
        <table class="top-grid">
            <tr>
                <td>
                    <div class="card">
                        <div class="card-title">{{ __('sales_invoice.section.details') }}</div>
                        <table class="kv">
                            <tr>
                                <td class="label">{{ __('sales_invoice.organization') }}</td>
                                <td class="value">{{ $text($organization?->name ?? null) }}</td>
                            </tr>
                            <tr>
                                <td class="label">{{ __('sales_invoice.issued_at') }}</td>
                                <td class="value"><span class="ltr">{{ !empty($invoice['issued_at']) ? $formatDateFn($invoice['issued_at']) : '—' }}</span></td>
                            </tr>
                            <tr>
                                <td class="label">{{ __('sales_invoice.due_date') }}</td>
                                <td class="value"><span class="ltr">{{ !empty($invoice['due_date']) ? $formatDateFn($invoice['due_date']) : '—' }}</span></td>
                            </tr>
                            <tr>
                                <td class="label">{{ __('sales_invoice.notes') }}</td>
                                <td class="value">{{ $text($invoice['notes'] ?? null) }}</td>
                            </tr>
                        </table>
                    </div>
                </td>
                <td>
                    <div class="card">
                        <div class="card-title">
                            {{ __('sales_invoice.section.totals') }}
                            <small>({{ $currency }})</small>
                        </div>
                        <table class="totals-grid">
                            <tr>
                                <td class="label">{{ __('sales_invoice.totals.subtotal') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>{{ $money($invoice['subtotal'] ?? 0) }}</td>
                            </tr>
                            <tr>
                                <td class="label">{{ __('sales_invoice.totals.tax') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>{{ $money($invoice['tax_amount'] ?? 0) }}</td>
                            </tr>
                            <tr>
                                <td class="label">{{ __('sales_invoice.totals.discount') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>−{{ $money($invoice['discount_amount'] ?? 0) }}</td>
                            </tr>
                            <tr class="row-total">
                                <td class="label">{{ __('sales_invoice.totals.total') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>{{ $money($invoice['total_amount'] ?? 0) }}</td>
                            </tr>
                            <tr class="row-paid">
                                <td class="label">{{ __('sales_invoice.totals.paid') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>{{ $money($paid) }}</td>
                            </tr>
                            <tr class="row-due">
                                <td class="label">{{ __('sales_invoice.totals.remaining') }}</td>
                                <td class="amount"><span class="currency-tag">{{ $currency }}</span>{{ $money($due) }}</td>
                            </tr>
                        </table>
                    </div>
                </td>
            </tr>
        </table>

        {{-- ITEMS (compact) --}}
        <div class="card">
            <div class="card-title">{{ __('sales_invoice.section.items') }}</div>
            <table class="summary">
                <thead>
                    <tr>
                        <th style="width: 52%">{{ __('sales_invoice.items.title') }}</th>
                        <th class="num" style="width: 12%">{{ __('sales_invoice.items.qty') }}</th>
                        <th class="num" style="width: 18%">{{ __('sales_invoice.items.unit_price') }}</th>
                        <th class="num" style="width: 18%">{{ __('sales_invoice.items.line_total') }}</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($items as $item)
                        <tr>
                            <td class="item-title">{{ $text($item['title'] ?? null) }}</td>
                            <td class="num">{{ (int) ($item['quantity'] ?? 1) }}</td>
                            <td class="num"><span class="currency-tag">{{ $currency }}</span>{{ $money($item['unit_price'] ?? 0) }}</td>
                            <td class="num"><span class="currency-tag">{{ $currency }}</span>{{ $money($item['line_total'] ?? 0) }}</td>
                        </tr>
                    @empty
                        <tr class="empty-row">
                            <td colspan="4">{{ __('sales_invoice.items.empty') }}</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        {{-- PAYMENTS (summary only to guarantee one page) --}}
        <div class="payment-summary">
            <div class="row">
                {{ __('sales_invoice.payments.summary') }}:
                <strong>{{ $paymentsCount }}</strong>
            </div>
            <div class="row">
                {{ __('sales_invoice.payments.paid_total') }}:
                <strong><span class="currency-tag">{{ $currency }}</span>{{ $money($paid) }}</strong>
            </div>
            <div class="row">
                {{ __('sales_invoice.payments.last_payment') }}:
                <strong>
                    @if(is_array($lastPayment) && !empty($lastPayment['payment_date']))
                        <span class="ltr">{{ $formatDateFn($lastPayment['payment_date']) }}</span>
                    @else
                        —
                    @endif
                </strong>
            </div>
        </div>

        {{-- FOOTER --}}
        <div class="footer">
            <div class="footer-brand">Nazim · ناظم</div>
            <div>{{ __('sales_invoice.footer_tagline') }}</div>
        </div>

    </div>
</body>
</html>