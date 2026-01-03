import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ClipboardList, X } from 'lucide-react';
import { useAttendanceSession, useAttendanceSessions, useCreateAttendanceSession, useCloseAttendanceSession } from '@/hooks/useAttendance';
import type { AttendanceSessionInsert } from '@/types/domain/attendance';
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
import { showToast } from '@/lib/toast';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';


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


  const { sessions, pagination, page, pageSize, setPage, setPageSize, isLoading: sessionsLoading } = useAttendanceSessions({}, true);
  const { session } = useAttendanceSession(selectedSessionId || undefined);
  const createSession = useCreateAttendanceSession();
  const closeSession = useCloseAttendanceSession();
  
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
  const { data: classes } = useClasses();
  const { data: schools } = useSchools();


  // Auto-select school if there's only one school
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
      showToast.error(error.message || t('common.error'));
    }
  };

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4 overflow-x-hidden">
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
    </div>
  );
}
