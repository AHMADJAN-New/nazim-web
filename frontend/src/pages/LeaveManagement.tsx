import { useQuery } from '@tanstack/react-query';
import { addDays, addWeeks, format } from 'date-fns';
import { calendarState } from '@/lib/calendarState';
import { Calendar, CheckCircle2, ChevronDown, Eye, FileText, Loader2, MoreHorizontal, Printer, UserRound, Zap, Search, Scan, X, Clock, MapPin, Building2 } from 'lucide-react';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest, useUpdateLeaveRequest } from '@/hooks/useLeaveRequests';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { Student } from '@/types/domain/student';
import { useProfile } from '@/hooks/useProfiles';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PictureCell } from '@/components/shared/PictureCell';
import { cn } from '@/lib/utils';
import {
  findStudentBySearchTerm,
  resolveStudentSelectionOnClassChange,
} from '@/lib/leave/leaveManagementHelpers';
import { showToast } from '@/lib/toast';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { leaveRequestsApi, studentAdmissionsApi } from '@/lib/api/client';
import type { LeaveRequest, LeaveRequestInsert } from '@/types/domain/leave';
import { mapLeaveRequestApiToDomain } from '@/mappers/leaveMapper';
import {
  buildLeaveApprovalFilters,
  canEditLeaveRequestDates,
  type LeaveApprovalStatusFilter,
} from '@/lib/leave/leaveApprovalWorkspace';
import { displayLeaveSchoolName } from '@/lib/leave/leaveSchoolName';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

interface LeaveManagementProps {
  mode?: 'create' | 'approvals';
}

