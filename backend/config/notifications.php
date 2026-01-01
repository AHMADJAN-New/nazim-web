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
        // Admissions
        'admission.created',
        'admission.approved',
        'admission.rejected',
        'admission.deleted',
        // Finance
        'invoice.created',
        'payment.received',
        'invoice.overdue',
        // Fees
        'fee.assignment.created',
        'fee.payment.received',
        'fee.assignment.overdue',
        'fee.assignment.paid',
        'fee.assignment.status_changed',
        // Attendance
        'attendance.sync_failed',
        'attendance.anomaly',
        'attendance.session.created',
        'attendance.session.closed',
        // DMS / Letters
        'doc.assigned',
        'doc.approved',
        'doc.returned',
        // System
        'system.backup_failed',
        'system.license_expiring',
        // Security
        'security.password_changed',
        'security.new_device_login',
        // Exams
        'exam.created',
        'exam.published',
        'exam.marks_published',
        'exam.timetable_updated',
        // Library
        'library.book_overdue',
        'library.book_due_soon',
        'library.book_reserved',
        // Assets
        'asset.assigned',
        'asset.maintenance_due',
        'asset.returned',
        // Subscription
        'subscription.limit_approaching',
        'subscription.limit_reached',
        'subscription.expiring_soon',
        'subscription.expired',
        // Students
        'student.created',
        'student.updated',
        'student.deleted',
        // Exam Marks
        'exam.marks_updated',
    ],

    'digest_event_types' => [
        'invoice.overdue',
        'fee.assignment.overdue',
        'library.book_due_soon',
    ],

    'event_levels' => [
        // Admissions
        'admission.created' => 'info',
        'admission.approved' => 'info',
        'admission.rejected' => 'warning',
        'admission.deleted' => 'warning',
        // Finance
        'invoice.created' => 'info',
        'payment.received' => 'info',
        'invoice.overdue' => 'warning',
        // Fees
        'fee.assignment.created' => 'info',
        'fee.payment.received' => 'info',
        'fee.assignment.overdue' => 'warning',
        'fee.assignment.paid' => 'info',
        'fee.assignment.status_changed' => 'info',
        // Attendance
        'attendance.sync_failed' => 'critical',
        'attendance.anomaly' => 'warning',
        'attendance.session.created' => 'info',
        'attendance.session.closed' => 'info',
        // DMS / Letters
        'doc.assigned' => 'info',
        'doc.approved' => 'info',
        'doc.returned' => 'warning',
        // System
        'system.backup_failed' => 'critical',
        'system.license_expiring' => 'warning',
        // Security
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
        // Students
        'student.created' => 'info',
        'student.updated' => 'info',
        'student.deleted' => 'warning',
        // Exam Marks
        'exam.marks_updated' => 'info',
    ],
];
