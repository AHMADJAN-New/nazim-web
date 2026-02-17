<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Login Attempt Policy
    |--------------------------------------------------------------------------
    |
    | Configuration for login security: max attempts before lockout,
    | lockout duration, rate limiting, and audit retention.
    |
    */

    'max_attempts' => env('LOGIN_MAX_ATTEMPTS', 5),

    'lockout_duration_minutes' => env('LOGIN_LOCKOUT_MINUTES', 15),

    'rate_limit_per_ip' => env('LOGIN_RATE_LIMIT_IP', 10),

    'rate_limit_per_ip_minutes' => 15,

    'rate_limit_per_email' => env('LOGIN_RATE_LIMIT_EMAIL', 5),

    'rate_limit_per_email_minutes' => 15,

    'audit_retention_days' => env('LOGIN_AUDIT_RETENTION_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Brute-Force Alert Thresholds
    |--------------------------------------------------------------------------
    |
    | Thresholds for platform admin brute-force alerts.
    |
    */

    'alert_ip_failure_threshold' => 10,

    'alert_email_failure_threshold' => 5,

    'alert_window_minutes' => 60,

];
