import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useExam, useExamTimes, useTimeslotStudents, useMarkExamAttendance, useExamAttendanceSummary, useExams, useScanExamAttendance, useExamAttendanceScanFeed, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useExamClasses } from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Check, X, Clock, AlertCircle, UserCheck, Users, ChevronDown, Save, QrCode, ScanLine, Activity, History } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading';
import type { ExamAttendanceStatus, TimeslotStudent } from '@/types/domain/exam';

// Status configuration
const STATUS_CONFIG: Record<ExamAttendanceStatus, { label: string; icon: React.ReactNode; color: string }> = {
  present: { label: 'Present', icon: <Check className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  absent: { label: 'Absent', icon: <X className="h-4 w-4" />, color: 'bg-red-100 text-red-800' },
  late: { label: 'Late', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  excused: { label: 'Excused', icon: <AlertCircle className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
};

interface AttendanceEntry {
  studentId: string;
  status: ExamAttendanceStatus;
  seatNumber?: string;
  notes?: string;
}

export default function ExamAttendancePage() {
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // State for exam selection (when accessed individually)
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  // Determine which exam ID to use: from params (when accessed from exam page) or selected (when accessed individually)
  const examId = examIdFromParams || selectedExamId || undefined;

  // Fetch all exams for selector (only when accessed individually)
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);

  // Set exam from URL params (when accessed from exams page)
  useEffect(() => {
    if (examIdFromParams) {
      // Clear selectedExamId when URL has examId (use URL examId instead)
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  // Auto-select latest exam from current academic year (only when accessed individually, no URL examId)
  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  // State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTimeId, setSelectedTimeId] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [attendanceEntries, setAttendanceEntries] = useState<Map<string, AttendanceEntry>>(new Map());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<ExamAttendanceStatus>('present');
  const [scanCardNumber, setScanCardNumber] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [scanFeedSearch, setScanFeedSearch] = useState('');
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // Queries
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses = [], isLoading: classesLoading } = useExamClasses(examId);
  const { data: examTimes = [], isLoading: timesLoading } = useExamTimes(examId);
  const { data: timeslotData, isLoading: studentsLoading, refetch: refetchStudents } = useTimeslotStudents(examId, selectedTimeId);
  const { data: attendanceSummary } = useExamAttendanceSummary(examId);
  
  // Mutations
  const markAttendance = useMarkExamAttendance();
  const scanAttendance = useScanExamAttendance();
  
  // Scan feed query
  const { data: scanFeed = [], isLoading: scanFeedLoading } = useExamAttendanceScanFeed(examId, selectedTimeId, 30);

  // Filter times by selected class
  const filteredTimes = useMemo(() => {
    if (!selectedClassId || selectedClassId === 'all') return examTimes || [];
    return (examTimes || []).filter((time) => time.examClassId === selectedClassId);
  }, [examTimes, selectedClassId]);

  // Get the selected exam time details
  const selectedExamTime = useMemo(() => {
    return examTimes.find((t) => t.id === selectedTimeId);
  }, [examTimes, selectedTimeId]);

  // Get class name for display
  const getClassName = (classId: string) => {
    const examClass = examClasses.find((c) => c.id === classId);
    if (!examClass?.classAcademicYear) return 'Unknown Class';
    const name = examClass.classAcademicYear.class?.name || 'Class';
    const section = examClass.classAcademicYear.sectionName;
    return section ? `${name} - ${section}` : name;
  };

  // Initialize attendance entries from existing data
  const initializeEntries = () => {
    if (!timeslotData?.students) return;
    const newEntries = new Map<string, AttendanceEntry>();
    timeslotData.students.forEach((student) => {
      newEntries.set(student.studentId, {
        studentId: student.studentId,
        status: student.attendance?.status || 'present',
        seatNumber: student.attendance?.seatNumber || undefined,
        notes: student.attendance?.notes || undefined,
      });
    });
    setAttendanceEntries(newEntries);
  };

  // Handle time selection change
  const handleTimeChange = (timeId: string) => {
    if (timeId && timeId !== 'none') {
      setSelectedTimeId(timeId);
      setSelectedStudents(new Set());
      setAttendanceEntries(new Map());
      setScanCardNumber('');
      setScanNote('');
    } else {
      setSelectedTimeId(undefined);
      setSelectedStudents(new Set());
      setAttendanceEntries(new Map());
      setScanCardNumber('');
      setScanNote('');
    }
  };

  // Auto-focus scan input when time slot is selected
  useEffect(() => {
    if (selectedTimeId && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [selectedTimeId]);

  // Handle scan submission
  const handleScanSubmit = async () => {
    if (!examId || !selectedTimeId || !scanCardNumber.trim()) {
      return;
    }

    try {
      const result = await scanAttendance.mutateAsync({
        examId,
        examTimeId: selectedTimeId,
        cardNumber: scanCardNumber.trim(),
        status: 'present',
        notes: scanNote || null,
      });

      // Set last scan ID for highlighting
      if (result && (result as any).id) {
        setLastScanId((result as any).id);
        setTimeout(() => setLastScanId(null), 3000);
      }

      // Clear input and refocus
      setScanCardNumber('');
      setScanNote('');
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }

      // Refetch students to update attendance
      refetchStudents();
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  // Filter scan feed by search
  const filteredScanFeed = useMemo(() => {
    if (!scanFeed || scanFeed.length === 0) return [];
    const search = scanFeedSearch.toLowerCase();
    if (!search) return scanFeed;
    return scanFeed.filter((record) => {
      const student = (record as any).student;
      return (
        student?.fullName?.toLowerCase().includes(search) ||
        student?.admissionNo?.toLowerCase().includes(search) ||
        student?.cardNumber?.toLowerCase().includes(search)
      );
    });
  }, [scanFeed, scanFeedSearch]);

  // Handle student selection
  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSelected = new Set(selectedStudents);
    if (checked) {
      newSelected.add(studentId);
    } else {
      newSelected.delete(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && timeslotData?.students) {
      setSelectedStudents(new Set(timeslotData.students.map((s) => s.studentId)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  // Update single student status
  const updateStudentStatus = (studentId: string, status: ExamAttendanceStatus) => {
    const newEntries = new Map(attendanceEntries);
    const existing = newEntries.get(studentId) || { studentId, status: 'present' };
    newEntries.set(studentId, { ...existing, status });
    setAttendanceEntries(newEntries);
  };

  // Update single student seat number
  const updateStudentSeatNumber = (studentId: string, seatNumber: string) => {
    const newEntries = new Map(attendanceEntries);
    const existing = newEntries.get(studentId) || { studentId, status: 'present' };
    newEntries.set(studentId, { ...existing, seatNumber: seatNumber || undefined });
    setAttendanceEntries(newEntries);
  };

  // Apply bulk status to selected students
  const applyBulkStatus = () => {
    const newEntries = new Map(attendanceEntries);
    selectedStudents.forEach((studentId) => {
      const existing = newEntries.get(studentId) || { studentId, status: 'present' };
      newEntries.set(studentId, { ...existing, status: bulkStatus });
    });
    setAttendanceEntries(newEntries);
    setBulkStatusDialogOpen(false);
    setSelectedStudents(new Set());
  };

  // Mark all as a specific status
  const markAllAs = (status: ExamAttendanceStatus) => {
    if (!timeslotData?.students) return;
    const newEntries = new Map<string, AttendanceEntry>();
    timeslotData.students.forEach((student) => {
      const existing = attendanceEntries.get(student.studentId);
      newEntries.set(student.studentId, {
        studentId: student.studentId,
        status,
        seatNumber: existing?.seatNumber,
        notes: existing?.notes,
      });
    });
    setAttendanceEntries(newEntries);
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    if (!examId || !selectedTimeId || attendanceEntries.size === 0) return;

    const attendances = Array.from(attendanceEntries.values()).map((entry) => ({
      studentId: entry.studentId,
      status: entry.status,
      seatNumber: entry.seatNumber ?? null,
      notes: entry.notes ?? null,
    }));

    await markAttendance.mutateAsync({
      examId,
      examTimeId: selectedTimeId,
      attendances,
    });

    // Refetch students to get updated attendance
    refetchStudents();
  };

  // Check if attendance can be marked
  const canMarkAttendance = exam && ['scheduled', 'in_progress'].includes(exam.status);

  // Loading state
  if (examLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Not found state
  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Exam not found</h2>
        <Button variant="outline" onClick={() => navigate('/exams')} className="mt-4">
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          Back to Exams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {examIdFromParams ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              Back
            </Button>
          ) : (
            <div className="w-64">
              <Select
                value={selectedExamId || undefined}
                onValueChange={(value) => setSelectedExamId(value === 'all' ? undefined : value)}
                disabled={examsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(allExams || []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{t('exams.attendance.title') || 'Exam Attendance'}</h1>
            <p className="text-muted-foreground">{exam.name}</p>
          </div>
        </div>
        <Badge variant={canMarkAttendance ? 'default' : 'secondary'}>
          {exam.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      {/* Summary Cards */}
      {attendanceSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Enrolled Students</CardDescription>
              <CardTitle className="text-2xl">{attendanceSummary.totals.enrolledStudents}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Present</CardDescription>
              <CardTitle className="text-2xl text-green-600">{attendanceSummary.totals.present}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Absent</CardDescription>
              <CardTitle className="text-2xl text-red-600">{attendanceSummary.totals.absent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Late / Excused</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {attendanceSummary.totals.late + attendanceSummary.totals.excused}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('exams.attendance.selectTimeslot') || 'Select Time Slot'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('exams.class') || 'Class'}</Label>
              <Select value={selectedClassId || 'all'} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {examClasses.map((examClass) => (
                    <SelectItem key={examClass.id} value={examClass.id}>
                      {getClassName(examClass.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('exams.timeSlot') || 'Time Slot'}</Label>
              <Select 
                value={selectedTimeId || undefined} 
                onValueChange={handleTimeChange}
                disabled={!examId || filteredTimes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !examId 
                      ? (t('exams.selectExamFirst') || 'Select an exam first')
                      : filteredTimes.length === 0
                      ? (t('exams.noTimeSlots') || 'No time slots available')
                      : (t('exams.selectTimeSlot') || 'Select time slot')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {filteredTimes.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {t('exams.noTimeSlots') || 'No time slots available'}
                    </div>
                  ) : (
                    filteredTimes.map((time) => (
                      <SelectItem key={time.id} value={time.id}>
                        {time.date.toLocaleDateString()} - {time.startTime} to {time.endTime}
                        {time.examSubject?.subject?.name && ` (${time.examSubject.subject.name})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Marking */}
      {selectedTimeId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {t('exams.attendance.markAttendance') || 'Mark Attendance'}
                </CardTitle>
                {selectedExamTime && (
                  <CardDescription>
                    {selectedExamTime.date.toLocaleDateString()} | {selectedExamTime.startTime} - {selectedExamTime.endTime}
                    {selectedExamTime.examSubject?.subject?.name && ` | ${selectedExamTime.examSubject.subject.name}`}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-2">
                {timeslotData?.counts && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{timeslotData.counts.marked}</span> / {timeslotData.counts.total} marked
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : timeslotData?.students && timeslotData.students.length > 0 ? (
              <Tabs defaultValue="manual" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    {t('exams.attendance.manual') || 'Manual'}
                  </TabsTrigger>
                  <TabsTrigger value="barcode" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    {t('exams.attendance.barcode') || 'Barcode'}
                  </TabsTrigger>
                </TabsList>

                {/* Manual Tab */}
                <TabsContent value="manual" className="space-y-4">
                  {/* Bulk Actions */}
                  {canMarkAttendance && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => initializeEntries()}
                        >
                          Load Existing
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Mark All As <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                              <DropdownMenuItem key={status} onClick={() => markAllAs(status as ExamAttendanceStatus)}>
                                {config.icon}
                                <span className="ml-2">{config.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedStudents.size > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkStatusDialogOpen(true)}
                          >
                            Update Selected ({selectedStudents.size})
                          </Button>
                        )}
                      </div>
                      <Button
                        onClick={handleSaveAttendance}
                        disabled={markAttendance.isPending || attendanceEntries.size === 0}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {markAttendance.isPending ? 'Saving...' : 'Save Attendance'}
                      </Button>
                    </div>
                  )}

                  {/* Students Table */}
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canMarkAttendance && (
                            <TableHead className="w-12">
                              <Checkbox
                                checked={
                                  timeslotData.students.length > 0 &&
                                  selectedStudents.size === timeslotData.students.length
                                }
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                          )}
                          <TableHead>Roll</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Admission No</TableHead>
                          <TableHead>Status</TableHead>
                          {canMarkAttendance && <TableHead>Seat #</TableHead>}
                          <TableHead>Current</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeslotData.students.map((student: TimeslotStudent) => {
                          const entry = attendanceEntries.get(student.studentId);
                          return (
                            <TableRow key={student.studentId}>
                              {canMarkAttendance && (
                                <TableCell>
                                  <Checkbox
                                    checked={selectedStudents.has(student.studentId)}
                                    onCheckedChange={(checked) =>
                                      handleSelectStudent(student.studentId, checked as boolean)
                                    }
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-mono">{student.rollNumber || '-'}</TableCell>
                              <TableCell className="font-medium">{student.student.fullName}</TableCell>
                              <TableCell className="text-muted-foreground">{student.student.admissionNo}</TableCell>
                              <TableCell>
                                {canMarkAttendance ? (
                                  <Select
                                    value={entry?.status || 'present'}
                                    onValueChange={(value) =>
                                      updateStudentStatus(student.studentId, value as ExamAttendanceStatus)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                        <SelectItem key={status} value={status}>
                                          <div className="flex items-center gap-2">
                                            {config.icon}
                                            <span>{config.label}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge className={STATUS_CONFIG[entry?.status || 'present'].color}>
                                    {STATUS_CONFIG[entry?.status || 'present'].label}
                                  </Badge>
                                )}
                              </TableCell>
                              {canMarkAttendance && (
                                <TableCell>
                                  <Input
                                    className="w-20"
                                    placeholder="Seat"
                                    value={entry?.seatNumber || ''}
                                    onChange={(e) => updateStudentSeatNumber(student.studentId, e.target.value)}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                {student.attendance ? (
                                  <Badge className={STATUS_CONFIG[student.attendance.status].color}>
                                    {STATUS_CONFIG[student.attendance.status].label}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">Not marked</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Barcode Tab */}
                <TabsContent value="barcode" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>{t('exams.attendance.cardNumber') || 'Card Number / Admission No'}</Label>
                      <Input
                        ref={scanInputRef}
                        value={scanCardNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          setScanCardNumber(value);
                          // Auto-submit when barcode scanner adds Enter/newline (fast scanning)
                          if (value.includes('\n') || value.includes('\r')) {
                            const cleanValue = value.replace(/[\n\r]/g, '').trim();
                            if (cleanValue) {
                              setScanCardNumber(cleanValue);
                              setTimeout(() => handleScanSubmit(), 0);
                            }
                          }
                        }}
                        placeholder={t('exams.attendance.scanPrompt') || 'Scan or enter card/admission number'}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanSubmit();
                          }
                        }}
                        autoFocus
                        className="text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('exams.attendance.note') || 'Note (Optional)'}</Label>
                      <Input
                        value={scanNote}
                        onChange={(e) => setScanNote(e.target.value)}
                        placeholder={t('exams.attendance.note') || 'Note'}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          if (scanInputRef.current) {
                            scanInputRef.current.focus();
                          }
                        }}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        {t('exams.attendance.focusScanner') || 'Focus Scanner'}
                      </Button>
                      <Button
                        onClick={() => void handleScanSubmit()}
                        disabled={!selectedTimeId || scanAttendance.isPending || !canMarkAttendance}
                      >
                        <ScanLine className="h-4 w-4 mr-2" />
                        {scanAttendance.isPending ? (t('exams.attendance.scanning') || 'Scanning...') : (t('exams.attendance.recordScan') || 'Record Scan')}
                      </Button>
                    </div>
                  </div>

                  {/* Scan Feed */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{t('exams.attendance.scanFeed') || 'Recent Scans'}</p>
                      </div>
                      <Input
                        placeholder={t('exams.attendance.searchScans') || 'Search scans...'}
                        value={scanFeedSearch}
                        onChange={(e) => setScanFeedSearch(e.target.value)}
                        className="w-48"
                      />
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('exams.attendance.student') || 'Student'}</TableHead>
                            <TableHead>{t('exams.attendance.cardNumber') || 'Card Number'}</TableHead>
                            <TableHead>{t('exams.attendance.status') || 'Status'}</TableHead>
                            <TableHead>{t('exams.attendance.time') || 'Time'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {scanFeedLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center">
                                <LoadingSpinner />
                              </TableCell>
                            </TableRow>
                          ) : filteredScanFeed.length > 0 ? (
                            filteredScanFeed.map((record) => {
                              const student = (record as any).student;
                              const checkedInAt = (record as any).checkedInAt ? new Date((record as any).checkedInAt) : new Date(record.createdAt);
                              return (
                                <TableRow
                                  key={record.id}
                                  className={cn(lastScanId === record.id ? 'bg-primary/5' : undefined)}
                                >
                                  <TableCell className="font-medium">
                                    {student?.fullName || record.studentId}
                                  </TableCell>
                                  <TableCell>{student?.cardNumber || student?.admissionNo || '—'}</TableCell>
                                  <TableCell>
                                    <Badge className={STATUS_CONFIG[record.status].color}>
                                      {STATUS_CONFIG[record.status].label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{format(checkedInAt, 'pp')}</TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                                {scanFeedSearch.trim()
                                  ? (t('exams.attendance.noScansMatch') || 'No scans match your search')
                                  : (t('exams.attendance.noScansYet') || 'No scans yet')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>No students enrolled for this time slot</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No time slot selected */}
      {!selectedTimeId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4" />
            <p>{t('exams.attendance.selectTimeslotPrompt') || 'Please select a time slot to mark attendance'}</p>
          </CardContent>
        </Card>
      )}

      {/* Bulk Status Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Selected Students</DialogTitle>
            <DialogDescription>
              Set attendance status for {selectedStudents.size} selected students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ExamAttendanceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyBulkStatus}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
