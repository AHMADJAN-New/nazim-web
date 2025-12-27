import React, { useState, useMemo, useEffect } from 'react';
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useDuplicateQuestion, useBulkUpdateQuestions, QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/hooks/useQuestions';
import type { Question, QuestionType, QuestionDifficulty, QuestionOption, QuestionFilters } from '@/hooks/useQuestions';
import { useClassSubjects } from '@/hooks/useSubjects';
import { useSchools } from '@/hooks/useSchools';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { classSubjectsApi } from '@/lib/api/client';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Copy, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { questionSchema, type QuestionFormData } from '@/lib/validations/questionBank';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import type { ColumnDef } from '@tanstack/react-table';

const difficultyConfig: Record<QuestionDifficulty, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  easy: { label: 'Easy', variant: 'default' },
  medium: { label: 'Medium', variant: 'secondary' },
  hard: { label: 'Hard', variant: 'destructive' },
};

const typeConfig: Record<QuestionType, { label: string }> = {
  mcq: { label: 'Multiple Choice' },
  short: { label: 'Short Answer' },
  descriptive: { label: 'Descriptive' },
  true_false: { label: 'True/False' },
  essay: { label: 'Essay' },
};

export function QuestionBank() {
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Permissions
  const hasCreate = useHasPermission('exams.questions.create');
  const hasUpdate = useHasPermission('exams.questions.update');
  const hasDelete = useHasPermission('exams.questions.delete');

  // Get user's default school from profile
  const userDefaultSchoolId = profile?.default_school_id;
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(userDefaultSchoolId || undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();
  const [selectedClassAcademicYearId, setSelectedClassAcademicYearId] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<QuestionType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Data hooks
  const { data: schools } = useSchools(organizationId);
  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  
  // Form academic year state (for class subjects selection)
  const [formAcademicYearId, setFormAcademicYearId] = useState<string>('');
  const [formClassAcademicYearId, setFormClassAcademicYearId] = useState<string>('');
  
  // Get class academic years for the selected academic year in form
  const { data: formClassAcademicYears } = useClassAcademicYears(formAcademicYearId, organizationId);
  
  // Get class subjects for the selected class academic year in form
  const { data: classSubjects } = useClassSubjects(formClassAcademicYearId, organizationId);
  
  // Filter class academic years for filters
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, organizationId);
  
  // Set default academic year for filters
  useEffect(() => {
    if (currentAcademicYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, selectedAcademicYearId]);

  // Build filters object - use user's default school if available
  const filters: QuestionFilters = useMemo(() => ({
    schoolId: selectedSchoolId || userDefaultSchoolId || undefined,
    subjectId: selectedSubjectId,
    classAcademicYearId: selectedClassAcademicYearId,
    type: selectedType !== 'all' ? selectedType : undefined,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
    isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
    search: searchQuery || undefined,
  }), [selectedSchoolId, userDefaultSchoolId, selectedSubjectId, selectedClassAcademicYearId, selectedType, selectedDifficulty, selectedStatus, searchQuery]);

  // Use paginated version of the hook
  const { 
    data: questions, 
    isLoading, 
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useQuestions(filters, true);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const duplicateQuestion = useDuplicateQuestion();
  const bulkUpdateQuestions = useBulkUpdateQuestions();

  // Form setup
  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      schoolId: userDefaultSchoolId || '',
      academicYearId: currentAcademicYear?.id || '',
      classAcademicYearId: '',
      classSubjectId: '',
      type: 'mcq',
      difficulty: 'medium',
      marks: 1,
      text: '',
      textRtl: true,
      options: [
        { key: 'A', text: '', isCorrect: false },
        { key: 'B', text: '', isCorrect: false },
        { key: 'C', text: '', isCorrect: false },
        { key: 'D', text: '', isCorrect: false },
      ],
      correctAnswer: '',
      reference: '',
      tags: [],
      isActive: true,
    },
  });

  // Auto-fill school from profile and set default academic year
  useEffect(() => {
    if (userDefaultSchoolId && !form.getValues('schoolId')) {
      form.setValue('schoolId', userDefaultSchoolId);
    }
    if (currentAcademicYear && !form.getValues('academicYearId')) {
      form.setValue('academicYearId', currentAcademicYear.id);
      setFormAcademicYearId(currentAcademicYear.id);
    }
  }, [userDefaultSchoolId, currentAcademicYear?.id, form]);

  // Watch form values for cascading selects
  const watchedAcademicYearId = form.watch('academicYearId');
  const watchedClassAcademicYearId = form.watch('classAcademicYearId');

  // Update form state when academic year changes
  useEffect(() => {
    if (watchedAcademicYearId) {
      setFormAcademicYearId(watchedAcademicYearId);
      // Reset class academic year and class subject when academic year changes
      form.setValue('classAcademicYearId', '');
      form.setValue('classSubjectId', '');
      setFormClassAcademicYearId('');
    }
  }, [watchedAcademicYearId, form]);

  // Update form state when class academic year changes
  useEffect(() => {
    if (watchedClassAcademicYearId) {
      setFormClassAcademicYearId(watchedClassAcademicYearId);
      // Reset class subject when class academic year changes
      form.setValue('classSubjectId', '');
    } else {
      setFormClassAcademicYearId('');
    }
  }, [watchedClassAcademicYearId, form]);

  const { fields: optionFields, append: appendOption, remove: removeOption, replace: replaceOptions } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  const watchedType = form.watch('type');

  // Reset options when type changes
  useEffect(() => {
    if (watchedType === 'mcq') {
      if (!form.getValues('options') || form.getValues('options')!.length === 0) {
        replaceOptions([
          { key: 'A', text: '', isCorrect: false },
          { key: 'B', text: '', isCorrect: false },
          { key: 'C', text: '', isCorrect: false },
          { key: 'D', text: '', isCorrect: false },
        ]);
      }
    } else if (watchedType === 'true_false') {
      replaceOptions([
        { key: 'true', text: 'True', isCorrect: false },
        { key: 'false', text: 'False', isCorrect: false },
      ]);
    } else {
      replaceOptions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType]);

  const resetForm = () => {
    form.reset({
      schoolId: userDefaultSchoolId || '',
      academicYearId: currentAcademicYear?.id || '',
      classAcademicYearId: '',
      classSubjectId: '',
      type: 'mcq',
      difficulty: 'medium',
      marks: 1,
      text: '',
      textRtl: true,
      options: [
        { key: 'A', text: '', isCorrect: false },
        { key: 'B', text: '', isCorrect: false },
        { key: 'C', text: '', isCorrect: false },
        { key: 'D', text: '', isCorrect: false },
      ],
      correctAnswer: '',
      reference: '',
      tags: [],
      isActive: true,
    });
    setFormAcademicYearId(currentAcademicYear?.id || '');
    setFormClassAcademicYearId('');
    setSelectedQuestion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setSelectedQuestion(question);
    
    // Get academic year from class academic year if available
    const academicYearId = question.classAcademicYear?.academicYearId || currentAcademicYear?.id || '';
    
    // For editing, we need to find the class subject ID
    // Since questions are tied to class_subjects, we need to find it
    // We'll fetch it asynchronously and update the form
    const loadClassSubject = async () => {
      if (question.classAcademicYearId && question.subjectId) {
        try {
          const classSubjectsData = await classSubjectsApi.list({
            class_academic_year_id: question.classAcademicYearId,
            subject_id: question.subjectId,
          });
          if (Array.isArray(classSubjectsData) && classSubjectsData.length > 0) {
            const classSubjectId = classSubjectsData[0].id;
            form.setValue('classSubjectId', classSubjectId);
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[QuestionBank] Error fetching class subject:', error);
          }
        }
      }
    };
    
    form.reset({
      schoolId: question.schoolId,
      academicYearId: academicYearId,
      classAcademicYearId: question.classAcademicYearId || '',
      classSubjectId: '', // Will be set after fetching
      type: question.type,
      difficulty: question.difficulty,
      marks: question.marks,
      text: question.text,
      textRtl: question.textRtl,
      options: question.options?.map(opt => ({
        key: opt.label || opt.id || 'A',
        text: opt.text,
        isCorrect: opt.isCorrect || false,
      })) || [],
      correctAnswer: question.correctAnswer || '',
      reference: question.reference || '',
      tags: question.tags || [],
      isActive: question.isActive,
    });
    
    if (academicYearId) {
      setFormAcademicYearId(academicYearId);
    }
    if (question.classAcademicYearId) {
      setFormClassAcademicYearId(question.classAcademicYearId);
    }
    
    // Load class subject asynchronously
    void loadClassSubject();
    
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (question: Question) => {
    setSelectedQuestion(question);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (question: Question) => {
    setSelectedQuestion(question);
    setIsViewDialogOpen(true);
  };

  const handleCreate = async (data: QuestionFormData) => {
    if (import.meta.env.DEV) {
      console.log('[QuestionBank] handleCreate called with data:', data);
    }
    
    if (!organizationId) {
      showToast.error(t('common.error') || 'Organization required');
      return;
    }

    // Get class subject to extract subjectId and classAcademicYearId
    let subjectId = '';
    let classAcademicYearId = data.classAcademicYearId;
    
    if (data.classSubjectId) {
      try {
        const classSubject = await classSubjectsApi.get(data.classSubjectId);
        if (classSubject) {
          subjectId = (classSubject as any).subject_id;
          classAcademicYearId = (classSubject as any).class_academic_year_id;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error fetching class subject:', error);
        }
        showToast.error(t('common.error') || 'Failed to get class subject details');
        return;
      }
    } else {
      showToast.error(t('common.error') || 'Class subject is required');
      return;
    }

    // Build correct answer from options for MCQ/true_false
    let correctAnswer = data.correctAnswer;
    if ((data.type === 'mcq' || data.type === 'true_false') && data.options) {
      const correctOption = data.options.find(opt => opt.isCorrect);
      correctAnswer = correctOption?.key || '';
    }

    createQuestion.mutate({
      organizationId,
      schoolId: data.schoolId,
      subjectId,
      classAcademicYearId: classAcademicYearId || undefined,
      type: data.type,
      difficulty: data.difficulty,
      marks: data.marks,
      text: data.text,
      textRtl: data.textRtl,
      options: data.options?.map(opt => ({
        id: opt.key || `opt-${Date.now()}-${Math.random()}`,
        label: opt.key,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })) || undefined,
      correctAnswer,
      reference: data.reference || undefined,
      tags: data.tags || undefined,
      isActive: data.isActive,
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      },
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error creating question:', error);
        }
        // Error handling is already done in the hook, but we can add additional handling here if needed
      },
    });
  };

  const handleUpdate = async (data: QuestionFormData) => {
    if (!selectedQuestion) return;

    // Get class subject to extract subjectId and classAcademicYearId
    let subjectId = '';
    let classAcademicYearId = data.classAcademicYearId;
    
    if (data.classSubjectId) {
      try {
        const classSubject = await classSubjectsApi.get(data.classSubjectId);
        if (classSubject) {
          subjectId = (classSubject as any).subject_id;
          classAcademicYearId = (classSubject as any).class_academic_year_id;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error fetching class subject:', error);
        }
        showToast.error(t('common.error') || 'Failed to get class subject details');
        return;
      }
    } else {
      showToast.error(t('common.error') || 'Class subject is required');
      return;
    }

    // Build correct answer from options for MCQ/true_false
    let correctAnswer = data.correctAnswer;
    if ((data.type === 'mcq' || data.type === 'true_false') && data.options) {
      const correctOption = data.options.find(opt => opt.isCorrect);
      correctAnswer = correctOption?.key || '';
    }

    updateQuestion.mutate({
      id: selectedQuestion.id,
      data: {
        subjectId,
        classAcademicYearId: classAcademicYearId || undefined,
        type: data.type,
        difficulty: data.difficulty,
        marks: data.marks,
        text: data.text,
        textRtl: data.textRtl,
        options: data.options?.map(opt => ({
          id: opt.key || `opt-${Date.now()}-${Math.random()}`,
          label: opt.key,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })) || undefined,
        correctAnswer,
        reference: data.reference || undefined,
        tags: data.tags || undefined,
        isActive: data.isActive,
      },
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        resetForm();
      },
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error updating question:', error);
        }
        // Error handling is already done in the hook, but we can add additional handling here if needed
      },
    });
  };

  const handleDelete = () => {
    if (!selectedQuestion) return;
    deleteQuestion.mutate(selectedQuestion.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedQuestion(null);
      },
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error deleting question:', error);
        }
        // Error handling is already done in the hook
      },
    });
  };

  const handleDuplicate = (question: Question) => {
    duplicateQuestion.mutate(question.id, {
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error duplicating question:', error);
        }
        // Error handling is already done in the hook
      },
    });
  };

  const handleBulkActivate = (activate: boolean) => {
    if (selectedQuestionIds.length === 0) return;
    bulkUpdateQuestions.mutate({
      questionIds: selectedQuestionIds,
      isActive: activate,
    }, {
      onSuccess: () => {
        setSelectedQuestionIds([]);
      },
      onError: (error: Error) => {
        if (import.meta.env.DEV) {
          console.error('[QuestionBank] Error bulk updating questions:', error);
        }
        // Error handling is already done in the hook
      },
    });
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleAllQuestions = () => {
    if (!questions || questions.length === 0) return;
    if (selectedQuestionIds.length === questions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questions.map(q => q.id));
    }
  };

  const getDifficultyBadge = (difficulty: QuestionDifficulty) => {
    const config = difficultyConfig[difficulty];
    return (
      <Badge variant={config.variant}>
        {t(`questionBank.difficulty.${difficulty}`) || config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: QuestionType) => {
    const config = typeConfig[type];
    return (
      <Badge variant="outline">
        {t(`questionBank.type.${type}`) || config.label}
      </Badge>
    );
  };

  // Define columns for DataTable
  const columns: ColumnDef<Question>[] = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            if (value) {
              setSelectedQuestionIds(questions.map(q => q.id));
            } else {
              setSelectedQuestionIds([]);
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedQuestionIds.includes(row.original.id)}
          onCheckedChange={() => toggleQuestionSelection(row.original.id)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'text',
      header: t('questionBank.question') || 'Question',
      cell: ({ row }) => (
        <div 
          className={cn(
            "max-w-[400px] truncate",
            row.original.textRtl && "text-right"
          )}
          dir={row.original.textRtl ? 'rtl' : 'ltr'}
        >
          {row.original.text}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: t('questionBank.type') || 'Type',
      cell: ({ row }) => getTypeBadge(row.original.type),
    },
    {
      accessorKey: 'difficulty',
      header: t('questionBank.difficulty') || 'Difficulty',
      cell: ({ row }) => getDifficultyBadge(row.original.difficulty),
    },
    {
      accessorKey: 'marks',
      header: t('questionBank.marks') || 'Marks',
      cell: ({ row }) => row.original.marks,
    },
    {
      accessorKey: 'subject',
      header: t('questionBank.subject') || 'Subject',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.subject?.name || '—'}</Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: t('questionBank.status') || 'Status',
      cell: ({ row }) => (
        row.original.isActive ? (
          <Badge variant="default">{t('common.active') || 'Active'}</Badge>
        ) : (
          <Badge variant="outline">{t('common.inactive') || 'Inactive'}</Badge>
        )
      ),
    },
    {
      id: 'actions',
      header: t('common.actions') || 'Actions',
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openViewDialog(row.original)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('common.view') || 'View'}
              </DropdownMenuItem>
              {hasUpdate && (
                <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit') || 'Edit'}
                </DropdownMenuItem>
              )}
              {hasCreate && (
                <DropdownMenuItem onClick={() => handleDuplicate(row.original)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('common.duplicate') || 'Duplicate'}
                </DropdownMenuItem>
              )}
              {hasDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => openDeleteDialog(row.original)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete') || 'Delete'}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ], [t, questions, selectedQuestionIds, hasUpdate, hasCreate, hasDelete]);

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: questions,
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
    getRowId: (row) => row.id,
  });

  const handleCorrectOptionChange = (index: number) => {
    const options = form.getValues('options') || [];
    const updatedOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    form.setValue('options', updatedOptions);
  };

  const QuestionFormFields = ({ isEdit = false }: { isEdit?: boolean }) => {
    const selectedSchool = useMemo(() => {
      const schoolId = form.watch('schoolId');
      if (!schoolId || !schools) return null;
      return schools.find(s => s.id === schoolId);
    }, [form.watch('schoolId'), schools]);

    // Show Select if user doesn't have a default school, otherwise show read-only input
    const showSchoolSelect = !userDefaultSchoolId;

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* School (Required) - Show Select if no default school, otherwise read-only */}
        <div>
          <Label>{t('questionBank.school') || 'School'} *</Label>
          {showSchoolSelect ? (
            <Controller
              control={form.control}
              name="schoolId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="schoolId">
                    <SelectValue placeholder={t('questionBank.selectSchool') || 'Select school'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(schools || [])
                      .filter((school): school is NonNullable<typeof school> => 
                        Boolean(school?.id && school?.schoolName)
                      )
                      .map((school, idx) => (
                        <SelectItem 
                          key={`school-form-${school.id}-${idx}`} 
                          value={String(school.id)}
                        >
                          {school.schoolName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <>
              {selectedSchool ? (
                <Input value={selectedSchool.schoolName} disabled readOnly className="bg-muted" />
              ) : (
                <Input value={t('questionBank.loading') || 'Loading...'} disabled className="bg-muted" />
              )}
              <input type="hidden" {...form.register('schoolId')} />
            </>
          )}
          {form.formState.errors.schoolId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.schoolId.message}</p>
          )}
        </div>

        {/* Academic Year (Required) */}
        <div>
          <Label>{t('questionBank.academicYear') || 'Academic Year'} *</Label>
          <Controller
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                <SelectTrigger id="academicYearId">
                  <SelectValue placeholder={t('questionBank.selectAcademicYear') || 'Select academic year'} />
                </SelectTrigger>
                <SelectContent>
                  {(academicYears || [])
                    .filter((ay): ay is NonNullable<typeof ay> => 
                      Boolean(ay?.id && ay?.name)
                    )
                    .map((ay, idx) => (
                      <SelectItem 
                        key={`academic-year-form-${ay.id}-${idx}`} 
                        value={String(ay.id)}
                      >
                        {ay.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.academicYearId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.academicYearId.message}</p>
          )}
        </div>

        {/* Class Academic Year (Required) */}
        <div>
          <Label>{t('questionBank.classAcademicYear') || 'Class'} *</Label>
          <Controller
            control={form.control}
            name="classAcademicYearId"
            render={({ field }) => (
              <Select 
                value={field.value} 
                onValueChange={field.onChange}
                disabled={!watchedAcademicYearId || isEdit}
              >
                <SelectTrigger id="classAcademicYearId">
                  <SelectValue placeholder={
                    !watchedAcademicYearId 
                      ? (t('questionBank.selectAcademicYearFirst') || 'Select academic year first')
                      : (t('questionBank.selectClass') || 'Select class')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {(formClassAcademicYears || [])
                    .filter((cay): cay is NonNullable<typeof cay> => 
                      Boolean(cay?.id && cay?.class?.name)
                    )
                    .map((cay, idx) => (
                      <SelectItem 
                        key={`cay-form-${cay.id}-${idx}`} 
                        value={String(cay.id)}
                      >
                        {cay.class?.name || `Class ${idx + 1}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.classAcademicYearId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.classAcademicYearId.message}</p>
          )}
        </div>

        {/* Class Subject (Required) - Subject assigned to class in academic year */}
        <div>
          <Label>{t('questionBank.classSubject') || 'Subject'} *</Label>
          <Controller
            control={form.control}
            name="classSubjectId"
            render={({ field }) => (
              <Select 
                value={field.value} 
                onValueChange={field.onChange}
                disabled={!watchedClassAcademicYearId || isEdit}
              >
                <SelectTrigger id="classSubjectId">
                  <SelectValue placeholder={
                    !watchedClassAcademicYearId 
                      ? (t('questionBank.selectClassFirst') || 'Select class first')
                      : (t('questionBank.selectSubject') || 'Select subject')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {(classSubjects || [])
                    .filter((cs): cs is NonNullable<typeof cs> => 
                      Boolean(cs?.id && cs?.subject?.name)
                    )
                    .map((cs, idx) => (
                      <SelectItem 
                        key={`class-subject-form-${cs.id}-${idx}`} 
                        value={String(cs.id)}
                      >
                        {cs.subject?.name || 'Unknown Subject'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.classSubjectId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.classSubjectId.message}</p>
          )}
        </div>

      {/* Type, Difficulty, Marks */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>{t('questionBank.type') || 'Type'} *</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES
                    .filter((type): type is { value: QuestionType; label: string } => Boolean(type?.value))
                    .map((type, idx) => (
                      <SelectItem 
                        key={`type-form-${type.value}-${idx}`} 
                        value={type.value}
                      >
                        {t(`questionBank.type.${type.value}`) || type.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>{t('questionBank.difficulty') || 'Difficulty'} *</Label>
          <Controller
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_DIFFICULTIES
                    .filter((diff): diff is { value: QuestionDifficulty; label: string } => Boolean(diff?.value))
                    .map((diff, idx) => (
                      <SelectItem 
                        key={`difficulty-form-${diff.value}-${idx}`} 
                        value={diff.value}
                      >
                        {t(`questionBank.difficulty.${diff.value}`) || diff.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="marks">{t('questionBank.marks') || 'Marks'} *</Label>
          <Input
            id="marks"
            type="number"
            step="0.5"
            min="0.5"
            max="100"
            {...form.register('marks')}
          />
          {form.formState.errors.marks && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.marks.message}</p>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="text">{t('questionBank.questionText') || 'Question Text'} *</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="textRtl" className="text-sm">{t('questionBank.rtl') || 'RTL'}</Label>
            <Controller
              control={form.control}
              name="textRtl"
              render={({ field }) => (
                <Switch
                  id="textRtl"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
        <Textarea
          id="text"
          {...form.register('text')}
          rows={4}
          dir={form.watch('textRtl') ? 'rtl' : 'ltr'}
          className={cn(form.watch('textRtl') && 'text-right')}
          placeholder={t('questionBank.questionTextPlaceholder') || 'Enter question text...'}
        />
        {form.formState.errors.text && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.text.message}</p>
        )}
      </div>

      {/* Options for MCQ / True-False */}
      {(watchedType === 'mcq' || watchedType === 'true_false') && (
        <div>
          <Label className="mb-2 block">{t('questionBank.options') || 'Options'}</Label>
          <div className="space-y-2">
            {optionFields.map((field, index) => {
              const fieldId = field.id || `option-field-${index}`;
              const uniqueKey = `option-${fieldId}-${index}`;
              const optionError = form.formState.errors.options?.[index];
              return (
              <div key={uniqueKey} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {field.key}
                </div>
                <div className="flex-1">
                  <Input
                    {...form.register(`options.${index}.text`)}
                    placeholder={t('questionBank.optionPlaceholder') || 'Option text...'}
                    className={cn(optionError?.text && 'border-destructive')}
                    disabled={watchedType === 'true_false'}
                  />
                  {optionError?.text && (
                    <p className="text-sm text-destructive mt-1">{optionError.text.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={form.watch(`options.${index}.isCorrect`)}
                    onCheckedChange={() => handleCorrectOptionChange(index)}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('questionBank.correct') || 'Correct'}
                  </span>
                </div>
                {watchedType === 'mcq' && optionFields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              );
            })}
            {watchedType === 'mcq' && optionFields.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendOption({ key: String.fromCharCode(65 + optionFields.length), text: '', isCorrect: false })}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('questionBank.addOption') || 'Add Option'}
              </Button>
            )}
            {form.formState.errors.options && typeof form.formState.errors.options === 'object' && 'message' in form.formState.errors.options && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.options.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Correct Answer for Short/Descriptive/Essay */}
      {(watchedType === 'short' || watchedType === 'descriptive' || watchedType === 'essay') && (
        <div>
          <Label htmlFor="correctAnswer">{t('questionBank.correctAnswer') || 'Model Answer'}</Label>
          <Textarea
            id="correctAnswer"
            {...form.register('correctAnswer')}
            rows={3}
            placeholder={t('questionBank.correctAnswerPlaceholder') || 'Enter model answer (optional)...'}
          />
        </div>
      )}

      {/* Reference */}
      <div>
        <Label htmlFor="reference">{t('questionBank.reference') || 'Reference'}</Label>
        <Input
          id="reference"
          {...form.register('reference')}
          placeholder={t('questionBank.referencePlaceholder') || 'e.g., Chapter 5, Page 120'}
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-2">
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label>{t('questionBank.active') || 'Active'}</Label>
      </div>
    </div>
  );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('questionBank.title') || 'Question Bank'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('questionBank.description') || 'Create and manage exam questions'}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedQuestionIds.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkActivate(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('questionBank.activate') || 'Activate'} ({selectedQuestionIds.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkActivate(false)}>
                <XCircle className="h-4 w-4 mr-2" />
                {t('questionBank.deactivate') || 'Deactivate'} ({selectedQuestionIds.length})
              </Button>
            </>
          )}
          {questions && questions.length > 0 && (
            <ReportExportButtons
              data={questions}
              columns={[
                { key: 'questionText', label: t('questionBank.question') || 'Question' },
                { key: 'type', label: t('questionBank.type') || 'Type' },
                { key: 'difficulty', label: t('questionBank.difficulty') || 'Difficulty' },
                { key: 'marks', label: t('questionBank.marks') || 'Marks' },
                { key: 'subject', label: t('questionBank.subject') || 'Subject' },
                { key: 'className', label: t('questionBank.class') || 'Class' },
                { key: 'status', label: t('questionBank.status') || 'Status' },
                { key: 'correctAnswer', label: t('questionBank.correctAnswer') || 'Correct Answer' },
              ]}
              reportKey="question_bank"
              title={t('questionBank.title') || 'Question Bank'}
              transformData={(data) => data.map((q: Question) => ({
                questionText: q.text || '-',
                type: typeConfig[q.type]?.label || q.type,
                difficulty: difficultyConfig[q.difficulty]?.label || q.difficulty,
                marks: q.marks || 0,
                subject: q.subject?.name || '-',
                className: q.classAcademicYear?.class?.name || t('common.all') || 'All',
                status: q.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive'),
                correctAnswer: q.correctAnswer || '-',
              }))}
              buildFiltersSummary={() => {
                const parts: string[] = [];
                if (selectedType !== 'all') parts.push(`Type: ${typeConfig[selectedType]?.label || selectedType}`);
                if (selectedDifficulty !== 'all') parts.push(`Difficulty: ${difficultyConfig[selectedDifficulty]?.label || selectedDifficulty}`);
                if (selectedStatus !== 'all') parts.push(`Status: ${selectedStatus === 'active' ? 'Active' : 'Inactive'}`);
                parts.push(`Total: ${pagination?.total || questions.length} questions`);
                return parts.join(' | ');
              }}
              schoolId={profile?.default_school_id}
              templateType="question_bank"
              disabled={!questions || questions.length === 0}
            />
          )}
          {hasCreate && (
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('questionBank.create') || 'Create Question'}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('questionBank.searchPlaceholder') || 'Search questions...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Academic Year Filter */}
            <Select value={selectedAcademicYearId || 'all'} onValueChange={(val) => setSelectedAcademicYearId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.filterAcademicYear') || 'Academic Year'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Academic Years'}</SelectItem>
                {(academicYears || [])
                  .filter((ay): ay is NonNullable<typeof ay> => 
                    Boolean(ay?.id && ay?.name)
                  )
                  .map((ay, idx) => (
                    <SelectItem 
                      key={`academic-year-filter-${ay.id}-${idx}`} 
                      value={String(ay.id)}
                    >
                      {ay.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Class Academic Year Filter */}
            <Select 
              value={selectedClassAcademicYearId || 'all'} 
              onValueChange={(val) => setSelectedClassAcademicYearId(val === 'all' ? undefined : val)}
              disabled={!selectedAcademicYearId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedAcademicYearId 
                    ? (t('questionBank.selectAcademicYearFirst') || 'Select academic year first')
                    : (t('questionBank.filterClass') || 'Class')
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Classes'}</SelectItem>
                {(classAcademicYears || [])
                  .filter((cay): cay is NonNullable<typeof cay> => 
                    Boolean(cay?.id && cay?.class?.name)
                  )
                  .map((cay, idx) => (
                    <SelectItem 
                      key={`cay-filter-${cay.id}-${idx}`} 
                      value={String(cay.id)}
                    >
                      {cay.class?.name || `Class ${idx + 1}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={(val) => setSelectedType(val as QuestionType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.filterType') || 'Type'} />
              </SelectTrigger>
                <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Types'}</SelectItem>
                {QUESTION_TYPES
                  .filter((type): type is { value: QuestionType; label: string } => Boolean(type?.value))
                  .map((type, idx) => (
                    <SelectItem 
                      key={`filter-type-${type.value}-${idx}`} 
                      value={type.value}
                    >
                      {t(`questionBank.type.${type.value}`) || type.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Difficulty Filter */}
            <Select value={selectedDifficulty} onValueChange={(val) => setSelectedDifficulty(val as QuestionDifficulty | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.filterDifficulty') || 'Difficulty'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Difficulties'}</SelectItem>
                {QUESTION_DIFFICULTIES
                  .filter((diff): diff is { value: QuestionDifficulty; label: string } => Boolean(diff?.value))
                  .map((diff, idx) => (
                    <SelectItem 
                      key={`filter-difficulty-${diff.value}-${idx}`} 
                      value={diff.value}
                    >
                      {t(`questionBank.difficulty.${diff.value}`) || diff.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('questionBank.questionsList') || 'Questions'}</CardTitle>
          <CardDescription>
            {pagination?.total 
              ? t('questionBank.totalQuestions', { count: pagination.total }) || `${pagination.total} question(s) found`
              : t('questionBank.noQuestions') || 'No questions found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('questionBank.noQuestionsFound') || 'No questions found. Create your first question to get started.'}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : typeof header.column.columnDef.header === 'function'
                              ? header.column.columnDef.header(header.getContext())
                              : header.column.columnDef.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {typeof cell.column.columnDef.cell === 'function'
                                ? cell.column.columnDef.cell(cell.getContext())
                                : cell.getValue() as React.ReactNode}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="h-24 text-center">
                          {t('questionBank.noQuestionsFound') || 'No questions found.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <DataTablePagination
                table={table}
                paginationMeta={pagination ?? null}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('questionBank.create') || 'Create Question'}</DialogTitle>
            <DialogDescription>
              {t('questionBank.createDescription') || 'Add a new question to the question bank'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate, (errors) => {
            if (import.meta.env.DEV) {
              console.error('[QuestionBank] Form validation errors:', errors);
            }
            // Show first validation error
            const firstError = Object.values(errors)[0];
            if (firstError?.message) {
              showToast.error(firstError.message);
            } else {
              showToast.error(t('common.validationError') || 'Please fix form errors');
            }
          })}>
            <QuestionFormFields />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createQuestion.isPending || createQuestion.isError}>
                {createQuestion.isPending ? (t('common.creating') || 'Creating...') : (t('common.create') || 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('questionBank.edit') || 'Edit Question'}</DialogTitle>
            <DialogDescription>
              {t('questionBank.editDescription') || 'Update the question details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)}>
            <QuestionFormFields isEdit />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateQuestion.isPending || updateQuestion.isError}>
                {updateQuestion.isPending ? (t('common.updating') || 'Updating...') : (t('common.update') || 'Update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('questionBank.viewQuestion') || 'View Question'}</DialogTitle>
          </DialogHeader>
          {selectedQuestion && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {getTypeBadge(selectedQuestion.type)}
                {getDifficultyBadge(selectedQuestion.difficulty)}
                <Badge variant="secondary">{selectedQuestion.marks} {t('questionBank.marks') || 'marks'}</Badge>
                {selectedQuestion.isActive ? (
                  <Badge variant="default">{t('common.active') || 'Active'}</Badge>
                ) : (
                  <Badge variant="outline">{t('common.inactive') || 'Inactive'}</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>{t('questionBank.questionText') || 'Question'}</Label>
                <div 
                  className={cn(
                    "p-4 rounded-lg bg-muted",
                    selectedQuestion.textRtl && "text-right"
                  )}
                  dir={selectedQuestion.textRtl ? 'rtl' : 'ltr'}
                >
                  {selectedQuestion.text}
                </div>
              </div>

              {selectedQuestion.options && selectedQuestion.options.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('questionBank.options') || 'Options'}</Label>
                  <div className="space-y-2">
                    {selectedQuestion.options.map((opt, idx) => {
                      const optKey = opt?.label || opt?.id || `opt-${idx}`;
                      const uniqueKey = `option-view-${optKey}-${idx}`;
                      const optionLabel = opt?.label || String.fromCharCode(65 + idx); // A, B, C, D, etc.
                      return (
                      <div 
                        key={uniqueKey}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded",
                          opt.isCorrect && "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                        )}
                      >
                        <span className="font-medium">{optionLabel}.</span>
                        <span>{opt.text}</span>
                        {opt.isCorrect && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedQuestion.correctAnswer && (
                <div className="space-y-2">
                  <Label>{t('questionBank.correctAnswer') || 'Correct Answer'}</Label>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    {selectedQuestion.correctAnswer}
                  </div>
                </div>
              )}

              {selectedQuestion.reference && (
                <div className="space-y-2">
                  <Label>{t('questionBank.reference') || 'Reference'}</Label>
                  <p className="text-sm text-muted-foreground">{selectedQuestion.reference}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">{t('questionBank.subject') || 'Subject'}</Label>
                  <p>{selectedQuestion.subject?.name || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('questionBank.class') || 'Class'}</Label>
                  <p>{selectedQuestion.classAcademicYear?.className || t('common.all') || 'All Classes'}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {t('common.close') || 'Close'}
            </Button>
            {hasUpdate && selectedQuestion && (
              <Button onClick={() => { setIsViewDialogOpen(false); openEditDialog(selectedQuestion); }}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit') || 'Edit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('questionBank.deleteConfirm') || 'Delete Question'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('questionBank.deleteConfirmMessage') || 'Are you sure you want to delete this question? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
            >
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
