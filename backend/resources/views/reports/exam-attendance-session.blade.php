<!DOCTYPE html>
<html lang="en" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <style>
        @font-face {
            font-family: 'BahijNassim';
            src: local('Bahij Nassim'), local('BahijNassim');
        }
        body {
            font-family: 'BahijNassim', 'DejaVu Sans', Tahoma, sans-serif;
            font-size: 11px;
            color: #111;
            margin: 24px;
        }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 18px 0 6px; page-break-after: avoid; }
        .meta { color: #444; margin-bottom: 12px; line-height: 1.4; }
        .totals { margin: 8px 0 14px; }
        .totals span { display: inline-block; margin-inline-end: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: start; vertical-align: top; }
        th { background: #f3f4f6; font-weight: 700; }
        .num { width: 32px; text-align: center; }
        .status-present { color: #166534; }
        .status-absent { color: #991b1b; }
        .status-late { color: #854d0e; }
        .status-excused { color: #1e40af; }
        .status-unmarked { color: #6b7280; }
        .unit { page-break-inside: avoid; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>{{ $schoolName }}</div>
        <div>{{ $examName }}</div>
        <div>{{ $sessionLabel }}</div>
    </div>
    <div class="totals">
        <span>Present: {{ $totals['present'] }}</span>
        <span>Absent: {{ $totals['absent'] }}</span>
        <span>Late: {{ $totals['late'] }}</span>
        <span>Excused: {{ $totals['excused'] }}</span>
        <span>Unmarked: {{ $totals['unmarked'] }}</span>
        <span>Total: {{ $totals['total'] }}</span>
    </div>

    @foreach($units as $unit)
        <div class="unit">
            <h2>{{ $unit['class_label'] }} · {{ $unit['subject_name'] }}</h2>
            <div class="totals">
                <span>Present: {{ $unit['counts']['present'] }}</span>
                <span>Absent: {{ $unit['counts']['absent'] }}</span>
                <span>Unmarked: {{ $unit['counts']['unmarked'] }}</span>
                <span>Total: {{ $unit['counts']['total'] }}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="num">#</th>
                        <th>Student</th>
                        <th>Father</th>
                        <th>Roll</th>
                        <th>Admission</th>
                        <th>Status</th>
                        <th>Seat</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($unit['rows'] as $index => $row)
                        <tr>
                            <td class="num">{{ $index + 1 }}</td>
                            <td>{{ $row['student_name'] }}</td>
                            <td>{{ $row['father_name'] }}</td>
                            <td>{{ $row['roll_number'] }}</td>
                            <td>{{ $row['admission_no'] }}</td>
                            <td class="status-{{ $row['status_key'] }}">{{ $row['status'] }}</td>
                            <td>{{ $row['seat_number'] }}</td>
                            <td>{{ $row['notes'] }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8">No enrolled students</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    @endforeach
</body>
</html>
