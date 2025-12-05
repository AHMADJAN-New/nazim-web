<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: DejaVu Sans, sans-serif; margin: 16px; color: #0f172a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #475569; font-size: 12px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
        th { background: #0f172a; color: #fff; }
        tr:nth-child(even) { background: #f8fafc; }
    </style>
</head>
<body>
    <h1>Student Registration Report</h1>
    <div class="meta">
        Generated: {{ $generatedAt }} | Organization: {{ $organization }} | Total Rows: {{ count($rows) }}
    </div>
    <table>
        <thead>
            <tr>
                @foreach(array_keys($rows->first() ?? []) as $header)
                    <th>{{ $header }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($row as $value)
                        <td>{{ $value ?: '—' }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="24" style="text-align:center;">No student registrations found for the selected filters.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