export default function LeaveManagement({ mode = 'create' }: LeaveManagementProps) {
  const { t, isRTL, language } = useLanguage();
  const isApprovalsView = mode === 'approvals';
  const { data: profile } = useProfile();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'full_day' | 'partial_day' | 'time_bound'>('full_day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name?: string; code?: string; className?: string | null } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [requestPanelOpen, setRequestPanelOpen] = useState(false);
  const [fastSearch, setFastSearch] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [panelApprovalNote, setPanelApprovalNote] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<LeaveApprovalStatusFilter>('pending');
  const [approvalDateFrom, setApprovalDateFrom] = useState('');
  const [approvalDateTo, setApprovalDateTo] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pendingStudentFromScanRef = useRef<string | null>(null);
  const [scannedStudentOption, setScannedStudentOption] = useState<ComboboxOption | null>(null);
  const [lastCreatedRequest, setLastCreatedRequest] = useState<LeaveRequest | null>(null);
  const [approvalNoteOpen, setApprovalNoteOpen] = useState(false);
  const [identityStudent, setIdentityStudent] = useState<{
    id: string;
    fullName: string;
    fatherName: string | null;
    code: string | null;
    className: string | null;
    picturePath: string | null;
  } | null>(null);

  // Get current academic year
  const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);
  
  // Get class academic years for current academic year
  const { data: classAcademicYears } = useClassAcademicYears(
    currentAcademicYear?.id,
    profile?.organization_id
  );

  const approvalFilters = useMemo(
    () => buildLeaveApprovalFilters(approvalStatus, approvalDateFrom, approvalDateTo),
    [approvalStatus, approvalDateFrom, approvalDateTo],
  );

  const { requests, pagination, page, pageSize, setPage, setPageSize, isLoading } = useLeaveRequests(
    isApprovalsView ? approvalFilters : {},
  );

  useEffect(() => {
    setPage(1);
  }, [approvalStatus, approvalDateFrom, approvalDateTo, setPage]);

  // Get student admissions with active status and class filter
  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
    class_id: selectedClass || undefined,
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);

  const createLeave = useCreateLeaveRequest();
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();
  const updateLeave = useUpdateLeaveRequest();

  // Get classes from class academic years (only for current academic year)
  const classOptions = useMemo<ComboboxOption[]>(() => {
    if (!classAcademicYears) return [];
    // Get unique classes from class academic years
    const uniqueClasses = new Map<string, { id: string; name: string; section?: string }>();
    classAcademicYears.forEach(cay => {
      if (cay.class && !uniqueClasses.has(cay.classId)) {
        const className = cay.sectionName 
          ? `${cay.class.name} - ${cay.sectionName}`
          : cay.class.name;
        uniqueClasses.set(cay.classId, {
          id: cay.classId,
          name: className,
          section: cay.sectionName || undefined,
        });
      }
    });
    return Array.from(uniqueClasses.values()).map(cls => ({
      value: cls.id,
      label: cls.name,
    }));
  }, [classAcademicYears]);

  // Filter students by selected class
  // When a class is selected, we should ideally filter by class, but for now show all
  // The selected student from search should always be available
  const filteredStudents = useMemo<Student[]>(() => {
    if (!students.length) return [];
    // If class is selected, we could filter, but for now show all to ensure searched student is available
    // The selected student ID is preserved even if not in filtered list
    return students;
  }, [students]);

  // Memoized options for searchable comboboxes
  const studentOptions = useMemo<ComboboxOption[]>(() => {
    if (!filteredStudents) return [];
    return filteredStudents.map(student => {
      const name = student.fullName || 'Unknown';
      const code = student.studentCode || student.admissionNumber || '';
      const card = student.cardNumber || '';
      
      // Create label that's both searchable and displayable
      // Format: "Name (Code) [Card]" for better readability in combobox
      let displayLabel = name;
      if (code) {
        displayLabel += ` (${code})`;
      }
      if (card) {
        displayLabel += ` [Card: ${card}]`;
      }
      
      return {
        value: student.id,
        // Label includes all searchable terms - Command will search in this
        label: displayLabel,
      };
    });
  }, [filteredStudents]);
  
  const buildStudentOption = useCallback((student: Student): ComboboxOption => {
    const name = student.fullName || 'Unknown';
    const code = student.studentCode || student.admissionNumber || '';
    const card = student.cardNumber || '';

    let displayLabel = name;
    if (code) {
      displayLabel += ` (${code})`;
    }
    if (card) {
      displayLabel += ` [Card: ${card}]`;
    }

    return {
      value: student.id,
      label: displayLabel,
    };
  }, []);

  // Ensure selected student is always in options (for when student is selected via search)
  const studentOptionsWithSelected = useMemo<ComboboxOption[]>(() => {
    const options = [...studentOptions];

    if (scannedStudentOption && !options.some(opt => opt.value === scannedStudentOption.value)) {
      options.unshift(scannedStudentOption);
    }

    if (selectedStudent && !options.some(opt => opt.value === selectedStudent)) {
      const selectedStudentData = students.find(s => s.id === selectedStudent);
      if (selectedStudentData) {
        options.unshift(buildStudentOption(selectedStudentData));
      }
    }

    return options;
  }, [studentOptions, selectedStudent, students, scannedStudentOption, buildStudentOption]);

  // Reset student when class changes manually; preserve student when set from card scan
  useEffect(() => {
    const resolution = resolveStudentSelectionOnClassChange(pendingStudentFromScanRef.current);
    pendingStudentFromScanRef.current = null;

    if (resolution.action === 'preserve') {
      setSelectedStudent(resolution.studentId);
      return;
    }

    setSelectedStudent('');
    setScannedStudentOption(null);
  }, [selectedClass]);

  // Keep identity card in sync when class/student list resolves after scan or manual pick
  useEffect(() => {
    if (!selectedStudent) {
      setIdentityStudent(null);
      return;
    }

    const className = classOptions.find((c) => c.value === selectedClass)?.label || null;
    const fromList = students.find((s) => s.id === selectedStudent);
    if (fromList) {
      setIdentityStudent({
        id: fromList.id,
        fullName: fromList.fullName,
        fatherName: fromList.fatherName || null,
        code: fromList.studentCode || fromList.admissionNumber || null,
        className,
        picturePath: fromList.picturePath || null,
      });
      return;
    }

    setIdentityStudent((prev) => {
      if (prev?.id === selectedStudent) {
        return { ...prev, className: className ?? prev.className };
      }
      if (scannedStudentOption?.value === selectedStudent) {
        return {
          id: selectedStudent,
          fullName: scannedStudentOption.label.split(' (')[0] || scannedStudentOption.label,
          fatherName: null,
          code: null,
          className,
          picturePath: null,
        };
      }
      return prev;
    });
  }, [selectedStudent, students, selectedClass, classOptions, scannedStudentOption]);

  const resetLeaveFields = useCallback(() => {
    setLeaveType('full_day');
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setReason('');
    setApprovalNote('');
    setApprovalNoteOpen(false);
  }, []);

  const handleNextStudent = useCallback(() => {
    setLastCreatedRequest(null);
    setSelectedStudent('');
    setScannedStudentOption(null);
    setIdentityStudent(null);
    setFastSearch('');
    resetLeaveFields();
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [resetLeaveFields]);

  const handleCreate = async () => {
    if (!selectedStudent || !startDate || !endDate) {
      showToast.error('leave.requiredFields');
      return;
    }

    const payload: LeaveRequestInsert = {
      studentId: selectedStudent,
      classId: selectedClass || null,
      schoolId: null,
      academicYearId: currentAcademicYear?.id || null,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || null,
      endTime: endTime || null,
      reason,
      approvalNote: approvalNote || null,
    };

    try {
      const created = await createLeave.mutateAsync(payload);
      const enriched: LeaveRequest = {
        ...created,
        student: created.student ?? (identityStudent
          ? {
              id: identityStudent.id,
              fullName: identityStudent.fullName,
              fatherName: identityStudent.fatherName,
              admissionNo: identityStudent.code || '',
              studentCode: identityStudent.code,
              picturePath: identityStudent.picturePath,
            }
          : undefined),
        className: created.className ?? identityStudent?.className ?? null,
      };
      setLastCreatedRequest(enriched);
      setSelectedStudent('');
      setScannedStudentOption(null);
      setIdentityStudent(null);
      setFastSearch('');
      resetLeaveFields();
    } catch {
      // Error is handled by the mutation hook
    }
  };

  useEffect(() => {
    if (!isApprovalsView) {
      searchInputRef.current?.focus();
    }
  }, [isApprovalsView]);

  const handleApprove = async (request: LeaveRequest) => {
    try {
      await approveLeave.mutateAsync({ id: request.id, note: panelApprovalNote || undefined });
      setPanelApprovalNote('');
      if (selectedRequest?.id === request.id) {
        setRequestPanelOpen(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    try {
      await rejectLeave.mutateAsync({ id: request.id, note: panelApprovalNote || undefined });
      setPanelApprovalNote('');
      if (selectedRequest?.id === request.id) {
        setRequestPanelOpen(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleRowClick = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setRequestPanelOpen(true);
    setPanelApprovalNote('');
    setEditStartDate(dateToLocalYYYYMMDD(request.startDate));
    setEditEndDate(dateToLocalYYYYMMDD(request.endDate));
  };

  const handleSaveDates = async () => {
    if (!selectedRequest || !canEditLeaveRequestDates(selectedRequest.status)) return;

    if (!editStartDate || !editEndDate || editEndDate < editStartDate) {
      showToast.error('leave.requiredFields');
      return;
    }

    try {
      const updated = await updateLeave.mutateAsync({
        id: selectedRequest.id,
        data: {
          startDate: parseLocalDate(editStartDate),
          endDate: parseLocalDate(editEndDate),
        },
      });
      setSelectedRequest(updated);
    } catch {
      // Mutation hook shows the translated error toast.
    }
  };

  const handleViewHistory = (request: LeaveRequest) => {
    setHistoryStudent({
      id: request.studentId,
      name: request.student?.fullName || t('leave.student'),
      code: request.student?.studentCode || request.student?.admissionNo || undefined,
      className: request.className,
    });
    setHistoryOpen(true);
  };

  const { data: historyData, isLoading: historyLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-history', historyStudent?.id],
    queryFn: async () => {
      if (!historyStudent?.id) return [] as LeaveRequest[];
      const response = await leaveRequestsApi.list({ student_id: historyStudent.id, per_page: 100 });
      if (response && typeof response === 'object' && 'data' in (response as any)) {
        return ((response as any).data as any[]).map(mapLeaveRequestApiToDomain);
      }
      return (response as any[]).map(mapLeaveRequestApiToDomain);
    },
    enabled: !!historyStudent?.id,
  });

  const handlePrint = async (request: LeaveRequest) => {
    try {
      const calendar = calendarState.get();
      const calendarPreference =
        calendar === 'gregorian' ? 'gregorian' : calendar === 'hijri_shamsi' ? 'jalali' : 'qamari';
      const langCode =
        language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

      const leaveTypeKey =
        request.leaveType === 'partial_day'
          ? 'partialDay'
          : request.leaveType === 'time_bound'
            ? 'timeBound'
            : 'fullDay';

      const { blob } = await leaveRequestsApi.printData(request.id, {
        calendar_preference: calendarPreference,
        language: langCode,
        labels: {
          title: t('leave.leaveRequest'),
          student: t('leave.student'),
          fatherName: t('leave.fatherName'),
          code: t('leave.code'),
          class: t('leave.class'),
          leaveType: t('leave.leaveType'),
          fullDay: t('leave.fullDay'),
          partialDay: t('leave.partialDay'),
          timeBound: t('leave.timeBound'),
          startDate: t('leave.startDate'),
          endDate: t('leave.endDate'),
          time: `${t('leave.startTime')} - ${t('leave.endTime')}`,
          duration: t('leave.leaveDuration'),
          days: t('leave.leaves'),
          hours: t('leave.hours'),
          reason: t('leave.reason'),
          status: t('leave.status'),
          pending: t('leave.pending'),
          approved: t('leave.approved'),
          rejected: t('leave.rejected'),
          cancelled: t('leave.cancelled'),
          approvalNote: t('leave.approvalNote'),
          approvedBy: t('leave.approvedBy'),
          approvedAt: t('leave.approvedAt'),
          leaveId: t('leave.leaveId'),
          printedOn: t('leave.printedOn'),
          scanToVerify: t('leave.scanToVerify'),
          signatureGuard: t('leave.signatureGuard'),
          signatureDate: t('leave.signatureDate'),
          systemNote: t('leave.systemNote'),
          [leaveTypeKey]: t(`leave.${leaveTypeKey}`),
          [request.status]: t(`leave.${request.status}`),
        },
      });

      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } finally {
            const cleanup = () => {
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
                URL.revokeObjectURL(blobUrl);
                window.removeEventListener('afterprint', cleanup);
              }, 500);
            };
            window.addEventListener('afterprint', cleanup);
            // Fallback cleanup if afterprint never fires (cancel / some browsers)
            setTimeout(cleanup, 30000);
          }
        }, 500);
      };
    } catch (error) {
      showToast.error(t('leave.couldNotPrint') || 'Could not print leave request');
      if (import.meta.env.DEV) {
        console.error('Print error:', error);
      }
    }
  };

  const sortedRequests = useMemo(() => {
    return [...(requests as LeaveRequest[])].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [requests]);

  const historySummary = useMemo(() => {
    const entries = historyData || [];
    const counts: Record<LeaveRequest['status'] | 'total', number> = {
      total: entries.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
    };

    const byMonth: Record<string, number> = {};

    entries.forEach(entry => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
      const key = format(entry.startDate, 'yyyy-MM');
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    return { counts, byMonth };
  }, [historyData]);

  // Quick entry handlers for common durations
  const handleQuickEntry = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = addDays(today, days - 1);
    
    setStartDate(format(today, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const quickEntryOptions = useMemo(() => [
    { label: t('leave.oneDay'), days: 1 },
    { label: t('leave.twoDays'), days: 2 },
    { label: t('leave.threeDays'), days: 3 },
    { label: t('leave.oneWeek'), days: 7 },
    { label: t('leave.twoWeeks'), days: 14 },
    { label: t('leave.oneMonth'), days: 30 },
  ], [t]);

  // Quick reason options for common leave reasons
  const quickReasonOptions = useMemo(() => [
    { label: t('leave.sick').split(' - ')[0], reason: t('leave.sick') },
    { label: t('leave.gettingOutside').split(' - ')[0], reason: t('leave.gettingOutside') },
    { label: t('leave.familyEmergency').split(' - ')[0], reason: t('leave.familyEmergency') },
    { label: t('leave.medicalAppointment').split(' - ')[0], reason: t('leave.medicalAppointment') },
    { label: t('leave.personal').split(' - ')[0], reason: t('leave.personal') },
    { label: t('leave.familyEvent').split(' - ')[0], reason: t('leave.familyEvent') },
    { label: t('leave.travel').split(' - ')[0], reason: t('leave.travel') },
    { label: t('leave.religious').split(' - ')[0], reason: t('leave.religious') },
  ], [t]);

  const handleQuickReason = (reasonText: string) => {
    setReason(reasonText);
  };

  // Fast search handler - search by card number, student code, or admission number
  const handleFastSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim() || !students.length || !currentAcademicYear || !profile?.organization_id) {
      if (!currentAcademicYear) {
        showToast.error('leave.academicYearNotLoaded');
      }
      return;
    }
    
    const trimmedSearch = searchValue.trim().toLowerCase();
    setIsSearching(true);
    
    try {
      // Search in all students by card number, student code, or admission number
      const foundStudent = findStudentBySearchTerm(students, trimmedSearch);

      if (!foundStudent) {
        showToast.error('leave.studentNotFound');
        setIsSearching(false);
        return;
      }

      // Get student's admission for current academic year to find their class
      try {
        const admissions = await studentAdmissionsApi.list({
          organization_id: profile.organization_id,
          student_id: foundStudent.id,
          academic_year_id: currentAcademicYear.id,
        });

        // Handle both paginated and non-paginated responses
        let admission: any = null;
        if (Array.isArray(admissions)) {
          admission = admissions.find((a: any) => a.academic_year_id === currentAcademicYear.id && a.class_id);
        } else if (admissions && typeof admissions === 'object' && 'data' in admissions) {
          admission = (admissions as any).data?.find((a: any) => a.academic_year_id === currentAcademicYear.id && a.class_id);
        }

        if (admission && admission.class_id) {
          // Check if the class exists in our class options
          const classExists = classOptions.some(opt => opt.value === admission.class_id);
          
          if (classExists) {
            const className = classOptions.find(c => c.value === admission.class_id)?.label || t('events.unknown');
            pendingStudentFromScanRef.current = foundStudent.id;
            setScannedStudentOption(buildStudentOption(foundStudent));
            setIdentityStudent({
              id: foundStudent.id,
              fullName: foundStudent.fullName,
              fatherName: foundStudent.fatherName || null,
              code: foundStudent.studentCode || foundStudent.admissionNumber || null,
              className,
              picturePath: foundStudent.picturePath || null,
            });
            setSelectedClass(admission.class_id);
            setFastSearch('');
            showToast.success('leave.studentFound', { name: foundStudent.fullName, class: className });

            setTimeout(() => {
              document.getElementById('reason')?.focus();
            }, 200);
          } else {
            showToast.error('leave.classNotAvailable');
          }
        } else {
          showToast.error('leave.studentNotEnrolled');
        }
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch student admission:', error);
        }
        showToast.error('leave.couldNotDetermineClass');
      }
    } catch (error: any) {
      showToast.error(error.message || 'leave.failedToSearchStudent');
    } finally {
      setIsSearching(false);
    }
  }, [students, currentAcademicYear, profile?.organization_id, classOptions, t, buildStudentOption]);

  // Handle Enter key for immediate search (no auto-search on typing)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && fastSearch.trim() && !isSearching) {
      e.preventDefault();
      handleFastSearch(fastSearch);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader
        title={isApprovalsView ? t('nav.leaveApprovals') : t('nav.leaveRequests')}
        description={isApprovalsView ? t('leave.awaitingApproval') : t('leave.subtitle')}
        icon={<FileText className="h-5 w-5" />}
      />

      {!isApprovalsView ? (
        <div className="space-y-4">
          {lastCreatedRequest && (
            <Card className="border-green-200 bg-green-50/60 dark:bg-green-950/20 dark:border-green-900">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1 min-w-0">
                    <div className={`flex items-center gap-2 text-green-800 dark:text-green-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      <p className="font-semibold">{t('leave.requestCreatedSummary')}</p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {lastCreatedRequest.student?.fullName || t('leave.student')}
                      {' · '}
                      {formatDate(lastCreatedRequest.startDate)} → {formatDate(lastCreatedRequest.endDate)}
                      {' · '}
                      {t(`leave.${lastCreatedRequest.leaveType === 'partial_day' ? 'partialDay' : lastCreatedRequest.leaveType === 'time_bound' ? 'timeBound' : 'fullDay'}`)}
                    </p>
                  </div>
                  <div className={`flex flex-col sm:flex-row gap-2 flex-shrink-0 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <Button
                      variant="outline"
                      onClick={() => handlePrint(lastCreatedRequest)}
                      aria-label={t('leave.printSlip')}
                    >
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">{t('leave.printSlip')}</span>
                    </Button>
                    <Button onClick={handleNextStudent} aria-label={t('leave.nextStudent')}>
                      <Scan className="h-4 w-4" />
                      <span className="hidden sm:inline ml-2">{t('leave.nextStudent')}</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-semibold">{t('leave.createRequest')}</CardTitle>
              <CardDescription className="hidden md:block">{t('leave.createRequestDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Left — Student */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fast-search" className={`text-base font-semibold flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Scan className="h-4 w-4" />
                      {t('leave.fastSearchScan')}
                    </Label>
                    <div className="relative">
                      <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                      <Input
                        id="fast-search"
                        ref={searchInputRef}
                        type="text"
                        value={fastSearch}
                        onChange={(e) => setFastSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder={t('leave.scanCardPlaceholder')}
                        className={`${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} h-12 text-base`}
                        disabled={isSearching || !currentAcademicYear}
                        autoComplete="off"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                      {isSearching && (
                        <Loader2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground`} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{t('leave.scanCardHint')}</p>
                  </div>

                  {identityStudent ? (
                    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-muted/40 p-4 sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                        {t('leave.studentIdentity')}
                      </p>
                      <div className="flex items-stretch gap-4 sm:gap-5">
                        <div className="flex-shrink-0 self-center">
                          <PictureCell
                            type="student"
                            entityId={identityStudent.id}
                            picturePath={identityStudent.picturePath}
                            alt={identityStudent.fullName}
                            size="xl"
                            className="ring-2 ring-primary/15 shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1 space-y-3 text-start">
                          <div>
                            <p className="font-semibold text-lg sm:text-xl leading-tight truncate">
                              {identityStudent.fullName}
                            </p>
                            {identityStudent.fatherName && (
                              <p className="mt-1 text-sm text-muted-foreground truncate">
                                <span className="text-muted-foreground/80">{t('leave.fatherName')}: </span>
                                {identityStudent.fatherName}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {identityStudent.code && (
                              <div className="rounded-lg bg-background/80 border px-3 py-2 min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {t('leave.code')}
                                </p>
                                <p className="text-sm font-medium truncate mt-0.5">{identityStudent.code}</p>
                              </div>
                            )}
                            {identityStudent.className && (
                              <div className="rounded-lg bg-background/80 border px-3 py-2 min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  {t('leave.class')}
                                </p>
                                <p className="text-sm font-medium truncate mt-0.5">{identityStudent.className}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground text-center">
                      {t('leave.scanCardHint')}
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('leave.manualSelect')}
                    </p>
                    <div className="space-y-2">
                      <Label>{t('leave.class')}</Label>
                      <Combobox
                        options={classOptions}
                        value={selectedClass}
                        onValueChange={setSelectedClass}
                        placeholder={t('leave.selectClassPlaceholder')}
                        searchPlaceholder={t('leave.searchClassesPlaceholder')}
                        emptyText={currentAcademicYear ? t('leave.noClassesFound') : t('leave.loadingAcademicYear')}
                        disabled={!currentAcademicYear}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('leave.student')}</Label>
                      <div key={selectedStudent || 'no-student'}>
                        <Combobox
                          options={studentOptionsWithSelected}
                          value={selectedStudent}
                          onValueChange={setSelectedStudent}
                          placeholder={selectedClass ? t('leave.selectStudentPlaceholder') : t('leave.selectClassFirstMessage')}
                          searchPlaceholder={t('events.searchStudentPlaceholder')}
                          emptyText={selectedClass ? t('leave.noStudentsInClass') : t('leave.selectClassFirstMessage')}
                          disabled={!selectedClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — Leave details */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('leave.leaveType')}</Label>
                    <div className={`flex flex-wrap gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {([
                        { value: 'full_day' as const, label: t('leave.fullDay') },
                        { value: 'partial_day' as const, label: t('leave.partialDay') },
                        { value: 'time_bound' as const, label: t('leave.timeBound') },
                      ]).map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          size="sm"
                          variant={leaveType === option.value ? 'default' : 'outline'}
                          onClick={() => setLeaveType(option.value)}
                          className="h-8 text-xs"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('leave.leaveDuration')}</Label>
                    <div className={`flex flex-wrap gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {quickEntryOptions.map((option) => (
                        <Button
                          key={option.days}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickEntry(option.days)}
                          className={`h-8 text-xs flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                          <span className="sm:hidden font-semibold">{option.days}</span>
                          <Zap className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'} hidden sm:inline`} />
                          <span className="hidden sm:inline">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>{t('leave.startDate')} <span className="text-destructive">*</span></Label>
                        <CalendarDatePicker
                          date={startDate ? parseLocalDate(startDate) : undefined}
                          onDateChange={(date) => setStartDate(date ? dateToLocalYYYYMMDD(date) : '')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('leave.endDate')} <span className="text-destructive">*</span></Label>
                        <CalendarDatePicker
                          date={endDate ? parseLocalDate(endDate) : undefined}
                          onDateChange={(date) => setEndDate(date ? dateToLocalYYYYMMDD(date) : '')}
                        />
                      </div>
                    </div>
                  </div>

                  {leaveType !== 'full_day' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>{t('leave.startTime')}</Label>
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('leave.endTime')}</Label>
                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="reason">{t('leave.reason')} <span className="text-destructive">*</span></Label>
                    <div className={`flex flex-wrap gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {quickReasonOptions.map((option) => (
                        <Button
                          key={option.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickReason(option.reason)}
                          className="h-8 text-xs flex-shrink-0"
                        >
                          <span className="truncate max-w-[120px] sm:max-w-none">{option.label}</span>
                        </Button>
                      ))}
                    </div>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('leave.reasonPlaceholder')}
                      className="min-h-[88px]"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>

                  <Collapsible open={approvalNoteOpen} onOpenChange={setApprovalNoteOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                        <span>{t('leave.addApprovalNote')}</span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', approvalNoteOpen && 'rotate-180')} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <Textarea
                        id="approval-note"
                        value={approvalNote}
                        onChange={(e) => setApprovalNote(e.target.value)}
                        placeholder={t('leave.approvalNotePlaceholder')}
                        className="min-h-[72px]"
                        dir={isRTL ? 'rtl' : 'ltr'}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <div className={`flex flex-col sm:flex-row gap-2 pt-2 border-t ${isRTL ? 'sm:flex-row-reverse sm:justify-start' : 'sm:justify-end'}`}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedStudent('');
                        setScannedStudentOption(null);
                        setFastSearch('');
                        resetLeaveFields();
                        setLastCreatedRequest(null);
                      }}
                      disabled={createLeave.isPending}
                    >
                      {t('leave.clearForm')}
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={createLeave.isPending || !selectedStudent || !startDate || !endDate || !reason.trim()}
                      size="lg"
                    >
                      {createLeave.isPending ? (
                        <>
                          <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('leave.creating')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                          {t('leave.createRequest')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs
          value={approvalStatus}
          onValueChange={(value) => setApprovalStatus(value as LeaveApprovalStatusFilter)}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{t('leave.pending')}</span>
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('leave.approved')}</span>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">{t('leave.rejected')}</span>
            </TabsTrigger>
            <TabsTrigger value="all">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t('leave.allRequests')}</span>
            </TabsTrigger>
          </TabsList>

          <FilterPanel
            title={t('leave.filters')}
            defaultOpenDesktop
            defaultOpenMobile={false}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('leave.from')}</Label>
                <CalendarDatePicker
                  date={approvalDateFrom ? parseLocalDate(approvalDateFrom) : undefined}
                  onDateChange={(date) => setApprovalDateFrom(date ? dateToLocalYYYYMMDD(date) : '')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('leave.to')}</Label>
                <CalendarDatePicker
                  date={approvalDateTo ? parseLocalDate(approvalDateTo) : undefined}
                  onDateChange={(date) => setApprovalDateTo(date ? dateToLocalYYYYMMDD(date) : '')}
                  minDate={approvalDateFrom ? parseLocalDate(approvalDateFrom) : undefined}
                />
              </div>
            </div>
            {(approvalDateFrom || approvalDateTo) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setApprovalDateFrom('');
                    setApprovalDateTo('');
                  }}
                >
                  {t('leave.resetFilters')}
                </Button>
              </div>
            )}
          </FilterPanel>

          <Card>
            <CardHeader>
              <CardTitle>{t('nav.leaveApprovals')}</CardTitle>
              <CardDescription className="hidden md:block">{t('leave.awaitingApproval')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('events.dates')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                      <TableHead>{t('events.status')}</TableHead>
                      <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">{t('leave.loadingLeaveRequests')}</TableCell>
                      </TableRow>
                    ) : sortedRequests.length > 0 ? (
                      sortedRequests.map(request => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleRowClick(request)}
                      >
                        <TableCell className="space-y-1">
                          <div className="font-semibold flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-500" />
                            {request.student?.fullName || t('leave.student')}
                          </div>
                          {request.student?.fatherName && (
                            <div className="text-xs text-slate-500">
                              {t('leave.fatherName')}: {request.student.fatherName}
                            </div>
                          )}
                          <div className="text-xs text-slate-500">{request.student?.studentCode || request.student?.admissionNo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(request.startDate)} → {formatDate(request.endDate)}</div>
                          <div className="text-xs text-slate-500">{request.className || t('search.class')} / {displayLeaveSchoolName(request, language, t('leave.mainSchool')) || t('common.selectSchool')}</div>
                        </TableCell>
                        <TableCell className="max-w-[240px]"><div className="line-clamp-2 text-sm">{request.reason}</div></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[request.status] || ''}>{t(`leave.${request.status}`)}</Badge>
                        </TableCell>
                        <TableCell className={`${isRTL ? 'text-left' : 'text-right'}`} onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t('events.actions')}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                              <DropdownMenuLabel>{t('events.actions')}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRowClick(request)}>
                                <Eye className={`h-4 w-4 text-blue-600 dark:text-blue-400 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('events.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewHistory(request)}>
                                <Calendar className={`h-4 w-4 text-purple-600 dark:text-purple-400 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('assets.history')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePrint(request)}>
                                <Printer className={`h-4 w-4 text-indigo-600 dark:text-indigo-400 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('events.print')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">{t('leave.noLeaveRequestsYet')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className={`flex justify-between items-center mt-3 text-sm text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('leave.pageOf', { page, total: pagination.last_page })}</span>
                  <div className={`${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                    <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{t('leave.prev')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= (pagination?.last_page || 1)}>{t('events.next')}</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Tabs>
      )}

      {/* Leave Request Details Panel */}
      <Sheet open={requestPanelOpen} onOpenChange={(open) => { 
        setRequestPanelOpen(open); 
        if (!open) {
          setSelectedRequest(null);
          setPanelApprovalNote('');
        }
      }}>
        <SheetContent 
          className="w-full sm:max-w-xl sm:w-[560px] overflow-y-auto"
        >
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle className={`flex items-center gap-2 text-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FileText className="h-5 w-5 text-slate-500" />
                  {t('leave.leaveRequest')}
                </SheetTitle>
                <SheetDescription>
                  {selectedRequest.student?.fullName || t('leave.leaveRequest')}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button
                    onClick={() => handlePrint(selectedRequest)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Printer className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('events.print')}
                  </Button>
                  <Button
                    onClick={() => {
                      handleViewHistory(selectedRequest);
                      setRequestPanelOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Calendar className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {t('assets.history')}
                  </Button>
                </div>

                {/* Student Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserRound className="h-4 w-4" />
                      {t('leave.student')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{t('common.name')}:</span>
                      <span className="text-sm font-semibold text-right">{selectedRequest.student?.fullName || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{t('leave.fatherName')}:</span>
                      <span className="text-sm font-medium text-right">{selectedRequest.student?.fatherName || '-'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{t('events.code')}:</span>
                      <span className="text-sm font-medium text-right">{selectedRequest.student?.studentCode || selectedRequest.student?.admissionNo || '-'}</span>
                    </div>
                    {(selectedRequest.student?.guardianName || selectedRequest.student?.guardianPhone) && (
                      <div className="pt-2 border-t space-y-2">
                        {selectedRequest.student?.guardianName && (
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-muted-foreground">{t('students.guardian')}:</span>
                            <span className="text-sm text-right">{selectedRequest.student.guardianName}</span>
                          </div>
                        )}
                        {selectedRequest.student?.guardianPhone && (
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-muted-foreground">{t('common.phone')}:</span>
                            <span className="text-sm text-right">{selectedRequest.student.guardianPhone}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Leave Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('events.dates')} & {t('leave.leaveType')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {canEditLeaveRequestDates(selectedRequest.status) ? (
                      <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t('events.startDate')}</Label>
                            <CalendarDatePicker
                              date={editStartDate ? parseLocalDate(editStartDate) : undefined}
                              onDateChange={(date) => setEditStartDate(date ? dateToLocalYYYYMMDD(date) : '')}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('events.endDate')}</Label>
                            <CalendarDatePicker
                              date={editEndDate ? parseLocalDate(editEndDate) : undefined}
                              onDateChange={(date) => setEditEndDate(date ? dateToLocalYYYYMMDD(date) : '')}
                              minDate={editStartDate ? parseLocalDate(editStartDate) : undefined}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={handleSaveDates}
                          disabled={updateLeave.isPending}
                        >
                          {updateLeave.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Calendar className="h-4 w-4" />
                          )}
                          {t('common.save')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">{t('events.startDate')}:</span>
                          <span className="text-sm font-medium text-right">{formatDate(selectedRequest.startDate)}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">{t('events.endDate')}:</span>
                          <span className="text-sm font-medium text-right">{formatDate(selectedRequest.endDate)}</span>
                        </div>
                      </>
                    )}
                    {selectedRequest.startTime && selectedRequest.endTime && (
                      <>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">{t('leave.startTime')}:</span>
                          <span className="text-sm font-medium text-right">{selectedRequest.startTime}</span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-muted-foreground">{t('leave.endTime')}:</span>
                          <span className="text-sm font-medium text-right">{selectedRequest.endTime}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-muted-foreground">{t('leave.leaveType')}:</span>
                      <Badge variant="outline" className="text-xs">
                        {t(`leave.${selectedRequest.leaveType === 'full_day' ? 'fullDay' : selectedRequest.leaveType === 'partial_day' ? 'partialDay' : 'timeBound'}`)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('events.status')}:</span>
                      <Badge variant="outline" className={statusColors[selectedRequest.status] || ''}>
                        {t(`leave.${selectedRequest.status}`)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Class */}
                {selectedRequest.className && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t('search.class')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">{t('search.class')}:</span>
                        <span className="text-sm font-medium text-right">{selectedRequest.className}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Reason */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t('leave.reason')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedRequest.reason}</p>
                  </CardContent>
                </Card>

                {/* Approval Note */}
                {selectedRequest.approvalNote && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('leave.approvalNote')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{selectedRequest.approvalNote}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                {selectedRequest.status === 'pending' && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t('events.actions')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="panel-approval-note">{t('leave.approvalNote')} <span className="text-muted-foreground text-xs font-normal">({t('events.optional')})</span></Label>
                        <Textarea 
                          id="panel-approval-note"
                          value={panelApprovalNote} 
                          onChange={e => setPanelApprovalNote(e.target.value)} 
                          placeholder={t('leave.approvalNotePlaceholder')} 
                          className="min-h-[80px]"
                          dir={isRTL ? 'rtl' : 'ltr'}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={() => handleApprove(selectedRequest)} 
                          disabled={approveLeave.isPending}
                          className="w-full"
                          variant="default"
                        >
                          {approveLeave.isPending ? (
                            <>
                              <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {t('events.processing')}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {t('status.approved')}
                            </>
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleReject(selectedRequest)} 
                          disabled={rejectLeave.isPending}
                          className="w-full"
                          variant="destructive"
                        >
                          {rejectLeave.isPending ? (
                            <>
                              <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {t('events.processing')}
                            </>
                          ) : (
                            <>
                              <X className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {t('leave.rejected')}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Student History Panel */}
      <Sheet open={historyOpen} onOpenChange={(open) => { setHistoryOpen(open); if (!open) setHistoryStudent(null); }}>
        <SheetContent 
          className="w-full sm:w-[460px]"
        >
          <SheetHeader>
            <SheetTitle className={`flex items-center gap-2 text-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <UserRound className="h-4 w-4 text-slate-500" />
              {historyStudent?.name || t('leave.studentLeaveHistory')}
            </SheetTitle>
            <SheetDescription>
              {historyStudent?.code ? `${historyStudent.code} · ${historyStudent.className || t('search.class')}` : t('leave.viewLeaveTrend')}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('leave.totalLeaves')}</CardDescription>
                <CardTitle className="text-2xl">{historySummary.counts.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('status.approved')}</CardDescription>
                <CardTitle className="text-2xl text-green-600">{historySummary.counts.approved}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={statusColors.pending}>{t('leave.pending')} {historySummary.counts.pending}</Badge>
            <Badge variant="outline" className={statusColors.rejected}>{t('leave.rejected')} {historySummary.counts.rejected}</Badge>
            <Badge variant="outline" className={statusColors.cancelled}>{t('leave.cancelled')} {historySummary.counts.cancelled}</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t('leave.monthlyVolume')}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(historySummary.byMonth).map(([month, count]) => (
                <div key={month} className={`rounded-lg border px-3 py-2 text-sm flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                  <span>{month}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {!Object.keys(historySummary.byMonth).length && (
                <div className="text-sm text-slate-500">{t('leave.noHistoryYet')}</div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t('leave.allLeaves')}</p>
            <ScrollArea className={`h-[340px] ${isRTL ? 'pl-2' : 'pr-2'}`}>
              <div className="space-y-2">
                {historyLoading && <div className="text-sm text-slate-500">{t('leave.loadingHistory')}</div>}
                {!historyLoading && (historyData || []).map(entry => (
                  <div key={entry.id} className="rounded-lg border px-3 py-2">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                      <div>
                        <p className="font-medium text-sm">{formatDate(entry.startDate)} → {formatDate(entry.endDate)}</p>
                        <p className="text-xs text-slate-500">{entry.reason}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[entry.status] || ''}>{t(`leave.${entry.status}`)}</Badge>
                    </div>
                  </div>
                ))}
                {!historyLoading && !(historyData || []).length && (
                  <div className="text-sm text-slate-500">{t('leave.noLeaveHistoryFound')}</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
