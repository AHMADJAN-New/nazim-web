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
        .meta { color: #444; margin-bottom: 12px; line-height: 1.4; }
        .totals { margin: 8px 0 14px; }
        .totals span { display: inline-block; margin-inline-end: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: start; vertical-align: top; }
        th { background: #f3f4f6; font-weight: 700; }
        .num { width: 32px; text-align: center; }
        .status-present { color: #166534; }
        .status-absent { color: #991b1b; }
        .status-late { color: #854d0e; }
        .status-excused { color: #1e40af; }
        .status-unmarked { color: #6b7280; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>{{ $schoolName }}</div>
        <div>{{ $examName }}</div>
        <div>{{ $classLabel }} · {{ $subjectName }}</div>
        @if(!empty($sessionLabel))
            <div>{{ $sessionLabel }}</div>
        @endif
    </div>
    <div class="totals">
        <span>Present: {{ $counts['present'] }}</span>
        <span>Absent: {{ $counts['absent'] }}</span>
        <span>Late: {{ $counts['late'] }}</span>
        <span>Excused: {{ $counts['excused'] }}</span>
        <span>Unmarked: {{ $counts['unmarked'] }}</span>
        <span>Total: {{ $counts['total'] }}</span>
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
            @forelse($rows as $index => $row)
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
</body>
</html>
