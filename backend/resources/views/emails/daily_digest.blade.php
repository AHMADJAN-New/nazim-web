<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nazim Daily Digest</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; color: #0f172a; padding: 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
                    <tr>
                        <td>
                            <h1 style="font-size: 20px; margin-bottom: 8px;">Daily Notification Digest</h1>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                                Hello {{ optional($user->profile)->full_name ?? $user->email }}, here are your pending notifications for today.
                            </p>

                            <div style="margin-top: 16px;">
                                @foreach($notifications as $notification)
                                    <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px;">
                                        <p style="margin: 0; font-weight: 600;">{{ $notification->title }}</p>
                                        <p style="margin: 4px 0; color: #475569; font-size: 14px;">
                                            {{ $notification->body ?? 'Open Nazim for more details.' }}
                                        </p>
                                        @if($notification->url)
                                            <a href="{{ $notification->url }}" style="font-size: 12px; color: #2563eb;">Open in Nazim</a>
                                        @endif
                                    </div>
                                @endforeach
                            </div>

                            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
                                You received this email because you opted into daily digests for overdue or critical events.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
