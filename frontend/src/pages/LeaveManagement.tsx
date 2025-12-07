import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, addWeeks } from 'date-fns';
import { Calendar, CheckCircle2, Download, Eye, FileText, Loader2, Printer, Shield, UserRound, Zap, Search, Scan } from 'lucide-react';
import { useLeaveRequests, useCreateLeaveRequest, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveRequests';
import { useStudents } from '@/hooks/useStudents';
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
import { toast } from 'sonner';
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
  const { t } = useLanguage();
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
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];
    // If class is selected, we could filter, but for now show all to ensure searched student is available
    // The selected student ID is preserved even if not in filtered list
    return allStudents;
  }, [allStudents]);

  // Memoized options for searchable comboboxes
  const studentOptions = useMemo<ComboboxOption[]>(() => {
    if (!filteredStudents) return [];
    return filteredStudents.map(student => {
      const name = student.fullName || student.full_name || 'Unknown';
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
    if (!selectedStudent) return studentOptions;
    
    // Check if selected student is already in options
    const hasSelected = studentOptions.some(opt => opt.value === selectedStudent);
    if (hasSelected) return studentOptions;
    
    // If not, find the student and add it
    const selectedStudentData = allStudents?.find(s => s.id === selectedStudent);
    if (selectedStudentData) {
      const name = selectedStudentData.fullName || selectedStudentData.full_name || 'Unknown';
      const code = selectedStudentData.studentCode || selectedStudentData.admissionNumber || '';
      const card = selectedStudentData.cardNumber || '';
      
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
      toast.error('Student, start date, and end date are required');
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
      toast.success('Leave request created successfully');
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
      name: request.student?.fullName || 'Student',
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
    const data = await leaveRequestsApi.printData(request.id);
    const scanUrl = data.scan_url as string;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;
    const doc = window.open('', '_blank');
    if (!doc) return;
    doc.document.write(`
      <html><head><title>Leave Request</title>
      <style>body{font-family: Arial;padding:16px;} .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;} .row{display:flex;justify-content:space-between;margin-bottom:8px;} .label{color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;} .value{font-weight:600;font-size:14px;} .qr{margin-top:16px;text-align:center;}</style>
      </head><body>
        <div class="card">
          <div class="row"><div class="label">Student</div><div class="value">${request.student?.fullName || ''}</div></div>
          <div class="row"><div class="label">Code</div><div class="value">${request.student?.studentCode || ''}</div></div>
          <div class="row"><div class="label">Class</div><div class="value">${request.className || ''}</div></div>
          <div class="row"><div class="label">Dates</div><div class="value">${format(request.startDate, 'PP')} → ${format(request.endDate, 'PP')}</div></div>
          <div class="row"><div class="label">Reason</div><div class="value">${request.reason}</div></div>
          <div class="qr"><img src="${qrUrl}" alt="QR" /></div>
          <p style="text-align:center;color:#475569;font-size:12px">Scan to verify leave (one-time use).</p>
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

  const quickEntryOptions = [
    { label: '1 Day', days: 1 },
    { label: '2 Days', days: 2 },
    { label: '3 Days', days: 3 },
    { label: '1 Week', days: 7 },
    { label: '2 Weeks', days: 14 },
    { label: '1 Month', days: 30 },
  ];

  // Quick reason options for common leave reasons
  const quickReasonOptions = [
    { label: 'Sick', reason: 'Sick - Medical condition requiring rest' },
    { label: 'Getting Outside', reason: 'Getting outside of school - Personal errand' },
    { label: 'Family Emergency', reason: 'Family emergency - Urgent family matter' },
    { label: 'Medical Appointment', reason: 'Medical appointment - Doctor visit' },
    { label: 'Personal', reason: 'Personal - Personal matter' },
    { label: 'Family Event', reason: 'Family event - Family gathering or celebration' },
    { label: 'Travel', reason: 'Travel - Out of town travel' },
    { label: 'Religious', reason: 'Religious - Religious observance or ceremony' },
  ];

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
    if (!searchValue.trim() || !allStudents || !currentAcademicYear || !profile?.organization_id) {
      if (!currentAcademicYear) {
        toast.error('Academic year not loaded. Please wait...');
      }
      return;
    }
    
    const trimmedSearch = searchValue.trim().toLowerCase();
    setIsSearching(true);
    
    try {
      // Search in all students by card number, student code, or admission number
      const foundStudent = allStudents.find(student => {
        const card = (student.cardNumber || '').toLowerCase();
        const code = (student.studentCode || '').toLowerCase();
        const admission = (student.admissionNumber || '').toLowerCase();
        const id = student.id.toLowerCase();
        
        return card === trimmedSearch || 
               code === trimmedSearch || 
               admission === trimmedSearch ||
               id === trimmedSearch;
      });

      if (!foundStudent) {
        toast.error('Student not found. Please check the card number, student code, or admission number.');
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
            toast.success(`Found: ${foundStudent.fullName || foundStudent.full_name} - Class: ${classOptions.find(c => c.value === admission.class_id)?.label || 'Unknown'}`);
            
            // Focus on reason field for quick entry after a brief delay
            setTimeout(() => {
              const reasonInput = document.getElementById('reason');
              reasonInput?.focus();
            }, 200);
          } else {
            toast.error('Student found but class not available in current academic year.');
          }
        } else {
          toast.error('Student found but not enrolled in any class for current academic year.');
        }
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch student admission:', error);
        }
        toast.error('Student found but could not determine their class. Please select manually.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to search student');
    } finally {
      setIsSearching(false);
    }
  }, [allStudents, currentAcademicYear, profile?.organization_id, classOptions]);

  // Handle Enter key for immediate search (no auto-search on typing)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && fastSearch.trim() && !isSearching) {
      e.preventDefault();
      handleFastSearch(fastSearch);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Shield className="h-5 w-5" /> Leave governance</CardTitle>
            <CardDescription className="text-slate-200">Create requests with QR-ready slips for scanning.</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current month</CardDescription>
            <CardTitle className="text-3xl font-bold">{sortedRequests.filter(r => r.startDate.getMonth() === new Date().getMonth()).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved this year</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-600">
              {sortedRequests.filter(r => r.status === 'approved' && r.startDate.getFullYear() === new Date().getFullYear()).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="create" className="flex items-center gap-2"><FileText className="h-4 w-4" /> New Request</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><Calendar className="h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Create Leave Request</CardTitle>
              <CardDescription>Fill in the details below to create a new leave request with QR code for verification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fast Search Field */}
              <div className="space-y-2">
                <Label htmlFor="fast-search" className="text-base font-semibold flex items-center gap-2">
                  <Scan className="h-4 w-4" />
                  Fast Search / Scan
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fast-search"
                    ref={searchInputRef}
                    type="text"
                    value={fastSearch}
                    onChange={(e) => setFastSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Scan card or type student code / admission number / card number, then press Enter..."
                    className="pl-9 pr-4 h-12 text-base"
                    disabled={isSearching || !currentAcademicYear}
                    autoComplete="off"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Scan a student card or enter their code/admission number, then press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> to auto-fill class and student
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class-select">Class <span className="text-destructive">*</span></Label>
                <Combobox
                  options={classOptions}
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  placeholder="Select class..."
                  searchPlaceholder="Search classes..."
                  emptyText={currentAcademicYear ? "No classes found for current academic year." : "Loading academic year..."}
                  disabled={!currentAcademicYear}
                />
                {currentAcademicYear && (
                  <p className="text-xs text-muted-foreground">
                    Showing classes for: {currentAcademicYear.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-select">Student <span className="text-destructive">*</span></Label>
                <div key={selectedStudent || 'no-student'}>
                  <Combobox
                    options={studentOptionsWithSelected}
                    value={selectedStudent}
                    onValueChange={setSelectedStudent}
                    placeholder={selectedClass ? "Select student..." : "Select class first..."}
                    searchPlaceholder="Search by name, code, or card number..."
                    emptyText={selectedClass ? "No students found in this class." : "Please select a class first."}
                    disabled={!selectedClass}
                  />
                </div>
                {selectedStudent && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {studentOptionsWithSelected.find(s => s.value === selectedStudent)?.label || 'Student'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={(value) => setLeaveType(value as any)}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_day">Full day</SelectItem>
                    <SelectItem value="partial_day">Partial day</SelectItem>
                    <SelectItem value="time_bound">Time bound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Leave Duration</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickEntryOptions.map(option => (
                      <Button
                        key={option.days}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickEntry(option.days)}
                        className="h-8 text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Start Date <span className="text-destructive">*</span></Label>
                    <Input 
                      id="start-date"
                      type="date" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date <span className="text-destructive">*</span></Label>
                    <Input 
                      id="end-date"
                      type="date" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)}
                      min={startDate || format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
              </div>
              {leaveType !== 'full_day' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reason" className="text-base font-medium">Reason <span className="text-destructive">*</span></Label>
                  <div className="flex flex-wrap gap-2">
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
                  placeholder="Enter the reason for leave or select a quick reason above..." 
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approval-note">Approval Note <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Textarea 
                  id="approval-note"
                  value={approvalNote} 
                  onChange={e => setApprovalNote(e.target.value)} 
                  placeholder="Add any additional context for approvers or security guards..." 
                  className="min-h-[80px]"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  Clear Form
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createLeave.isPending || !selectedStudent || !startDate || !endDate}
                  size="lg"
                >
                  {createLeave.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create Leave Request
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
              <CardTitle>Leave history</CardTitle>
              <CardDescription>Filter by month/year and approve or reject quickly.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div>
                  <Label>Month</Label>
                  <Input type="number" min={1} max={12} value={filterMonth || ''} onChange={e => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)} className="w-32" />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input type="number" value={filterYear || ''} onChange={e => setFilterYear(e.target.value ? Number(e.target.value) : undefined)} className="w-32" />
                </div>
                <div>
                  <Label>Page size</Label>
                  <Input type="number" value={pageSize} onChange={e => setPageSize(Number(e.target.value) || 10)} className="w-28" />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">Loading leave requests...</TableCell>
                      </TableRow>
                    ) : sortedRequests.length > 0 ? (
                      sortedRequests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell className="space-y-1">
                          <div className="font-semibold flex items-center gap-2">
                            <UserRound className="h-4 w-4 text-slate-500" />
                            {request.student?.fullName || 'Student'}
                          </div>
                          <div className="text-xs text-slate-500">{request.student?.studentCode || request.student?.admissionNo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{format(request.startDate, 'PP')} → {format(request.endDate, 'PP')}</div>
                          <div className="text-xs text-slate-500">{request.className || 'Class'} / {request.schoolName || 'School'}</div>
                        </TableCell>
                        <TableCell className="max-w-[240px]"><div className="line-clamp-2 text-sm">{request.reason}</div></TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[request.status] || ''}>{request.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleViewHistory(request)}><Eye className="h-4 w-4 mr-1" />View</Button>
                          <Button size="sm" variant="secondary" onClick={() => handlePrint(request)}><Printer className="h-4 w-4 mr-1" />Print</Button>
                          <Button size="sm" variant="outline" onClick={() => handleApprove(request)} disabled={request.status === 'approved'}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(request)} disabled={request.status === 'rejected'}><Download className="h-4 w-4 mr-1" />Reject</Button>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-slate-500">No leave requests yet.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {pagination && (
                <div className="flex justify-between items-center mt-3 text-sm text-slate-600">
                  <span>Page {page} of {pagination.last_page}</span>
                  <div className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} disabled={page >= (pagination?.last_page || 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      <Sheet open={historyOpen} onOpenChange={(open) => { setHistoryOpen(open); if (!open) setHistoryStudent(null); }}>
        <SheetContent side="left" className="w-full sm:w-[460px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-lg">
              <UserRound className="h-4 w-4 text-slate-500" />
              {historyStudent?.name || 'Student leave history'}
            </SheetTitle>
            <SheetDescription>
              {historyStudent?.code ? `${historyStudent.code} · ${historyStudent.className || 'Class'}` : 'View a student’s leave trend and approvals.'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total leaves</CardDescription>
                <CardTitle className="text-2xl">{historySummary.counts.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-2xl text-green-600">{historySummary.counts.approved}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className={statusColors.pending}>Pending {historySummary.counts.pending}</Badge>
            <Badge variant="outline" className={statusColors.rejected}>Rejected {historySummary.counts.rejected}</Badge>
            <Badge variant="outline" className={statusColors.cancelled}>Cancelled {historySummary.counts.cancelled}</Badge>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Monthly volume</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(historySummary.byMonth).map(([month, count]) => (
                <div key={month} className="rounded-lg border px-3 py-2 text-sm flex items-center justify-between">
                  <span>{month}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
              {!Object.keys(historySummary.byMonth).length && (
                <div className="text-sm text-slate-500">No history yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">All leaves</p>
            <ScrollArea className="h-[340px] pr-2">
              <div className="space-y-2">
                {historyLoading && <div className="text-sm text-slate-500">Loading history…</div>}
                {!historyLoading && (historyData || []).map(entry => (
                  <div key={entry.id} className="rounded-lg border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{format(entry.startDate, 'PP')} → {format(entry.endDate, 'PP')}</p>
                        <p className="text-xs text-slate-500">{entry.reason}</p>
                      </div>
                      <Badge variant="outline" className={statusColors[entry.status] || ''}>{entry.status}</Badge>
                    </div>
                  </div>
                ))}
                {!historyLoading && !(historyData || []).length && (
                  <div className="text-sm text-slate-500">No leave history found for this student.</div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
