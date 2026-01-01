<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ optional($notification)->title ?? 'Nazim Notification' }}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; color: #0f172a; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                    <tr>
                        <td>
                            <h1 style="font-size: 20px; margin-bottom: 8px;">{{ optional($notification)->title ?? 'Action Required' }}</h1>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                                {{ optional($notification)->body ?? 'You have a new notification in Nazim.' }}
                            </p>
                            @if(optional($notification)->url)
                                <p style="margin-top: 16px;">
                                    <a href="{{ $notification->url }}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">
                                        View in Nazim
                                    </a>
                                </p>
                            @endif

                            @if(!empty($payload))
                                <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                                    <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">Event Details</p>
                                    <pre style="font-size: 12px; color: #0f172a; margin: 0;">{{ json_encode($payload, JSON_PRETTY_PRINT) }}</pre>
                                </div>
                            @endif
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
