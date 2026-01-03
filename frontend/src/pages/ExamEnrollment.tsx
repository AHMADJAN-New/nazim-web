import { 
  Trash2, 
  Plus, 
  CalendarDays, 
  NotebookPen, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  GraduationCap, 
  BookOpen, 
  Users,
  CheckCircle2,
  AlertCircle,
  Layers,
  Filter,
  X,
  Calendar,
  LayoutGrid,
  List
} from 'lucide-react';
import { useEffect, useMemo, useState, useCallback } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import {
  useExams,
  useExamClasses,
  useAssignClassToExam,
  useRemoveClassFromExam,
  useExamSubjects,
  useEnrollSubjectToExam,
  useRemoveExamSubject,
  useUpdateExamSubject,
} from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useClassSubjects } from '@/hooks/useSubjects';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import type { Exam, ExamClass, ExamSubject } from '@/types/domain/exam';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExamClassCardProps {
  examClass: ExamClass;
  examSubjects: ExamSubject[];
  organizationId?: string | null;
  selectedExamId?: string;
  exam?: Exam | null;
  hasAssign: boolean;
  enrollSubject: ReturnType<typeof useEnrollSubjectToExam>;
  removeSubject: ReturnType<typeof useRemoveExamSubject>;
  removeClass: ReturnType<typeof useRemoveClassFromExam>;
  updateSubject: ReturnType<typeof useUpdateExamSubject>;
  subjectDrafts: Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }>;
  onDraftChange: (id: string, draft: { totalMarks: string; passingMarks: string; scheduledAt: string }) => void;
  defaultExpanded?: boolean;
}

