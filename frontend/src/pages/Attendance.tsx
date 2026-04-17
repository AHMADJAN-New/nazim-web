import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      studentType,
    };

    try {
      const created = await createSession.mutateAsync(payload);
      setSelectedSessionId(created.id);
      // Reset form
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

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('nav.attendance')}</CardTitle>
          <CardDescription className="text-sm">{t('attendancePage.markAttendanceDescription')}</CardDescription>
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
            <CalendarDatePicker date={sessionDate ? parseLocalDate(sessionDate) : undefined} onDateChange={(date) => setSessionDate(date ? dateToLocalYYYYMMDD(date) : "")} placeholder="Select date" />
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
            <Label>{t('attendancePage.studentTypeLabel') || 'Student Type'}</Label>
            <Select value={studentType} onValueChange={value => setStudentType(value as 'all' | 'boarders' | 'day_scholars')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('attendancePage.studentTypeAll') || 'All Students'}</SelectItem>
                <SelectItem value="boarders">{t('attendancePage.studentTypeBoarders') || 'Boarders Only'}</SelectItem>
                <SelectItem value="day_scholars">{t('attendancePage.studentTypeDayScholars') || 'Day Scholars Only'}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('attendancePage.studentTypeHint') || 'Choose which students are included in this session. Day scholars will not be marked absent in boarder sessions.'}
            </p>
          </div>
          <div className="space-y-3">
            <Label>{t('attendancePage.schoolLabel')}</Label>
            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger>
                <SelectValue placeholder={t('attendancePage.schoolLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
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
                            item.classes.map((cls) => (
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
                        {item.studentType && item.studentType !== 'all' && (
                          <Badge variant="outline" className={item.studentType === 'boarders' ? 'bg-blue-50 text-blue-700 border-blue-200 text-xs' : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-xs'}>
                            {item.studentType === 'boarders' ? (t('attendancePage.studentTypeBoarders') || 'Boarders') : (t('attendancePage.studentTypeDayScholars') || 'Day Scholars')}
                          </Badge>
                        )}
                      </div>
                      {item.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/attendance/marking?session=${item.id}`);
                          }}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                          title={t('attendancePage.reviewInMarking') || 'Review in marking'}
                        >
                          <ClipboardList className="h-4 w-4" />
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
              <div className="space-y-3 pt-3 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {t('library.showing') || 'Showing'} {pagination.from || 0} {t('events.to') || 'to'} {pagination.to || 0} {t('events.of') || 'of'} {pagination.total || 0} {t('attendancePage.sessions') || 'sessions'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100].map(size => (
                          <SelectItem key={size} value={String(size)}>{size} {t('library.perPage') || '/ page'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1 || sessionsLoading} 
                    onClick={() => setPage(1)}
                    className="h-8 w-8 p-0"
                    title={t('events.first') || 'First page'}
                  >
                    «
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1 || sessionsLoading} 
                    onClick={() => setPage(page - 1)}
                    className="h-8"
                  >
                    {t('events.previous') || 'Previous'}
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm text-muted-foreground">
                      {t('events.page') || 'Page'} {pagination.current_page} {t('events.of') || 'of'} {pagination.last_page}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= (pagination.last_page || 1) || sessionsLoading} 
                    onClick={() => setPage(page + 1)}
                    className="h-8"
                  >
                    {t('events.next') || 'Next'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= (pagination.last_page || 1) || sessionsLoading} 
                    onClick={() => setPage(pagination.last_page || 1)}
                    className="h-8 w-8 p-0"
                    title={t('events.last') || 'Last page'}
                  >
                    »
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
