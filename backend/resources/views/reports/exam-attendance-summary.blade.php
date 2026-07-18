<!DOCTYPE html>
<html lang="en" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'BahijNassim', 'DejaVu Sans', Tahoma, sans-serif;
            font-size: 11px;
            color: #111;
            margin: 24px;
        }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #444; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: start; }
        th { background: #f3f4f6; font-weight: 700; }
        .num { text-align: center; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>{{ $schoolName }}</div>
        <div>{{ $examName }}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Class</th>
                <th>Subject</th>
                <th class="num">Enrolled</th>
                <th class="num">Present</th>
                <th class="num">Absent</th>
                <th class="num">Late</th>
                <th class="num">Excused</th>
                <th class="num">Unmarked</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
                <tr>
                    <td>{{ $row['class'] }}</td>
                    <td>{{ $row['subject'] }}</td>
                    <td class="num">{{ $row['enrolled'] }}</td>
                    <td class="num">{{ $row['present'] }}</td>
                    <td class="num">{{ $row['absent'] }}</td>
                    <td class="num">{{ $row['late'] }}</td>
                    <td class="num">{{ $row['excused'] }}</td>
                    <td class="num">{{ $row['unmarked'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
