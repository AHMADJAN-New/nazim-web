@php
    $orderForm = $orderForm ?? [];
    $organization = $organization ?? null;
    $documents = $documents ?? [];
    $nazimLogoDataUri = $nazimLogoDataUri ?? null;
    $subscriptionContext = $subscription_context ?? [];
    $licensePaid = $subscriptionContext['license_paid'] ?? false;
    $licensePaidAt = $subscriptionContext['license_paid_at'] ?? null;
    $formatDateFn = $formatDate ?? fn ($d, $f = 'full') => $d ? \Carbon\Carbon::parse($d)->format('Y-m-d') : '—';

    $fontDir = public_path('fonts');
    $regularPath = $fontDir . DIRECTORY_SEPARATOR . 'Bahij Nassim-Regular.ttf';
    $boldPath = $fontDir . DIRECTORY_SEPARATOR . 'Bahij Nassim-Bold.ttf';
    $regularFont = file_exists($regularPath) ? 'data:font/truetype;charset=utf-8;base64,' . base64_encode(file_get_contents($regularPath)) : null;
    $boldFont = file_exists($boldPath) ? 'data:font/truetype;charset=utf-8;base64,' . base64_encode(file_get_contents($boldPath)) : $regularFont;

    $text = static fn ($value) => filled($value) ? $value : '—';
    $money = static fn ($value, $currency) => filled($value) ? number_format((float) $value, 2) . ' ' . ($currency ?: 'AFN') : '—';

    $licenseFee = (float) ($orderForm['license_fee'] ?? 0);
    $additionalServicesFee = (float) ($orderForm['additional_services_fee'] ?? 0);
    $taxAmount = (float) ($orderForm['tax_amount'] ?? 0);
    $discountAmount = (float) ($orderForm['discount_amount'] ?? 0);
    $discountPct = isset($orderForm['discount_percentage']) && $orderForm['discount_percentage'] !== null
        ? (float) $orderForm['discount_percentage'] : null;
    $subtotalForDiscount = $licenseFee + $additionalServicesFee + $taxAmount;
    $computedDiscount = $discountAmount > 0 ? $discountAmount
        : ($discountPct !== null ? round($subtotalForDiscount * ($discountPct / 100), 2) : 0);
    $computedTotalOneTime = max($subtotalForDiscount - $computedDiscount, 0);
    $currency = $orderForm['currency'] ?? 'AFN';

    $statusLabel = match ($orderForm['status'] ?? 'draft') {
        'signed' => 'لاسلیک شوی',
        'sent' => 'استول شوی',
        'pending_review' => 'د ارزونې په حال کې',
        default => 'مسوده',
    };

    $trainingMode = match ($orderForm['training_mode'] ?? null) {
        'in_person' => 'حضوري',
        'online' => 'انلاین',
        'hybrid' => 'ګډه',
        default => '—',
    };

    $documentLabels = [
        'signed_order_form' => 'لاسلیک شوې فورمه',
        'contract' => 'قرارداد',
        'signed_contract' => 'لاسلیک شوی قرارداد',
        'order_form_template' => 'د فورمې بېلګه',
        'payment_receipt' => 'رسید',
        'supporting_document' => 'ملاتړي اسناد',
        'identity_document' => 'هویتي سند',
        'other' => 'نور',
    ];
