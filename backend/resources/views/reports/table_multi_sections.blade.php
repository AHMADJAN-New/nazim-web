@extends('reports.base')

@section('content')
@php
    // Expect multi-section data via parameters.sections
    // Each section: { title: string, columns: array, rows: array }
    $sections = is_array($parameters ?? null) ? ($parameters['sections'] ?? null) : null;

    // Fallback: if no sections provided, render as a normal single table
    if (!is_array($sections) || count($sections) === 0) {
        $sections = [[
            'title' => $TABLE_TITLE ?? 'Report',
            'columns' => $COLUMNS ?? [],
            'rows' => $ROWS ?? [],
        ]];
    }

    // Font size used for small adjustments
    $baseFontSize = isset($FONT_SIZE) && !empty($FONT_SIZE) ? intval(str_replace(['px', 'pt'], '', $FONT_SIZE)) : 12;
@endphp

<style>
  .page-break {
    page-break-after: always;
    break-after: page;
  }
  .section-title {
    text-align: center;
    font-size: {{ ($baseFontSize * 1.15) }}px;
    font-weight: 700;
    color: {{ $PRIMARY_COLOR ?? '#0b0b56' }};
    margin: 8px 0 10px 0;
  }
</style>

@foreach($sections as $sectionIndex => $section)
  @php
    $sectionTitle = is_array($section) ? ($section['title'] ?? ($TABLE_TITLE ?? 'Report')) : ($TABLE_TITLE ?? 'Report');
    $sectionColumns = is_array($section) ? ($section['columns'] ?? []) : [];
    $sectionRows = is_array($section) ? ($section['rows'] ?? []) : [];
  @endphp

  {{-- Watermark (per-page) --}}
  @if(!empty($WATERMARK))
    <div class="watermark">
      @if(($WATERMARK['wm_type'] ?? null) === 'image' && !empty($WATERMARK['image_data_uri']))
        <img src="{{ $WATERMARK['image_data_uri'] }}" alt="Watermark" class="watermark-image">
      @elseif(($WATERMARK['wm_type'] ?? null) === 'text' && !empty($WATERMARK['text']))
        <span class="watermark-text">{{ $WATERMARK['text'] }}</span>
      @endif
    </div>
  @endif

  {{-- Header (repeat per section so each class starts on a clean page with header) --}}
  <div class="report-header">
    {{-- Left side logos --}}
    <div class="header-left">
      @php
        $leftLogos = [];
        if (($show_primary_logo ?? true) && !empty($PRIMARY_LOGO_URI) && ($primary_logo_position ?? 'left') === 'left') {
          $leftLogos[] = ['uri' => $PRIMARY_LOGO_URI, 'alt' => 'Primary Logo'];
        }
        if (($show_secondary_logo ?? false) && !empty($SECONDARY_LOGO_URI) && ($secondary_logo_position ?? 'right') === 'left') {
          $leftLogos[] = ['uri' => $SECONDARY_LOGO_URI, 'alt' => 'Secondary Logo'];
        }
        if (($show_ministry_logo ?? false) && !empty($MINISTRY_LOGO_URI) && ($ministry_logo_position ?? 'right') === 'left') {
          $leftLogos[] = ['uri' => $MINISTRY_LOGO_URI, 'alt' => 'Ministry Logo'];
        }
      @endphp
      @foreach($leftLogos as $logo)
        <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="display:block;max-height:90px;max-width:100%;width:auto;height:auto;object-fit:contain;object-position:center;margin-bottom:5px;">
      @endforeach
    </div>

    {{-- Center content --}}
    <div class="header-center">
      @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'above_school_name')
        <div class="header-text" style="margin-bottom:5px;">{{ $header_text }}</div>
      @endif

      @if(!empty($SCHOOL_NAME_PASHTO))
        <div class="school-name">{{ $SCHOOL_NAME_PASHTO }}</div>
      @elseif(!empty($SCHOOL_NAME))
        <div class="school-name">{{ $SCHOOL_NAME }}</div>
      @endif

      @if(!empty($header_text) && ($header_text_position ?? 'below_school_name') === 'below_school_name')
        <div class="header-text" style="margin-top:5px;">{{ $header_text }}</div>
      @endif

      @if(!empty($TABLE_TITLE))
        <div class="report-title">{{ $TABLE_TITLE }}</div>
      @endif

      @if(!empty($header_html))
        <div class="custom-header">{!! $header_html !!}</div>
      @endif
    </div>

    {{-- Right side logos --}}
    <div class="header-right">
      @php
        $rightLogos = [];
        if (($show_primary_logo ?? true) && !empty($PRIMARY_LOGO_URI) && ($primary_logo_position ?? 'left') === 'right') {
          $rightLogos[] = ['uri' => $PRIMARY_LOGO_URI, 'alt' => 'Primary Logo'];
        }
        if (($show_secondary_logo ?? false) && !empty($SECONDARY_LOGO_URI) && ($secondary_logo_position ?? 'right') === 'right') {
          $rightLogos[] = ['uri' => $SECONDARY_LOGO_URI, 'alt' => 'Secondary Logo'];
        }
        if (($show_ministry_logo ?? false) && !empty($MINISTRY_LOGO_URI) && ($ministry_logo_position ?? 'right') === 'right') {
          $rightLogos[] = ['uri' => $MINISTRY_LOGO_URI, 'alt' => 'Ministry Logo'];
        }
      @endphp
      @foreach($rightLogos as $logo)
        <img src="{!! $logo['uri'] !!}" alt="{{ $logo['alt'] }}" class="header-logo" style="display:block;max-height:90px;max-width:100%;width:auto;height:auto;object-fit:contain;object-position:center;margin-bottom:5px;">
      @endforeach
    </div>
  </div>

  {{-- Header notes --}}
  @if(!empty($NOTES_HEADER))
    <div class="notes-section header-notes">
      @foreach($NOTES_HEADER as $note)
        <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
      @endforeach
    </div>
  @endif

  {{-- Per-section title (e.g., class name) --}}
  @if(!empty($sectionTitle))
    <div class="section-title">{{ $sectionTitle }}</div>
  @endif

  {{-- Data table --}}
  <table class="data-table">
    <thead>
      <tr>
        <th class="row-number">#</th>
        @foreach($sectionColumns as $colIndex => $column)
          @php
            $label = is_array($column) ? ($column['label'] ?? $column['key'] ?? '') : $column;
          @endphp
          <th>{{ $label }}</th>
        @endforeach
      </tr>
    </thead>
    <tbody>
      @forelse($sectionRows as $rowIndex => $row)
        <tr>
          <td class="row-number">{{ $rowIndex + 1 }}</td>
          @foreach($sectionColumns as $colIndex => $column)
            @php
              $key = is_array($column) ? ($column['key'] ?? $colIndex) : $colIndex;
              $value = is_array($row) ? ($row[$key] ?? ($row[$colIndex] ?? '')) : '';
              // Convert value to string to avoid htmlspecialchars() errors with arrays
              if (is_array($value) || is_object($value)) {
                $value = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
              } else {
                $value = (string) $value;
              }
              // Only show non-empty values, otherwise show em dash
              // NOTE: "0" is a valid value and must be shown.
              $displayValue = ($value !== null && $value !== '') ? $value : '—';
            @endphp
            <td>{{ $displayValue }}</td>
          @endforeach
        </tr>
      @empty
        <tr>
          <td colspan="{{ count($sectionColumns) + 1 }}" style="text-align:center;padding:20px;">
            هیڅ معلومات ونه موندل شول.
          </td>
        </tr>
      @endforelse
    </tbody>
  </table>

  {{-- Body notes --}}
  @if(!empty($NOTES_BODY))
    <div class="notes-section body-notes">
      @foreach($NOTES_BODY as $note)
        <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
      @endforeach
    </div>
  @endif

  {{-- Footer --}}
  <div class="report-footer">
    @if(!empty($footer_text))
      <div class="footer-text">{{ $footer_text }}</div>
    @endif

    <div class="footer-row">
      <div class="footer-left">
        @if(!empty($SCHOOL_PHONE))
          تلیفون: {{ $SCHOOL_PHONE }}
        @endif
        @if(!empty($SCHOOL_EMAIL))
          @if(!empty($SCHOOL_PHONE)) | @endif
          ایمیل: {{ $SCHOOL_EMAIL }}
        @endif
      </div>
      <div class="footer-center">
        @if(!empty($SCHOOL_WEBSITE))
          {{ $SCHOOL_WEBSITE }}
        @endif
      </div>
      <div class="footer-right">
        @if($show_generation_date ?? true)
          نیټه: {{ $CURRENT_DATETIME ?? now()->format('Y-m-d H:i') }}
        @endif
      </div>
    </div>

    @if(!empty($SCHOOL_ADDRESS))
      <div class="footer-row">
        <div class="footer-left"></div>
        <div class="footer-center">
          {{ $SCHOOL_ADDRESS }}
        </div>
        <div class="footer-right"></div>
      </div>
    @endif

    @if(!empty($footer_html))
      <div class="custom-footer">{!! $footer_html !!}</div>
    @endif

    @if(!empty($NOTES_FOOTER))
      <div class="notes-section footer-notes">
        @foreach($NOTES_FOOTER as $note)
          <div class="note-item">{{ $note['note_text'] ?? '' }}</div>
        @endforeach
      </div>
    @endif

    <div class="system-note">
      دا راپور د ناظم سیستم په مټ جوړ شوی دی.
    </div>
  </div>

  @if($sectionIndex < count($sections) - 1)
    <div class="page-break"></div>
  @endif
@endforeach

@endsection


