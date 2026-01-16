@extends('reports.base')

@section('content')
{{-- Watermark --}}
@if(!empty($WATERMARK))
<div class="watermark">
    @if(!empty($WATERMARK['text']))
        <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
    @elseif(!empty($WATERMARK['image_url']))
        <img src="{{ $WATERMARK['image_url'] }}" class="watermark-image" alt="Watermark">
    @endif
</div>
@endif

{{-- Header Section --}}
<div class="report-header">
    <div class="header-left">
        @if(!empty($PRIMARY_LOGO))
            <img src="{{ $PRIMARY_LOGO }}" alt="Logo" class="header-logo">
        @endif
    </div>
    <div class="header-center">
        <div class="school-name">{{ $SCHOOL_NAME ?? 'School Name' }}</div>
        <div class="report-title">{{ $TABLE_TITLE ?? 'Student Profile' }}</div>
        @if(!empty($HEADER_TEXT))
            <div class="header-text">{!! $HEADER_TEXT !!}</div>
        @endif
    </div>
    <div class="header-right">
        @if(!empty($SECONDARY_LOGO))
            <img src="{{ $SECONDARY_LOGO }}" alt="Secondary Logo" class="header-logo">
        @endif
    </div>
</div>

{{-- Student Information Card --}}
<div class="student-info-card">
    <table class="info-table">
        <tr>
            <td class="photo-cell" rowspan="6">
                @if(!empty($student['picture_path']))
                    <img src="{{ $student['picture_path'] }}" alt="Student Photo" class="student-photo">
                @else
                    <div class="no-photo">
                        <span>{{ mb_substr($student['full_name'] ?? 'S', 0, 1) }}</span>
                    </div>
                @endif
            </td>
            <td class="info-label">{{ $labels['fullName'] ?? 'Full Name' }}:</td>
            <td class="info-value"><strong>{{ $student['full_name'] ?? '—' }}</strong></td>
            <td class="info-label">{{ $labels['admissionNo'] ?? 'Admission No' }}:</td>
            <td class="info-value">{{ $student['admission_no'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['fatherName'] ?? 'Father Name' }}:</td>
            <td class="info-value">{{ $student['father_name'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['grandfatherName'] ?? 'Grandfather Name' }}:</td>
            <td class="info-value">{{ $student['grandfather_name'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['dob'] ?? 'Date of Birth' }}:</td>
            <td class="info-value">{{ $student['birth_date'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['gender'] ?? 'Gender' }}:</td>
            <td class="info-value">{{ $student['gender'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['currentClass'] ?? 'Current Class' }}:</td>
            <td class="info-value">
                {{ $student['current_class'] ?? '—' }}
                @if(!empty($student['current_section']))
                    ({{ $student['current_section'] }})
                @endif
            </td>
            <td class="info-label">{{ $labels['status'] ?? 'Status' }}:</td>
            <td class="info-value">
                <span class="status-badge {{ strtolower($student['status'] ?? 'unknown') }}">
                    {{ $student['status'] ?? '—' }}
                </span>
            </td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['phone'] ?? 'Phone' }}:</td>
            <td class="info-value">{{ $student['guardian_phone'] ?? ($student['phone'] ?? '—') }}</td>
            <td class="info-label">{{ $labels['generatedAt'] ?? 'Generated At' }}:</td>
            <td class="info-value">{{ $generatedAt ?? now()->format('Y-m-d H:i') }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['address'] ?? 'Address' }}:</td>
            <td class="info-value" colspan="3">{{ $student['home_address'] ?? '—' }}</td>
        </tr>
    </table>

    {{-- Extended Details --}}
    <table class="info-table" style="margin-top: 10px;">
        <tr>
            <td class="info-label">{{ $labels['studentCode'] ?? 'Student Code' }}:</td>
            <td class="info-value">{{ $student['student_code'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['cardNumber'] ?? 'Card Number' }}:</td>
            <td class="info-value">{{ $student['card_number'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['nationality'] ?? 'Nationality' }}:</td>
            <td class="info-value">{{ $student['nationality'] ?? '—' }}</td>
            <td class="info-label">{{ $labels['preferredLanguage'] ?? 'Preferred Language' }}:</td>
            <td class="info-value">{{ $student['preferred_language'] ?? '—' }}</td>
        </tr>
        <tr>
            <td class="info-label">{{ $labels['guardianName'] ?? 'Guardian' }}:</td>
            <td class="info-value">
                {{ $student['guardian_name'] ?? '—' }}
                @if(!empty($student['guardian_relation']))
                    ({{ $student['guardian_relation'] }})
                @endif
            </td>
            <td class="info-label">{{ $labels['guardianPhone'] ?? 'Guardian Phone' }}:</td>
            <td class="info-value">{{ $student['guardian_phone'] ?? '—' }}</td>
        </tr>
        @if(!empty($student['guardian_picture_path']))
        <tr>
            <td class="info-label">{{ $labels['guardianPhoto'] ?? 'Guardian Photo' }}:</td>
            <td class="info-value" colspan="3">
                <img src="{{ $student['guardian_picture_path'] }}" alt="Guardian Photo" style="max-width: 100px; max-height: 100px;">
            </td>
        </tr>
        @endif
    </table>
</div>

{{-- Educational History Section --}}
@if(!empty($sections['educational_history']) && count($sections['educational_history']) > 0)
<div class="history-section">
    <h3 class="section-title">{{ $labels['educationalHistory'] ?? 'Educational History' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['schoolName'] ?? 'School Name' }}</th>
                <th>{{ $labels['startDate'] ?? 'Start Date' }}</th>
                <th>{{ $labels['endDate'] ?? 'End Date' }}</th>
                <th>{{ $labels['grade'] ?? 'Grade' }}</th>
                <th>{{ $labels['description'] ?? 'Description' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['educational_history'] as $index => $history)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $history['school_name'] ?? '—' }}</td>
                <td>{{ $history['start_date'] ?? '—' }}</td>
                <td>{{ $history['end_date'] ?? '—' }}</td>
                <td>{{ $history['grade'] ?? '—' }}</td>
                <td>{{ $history['description'] ?? '—' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="6" class="empty-row">{{ $labels['noEducationalHistory'] ?? 'No educational history records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Discipline Records Section --}}
@if(!empty($sections['discipline_records']) && count($sections['discipline_records']) > 0)
<div class="history-section">
    <h3 class="section-title">{{ $labels['disciplineRecords'] ?? 'Discipline Records' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['incidentDate'] ?? 'Date' }}</th>
                <th>{{ $labels['incidentType'] ?? 'Type' }}</th>
                <th>{{ $labels['severity'] ?? 'Severity' }}</th>
                <th>{{ $labels['actionTaken'] ?? 'Action' }}</th>
                <th>{{ $labels['status'] ?? 'Status' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['discipline_records'] as $index => $record)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $record['incident_date'] ?? '—' }}</td>
                <td>{{ $record['incident_type'] ?? '—' }}</td>
                <td class="severity-{{ strtolower($record['severity'] ?? 'minor') }}">{{ $record['severity'] ?? '—' }}</td>
                <td>{{ $record['action_taken'] ?? '—' }}</td>
                <td>
                    @if(!empty($record['resolved']) && $record['resolved'])
                        {{ $labels['resolved'] ?? 'Resolved' }}
                        @if(!empty($record['resolved_date']))
                            ({{ $record['resolved_date'] }})
                        @endif
                    @else
                        {{ $labels['pending'] ?? 'Pending' }}
                    @endif
                </td>
            </tr>
            @if(!empty($record['description']))
            <tr>
                <td></td>
                <td colspan="5" class="description-cell">{{ $record['description'] }}</td>
            </tr>
            @endif
            @empty
            <tr>
                <td colspan="6" class="empty-row">{{ $labels['noDisciplineRecords'] ?? 'No discipline records found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Documents Section --}}
@if(!empty($sections['documents']) && count($sections['documents']) > 0)
<div class="history-section">
    <h3 class="section-title">{{ $labels['documents'] ?? 'Documents' }}</h3>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>{{ $labels['documentType'] ?? 'Type' }}</th>
                <th>{{ $labels['fileName'] ?? 'File Name' }}</th>
                <th>{{ $labels['uploadDate'] ?? 'Upload Date' }}</th>
                <th>{{ $labels['fileSize'] ?? 'Size' }}</th>
            </tr>
        </thead>
        <tbody>
            @forelse($sections['documents'] as $index => $document)
            <tr>
                <td class="row-number">{{ (int)$index + 1 }}</td>
                <td>{{ $document['document_type'] ?? '—' }}</td>
                <td>{{ $document['file_name'] ?? '—' }}</td>
                <td>{{ $document['uploaded_at'] ?? '—' }}</td>
                <td>{{ $document['file_size'] ?? '—' }}</td>
            </tr>
            @if(!empty($document['description']))
            <tr>
                <td></td>
                <td colspan="4" class="description-cell">{{ $document['description'] }}</td>
            </tr>
            @endif
            @empty
            <tr>
                <td colspan="5" class="empty-row">{{ $labels['noDocuments'] ?? 'No documents found' }}</td>
            </tr>
            @endforelse
        </tbody>
    </table>
</div>
@endif

{{-- Footer Section --}}
<div class="report-footer">
    @if(!empty($FOOTER_TEXT))
    <div class="footer-text">{!! $FOOTER_TEXT !!}</div>
    @endif
    @if($show_page_numbers ?? true)
    <div class="page-number"></div>
    @endif
</div>
@endsection
