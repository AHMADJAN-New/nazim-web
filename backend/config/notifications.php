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
        'security.password_changed',
        'security.new_device_login',
        'exam.marks_published',
        'library.book_overdue',
        'library.book_due_soon',
        'asset.maintenance_due',
        'subscription.limit_approaching',
        'subscription.limit_reached',
        'subscription.expiring_soon',
        'subscription.expired',
    ],

    'digest_event_types' => [
        'invoice.overdue',
        'library.book_due_soon',
    ],

    'event_levels' => [
        'attendance.sync_failed' => 'critical',
        'attendance.anomaly' => 'warning',
        'system.backup_failed' => 'critical',
        'system.license_expiring' => 'warning',
        'doc.returned' => 'warning',
        'invoice.overdue' => 'warning',
        'security.password_changed' => 'critical',
        'security.new_device_login' => 'critical',
        // Exams
        'exam.created' => 'info',
        'exam.published' => 'info',
        'exam.marks_published' => 'info',
        'exam.timetable_updated' => 'warning',
        // Library
        'library.book_overdue' => 'critical',
        'library.book_due_soon' => 'warning',
        'library.book_reserved' => 'info',
        // Assets
        'asset.assigned' => 'info',
        'asset.maintenance_due' => 'warning',
        'asset.returned' => 'info',
        // Subscription
        'subscription.limit_approaching' => 'warning',
        'subscription.limit_reached' => 'critical',
        'subscription.expiring_soon' => 'warning',
        'subscription.expired' => 'critical',
    ],
];
