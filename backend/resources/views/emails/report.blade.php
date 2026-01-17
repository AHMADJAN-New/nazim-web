<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $reportTitle }}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; color: #0f172a; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                    <tr>
                        <td>
                            <h1 style="font-size: 20px; margin-bottom: 8px;">{{ $reportTitle }}</h1>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                                Your requested report has been generated and is attached to this email.
                            </p>
                            
                            <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                                <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;"><strong>Report Type:</strong> {{ strtoupper($reportType) }}</p>
                                @if($generatedAt)
                                    <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;"><strong>Generated:</strong> {{ $generatedAt }}</p>
                                @endif
                                @if($reportRun->file_size)
                                    <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>File Size:</strong> {{ number_format($reportRun->file_size / 1024, 2) }} KB</p>
                                @endif
                            </div>

                            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 16px;">
                                The report file is attached to this email. You can also download it from your Nazim dashboard.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

