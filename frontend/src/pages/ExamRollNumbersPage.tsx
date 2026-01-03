import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam, useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import {
  useExamStudentsWithNumbers,
  useRollNumberStartFrom,
  usePreviewRollNumberAssignment,
  useConfirmRollNumberAssignment,
  useUpdateRollNumber,
} from '@/hooks/useExamNumbers';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  ArrowLeft, Wand2, Save, Search, AlertCircle, CheckCircle, Hash,
  RefreshCw, Edit2, X
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { NumberAssignmentPreviewResponse, NumberAssignmentPreviewItem } from '@/types/domain/exam';

export function ExamRollNumbersPage() {
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
  const [startFrom, setStartFrom] = useState<string>('1001');
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

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: studentsData, isLoading: studentsLoading, refetch: refetchStudents } = useExamStudentsWithNumbers(
    examId,
    selectedClassId
  );
  const { data: suggestedStart } = useRollNumberStartFrom(examId);

  // Mutations
  const previewMutation = usePreviewRollNumberAssignment();
  const confirmMutation = useConfirmRollNumberAssignment();
  const updateMutation = useUpdateRollNumber();

  // Permissions
  const hasReadPermission = useHasPermission('exams.roll_numbers.read');
  const hasAssignPermission = useHasPermission('exams.roll_numbers.assign');

  // Use suggested start from when loaded
  useMemo(() => {
    if (suggestedStart && !startFrom) {
      setStartFrom(suggestedStart);
    }
  }, [suggestedStart, startFrom]);

  // Filtered students based on search
  const filteredStudents = useMemo(() => {
    if (!studentsData?.students) return [];
    if (!searchTerm) return studentsData.students;
    
    const term = searchTerm.toLowerCase();
    return studentsData.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.studentCode?.toLowerCase().includes(term) ||
        s.examRollNumber?.toLowerCase().includes(term) ||
        s.className.toLowerCase().includes(term)
    );
  }, [studentsData?.students, searchTerm]);

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
      new_roll_number: item.newRollNumber!,
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
      rollNumber: editValue || null,
    });

    setEditingStudent(null);
    setEditValue('');
    refetchStudents();
  }, [examId, editingStudent, editValue, updateMutation, refetchStudents]);

  const handleCancelEdit = useCallback(() => {
    setEditingStudent(null);
    setEditValue('');
  }, []);

  // Check exam status
  const canAssign = exam && !['completed', 'archived'].includes(exam.status);

  const isLoading = (examLoading || studentsLoading || examsLoading) && !exam;

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
          <p className="text-muted-foreground">{t('common.noPermission') || 'You do not have permission to view roll numbers'}</p>
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
              <Hash className="h-5 w-5 sm:h-6 sm:w-6 hidden md:inline-flex" />
              {t('exams.rollNumbers.title') || 'Roll Number Assignment'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden md:block">
              {exam ? exam.name + ' • ' : ''}{t('exams.rollNumbers.description') || 'Assign roll numbers to enrolled students'}
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
                {t('exams.rollNumbers.totalStudents') || 'Total Students'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{studentsData.summary.total}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.rollNumbers.assigned') || 'Assigned'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-green-600">{studentsData.summary.withRollNumber}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.rollNumbers.missing') || 'Missing'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-amber-600">{studentsData.summary.missingRollNumber}</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('exams.rollNumbers.progress') || 'Progress'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">
                {studentsData.summary.total > 0
                  ? Math.round((studentsData.summary.withRollNumber / studentsData.summary.total) * 100)
                  : 0}%
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      {hasAssignPermission && canAssign && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.rollNumbers.autoAssign') || 'Auto Assignment'}</CardTitle>
            <CardDescription>
              {t('exams.rollNumbers.autoAssignDescription') || 'Automatically assign roll numbers to students'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Class Filter */}
              <div className="space-y-2">
                <Label>{t('exams.class') || 'Class'}</Label>
                <Select
                  value={selectedClassId || 'all'}
                  onValueChange={(v) => setSelectedClassId(v === 'all' ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.allClasses') || 'All Classes'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('exams.allClasses') || 'All Classes'}</SelectItem>
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
                <Label>{t('exams.rollNumbers.startFrom') || 'Start From'}</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={startFrom}
                    onChange={(e) => setStartFrom(e.target.value)}
                    placeholder="1001"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => suggestedStart && setStartFrom(suggestedStart)}
                    title={t('exams.rollNumbers.useSuggested') || 'Use suggested'}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Scope */}
              <div className="space-y-2">
                <Label>{t('exams.rollNumbers.scope') || 'Scope'}</Label>
                <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'exam' | 'class')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="exam" id="scope-exam" />
                    <Label htmlFor="scope-exam" className="font-normal">
                      {t('exams.rollNumbers.entireExam') || 'Entire Exam'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="class" id="scope-class" disabled={!selectedClassId} />
                    <Label htmlFor="scope-class" className="font-normal">
                      {t('exams.rollNumbers.selectedClass') || 'Selected Class'}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Override */}
              <div className="space-y-2">
                <Label>{t('exams.rollNumbers.options') || 'Options'}</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="override"
                    checked={overrideExisting}
                    onCheckedChange={(v) => setOverrideExisting(v === true)}
                  />
                  <Label htmlFor="override" className="font-normal">
                    {t('exams.rollNumbers.overrideExisting') || 'Override existing numbers'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={handlePreview} disabled={previewMutation.isPending} className="w-full sm:w-auto">
                <Wand2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('exams.rollNumbers.previewAssignment') || 'Preview Auto Assignment'}</span>
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
            <CardTitle className="text-lg">{t('exams.rollNumbers.studentList') || 'Students'}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search') || 'Search...'}
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
                <TableHead>{t('exams.rollNumbers.rollNumber') || 'Roll Number'}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('exams.studentCode') || 'Student Code'}</TableHead>
                <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                <TableHead className="hidden md:table-cell">{t('exams.fatherName') || 'Father Name'}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('exams.class') || 'Class'}</TableHead>
                {hasAssignPermission && <TableHead className="w-24">{t('common.actions') || 'Actions'}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasAssignPermission ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    {t('exams.rollNumbers.noStudents') || 'No students found'}
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
                          {student.examRollNumber ? (
                            <Badge variant="default">{student.examRollNumber}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              {t('exams.rollNumbers.notAssigned') || 'Not assigned'}
                            </Badge>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">{student.studentCode || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:hidden gap-1">
                        <span>{student.fullName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{student.studentCode || '-'}</span>
                        <span className="text-xs text-muted-foreground">{student.className}{student.section && ` - ${student.section}`}</span>
                      </div>
                      <div className="hidden sm:block">{student.fullName}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{student.fatherName || '-'}</TableCell>
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
                            onClick={() => handleStartEdit(student.examStudentId, student.examRollNumber)}
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
            <DialogTitle>{t('exams.rollNumbers.previewTitle') || 'Roll Number Assignment Preview'}</DialogTitle>
            <DialogDescription className="hidden md:block">
              {t('exams.rollNumbers.previewDescription') || 'Review the changes before confirming'}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{previewData.total} {t('exams.rollNumbers.toAssign') || 'to assign'}</span>
                </div>
                {previewData.willOverrideCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>{previewData.willOverrideCount} {t('exams.rollNumbers.willOverride') || 'will be overridden'}</span>
                  </div>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                    <TableHead>{t('exams.class') || 'Class'}</TableHead>
                    <TableHead>{t('exams.rollNumbers.current') || 'Current'}</TableHead>
                    <TableHead>{t('exams.rollNumbers.new') || 'New'}</TableHead>
                    <TableHead>{t('common.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.items.slice(0, 50).map((item: NumberAssignmentPreviewItem) => (
                    <TableRow key={item.examStudentId}>
                      <TableCell>{item.studentName}</TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell>
                        {item.currentRollNumber || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-bold">
                        {item.newRollNumber}
                      </TableCell>
                      <TableCell>
                        {item.hasCollision ? (
                          <Badge variant="destructive">{t('exams.rollNumbers.collision') || 'Collision'}</Badge>
                        ) : item.willOverride ? (
                          <Badge variant="secondary">{t('exams.rollNumbers.override') || 'Override'}</Badge>
                        ) : (
                          <Badge variant="default">{t('exams.rollNumbers.new') || 'New'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {previewData.items.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  {t('exams.rollNumbers.andMore', { count: previewData.items.length - 50 }) || 
                    `... and ${previewData.items.length - 50} more`}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)} className="w-full sm:w-auto">
              {t('common.cancel') || 'Cancel'}
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
              {t('exams.rollNumbers.confirmAssign') || 'Confirm & Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.rollNumbers.confirmOverride') || 'Confirm Override'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.rollNumbers.confirmOverrideDescription', { count: previewData?.willOverrideCount || 0 }) ||
                `You are about to override ${previewData?.willOverrideCount || 0} existing roll numbers. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={confirmMutation.isPending}>
              {t('exams.rollNumbers.confirmOverrideButton') || 'Yes, Override'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
      )}
    </div>
  );
}

export default ExamRollNumbersPage;
