<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Analytics Retention Days
    |--------------------------------------------------------------------------
    |
    | Number of days to retain help center analytics data (views and votes).
    | Data older than this will be pruned by the scheduled command.
    | Default: 180 days (6 months)
    |
    */
    'analytics_retention_days' => env('HELP_CENTER_ANALYTICS_RETENTION_DAYS', 180),

    /*
    |--------------------------------------------------------------------------
    | HTML Purifier Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for HTML sanitization when content_type is 'html'.
    | See HTMLPurifier documentation for available options.
    |
    */
    'html_purifier' => [
        'allowed_tags' => 'p,br,strong,em,u,ol,ul,li,a[href],h1,h2,h3,h4,h5,h6,blockquote,code,pre,img[src|alt|width|height],table,thead,tbody,tr,td,th',
        'target_blank' => true,
        'auto_paragraph' => true,
        'linkify' => true,
    ],
];




