import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Activity, ClipboardList, History, QrCode, Save, ScanLine, CheckCircle2, XCircle, Clock, AlertCircle, Heart, Calendar, X } from 'lucide-react';
import { useAttendanceRoster, useAttendanceScanFeed, useAttendanceSession, useAttendanceSessions, useCreateAttendanceSession, useMarkAttendance, useScanAttendance, useCloseAttendanceSession } from '@/hooks/useAttendance';
import type { AttendanceRecordInsert, AttendanceSessionInsert } from '@/types/domain/attendance';
import { useClasses } from '@/hooks/useClasses';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

interface RosterStudent {
  id: string;
  full_name: string;
  admission_no: string;
  card_number: string | null;
  student_code: string | null;
  gender: string | null;
}

export default function Attendance() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [sessionMethod, setSessionMethod] = useState<'manual' | 'barcode'>('manual');
  const [sessionRemarks, setSessionRemarks] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [scanCardNumber, setScanCardNumber] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null); // Instant feedback label
  const [studentCache, setStudentCache] = useState<Map<string, any>>(new Map()); // Cache: cardNumber -> student
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceRecordInsert>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scanFeedSearch, setScanFeedSearch] = useState('');

  const attendanceOptions = useMemo(() => ([
    { value: 'present', label: t('attendancePage.statusPresent') || 'Present', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
    { value: 'absent', label: t('attendancePage.statusAbsent') || 'Absent', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
    { value: 'late', label: t('attendancePage.statusLate') || 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
    { value: 'excused', label: t('attendancePage.statusExcused') || 'Excused', icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
    { value: 'sick', label: t('attendancePage.statusSick') || 'Sick', icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
    { value: 'leave', label: t('attendancePage.statusLeave') || 'Leave (رخصت)', icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
  ]), [t]);

  // Status badge component
  const StatusBadge = ({ status }: { status: AttendanceRecordInsert['status'] }) => {
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

  const { sessions, pagination, page, pageSize, setPage, setPageSize, isLoading: sessionsLoading } = useAttendanceSessions({}, true);
  const { session } = useAttendanceSession(selectedSessionId || undefined);
  
  // Check for session query param and auto-select session
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessions.length > 0) {
      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSelectedSessionId(sessionId);
        // Clean up URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, sessions, setSearchParams]);
  
  // Get class IDs from session - use classes array if available, otherwise fall back to classId
  const sessionClassIds = useMemo(() => {
    if (!session) return [];
    // If session has classes array, use it; otherwise use classId
    if (session.classes && Array.isArray(session.classes) && session.classes.length > 0) {
      return session.classes.map(c => c.id);
    }
    return session.classId ? [session.classId] : [];
  }, [session]);
  
  const { data: roster } = useAttendanceRoster(sessionClassIds.length > 0 ? sessionClassIds : undefined, session?.academicYearId || undefined);
  const { data: scanFeed } = useAttendanceScanFeed(selectedSessionId || undefined, 30, true);
  const createSession = useCreateAttendanceSession();
  const markAttendance = useMarkAttendance(selectedSessionId || undefined);
  const scanAttendance = useScanAttendance(selectedSessionId || undefined);
  const closeSession = useCloseAttendanceSession();
  const { data: classes } = useClasses();
  const { data: schools } = useSchools();

  useEffect(() => {
    if (session?.records) {
      const mapped: Record<string, AttendanceRecordInsert> = {};
      session.records.forEach(record => {
        mapped[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          note: record.note,
        };
      });
      setAttendanceState(mapped);
    }
  }, [session]);

  // Cache students when roster is loaded
  useEffect(() => {
    if (roster && roster.length > 0) {
      const cache = new Map<string, any>();
      roster.forEach((student) => {
        if (student.card_number) {
          cache.set(student.card_number, student);
        }
        if (student.student_code) {
          cache.set(student.student_code, student);
        }
        if (student.admission_no) {
          cache.set(student.admission_no, student);
        }
      });
      setStudentCache(cache);
    }
  }, [roster]);

  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (roster && (!session?.records || session.records.length === 0)) {
      setAttendanceState(prev => {
        const next = { ...prev } as Record<string, AttendanceRecordInsert>;
        (roster as RosterStudent[]).forEach(student => {
          if (!next[student.id]) {
            next[student.id] = { studentId: student.id, status: 'present', note: null };
          }
        });
        return next;
      });
    }
  }, [roster, session]);

  // Auto-select school if there's only one school
  useEffect(() => {
    if (schools && schools.length === 1 && selectedSchool === 'all') {
      setSelectedSchool(schools[0].id);
    }
  }, [schools, selectedSchool]);

  const handleCreateSession = async () => {
    const classIdsToUse = selectedClassIds.length > 0 ? selectedClassIds : (selectedClass ? [selectedClass] : []);
    
    if (classIdsToUse.length === 0 || !sessionDate) {
      toast.error(t('attendancePage.sessionHint') || 'Please select at least one class and date');
      return;
    }

    const payload: AttendanceSessionInsert = {
      classIds: classIdsToUse,
      classId: classIdsToUse[0], // Keep for backward compatibility
      schoolId: selectedSchool === 'all' ? null : selectedSchool || null,
      sessionDate: new Date(sessionDate),
      method: sessionMethod,
      remarks: sessionRemarks || undefined,
    };

    try {
      const created = await createSession.mutateAsync(payload);
      setSelectedSessionId(created.id);
      // Reset form
      setSelectedClass('');
      setSelectedClassIds([]);
      setSessionDate('');
      setSessionRemarks('');
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

  const handleUpdateState = (studentId: string, status: AttendanceRecordInsert['status']) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: {
        studentId,
        status,
        note: prev[studentId]?.note ?? null,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) {
      toast.error(t('attendancePage.sessionRequired'));
      return;
    }
    const records = Object.values(attendanceState);
    if (!records.length) {
      toast.error(t('attendancePage.recordsRequired'));
      return;
    }
    await markAttendance.mutateAsync(records);
  };

  const handleMarkAll = (status: AttendanceRecordInsert['status']) => {
    if (!roster) return;
    const updated: Record<string, AttendanceRecordInsert> = {};
    (roster as RosterStudent[]).forEach(student => {
      updated[student.id] = { studentId: student.id, status, note: attendanceState[student.id]?.note ?? null };
    });
    setAttendanceState(updated);
  };

  const orderedRoster: RosterStudent[] = useMemo(() => {
    if (!roster) return [];
    let filtered = (roster as RosterStudent[]).slice();
    
    // Filter by search term (name, admission_no, card_number, student_code)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(student => 
        student.full_name.toLowerCase().includes(term) ||
        student.admission_no.toLowerCase().includes(term) ||
        (student.card_number && student.card_number.toLowerCase().includes(term)) ||
        (student.student_code && student.student_code.toLowerCase().includes(term))
      );
    }
    
    return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [roster, searchTerm]);

  const filteredScanFeed = useMemo(() => {
    if (!scanFeed) return [];
    if (!scanFeedSearch.trim()) return scanFeed;
    
    const term = scanFeedSearch.trim().toLowerCase();
    return scanFeed.filter(record => 
      record.student?.fullName?.toLowerCase().includes(term) ||
      record.student?.admissionNo?.toLowerCase().includes(term) ||
      (record.student?.cardNumber && record.student.cardNumber.toLowerCase().includes(term)) ||
      record.studentId.toLowerCase().includes(term)
    );
  }, [scanFeed, scanFeedSearch]);

  const handleScanSubmit = async () => {
    if (!scanCardNumber.trim()) {
      setScanError(t('attendancePage.scanPrompt') || 'Please enter a card number');
      setTimeout(() => setScanError(null), 2000);
      return;
    }
    
    const scannedValue = scanCardNumber.trim();
    setScanError(null);
    
    // Check cache first for instant feedback
    const foundStudent = studentCache.get(scannedValue);
    if (!foundStudent && roster && roster.length > 0) {
      // Student not found in cache - show instant feedback
      setScanError(t('attendancePage.studentNotFound') || 'Student not found');
      setTimeout(() => setScanError(null), 2000);
      setScanCardNumber('');
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
      return;
    }
    
    // Store the scanned value and clear input immediately for fast scanning
    setScanCardNumber('');
    
    // Focus input immediately for next scan
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
    
    // Submit scan asynchronously (don't block UI)
    scanAttendance.mutate(
      { cardNumber: scannedValue, note: scanNote || undefined },
      {
        onSuccess: (result) => {
          setLastScanId((result as any)?.id || null);
          setTimeout(() => setLastScanId(null), 3000);
          // Clear note after successful scan
          setScanNote('');
        },
        onError: (error: any) => {
          // Show instant feedback instead of toast
          setScanError(error.message || t('common.error') || 'Failed to scan');
          setTimeout(() => setScanError(null), 2000);
        },
      }
    );
  };

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('attendancePage.title')}</CardTitle>
          <CardDescription className="text-sm">{t('attendancePage.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="md:col-span-2 space-y-3">
            <Label>{t('attendancePage.classLabel')} {selectedClassIds.length > 0 && `(${selectedClassIds.length} selected)`}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {(classes || []).map(cls => {
                const isSelected = selectedClassIds.includes(cls.id);
                return (
                  <div
                    key={cls.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedClassIds(prev => prev.filter(id => id !== cls.id));
                      } else {
                        setSelectedClassIds(prev => [...prev, cls.id]);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{cls.name}</span>
                  </div>
                );
              })}
            </div>
            {selectedClassIds.length === 0 && (
              <p className="text-xs text-muted-foreground">{t('attendancePage.selectAtLeastOneClass') || 'Select at least one class'}</p>
            )}
          </div>
          <div className="space-y-3">
            <Label>{t('attendancePage.dateLabel')}</Label>
            <CalendarDatePicker date={sessionDate ? new Date(sessionDate) : undefined} onDateChange={(date) => setSessionDate(date ? date.toISOString().split("T")[0] : "")} placeholder="Select date" />
          </div>
          <div className="space-y-3">
            <Label>{t('attendancePage.methodLabel')}</Label>
            <Select value={sessionMethod} onValueChange={value => setSessionMethod(value as 'manual' | 'barcode')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{t('attendancePage.manualTab')}</SelectItem>
                <SelectItem value="barcode">{t('attendancePage.barcodeTab')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <Label>{t('attendancePage.schoolLabel')}</Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder={t('attendancePage.schoolLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {(schools || []).map(school => (
                  <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-3">
            <Label>{t('attendancePage.notesLabel')}</Label>
            <Textarea value={sessionRemarks} onChange={e => setSessionRemarks(e.target.value)} placeholder={t('attendancePage.notesLabel')} />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleCreateSession} disabled={createSession.isPending}>
              <ClipboardList className="h-4 w-4 mr-2" />
              {t('attendancePage.createButton')}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('attendancePage.recentSessions')}</CardTitle>
          <CardDescription>{t('attendancePage.recentSessionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div className="space-y-2">
              {(sessions || []).map(item => (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 rounded-md border cursor-pointer hover:border-primary transition',
                    selectedSessionId === item.id ? 'border-primary bg-primary/5' : 'border-muted'
                  )}
                  onClick={() => setSelectedSessionId(item.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSessionId(item.id);
                    }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.classes && item.classes.length > 0 ? (
                          item.classes.map((cls, idx) => (
                            <Badge key={cls.id} variant="outline" className="text-xs">
                              {cls.name}
                            </Badge>
                          ))
                        ) : (
                          <p className="font-semibold">{item.className || 'Class'}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{format(item.sessionDate, 'PPP')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right space-y-1">
                        <Badge variant="secondary">{item.method === 'manual' ? t('attendancePage.manualTab') : t('attendancePage.barcodeTab')}</Badge>
                        <Badge variant={item.status === 'open' ? 'default' : 'outline'}>{item.status}</Badge>
                      </div>
                      {item.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeSession.mutate(item.id);
                          }}
                          disabled={closeSession.isPending}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={t('attendancePage.closeSession') || 'Close session'}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!sessions?.length && !sessionsLoading && (
                <p className="text-sm text-muted-foreground">{t('attendancePage.noSessions')}</p>
              )}
            </div>
            {pagination && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>{t('pagination.showing')} {pagination.current_page} {t('pagination.of')} {pagination.last_page}</div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.previous')}</Button>
                  <Button variant="outline" size="sm" disabled={page >= (pagination.last_page || 1)} onClick={() => setPage(page + 1)}>{t('common.next')}</Button>
                  <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map(size => (
                        <SelectItem key={size} value={String(size)}>{size} {t('pagination.perPage') || '/ page'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('attendancePage.title')}</CardTitle>
          <CardDescription>{t('attendancePage.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual">
            <TabsList>
              <TabsTrigger value="manual" className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> {t('attendancePage.manualTab')}</TabsTrigger>
              <TabsTrigger value="barcode" className="flex items-center gap-2"><QrCode className="h-4 w-4" /> {t('attendancePage.barcodeTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <Input
                    placeholder={t('attendancePage.searchRosterPlaceholder') || 'Search by name, admission, card, or code...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => handleMarkAll('present')}>{t('attendancePage.markAllPresent')}</Button>
                  <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')}>{t('attendancePage.markAllAbsent')}</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveAttendance} disabled={markAttendance.isPending || session?.status === 'closed'}>
                    <Save className="h-4 w-4 mr-2" />
                    {markAttendance.isPending ? t('attendancePage.saveInProgress') : t('attendancePage.saveButton')}
                  </Button>
                  {session?.status === 'closed' && (
                    <Badge variant="outline" className="text-xs">
                      {t('attendancePage.sessionClosed') || 'Session Closed'}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('attendancePage.studentHeader')}</TableHead>
                      <TableHead>{t('attendancePage.admissionHeader')}</TableHead>
                      <TableHead>{t('attendancePage.cardHeader')}</TableHead>
                      <TableHead>{t('attendancePage.statusHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderedRoster.map(student => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>{student.admission_no}</TableCell>
                        <TableCell>{student.card_number || '—'}</TableCell>
                        <TableCell>
                          <Select
                            value={attendanceState[student.id]?.status || 'present'}
                            onValueChange={value => handleUpdateState(student.id, value as AttendanceRecordInsert['status'])}
                            disabled={session?.status === 'closed'}
                          >
                            <SelectTrigger className="w-40" disabled={session?.status === 'closed'}>
                              <SelectValue>
                                {attendanceState[student.id]?.status ? (
                                  <StatusBadge status={attendanceState[student.id].status} />
                                ) : (
                                  <StatusBadge status="present" />
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
                    ))}
                    {!orderedRoster.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {searchTerm.trim() ? (t('attendancePage.noStudentsMatchSearch') || 'No students match your search') : t('attendancePage.emptyRoster')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="barcode" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label>{t('attendancePage.cardNumberLabel')}</Label>
                  <div className="relative">
                    <Input
                      ref={scanInputRef}
                      value={scanCardNumber}
                      onChange={e => {
                        const value = e.target.value;
                        setScanCardNumber(value);
                        setScanError(null); // Clear error on input
                        // Auto-submit when barcode scanner adds Enter/newline (fast scanning)
                        if (value.includes('\n') || value.includes('\r')) {
                          const cleanValue = value.replace(/[\n\r]/g, '').trim();
                          if (cleanValue) {
                            setScanCardNumber(cleanValue);
                            setTimeout(() => handleScanSubmit(), 0);
                          }
                        }
                      }}
                      placeholder={t('attendancePage.scanPrompt') || 'Scan or enter card/admission/code'}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleScanSubmit();
                        }
                      }}
                      autoFocus
                      className="text-lg"
                    />
                    {/* Instant feedback label */}
                    {scanError && (
                      <div className="absolute -bottom-6 left-0 right-0 text-sm text-red-600 font-medium animate-in fade-in">
                        {scanError}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('attendancePage.noteLabel')}</Label>
                  <Input value={scanNote} onChange={e => setScanNote(e.target.value)} placeholder={t('attendancePage.noteLabel')} />
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
                    {t('attendancePage.focusScanner')}
                  </Button>
                  <Button
                    onClick={() => void handleScanSubmit()}
                    disabled={!selectedSessionId || scanAttendance.isPending || session?.status === 'closed'}
                  >
                    <ScanLine className="h-4 w-4 mr-2" />
                    {scanAttendance.isPending ? t('attendancePage.scanInProgress') : t('attendancePage.recordScan')}
                  </Button>
                  {session?.status === 'closed' && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      {t('attendancePage.sessionClosed') || 'Session Closed'}
                    </Badge>
                  )}
                </div>
              </div>
              {!selectedSessionId && (
                <p className="text-sm text-muted-foreground">{t('attendancePage.selectSessionForScan')}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold">{t('attendancePage.scanFeedTitle')}</p>
                  </div>
                  <Input
                    placeholder={t('attendancePage.searchScans') || 'Search scans...'}
                    value={scanFeedSearch}
                    onChange={(e) => setScanFeedSearch(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('attendancePage.studentHeader')}</TableHead>
                        <TableHead>{t('attendancePage.cardHeader')}</TableHead>
                        <TableHead>{t('attendancePage.statusHeader')}</TableHead>
                        <TableHead>{t('attendancePage.timeHeader')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScanFeed.map(record => (
                        <TableRow key={record.id} className={cn(lastScanId === record.id ? 'bg-primary/5' : undefined)}>
                          <TableCell className="font-medium">{record.student?.fullName || record.studentId}</TableCell>
                          <TableCell>{record.student?.cardNumber || '—'}</TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                          <TableCell>{format(record.markedAt, 'pp')}</TableCell>
                        </TableRow>
                      ))}
                      {!filteredScanFeed.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                            {!selectedSessionId 
                              ? t('attendancePage.selectSessionForScan')
                              : scanFeedSearch.trim()
                              ? (t('attendancePage.noScansMatchSearch') || 'No scans match your search')
                              : t('attendancePage.noScansYet')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
