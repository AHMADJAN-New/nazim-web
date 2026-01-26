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
      showToast.success(t('courses.attendance.sessionCreated') || 'Session created successfully');
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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('courses.courseAttendance')}</CardTitle>
        </CardHeader>
        <CardContent>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('events.selectCourse')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedSessionId(null); }}>
            <SelectTrigger className="w-full max-w-md">
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
            <CardContent className="pt-6">
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="mark" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('courses.attendance.markAttendance')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="session-report" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('courses.attendance.sessionReport') || 'Session Report'}</span>
                  </TabsTrigger>
                  <TabsTrigger value="course-report" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('courses.attendance.courseReport') || 'Course Report'}</span>
                  </TabsTrigger>
                </TabsList>

                {/* Mark Attendance Tab */}
                <TabsContent value="mark" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sessions List */}
                    <Card className="lg:col-span-1">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">{t('courses.sessions')}</CardTitle>
                        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="flex-shrink-0">
                          <Plus className="h-4 w-4" />
                          <span className="ml-2">{t('events.add')}</span>
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {sessionsLoading ? (
                          <p className="text-muted-foreground">{t('common.loading')}</p>
                        ) : sessions.length === 0 ? (
                          <p className="text-muted-foreground">{t('courses.attendance.noSessionsYet')}</p>
                        ) : (
                          <div className="space-y-2">
                            {sessions.map((session) => (
                              <div
                                key={session.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedSessionId === session.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                                }`}
                                onClick={() => setSelectedSessionId(session.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {formatDate(session.session_date)}
                                    </p>
                                    {session.session_title && (
                                      <p className="text-sm text-muted-foreground">{session.session_title}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                                      {session.status === 'open' ? t('courses.attendance.open') : t('courses.attendance.closed')}
                                    </Badge>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSessionToDelete(session.id);
                                        setIsDeleteDialogOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    {session.present_count || 0}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3 text-red-500" />
                                    {session.absent_count || 0}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Attendance Taking */}
                    <Card className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>
                            {selectedSessionId ? t('courses.attendance.markAttendance') : t('courses.attendance.selectSession')}
                          </span>
                          {selectedSessionId && currentSession?.status === 'open' && (
                            <Button variant="outline" size="sm" onClick={handleCloseSession}>
                              <Lock className="h-4 w-4 mr-1" />
                              {t('courses.attendance.closeSession')}
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
                            <TabsList className="mb-4">
                              <TabsTrigger value="manual">
                                <Users className="h-4 w-4 mr-1" />
                                {t('courses.attendance.manual')}
                              </TabsTrigger>
                              <TabsTrigger value="barcode">
                                <QrCode className="h-4 w-4 mr-1" />
                                {t('courses.attendance.barcode')}
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="manual" className="space-y-4">
                              <div className="flex gap-2 mb-4">
                                <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>
                                  {t('courses.attendance.markAllPresent')}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>
                                  {t('courses.attendance.markAllAbsent')}
                                </Button>
                              </div>

                              <div className="border rounded-lg max-h-96 overflow-y-auto">
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
                                    ) : roster.length === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                          {t('courses.attendance.noEnrolledStudents')}
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      roster.map((student) => {
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

                              <Button onClick={handleSaveAttendance} disabled={markRecords.isPending}>
                                {markRecords.isPending ? t('courses.attendance.saving') : t('courses.attendance.saveAttendance')}
                              </Button>
                            </TabsContent>

                            <TabsContent value="barcode" className="space-y-4">
                              <div className="space-y-2">
                                <Label>{t('courses.attendance.scanBarcodeOrCard')}</Label>
                                <Input
                                  ref={barcodeInputRef}
                                  value={barcodeInput}
                                  onChange={(e) => setBarcodeInput(e.target.value)}
                                  onKeyDown={handleBarcodeScan}
                                  placeholder={t('events.scanCardNumber')}
                                  className="text-lg"
                                  autoFocus
                                />
                                <p className="text-sm text-muted-foreground">
                                  {t('courses.attendance.scanInstructions')}
                                </p>
                              </div>

                              <div className="border rounded-lg">
                                <div className="p-3 border-b bg-muted">
                                  <h4 className="font-medium">{t('courses.attendance.recentScans')}</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                  {recentScans.length === 0 ? (
                                    <p className="p-4 text-muted-foreground text-center">{t('courses.attendance.noScansYet')}</p>
                                  ) : (
                                    <div className="divide-y">
                                      {recentScans.map((scan) => (
                                        <div key={scan.id} className="p-3 flex items-center justify-between">
                                          <div>
                                            <p className="font-medium">{scan.course_student?.full_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                              {scan.marked_at && formatDate(scan.marked_at)}
                                            </p>
                                          </div>
                                          {getStatusBadge(scan.status)}
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
                <TabsContent value="session-report" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('courses.attendance.sessionReport') || 'Session Report'}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('courses.attendance.selectSession') || 'Select Session'}</Label>
                        <Select
                          value={reportSessionId || ''}
                          onValueChange={(value) => setReportSessionId(value || null)}
                        >
                          <SelectTrigger className="w-full max-w-md">
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
                        <SessionReportTable data={sessionReport} isLoading={sessionReportLoading} />
                      )}
                      {!reportSessionId && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>{t('courses.attendance.selectSessionToViewReport') || 'Please select a session to view the report'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Course Report Tab */}
                <TabsContent value="course-report" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('courses.attendance.courseReport') || 'Course Report'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CourseReportTable
                        data={courseReport}
                        isLoading={courseReportLoading}
                        completionStatus={courseReportStatus}
                        onStatusChange={setCourseReportStatus}
                      />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('courses.attendance.createSession')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('courses.attendance.date')}</Label>
              <CalendarDatePicker date={newSessionDate ? new Date(newSessionDate) : undefined} onDateChange={(date) => setNewSessionDate(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div className="space-y-2">
              <Label>{t('courses.attendance.titleOptional')}</Label>
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder={t('courses.attendance.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('courses.attendance.method')}</Label>
              <Select value={newSessionMethod} onValueChange={(v) => setNewSessionMethod(v as any)}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateSession} disabled={createSession.isPending}>
              {createSession.isPending ? t('courses.attendance.creating') : t('courses.attendance.createSession')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.attendance.deleteSession')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('courses.attendance.deleteSessionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>{t('courses.attendance.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
