import { useState, useMemo, useEffect } from 'react';
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion, useDuplicateQuestion, useBulkUpdateQuestions, QUESTION_TYPES, QUESTION_DIFFICULTIES } from '@/hooks/useQuestions';
import type { Question, QuestionType, QuestionDifficulty, QuestionOption, QuestionFilters } from '@/hooks/useQuestions';
import { useSubjects } from '@/hooks/useSubjects';
import { useSchools } from '@/hooks/useSchools';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
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
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Copy, CheckCircle, XCircle, Eye, X, GripVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

// Option schema for MCQ questions
const optionSchema = z.object({
  key: z.string().min(1, 'Option key is required'),
  text: z.string().min(1, 'Option text is required'),
  isCorrect: z.boolean().default(false),
});

// Question form schema
const questionSchema = z.object({
  schoolId: z.string().uuid('School is required'),
  subjectId: z.string().uuid('Subject is required'),
  classAcademicYearId: z.string().uuid().optional().nullable(),
  type: z.enum(['mcq', 'short', 'descriptive', 'true_false', 'essay'] as const),
  difficulty: z.enum(['easy', 'medium', 'hard'] as const),
  marks: z.coerce.number().min(0.5, 'Marks must be at least 0.5').max(100, 'Marks must be 100 or less'),
  text: z.string().min(1, 'Question text is required'),
  textRtl: z.boolean().default(false),
  options: z.array(optionSchema).optional().nullable(),
  correctAnswer: z.string().optional().nullable(),
  reference: z.string().max(255).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  isActive: z.boolean().default(true),
});

