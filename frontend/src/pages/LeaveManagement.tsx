import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, addWeeks } from 'date-fns';
import { Calendar, CheckCircle2, Download, Eye, FileText, Loader2, Printer, Shield, UserRound, Zap, Search, Scan } from 'lucide-react';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveRequests';
import { useStudents, type Student } from '@/hooks/useStudents';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { showToast } from '@/lib/toast';
import { leaveRequestsApi, studentAdmissionsApi } from '@/lib/api/client';
import type { LeaveRequest, LeaveRequestInsert } from '@/types/domain/leave';
import { mapLeaveRequestApiToDomain } from '@/mappers/leaveMapper';
import { useLanguage } from '@/hooks/useLanguage';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function LeaveManagement() {
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [leaveType, setLeaveType] = useState<'full_day' | 'partial_day' | 'time_bound'>('full_day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<number | undefined>(undefined);
  const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
  const [historyStudent, setHistoryStudent] = useState<{ id: string; name?: string; code?: string; className?: string | null } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fastSearch, setFastSearch] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get current academic year
  const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);
  
  // Get class academic years for current academic year
  const { data: classAcademicYears } = useClassAcademicYears(
    currentAcademicYear?.id,
    profile?.organization_id
  );

  const { requests, pagination, page, pageSize, setPage, setPageSize, isLoading } = useLeaveRequests({
    studentId: selectedStudent || undefined,
    classId: selectedClass || undefined,
    month: filterMonth,
    year: filterYear,
  });

  // Get all students - will be filtered by class client-side
  const { data: allStudents } = useStudents(undefined, false);
  const students: Student[] = (allStudents as Student[]) || [];

  const createLeave = useCreateLeaveRequest();
  const approveLeave = useApproveLeaveRequest();
  const rejectLeave = useRejectLeaveRequest();

  // Get classes from class academic years (only for current academic year)
  const classOptions = useMemo<ComboboxOption[]>(() => {
    if (!classAcademicYears) return [];
    // Get unique classes from class academic years
    const uniqueClasses = new Map<string, { id: string; name: string; section?: string }>();
    classAcademicYears.forEach(cay => {
      if (cay.class && !uniqueClasses.has(cay.classId)) {
        const className = cay.sectionName 
          ? `${cay.class.name} - ${cay.sectionName}`
          : cay.class.name;
        uniqueClasses.set(cay.classId, {
          id: cay.classId,
          name: className,
          section: cay.sectionName || undefined,
        });
      }
    });
    return Array.from(uniqueClasses.values()).map(cls => ({
      value: cls.id,
      label: cls.name,
    }));
  }, [classAcademicYears]);

  // Filter students by selected class
  // When a class is selected, we should ideally filter by class, but for now show all
  // The selected student from search should always be available
  const filteredStudents = useMemo<Student[]>(() => {
    if (!students.length) return [];
    // If class is selected, we could filter, but for now show all to ensure searched student is available
    // The selected student ID is preserved even if not in filtered list
    return students;
  }, [students]);

  // Memoized options for searchable comboboxes
  const studentOptions = useMemo<ComboboxOption[]>(() => {
    if (!filteredStudents) return [];
    return filteredStudents.map(student => {
      const name = student.fullName || 'Unknown';
      const code = student.studentCode || student.admissionNumber || '';
      const card = student.cardNumber || '';
      
      // Create label that's both searchable and displayable
      // Format: "Name (Code) [Card]" for better readability in combobox
      let displayLabel = name;
      if (code) {
        displayLabel += ` (${code})`;
      }
      if (card) {
        displayLabel += ` [Card: ${card}]`;
      }
      
      return {
        value: student.id,
        // Label includes all searchable terms - Command will search in this
        label: displayLabel,
      };
    });
  }, [filteredStudents]);
  
  // Ensure selected student is always in options (for when student is selected via search)
  const studentOptionsWithSelected = useMemo<ComboboxOption[]>(() => {
    if (!selectedStudent || !students.length) return studentOptions;
    
    // Check if selected student is already in options
    const hasSelected = studentOptions.some(opt => opt.value === selectedStudent);
    if (hasSelected) return studentOptions;
    
    // If not, find the student and add it
    const selectedStudentData = students.find(s => s.id === selectedStudent);
    if (selectedStudentData) {
      const name = selectedStudentData.fullName || 'Unknown';
      const code = (selectedStudentData.studentCode ?? selectedStudentData.admissionNumber) || '';
      const card = selectedStudentData.cardNumber ?? '';
      
      let displayLabel = name;
      if (code) {
        displayLabel += ` (${code})`;
      }
      if (card) {
        displayLabel += ` [Card: ${card}]`;
      }
      
      return [
        { value: selectedStudent, label: displayLabel },
        ...studentOptions,
      ];
    }
    
    return studentOptions;
  }, [studentOptions, selectedStudent, allStudents]);

  // Reset student when class changes
  useEffect(() => {
    setSelectedStudent('');
  }, [selectedClass]);

  const handleCreate = async () => {
    if (!selectedStudent || !startDate || !endDate) {
      showToast.error('leave.requiredFields');
      return;
    }

    // Get class academic year ID for the selected class
    const classAcademicYear = classAcademicYears?.find(cay => cay.classId === selectedClass);
    
    const payload: LeaveRequestInsert = {
      studentId: selectedStudent,
      classId: selectedClass || null,
      schoolId: null, // Removed - students exist in schools
      academicYearId: currentAcademicYear?.id || null,
      leaveType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      startTime: startTime || null,
      endTime: endTime || null,
      reason,
      approvalNote: approvalNote || null,
    };

    try {
      await createLeave.mutateAsync(payload);
      // Reset form after successful creation
      setSelectedStudent('');
      // Keep class selected for faster entry
      setLeaveType('full_day');
      setStartDate('');
      setEndDate('');
      setStartTime('');
      setEndTime('');
      setReason('');
      setApprovalNote('');
      showToast.success('leave.requestCreated');
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleApprove = async (request: LeaveRequest) => {
    try {
      await approveLeave.mutateAsync({ id: request.id, note: approvalNote || undefined });
      setApprovalNote('');
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleReject = async (request: LeaveRequest) => {
    try {
      await rejectLeave.mutateAsync({ id: request.id, note: approvalNote || undefined });
      setApprovalNote('');
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleViewHistory = (request: LeaveRequest) => {
    setHistoryStudent({
      id: request.studentId,
      name: request.student?.fullName || t('leave.student'),
      code: request.student?.studentCode || request.student?.admissionNo || undefined,
      className: request.className,
    });
    setHistoryOpen(true);
  };

  const { data: historyData, isLoading: historyLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-history', historyStudent?.id],
    queryFn: async () => {
      if (!historyStudent?.id) return [] as LeaveRequest[];
      const response = await leaveRequestsApi.list({ student_id: historyStudent.id, per_page: 100 });
      if (response && typeof response === 'object' && 'data' in (response as any)) {
        return ((response as any).data as any[]).map(mapLeaveRequestApiToDomain);
      }
      return (response as any[]).map(mapLeaveRequestApiToDomain);
    },
    enabled: !!historyStudent?.id,
  });

  const handlePrint = async (request: LeaveRequest) => {
    const data = await leaveRequestsApi.printData(request.id) as { scan_url: string };
    const scanUrl = data.scan_url;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;
    const doc = window.open('', '_blank');
    if (!doc) return;
    doc.document.write(`
      <html><head><title>${t('leave.leaveRequest')}</title>
      <style>body{font-family: Arial;padding:16px;} .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;} .row{display:flex;justify-content:space-between;margin-bottom:8px;} .label{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;} .value{font-weight:600;font-size:14px;} .qr{margin-top:16px;text-align:center;}</style>
      </head><body>
        <div class="card">
          <div class="row"><div class="label">${t('leave.student')}</div><div class="value">${request.student?.fullName || ''}</div></div>
          <div class="row"><div class="label">${t('leave.code')}</div><div class="value">${request.student?.studentCode || ''}</div></div>
          <div class="row"><div class="label">${t('attendancePage.class')}</div><div class="value">${request.className || ''}</div></div>
          <div class="row"><div class="label">${t('leave.datesLabel')}</div><div class="value">${format(request.startDate, 'PP')} → ${format(request.endDate, 'PP')}</div></div>
          <div class="row"><div class="label">${t('leave.reason')}</div><div class="value">${request.reason}</div></div>
          <div class="qr"><img src="${qrUrl}" alt="QR" /></div>
          <p style="text-align:center;color:#475569;font-size:12px">${t('leave.scanToVerify')}</p>
        </div>
        <script>window.print(); setTimeout(() => window.close(), 400);</script>
      </body></html>
    `);
    doc.document.close();
  };

  const sortedRequests = useMemo(() => {
    return [...(requests as LeaveRequest[])].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }, [requests]);

  const historySummary = useMemo(() => {
    const entries = historyData || [];
    const counts: Record<LeaveRequest['status'] | 'total', number> = {
      total: entries.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
    };

    const byMonth: Record<string, number> = {};

    entries.forEach(entry => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
      const key = format(entry.startDate, 'yyyy-MM');
      byMonth[key] = (byMonth[key] || 0) + 1;
    });

    return { counts, byMonth };
  }, [historyData]);

  // Quick entry handlers for common durations
  const handleQuickEntry = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = addDays(today, days - 1);
    
    setStartDate(format(today, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const quickEntryOptions = useMemo(() => [
    { label: t('leave.oneDay'), days: 1 },
    { label: t('leave.twoDays'), days: 2 },
    { label: t('leave.threeDays'), days: 3 },
    { label: t('leave.oneWeek'), days: 7 },
    { label: t('leave.twoWeeks'), days: 14 },
    { label: t('leave.oneMonth'), days: 30 },
  ], [t]);

  // Quick reason options for common leave reasons
  const quickReasonOptions = useMemo(() => [
    { label: t('leave.sick').split(' - ')[0], reason: t('leave.sick') },
    { label: t('leave.gettingOutside').split(' - ')[0], reason: t('leave.gettingOutside') },
    { label: t('leave.familyEmergency').split(' - ')[0], reason: t('leave.familyEmergency') },
    { label: t('leave.medicalAppointment').split(' - ')[0], reason: t('leave.medicalAppointment') },
    { label: t('leave.personal').split(' - ')[0], reason: t('leave.personal') },
    { label: t('leave.familyEvent').split(' - ')[0], reason: t('leave.familyEvent') },
    { label: t('leave.travel').split(' - ')[0], reason: t('leave.travel') },
    { label: t('leave.religious').split(' - ')[0], reason: t('leave.religious') },
  ], [t]);

  const handleQuickReason = (reasonText: string) => {
    setReason(reasonText);
    // Focus on approval note or submit button
    setTimeout(() => {
      const approvalNoteInput = document.getElementById('approval-note');
      approvalNoteInput?.focus();
    }, 100);
  };

  // Fast search handler - search by card number, student code, or admission number
  const handleFastSearch = useCallback(async (searchValue: string) => {
    if (!searchValue.trim() || !students.length || !currentAcademicYear || !profile?.organization_id) {
      if (!currentAcademicYear) {
        showToast.error('leave.academicYearNotLoaded');
      }
      return;
    }
    
    const trimmedSearch = searchValue.trim().toLowerCase();
    setIsSearching(true);
    
    try {
      // Search in all students by card number, student code, or admission number
      const foundStudent = students.find(student => {
        const card = (student.cardNumber ?? '').toLowerCase();
        const code = (student.studentCode ?? '').toLowerCase();
        const admission = (student.admissionNumber ?? '').toLowerCase();
        const id = student.id.toLowerCase();
        
        return card === trimmedSearch || 
               code === trimmedSearch || 
               admission === trimmedSearch ||
               id === trimmedSearch;
      });

      if (!foundStudent) {
        showToast.error('leave.studentNotFound');
        setIsSearching(false);
        return;
      }

      // Get student's admission for current academic year to find their class
      try {
        const admissions = await studentAdmissionsApi.list({
          organization_id: profile.organization_id,
          student_id: foundStudent.id,
          academic_year_id: currentAcademicYear.id,
        });

        // Handle both paginated and non-paginated responses
        let admission: any = null;
        if (Array.isArray(admissions)) {
          admission = admissions.find((a: any) => a.academic_year_id === currentAcademicYear.id && a.class_id);
        } else if (admissions && typeof admissions === 'object' && 'data' in admissions) {
          admission = (admissions as any).data?.find((a: any) => a.academic_year_id === currentAcademicYear.id && a.class_id);
        }

        if (admission && admission.class_id) {
          // Check if the class exists in our class options
          const classExists = classOptions.some(opt => opt.value === admission.class_id);
          
          if (classExists) {
            // Set class and student together
            setSelectedClass(admission.class_id);
            setSelectedStudent(foundStudent.id);
            setFastSearch(''); // Clear search field
            const className = classOptions.find(c => c.value === admission.class_id)?.label || t('leave.unknown');
            showToast.success('leave.studentFound', { name: foundStudent.fullName, class: className });
            
            // Focus on reason field for quick entry after a brief delay
            setTimeout(() => {
              const reasonInput = document.getElementById('reason');
              reasonInput?.focus();
            }, 200);
          } else {
            showToast.error('leave.classNotAvailable');
          }
        } else {
          showToast.error('leave.studentNotEnrolled');
        }
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch student admission:', error);
        }
        showToast.error('leave.couldNotDetermineClass');
      }
    } catch (error: any) {
      showToast.error(error.message || 'leave.failedToSearchStudent');
    } finally {
      setIsSearching(false);
    }
  }, [students, currentAcademicYear, profile?.organization_id, classOptions, t]);

  // Handle Enter key for immediate search (no auto-search on typing)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && fastSearch.trim() && !isSearching) {
      e.preventDefault();
      handleFastSearch(fastSearch);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col md:flex-row md:items-center ${isRTL ? 'md:flex-row-reverse' : ''} md:justify-between gap-3 mb-6`}>
        <div>
          <h1 className="text-2xl font-bold">{t('leave.title')}</h1>
          <p className="text-muted-foreground">
            {t('leave.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-white ${isRTL ? 'flex-row-reverse' : ''}`}><Shield className="h-5 w-5" /> {t('leave.leaveGovernance')}</CardTitle>
            <CardDescription className="text-slate-200">{t('leave.qrReadySlips')}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('leave.currentMonth')}</CardDescription>
            <CardTitle className="text-3xl font-bold">{sortedRequests.filter(r => r.startDate.getMonth() === new Date().getMonth()).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('leave.approvedThisYear')}</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">
              {sortedRequests.filter(r => r.status === 'approved' && r.startDate.getFullYear() === new Date().getFullYear()).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

          <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="create" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><FileText className="h-4 w-4" /> {t('leave.newRequest')}</TabsTrigger>
          <TabsTrigger value="history" className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Calendar className="h-4 w-4" /> {t('leave.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">{t('leave.createRequest')}</CardTitle>
              <CardDescription>{t('leave.createRequestDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fast Search Field */}
              <div className="space-y-2">
                <Label htmlFor="fast-search" className="text-base font-semibold flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  {t('leave.fastSearchScan')}
                </Label>
                <div className="relative">
                  <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                  <Input
                    id="fast-search"
                    ref={searchInputRef}
                    type="text"
                    value={fastSearch}
                    onChange={(e) => setFastSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={t('leave.scanCardPlaceholder')}
                    className={`${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'} h-12 text-base`}
                    disabled={isSearching || !currentAcademicYear}
                    autoComplete="off"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                  {isSearching && (
                    <Loader2 className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground`} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('leave.scanCardHint')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class-select">{t('attendancePage.class')} <span className="text-destructive">*</span></Label>
                <Combobox
                  options={classOptions}
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  placeholder={t('leave.selectClassPlaceholder')}
                  searchPlaceholder={t('leave.searchClassesPlaceholder')}
                  emptyText={currentAcademicYear ? t('leave.noClassesFound') : t('leave.loadingAcademicYear')}
                  disabled={!currentAcademicYear}
                />
                {currentAcademicYear && (
                  <p className="text-xs text-muted-foreground">
                    {t('leave.showingClassesFor')} {currentAcademicYear.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-select">{t('leave.student')} <span className="text-destructive">*</span></Label>
                <div key={selectedStudent || 'no-student'}>
                  <Combobox
                    options={studentOptionsWithSelected}
                    value={selectedStudent}
                    onValueChange={setSelectedStudent}
                    placeholder={selectedClass ? t('leave.selectStudentPlaceholder') : t('leave.selectClassFirst')}
                    searchPlaceholder={t('leave.searchStudentPlaceholder')}
                    emptyText={selectedClass ? t('leave.noStudentsInClass') : t('leave.selectClassFirstMessage')}
                    disabled={!selectedClass}
                  />
                </div>
                {selectedStudent && (
                  <p className="text-xs text-muted-foreground">
                    {t('leave.selected')} {studentOptionsWithSelected.find(s => s.value === selectedStudent)?.label || t('leave.student')}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('leave.leaveType')}</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as any)}>
                  <SelectTrigger><SelectValue placeholder={t('leave.typePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_day">{t('leave.fullDay')}</SelectItem>
                    <SelectItem value="partial_day">{t('leave.partialDay')}</SelectItem>
                    <SelectItem value="time_bound">{t('leave.timeBound')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                  <Label className="text-base font-medium">{t('leave.leaveDuration')}</Label>
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {quickEntryOptions.map(option => (
                      <Button
                        key={option.days}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickEntry(option.days)}
                        className={`h-8 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <Zap className={`h-3 w-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">{t('leave.startDate')} <span className="text-destructive">*</span></Label>
                    <Input 
                      id="start-date"
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">{t('leave.endDate')} <span className="text-destructive">*</span></Label>
                    <Input 
                      id="end-date"
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      min={startDate || format(new Date(), 'yyyy-MM-dd')}
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                  </div>
                </div>
              </div>
              {leaveType !== 'full_day' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>{t('leave.startTime')}</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('leave.endTime')}</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
                  </div>
                </div>
              )}
              </div>
              
              <div className="space-y-3">
                <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                  <Label htmlFor="reason" className="text-base font-medium">{t('leave.reason')} <span className="text-destructive">*</span></Label>
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {quickReasonOptions.map(option => (
                      <Button
                        key={option.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReason(option.reason)}
                        className="h-8 text-xs"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea 
                  id="reason"
                  value={reason} 
                  onChange={e => setReason(e.target.value)} 
                  placeholder={t('leave.reasonPlaceholder')} 
                  className="min-h-[100px]"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approval-note">{t('leave.approvalNote')} <span className="text-muted-foreground text-xs font-normal">({t('common.optional')})</span></Label>
                <Textarea 
                  id="approval-note"
                  value={approvalNote} 
                  onChange={e => setApprovalNote(e.target.value)} 
                  placeholder={t('leave.approvalNotePlaceholder')} 
                  className="min-h-[80px]"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
              
              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} gap-3 pt-4 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedStudent('');
                    // Keep class selected for faster entry
                    setLeaveType('full_day');
                    setStartDate('');
                    setEndDate('');
                    setStartTime('');
                    setEndTime('');
                    setReason('');
                    setApprovalNote('');
                  }}
                  disabled={createLeave.isPending}
                >
                  {t('leave.clearForm')}
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createLeave.isPending || !selectedStudent || !startDate || !endDate}
                  size="lg"
                >
                  {createLeave.isPending ? (
                    <>
                      <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('leave.creating')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                      {t('leave.createRequest')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>{t('leave.leaveHistory')}</CardTitle>
              <CardDescription>{t('leave.filterDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`flex flex-wrap gap-3 items-end mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                  <Label>{t('leave.month')}</Label>
                  <Input type="number" min={1} max={12} value={filterMonth || ''} onChange={e => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)} className="w-32" dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <Label>{t('leave.year')}</Label>
                  <Input type="number" value={filterYear || ''} onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : undefined)} className="w-32" dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
                <div>
                  <Label>{t('leave.pageSize')}</Label>
                  <Input type="number" value={pageSize} onChange={e => setPageSize(Number(e.target.value) || 10)} className="w-28" dir={isRTL ? 'rtl' : 'ltr'} />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('leave.student')}</TableHead>
                      <TableHead>{t('leave.dates')}</TableHead>
                      <TableHead>{t('leave.reason')}</TableHead>
                      <TableHead>{t('leave.status')}</TableHead>
                      <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">{t('leave.loadingLeaveRequests')}</TableCell>
                      </TableRow>
                    ) : sortedRequests.length > 0 ? (
                      sortedRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell className="space-y-1">
                          <div className="font-semibold flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-500" />
                            {request.student?.fullName || t('leave.student')}
                          </div>
                          <div className="text-xs text-slate-500">{request.student?.studentCode || request.student?.admissionNo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(request.startDate, 'PP')} → {format(request.endDate, 'PP')}</div>
                          <div className="text-xs text-slate-500">{request.className || t('attendancePage.class')} / {request.schoolName || t('common.selectSchool')}</div>
                        </TableCell>
                        <TableCell className="max-w-[240px]"><div className="line-clamp-2 text-sm">{request.reason}</div></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[request.status] || ''}>{t(`leave.${request.status}`)}</Badge>
                        </TableCell>
                        <TableCell className={`${isRTL ? 'text-left' : 'text-right'} ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <Button size="sm" variant="outline" onClick={() => handleViewHistory(request)} className={isRTL ? 'flex-row-reverse' : ''}><Eye className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('common.view')}</Button>
                          <Button size="sm" variant="secondary" onClick={() => handlePrint(request)} className={isRTL ? 'flex-row-reverse' : ''}><Printer className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('common.print')}</Button>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(request)} disabled={request.status === 'approved'} className={isRTL ? 'flex-row-reverse' : ''}><CheckCircle2 className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('leave.approved')}</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(request)} disabled={request.status === 'rejected'} className={isRTL ? 'flex-row-reverse' : ''}><Download className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />{t('leave.rejected')}</Button>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">{t('leave.noLeaveRequestsYet')}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className={`flex justify-between items-center mt-3 text-sm text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span>{t('leave.pageOf', { page, total: pagination.last_page })}</span>
                  <div className={`${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                    <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>{t('leave.prev')}</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= (pagination?.last_page || 1)}>{t('leave.next')}</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={historyOpen} onOpenChange={(open) => { setHistoryOpen(open); if (!open) setHistoryStudent(null); }}>
        <SheetContent 
          side={isRTL ? 'right' : 'left'} 
          className="w-full sm:w-[460px]"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <SheetHeader>
            <SheetTitle className={`flex items-center gap-2 text-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
              <UserRound className="h-4 w-4 text-slate-500" />
              {historyStudent?.name || t('leave.studentLeaveHistory')}
            </SheetTitle>
            <SheetDescription>
              {historyStudent?.code ? `${historyStudent.code} · ${historyStudent.className || t('attendancePage.class')}` : t('leave.viewLeaveTrend')}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('leave.totalLeaves')}</CardDescription>
                <CardTitle className="text-2xl">{historySummary.counts.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('leave.approved')}</CardDescription>
                <CardTitle className="text-2xl text-green-600">{historySummary.counts.approved}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={statusColors.pending}>{t('leave.pending')} {historySummary.counts.pending}</Badge>
            <Badge variant="outline" className={statusColors.rejected}>{t('leave.rejected')} {historySummary.counts.rejected}</Badge>
            <Badge variant="outline" className={statusColors.cancelled}>{t('leave.cancelled')} {historySummary.counts.cancelled}</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t('leave.monthlyVolume')}</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(historySummary.byMonth).map(([month, count]) => (
                <div key={month} className={`rounded-lg border px-3 py-2 text-sm flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                  <span>{month}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {!Object.keys(historySummary.byMonth).length && (
                <div className="text-sm text-slate-500">{t('leave.noHistoryYet')}</div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">{t('leave.allLeaves')}</p>
            <ScrollArea className={`h-[340px] ${isRTL ? 'pl-2' : 'pr-2'}`}>
              <div className="space-y-2">
                {historyLoading && <div className="text-sm text-slate-500">{t('leave.loadingHistory')}</div>}
                {!historyLoading && (historyData || []).map(entry => (
                  <div key={entry.id} className="rounded-lg border px-3 py-2">
                    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} justify-between`}>
                      <div>
                        <p className="font-medium text-sm">{format(entry.startDate, 'PP')} → {format(entry.endDate, 'PP')}</p>
                        <p className="text-xs text-slate-500">{entry.reason}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[entry.status] || ''}>{t(`leave.${entry.status}`)}</Badge>
                    </div>
                  </div>
                ))}
                {!historyLoading && !(historyData || []).length && (
                  <div className="text-sm text-slate-500">{t('leave.noLeaveHistoryFound')}</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
