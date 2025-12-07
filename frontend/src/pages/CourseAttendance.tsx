import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  CourseAttendanceSession,
  CourseRosterStudent,
} from '@/hooks/useCourseAttendance';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Calendar,
  Users,
  QrCode,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Lock,
} from 'lucide-react';
import { format } from 'date-fns';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';

interface AttendanceRecord {
  courseStudentId: string;
  status: AttendanceStatus;
  note?: string;
}

export default function CourseAttendance() {
  const [searchParams] = useSearchParams();
  const initialCourseId = searchParams.get('courseId') || '';

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [attendanceMode, setAttendanceMode] = useState<'manual' | 'barcode'>('manual');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map());

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { data: courses = [] } = useShortTermCourses();
  const { data: sessions = [], isLoading: sessionsLoading } = useCourseAttendanceSessions(selectedCourseId || undefined);
  const { data: currentSession } = useCourseAttendanceSession(selectedSessionId || '');
  const { data: roster = [] } = useCourseRoster(selectedCourseId);
  const { data: recentScans = [] } = useCourseAttendanceScans(selectedSessionId || '', 10);

  const createSession = useCreateCourseAttendanceSession();
  const deleteSession = useDeleteCourseAttendanceSession();
  const markRecords = useMarkCourseAttendanceRecords();
  const scanAttendance = useScanCourseAttendance();
  const closeSession = useCloseCourseAttendanceSession();

  // New session form state
  const [newSessionDate, setNewSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionMethod, setNewSessionMethod] = useState<'manual' | 'barcode' | 'mixed'>('manual');

  // Focus barcode input when in barcode mode
  useEffect(() => {
    if (attendanceMode === 'barcode' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [attendanceMode, selectedSessionId]);

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
    if (!selectedCourseId) return;
    await createSession.mutateAsync({
      course_id: selectedCourseId,
      session_date: newSessionDate,
      session_title: newSessionTitle || null,
      method: newSessionMethod,
    });
    setIsCreateDialogOpen(false);
    setNewSessionTitle('');
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
    const newMap = new Map<string, AttendanceRecord>();
    roster.forEach((student) => {
      newMap.set(student.id, { courseStudentId: student.id, status });
    });
    setAttendanceRecords(newMap);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) return;
    const records = Array.from(attendanceRecords.values());
    if (records.length === 0) return;
    await markRecords.mutateAsync({ sessionId: selectedSessionId, records });
  };

  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim() && selectedSessionId) {
      await scanAttendance.mutateAsync({ sessionId: selectedSessionId, code: barcodeInput.trim() });
      setBarcodeInput('');
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSessionId) return;
    await closeSession.mutateAsync(selectedSessionId);
    setSelectedSessionId(null);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants: Record<AttendanceStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      present: { variant: 'default', label: 'Present' },
      absent: { variant: 'destructive', label: 'Absent' },
      late: { variant: 'secondary', label: 'Late' },
      excused: { variant: 'outline', label: 'Excused' },
      sick: { variant: 'outline', label: 'Sick' },
      leave: { variant: 'outline', label: 'Leave' },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Course Attendance</h1>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedSessionId(null); }}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a course..." />
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sessions List */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Sessions</CardTitle>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : sessions.length === 0 ? (
                <p className="text-muted-foreground">No sessions yet</p>
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
                            {format(new Date(session.session_date), 'MMM d, yyyy')}
                          </p>
                          {session.session_title && (
                            <p className="text-sm text-muted-foreground">{session.session_title}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
                            {session.status}
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
                          <CheckCircle className="h-3 w-3 text-green-500" />
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
                  {selectedSessionId ? 'Mark Attendance' : 'Select a Session'}
                </span>
                {selectedSessionId && currentSession?.status === 'open' && (
                  <Button variant="outline" size="sm" onClick={handleCloseSession}>
                    <Lock className="h-4 w-4 mr-1" />
                    Close Session
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSessionId ? (
                <p className="text-muted-foreground text-center py-8">
                  Select a session from the list to mark attendance
                </p>
              ) : currentSession?.status === 'closed' ? (
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">This session is closed</p>
                </div>
              ) : (
                <Tabs value={attendanceMode} onValueChange={(v) => setAttendanceMode(v as 'manual' | 'barcode')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="manual">
                      <Users className="h-4 w-4 mr-1" />
                      Manual
                    </TabsTrigger>
                    <TabsTrigger value="barcode">
                      <QrCode className="h-4 w-4 mr-1" />
                      Barcode
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4">
                    <div className="flex gap-2 mb-4">
                      <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>
                        Mark All Present
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>
                        Mark All Absent
                      </Button>
                    </div>

                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Card #</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {roster.map((student) => {
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
                                    <SelectTrigger className="w-28">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">Present</SelectItem>
                                      <SelectItem value="absent">Absent</SelectItem>
                                      <SelectItem value="late">Late</SelectItem>
                                      <SelectItem value="excused">Excused</SelectItem>
                                      <SelectItem value="sick">Sick</SelectItem>
                                      <SelectItem value="leave">Leave</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <Button onClick={handleSaveAttendance} disabled={markRecords.isPending}>
                      {markRecords.isPending ? 'Saving...' : 'Save Attendance'}
                    </Button>
                  </TabsContent>

                  <TabsContent value="barcode" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Scan Barcode or Enter Card Number</Label>
                      <Input
                        ref={barcodeInputRef}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleBarcodeScan}
                        placeholder="Scan or type card number..."
                        className="text-lg"
                        autoFocus
                      />
                      <p className="text-sm text-muted-foreground">
                        Scan a barcode or enter a card number and press Enter
                      </p>
                    </div>

                    <div className="border rounded-lg">
                      <div className="p-3 border-b bg-muted">
                        <h4 className="font-medium">Recent Scans</h4>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {recentScans.length === 0 ? (
                          <p className="p-4 text-muted-foreground text-center">No scans yet</p>
                        ) : (
                          <div className="divide-y">
                            {recentScans.map((scan) => (
                              <div key={scan.id} className="p-3 flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{scan.course_student?.full_name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {scan.marked_at && format(new Date(scan.marked_at), 'HH:mm:ss')}
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
      )}

      {/* Create Session Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Attendance Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newSessionDate}
                onChange={(e) => setNewSessionDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Title (Optional)</Label>
              <Input
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="e.g., Morning Session, Day 1..."
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={newSessionMethod} onValueChange={(v) => setNewSessionMethod(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="barcode">Barcode</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={createSession.isPending}>
              {createSession.isPending ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance session? All attendance records will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