function ExamClassCard({
  examClass,
  examSubjects,
  organizationId,
  selectedExamId,
  exam,
  hasAssign,
  enrollSubject,
  removeSubject,
  removeClass,
  updateSubject,
  subjectDrafts,
  onDraftChange,
  defaultExpanded = false,
}: ExamClassCardProps) {
  const { t } = useLanguage();
  // Fix: Ensure we have classAcademicYearId before fetching subjects
  const { data: classSubjects, isLoading: subjectsLoading } = useClassSubjects(
    examClass.classAcademicYearId || undefined, 
    organizationId || undefined
  );
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);

  const linkedSubjects = useMemo(() => examSubjects.filter((s) => s.examClassId === examClass.id), [examSubjects, examClass.id]);
  const availableSubjectOptions = useMemo(() => {
    if (!classSubjects || !Array.isArray(classSubjects)) return [];
    const assigned = new Set(linkedSubjects.map((s) => s.classSubjectId));
    return classSubjects.filter((cs) => cs.id && !assigned.has(cs.id));
  }, [classSubjects, linkedSubjects]);

  const scheduledCount = useMemo(() => linkedSubjects.filter(s => s.scheduledAt).length, [linkedSubjects]);
  const configuredCount = useMemo(() => linkedSubjects.filter(s => s.totalMarks && s.passingMarks).length, [linkedSubjects]);

  const handleEnroll = () => {
    if (!selectedExamId || !selectedClassSubjectId) return;
    enrollSubject.mutate({
      exam_id: selectedExamId,
      exam_class_id: examClass.id,
      class_subject_id: selectedClassSubjectId,
    }, {
      onSuccess: () => {
        setSelectedClassSubjectId('');
      }
    });
  };

  const handleBulkEnroll = () => {
    if (!selectedExamId || selectedSubjectIds.length === 0) return;
    
    // Enroll subjects one by one (could be optimized with a bulk API endpoint)
    selectedSubjectIds.forEach((classSubjectId) => {
      enrollSubject.mutate({
        exam_id: selectedExamId,
        exam_class_id: examClass.id,
        class_subject_id: classSubjectId,
      });
    });
    
    setSelectedSubjectIds([]);
    setShowBulkEnroll(false);
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const classLabel = `${examClass.classAcademicYear?.class?.name || 'Class'}${examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : ''}`;

  const getStatusColor = () => {
    if (linkedSubjects.length === 0) return 'bg-amber-500/10 border-amber-500/30';
    if (configuredCount === linkedSubjects.length) return 'bg-emerald-500/10 border-emerald-500/30';
    return 'bg-sky-500/10 border-sky-500/30';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn('transition-all duration-200', getStatusColor())}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  linkedSubjects.length === 0 ? 'bg-amber-500/20 text-amber-600' :
                  configuredCount === linkedSubjects.length ? 'bg-emerald-500/20 text-emerald-600' :
                  'bg-sky-500/20 text-sky-600'
                )}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {classLabel}
                    {linkedSubjects.length > 0 && configuredCount === linkedSubjects.length && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {linkedSubjects.length} {t('exams.subjects') || 'subjects'}
                    </span>
                    {scheduledCount > 0 && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Calendar className="h-3 w-3" />
                        {scheduledCount} {t('exams.scheduled') || 'scheduled'}
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasAssign && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClass.mutate(examClass.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('exams.removeClass') || 'Remove class'}</TooltipContent>
                  </Tooltip>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <Separator />
            
            {/* Subject enrollment mode toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('exams.enrollSubject') || 'Enroll Subjects'}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowBulkEnroll(!showBulkEnroll);
                  if (showBulkEnroll) {
                    setSelectedSubjectIds([]);
                  }
                }}
                className="flex-shrink-0"
              >
                <span className="text-xs sm:text-sm">{showBulkEnroll ? t('common.cancel') || 'Cancel' : t('exams.bulkEnroll') || 'Bulk Enroll'}</span>
              </Button>
            </div>

            {showBulkEnroll ? (
              /* Bulk subject enrollment */
              <div className="space-y-3">
                {subjectsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : availableSubjectOptions.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border-2 border-dashed">
                    {t('exams.allSubjectsEnrolled') || 'All subjects enrolled'}
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="space-y-2">
                        {availableSubjectOptions.map((cs) => (
                          <div key={cs.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`subject-${cs.id}`}
                              checked={selectedSubjectIds.includes(cs.id)}
                              onCheckedChange={() => toggleSubjectSelection(cs.id)}
                            />
                            <label
                              htmlFor={`subject-${cs.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {cs.subject?.name || cs.id}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {selectedSubjectIds.length} {t('exams.selected') || 'selected'}
                      </span>
                      <Button
                        onClick={handleBulkEnroll}
                        disabled={selectedSubjectIds.length === 0 || enrollSubject.isPending}
                        size="sm"
                        className="flex-shrink-0"
                      >
                        <Plus className="h-4 w-4 sm:mr-1" />
                        <span className="text-xs sm:text-sm">{t('exams.enrollSelected') || `Enroll ${selectedSubjectIds.length} Subject(s)`}</span>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Single subject enrollment */
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">{t('exams.selectSubject') || 'Select subject'}</Label>
                  <Select 
                    value={selectedClassSubjectId} 
                    onValueChange={setSelectedClassSubjectId}
                    disabled={subjectsLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={
                        subjectsLoading 
                          ? (t('common.loading') || 'Loading...')
                          : (t('exams.selectSubject') || 'Select subject')
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsLoading ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t('common.loading') || 'Loading subjects...'}
                        </div>
                      ) : availableSubjectOptions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t('exams.allSubjectsEnrolled') || 'All subjects enrolled'}
                        </div>
                      ) : (
                        availableSubjectOptions.map((cs) => (
                          <SelectItem key={cs.id} value={cs.id}>
                            {cs.subject?.name || cs.id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleEnroll} 
                  disabled={!selectedClassSubjectId || enrollSubject.isPending || subjectsLoading}
                  size="sm"
                  className="flex-shrink-0"
                >
                  <Plus className="h-4 w-4 sm:mr-1" />
                  <span className="text-xs sm:text-sm">{t('common.add') || 'Add'}</span>
                </Button>
              </div>
            )}

            {/* Enrolled subjects */}
            {linkedSubjects.length === 0 ? (
              <div className="text-center py-6 rounded-lg border-2 border-dashed border-muted">
                <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">{t('exams.noSubjectsEnrolled') || 'No subjects enrolled yet.'}</p>
                <p className="text-xs text-muted-foreground">{t('exams.selectSubjectToEnroll') || 'Select a subject above to enroll'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedSubjects.map((subject) => {
                  const draft = subjectDrafts[subject.id] || { totalMarks: '', passingMarks: '', scheduledAt: '' };
                  const isConfigured = draft.totalMarks && draft.passingMarks;
                  
                  return (
                    <div
                      key={subject.id}
                      className={cn(
                        "rounded-lg border p-3 transition-all",
                        isConfigured ? "bg-background" : "bg-amber-500/5 border-amber-500/20"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            isConfigured ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="font-medium text-sm">{subject.subject?.name || subject.subjectId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {subject.scheduledAt && (
                            <Badge variant="outline" className="text-xs bg-background">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              {formatDate(subject.scheduledAt)}
                            </Badge>
                          )}
                          {hasAssign && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                              onClick={() => removeSubject.mutate(subject.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('exams.totalMarks') || 'Total'}</Label>
                          <Input
                            type="number"
                            value={draft.totalMarks}
                            onChange={(e) => onDraftChange(subject.id, { ...draft, totalMarks: e.target.value })}
                            placeholder="100"
                            disabled={!hasAssign}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('exams.passingMarks') || 'Pass'}</Label>
                          <Input
                            type="number"
                            value={draft.passingMarks}
                            onChange={(e) => onDraftChange(subject.id, { ...draft, passingMarks: e.target.value })}
                            placeholder="40"
                            disabled={!hasAssign}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('exams.date') || 'Date'}</Label>
                          <CalendarDatePicker
                            date={draft.scheduledAt ? new Date(draft.scheduledAt) : undefined}
                            onDateChange={(date) => onDraftChange(subject.id, { ...draft, scheduledAt: date ? date.toISOString().slice(0, 10) : '' })}
                            disabled={!hasAssign}
                            className="h-8 text-sm"
                            minDate={exam?.startDate ? new Date(exam.startDate) : undefined}
                            maxDate={exam?.endDate ? new Date(exam.endDate) : undefined}
                          />
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full h-8"
                            onClick={() =>
                              updateSubject.mutate({
                                id: subject.id,
                                data: {
                                  total_marks: draft.totalMarks ? Number(draft.totalMarks) : null,
                                  passing_marks: draft.passingMarks ? Number(draft.passingMarks) : null,
                                  scheduled_at: draft.scheduledAt || null,
                                },
                              })
                            }
                            disabled={!hasAssign || updateSubject.isPending}
                          >
                            <NotebookPen className="h-3 w-3 sm:mr-1" />
                            <span className="text-xs sm:text-sm">{t('common.save') || 'Save'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Exam Card Component for the selector
interface ExamCardProps {
  exam: Exam;
  isSelected: boolean;
  onClick: () => void;
  classCount?: number;
  subjectCount?: number;
}

function ExamCard({ exam, isSelected, onClick, classCount = 0, subjectCount = 0 }: ExamCardProps) {
  const { t } = useLanguage();
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected 
          ? "border-primary bg-primary/5 shadow-sm" 
          : "border-transparent bg-muted/30 hover:border-muted-foreground/20"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-medium text-sm truncate",
            isSelected && "text-primary"
          )}>
            {exam.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exam.academicYear?.name || 'N/A'}
          </p>
        </div>
        {isSelected && (
          <div className="flex-shrink-0">
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3" />
          {classCount}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {subjectCount}
        </span>
      </div>
    </div>
  );
}

export function ExamEnrollment() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Data fetching
  const { data: exams, isLoading } = useExams(organizationId);
  const { data: academicYears } = useAcademicYears(organizationId);
  const updateExamSubject = useUpdateExamSubject();

  // State
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [draftSubjects, setDraftSubjects] = useState<Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }>>({});
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique academic years from exams
  const examAcademicYears = useMemo(() => {
    if (!exams) return [];
    const years = new Map<string, { id: string; name: string }>();
    exams.forEach(exam => {
      if (exam.academicYear) {
        years.set(exam.academicYearId, {
          id: exam.academicYearId,
          name: exam.academicYear.name
        });
      }
    });
    return Array.from(years.values()).sort((a, b) => b.name.localeCompare(a.name));
  }, [exams]);

  // Filter exams
  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = searchQuery === '' || 
        exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.academicYear?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesYear = selectedAcademicYearFilter === 'all' || 
        exam.academicYearId === selectedAcademicYearFilter;
      return matchesSearch && matchesYear;
    });
  }, [exams, searchQuery, selectedAcademicYearFilter]);

  // Auto-select first exam
  useEffect(() => {
    if (filteredExams && filteredExams.length > 0 && !selectedExam) {
      setSelectedExam(filteredExams[0]);
    }
  }, [filteredExams, selectedExam]);

  // Fetch exam details
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExam?.id);
  const { data: examSubjects } = useExamSubjects(selectedExam?.id);
  
  // Fix: Ensure we fetch classes for the exam's academic year
  const { data: availableClasses, isLoading: classesLoading2 } = useClassAcademicYears(
    selectedExam?.academicYearId || undefined, 
    organizationId
  );

  // Filter out already assigned classes
  const unassignedClasses = useMemo(() => {
    if (!availableClasses || !Array.isArray(availableClasses)) return [];
    if (!examClasses || !Array.isArray(examClasses)) return availableClasses;
    const assignedIds = new Set(examClasses.map(ec => ec.classAcademicYearId));
    return availableClasses.filter(c => c.id && !assignedIds.has(c.id));
  }, [availableClasses, examClasses]);

  // Bulk class selection state
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [showBulkClassAssign, setShowBulkClassAssign] = useState(false);

  // Initialize draft subjects
  useEffect(() => {
    const nextDrafts: Record<string, { totalMarks: string; passingMarks: string; scheduledAt: string }> = {};
    (examSubjects || []).forEach((subject) => {
      nextDrafts[subject.id] = {
        totalMarks: subject.totalMarks?.toString() || '',
        passingMarks: subject.passingMarks?.toString() || '',
        scheduledAt: subject.scheduledAt ? subject.scheduledAt.toISOString().slice(0, 10) : '',
      };
    });
    setDraftSubjects(nextDrafts);
  }, [examSubjects]);

  // Mutations
  const assignClass = useAssignClassToExam();
  const removeClass = useRemoveClassFromExam();
  const enrollSubject = useEnrollSubjectToExam();
  const removeSubject = useRemoveExamSubject();
  
  const onDraftChange = useCallback((
    id: string,
    draft: { totalMarks: string; passingMarks: string; scheduledAt: string }
  ) => {
    setDraftSubjects((prev) => ({
      ...prev,
      [id]: draft,
    }));
  }, []);

  const hasAssign = useHasPermission('exams.assign');

  // Bulk class assignment handlers
  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleBulkAssignClasses = () => {
    if (!selectedExam?.id || selectedClassIds.length === 0) return;
    
    // Assign classes one by one (could be optimized with a bulk API endpoint)
    selectedClassIds.forEach((classAcademicYearId) => {
      assignClass.mutate({
        exam_id: selectedExam.id,
        class_academic_year_id: classAcademicYearId,
      });
    });
    
    setSelectedClassIds([]);
    setShowBulkClassAssign(false);
  };

  // Stats
  const stats = useMemo(() => ({
    totalExams: exams?.length ?? 0,
    filteredExams: filteredExams.length,
    classes: examClasses?.length ?? 0,
    subjects: examSubjects?.length ?? 0,
    configuredSubjects: examSubjects?.filter(s => s.totalMarks && s.passingMarks).length ?? 0,
    scheduledSubjects: examSubjects?.filter(s => s.scheduledAt).length ?? 0,
  }), [exams?.length, filteredExams.length, examClasses?.length, examSubjects]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedAcademicYearFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedAcademicYearFilter !== 'all';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
        <PageHeader
          title={t('exams.enrollment') || 'Exam Enrollment'}
          description={t('exams.enrollmentDescription') || 'Assign classes, enroll subjects, and set schedules for exams.'}
          icon={<GraduationCap className="h-5 w-5" />}
          rightSlot={selectedExam && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 py-1.5 px-3">
                <Calendar className="h-3 w-3" />
                {selectedExam.academicYear?.name}
              </Badge>
              <Badge className="gap-1 py-1.5 px-3">
                {selectedExam.name}
              </Badge>
            </div>
          )}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('exams.classes') || 'Classes'}</p>
                  <p className="text-2xl font-bold mt-1">{stats.classes}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Layers className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('exams.subjects') || 'Subjects'}</p>
                  <p className="text-2xl font-bold mt-1">{stats.subjects}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('exams.configured') || 'Configured'}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.configuredSubjects}
                    <span className="text-sm font-normal text-muted-foreground">/{stats.subjects}</span>
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('exams.scheduled') || 'Scheduled'}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.scheduledSubjects}
                    <span className="text-sm font-normal text-muted-foreground">/{stats.subjects}</span>
                  </p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Exam Selector - Left Panel */}
          <div className="lg:col-span-4 xl:col-span-3">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t('exams.selectExam') || 'Select Exam'}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  {stats.filteredExams} of {stats.totalExams} {t('exams.examsShown') || 'exams shown'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Search & Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('exams.searchExams') || 'Search exams...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-7 w-7"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Academic Year Filter */}
                  <div className="flex items-center gap-2">
                    <Select value={selectedAcademicYearFilter} onValueChange={setSelectedAcademicYearFilter}>
                      <SelectTrigger className="h-9">
                        <div className="flex items-center gap-2">
                          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue placeholder={t('exams.filterByYear') || 'Filter by year'} />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('common.all') || 'All Years'}</SelectItem>
                        {examAcademicYears.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Exam List */}
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                ) : filteredExams.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {hasActiveFilters 
                        ? t('exams.noExamsMatchFilter') || 'No exams match your filters'
                        : t('exams.noExamsFound') || 'No exams found'}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="mt-1">
                        {t('common.clearFilters') || 'Clear filters'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] pr-3">
                    <div className={cn(
                      "space-y-2",
                      viewMode === 'grid' && "grid grid-cols-1 gap-2"
                    )}>
                      {filteredExams.map((exam) => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          isSelected={selectedExam?.id === exam.id}
                          onClick={() => setSelectedExam(exam)}
                          classCount={exam.id === selectedExam?.id ? stats.classes : 0}
                          subjectCount={exam.id === selectedExam?.id ? stats.subjects : 0}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enrollment Panel - Right */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {!selectedExam ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-16">
                  <div className="text-center">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <h3 className="text-lg font-medium mt-4">{t('exams.selectExamPrompt') || 'Select an exam to manage enrollment'}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('exams.selectExamHint') || 'Choose an exam from the left panel to assign classes and enroll subjects'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Add Class Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          {t('exams.assignClass') || 'Assign Class'}
                        </CardTitle>
                        <CardDescription className="hidden md:block">
                          {unassignedClasses.length} {t('exams.classesAvailable') || 'classes available to assign'}
                          {selectedExam?.academicYear && (
                            <span className="ml-2 text-xs">
                              ({t('exams.forAcademicYear') || 'for'} {selectedExam.academicYear.name})
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      {unassignedClasses.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowBulkClassAssign(!showBulkClassAssign);
                            if (showBulkClassAssign) {
                              setSelectedClassIds([]);
                            }
                          }}
                          className="flex-shrink-0"
                        >
                          <span className="text-xs sm:text-sm">{showBulkClassAssign ? t('common.cancel') || 'Cancel' : t('exams.bulkAssign') || 'Bulk Assign'}</span>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {showBulkClassAssign ? (
                      /* Bulk class assignment */
                      <div className="space-y-3">
                        {classesLoading || classesLoading2 ? (
                          <Skeleton className="h-32 w-full" />
                        ) : unassignedClasses.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center rounded-lg border-2 border-dashed">
                            {t('exams.allClassesAssigned') || 'All classes assigned'}
                          </div>
                        ) : (
                          <>
                            <ScrollArea className="h-48 border rounded-lg p-3">
                              <div className="space-y-2">
                                {unassignedClasses.map((c) => (
                                  <div key={c.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`class-${c.id}`}
                                      checked={selectedClassIds.includes(c.id)}
                                      onCheckedChange={() => toggleClassSelection(c.id)}
                                    />
                                    <label
                                      htmlFor={`class-${c.id}`}
                                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                    >
                                      {c.class?.name} {c.sectionName ? `- ${c.sectionName}` : ''}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {selectedClassIds.length} {t('exams.selected') || 'selected'}
                              </span>
                              <Button
                                onClick={handleBulkAssignClasses}
                                disabled={selectedClassIds.length === 0 || assignClass.isPending}
                                className="flex-shrink-0"
                              >
                                <Plus className="h-4 w-4 sm:mr-1" />
                                <span className="text-xs sm:text-sm">{t('exams.assignSelected') || `Assign ${selectedClassIds.length} Class(es)`}</span>
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Single class assignment */
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label className="text-xs text-muted-foreground">{t('exams.classSection') || 'Class Section'}</Label>
                          <Select
                            value={selectedClassId}
                            onValueChange={setSelectedClassId}
                            disabled={!hasAssign || classesLoading || classesLoading2}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={
                                classesLoading || classesLoading2
                                  ? (t('common.loading') || 'Loading...')
                                  : (t('exams.selectClassToAssign') || 'Select a class to assign')
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {classesLoading || classesLoading2 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  {t('common.loading') || 'Loading classes...'}
                                </div>
                              ) : unassignedClasses.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  {t('exams.allClassesAssigned') || 'All classes assigned'}
                                </div>
                              ) : (
                                unassignedClasses.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.class?.name} {c.sectionName ? `- ${c.sectionName}` : ''}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          disabled={!selectedExam?.id || !selectedClassId || !hasAssign || assignClass.isPending || classesLoading || classesLoading2}
                          onClick={() => {
                            if (!selectedExam?.id || !selectedClassId) return;
                            assignClass.mutate(
                              { exam_id: selectedExam.id, class_academic_year_id: selectedClassId },
                              { onSuccess: () => setSelectedClassId('') }
                            );
                          }}
                          className="flex-shrink-0"
                        >
                          <Plus className="h-4 w-4 sm:mr-1" />
                          <span className="text-xs sm:text-sm">{t('exams.assignClass') || 'Assign Class'}</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Classes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      {t('exams.assignedClasses') || 'Assigned Classes'}
                      <Badge variant="secondary" className="ml-1">{stats.classes}</Badge>
                    </h2>
                  </div>

                  {classesLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : !examClasses || examClasses.length === 0 ? (
                    <Card className="border-2 border-dashed">
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
                          <h3 className="font-medium mt-3">{t('exams.noClassesAssigned') || 'No classes assigned yet'}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('exams.assignClassHint') || 'Assign classes above to enroll subjects'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {examClasses.map((examClass, index) => (
                        <ExamClassCard
                          key={examClass.id}
                          examClass={examClass}
                          examSubjects={examSubjects || []}
                          organizationId={organizationId}
                          selectedExamId={selectedExam?.id}
                          exam={selectedExam}
                          hasAssign={hasAssign}
                          enrollSubject={enrollSubject}
                          removeSubject={removeSubject}
                          removeClass={removeClass}
                          updateSubject={updateExamSubject}
                          subjectDrafts={draftSubjects}
                          onDraftChange={onDraftChange}
                          defaultExpanded={index === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
