{{--
  Embed Bahij fonts for DomPDF / Browsershot.
  DomPDF cannot load /fonts/... HTTP paths from a queue worker — use base64 (TTF preferred).
--}}
@php
    $fontBasePath = public_path('fonts');
    $ds = DIRECTORY_SEPARATOR;

    $loadFontDataUri = static function (string $path, string $mime): ?string {
        if (! is_file($path) || ! is_readable($path)) {
            return null;
        }

        try {
            $data = file_get_contents($path);
            if ($data === false || $data === '') {
                return null;
            }

            return 'data:'.$mime.';charset=utf-8;base64,'.base64_encode($data);
        } catch (\Throwable) {
            return null;
        }
    };

    $nassimRegularUri = $loadFontDataUri($fontBasePath.$ds.'Bahij Nassim-Regular.ttf', 'font/truetype')
        ?? $loadFontDataUri($fontBasePath.$ds.'Bahij Nassim-Regular.woff', 'font/woff');
    $nassimBoldUri = $loadFontDataUri($fontBasePath.$ds.'Bahij Nassim-Bold.ttf', 'font/truetype')
        ?? $loadFontDataUri($fontBasePath.$ds.'Bahij Nassim-Bold.woff', 'font/woff');
    $titrBoldUri = $loadFontDataUri($fontBasePath.$ds.'Bahij Titr-Bold.ttf', 'font/truetype')
        ?? $loadFontDataUri($fontBasePath.$ds.'Bahij Titr-Bold.woff', 'font/woff');

    $nassimRegularSrc = $nassimRegularUri
        ? 'url("'.$nassimRegularUri.'") format("'.(str_contains($nassimRegularUri, 'font/truetype') ? 'truetype' : 'woff').'")'
        : '';
    $nassimBoldSrc = $nassimBoldUri
        ? 'url("'.$nassimBoldUri.'") format("'.(str_contains($nassimBoldUri, 'font/truetype') ? 'truetype' : 'woff').'")'
        : '';
    $titrBoldSrc = $titrBoldUri
        ? 'url("'.$titrBoldUri.'") format("'.(str_contains($titrBoldUri, 'font/truetype') ? 'truetype' : 'woff').'")'
        : '';
@endphp
@if($nassimRegularSrc !== '')
@font-face {
    font-family: "BahijNassim";
    src: {!! $nassimRegularSrc !!};
    font-weight: 400;
    font-style: normal;
    font-display: block;
}
@endif
@if($nassimBoldSrc !== '')
@font-face {
    font-family: "BahijNassim";
    src: {!! $nassimBoldSrc !!};
    font-weight: 700;
    font-style: normal;
    font-display: block;
}
@endif
@if($titrBoldSrc !== '')
@font-face {
    font-family: "BahijTitr";
    src: {!! $titrBoldSrc !!};
    font-weight: 700;
    font-style: normal;
    font-display: block;
}
@endif
