import { format } from 'date-fns';
import {
  Plus,
  Calendar,
  Users,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Lock,
  AlertCircle,
  Heart,
  FileText,
  BarChart3,
  ClipboardList,
  Save,
  ScanLine,
  Search,
  History,
  Activity,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useCourseAttendanceSessions,
  useCourseAttendanceSession,
  useCreateCourseAttendanceSession,
  useDeleteCourseAttendanceSession,
  useCourseRoster,
  useMarkCourseAttendanceRecords,
  useScanCourseAttendance,
  useCourseAttendanceScans,
  useCloseCourseAttendanceSession,
  useCourseAttendanceSessionReport,
  useCourseAttendanceCourseReport,
  CourseAttendanceSession,
  CourseRosterStudent,
} from '@/hooks/useCourseAttendance';
import { SessionReportTable } from '@/components/course-attendance/SessionReportTable';
import { CourseReportTable } from '@/components/course-attendance/CourseReportTable';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';

interface AttendanceRecord {
  courseStudentId: string;
  status: AttendanceStatus;
  note?: string;
}

export default function CourseAttendance() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'manual' | 'barcode'>('manual');
  const [scanCardNumber, setScanCardNumber] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());
  const [mainTab, setMainTab] = useState<'create' | 'mark' | 'session-report' | 'course-report'>('create');
  const [reportSessionId, setReportSessionId] = useState<string | null>(null);
  const [courseReportStatus, setCourseReportStatus] = useState<'enrolled' | 'completed' | 'dropped' | 'failed' | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [scanFeedSearch, setScanFeedSearch] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [isSessionSelectOpen, setIsSessionSelectOpen] = useState(false);
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Session creation form state
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionMethod, setSessionMethod] = useState<'manual' | 'barcode'>('manual');
  const [sessionRemarks, setSessionRemarks] = useState('');

  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [studentCache, setStudentCache] = useState<Map<string, any>>(new Map());

  const { data: courses = [] } = useShortTermCourses();
  const { data: sessions = [], isLoading: sessionsLoading } = useCourseAttendanceSessions(selectedCourseId || undefined);
  const { data: currentSession } = useCourseAttendanceSession(selectedSessionId || '');
  const { data: roster = [], isLoading: rosterLoading } = useCourseRoster(selectedCourseId || undefined);
  const { data: scanFeed = [] } = useCourseAttendanceScans(selectedSessionId || '', 30);
  const { data: sessionReport = [], isLoading: sessionReportLoading } = useCourseAttendanceSessionReport(reportSessionId);
  const { data: courseReport = [], isLoading: courseReportLoading } = useCourseAttendanceCourseReport({
    courseId: selectedCourseId || undefined,
    completionStatus: courseReportStatus === 'all' ? undefined : courseReportStatus,
  });

  const createSession = useCreateCourseAttendanceSession();
  const deleteSession = useDeleteCourseAttendanceSession();
  const markRecords = useMarkCourseAttendanceRecords();
  const scanAttendance = useScanCourseAttendance();
  const closeSession = useCloseCourseAttendanceSession();

  // Filter and sort sessions: prioritize today and yesterday, but show all open sessions
  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Filter to only open sessions
    const allOpenSessions = sessions.filter((item) => item.status === 'open');
    
    // Sort: today first (most recent first within today), then yesterday, then others (most recent first)
    return allOpenSessions.sort((a, b) => {
      const dateA = new Date(a.session_date);
      dateA.setHours(0, 0, 0, 0);
      const dateB = new Date(b.session_date);
      dateB.setHours(0, 0, 0, 0);
      
      const aIsToday = dateA.getTime() === today.getTime();
      const aIsYesterday = dateA.getTime() === yesterday.getTime();
      const bIsToday = dateB.getTime() === today.getTime();
      const bIsYesterday = dateB.getTime() === yesterday.getTime();
      
      // Today sessions first
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      // If both are today, sort by creation time (most recent first)
      if (aIsToday && bIsToday) {
        const timeA = new Date(a.session_date).getTime();
        const timeB = new Date(b.session_date).getTime();
        return timeB - timeA; // Most recent first
      }
      
      // Yesterday sessions second
      if (aIsYesterday && !bIsYesterday && !bIsToday) return -1;
      if (!aIsYesterday && bIsYesterday && !aIsToday) return 1;
      
      // Then sort by date (most recent first)
      return dateB.getTime() - dateA.getTime();
    });
  }, [sessions]);

  // Searchable filtered sessions
  const searchableSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return filteredSessions;
    
    const term = sessionSearchTerm.trim().toLowerCase();
    return filteredSessions.filter((item) => {
      const title = item.session_title || '';
      const dateStr = formatDate(item.session_date).toLowerCase();
      const method = item.method === 'manual' ? t('courses.attendance.manual') : t('courses.attendance.barcode');
      
      return (
        title.toLowerCase().includes(term) ||
        dateStr.includes(term) ||
        method.toLowerCase().includes(term)
      );
    });
  }, [filteredSessions, sessionSearchTerm, t]);

  // Attendance options
  const attendanceOptions = useMemo(() => ([
    { value: 'present', label: t('courses.attendance.present'), icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
    { value: 'absent', label: t('courses.attendance.absent'), icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
    { value: 'late', label: t('courses.attendance.late'), icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
    { value: 'excused', label: t('courses.attendance.excused'), icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
    { value: 'sick', label: t('courses.attendance.sick'), icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
    { value: 'leave', label: t('courses.attendance.leave'), icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
  ]), [t]);

  const orderedRoster = useMemo(() => {
    if (!roster) return [];
    let filtered = roster.slice();
    
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(student => 
        student.full_name.toLowerCase().includes(term) ||
        student.admission_no.toLowerCase().includes(term) ||
        (student.card_number && student.card_number.toLowerCase().includes(term))
      );
    }
    
    return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [roster, searchTerm]);

  const filteredScanFeed = useMemo(() => {
    if (!scanFeed) return [];
    if (!scanFeedSearch.trim()) return scanFeed;
    
    const term = scanFeedSearch.trim().toLowerCase();
    return scanFeed.filter(record => 
      record.course_student?.full_name?.toLowerCase().includes(term) ||
      record.course_student?.admission_no?.toLowerCase().includes(term) ||
      (record.course_student?.card_number && record.course_student.card_number.toLowerCase().includes(term))
    );
  }, [scanFeed, scanFeedSearch]);

  // Status badge component
  const StatusBadge = ({ status }: { status: AttendanceStatus }) => {
    const option = attendanceOptions.find(opt => opt.value === status);
    if (!option) return null;
    const Icon = option.icon;
    return (
      <Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium`}>
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Badge>
    );
  };

  // Get status badge function (returns JSX)
  const getStatusBadge = (status: AttendanceStatus) => {
    const option = attendanceOptions.find(opt => opt.value === status);
    if (!option) return <Badge variant="outline">{status}</Badge>;
    const Icon = option.icon;
    return (
      <Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium w-fit`}>
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Badge>
    );
  };

  // Focus barcode input when in barcode mode
  useEffect(() => {
    if (attendanceMode === 'barcode' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [attendanceMode, selectedSessionId]);

  // Cache students when roster is loaded
  useEffect(() => {
    if (roster && roster.length > 0) {
      const cache = new Map<string, any>();
      roster.forEach((student) => {
        if (student.card_number) {
          cache.set(student.card_number, student);
        }
        if (student.admission_no) {
          cache.set(student.admission_no, student);
        }
      });
      setStudentCache(cache);
    }
  }, [roster]);

  // Initialize attendance records from existing session data
  useEffect(() => {
    if (currentSession?.records) {
      const recordsMap = new Map<string, AttendanceRecord>();
      currentSession.records.forEach((record) => {
        recordsMap.set(record.course_student_id, {
          courseStudentId: record.course_student_id,
          status: record.status,
          note: record.note || undefined,
        });
      });
      setAttendanceRecords(recordsMap);
    }
  }, [currentSession]);

  const handleCreateSession = async () => {
    if (!selectedCourseId || !sessionDate) {
      showToast.error(t('courses.attendance.selectCourseAndDate') || 'Please select a course and date');
      return;
    }

    try {
      const created = await createSession.mutateAsync({
        course_id: selectedCourseId,
        session_date: sessionDate,
        session_title: sessionTitle || null,
        method: sessionMethod,
        remarks: sessionRemarks || undefined,
      });
      
      // Reset form
      setSessionTitle('');
      setSessionRemarks('');
      setSessionDate(format(new Date(), 'yyyy-MM-dd'));
      setSessionMethod('manual');
      
      // Switch to mark tab and select the new session
      setMainTab('mark');
      setSelectedSessionId(created.id);
      showToast.success(t('toast.courseAttendance.sessionCreated') || 'Session created successfully');
    } catch (error: any) {
      showToast.error(error.message || t('events.error'));
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    await deleteSession.mutateAsync(sessionToDelete);
    if (selectedSessionId === sessionToDelete) {
      setSelectedSessionId(null);
    }
    setIsDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => {
      const newMap = new Map(prev);
      newMap.set(studentId, { courseStudentId: studentId, status });
      return newMap;
    });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!roster) return;
    const newMap = new Map<string, AttendanceRecord>();
    roster.forEach((student) => {
      newMap.set(student.id, { courseStudentId: student.id, status });
    });
    setAttendanceRecords(newMap);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId || !roster || roster.length === 0) {
      showToast.error(t('courses.attendance.sessionRequired') || 'Please select a session');
      return;
    }
    
    // Build records for all students in roster
    // Use existing records if available, otherwise default to 'absent'
    const apiRecords = roster.map(student => {
      const existingRecord = attendanceRecords.get(student.id);
      return {
        course_student_id: student.id,
        status: existingRecord?.status || 'absent',
        note: existingRecord?.note || null,
      };
    });
    
    if (apiRecords.length === 0) {
      showToast.error(t('courses.attendance.recordsRequired') || 'No records to save');
      return;
    }
    
    try {
      await markRecords.mutateAsync({ sessionId: selectedSessionId, records: apiRecords });
      showToast.success(t('courses.attendance.attendanceSaved') || 'Attendance saved successfully');
    } catch (error: any) {
      showToast.error(error.message || t('events.error'));
    }
  };

  const handleScanSubmit = async () => {
    if (!scanCardNumber.trim()) {
      setScanError(t('courses.attendance.scanPrompt') || 'Please enter a card number');
      setTimeout(() => setScanError(null), 2000);
      return;
    }
    
    const scannedValue = scanCardNumber.trim();
    setScanError(null);
    
    const foundStudent = studentCache.get(scannedValue);
    if (!foundStudent && roster && roster.length > 0) {
      setScanError(t('leave.studentNotFound') || 'Student not found');
      setTimeout(() => setScanError(null), 2000);
      setScanCardNumber('');
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
      return;
    }
    
    setScanCardNumber('');
    
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
    
    scanAttendance.mutate(
      { sessionId: selectedSessionId!, code: scannedValue, note: scanNote || undefined },
      {
        onSuccess: (result) => {
          setLastScanId((result as any)?.id || null);
          setTimeout(() => setLastScanId(null), 3000);
          setScanNote('');
        },
        onError: (error: any) => {
          setScanError(error.message || t('events.error') || 'Failed to scan');
          setTimeout(() => setScanError(null), 2000);
        },
      }
    );
  };

  const handleCloseSession = async () => {
    if (!selectedSessionId) return;
    try {
      await closeSession.mutateAsync(selectedSessionId);
      setSelectedSessionId(null);
      showToast.success(t('courses.attendance.sessionClosed') || 'Session closed successfully');
    } catch (error: any) {
      showToast.error(error.message || t('events.error'));
    }
  };

  // Auto-select session: first check query param, then auto-select latest today session
  useEffect(() => {
    if (!sessions || sessions.length === 0 || sessionsLoading) return;
    
    // First priority: session from query param
    const sessionIdFromParam = searchParams.get('session');
    if (sessionIdFromParam) {
      const foundSession = sessions.find(s => s.id === sessionIdFromParam);
      if (foundSession && selectedSessionId !== sessionIdFromParam) {
        setSelectedSessionId(sessionIdFromParam);
        setMainTab('mark');
        return;
      }
    }
    
    // Second priority: auto-select latest today session if no session is selected
    const hasValidSelection = selectedSessionId && filteredSessions.some(s => s.id === selectedSessionId);
    if (!hasValidSelection && filteredSessions.length > 0 && mainTab === 'mark') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find the latest today session
      const todaySessions = filteredSessions.filter((item) => {
        const sessionDate = new Date(item.session_date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      
      if (todaySessions.length > 0) {
        const latestTodaySessionId = todaySessions[0].id;
        if (selectedSessionId !== latestTodaySessionId) {
          setSelectedSessionId(latestTodaySessionId);
        }
        return;
      }
      
      // Fallback: select the first (most recent) session if no today session exists
      const firstSessionId = filteredSessions[0].id;
      if (selectedSessionId !== firstSessionId) {
        setSelectedSessionId(firstSessionId);
      }
    }
  }, [searchParams, sessions, filteredSessions, sessionsLoading, selectedSessionId, mainTab]);

  // Initialize attendance records from existing session data
  useEffect(() => {
    if (currentSession?.records) {
      const recordsMap = new Map<string, AttendanceRecord>();
      currentSession.records.forEach((record) => {
        recordsMap.set(record.course_student_id, {
          courseStudentId: record.course_student_id,
          status: record.status,
          note: record.note || undefined,
        });
      });
      setAttendanceRecords(recordsMap);
    }
  }, [currentSession]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl overflow-x-hidden">
      {/* Course Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">{t('events.selectCourse')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedSessionId(null); }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('events.selectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourseId && (
        <>
          {/* Main Tabs */}
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
                <TabsList className="grid w-full grid-cols-3 mb-4 md:mb-6">
                  <TabsTrigger value="mark" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{t('courses.attendance.markAttendance')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="session-report" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{t('courses.attendance.sessionReport') || 'Session Report'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="course-report" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <BarChart3 className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{t('courses.attendance.courseReport') || 'Course Report'}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Mark Attendance Tab */}
                <TabsContent value="mark" className="space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Sessions List */}
                    <Card className="lg:col-span-1">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base md:text-lg">{t('courses.sessions')}</CardTitle>
                        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="flex-shrink-0">
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">{t('events.add')}</span>
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {sessionsLoading ? (
                          <p className="text-muted-foreground">{t('common.loading')}</p>
                        ) : sessions.length === 0 ? (
                          <p className="text-muted-foreground">{t('courses.attendance.noSessionsYet')}</p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((session) => {
                              // Calculate additional stats from records if available
                              const records = session.records || [];
                              const totalStudents = session.records_count || records.length || 0;
                              const presentCount = session.present_count || records.filter(r => r.status === 'present').length || 0;
                              const absentCount = session.absent_count || records.filter(r => r.status === 'absent').length || 0;
                              const lateCount = records.filter(r => r.status === 'late').length || 0;
                              const excusedCount = records.filter(r => r.status === 'excused').length || 0;
                              const sickCount = records.filter(r => r.status === 'sick').length || 0;
                              const leaveCount = records.filter(r => r.status === 'leave').length || 0;
                              
                              // Get method display
                              const methodDisplay = session.method === 'manual' 
                                ? t('courses.attendance.manual')
                                : session.method === 'barcode'
                                ? t('courses.attendance.barcode')
                                : t('courses.attendance.mixed');

                              return (
                                <div
                                  key={session.id}
                                  className={`p-3 md:p-4 border rounded-lg cursor-pointer transition-colors touch-manipulation ${
                                    selectedSessionId === session.id ? 'border-primary bg-primary/5' : 'hover:bg-muted active:bg-muted/80'
                                  }`}
                                  onClick={() => setSelectedSessionId(session.id)}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-sm md:text-base">
                                          {formatDate(session.session_date)}
                                        </p>
                                        <Badge variant="outline" className="text-xs">
                                          {session.method === 'manual' ? (
                                            <Users className="h-3 w-3 mr-1" />
                                          ) : session.method === 'barcode' ? (
                                            <QrCode className="h-3 w-3 mr-1" />
                                          ) : (
                                            <Activity className="h-3 w-3 mr-1" />
                                          )}
                                          <span className="hidden sm:inline">{methodDisplay}</span>
                                          <span className="sm:hidden">
                                            {session.method === 'manual' ? 'M' : session.method === 'barcode' ? 'B' : 'MX'}
                                          </span>
                                        </Badge>
                                      </div>
                                      {session.session_title && (
                                        <p className="text-xs md:text-sm text-muted-foreground truncate mb-2">{session.session_title}</p>
                                      )}
                                      
                                      {/* Total Students */}
                                      <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span className="font-medium">{totalStudents || 0}</span>
                                        <span>{t('courses.attendance.students') || 'students'}</span>
                                      </div>

                                      {/* Attendance Stats */}
                                      {(presentCount > 0 || absentCount > 0 || lateCount > 0 || excusedCount > 0 || sickCount > 0 || leaveCount > 0) ? (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {presentCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 px-2 py-0.5 rounded font-medium">
                                              <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                              {presentCount}
                                            </span>
                                          )}
                                          {absentCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                                              <XCircle className="h-3 w-3 flex-shrink-0" />
                                              {absentCount}
                                            </span>
                                          )}
                                          {lateCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded font-medium">
                                              <Clock className="h-3 w-3 flex-shrink-0" />
                                              {lateCount}
                                            </span>
                                          )}
                                          {excusedCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-medium">
                                              <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                              {excusedCount}
                                            </span>
                                          )}
                                          {sickCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded font-medium">
                                              <Heart className="h-3 w-3 flex-shrink-0" />
                                              {sickCount}
                                            </span>
                                          )}
                                          {leaveCount > 0 && (
                                            <span className="flex items-center gap-1 text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded font-medium">
                                              <Calendar className="h-3 w-3 flex-shrink-0" />
                                              {leaveCount}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-muted-foreground mt-2 italic">
                                          {session.status === 'open' 
                                            ? t('courses.attendance.noRecordsYet') || 'No attendance marked yet'
                                            : t('courses.attendance.noRecords') || 'No records'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                      <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                                        <span className="hidden sm:inline">
                                          {session.status === 'open' ? t('courses.attendance.open') : t('courses.attendance.closed')}
                                        </span>
                                        <span className="sm:hidden">
                                          {session.status === 'open' ? t('courses.attendance.open').charAt(0) : t('courses.attendance.closed').charAt(0)}
                                        </span>
                                      </Badge>
                                      {/* Only show delete button for open sessions */}
                                      {session.status === 'open' && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSessionToDelete(session.id);
                                            setIsDeleteDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Attendance Taking */}
                    <Card className="lg:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base md:text-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <span className="text-sm md:text-base">
                            {selectedSessionId ? t('courses.attendance.markAttendance') : t('courses.attendance.selectSession')}
                          </span>
                          {selectedSessionId && currentSession?.status === 'open' && (
                            <Button variant="outline" size="sm" onClick={handleCloseSession} className="w-full sm:w-auto">
                              <Lock className="h-4 w-4 mr-1.5" />
                              <span className="text-xs md:text-sm">{t('courses.attendance.closeSession')}</span>
                            </Button>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!selectedSessionId ? (
                          <p className="text-muted-foreground text-center py-8">
                            {t('courses.attendance.selectSessionToMark')}
                          </p>
                        ) : currentSession?.status === 'closed' ? (
                          <div className="text-center py-8">
                            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">{t('courses.attendance.sessionClosed')}</p>
                          </div>
                        ) : (
                          <Tabs value={attendanceMode} onValueChange={(v) => setAttendanceMode(v as 'manual' | 'barcode')}>
                            <TabsList className="mb-4 w-full grid grid-cols-2">
                              <TabsTrigger value="manual" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                                <Users className="h-4 w-4 flex-shrink-0" />
                                <span>{t('courses.attendance.manual')}</span>
                              </TabsTrigger>
                              <TabsTrigger value="barcode" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                                <QrCode className="h-4 w-4 flex-shrink-0" />
                                <span>{t('courses.attendance.barcode')}</span>
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="manual" className="space-y-4">
                              {/* Search and Quick Actions */}
                              <div className="space-y-3">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={t('courses.attendance.searchStudents') || 'Search students...'}
                                    className="pl-9"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')} className="flex-1 sm:flex-none">
                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                    <span className="text-xs md:text-sm">{t('courses.attendance.markAllPresent')}</span>
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')} className="flex-1 sm:flex-none">
                                    <XCircle className="h-4 w-4 mr-1.5" />
                                    <span className="text-xs md:text-sm">{t('courses.attendance.markAllAbsent')}</span>
                                  </Button>
                                </div>
                              </div>

                              {/* Mobile: Card Layout, Desktop: Table Layout */}
                              <div className="border rounded-lg max-h-[60vh] md:max-h-96 overflow-y-auto">
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t('courses.attendance.student')}</TableHead>
                                        <TableHead>{t('courses.attendance.cardNumber')}</TableHead>
                                        <TableHead>{t('courses.attendance.status')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {rosterLoading ? (
                                        <TableRow>
                                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            {t('courses.attendance.loadingStudents')}
                                          </TableCell>
                                        </TableRow>
                                      ) : orderedRoster.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                            {t('courses.attendance.noEnrolledStudents')}
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        orderedRoster.map((student) => {
                                          const record = attendanceRecords.get(student.id);
                                          return (
                                            <TableRow key={student.id}>
                                              <TableCell>
                                                <div>
                                                  <p className="font-medium">{student.full_name}</p>
                                                  <p className="text-sm text-muted-foreground">{student.father_name}</p>
                                                </div>
                                              </TableCell>
                                              <TableCell>{student.card_number || student.admission_no || '-'}</TableCell>
                                              <TableCell>
                                                <Select
                                                  value={record?.status || 'absent'}
                                                  onValueChange={(v) => handleStatusChange(student.id, v as AttendanceStatus)}
                                                >
                                                  <SelectTrigger className="w-40">
                                                    <SelectValue>
                                                      {record?.status ? (
                                                        getStatusBadge(record.status)
                                                      ) : (
                                                        getStatusBadge('absent')
                                                      )}
                                                    </SelectValue>
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {attendanceOptions.map(option => {
                                                      const Icon = option.icon;
                                                      return (
                                                        <SelectItem key={option.value} value={option.value}>
                                                          <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            {option.label}
                                                          </div>
                                                        </SelectItem>
                                                      );
                                                    })}
                                                  </SelectContent>
                                                </Select>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-2 p-2">
                                  {rosterLoading ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                      {t('courses.attendance.loadingStudents')}
                                    </div>
                                  ) : orderedRoster.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                      {t('courses.attendance.noEnrolledStudents')}
                                    </div>
                                  ) : (
                                    orderedRoster.map((student) => {
                                      const record = attendanceRecords.get(student.id);
                                      return (
                                        <Card key={student.id} className="p-3">
                                          <div className="space-y-3">
                                            <div>
                                              <p className="font-medium text-sm">{student.full_name}</p>
                                              {student.father_name && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{student.father_name}</p>
                                              )}
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {t('courses.attendance.cardNumber')}: {student.card_number || student.admission_no || '-'}
                                              </p>
                                            </div>
                                            <Select
                                              value={record?.status || 'absent'}
                                              onValueChange={(v) => handleStatusChange(student.id, v as AttendanceStatus)}
                                            >
                                              <SelectTrigger className="w-full">
                                                <SelectValue>
                                                  {record?.status ? (
                                                    getStatusBadge(record.status)
                                                  ) : (
                                                    getStatusBadge('absent')
                                                  )}
                                                </SelectValue>
                                              </SelectTrigger>
                                              <SelectContent>
                                                {attendanceOptions.map(option => {
                                                  const Icon = option.icon;
                                                  return (
                                                    <SelectItem key={option.value} value={option.value}>
                                                      <div className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4" />
                                                        {option.label}
                                                      </div>
                                                    </SelectItem>
                                                  );
                                                })}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </Card>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <Button 
                                onClick={handleSaveAttendance} 
                                disabled={markRecords.isPending}
                                className="w-full sm:w-auto"
                                size="lg"
                              >
                                <Save className="h-4 w-4 mr-2" />
                                {markRecords.isPending ? t('courses.attendance.saving') : t('courses.attendance.saveAttendance')}
                              </Button>
                            </TabsContent>

                            <TabsContent value="barcode" className="space-y-4">
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-sm md:text-base">{t('courses.attendance.scanBarcodeOrCard')}</Label>
                                  <div className="relative">
                                    <QrCode className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      ref={scanInputRef}
                                      value={scanCardNumber}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        setScanCardNumber(value);
                                        setScanError(null);
                                        // Auto-submit when barcode scanner adds Enter/newline (fast scanning)
                                        if (value.includes('\n') || value.includes('\r')) {
                                          const cleanValue = value.replace(/[\n\r]/g, '').trim();
                                          if (cleanValue) {
                                            setScanCardNumber(cleanValue);
                                            setTimeout(() => handleScanSubmit(), 0);
                                          }
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleScanSubmit();
                                        }
                                      }}
                                      placeholder={t('events.scanCardNumber')}
                                      className="text-base md:text-lg pl-9 h-12 md:h-10"
                                      autoFocus
                                    />
                                  </div>
                                  {scanError && (
                                    <p className="text-sm text-destructive animate-in fade-in">{scanError}</p>
                                  )}
                                  {lastScanId && (
                                    <p className="text-sm text-green-600 animate-in fade-in flex items-center gap-1.5">
                                      <CheckCircle2 className="h-4 w-4" />
                                      {t('courses.attendance.scanSuccess') || 'Scan successful!'}
                                    </p>
                                  )}
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    {t('courses.attendance.scanInstructions')}
                                  </p>
                                </div>

                                {/* Search for scan feed */}
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={scanFeedSearch}
                                    onChange={(e) => setScanFeedSearch(e.target.value)}
                                    placeholder={t('courses.attendance.searchScans') || 'Search recent scans...'}
                                    className="pl-9"
                                  />
                                </div>
                              </div>

                              <div className="border rounded-lg">
                                <div className="p-3 border-b bg-muted">
                                  <h4 className="font-medium text-sm md:text-base">{t('courses.attendance.recentScans')}</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {filteredScanFeed.length === 0 ? (
                                    <p className="p-4 text-muted-foreground text-center text-sm">{t('courses.attendance.noScansYet')}</p>
                                  ) : (
                                    <div className="divide-y">
                                      {filteredScanFeed.map((scan) => (
                                        <div key={scan.id} className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm md:text-base truncate">{scan.course_student?.full_name}</p>
                                            <p className="text-xs md:text-sm text-muted-foreground">
                                              {scan.marked_at && formatDate(scan.marked_at)}
                                            </p>
                                          </div>
                                          <div className="flex-shrink-0">
                                            {getStatusBadge(scan.status)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Session Report Tab */}
                <TabsContent value="session-report" className="space-y-4 md:space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg">{t('courses.attendance.sessionReport') || 'Session Report'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm md:text-base">{t('courses.attendance.selectSession') || 'Select Session'}</Label>
                        <Select
                          value={reportSessionId || ''}
                          onValueChange={(value) => setReportSessionId(value || null)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={t('courses.attendance.selectSession') || 'Select a session'} />
                          </SelectTrigger>
                          <SelectContent>
                            {sessions.map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                {formatDate(session.session_date)}
                                {session.session_title && ` - ${session.session_title}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {reportSessionId && (
                        <div className="overflow-x-auto">
                          <SessionReportTable data={sessionReport} isLoading={sessionReportLoading} />
                        </div>
                      )}
                      {!reportSessionId && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm md:text-base">{t('courses.attendance.selectSessionToViewReport') || 'Please select a session to view the report'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Course Report Tab */}
                <TabsContent value="course-report" className="space-y-4 md:space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base md:text-lg">{t('courses.attendance.courseReport') || 'Course Report'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <CourseReportTable
                          data={courseReport}
                          isLoading={courseReportLoading}
                          completionStatus={courseReportStatus}
                          onStatusChange={setCourseReportStatus}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Session Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{t('courses.attendance.createSession')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm md:text-base">{t('courses.attendance.date')}</Label>
              <CalendarDatePicker date={sessionDate ? new Date(sessionDate) : undefined} onDateChange={(date) => setSessionDate(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">{t('courses.attendance.titleOptional')}</Label>
              <Input
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder={t('courses.attendance.titlePlaceholder')}
                className="text-sm md:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">{t('courses.attendance.method')}</Label>
              <Select value={sessionMethod} onValueChange={(v) => setSessionMethod(v as 'manual' | 'barcode')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t('courses.attendance.manual')}</SelectItem>
                  <SelectItem value="barcode">{t('courses.attendance.barcode')}</SelectItem>
                  <SelectItem value="mixed">{t('courses.attendance.mixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateSession} disabled={createSession.isPending} className="w-full sm:w-auto">
              {createSession.isPending ? t('courses.attendance.creating') : t('courses.attendance.createSession')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md w-[95vw] sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">{t('courses.attendance.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm md:text-base">
              {t('courses.attendance.deleteSessionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="w-full sm:w-auto">{t('courses.attendance.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
