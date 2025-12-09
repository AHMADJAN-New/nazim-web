import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useExam, useExamTimes, useTimeslotStudents, useMarkExamAttendance, useExamAttendanceSummary } from '@/hooks/useExams';
import { useExamClasses } from '@/hooks/useExams';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Check, X, Clock, AlertCircle, UserCheck, Users, ChevronDown, Save } from 'lucide-react';
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
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  // State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTimeId, setSelectedTimeId] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [attendanceEntries, setAttendanceEntries] = useState<Map<string, AttendanceEntry>>(new Map());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<ExamAttendanceStatus>('present');

  // Queries
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses = [], isLoading: classesLoading } = useExamClasses(examId);
  const { data: examTimes = [], isLoading: timesLoading } = useExamTimes(examId);
  const { data: timeslotData, isLoading: studentsLoading, refetch: refetchStudents } = useTimeslotStudents(examId, selectedTimeId);
  const { data: attendanceSummary } = useExamAttendanceSummary(examId);
  
  // Mutations
  const markAttendance = useMarkExamAttendance();

  // Filter times by selected class
  const filteredTimes = useMemo(() => {
    if (!selectedClassId) return examTimes;
    return examTimes.filter((time) => time.examClassId === selectedClassId);
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
    setSelectedTimeId(timeId);
    setSelectedStudents(new Set());
    setAttendanceEntries(new Map());
  };

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
          <Button variant="outline" size="sm" onClick={() => navigate('/exams')}>
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            Back
          </Button>
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
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
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
              <Select value={selectedTimeId} onValueChange={handleTimeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time slot" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTimes.map((time) => (
                    <SelectItem key={time.id} value={time.id}>
                      {time.date.toLocaleDateString()} - {time.startTime} to {time.endTime}
                      {time.examSubject?.subject?.name && ` (${time.examSubject.subject.name})`}
                    </SelectItem>
                  ))}
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
              <>
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
              </>
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
