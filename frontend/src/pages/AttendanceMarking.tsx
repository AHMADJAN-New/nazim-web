import { format } from 'date-fns';
import { 
  ClipboardList, 
  QrCode, 
  Save, 
  ScanLine, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Heart, 
  Calendar, 
  History,
  Activity,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAttendanceSessions } from '@/hooks/useAttendance';
import { useAttendanceRoster, useAttendanceScanFeed, useAttendanceSession, useMarkAttendance, useScanAttendance } from '@/hooks/useAttendance';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import type { AttendanceRecordInsert } from '@/types/domain/attendance';


interface RosterStudent {
  id: string;
  full_name: string;
  admission_no: string;
  card_number: string | null;
  student_code: string | null;
  gender: string | null;
}

export default function AttendanceMarking() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session') || '';

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId || null);
  const [scanCardNumber, setScanCardNumber] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [studentCache, setStudentCache] = useState<Map<string, any>>(new Map());
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceRecordInsert>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scanFeedSearch, setScanFeedSearch] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [isSessionSelectOpen, setIsSessionSelectOpen] = useState(false);

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

  const { sessions, isLoading: sessionsLoading } = useAttendanceSessions({}, false);
  const { session } = useAttendanceSession(selectedSessionId || undefined);

  // Filter sessions: today, yesterday, and active/open only
  const filteredSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return (sessions as any[]).filter((item) => {
      // Only show active/open sessions
      if (item.status !== 'open') return false;
      
      // Check if session date is today or yesterday
      const sessionDate = new Date(item.sessionDate);
      sessionDate.setHours(0, 0, 0, 0);
      
      const isToday = sessionDate.getTime() === today.getTime();
      const isYesterday = sessionDate.getTime() === yesterday.getTime();
      
      return isToday || isYesterday;
    });
  }, [sessions]);

  // Searchable filtered sessions
  const searchableSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return filteredSessions;
    
    const term = sessionSearchTerm.trim().toLowerCase();
    return filteredSessions.filter((item) => {
      const className = item.className || '';
      const classNames = item.classes?.map((c: any) => c.name).join(' ') || '';
      const dateStr = format(item.sessionDate, 'PPP').toLowerCase();
      const method = item.method === 'manual' ? t('attendancePage.manualTab') : t('attendancePage.barcodeTab');
      
      return (
        className.toLowerCase().includes(term) ||
        classNames.toLowerCase().includes(term) ||
        dateStr.includes(term) ||
        method.toLowerCase().includes(term)
      );
    });
  }, [filteredSessions, sessionSearchTerm, t]);
  
  // Get class IDs from session
  const sessionClassIds = useMemo(() => {
    if (!session) return [];
    if (session.classes && Array.isArray(session.classes) && session.classes.length > 0) {
      return session.classes.map(c => c.id);
    }
    return session.classId ? [session.classId] : [];
  }, [session]);
  
  const { data: roster } = useAttendanceRoster(sessionClassIds.length > 0 ? sessionClassIds : undefined, session?.academicYearId || undefined);
  const { data: scanFeed } = useAttendanceScanFeed(selectedSessionId || undefined, 30, true);
  const markAttendance = useMarkAttendance(selectedSessionId || undefined);
  const scanAttendance = useScanAttendance(selectedSessionId || undefined);

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

  // Check for session query param and auto-select session
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessions.length > 0) {
      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSelectedSessionId(sessionId);
      }
    }
  }, [searchParams, sessions]);

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
      showToast.error(t('attendancePage.sessionRequired') || 'Please select a session');
      return;
    }
    const records = Object.values(attendanceState);
    if (!records.length) {
      showToast.error(t('attendancePage.recordsRequired') || 'No records to save');
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
      { cardNumber: scannedValue, note: scanNote || undefined },
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

  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Page Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>{t('dashboard.markAttendance') || 'Mark Attendance'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('attendancePage.markAttendanceDescription') || 'Track attendance with manual marking or barcode scans'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Session Selection */}
      <Card>
        <Collapsible open={isSessionPanelOpen} onOpenChange={setIsSessionPanelOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('attendancePage.selectSession') || 'Select Session'}</CardTitle>
                {isSessionPanelOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('attendancePage.selectSession') || 'Select Session'}</Label>
            <Popover open={isSessionSelectOpen} onOpenChange={setIsSessionSelectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isSessionSelectOpen}
                  className="w-full justify-between"
                  disabled={sessionsLoading}
                >
                  {selectedSessionId && session ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {session.classes && session.classes.length > 0 ? (
                        session.classes.map((cls) => (
                          <Badge key={cls.id} variant="outline" className="text-xs">
                            {cls.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="font-medium">{session.className || 'Class'}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(session.sessionDate, 'PPP')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {t('attendancePage.selectSessionPlaceholder') || 'Choose a session...'}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder={t('attendancePage.searchSessions') || 'Search sessions...'} 
                    value={sessionSearchTerm}
                    onValueChange={setSessionSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {sessionsLoading 
                        ? (t('common.loading') || 'Loading...')
                        : (t('attendancePage.noSessions') || 'No sessions available')}
                    </CommandEmpty>
                    <CommandGroup>
                      {searchableSessions.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={`${item.className || ''} ${item.classes?.map((c: any) => c.name).join(' ') || ''} ${format(item.sessionDate, 'PPP')}`}
                          onSelect={() => {
                            setSelectedSessionId(item.id);
                            setIsSessionSelectOpen(false);
                            setSessionSearchTerm('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSessionId === item.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.classes && item.classes.length > 0 ? (
                                item.classes.map((cls: any) => (
                                  <Badge key={cls.id} variant="outline" className="text-xs">
                                    {cls.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="font-medium text-sm">{item.className || 'Class'}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(item.sessionDate, 'PPP')}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.method === 'manual' ? t('attendancePage.manualTab') : t('attendancePage.barcodeTab')}
                              </Badge>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {selectedSessionId && session && (
            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{t('attendancePage.currentSession') || 'Current Session:'}</span>
                {session.classes && session.classes.length > 0 ? (
                  session.classes.map((cls) => (
                    <Badge key={cls.id} variant="outline" className="text-xs">
                      {cls.name}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {session.className || 'Class'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(session.sessionDate, 'PPP')}</span>
                <Badge variant={session.status === 'open' ? 'default' : 'outline'} className="text-xs">
                  {session.status}
                </Badge>
              </div>
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Attendance Marking Tabs */}
      {selectedSessionId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.markAttendance') || 'Mark Attendance'}</CardTitle>
            <CardDescription>{t('attendancePage.markAttendanceDescription') || 'Track attendance with manual marking or barcode scans'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendancePage.manualTab')}</span>
                </TabsTrigger>
                <TabsTrigger value="barcode" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('attendancePage.barcodeTab')}</span>
                </TabsTrigger>
              </TabsList>

              {/* Manual Tab */}
              <TabsContent value="manual" className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex-1 max-w-full sm:max-w-md">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('attendancePage.searchRosterPlaceholder') || 'Search by name, admission, card, or code...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleMarkAll('present')}
                      className="flex-shrink-0"
                    >
                      {t('attendancePage.markAllPresent') || 'Mark All Present'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleMarkAll('absent')}
                      className="flex-shrink-0"
                    >
                      {t('attendancePage.markAllAbsent') || 'Mark All Absent'}
                    </Button>
                    <Button 
                      onClick={handleSaveAttendance} 
                      disabled={markAttendance.isPending || session?.status === 'closed'}
                      className="flex-shrink-0"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {markAttendance.isPending ? t('attendancePage.saveInProgress') : t('attendancePage.saveButton')}
                    </Button>
                  </div>
                </div>
                {session?.status === 'closed' && (
                  <Badge variant="outline" className="text-xs">
                    {t('attendancePage.sessionClosed') || 'Session Closed'}
                  </Badge>
                )}
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                          <TableHead className="hidden sm:table-cell">{t('attendancePage.admissionHeader') || 'Admission'}</TableHead>
                          <TableHead className="hidden md:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                          <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderedRoster.map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              <div className="flex flex-col sm:hidden gap-1">
                                <span>{student.full_name}</span>
                                <span className="text-xs text-muted-foreground">{student.admission_no}</span>
                              </div>
                              <span className="hidden sm:inline">{student.full_name}</span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{student.admission_no}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.card_number || '—'}</TableCell>
                            <TableCell>
                              <Select
                                value={attendanceState[student.id]?.status || 'present'}
                                onValueChange={value => handleUpdateState(student.id, value as AttendanceRecordInsert['status'])}
                                disabled={session?.status === 'closed'}
                              >
                                <SelectTrigger className="w-full sm:w-40" disabled={session?.status === 'closed'}>
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
                </div>
              </TabsContent>

              {/* Barcode Tab */}
              <TabsContent value="barcode" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('attendancePage.cardNumberLabel') || 'Card Number'}</Label>
                    <div className="relative">
                      <Input
                        ref={scanInputRef}
                        value={scanCardNumber}
                        onChange={e => {
                          const value = e.target.value;
                          setScanCardNumber(value);
                          setScanError(null);
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
                      {scanError && (
                        <div className="absolute -bottom-6 left-0 right-0 text-sm text-red-600 font-medium animate-in fade-in">
                          {scanError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('attendancePage.noteLabel') || 'Note'}</Label>
                    <Input 
                      value={scanNote} 
                      onChange={e => setScanNote(e.target.value)} 
                      placeholder={t('attendancePage.noteLabel') || 'Note'} 
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (scanInputRef.current) {
                        scanInputRef.current.focus();
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    {t('attendancePage.focusScanner') || 'Focus Scanner'}
                  </Button>
                  <Button
                    onClick={() => void handleScanSubmit()}
                    disabled={!selectedSessionId || scanAttendance.isPending || session?.status === 'closed'}
                    className="flex-shrink-0"
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
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{t('attendancePage.scanFeedTitle') || 'Scan Feed'}</p>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('attendancePage.searchScans') || 'Search scans...'}
                        value={scanFeedSearch}
                        onChange={(e) => setScanFeedSearch(e.target.value)}
                        className="w-full sm:w-48 pl-9"
                      />
                    </div>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                            <TableHead className="hidden sm:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                            <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredScanFeed.map(record => (
                            <TableRow key={record.id} className={cn(lastScanId === record.id ? 'bg-primary/5' : undefined)}>
                              <TableCell className="font-medium">
                                <div className="flex flex-col sm:hidden gap-1">
                                  <span>{record.student?.fullName || record.studentId}</span>
                                  <span className="text-xs text-muted-foreground">{record.student?.cardNumber || '—'}</span>
                                </div>
                                <span className="hidden sm:inline">{record.student?.fullName || record.studentId}</span>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">{record.student?.cardNumber || '—'}</TableCell>
                              <TableCell>
                                <StatusBadge status={record.status} />
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{format(record.markedAt, 'pp')}</TableCell>
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
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">{t('attendancePage.selectSessionForMarking') || 'Please select a session to mark attendance'}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

