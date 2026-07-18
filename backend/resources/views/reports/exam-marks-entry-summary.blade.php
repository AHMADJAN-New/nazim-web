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
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 6px; text-align: start; }
        th { background: #f3f4f6; font-weight: 700; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>{{ $schoolName }}</div>
        <div>{{ $examName }}</div>
        <div>ID mode: {{ $mode }}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Class</th>
                <th>Subject</th>
                <th>Students</th>
                <th>Total Marks</th>
                <th>Passing Marks</th>
            </tr>
        </thead>
        <tbody>
            @foreach($rows as $row)
                <tr>
                    <td>{{ $row['class'] }}</td>
                    <td>{{ $row['subject'] }}</td>
                    <td>{{ $row['students'] }}</td>
                    <td>{{ $row['total_marks'] }}</td>
                    <td>{{ $row['passing_marks'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
