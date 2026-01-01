<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Notification event metadata
    |--------------------------------------------------------------------------
    | Central definition of notification behaviors so they can be reused by
    | services, jobs, and UI code.
    */

    'email_eligible_events' => [
        'doc.assigned',
        'invoice.overdue',
        'attendance.sync_failed',
        'system.backup_failed',
        'system.license_expiring',
    ],

    'digest_event_types' => [
        'invoice.overdue',
    ],

    'event_levels' => [
        'attendance.sync_failed' => 'critical',
        'attendance.anomaly' => 'warning',
        'system.backup_failed' => 'critical',
        'system.license_expiring' => 'warning',
        'doc.returned' => 'warning',
        'invoice.overdue' => 'warning',
    ],
];