@endphp
<!DOCTYPE html>
<html lang="ps" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>د ناظم سافټویر د فرمایش فورمه</title>
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
        .hero-table, .grid, .stats, .signatures { width: 100%; border-collapse: separate; border-spacing: 10px; margin: -10px; }
        .hero-meta { text-align: left; width: 35%; vertical-align: top; }
        .hero-logo { width: 80px; height: auto; max-height: 56px; object-fit: contain; border-radius: 8px; background: rgba(255,255,255,.2); padding: 4px; }
        h1 { margin: 0 0 4px; font-size: 24px; line-height: 1.3; }
        .subtitle { font-size: 13px; opacity: .92; }
        .chip {
            display: inline-block;
            min-width: 122px;
            margin-bottom: 8px;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(255,255,255,.14);
            text-align: center;
            font-size: 11px;
            font-weight: 700;
        }
        .content { padding: 18px; }
        .intro, .note-box, .card, .stat, .signature {
            border: 1px solid #dce5f2;
            border-radius: 14px;
            background: #fbfdff;
        }
        .intro, .note-box, .card, .signature { padding: 12px 14px; }
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
        .card h3, .signature h3 { margin: 0 0 10px; color: #0b2c6b; font-size: 15px; }
        .kv { width: 100%; border-collapse: collapse; }
        .kv td { padding: 5px 0; border-bottom: 1px dashed #d7e0ed; vertical-align: top; }
        .kv tr:last-child td { border-bottom: none; }
        .label { width: 34%; color: #5c6f8d; font-weight: 700; }
        .ltr { direction: ltr; unicode-bidi: embed; display: inline-block; }
        .stats td { width: 20%; vertical-align: top; }
        .stat {
            padding: 12px;
            text-align: center;
        }
        .stat small, .muted { color: #5c6f8d; font-weight: 700; }
        .stat strong {
            display: block;
            margin-top: 6px;
            font-size: 16px;
            color: #0b2c6b;
        }
        .summary { width: 100%; border-collapse: collapse; margin-top: 12px; }
        .summary th, .summary td, .attachments th, .attachments td {
            border: 1px solid #dce5f2;
            padding: 9px 10px;
            vertical-align: top;
        }
        .summary th, .attachments th {
            background: #edf4ff;
            color: #0b2c6b;
            font-weight: 700;
        }
        .highlight td {
            background: #fff8e8;
            color: #6d5419;
            font-weight: 700;
        }
        .maintenance-row td {
            background: #e8f4ff;
            color: #0b2c6b;
            font-weight: 600;
        }
        .pills { margin-top: 8px; }
        .pill {
            display: inline-block;
            margin-left: 6px;
            padding: 6px 12px;
            border-radius: 999px;
            border: 1px solid #d1dcec;
            background: #f5f8fd;
            color: #39506f;
            font-weight: 700;
        }
        .pill.active { background: #0b2c6b; border-color: #0b2c6b; color: #fff; }
        .status-pill {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 999px;
            background: #0b2c6b;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
        }
        .signatures td { width: 50%; vertical-align: top; }
        .signature { min-height: 188px; background: #fff; }
        .line { min-height: 22px; margin: 6px 0 10px; border-bottom: 1px dashed #c5d2e4; }
        .stamp {
            width: 98px;
            height: 98px;
            margin-top: 12px;
            border: 1.5px dashed #c5d2e4;
            border-radius: 50%;
            color: #7a8ba6;
            font-size: 11px;
            text-align: center;
            line-height: 1.6;
            padding-top: 28px;
        }
        .footer-note {
            margin-top: 16px;
            padding: 10px 12px;
            border: 1px solid #f0dfb2;
            border-radius: 14px;
            background: #fff8e8;
            color: #6d5623;
            font-size: 12px;
        }
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
                        <h1>د ناظم سافټویر (SaaS) د فرمایش فورمه</h1>
                        <div class="subtitle">Nazim Software SaaS Order Form</div>
                    </td>
                    <td class="hero-meta">
                        <div class="chip">د فورمې شمېره: <span class="ltr">{{ $text($orderForm['form_number'] ?? null) }}</span></div>
                        <div class="chip">نېټه: <span class="ltr">{{ $orderForm['issue_date'] ?? null ? $formatDateFn($orderForm['issue_date']) : '—' }}</span></div>
                        <div class="chip">{{ $statusLabel }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="content">
            <div class="intro">
                دا فورمه د ناظم سافټویر د جواز، ګډون، تخفیف، حدودو، تطبیق او قراردادي ضمیمو اصلي لنډیز ثبتوي.
                د دې سند معلومات د اړوندو اپلوډ شویو فایلونو او اصلي تړون له محتوا سره یوځای د اجرا وړ مرجع ګڼل کېږي.
            </div>

            <div class="section">
                <div class="section-title">۱. د خواوو معلومات</div>
                <div class="section-body">
                    <table class="grid">
                        <tr>
                            <td>
                                <div class="card">
                                    <h3>د پیرودونکي معلومات</h3>
                                    <table class="kv">
                                        <tr><td class="label">نوم</td><td>{{ $text($orderForm['customer_organization_name'] ?? null) }}</td></tr>
                                        <tr><td class="label">پته</td><td>{{ $text($orderForm['customer_address'] ?? null) }}</td></tr>
                                        <tr><td class="label">استازی</td><td>{{ $text($orderForm['customer_contact_name'] ?? null) }}</td></tr>
                                        <tr><td class="label">دنده</td><td>{{ $text($orderForm['customer_contact_title'] ?? null) }}</td></tr>
                                        <tr><td class="label">بریښنالیک</td><td><span class="ltr">{{ $text($orderForm['customer_email'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">تلیفون</td><td><span class="ltr">{{ $text($orderForm['customer_phone'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">واټساپ</td><td><span class="ltr">{{ $text($orderForm['customer_whatsapp'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">یادښت</td><td>{{ $text($orderForm['customer_notes'] ?? null) }}</td></tr>
                                    </table>
                                </div>
                            </td>
                            <td>
                                <div class="card">
                                    <h3>د خدمت وړاندې کوونکي معلومات</h3>
                                    <table class="kv">
                                        <tr><td class="label">نوم</td><td>{{ $text($orderForm['provider_organization_name'] ?? null) }}</td></tr>
                                        <tr><td class="label">پته</td><td>{{ $text($orderForm['provider_address'] ?? null) }}</td></tr>
                                        <tr><td class="label">استازی</td><td>{{ $text($orderForm['provider_contact_name'] ?? null) }}</td></tr>
                                        <tr><td class="label">دنده</td><td>{{ $text($orderForm['provider_contact_title'] ?? null) }}</td></tr>
                                        <tr><td class="label">بریښنالیک</td><td><span class="ltr">{{ $text($orderForm['provider_email'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">تلیفون</td><td><span class="ltr">{{ $text($orderForm['provider_phone'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">وېب پاڼه</td><td><span class="ltr">{{ $text($orderForm['provider_website'] ?? null) }}</span></td></tr>
                                        <tr><td class="label">یادښت</td><td>{{ $text($orderForm['provider_notes'] ?? null) }}</td></tr>
                                    </table>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۲. پلان، فیسونه او تخفیف</div>
                <div class="section-body">
                    <table class="stats">
                        <tr>
                            <td><div class="stat"><small>پلان</small><strong>{{ $text($orderForm['plan_name_override'] ?? null) }}</strong></div></td>
                            <td><div class="stat"><small>دوره</small><strong>{{ $text($orderForm['billing_cycle'] ?? null) }}</strong></div></td>
                            <td><div class="stat"><small>ټول مقدار (یو ځل)</small><strong>{{ number_format($computedTotalOneTime, 2) }} {{ $currency }}</strong></div></td>
                            <td><div class="stat"><small>د ساتنې فیس (کلني)</small><strong>{{ $money($orderForm['maintenance_fee'] ?? null, $orderForm['currency'] ?? 'AFN') }}</strong></div></td>
                            <td><div class="stat"><small>وضعیت</small><strong>{{ $statusLabel }}</strong></div></td>
                        </tr>
                    </table>

                    <table class="summary">
                        <thead>
                            <tr>
                                <th style="width: 40%">فیلډ</th>
                                <th style="width: 22%">مقدار</th>
                                <th>یادښت</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>د جواز فیس</td>
                                <td>{{ $money($orderForm['license_fee'] ?? null, $orderForm['currency'] ?? 'AFN') }}</td>
                                <td>{{ $text($orderForm['plan_description'] ?? null) }}</td>
                            </tr>
                            <tr>
                                <td>اضافي خدمات</td>
                                <td>{{ $money($orderForm['additional_services_fee'] ?? null, $orderForm['currency'] ?? 'AFN') }}</td>
                                <td>{{ $text($orderForm['additional_modules'] ?? null) }}</td>
                            </tr>
                            <tr>
                                <td>مالیات / نور لګښتونه</td>
                                <td>{{ $money($orderForm['tax_amount'] ?? null, $orderForm['currency'] ?? 'AFN') }}</td>
                                <td>{{ $text($orderForm['payment_notes'] ?? null) }}</td>
                            </tr>
                            <tr>
                                <td>تخفیف</td>
                                <td>{{ $money($orderForm['discount_amount'] ?? null, $orderForm['currency'] ?? 'AFN') }}</td>
                                <td>
                                    {{ $text($orderForm['discount_name'] ?? null) }}
                                    @if(!empty($orderForm['discount_percentage']))
                                        <span class="ltr">({{ $orderForm['discount_percentage'] }}%)</span>
                                    @endif
                                </td>
                            </tr>
                            <tr class="highlight">
                                <td>ټول مقدار (یو ځل)</td>
                                <td>{{ number_format($computedTotalOneTime, 2) }} {{ $currency }}</td>
                                <td>{{ $text($orderForm['payment_terms'] ?? null) }}</td>
                            </tr>
                            <tr class="maintenance-row">
                                <td>د ساتنې فیس (کلني تکراري)</td>
                                <td>{{ $money($orderForm['maintenance_fee'] ?? null, $orderForm['currency'] ?? 'AFN') }}</td>
                                <td>هر کال تادیه کېږي، په ټول مقدار کې شامیل نه دی</td>
                            </tr>
                            @if($licensePaid && $licensePaidAt)
                            <tr class="license-paid-row">
                                <td colspan="3" style="background: #e8f5e9; color: #2e7d32; font-weight: 600; padding: 8px 10px;">
                                    ✓ د جواز فیس ورکړل شوی — <span class="ltr">{{ $formatDateFn($licensePaidAt) }}</span>
                                </td>
                            </tr>
                            @endif
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۳. حدود، موده او تطبیق</div>
                <div class="section-body">
                    <table class="stats">
                        <tr>
                            <td><div class="stat"><small>زده کوونکي</small><strong>{{ $text($orderForm['max_students'] ?? null) }}</strong></div></td>
                            <td><div class="stat"><small>کارکوونکي</small><strong>{{ $text($orderForm['max_staff'] ?? null) }}</strong></div></td>
                            <td><div class="stat"><small>سیسټم کاروونکي</small><strong>{{ $text($orderForm['max_system_users'] ?? null) }}</strong></div></td>
                            <td><div class="stat"><small>ذخیره</small><strong>{{ filled($orderForm['max_storage_gb'] ?? null) ? $orderForm['max_storage_gb'] . ' GB' : '—' }}</strong></div></td>
                        </tr>
                    </table>

                    <table class="grid">
                        <tr>
                            <td>
                                <div class="card">
                                    <h3>د ګډون مهالویش</h3>
                                    <table class="kv">
                                        <tr><td class="label">پیل</td><td>{{ $orderForm['subscription_start_date'] ?? null ? $formatDateFn($orderForm['subscription_start_date']) : '—' }}</td></tr>
                                        <tr><td class="label">پای</td><td>{{ $orderForm['subscription_end_date'] ?? null ? $formatDateFn($orderForm['subscription_end_date']) : '—' }}</td></tr>
                                        <tr><td class="label">تطبیق</td><td>{{ $orderForm['implementation_date'] ?? null ? $formatDateFn($orderForm['implementation_date']) : '—' }}</td></tr>
                                        <tr><td class="label">روزنه</td><td>{{ $trainingMode }}</td></tr>
                                    </table>
                                </div>
                            </td>
                            <td>
                                <div class="card">
                                    <h3>د روزنې طریقه</h3>
                                    <div class="pills">
                                        <span class="pill {{ ($orderForm['training_mode'] ?? null) === 'in_person' ? 'active' : '' }}">حضوري</span>
                                        <span class="pill {{ ($orderForm['training_mode'] ?? null) === 'online' ? 'active' : '' }}">انلاین</span>
                                        <span class="pill {{ ($orderForm['training_mode'] ?? null) === 'hybrid' ? 'active' : '' }}">ګډه</span>
                                    </div>
                                    <div style="margin-top: 12px;">{{ $text($orderForm['limits_notes'] ?? null) }}</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۴. ځانګړې غوښتنې او شرایط</div>
                <div class="section-body">
                    <table class="grid">
                        <tr>
                            <td><div class="card"><h3>ځانګړې غوښتنې</h3>{{ $text($orderForm['special_requirements'] ?? null) }}</div></td>
                            <td><div class="card"><h3>اضافي ماډلونه</h3>{{ $text($orderForm['additional_modules'] ?? null) }}</div></td>
                        </tr>
                        <tr>
                            <td colspan="2"><div class="card"><h3>نور مهم شرایط یا موافقې</h3>{{ $text($orderForm['important_terms'] ?? null) }}</div></td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۵. منل او لاسلیکونه</div>
                <div class="section-body">
                    <div class="note-box">
                        <span class="status-pill">{{ !empty($orderForm['acceptance_confirmed']) ? 'شرایط منل شوي' : 'شرایط لا نه دي تایید شوي' }}</span>
                        <div style="margin-top: 10px;">{{ $text($orderForm['acceptance_notes'] ?? null) }}</div>
                    </div>

                    <table class="signatures">
                        <tr>
                            <td>
                                <div class="signature">
                                    <h3>د پیرودونکي لخوا</h3>
                                    <div>نوم</div><div class="line">{{ $text($orderForm['customer_signatory_name'] ?? null) }}</div>
                                    <div>دنده</div><div class="line">{{ $text($orderForm['customer_signatory_title'] ?? null) }}</div>
                                    <div>نېټه</div><div class="line">{{ $orderForm['customer_signed_at'] ?? null ? $formatDateFn($orderForm['customer_signed_at']) : '—' }}</div>
                                </div>
                            </td>
                            <td>
                                <div class="signature">
                                    <h3>د خدمت وړاندې کوونکي لخوا</h3>
                                    <div>نوم</div><div class="line">{{ $text($orderForm['provider_signatory_name'] ?? null) }}</div>
                                    <div>دنده</div><div class="line">{{ $text($orderForm['provider_signatory_title'] ?? null) }}</div>
                                    <div>نېټه</div><div class="line">{{ $orderForm['provider_signed_at'] ?? null ? $formatDateFn($orderForm['provider_signed_at']) : '—' }}</div>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="section">
                <div class="section-title">۶. ضمیمې</div>
                <div class="section-body">
                    @if(count($documents) > 0)
                        <table class="attachments" style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="width: 24%">ډول</th>
                                    <th style="width: 28%">سرلیک</th>
                                    <th>یادښت</th>
                                    <th style="width: 18%">پورته شوی</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($documents as $document)
                                    <tr>
                                        <td>{{ $documentLabels[$document['document_category'] ?? 'other'] ?? ($document['document_category'] ?? 'نور') }}</td>
                                        <td>{{ $text($document['title'] ?? null) }}</td>
                                        <td>{{ $text($document['notes'] ?? null) }}</td>
                                        <td class="ltr">{{ ($document['created_at'] ?? null) ? $formatDateFn($document['created_at']) : '—' }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    @else
                        <div class="card">تر اوسه هېڅ سند نه دی پورته شوی.</div>
                    @endif
                </div>
            </div>

            <div class="footer-note">
                دا نسخه
                @if($organization)
                    <span class="ltr">{{ $organization->name }}</span>
                @endif
                لپاره په <span class="ltr">{{ $formatDateFn(now(), 'full') }} {{ now()->format('H:i') }}</span> تولید شوې ده.
            </div>
        </div>
    </div>
</body>
</html>
