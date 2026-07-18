import {
  ArrowLeft, Wand2, Save, Search, AlertCircle, CheckCircle, KeyRound,
  RefreshCw, Edit2, X, Eye, EyeOff, Scan, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useExamStudentsWithNumbers,
  useSecretNumberStartFrom,
  usePreviewSecretNumberAssignment,
  useConfirmSecretNumberAssignment,
  useUpdateSecretNumber,
  useLookupBySecretNumber,
} from '@/hooks/useExamNumbers';
import { useExam, useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/hooks/useLanguage';
import type { NumberAssignmentPreviewResponse, NumberAssignmentPreviewItem, SecretNumberLookupResponse } from '@/types/domain/exam';

export function ExamSecretNumbersPage() {
  const { t } = useLanguage();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // State for exam selection (when accessed individually)
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  // Determine which exam ID to use
  const examId = examIdFromParams || selectedExamId || undefined;

  // Fetch all exams for selector (only when accessed individually)
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);

  // Set exam from URL params (when accessed from exams page)
  useEffect(() => {
    if (examIdFromParams) {
      // Clear selectedExamId when URL has examId (use URL examId instead)
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  // Auto-select latest exam from current academic year (only when accessed individually, no URL examId)
  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  // State
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [startFrom, setStartFrom] = useState<string>('5001');
  const [scope, setScope] = useState<'exam' | 'class'>('exam');
  const [overrideExisting, setOverrideExisting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewData, setPreviewData] = useState<NumberAssignmentPreviewResponse | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<{
    examStudentId: string;
    currentValue: string | null;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [showSecretNumbers, setShowSecretNumbers] = useState<boolean>(false);
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<SecretNumberLookupResponse | null>(null);
  const [showLookupDialog, setShowLookupDialog] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'secretNumber' | 'rollNumber'>('secretNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useExamStudentsWithNumbers(
    examId,
    selectedClassId
  );
  const { data: suggestedStart } = useSecretNumberStartFrom(examId);

  // Mutations
  const previewMutation = usePreviewSecretNumberAssignment();
  const confirmMutation = useConfirmSecretNumberAssignment();
  const updateMutation = useUpdateSecretNumber();
  const lookupMutation = useLookupBySecretNumber();

  // Permissions
  const hasReadPermission = useHasPermission('exams.secret_numbers.read');
  const hasAssignPermission = useHasPermission('exams.secret_numbers.assign');

  // Use suggested start from when loaded
  useMemo(() => {
    if (suggestedStart && !startFrom) {
      setStartFrom(suggestedStart);
    }
  }, [suggestedStart, startFrom]);

  const compareOptionalNumeric = useCallback((a: string | null | undefined, b: string | null | undefined) => {
    const aEmpty = a == null || a === '';
    const bEmpty = b == null || b === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      return Number(a) - Number(b);
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }, []);

  const handleSort = useCallback((field: 'secretNumber' | 'rollNumber') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Filtered + sorted students
  const filteredStudents = useMemo(() => {
    if (!studentsData?.students) return [];

    const term = searchTerm.toLowerCase().trim();
    const filtered = term
      ? studentsData.students.filter(
          (s) =>
            s.fullName.toLowerCase().includes(term) ||
            s.fatherName?.toLowerCase().includes(term) ||
            s.studentCode?.toLowerCase().includes(term) ||
            s.cardNumber?.toLowerCase().includes(term) ||
            s.examSecretNumber?.toLowerCase().includes(term) ||
            s.examRollNumber?.toLowerCase().includes(term) ||
            s.className.toLowerCase().includes(term)
        )
      : [...studentsData.students];

    const direction = sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const primary =
        sortField === 'secretNumber'
          ? compareOptionalNumeric(a.examSecretNumber, b.examSecretNumber)
          : compareOptionalNumeric(a.examRollNumber, b.examRollNumber);
      if (primary !== 0) return primary * direction;
      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [studentsData?.students, searchTerm, sortField, sortDirection, compareOptionalNumeric]);

  const SortHeaderButton = ({
    field,
    children,
  }: {
    field: 'secretNumber' | 'rollNumber';
    children: ReactNode;
  }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-2 px-2 font-medium"
        onClick={() => handleSort(field)}
      >
        {children}
        {direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 ml-1" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3 w-3 ml-1" />
        ) : (
          <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
        )}
      </Button>
    );
  };

  // Handle preview
  const handlePreview = useCallback(async () => {
    if (!examId) return;

    if (scope === 'class' && !selectedClassId) {
      return;
    }

    const result = await previewMutation.mutateAsync({
      examId,
      examClassId: scope === 'class' ? selectedClassId : undefined,
      startFrom,
      scope,
      overrideExisting,
    });

    setPreviewData(result);
    setShowPreviewDialog(true);
  }, [examId, selectedClassId, startFrom, scope, overrideExisting, previewMutation]);

  // Handle confirm assignment
  const handleConfirm = useCallback(async () => {
    if (!examId || !previewData) return;

    const items = previewData.items.map((item) => ({
      exam_student_id: item.examStudentId,
      new_secret_number: item.newSecretNumber!,
    }));

    await confirmMutation.mutateAsync({ examId, items });
    setShowPreviewDialog(false);
    setShowConfirmDialog(false);
    setPreviewData(null);
    refetchStudents();
  }, [examId, previewData, confirmMutation, refetchStudents]);

  // Handle manual edit
  const handleStartEdit = useCallback((examStudentId: string, currentValue: string | null) => {
    setEditingStudent({ examStudentId, currentValue });
    setEditValue(currentValue || '');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!examId || !editingStudent) return;

    await updateMutation.mutateAsync({
      examId,
      examStudentId: editingStudent.examStudentId,
      secretNumber: editValue || null,
    });

    setEditingStudent(null);
    setEditValue('');
    refetchStudents();
  }, [examId, editingStudent, editValue, updateMutation, refetchStudents]);

  const handleCancelEdit = useCallback(() => {
    setEditingStudent(null);
    setEditValue('');
  }, []);

  // Handle lookup
  const handleLookup = useCallback(async () => {
    if (!examId || !lookupQuery.trim()) return;

    const result = await lookupMutation.mutateAsync({
      examId,
      secretNumber: lookupQuery.trim(),
    });

    setLookupResult(result);
    setShowLookupDialog(true);
  }, [examId, lookupQuery, lookupMutation]);

  // Check exam status
  const canAssign = exam && !['completed', 'archived'].includes(exam.status);

  const isLoading = (examLoading || studentsLoading || examsLoading) && !exam;

  // Mask secret number for display
  const maskSecretNumber = (num: string | null): string => {
    if (!num) return '-';
    if (showSecretNumbers) return num;
    if (num.length <= 2) return '*'.repeat(num.length);
    return num[0] + '*'.repeat(num.length - 2) + num[num.length - 1];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hasReadPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('events.noPermission') || 'You do not have permission to view secret numbers'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('exams.backToList') || 'Back to Exams'}</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/exams`)} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
              <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 hidden md:inline-flex" />
              {t('exams.secretNumbers.title') || 'Secret Number Assignment'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden md:block">
              {exam ? exam.name + ' • ' : ''}{t('exams.secretNumbers.description') || 'Assign secret numbers for anonymous grading'}
            </p>
          </div>
        </div>
        {exam && (
          <Badge variant={exam.status === 'in_progress' ? 'default' : 'secondary'} className="flex-shrink-0 self-start sm:self-center">
            {exam.status}
          </Badge>
        )}
      </div>

      {/* Exam Selector - only show when accessed directly (without examId in URL) */}
      {!examIdFromParams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.selectExam') || 'Select Exam'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md">
              <Select
                value={selectedExamId || ''}
                onValueChange={(v) => setSelectedExamId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExamPlaceholder') || 'Select an exam...'} />
                </SelectTrigger>
                <SelectContent>
                  {allExams?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear?.name ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show content only when exam is selected */}
      {!exam && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.selectExamFirst') || 'Please select an exam to continue'}</p>
        </div>
      )}

      {exam && (
        <>
      {/* Summary Cards */}
      {studentsData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.secretNumbers.totalStudents') || 'Total Students'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{studentsData.summary.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.secretNumbers.assigned') || 'Assigned'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{studentsData.summary.withSecretNumber}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.secretNumbers.missing') || 'Missing'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{studentsData.summary.missingSecretNumber}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.secretNumbers.progress') || 'Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {studentsData.summary.total > 0
                  ? Math.round((studentsData.summary.withSecretNumber / studentsData.summary.total) * 100)
                  : 0}%
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lookup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('exams.secretNumbers.lookup') || 'Lookup by Secret Number'}</CardTitle>
          <CardDescription>
            {t('exams.secretNumbers.lookupDescription') || 'Find a student by their secret number (for result processing)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <Input
              placeholder={t('exams.secretNumbers.enterSecretNumber') || 'Enter secret number...'}
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
            <Button onClick={handleLookup} disabled={lookupMutation.isPending || !lookupQuery.trim()} className="w-full sm:w-auto">
              <Scan className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('exams.secretNumbers.lookupButton') || 'Lookup'}</span>
              <span className="sm:hidden">Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      {hasAssignPermission && canAssign && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.secretNumbers.autoAssign') || 'Auto Assignment'}</CardTitle>
            <CardDescription>
              {t('exams.secretNumbers.autoAssignDescription') || 'Automatically assign continuous secret numbers by grade, class, and section'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Filter */}
              <div className="space-y-2">
                <Label>{t('search.class') || 'Class'}</Label>
                <Select
                  value={selectedClassId || 'all'}
                  onValueChange={(v) => setSelectedClassId(v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('students.allClasses') || 'All Classes'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('students.allClasses') || 'All Classes'}</SelectItem>
                    {examClasses?.map((ec) => (
                      <SelectItem key={ec.id} value={ec.id}>
                        {ec.classAcademicYear?.class?.name || 'Unknown'}
                        {ec.classAcademicYear?.sectionName && ` - ${ec.classAcademicYear.sectionName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start From */}
              <div className="space-y-2">
                <Label>{t('exams.secretNumbers.startFrom') || 'Start From'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={startFrom}
                    onChange={(e) => setStartFrom(e.target.value)}
                    placeholder="5001"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => suggestedStart && setStartFrom(suggestedStart)}
                    title={t('exams.secretNumbers.useSuggested') || 'Use suggested'}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label>{t('exams.secretNumbers.scope') || 'Scope'}</Label>
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'exam' | 'class')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exam" id="scope-exam" />
                    <Label htmlFor="scope-exam" className="font-normal">
                      {t('exams.secretNumbers.entireExam') || 'Entire Exam'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="scope-class" disabled={!selectedClassId} />
                    <Label htmlFor="scope-class" className="font-normal">
                      {t('exams.secretNumbers.selectedClass') || 'Selected Class'}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Override */}
              <div className="space-y-2">
                <Label>{t('exams.secretNumbers.options') || 'Options'}</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="override"
                    checked={overrideExisting}
                    onCheckedChange={(v) => setOverrideExisting(v === true)}
                  />
                  <Label htmlFor="override" className="font-normal">
                    {t('exams.secretNumbers.overrideExisting') || 'Override existing numbers'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handlePreview} disabled={previewMutation.isPending} className="w-full sm:w-auto">
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('exams.secretNumbers.previewAssignment') || 'Preview Auto Assignment'}</span>
                <span className="sm:hidden">Preview</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              <CardTitle className="text-lg">{t('exams.secretNumbers.studentList') || 'Students'}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecretNumbers(!showSecretNumbers)}
                className="w-full sm:w-auto"
              >
                {showSecretNumbers ? (
                  <>
                    <EyeOff className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('exams.secretNumbers.hide') || 'Hide Numbers'}</span>
                    <span className="sm:hidden">Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('exams.secretNumbers.show') || 'Show Numbers'}</span>
                    <span className="sm:hidden">Show</span>
                  </>
                )}
              </Button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search') || 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortHeaderButton field="secretNumber">
                    {t('exams.secretNumbers.secretNumber') || 'Secret Number'}
                  </SortHeaderButton>
                </TableHead>
                <TableHead className="hidden sm:table-cell">
                  <SortHeaderButton field="rollNumber">
                    {t('exams.rollNumbers.rollNumber') || 'Roll Number'}
                  </SortHeaderButton>
                </TableHead>
                <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                <TableHead className="hidden md:table-cell">{t('examReports.fatherName') || 'Father Name'}</TableHead>
                <TableHead className="hidden md:table-cell">{t('students.cardNumber') || 'Card Number'}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('search.class') || 'Class'}</TableHead>
                {hasAssignPermission && <TableHead className="w-24">{t('events.actions') || 'Actions'}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasAssignPermission ? 7 : 6} className="text-center py-8 text-muted-foreground">
                    {t('exams.secretNumbers.noStudents') || 'No students found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.examStudentId}>
                    <TableCell>
                      {editingStudent?.examStudentId === student.examStudentId ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 h-8"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="font-mono">
                          {student.examSecretNumber ? (
                            <Badge variant="default">{maskSecretNumber(student.examSecretNumber)}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              {t('exams.secretNumbers.notAssigned') || 'Not assigned'}
                            </Badge>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {student.examRollNumber || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:hidden gap-1">
                        <span>{student.fullName}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.fatherName || '-'}
                          {student.cardNumber ? ` · ${student.cardNumber}` : ''}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Roll: {student.examRollNumber || '-'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {student.className}{student.section && ` - ${student.section}`}
                        </span>
                      </div>
                      <div className="hidden sm:block">{student.fullName}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{student.fatherName || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{student.cardNumber || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {student.className}
                      {student.section && <span className="text-muted-foreground"> - {student.section}</span>}
                    </TableCell>
                    {hasAssignPermission && (
                      <TableCell>
                        {canAssign && editingStudent?.examStudentId !== student.examStudentId && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleStartEdit(student.examStudentId, student.examSecretNumber)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('exams.secretNumbers.previewTitle') || 'Secret Number Assignment Preview'}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {t('exams.secretNumbers.previewDescription') || 'Review the changes before confirming'}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{previewData.total} {t('exams.secretNumbers.toAssign') || 'to assign'}</span>
                </div>
                {previewData.willOverrideCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>{previewData.willOverrideCount} {t('exams.secretNumbers.willOverride') || 'will be overridden'}</span>
                  </div>
                )}
              </div>

              {previewData.classRanges && previewData.classRanges.length > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm font-medium">
                    {t('exams.secretNumbers.classRanges') || 'Class / section ranges'}
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {previewData.classRanges.map((range) => {
                      const sectionLabel = range.section ? ` - ${range.section}` : '';
                      const fallback = `${range.className}${sectionLabel}: ${range.start}–${range.end} (${range.count})`;
                      const label = t('exams.secretNumbers.classRangeItem', {
                        className: range.className,
                        section: sectionLabel,
                        start: range.start,
                        end: range.end,
                        count: range.count,
                      });
                      return (
                        <li key={`${range.className}_${range.section}`}>
                          {label.startsWith('[MISSING:') ? fallback : label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                    <TableHead>{t('search.class') || 'Class'}</TableHead>
                    <TableHead>{t('exams.secretNumbers.current') || 'Current'}</TableHead>
                    <TableHead>{t('exams.secretNumbers.new') || 'New'}</TableHead>
                    <TableHead>{t('events.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.items.slice(0, 50).map((item: NumberAssignmentPreviewItem) => (
                    <TableRow key={item.examStudentId}>
                      <TableCell>{item.studentName}</TableCell>
                      <TableCell>
                        {item.className}
                        {item.section ? ` - ${item.section}` : ''}
                      </TableCell>
                      <TableCell>
                        {item.currentSecretNumber || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {item.newSecretNumber}
                      </TableCell>
                      <TableCell>
                        {item.hasCollision ? (
                          <Badge variant="destructive">{t('exams.secretNumbers.collision') || 'Collision'}</Badge>
                        ) : item.willOverride ? (
                          <Badge variant="secondary">{t('exams.secretNumbers.override') || 'Override'}</Badge>
                        ) : (
                          <Badge variant="default">{t('exams.secretNumbers.new') || 'New'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {previewData.items.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  {t('exams.secretNumbers.andMore', { count: previewData.items.length - 50 }) || 
                    `... and ${previewData.items.length - 50} more`}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} className="w-full sm:w-auto">
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={() => {
                if (previewData && previewData.willOverrideCount > 0) {
                  setShowConfirmDialog(true);
                } else {
                  handleConfirm();
                }
              }}
              disabled={confirmMutation.isPending || !previewData || previewData.total === 0}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 sm:mr-2" />
              {t('exams.secretNumbers.confirmAssign') || 'Confirm & Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.secretNumbers.confirmOverride') || 'Confirm Override'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.secretNumbers.confirmOverrideDescription', { count: previewData?.willOverrideCount || 0 }) ||
                `You are about to override ${previewData?.willOverrideCount || 0} existing secret numbers. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={confirmMutation.isPending}>
              {t('exams.secretNumbers.confirmOverrideButton') || 'Yes, Override'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lookup Result Dialog */}
      <Dialog open={showLookupDialog} onOpenChange={setShowLookupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.secretNumbers.lookupResult') || 'Lookup Result'}</DialogTitle>
          </DialogHeader>

          {lookupResult && (
            <div className="space-y-4">
              {lookupResult.found ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="text-sm text-muted-foreground">{t('exams.studentName') || 'Student Name'}:</div>
                    <div className="font-medium">{lookupResult.student?.fullName}</div>

                    <div className="text-sm text-muted-foreground">{t('exams.studentCode') || 'Student Code'}:</div>
                    <div className="font-mono">{lookupResult.student?.studentCode || '-'}</div>

                    <div className="text-sm text-muted-foreground">{t('exams.rollNumbers.rollNumber') || 'Roll Number'}:</div>
                    <div className="font-mono">{lookupResult.student?.examRollNumber || '-'}</div>

                    <div className="text-sm text-muted-foreground">{t('search.class') || 'Class'}:</div>
                    <div>{lookupResult.student?.className}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-amber-500" />
                  <p>{t('exams.secretNumbers.notFound') || 'No student found with this secret number'}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLookupDialog(false)} className="w-full sm:w-auto">
              {t('events.close') || 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </div>
  );
}

export default ExamSecretNumbersPage;
