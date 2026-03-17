import { format } from 'date-fns';
import {
  Activity,
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Heart,
  History,
  QrCode,
  Save,
  ScanLine,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import { ChevronsUpDown } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
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
import {
  useAttendanceRoster,
  useAttendanceScanFeed,
  useAttendanceSession,
  useAttendanceSessions,
  useCloseAttendanceSession,
  useMarkAttendance,
} from '@/hooks/useAttendance';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import type { AttendanceRecord, AttendanceRecordInsert } from '@/types/domain/attendance';

interface RosterStudent {
  id: string;
  full_name: string;
  father_name?: string | null;
  admission_no: string;
  card_number: string | null;
  student_code: string | null;
  gender: string | null;
  class_id?: string | null;
  class_name?: string | null;
  room_name?: string | null;
}

interface RosterLookup {
  admission_no: string;
  card_number: string | null;
  class_id?: string | null;
  class_name?: string | null;
  father_name?: string | null;
  full_name: string;
  room_name?: string | null;
  student_code: string | null;
}

type AttendanceConcreteStatus = AttendanceRecordInsert['status'];
type AttendanceDraftStatus = AttendanceConcreteStatus | 'unmarked';
type AttendanceDraftSource = 'manual' | 'scan';

interface AttendanceDraftRecord {
  studentId: string;
  status: AttendanceDraftStatus;
  note: string | null;
  isDirty: boolean;
  source?: AttendanceDraftSource;
  updatedAt?: number;
}

interface ScanFeedbackState {
  details?: Array<{ label: string; value: string }>;
  hint?: string | null;
  message?: string;
  title?: string;
  tone: 'error' | 'info' | 'success';
}

const UNMARKED_STATUS: AttendanceDraftStatus = 'unmarked';
const SCAN_IDLE_SAVE_MS = 5000;
const SCAN_SUBMIT_DEDUPE_MS = 150;

const hasSearchMatch = (value: string | null | undefined, term: string) =>
  typeof value === 'string' && value.toLowerCase().includes(term);

const localeFromLanguage = (lang: string) => (lang === 'en' ? 'en-US' : `${lang}-001`);

export default function AttendanceMarking() {
  const { t, language } = useLanguage();
  const locale = localeFromLanguage(language);
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session') || '';

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId || null);
  const [scanNote, setScanNote] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedbackState | null>(null);
  const lastScanId: string | null = null;
  const [studentCache, setStudentCache] = useState<Map<string, RosterStudent>>(new Map());
  const [attendanceState, setAttendanceState] = useState<Record<string, AttendanceDraftRecord>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [scanFeedSearch, setScanFeedSearch] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [isSessionSelectOpen, setIsSessionSelectOpen] = useState(false);
  const [filterClassId, setFilterClassId] = useState<string | 'all'>('all');
  const [isSessionPanelOpen, setIsSessionPanelOpen] = useState(true);
  const [barcodeView, setBarcodeView] = useState<'in-progress' | 'pending-review' | 'live-scans' | 'saved'>('in-progress');
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const scanFeedbackTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const scanIdleSaveTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const lastHandledScanRef = useRef<{ at: number; value: string } | null>(null);

  const attendanceOptions = useMemo(
    () => [
      { value: 'present' as const, label: t('attendancePage.statusPresent') || 'Present', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400' },
      { value: 'absent' as const, label: t('attendancePage.statusAbsent') || 'Absent', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400' },
      { value: 'late' as const, label: t('attendancePage.statusLate') || 'Late', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-400' },
      { value: 'excused' as const, label: t('attendancePage.statusExcused') || 'Excused', icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400' },
      { value: 'sick' as const, label: t('attendancePage.statusSick') || 'Sick', icon: Heart, color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-400' },
      { value: 'leave' as const, label: t('attendancePage.statusLeave') || 'Leave', icon: Calendar, color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400' },
    ],
    [t]
  );

  const StatusBadge = ({ status }: { status: AttendanceDraftStatus }) => {
    if (status === UNMARKED_STATUS) {
      return (
        <Badge variant="outline" className="flex items-center gap-1.5 font-medium border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <AlertCircle className="h-3.5 w-3.5" />
          {t('attendancePage.statusUnmarked') || 'Not marked'}
        </Badge>
      );
    }

    const option = attendanceOptions.find((item) => item.value === status);
    if (!option) return null;

    const Icon = option.icon;
    return (
      <Badge variant="outline" className={`${option.color} flex items-center gap-1.5 font-medium`}>
        <Icon className="h-3.5 w-3.5" />
        {option.label}
      </Badge>
    );
  };

  const { sessions, pagination, isLoading: sessionsLoading } = useAttendanceSessions({ status: 'open' }, true, 100);
  const { session } = useAttendanceSession(selectedSessionId || undefined);
  const closeSession = useCloseAttendanceSession();

  const filteredSessions = useMemo(() => {
    if (!sessions?.length) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return sessions
      .filter((item) => item.status === 'open')
      .sort((a, b) => {
        const dateA = new Date(a.sessionDate);
        const dateB = new Date(b.sessionDate);
        dateA.setHours(0, 0, 0, 0);
        dateB.setHours(0, 0, 0, 0);

        const aIsToday = dateA.getTime() === today.getTime();
        const aIsYesterday = dateA.getTime() === yesterday.getTime();
        const bIsToday = dateB.getTime() === today.getTime();
        const bIsYesterday = dateB.getTime() === yesterday.getTime();

        if (aIsToday && !bIsToday) return -1;
        if (!aIsToday && bIsToday) return 1;
        if (aIsToday && bIsToday) return new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime();
        if (aIsYesterday && !bIsYesterday && !bIsToday) return -1;
        if (!aIsYesterday && bIsYesterday && !aIsToday) return 1;
        return dateB.getTime() - dateA.getTime();
      });
  }, [sessions]);

  const searchableSessions = useMemo(() => {
    if (!sessionSearchTerm.trim()) return filteredSessions;
    const term = sessionSearchTerm.trim().toLowerCase();

    return filteredSessions.filter((item) => {
      const className = item.className || '';
      const classNames = item.classes?.map((sessionClass) => sessionClass.name).join(' ') || '';
      const dateStr = formatDate(item.sessionDate, locale).toLowerCase();
      const methodLabel = item.method === 'manual' ? t('attendancePage.manualTab') || 'Manual' : t('attendancePage.barcodeTab') || 'Barcode';
      return className.toLowerCase().includes(term) || classNames.toLowerCase().includes(term) || dateStr.includes(term) || methodLabel.toLowerCase().includes(term);
    });
  }, [filteredSessions, sessionSearchTerm, locale, t]);

  const sessionClassIds = useMemo(() => {
    if (!session) return [];
    if (session.classes?.length) return session.classes.map((sessionClass) => sessionClass.id);
    return session.classId ? [session.classId] : [];
  }, [session]);

  const { data: roster } = useAttendanceRoster(sessionClassIds.length ? sessionClassIds : undefined, session?.academicYearId || undefined);
  const {
    data: scanFeed,
    refetch: refetchScanFeed,
  } = useAttendanceScanFeed(selectedSessionId || undefined, 30, session?.method === 'barcode' && barcodeView === 'live-scans');
  const markAttendance = useMarkAttendance(selectedSessionId || undefined);
  const recordsToSaveRef = useRef<AttendanceRecordInsert[]>([]);
  const markAttendancePendingRef = useRef(false);

  const clearScanFeedbackTimeout = () => {
    if (scanFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(scanFeedbackTimeoutRef.current);
      scanFeedbackTimeoutRef.current = null;
    }
  };

  const clearScanIdleSaveTimeout = () => {
    if (scanIdleSaveTimeoutRef.current !== null) {
      window.clearTimeout(scanIdleSaveTimeoutRef.current);
      scanIdleSaveTimeoutRef.current = null;
    }
  };

  const showScanFeedback = (next: ScanFeedbackState, durationMs: number | null = 2500) => {
    clearScanFeedbackTimeout();
    setScanFeedback(next);

    if (typeof durationMs === 'number' && durationMs > 0) {
      scanFeedbackTimeoutRef.current = window.setTimeout(() => {
        setScanFeedback(null);
        scanFeedbackTimeoutRef.current = null;
      }, durationMs);
    }
  };

  const getScanRoomLabel = (student: RosterStudent | null) =>
    student?.room_name || session?.className || t('attendanceTotalsReport.generalRoom') || 'General Room';

  const buildScanFeedbackDetails = (student: RosterStudent | null, scannedValue: string) => [
    { label: t('attendancePage.studentHeader') || 'Student', value: student?.full_name || scannedValue },
    { label: t('attendancePage.fatherHeader') || 'Father', value: student?.father_name || '—' },
    { label: t('attendancePage.classHeader') || 'Class', value: student?.class_name || session?.className || '—' },
    { label: t('attendancePage.cardHeader') || 'Card', value: student?.card_number || scannedValue },
    { label: t('attendanceTotalsReport.room') || 'Room', value: getScanRoomLabel(student) },
  ];

  const rosterStudents = useMemo(() => (roster as RosterStudent[] | undefined) ?? [], [roster]);
  const savedAttendanceByStudentId = useMemo(() => {
    const saved = new Map<string, AttendanceRecord>();
    (session?.records ?? []).forEach((record) => saved.set(record.studentId, record));
    return saved;
  }, [session?.records]);

  useEffect(() => {
    setAttendanceState({});
    setFilterClassId('all');
    setSearchTerm('');
    setScanFeedSearch('');
    setScanError(null);
    setScanFeedback(null);
    setBarcodeView('in-progress');
    clearScanIdleSaveTimeout();
    clearScanFeedbackTimeout();
  }, [selectedSessionId]);

  useEffect(() => {
    return () => {
      clearScanIdleSaveTimeout();
      clearScanFeedbackTimeout();
    };
  }, []);

  useEffect(() => {
    if (!rosterStudents.length) {
      setAttendanceState({});
      return;
    }

    const rosterIds = new Set(rosterStudents.map((student) => student.id));
    setAttendanceState((previous) => {
      const next: Record<string, AttendanceDraftRecord> = {};

      (session?.records ?? []).forEach((record) => {
        if (!rosterIds.has(record.studentId)) return;
        next[record.studentId] = {
          studentId: record.studentId,
          status: record.status,
          note: record.note ?? null,
          isDirty: false,
          source: record.entryMethod === 'barcode' ? 'scan' : 'manual',
          updatedAt: record.markedAt.getTime(),
        };
      });

      Object.values(previous).forEach((record) => {
        if (!record.isDirty || !rosterIds.has(record.studentId)) {
          return;
        }

        const syncedRecord = next[record.studentId];
        const isSyncedWithServer =
          !!syncedRecord &&
          syncedRecord.status === record.status &&
          (syncedRecord.note ?? null) === (record.note ?? null);

        if (!isSyncedWithServer) {
          next[record.studentId] = record;
        }
      });

      return next;
    });
  }, [rosterStudents, session?.id, session?.records]);

  useEffect(() => {
    if (!rosterStudents.length) return;
    const cache = new Map<string, RosterStudent>();
    rosterStudents.forEach((student) => {
      if (student.card_number) cache.set(student.card_number, student);
      if (student.student_code) cache.set(student.student_code, student);
      cache.set(student.admission_no, student);
    });
    setStudentCache(cache);
  }, [rosterStudents]);

  useEffect(() => {
    if (session?.method === 'barcode') {
      scanInputRef.current?.focus();
    }
  }, [selectedSessionId, session?.method]);

  const rosterLookupByStudentId = useMemo(() => {
    const lookup = new Map<string, RosterLookup>();
    rosterStudents.forEach((student) => {
      lookup.set(student.id, {
        admission_no: student.admission_no,
        card_number: student.card_number,
        class_id: student.class_id,
        class_name: student.class_name,
        father_name: student.father_name ?? null,
        full_name: student.full_name,
        room_name: student.room_name ?? null,
        student_code: student.student_code,
      });
    });
    return lookup;
  }, [rosterStudents]);

  const getDraftStatus = (studentId: string): AttendanceDraftStatus => attendanceState[studentId]?.status ?? UNMARKED_STATUS;

  const renderStatusSelect = (studentId: string) => {
    const savedRecord = savedAttendanceByStudentId.get(studentId);
    const value = getDraftStatus(studentId);
    return (
      <select
        value={value}
        onChange={(event) => handleUpdateState(studentId, event.target.value as AttendanceDraftStatus)}
        disabled={session?.status === 'closed'}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring sm:w-44"
      >
        {!savedRecord && <option value={UNMARKED_STATUS}>{t('attendancePage.statusUnmarked') || 'Not marked'}</option>}
        {attendanceOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const renderReviewStateBadge = (studentId: string) => {
    const draft = attendanceState[studentId];
    if (draft?.isDirty) {
      return <Badge variant="outline" className="border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">{t('attendancePage.unsavedChanges') || 'Unsaved changes'}</Badge>;
    }
    if (savedAttendanceByStudentId.has(studentId)) {
      return <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-300">{t('attendancePage.savedLabel') || 'Saved'}</Badge>;
    }
    return <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-300">{t('attendancePage.willBeAbsentOnClose') || 'Will be marked absent on close'}</Badge>;
  };

  useEffect(() => {
    if (!sessions?.length || sessionsLoading) return;

    const sessionIdFromParam = searchParams.get('session');
    if (sessionIdFromParam) {
      const foundSession = sessions.find((item) => item.id === sessionIdFromParam);
      if (foundSession && selectedSessionId !== sessionIdFromParam) {
        setSelectedSessionId(sessionIdFromParam);
        return;
      }
    }

    const hasValidSelection =
      !!selectedSessionId &&
      (filteredSessions.some((item) => item.id === selectedSessionId) || session?.id === selectedSessionId);

    if (!hasValidSelection && filteredSessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todaySessions = filteredSessions.filter((item) => {
        const sessionDate = new Date(item.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });

      const nextSessionId = todaySessions[0]?.id || filteredSessions[0]?.id;
      if (nextSessionId && selectedSessionId !== nextSessionId) {
        setSelectedSessionId(nextSessionId);
      }
    }
  }, [filteredSessions, searchParams, selectedSessionId, session?.id, sessions, sessionsLoading]);

  const orderedRoster = useMemo(() => {
    let filtered = rosterStudents.slice();

    if (filterClassId !== 'all') {
      filtered = filtered.filter((student) => student.class_id === filterClassId);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (student) =>
          hasSearchMatch(student.full_name, term) ||
          hasSearchMatch(student.father_name ?? null, term) ||
          hasSearchMatch(student.class_name ?? null, term) ||
          hasSearchMatch(student.admission_no, term) ||
          hasSearchMatch(student.card_number, term) ||
          hasSearchMatch(student.student_code, term)
      );
    }

    return filtered.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [filterClassId, rosterStudents, searchTerm]);

  const savedAttendanceSearchTerm = session?.method === 'manual' ? searchTerm : '';

  const sessionSummaryCounts = useMemo(() => {
    const total = rosterStudents.length;
    let saved = 0;
    let pending = 0;
    let dirty = 0;

    rosterStudents.forEach((student) => {
      const draft = attendanceState[student.id];
      const draftStatus = draft?.status ?? UNMARKED_STATUS;
      const hasSavedRecord = savedAttendanceByStudentId.has(student.id);

      if (hasSavedRecord) {
        saved += 1;
      }

      if (draft?.isDirty) {
        dirty += 1;
      }

      if (!hasSavedRecord && draftStatus === UNMARKED_STATUS) {
        pending += 1;
      }
    });

    return { dirty, pending, saved, total };
  }, [attendanceState, rosterStudents, savedAttendanceByStudentId]);

  const pendingReviewStudents = useMemo(
    () =>
      orderedRoster.filter((student) => {
        if (savedAttendanceByStudentId.has(student.id)) {
          return false;
        }

        return (attendanceState[student.id]?.status ?? UNMARKED_STATUS) === UNMARKED_STATUS;
      }),
    [attendanceState, orderedRoster, savedAttendanceByStudentId]
  );

  const savedAttendanceRows = useMemo(() => {
    const term = savedAttendanceSearchTerm.trim().toLowerCase();

    return (session?.records ?? [])
      .filter((record) => {
        const rosterInfo = rosterLookupByStudentId.get(record.studentId);

        if (filterClassId !== 'all' && rosterInfo?.class_id !== filterClassId) {
          return false;
        }

        if (!term) return true;

        return (
          hasSearchMatch(record.student?.fullName ?? rosterInfo?.full_name, term) ||
          hasSearchMatch(rosterInfo?.father_name, term) ||
          hasSearchMatch(rosterInfo?.class_name, term) ||
          hasSearchMatch(record.student?.admissionNo ?? rosterInfo?.admission_no, term) ||
          hasSearchMatch(record.student?.cardNumber ?? rosterInfo?.card_number, term) ||
          hasSearchMatch(rosterInfo?.student_code, term)
        );
      })
      .slice()
      .sort((a, b) => b.markedAt.getTime() - a.markedAt.getTime());
  }, [filterClassId, rosterLookupByStudentId, savedAttendanceSearchTerm, session?.records]);

  const filteredScanFeed = useMemo(() => {
    if (!scanFeed) return [];
    if (!scanFeedSearch.trim()) return scanFeed;

    const term = scanFeedSearch.trim().toLowerCase();
    return scanFeed.filter(
      (record) =>
        hasSearchMatch(record.student?.fullName, term) ||
        hasSearchMatch(record.student?.admissionNo, term) ||
        hasSearchMatch(record.student?.cardNumber, term) ||
        hasSearchMatch(record.studentId, term)
    );
  }, [scanFeed, scanFeedSearch]);

  const filteredScanFeedForDisplay = useMemo(() => {
    if (filterClassId === 'all') return filteredScanFeed;
    const classStudentIds = new Set(
      rosterStudents.filter((student) => student.class_id === filterClassId).map((student) => student.id)
    );
    return filteredScanFeed.filter((record) => classStudentIds.has(record.studentId));
  }, [filterClassId, filteredScanFeed, rosterStudents]);

  const recordsToSave = useMemo(
    () =>
      Object.values(attendanceState)
        .filter((record) => record.isDirty && record.status !== UNMARKED_STATUS)
        .map(
          (record): AttendanceRecordInsert => ({
            studentId: record.studentId,
            status: record.status as AttendanceConcreteStatus,
            note: record.note,
          })
        ),
    [attendanceState]
  );

  recordsToSaveRef.current = recordsToSave;
  markAttendancePendingRef.current = markAttendance.isPending;
  const fallbackRoomLabel = session?.className || t('attendanceTotalsReport.generalRoom') || 'General Room';

  const inProgressRows = useMemo(
    () =>
      Object.values(attendanceState)
        .filter((record) => record.isDirty && record.status !== UNMARKED_STATUS)
        .map((record) => {
          const rosterInfo = rosterLookupByStudentId.get(record.studentId);
          return {
            admissionNo: rosterInfo?.admission_no || '-',
            cardNumber: rosterInfo?.card_number || '-',
            classId: rosterInfo?.class_id || null,
            className: rosterInfo?.class_name || '-',
            fatherName: rosterInfo?.father_name || '-',
            fullName: rosterInfo?.full_name || record.studentId,
            roomName: rosterInfo?.room_name || fallbackRoomLabel,
            status: record.status,
            studentId: record.studentId,
            updatedAt: record.updatedAt ?? 0,
          };
        })
        .filter((record) => filterClassId === 'all' || record.classId === filterClassId)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [attendanceState, fallbackRoomLabel, filterClassId, rosterLookupByStudentId]
  );

  const bufferedScanCount = inProgressRows.length;

  const summaryCards = useMemo(
    () => [
      { color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', description: t('attendancePage.totalInSessionHint') || 'Across all roster students', icon: Users, title: t('attendancePage.totalInSession') || 'Total students', value: sessionSummaryCounts.total },
      { color: 'bg-green-500/10 text-green-600 dark:text-green-400', description: t('attendancePage.savedCountHint') || 'Already saved for this session', icon: CheckCircle2, title: t('attendancePage.savedCount') || 'Saved attendance', value: sessionSummaryCounts.saved },
      { color: 'bg-red-500/10 text-red-600 dark:text-red-400', description: t('attendancePage.pendingReviewHint') || 'Will become absent on close if not reviewed', icon: AlertCircle, title: t('attendancePage.pendingReviewCount') || 'Pending review', value: sessionSummaryCounts.pending },
      { color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', description: t('attendancePage.unsavedChangesHint') || 'Draft changes waiting to be saved', icon: Save, title: t('attendancePage.unsavedChanges') || 'Unsaved changes', value: sessionSummaryCounts.dirty },
    ],
    [sessionSummaryCounts.dirty, sessionSummaryCounts.pending, sessionSummaryCounts.saved, sessionSummaryCounts.total, t]
  );

  const handleUpdateState = (studentId: string, status: AttendanceDraftStatus) => {
    const savedRecord = savedAttendanceByStudentId.get(studentId);

    setAttendanceState((previous) => {
      const next = { ...previous };
      const previousRecord = previous[studentId];
      const source = previousRecord?.source ?? (savedRecord?.entryMethod === 'barcode' ? 'scan' : 'manual');

      if (status === UNMARKED_STATUS) {
        if (savedRecord) {
          next[studentId] = {
            studentId,
            status: savedRecord.status,
            note: savedRecord.note ?? null,
            isDirty: false,
            source,
            updatedAt: previousRecord?.updatedAt ?? savedRecord.markedAt.getTime(),
          };
        } else {
          delete next[studentId];
        }
        return next;
      }

      const note = previous[studentId]?.note ?? savedRecord?.note ?? null;
      const isDirty = !savedRecord || savedRecord.status !== status || (savedRecord.note ?? null) !== note;

      next[studentId] = {
        studentId,
        status,
        note,
        isDirty,
        source,
        updatedAt: Date.now(),
      };

      return next;
    });
  };

  const handleMarkAll = (status: AttendanceConcreteStatus) => {
    if (!orderedRoster.length) return;

    setAttendanceState((previous) => {
      const next = { ...previous };

      orderedRoster.forEach((student) => {
        const savedRecord = savedAttendanceByStudentId.get(student.id);
        const previousRecord = previous[student.id];
        const note = previous[student.id]?.note ?? savedRecord?.note ?? null;
        const isDirty = !savedRecord || savedRecord.status !== status || (savedRecord.note ?? null) !== note;

        next[student.id] = {
          studentId: student.id,
          status,
          note,
          isDirty,
          source: previousRecord?.source ?? 'manual',
          updatedAt: Date.now(),
        };
      });

      return next;
    });
  };

  const applySavedDraftRecords = (savedRecords: AttendanceRecordInsert[]) => {
    setAttendanceState((previous) => {
      const next = { ...previous };

      savedRecords.forEach((record) => {
        const currentRecord = next[record.studentId];
        if (!currentRecord) {
          return;
        }

        const matchesCurrentDraft =
          currentRecord.status === record.status &&
          (currentRecord.note ?? null) === (record.note ?? null);

        if (!matchesCurrentDraft) {
          return;
        }

        next[record.studentId] = {
          ...currentRecord,
          isDirty: false,
        };
      });

      return next;
    });
  };

  const flushAttendanceDrafts = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!selectedSessionId) {
      if (!silent) {
        showToast.error(t('attendancePage.sessionRequired') || 'Please select a session');
      }
      return false;
    }

    const pendingRecords = recordsToSaveRef.current;
    if (!pendingRecords.length) {
      if (!silent) {
        showToast.error(t('attendancePage.noPendingChanges') || 'No attendance changes to save');
      }
      return false;
    }

    if (markAttendancePendingRef.current) {
      return false;
    }

    clearScanIdleSaveTimeout();

    try {
      await markAttendance.mutateAsync({ records: pendingRecords, silent });
      applySavedDraftRecords(pendingRecords);

      if (session?.method === 'barcode' && barcodeView === 'live-scans') {
        void refetchScanFeed();
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('events.error') || 'Failed to save attendance';

      setScanError(message);
      setTimeout(() => setScanError(null), 2500);
      showScanFeedback(
        {
          title: message,
          tone: 'error',
          hint: t('attendancePage.unsavedChangesHint') || 'Draft changes are still waiting to be saved.',
        },
        3500
      );
      return false;
    }
  };

  const scheduleScanIdleSave = (delayMs: number = SCAN_IDLE_SAVE_MS) => {
    if (session?.method !== 'barcode') {
      return;
    }

    clearScanIdleSaveTimeout();
    scanIdleSaveTimeoutRef.current = window.setTimeout(() => {
      scanIdleSaveTimeoutRef.current = null;
      void flushAttendanceDrafts({ silent: true });
    }, delayMs);
  };

  const clearScanInput = () => {
    if (scanInputRef.current) {
      scanInputRef.current.value = '';
      scanInputRef.current.focus();
    }
  };

  const setScanCardNumber = (nextValue: string) => {
    if (scanInputRef.current) {
      scanInputRef.current.value = nextValue;
    }
  };

  const handleSaveAttendance = async ({ silent = false }: { silent?: boolean } = {}) => {
    await flushAttendanceDrafts({ silent });
  };

  const handleScanSubmit = (rawValue?: string) => {
    const scannedValue = (rawValue ?? scanInputRef.current?.value ?? '').replace(/[\n\r]/g, '').trim();

    if (!scannedValue) {
      setScanError(t('attendancePage.scanPrompt') || 'Please enter a card number');
      showScanFeedback({
        title: t('attendancePage.scanPrompt') || 'Please enter a card number',
        tone: 'error',
        details: [],
      });
      setTimeout(() => setScanError(null), 2000);
      clearScanInput();
      return;
    }

    const lastHandledScan = lastHandledScanRef.current;
    const now = Date.now();
    if (lastHandledScan && lastHandledScan.value === scannedValue && now - lastHandledScan.at < SCAN_SUBMIT_DEDUPE_MS) {
      clearScanInput();
      return;
    }
    lastHandledScanRef.current = { at: now, value: scannedValue };

    const foundStudent = studentCache.get(scannedValue);
    if (!foundStudent) {
      const message = rosterStudents.length
        ? t('attendancePage.cardNotFound') || 'Card not found - student not in this session'
        : 'Session roster is not ready yet';

      setScanError(message);
      showScanFeedback(
        {
          title: message,
          tone: 'error',
          details: buildScanFeedbackDetails(null, scannedValue),
        },
        3500
      );
      setTimeout(() => setScanError(null), 2000);
      clearScanInput();
      return;
    }
    if (!foundStudent && rosterStudents.length > 0) {
      setScanError(t('attendancePage.cardNotFound') || 'Card not found – student not in this session');
      showScanFeedback({ tone: 'error', message: t('attendancePage.cardNotFound') || 'Card not found – student not in this session' }, 3500);
      setTimeout(() => setScanError(null), 2000);
      setScanCardNumber('');
      scanInputRef.current?.focus();
      return;
    }

    const savedRecord = savedAttendanceByStudentId.get(foundStudent.id);
    const note = scanNote.trim() || null;

    setScanError(null);
    showScanFeedback({
      title: t('attendancePage.scanSuccess') || 'Attendance recorded',
      tone: 'success',
      details: buildScanFeedbackDetails(foundStudent, scannedValue),
      hint: 'Saved automatically when scanning stops, or when you save or close the session.',
    });

    setScanNote('');
    clearScanInput();
    startTransition(() => {
      setAttendanceState((previous) => {
        const previousRecord = previous[foundStudent.id];
        const nextNote = note ?? previousRecord?.note ?? savedRecord?.note ?? null;
        const isDirty =
          !savedRecord ||
          savedRecord.status !== 'present' ||
          (savedRecord.note ?? null) !== nextNote;

        return {
          ...previous,
          [foundStudent.id]: {
            studentId: foundStudent.id,
            status: 'present',
            note: nextNote,
            isDirty,
            source: 'scan',
            updatedAt: Date.now(),
          },
        };
      });
    });
    scheduleScanIdleSave();
  };

  const handleCloseSession = async () => {
    if (!selectedSessionId || !session) {
      showToast.error(t('attendancePage.sessionRequired') || 'Please select a session');
      return;
    }

    const confirmationMessage =
      sessionSummaryCounts.pending > 0
        ? `${sessionSummaryCounts.pending} ${t('attendancePage.closeConfirmPending') || 'students do not have a saved status yet. Closing will mark them absent. Continue?'}`
        : t('attendancePage.closeConfirmReady') || 'Close this attendance session now?';

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    if (recordsToSaveRef.current.length > 0) {
      const didFlush = await flushAttendanceDrafts({ silent: true });
      if (!didFlush && recordsToSaveRef.current.length > 0) {
        return;
      }
    }

    await closeSession.mutateAsync(selectedSessionId);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
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

      <Card>
        <Collapsible open={isSessionPanelOpen} onOpenChange={setIsSessionPanelOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('attendancePage.selectSession') || 'Select Session'}</CardTitle>
                {isSessionPanelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('attendancePage.selectSession') || 'Select Session'}</Label>
                  {!sessionsLoading && filteredSessions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {filteredSessions.length} {t('attendancePage.openSessions') || 'open session(s)'}
                      {pagination && pagination.total > filteredSessions.length && <span className="ml-1">({pagination.total} total)</span>}
                    </span>
                  )}
                </div>
                <Popover open={isSessionSelectOpen} onOpenChange={setIsSessionSelectOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={isSessionSelectOpen} className="w-full justify-between" disabled={sessionsLoading}>
                      {selectedSessionId && session ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {session.classes?.length ? (
                            session.classes.map((sessionClass) => (
                              <Badge key={sessionClass.id} variant="outline" className="text-xs">
                                {sessionClass.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="font-medium">{session.className || 'Class'}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(session.sessionDate, locale)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('attendancePage.selectSessionPlaceholder') || 'Choose a session...'}</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
                    <Command shouldFilter={false}>
                      <CommandInput placeholder={t('attendancePage.searchSessions') || 'Search sessions...'} value={sessionSearchTerm} onValueChange={setSessionSearchTerm} />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>
                          {sessionsLoading
                            ? t('common.loading') || 'Loading...'
                            : searchableSessions.length === 0 && filteredSessions.length > 0
                              ? t('attendancePage.noSessionsMatchSearch') || 'No sessions match your search'
                              : t('attendancePage.noSessions') || 'No open sessions available'}
                        </CommandEmpty>
                        <CommandGroup>
                          {searchableSessions.map((item) => (
                            <CommandItem
                              key={item.id}
                              value={`${item.className || ''} ${item.classes?.map((sessionClass) => sessionClass.name).join(' ') || ''} ${formatDate(item.sessionDate, locale)}`}
                              onSelect={() => {
                                setSelectedSessionId(item.id);
                                setIsSessionSelectOpen(false);
                                setSessionSearchTerm('');
                              }}
                              className="cursor-pointer"
                            >
                              <Check className={cn('mr-2 h-4 w-4', selectedSessionId === item.id ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {item.classes?.length ? (
                                    item.classes.map((sessionClass) => (
                                      <Badge key={sessionClass.id} variant="outline" className="text-xs">
                                        {sessionClass.name}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="font-medium text-sm">{item.className || 'Class'}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatDate(item.sessionDate, locale)}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.method === 'manual' ? t('attendancePage.manualTab') || 'Manual' : t('attendancePage.barcodeTab') || 'Barcode'}
                                  </Badge>
                                  {new Date(item.sessionDate).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0) && (
                                    <Badge variant="default" className="text-xs">
                                      {t('attendance.today') || 'Today'}
                                    </Badge>
                                  )}
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
                    {session.classes?.length ? (
                      session.classes.map((sessionClass) => (
                        <Badge key={sessionClass.id} variant="outline" className="text-xs">
                          {sessionClass.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {session.className || 'Class'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(session.sessionDate, locale)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {session.method === 'manual' ? t('attendancePage.manualTab') || 'Manual' : t('attendancePage.barcodeTab') || 'Barcode'}
                    </Badge>
                    <Badge variant={session.status === 'open' ? 'default' : 'outline'} className="text-xs">
                      {session.status === 'open' ? t('attendance.open') || 'Open' : t('attendance.closed') || 'Closed'}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {selectedSessionId && session ? (
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>{t('dashboard.markAttendance') || 'Mark Attendance'}</CardTitle>
                  <Badge variant="secondary">
                    {session.method === 'manual' ? t('attendancePage.manualSession') || 'Manual session' : t('attendancePage.barcodeSession') || 'Barcode session'}
                  </Badge>
                  <Badge variant={session.status === 'open' ? 'default' : 'outline'}>
                    {session.status === 'open' ? t('attendance.open') || 'Open' : t('attendance.closed') || 'Closed'}
                  </Badge>
                </div>
                <CardDescription>
                  {session.method === 'manual'
                    ? t('attendancePage.manualWorkflowDescription') || 'Use the in-progress view to set statuses, save them, and close the session when the remaining students should become absent.'
                    : t('attendancePage.barcodeWorkflowDescription') || 'Scans save present students immediately. Review the students without a saved status before closing so you can mark sick, leave, or other exceptions.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {session.status === 'open' ? (
                <Button variant="outline" onClick={() => void handleCloseSession()} disabled={closeSession.isPending || markAttendance.isPending}>
                    <XCircle className="h-4 w-4 mr-2" />
                    {closeSession.isPending ? t('attendancePage.closingSession') || 'Closing session...' : t('attendancePage.closeSession') || 'Close session'}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    {t('attendancePage.sessionClosed') || 'Session closed'}
                  </Badge>
                )}
              </div>
            </div>
            {session.status === 'open' && sessionSummaryCounts.pending > 0 && (
              <div className="rounded-lg border border-dashed border-red-300 bg-red-50/60 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
                <p className="font-medium">{t('attendancePage.pendingReviewBannerTitle') || 'Students still need review before close.'}</p>
                <p className="mt-1">
                  {sessionSummaryCounts.pending}{' '}
                  {t('attendancePage.pendingReviewBannerDescription') || 'students do not have a saved status yet. If you close now, they will be marked absent.'}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {session.classes && session.classes.length > 1 && (
              <FilterPanel title={t('attendancePage.filters') || 'Filters'} defaultOpenDesktop={true} defaultOpenMobile={false}>
                <div className="space-y-2">
                  <Label>{t('attendancePage.filterByClass') || 'Filter by class'}</Label>
                  <Select value={filterClassId} onValueChange={(value) => setFilterClassId(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      {session.classes.map((sessionClass) => (
                        <SelectItem key={sessionClass.id} value={sessionClass.id}>
                          {sessionClass.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FilterPanel>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card key={card.title} className="relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-28 w-28 rounded-full -mr-8 -mt-8 bg-current/10 pointer-events-none opacity-40" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex-1 min-w-0">
                        {card.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg flex-shrink-0 ${card.color}`}>
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-2xl sm:text-3xl font-bold">{card.value}</div>
                      <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <Tabs value={session.method} className="space-y-4">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value={session.method} className="flex items-center gap-2">
                  {session.method === 'manual' ? <ClipboardList className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                  <span>{session.method === 'manual' ? t('attendancePage.manualTab') || 'Manual' : t('attendancePage.barcodeTab') || 'Barcode'}</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4">
                <Tabs key={`${session.id}-manual`} defaultValue="in-progress" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="in-progress">{t('attendancePage.inProgressTab') || 'In progress'}</TabsTrigger>
                    <TabsTrigger value="saved">{t('attendancePage.savedAttendanceTab') || 'Saved attendance'}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="in-progress" className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                      <div className="flex-1 max-w-full sm:max-w-md">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('attendancePage.searchRosterPlaceholder') || 'Search by name, admission, card, or code...'}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="w-full pl-9"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleMarkAll('present')} className="flex-shrink-0">
                          {t('attendancePage.markAllPresent') || 'Mark all present'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleMarkAll('absent')} className="flex-shrink-0">
                          {t('attendancePage.markAllAbsent') || 'Mark all absent'}
                        </Button>
                        <Button onClick={() => void handleSaveAttendance()} disabled={markAttendance.isPending || session.status === 'closed'} className="flex-shrink-0">
                          <Save className="h-4 w-4 mr-2" />
                          {markAttendance.isPending ? t('attendancePage.saveInProgress') || 'Saving...' : t('attendancePage.saveButton') || 'Save attendance'}
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.admissionHeader') || 'Admission'}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                              <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                              <TableHead className="hidden lg:table-cell">{t('attendancePage.reviewStateHeader') || 'Review state'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderedRoster.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-medium">
                                  <div className="flex flex-col sm:hidden gap-1">
                                    <span>{student.full_name}</span>
                                    <span className="text-xs text-muted-foreground">{student.admission_no}</span>
                                  </div>
                                  <span className="hidden sm:inline">{student.full_name}</span>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{student.father_name ?? '—'}</TableCell>
                                <TableCell className="hidden md:table-cell">{student.class_name ?? '—'}</TableCell>
                                <TableCell className="hidden sm:table-cell">{student.admission_no}</TableCell>
                                <TableCell className="hidden md:table-cell">{student.card_number || '—'}</TableCell>
                                <TableCell>{renderStatusSelect(student.id)}</TableCell>
                                <TableCell className="hidden lg:table-cell">{renderReviewStateBadge(student.id)}</TableCell>
                              </TableRow>
                            ))}
                            {!orderedRoster.length && (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                  {searchTerm.trim() || filterClassId !== 'all' ? t('attendancePage.noStudentsMatchSearch') || 'No students match your search' : t('attendancePage.emptyRoster') || 'Select a session with an assigned class to see students.'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="live-scans" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{t('attendancePage.scanFeedTitle') || 'Live scans'}</p>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={t('attendancePage.searchScans') || 'Search scans...'} value={scanFeedSearch} onChange={(event) => setScanFeedSearch(event.target.value)} className="w-full sm:w-48 pl-9" />
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                                <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredScanFeedForDisplay.map((record) => {
                                const rosterInfo = rosterLookupByStudentId.get(record.studentId);
                                return (
                                  <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex flex-col sm:hidden gap-1">
                                        <span>{record.student?.fullName || rosterInfo?.full_name || record.studentId}</span>
                                        <span className="text-xs text-muted-foreground">{record.student?.cardNumber || rosterInfo?.card_number || 'â€”'}</span>
                                      </div>
                                      <span className="hidden sm:inline">{record.student?.fullName || rosterInfo?.full_name || record.studentId}</span>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{rosterInfo?.father_name ?? 'â€”'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{rosterInfo?.class_name ?? 'â€”'}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{record.student?.cardNumber || rosterInfo?.card_number || 'â€”'}</TableCell>
                                    <TableCell>
                                      <StatusBadge status={record.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{format(record.markedAt, 'pp')}</TableCell>
                                  </TableRow>
                                );
                              })}
                              {!filteredScanFeedForDisplay.length && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                                    {!selectedSessionId
                                      ? t('attendancePage.selectSessionForScan') || 'Select a session to enable barcode scanning.'
                                      : scanFeedSearch.trim() || filterClassId !== 'all'
                                        ? t('attendancePage.noScansMatchSearch') || 'No scans match your search'
                                        : t('attendancePage.noScansYet') || 'No scans yet for this session.'}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="saved" className="space-y-4">
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      {t('attendancePage.savedAttendanceDescription') || 'These attendance records are already saved for this session.'}
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.admissionHeader') || 'Admission'}</TableHead>
                              <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                              <TableHead className="hidden lg:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {savedAttendanceRows.map((record) => {
                              const rosterInfo = rosterLookupByStudentId.get(record.studentId);
                              return (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">{record.student?.fullName || rosterInfo?.full_name || record.studentId}</TableCell>
                                  <TableCell className="hidden sm:table-cell">{rosterInfo?.father_name ?? '—'}</TableCell>
                                  <TableCell className="hidden md:table-cell">{rosterInfo?.class_name ?? '—'}</TableCell>
                                  <TableCell className="hidden sm:table-cell">{record.student?.admissionNo || rosterInfo?.admission_no || '—'}</TableCell>
                                  <TableCell>
                                    <StatusBadge status={record.status} />
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">{formatDateTime(record.markedAt, locale)}</TableCell>
                                </TableRow>
                              );
                            })}
                            {!savedAttendanceRows.length && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                  {t('attendancePage.noSavedAttendance') || 'No saved attendance yet for this session.'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
              <TabsContent value="barcode" className="space-y-4">
                <Tabs key={`${session.id}-barcode`} value={barcodeView} onValueChange={(nextValue) => setBarcodeView(nextValue as 'in-progress' | 'pending-review' | 'live-scans' | 'saved')} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="in-progress">{t('attendancePage.inProgressTab') || 'In progress'}</TabsTrigger>
                    <TabsTrigger value="pending-review">{t('attendancePage.pendingReviewTitle') || 'Pending review'}</TabsTrigger>
                    <TabsTrigger value="live-scans">{t('attendancePage.scanFeedTitle') || 'Live scans'}</TabsTrigger>
                    <TabsTrigger value="saved">{t('attendancePage.savedAttendanceTab') || 'Saved attendance'}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="in-progress" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('attendancePage.cardNumberLabel') || 'Card number'}</Label>
                        <div className="relative">
                          <Input
                            data-testid="attendance-scan-card-input"
                            ref={scanInputRef}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (scanError) {
                                setScanError(null);
                              }
                              if (value.includes('\n') || value.includes('\r')) {
                                const cleanValue = value.replace(/[\n\r]/g, '').trim();
                                if (cleanValue) {
                                  event.target.value = cleanValue;
                                  setTimeout(() => {
                                    handleScanSubmit(cleanValue);
                                  }, 0);
                                }
                              }
                            }}
                            placeholder={t('attendancePage.scanPrompt') || 'Enter or scan a card number'}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleScanSubmit();
                              }
                            }}
                            autoFocus
                            autoComplete="off"
                            className="text-lg"
                          />
                          {scanError && <div className="absolute -bottom-6 left-0 right-0 text-sm text-red-600 font-medium animate-in fade-in">{scanError}</div>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('attendancePage.noteLabel') || 'Note'}</Label>
                        <Input value={scanNote} onChange={(event) => setScanNote(event.target.value)} placeholder={t('attendancePage.noteLabel') || 'Note'} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      <Button variant="secondary" onClick={() => scanInputRef.current?.focus()} className="flex-shrink-0">
                        <Activity className="h-4 w-4 mr-2" />
                        {t('attendancePage.focusScanner') || 'Focus scanner'}
                      </Button>
                      <Button variant="outline" onClick={() => void handleSaveAttendance()} disabled={markAttendance.isPending || session.status === 'closed'} className="flex-shrink-0">
                        <Save className="h-4 w-4 mr-2" />
                        {markAttendance.isPending ? t('attendancePage.saveInProgress') || 'Saving...' : t('attendancePage.saveButton') || 'Save attendance'}
                      </Button>
                      <Button onClick={() => void handleScanSubmit()} disabled={!selectedSessionId || session.status === 'closed'} className="flex-shrink-0">
                        <ScanLine className="h-4 w-4 mr-2" />
                        {bufferedScanCount > 0 ? `${t('attendancePage.recordScan') || 'Record scan'} (${bufferedScanCount})` : t('attendancePage.recordScan') || 'Record scan'}
                      </Button>
                    </div>
                    {scanFeedback && (
                      <div
                        aria-live="polite"
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm font-medium',
                          scanFeedback.tone === 'success' && 'border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300',
                          scanFeedback.tone === 'error' && 'border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300',
                          scanFeedback.tone === 'info' && 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300'
                        )}
                      >
                        <p className="font-semibold">{scanFeedback.title || scanFeedback.message}</p>
                        {!!scanFeedback.details?.length && (
                          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                            {scanFeedback.details.map((detail) => (
                              <div key={`${detail.label}-${detail.value}`} className="rounded border border-current/15 bg-white/40 px-2 py-1 dark:bg-black/10">
                                <p className="text-[11px] uppercase tracking-wide opacity-70">{detail.label}</p>
                                <p className="truncate">{detail.value}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {scanFeedback.hint && <p className="mt-2 text-xs opacity-80">{scanFeedback.hint}</p>}
                      </div>
                    )}

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('attendancePage.inProgressTab') || 'In progress'}</CardTitle>
                        <CardDescription>
                          Buffered barcode scans stay here until scanning stops, or until you save or close the session.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-md overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                                  <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                                  <TableHead className="hidden lg:table-cell">{t('attendanceTotalsReport.room') || 'Room'}</TableHead>
                                  <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                                  <TableHead className="hidden md:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {inProgressRows.map((record) => (
                                  <TableRow key={record.studentId}>
                                    <TableCell className="font-medium">{record.fullName}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{record.fatherName}</TableCell>
                                    <TableCell className="hidden md:table-cell">{record.className}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{record.cardNumber}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{record.roomName}</TableCell>
                                    <TableCell>
                                      <StatusBadge status={record.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{record.updatedAt ? format(new Date(record.updatedAt), 'pp') : '-'}</TableCell>
                                  </TableRow>
                                ))}
                                {!inProgressRows.length && (
                                  <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                      No draft attendance changes are waiting to be saved.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {barcodeView === 'pending-review' && (
                    <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('attendancePage.pendingReviewTitle') || 'Pending review'}</CardTitle>
                        <CardDescription>
                          {t('attendancePage.pendingReviewDescription') || 'Students without a saved status will become absent when the session closes. Review exceptions here first.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-md overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                                  <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.admissionHeader') || 'Admission'}</TableHead>
                                  <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                                  <TableHead className="hidden lg:table-cell">{t('attendancePage.reviewStateHeader') || 'Review state'}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pendingReviewStudents.map((student) => (
                                  <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.full_name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{student.father_name ?? '—'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{student.class_name ?? '—'}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{student.admission_no}</TableCell>
                                    <TableCell>{renderStatusSelect(student.id)}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{renderReviewStateBadge(student.id)}</TableCell>
                                  </TableRow>
                                ))}
                                {!pendingReviewStudents.length && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                      {t('attendancePage.pendingReviewEmpty') || 'Everyone in this view already has a saved attendance status.'}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="hidden space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{t('attendancePage.scanFeedTitle') || 'Live scans'}</p>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={t('attendancePage.searchScans') || 'Search scans...'} value={scanFeedSearch} onChange={(event) => setScanFeedSearch(event.target.value)} className="w-full sm:w-48 pl-9" />
                        </div>
                      </div>
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                                <TableHead className="hidden sm:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                                <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                                <TableHead className="hidden md:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredScanFeedForDisplay.map((record) => {
                                const rosterInfo = rosterLookupByStudentId.get(record.studentId);
                                return (
                                  <TableRow key={record.id} className={cn(lastScanId === record.id ? 'bg-primary/5' : undefined)}>
                                    <TableCell className="font-medium">
                                      <div className="flex flex-col sm:hidden gap-1">
                                        <span>{record.student?.fullName || rosterInfo?.full_name || record.studentId}</span>
                                        <span className="text-xs text-muted-foreground">{record.student?.cardNumber || rosterInfo?.card_number || '—'}</span>
                                      </div>
                                      <span className="hidden sm:inline">{record.student?.fullName || rosterInfo?.full_name || record.studentId}</span>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{rosterInfo?.father_name ?? '—'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{rosterInfo?.class_name ?? '—'}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{record.student?.cardNumber || rosterInfo?.card_number || '—'}</TableCell>
                                    <TableCell>
                                      <StatusBadge status={record.status} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{format(record.markedAt, 'pp')}</TableCell>
                                  </TableRow>
                                );
                              })}
                              {!filteredScanFeedForDisplay.length && (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                                    {!selectedSessionId
                                      ? t('attendancePage.selectSessionForScan') || 'Select a session to enable barcode scanning.'
                                      : scanFeedSearch.trim() || filterClassId !== 'all'
                                        ? t('attendancePage.noScansMatchSearch') || 'No scans match your search'
                                        : t('attendancePage.noScansYet') || 'No scans yet for this session.'}
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                    </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pending-review" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{t('attendancePage.pendingReviewTitle') || 'Pending review'}</CardTitle>
                        <CardDescription>
                          {t('attendancePage.pendingReviewDescription') || 'Students without a saved or draft status will become absent when the session closes. Review exceptions here first.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-md overflow-hidden">
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                                  <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                                  <TableHead className="hidden sm:table-cell">{t('attendancePage.admissionHeader') || 'Admission'}</TableHead>
                                  <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                                  <TableHead className="hidden lg:table-cell">{t('attendancePage.reviewStateHeader') || 'Review state'}</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {pendingReviewStudents.map((student) => (
                                  <TableRow key={student.id}>
                                    <TableCell className="font-medium">{student.full_name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{student.father_name ?? '-'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{student.class_name ?? '-'}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{student.admission_no}</TableCell>
                                    <TableCell>{renderStatusSelect(student.id)}</TableCell>
                                    <TableCell className="hidden lg:table-cell">{renderReviewStateBadge(student.id)}</TableCell>
                                  </TableRow>
                                ))}
                                {!pendingReviewStudents.length && (
                                  <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                      {t('attendancePage.pendingReviewEmpty') || 'Everyone already has a saved or draft attendance status.'}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="saved" className="space-y-4">
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      {t('attendancePage.savedAttendanceDescription') || 'These attendance records are already saved for this session.'}
                    </div>
                    <div className="border rounded-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('attendancePage.studentHeader') || 'Student'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.fatherHeader') || 'Father'}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('attendancePage.classHeader') || 'Class'}</TableHead>
                              <TableHead className="hidden sm:table-cell">{t('attendancePage.cardHeader') || 'Card'}</TableHead>
                              <TableHead>{t('attendancePage.statusHeader') || 'Status'}</TableHead>
                              <TableHead className="hidden md:table-cell">{t('attendancePage.timeHeader') || 'Time'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {savedAttendanceRows.map((record) => {
                              const rosterInfo = rosterLookupByStudentId.get(record.studentId);
                              return (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">{record.student?.fullName || rosterInfo?.full_name || record.studentId}</TableCell>
                                  <TableCell className="hidden sm:table-cell">{rosterInfo?.father_name ?? '—'}</TableCell>
                                  <TableCell className="hidden md:table-cell">{rosterInfo?.class_name ?? '—'}</TableCell>
                                  <TableCell className="hidden sm:table-cell">{record.student?.cardNumber || rosterInfo?.card_number || '—'}</TableCell>
                                  <TableCell>
                                    <StatusBadge status={record.status} />
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">{formatDateTime(record.markedAt, locale)}</TableCell>
                                </TableRow>
                              );
                            })}
                            {!savedAttendanceRows.length && (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                  {t('attendancePage.noSavedAttendance') || 'No saved attendance yet for this session.'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
