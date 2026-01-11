import type { LucideIcon } from "lucide-react";
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  UserPlus,
  AlertTriangle,
  FileText,
  DollarSign,
  Clock,
  Shield,
  BookOpen,
  Package,
  Bell,
  AlertCircle,
} from "lucide-react";
import type { NotificationItem } from "@/types/notification";

/**
 * Maps notification event types to appropriate Lucide React icons
 */
const EVENT_TYPE_ICONS: Record<string, LucideIcon> = {
  // Admissions
  'admission.created': GraduationCap,
  'admission.approved': CheckCircle,
  'admission.rejected': XCircle,
  'admission.deleted': XCircle,
  
  // Students
  'student.created': UserPlus,
  'student.updated': UserPlus,
  'student.deleted': XCircle,
  
  // Finance
  'invoice.created': FileText,
  'payment.received': DollarSign,
  'invoice.overdue': AlertTriangle,
  
  // Fees
  'fee.assignment.created': FileText,
  'fee.payment.received': DollarSign,
  'fee.assignment.overdue': AlertTriangle,
  'fee.assignment.paid': CheckCircle,
  'fee.assignment.status_changed': Clock,
  
  // Attendance
  'attendance.sync_failed': AlertCircle,
  'attendance.anomaly': AlertTriangle,
  'attendance.session.created': Clock,
  'attendance.session.closed': Clock,
  
  // DMS / Letters
  'doc.assigned': FileText,
  'doc.approved': CheckCircle,
  'doc.returned': XCircle,
  
  // System
  'system.backup_failed': AlertCircle,
  'system.license_expiring': AlertTriangle,
  
  // Security
  'security.password_changed': Shield,
  'security.new_device_login': Shield,
  
  // Exams
  'exam.created': FileText,
  'exam.published': CheckCircle,
  'exam.marks_published': CheckCircle,
  'exam.timetable_updated': Clock,
  'exam.marks_updated': FileText,
  
  // Library
  'library.book_overdue': AlertTriangle,
  'library.book_due_soon': AlertTriangle,
  'library.book_reserved': BookOpen,
  
  // Assets
  'asset.assigned': Package,
  'asset.maintenance_due': AlertTriangle,
  'asset.returned': CheckCircle,
  
  // Subscription
  'subscription.limit_approaching': AlertTriangle,
  'subscription.limit_reached': AlertCircle,
  'subscription.expiring_soon': AlertTriangle,
  'subscription.expired': AlertCircle,
};

/**
 * Gets the icon for a notification based on its event type
 * Falls back to Bell icon if no specific icon is found
 */
export function getNotificationIcon(notification: NotificationItem): LucideIcon {
  const eventType = notification.event?.type;
  
  if (eventType && EVENT_TYPE_ICONS[eventType]) {
    return EVENT_TYPE_ICONS[eventType];
  }
  
  // Fallback to Bell icon
  return Bell;
}

