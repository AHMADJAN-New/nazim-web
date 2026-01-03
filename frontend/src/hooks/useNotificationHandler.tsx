import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StudentProfileView } from '@/components/students/StudentProfileView';
import { studentsApi, studentAdmissionsApi } from '@/lib/api/client';
import { mapStudentAdmissionApiToDomain } from '@/mappers/studentAdmissionMapper';
import { mapStudentApiToDomain } from '@/mappers/studentMapper';
import type { Student } from '@/types/domain/student';
import type { NotificationItem } from '@/types/notification';

/**
 * Maps entity types to their navigation/view patterns
 * Format: entity_type (from backend) -> { type: 'dialog' | 'navigate', handler }
 */
const ENTITY_HANDLERS: Record<string, {
  type: 'dialog' | 'navigate';
  handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => Promise<void> | void;
}> = {
  // Students - Open global StudentProfileView dialog
  'App\\Models\\Student': {
    type: 'dialog',
    handler: async (entityId: string) => {
      // This will be handled by the hook state
      return entityId;
    },
  },
  
  // Student Admissions - Fetch admission, get student_id, open student dialog
  'App\\Models\\StudentAdmission': {
    type: 'dialog',
    handler: async (entityId: string) => {
      // This will be handled by the hook state
      return entityId;
    },
  },
  
  // DMS Documents - Navigate to DMS page with document ID
  'App\\Models\\IncomingDocument': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/dms/incoming?view=${entityId}`);
    },
  },
  'App\\Models\\OutgoingDocument': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/dms/outgoing?view=${entityId}`);
    },
  },
  
  // Finance - Navigate to appropriate finance pages
  'App\\Models\\FinanceAccount': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/accounts?view=${entityId}`);
    },
  },
  'App\\Models\\FinanceDocument': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/documents?view=${entityId}`);
    },
  },
  'App\\Models\\IncomeEntry': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/income?view=${entityId}`);
    },
  },
  'App\\Models\\ExpenseEntry': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/expenses?view=${entityId}`);
    },
  },
  
  // Fees - Navigate to fee pages
  'App\\Models\\FeeAssignment': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/fees/assignments?view=${entityId}`);
    },
  },
  'App\\Models\\FeePayment': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/finance/fees/payments?view=${entityId}`);
    },
  },
  
  // Attendance - Navigate to attendance pages
  'App\\Models\\AttendanceSession': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/attendance?session=${entityId}`);
    },
  },
  'App\\Models\\ExamAttendanceSession': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/exams/attendance?session=${entityId}`);
    },
  },
  
  // Exams - Navigate to exam pages
  'App\\Models\\Exam': {
    type: 'navigate',
    handler: (entityId: string, navigate: ReturnType<typeof useNavigate>) => {
      navigate(`/exams?view=${entityId}`);
    },
  },
};

export function useNotificationHandler() {
  const navigate = useNavigate();
  const [studentToView, setStudentToView] = useState<Student | null>(null);
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNotification = async (notification: NotificationItem) => {
    const entityType = notification.event?.entity_type;
    const entityId = notification.event?.entity_id;

    if (!entityType || !entityId) {
      // Fallback to URL navigation if no entity info
      if (notification.url) {
        navigate(notification.url);
      }
      return;
    }

    const handler = ENTITY_HANDLERS[entityType];

    if (!handler) {
      // Unknown entity type - fallback to URL navigation
      if (notification.url) {
        navigate(notification.url);
      }
      return;
    }

    if (handler.type === 'dialog') {
      // Handle dialog-based entities (Students, StudentAdmissions)
      setIsLoading(true);
      try {
        if (entityType === 'App\\Models\\Student') {
          // Fetch student and open dialog
          const apiStudent = await studentsApi.get(entityId);
          const student = mapStudentApiToDomain(apiStudent as any);
          setStudentToView(student);
          setIsStudentDialogOpen(true);
        } else if (entityType === 'App\\Models\\StudentAdmission') {
          // Fetch admission, get student_id, fetch student, open dialog
          const apiAdmission = await studentAdmissionsApi.get(entityId);
          const admission = mapStudentAdmissionApiToDomain(apiAdmission as any);
          
          if (admission.studentId) {
            const apiStudent = await studentsApi.get(admission.studentId);
            const student = mapStudentApiToDomain(apiStudent as any);
            setStudentToView(student);
            setIsStudentDialogOpen(true);
          } else {
            // Fallback if no student_id
            if (notification.url) {
              navigate(notification.url);
            }
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useNotificationHandler] Error fetching entity:', error);
        }
        // Fallback to URL navigation on error
        if (notification.url) {
          navigate(notification.url);
        }
      } finally {
        setIsLoading(false);
      }
    } else if (handler.type === 'navigate') {
      // Handle navigation-based entities
      handler.handler(entityId, navigate);
    }
  };

  return {
    handleNotification,
    isLoading,
    studentToView,
    isStudentDialogOpen,
    setIsStudentDialogOpen,
    StudentDialog: (
      <StudentProfileView
        open={isStudentDialogOpen}
        onOpenChange={setIsStudentDialogOpen}
        student={studentToView}
      />
    ),
  };
}

