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
        .hint { margin: 0 0 12px; color: #555; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #333; padding: 6px 6px; text-align: start; vertical-align: middle; height: 22px; }
        th { background: #f3f4f6; font-weight: 700; }
        .num { width: 32px; text-align: center; }
        .marks { width: 70px; }
        .absent { width: 60px; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">
        <div>{{ $schoolName }}</div>
        <div>{{ $examName }}</div>
        <div>{{ $classLabel }} · {{ $subjectName }}</div>
        <div>
            Total marks: {{ $totalMarks ?? '—' }}
            · Passing: {{ $passingMarks ?? '—' }}
        </div>
    </div>
    <p class="hint">Fill Marks and Absent by hand. Leave Marks blank if Absent.</p>
    <table>
        <thead>
            <tr>
                @foreach($columns as $column)
                    <th class="{{ $column['key'] === 'row_number' ? 'num' : ($column['key'] === 'marks' ? 'marks' : ($column['key'] === 'absent' ? 'absent' : '')) }}">
                        {{ $column['label'] }}
                    </th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($columns as $column)
                        <td class="{{ $column['key'] === 'row_number' ? 'num' : ($column['key'] === 'marks' ? 'marks' : ($column['key'] === 'absent' ? 'absent' : '')) }}">
                            {{ $row[$column['key']] ?? '' }}
                        </td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}">No enrolled students</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