type QuestionFormData = z.infer<typeof questionSchema>;

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

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();
  const [selectedClassAcademicYearId, setSelectedClassAcademicYearId] = useState<string | undefined>();
  const [selectedType, setSelectedType] = useState<QuestionType | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuestionDifficulty | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);

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
  const { subjects } = useSubjects(organizationId);
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, organizationId);

  // Build filters object
  const filters: QuestionFilters = useMemo(() => ({
    schoolId: selectedSchoolId,
    subjectId: selectedSubjectId,
    classAcademicYearId: selectedClassAcademicYearId,
    type: selectedType !== 'all' ? selectedType : undefined,
    difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
    isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
    search: searchQuery || undefined,
    page: currentPage,
    perPage: 25,
  }), [selectedSchoolId, selectedSubjectId, selectedClassAcademicYearId, selectedType, selectedDifficulty, selectedStatus, searchQuery, currentPage]);

  const { data: questionsData, isLoading } = useQuestions(filters);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const duplicateQuestion = useDuplicateQuestion();
  const bulkUpdateQuestions = useBulkUpdateQuestions();

  // Set default academic year
  useEffect(() => {
    if (currentAcademicYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id]);

  // Form setup
  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      schoolId: '',
      subjectId: '',
      classAcademicYearId: null,
      type: 'mcq',
      difficulty: 'medium',
      marks: 1,
      text: '',
      textRtl: false,
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
  }, [watchedType]);

  const resetForm = () => {
    form.reset({
      schoolId: selectedSchoolId || '',
      subjectId: '',
      classAcademicYearId: selectedClassAcademicYearId || null,
      type: 'mcq',
      difficulty: 'medium',
      marks: 1,
      text: '',
      textRtl: false,
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
    setSelectedQuestion(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (question: Question) => {
    setSelectedQuestion(question);
    form.reset({
      schoolId: question.schoolId,
      subjectId: question.subjectId,
      classAcademicYearId: question.classAcademicYearId || null,
      type: question.type,
      difficulty: question.difficulty,
      marks: question.marks,
      text: question.text,
      textRtl: question.textRtl,
      options: question.options?.map(opt => ({
        key: opt.key,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })) || [],
      correctAnswer: question.correctAnswer || '',
      reference: question.reference || '',
      tags: question.tags || [],
      isActive: question.isActive,
    });
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

  const handleCreate = (data: QuestionFormData) => {
    if (!organizationId) {
      showToast.error(t('common.error') || 'Organization required');
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
      subjectId: data.subjectId,
      classAcademicYearId: data.classAcademicYearId || undefined,
      type: data.type,
      difficulty: data.difficulty,
      marks: data.marks,
      text: data.text,
      textRtl: data.textRtl,
      options: data.options?.map(opt => ({
        key: opt.key,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      correctAnswer,
      reference: data.reference || undefined,
      tags: data.tags || undefined,
      isActive: data.isActive,
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      },
    });
  };

  const handleUpdate = (data: QuestionFormData) => {
    if (!selectedQuestion) return;

    // Build correct answer from options for MCQ/true_false
    let correctAnswer = data.correctAnswer;
    if ((data.type === 'mcq' || data.type === 'true_false') && data.options) {
      const correctOption = data.options.find(opt => opt.isCorrect);
      correctAnswer = correctOption?.key || '';
    }

    updateQuestion.mutate({
      id: selectedQuestion.id,
      data: {
        subjectId: data.subjectId,
        classAcademicYearId: data.classAcademicYearId || undefined,
        type: data.type,
        difficulty: data.difficulty,
        marks: data.marks,
        text: data.text,
        textRtl: data.textRtl,
        options: data.options?.map(opt => ({
          key: opt.key,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
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
    });
  };

  const handleDelete = () => {
    if (!selectedQuestion) return;
    deleteQuestion.mutate(selectedQuestion.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedQuestion(null);
      },
    });
  };

  const handleDuplicate = (question: Question) => {
    duplicateQuestion.mutate(question.id);
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
    if (!questionsData?.data) return;
    if (selectedQuestionIds.length === questionsData.data.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(questionsData.data.map(q => q.id));
    }
  };

  const questions = questionsData?.data || [];
  const totalPages = questionsData?.lastPage || 1;

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

  const handleCorrectOptionChange = (index: number) => {
    const options = form.getValues('options') || [];
    const updatedOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    form.setValue('options', updatedOptions);
  };

  const QuestionFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* School & Subject */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="schoolId">{t('questionBank.school') || 'School'} *</Label>
          <Controller
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue placeholder={t('questionBank.selectSchool') || 'Select school'} />
                </SelectTrigger>
                <SelectContent>
                  {(schools || []).map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.schoolId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.schoolId.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="subjectId">{t('questionBank.subject') || 'Subject'} *</Label>
          <Controller
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('questionBank.selectSubject') || 'Select subject'} />
                </SelectTrigger>
                <SelectContent>
                  {(subjects || []).map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.subjectId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.subjectId.message}</p>
          )}
        </div>
      </div>

      {/* Class Academic Year (optional) */}
      <div>
        <Label htmlFor="classAcademicYearId">{t('questionBank.classAcademicYear') || 'Class (Optional)'}</Label>
        <Controller
          control={form.control}
          name="classAcademicYearId"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={(val) => field.onChange(val || null)}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.selectClass') || 'Select class (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all') || 'All Classes'}</SelectItem>
                {(classAcademicYears || []).map(cay => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Type, Difficulty, Marks */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="type">{t('questionBank.type') || 'Type'} *</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`questionBank.type.${type}`) || typeConfig[type as QuestionType].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="difficulty">{t('questionBank.difficulty') || 'Difficulty'} *</Label>
          <Controller
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_DIFFICULTIES.map(diff => (
                    <SelectItem key={diff} value={diff}>
                      {t(`questionBank.difficulty.${diff}`) || difficultyConfig[diff as QuestionDifficulty].label}
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
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
        <Textarea
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
            {optionFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                  {field.key}
                </div>
                <Input
                  {...form.register(`options.${index}.text`)}
                  placeholder={t('questionBank.optionPlaceholder') || 'Option text...'}
                  className="flex-1"
                  disabled={watchedType === 'true_false'}
                />
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
            ))}
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
          </div>
        </div>
      )}

      {/* Correct Answer for Short/Descriptive/Essay */}
      {(watchedType === 'short' || watchedType === 'descriptive' || watchedType === 'essay') && (
        <div>
          <Label htmlFor="correctAnswer">{t('questionBank.correctAnswer') || 'Model Answer'}</Label>
          <Textarea
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
          {hasCreate && (
            <Button onClick={openCreateDialog}>
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

            {/* School Filter */}
            <Select value={selectedSchoolId || 'all'} onValueChange={(val) => setSelectedSchoolId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.filterSchool') || 'School'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Schools'}</SelectItem>
                {(schools || []).map(school => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.schoolName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Filter */}
            <Select value={selectedSubjectId || 'all'} onValueChange={(val) => setSelectedSubjectId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('questionBank.filterSubject') || 'Subject'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Subjects'}</SelectItem>
                {(subjects || []).map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
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
                {QUESTION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`questionBank.type.${type}`) || typeConfig[type as QuestionType].label}
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
                {QUESTION_DIFFICULTIES.map(diff => (
                  <SelectItem key={diff} value={diff}>
                    {t(`questionBank.difficulty.${diff}`) || difficultyConfig[diff as QuestionDifficulty].label}
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
            {questionsData?.total 
              ? t('questionBank.totalQuestions', { count: questionsData.total }) || `${questionsData.total} question(s) found`
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedQuestionIds.length === questions.length && questions.length > 0}
                        onCheckedChange={toggleAllQuestions}
                      />
                    </TableHead>
                    <TableHead className="min-w-[300px]">{t('questionBank.question') || 'Question'}</TableHead>
                    <TableHead>{t('questionBank.type') || 'Type'}</TableHead>
                    <TableHead>{t('questionBank.difficulty') || 'Difficulty'}</TableHead>
                    <TableHead>{t('questionBank.marks') || 'Marks'}</TableHead>
                    <TableHead>{t('questionBank.subject') || 'Subject'}</TableHead>
                    <TableHead>{t('questionBank.status') || 'Status'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map(question => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedQuestionIds.includes(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div 
                          className={cn(
                            "max-w-[400px] truncate",
                            question.textRtl && "text-right"
                          )}
                          dir={question.textRtl ? 'rtl' : 'ltr'}
                        >
                          {question.text}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(question.type)}</TableCell>
                      <TableCell>{getDifficultyBadge(question.difficulty)}</TableCell>
                      <TableCell>{question.marks}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{question.subject?.name || '—'}</Badge>
                      </TableCell>
                      <TableCell>
                        {question.isActive ? (
                          <Badge variant="default">{t('common.active') || 'Active'}</Badge>
                        ) : (
                          <Badge variant="outline">{t('common.inactive') || 'Inactive'}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewDialog(question)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('common.view') || 'View'}
                            </DropdownMenuItem>
                            {hasUpdate && (
                              <DropdownMenuItem onClick={() => openEditDialog(question)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('common.edit') || 'Edit'}
                              </DropdownMenuItem>
                            )}
                            {hasCreate && (
                              <DropdownMenuItem onClick={() => handleDuplicate(question)}>
                                <Copy className="h-4 w-4 mr-2" />
                                {t('common.duplicate') || 'Duplicate'}
                              </DropdownMenuItem>
                            )}
                            {hasDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(question)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t('common.delete') || 'Delete'}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('common.page', { current: currentPage, total: totalPages }) || `Page ${currentPage} of ${totalPages}`}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('common.previous') || 'Previous'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('common.next') || 'Next'}
                    </Button>
                  </div>
                </div>
              )}
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
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <QuestionFormFields />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createQuestion.isPending}>
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
              <Button type="submit" disabled={updateQuestion.isPending}>
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
                    {selectedQuestion.options.map((opt, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded",
                          opt.isCorrect && "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                        )}
                      >
                        <span className="font-medium">{opt.key}.</span>
                        <span>{opt.text}</span>
                        {opt.isCorrect && (
                          <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                      </div>
                    ))}
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
