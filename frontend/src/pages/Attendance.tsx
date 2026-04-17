import { format } from 'date-fns';
import { BookOpen, CalendarDays, ChevronRight, ClipboardList, GraduationCap, Pencil, QrCode, School, ScanLine, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAttendanceSessions, useCreateAttendanceSession } from '@/hooks/useAttendance';
import { useClasses } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { AttendanceSessionInsert } from '@/types/domain/attendance';


export default function Attendance() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string>('');
  const [sessionMethod, setSessionMethod] = useState<'manual' | 'barcode'>('manual');
  const [sessionRemarks, setSessionRemarks] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [studentType, setStudentType] = useState<'all' | 'boarders' | 'day_scholars'>('all');


  const { sessions, pagination, page, pageSize, setPage, setPageSize, isLoading: sessionsLoading } = useAttendanceSessions({}, true);
  const createSession = useCreateAttendanceSession();

  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessions.length > 0) {
      const foundSession = sessions.find(s => s.id === sessionId);
      if (foundSession) {
        setSelectedSessionId(sessionId);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, sessions, setSearchParams]);

  const { data: classes } = useClasses();
  const { data: schools } = useSchools();

  useEffect(() => {
    if (schools && schools.length === 1 && selectedSchool === 'all') {
      setSelectedSchool(schools[0].id);
    }
  }, [schools, selectedSchool]);

  const handleCreateSession = async () => {
    const classIdsToUse = selectedClassIds.length > 0 ? selectedClassIds : (selectedClass ? [selectedClass] : []);

    if (classIdsToUse.length === 0 || !sessionDate) {
      showToast.error(t('attendancePage.sessionHint') || 'Please select at least one class and date');
      return;
    }

    const payload: AttendanceSessionInsert = {
      classIds: classIdsToUse,
      classId: classIdsToUse[0],
      schoolId: selectedSchool === 'all' ? null : selectedSchool || null,
      sessionDate: new Date(sessionDate),
      method: sessionMethod,
      remarks: sessionRemarks || undefined,
      studentType,
    };

    try {
      const created = await createSession.mutateAsync(payload);
      setSelectedSessionId(created.id);
      setSelectedClass('');
      setSelectedClassIds([]);
      setSessionDate('');
      setSessionRemarks('');
      setStudentType('all');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('events.error');
      showToast.error(message || t('events.error'));
    }
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const studentTypeOptions = [
    { value: 'all' as const, label: t('attendancePage.studentTypeAll') || 'All Students', icon: Users },
    { value: 'boarders' as const, label: t('attendancePage.studentTypeBoarders') || 'Boarders', icon: School },
    { value: 'day_scholars' as const, label: t('attendancePage.studentTypeDayScholars') || 'Day Scholars', icon: GraduationCap },
  ];

  return (
    <div className="container mx-auto py-4 max-w-7xl px-4 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Creation Form ── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-base leading-tight">{t('nav.attendance')}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('attendancePage.markAttendanceDescription')}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* Class Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('attendancePage.classLabel')}
                  </Label>
                  {selectedClassIds.length > 0 && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {selectedClassIds.length} selected
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border bg-muted/20 min-h-[56px] max-h-44 overflow-y-auto">
                  {(classes || []).map(cls => {
                    const isSelected = selectedClassIds.includes(cls.id);
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClass(cls.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 select-none',
                          'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted'
                        )}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />}
                        {cls.name}
                      </button>
                    );
                  })}
                  {!(classes || []).length && (
                    <p className="text-xs text-muted-foreground self-center">No classes available</p>
                  )}
                </div>
                {selectedClassIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('attendancePage.selectAtLeastOneClass') || 'Select at least one class to continue'}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('attendancePage.dateLabel')}
                </Label>
                <CalendarDatePicker
                  date={sessionDate ? parseLocalDate(sessionDate) : undefined}
                  onDateChange={(date) => setSessionDate(date ? dateToLocalYYYYMMDD(date) : '')}
                  placeholder="Select date"
                />
              </div>

              {/* Method Toggle */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">{t('attendancePage.methodLabel')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: 'manual' as const, label: t('attendancePage.manualTab'), icon: Pencil, desc: 'Enter manually' },
                      { value: 'barcode' as const, label: t('attendancePage.barcodeTab'), icon: ScanLine, desc: 'Scan cards' },
                    ] as const
                  ).map(opt => {
                    const Icon = opt.icon;
                    const active = sessionMethod === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSessionMethod(opt.value)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          active
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border hover:border-primary/40 hover:bg-muted/50'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        <div>
                          <p className="text-sm font-medium leading-none">{opt.label}</p>
                          <p className={cn('text-xs mt-0.5', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Type */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">{t('attendancePage.studentTypeLabel') || 'Student Type'}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {studentTypeOptions.map(opt => {
                    const Icon = opt.icon;
                    const active = studentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setStudentType(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          active
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background border-border hover:border-primary/40 hover:bg-muted/50'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-primary-foreground' : 'text-muted-foreground')} />
                        <span className={cn('text-xs font-medium leading-tight', active ? 'text-primary-foreground' : 'text-foreground')}>
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('attendancePage.studentTypeHint') || 'Day scholars will not be marked absent in boarder sessions.'}
                </p>
              </div>

              {/* School — only show when more than one */}
              {schools && schools.length > 1 && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('attendancePage.schoolLabel')}
                  </Label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={t('attendancePage.schoolLabel')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('subjects.all')}</SelectItem>
                      {schools.map(school => (
                        <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">{t('attendancePage.notesLabel')}</Label>
                <Textarea
                  value={sessionRemarks}
                  onChange={e => setSessionRemarks(e.target.value)}
                  placeholder={t('attendancePage.notesLabel')}
                  className="rounded-xl resize-none min-h-[80px]"
                />
              </div>

              {/* Submit */}
              <Button
                onClick={handleCreateSession}
                disabled={createSession.isPending}
                className="w-full h-11 rounded-xl text-sm font-semibold gap-2"
                size="lg"
              >
                <ClipboardList className="h-4 w-4" />
                {createSession.isPending ? 'Creating…' : t('attendancePage.createButton')}
              </Button>

            </div>
          </div>
        </div>

        {/* ── Recent Sessions ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden sticky top-4">
            <div className="px-5 py-4 border-b bg-muted/30">
              <h2 className="font-semibold text-base">{t('attendancePage.recentSessions')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t('attendancePage.recentSessionsDescription')}</p>
            </div>

            <div className="divide-y max-h-[calc(100vh-220px)] overflow-y-auto">
              {(sessions || []).map(item => {
                const isSelected = selectedSessionId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSessionId(item.id)}
                    className={cn(
                      'group flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Status dot */}
                    <div className={cn(
                      'mt-1 h-2 w-2 rounded-full shrink-0',
                      item.status === 'open' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    )} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.classes && item.classes.length > 0 ? (
                          item.classes.map(cls => (
                            <span key={cls.id} className="text-sm font-medium">{cls.name}</span>
                          ))
                        ) : (
                          <span className="text-sm font-medium">{item.className || 'Class'}</span>
                        )}
                        {item.studentType && item.studentType !== 'all' && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              item.studentType === 'boarders'
                                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            )}
                          >
                            {item.studentType === 'boarders'
                              ? (t('attendancePage.studentTypeBoarders') || 'Boarders')
                              : (t('attendancePage.studentTypeDayScholars') || 'Day Scholars')
                            }
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{format(item.sessionDate, 'PPP')}</span>
                        <span className="text-muted-foreground/40 text-xs">·</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {item.method === 'barcode'
                            ? <><QrCode className="h-3 w-3" /> {t('attendancePage.barcodeTab')}</>
                            : <><Pencil className="h-3 w-3" /> {t('attendancePage.manualTab')}</>
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={item.status === 'open' ? 'default' : 'outline'}
                        className="text-[10px] px-1.5 py-0 h-5"
                      >
                        {item.status}
                      </Badge>
                      {item.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/attendance/marking?session=${item.id}`);
                          }}
                          className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/10"
                          title={t('attendancePage.reviewInMarking') || 'Review in marking'}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {!sessions?.length && !sessionsLoading && (
                <div className="px-5 py-10 text-center">
                  <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('attendancePage.noSessions')}</p>
                </div>
              )}

              {sessionsLoading && (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">Loading…</p>
                </div>
              )}
            </div>

            {pagination && (
              <div className="px-5 py-3 border-t bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {pagination.from || 0}–{pagination.to || 0} / {pagination.total || 0}
                  </span>
                  <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                    <SelectTrigger className="w-20 h-7 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map(size => (
                        <SelectItem key={size} value={String(size)}>{size} / page</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1 || sessionsLoading} onClick={() => setPage(1)} className="h-7 w-7 p-0 rounded-lg text-xs">«</Button>
                  <Button variant="outline" size="sm" disabled={page <= 1 || sessionsLoading} onClick={() => setPage(page - 1)} className="h-7 px-2.5 rounded-lg text-xs">
                    {t('events.previous') || 'Prev'}
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    {pagination.current_page} / {pagination.last_page}
                  </span>
                  <Button variant="outline" size="sm" disabled={page >= (pagination.last_page || 1) || sessionsLoading} onClick={() => setPage(page + 1)} className="h-7 px-2.5 rounded-lg text-xs">
                    {t('events.next') || 'Next'}
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= (pagination.last_page || 1) || sessionsLoading} onClick={() => setPage(pagination.last_page || 1)} className="h-7 w-7 p-0 rounded-lg text-xs">»</Button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
