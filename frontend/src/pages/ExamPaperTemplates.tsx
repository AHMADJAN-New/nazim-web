import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useExamPaperTemplates,
  useCreateExamPaperTemplate,
  useUpdateExamPaperTemplate,
  useDeleteExamPaperTemplate,
  useDuplicateExamPaperTemplate,
  useExamPaperTemplate,
  useAddExamPaperItem,
  useUpdateExamPaperItem,
  useRemoveExamPaperItem,
  useReorderExamPaperItems,
  EXAM_PAPER_LANGUAGES,
  RTL_LANGUAGES,
} from '@/hooks/useExamPapers';
import type { ExamPaperTemplate, ExamPaperItem, ExamPaperLanguage } from '@/hooks/useExamPapers';
import { useQuestions } from '@/hooks/useQuestions';
import type { Question, QuestionFilters } from '@/hooks/useQuestions';
import { useSubjects } from '@/hooks/useSubjects';
import { useSchools } from '@/hooks/useSchools';
import { useExams } from '@/hooks/useExams';
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
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Copy, Eye, FileText, GripVertical, X, Check, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

// Template form schema
const templateSchema = z.object({
  schoolId: z.string().uuid('School is required'),
  examId: z.string().uuid().optional().nullable(),
  examSubjectId: z.string().uuid().optional().nullable(),
  subjectId: z.string().uuid('Subject is required'),
  classAcademicYearId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(255),
  language: z.enum(['en', 'ps', 'fa', 'ar'] as const),
  totalMarks: z.coerce.number().min(0).optional().nullable(),
  durationMinutes: z.coerce.number().min(1, 'Duration is required').max(600),
  headerHtml: z.string().optional().nullable(),
  footerHtml: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  isDefaultForExamSubject: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateSchema>;

const languageConfig: Record<ExamPaperLanguage, { label: string; isRtl: boolean }> = {
  en: { label: 'English', isRtl: false },
  ps: { label: 'Pashto', isRtl: true },
  fa: { label: 'Farsi', isRtl: true },
  ar: { label: 'Arabic', isRtl: true },
};

export function ExamPaperTemplates() {
  const { t, isRTL: appIsRTL } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Permissions
  const hasCreate = useHasPermission('exams.papers.create');
  const hasUpdate = useHasPermission('exams.papers.update');
  const hasDelete = useHasPermission('exams.papers.delete');
  const hasRead = useHasPermission('exams.papers.read');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExamPaperTemplate | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Data hooks
  const { data: schools } = useSchools(organizationId);
  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  const { subjects } = useSubjects(organizationId);
  const { data: exams } = useExams(organizationId);
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, organizationId);

  // Templates data
  const { data: templates, isLoading } = useExamPaperTemplates({
    schoolId: selectedSchoolId,
    examId: selectedExamId,
    subjectId: selectedSubjectId,
  });

  // Template being edited (with items)
  const { data: templateWithItems, isLoading: isLoadingTemplate } = useExamPaperTemplate(editingTemplateId || undefined);

  // Mutations
  const createTemplate = useCreateExamPaperTemplate();
  const updateTemplate = useUpdateExamPaperTemplate();
  const deleteTemplate = useDeleteExamPaperTemplate();
  const duplicateTemplate = useDuplicateExamPaperTemplate();
  const addItem = useAddExamPaperItem();
  const updateItem = useUpdateExamPaperItem();
  const removeItem = useRemoveExamPaperItem();
  const reorderItems = useReorderExamPaperItems();

  // Set default academic year
  useEffect(() => {
    if (currentAcademicYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id]);

  // Form setup
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      schoolId: '',
      examId: null,
      examSubjectId: null,
      subjectId: '',
      classAcademicYearId: null,
      title: '',
      language: 'en',
      totalMarks: null,
      durationMinutes: 60,
      headerHtml: '',
      footerHtml: '',
      instructions: '',
      isDefaultForExamSubject: false,
      isActive: true,
    },
  });

  const resetForm = () => {
    form.reset({
      schoolId: selectedSchoolId || '',
      examId: selectedExamId || null,
      examSubjectId: null,
      subjectId: '',
      classAcademicYearId: null,
      title: '',
      language: 'en',
      totalMarks: null,
      durationMinutes: 60,
      headerHtml: '',
      footerHtml: '',
      instructions: '',
      isDefaultForExamSubject: false,
      isActive: true,
    });
    setSelectedTemplate(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (template: ExamPaperTemplate) => {
    setSelectedTemplate(template);
    form.reset({
      schoolId: template.schoolId,
      examId: template.examId || null,
      examSubjectId: template.examSubjectId || null,
      subjectId: template.subjectId,
      classAcademicYearId: template.classAcademicYearId || null,
      title: template.title,
      language: template.language,
      totalMarks: template.totalMarks || null,
      durationMinutes: template.durationMinutes,
      headerHtml: template.headerHtml || '',
      footerHtml: template.footerHtml || '',
      instructions: template.instructions || '',
      isDefaultForExamSubject: template.isDefaultForExamSubject,
      isActive: template.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (template: ExamPaperTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  const openEditorDialog = (template: ExamPaperTemplate) => {
    setEditingTemplateId(template.id);
    setIsEditorDialogOpen(true);
  };

  const handleCreate = (data: TemplateFormData) => {
    if (!organizationId) {
      showToast.error(t('common.error') || 'Organization required');
      return;
    }

    createTemplate.mutate({
      organizationId,
      schoolId: data.schoolId,
      examId: data.examId || undefined,
      examSubjectId: data.examSubjectId || undefined,
      subjectId: data.subjectId,
      classAcademicYearId: data.classAcademicYearId || undefined,
      title: data.title,
      language: data.language,
      totalMarks: data.totalMarks || undefined,
      durationMinutes: data.durationMinutes,
      headerHtml: data.headerHtml || undefined,
      footerHtml: data.footerHtml || undefined,
      instructions: data.instructions || undefined,
      isDefaultForExamSubject: data.isDefaultForExamSubject,
      isActive: data.isActive,
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      },
    });
  };

  const handleUpdate = (data: TemplateFormData) => {
    if (!selectedTemplate) return;

    updateTemplate.mutate({
      id: selectedTemplate.id,
      data: {
        examId: data.examId || undefined,
        examSubjectId: data.examSubjectId || undefined,
        subjectId: data.subjectId,
        classAcademicYearId: data.classAcademicYearId || undefined,
        title: data.title,
        language: data.language,
        totalMarks: data.totalMarks || undefined,
        durationMinutes: data.durationMinutes,
        headerHtml: data.headerHtml || undefined,
        footerHtml: data.footerHtml || undefined,
        instructions: data.instructions || undefined,
        isDefaultForExamSubject: data.isDefaultForExamSubject,
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
    if (!selectedTemplate) return;
    deleteTemplate.mutate(selectedTemplate.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedTemplate(null);
      },
    });
  };

  const handleDuplicate = (template: ExamPaperTemplate) => {
    duplicateTemplate.mutate(template.id);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(template => {
      if (searchQuery && !template.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [templates, searchQuery]);

  const getSubjectName = (subjectId: string) => {
    const subject = subjects?.find(s => s.id === subjectId);
    return subject?.name || '—';
  };

  const getExamName = (examId?: string) => {
    if (!examId) return null;
    const exam = exams?.find(e => e.id === examId);
    return exam?.name;
  };

  const TemplateFormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      {/* School & Subject */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="schoolId">{t('examPapers.school') || 'School'} *</Label>
          <Controller
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.selectSchool') || 'Select school'} />
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
          <Label htmlFor="subjectId">{t('examPapers.subject') || 'Subject'} *</Label>
          <Controller
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.selectSubject') || 'Select subject'} />
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

      {/* Exam (optional) */}
      <div>
        <Label htmlFor="examId">{t('examPapers.exam') || 'Exam (Optional)'}</Label>
        <Controller
          control={form.control}
          name="examId"
          render={({ field }) => (
            <Select value={field.value || ''} onValueChange={(val) => field.onChange(val || null)}>
              <SelectTrigger>
                <SelectValue placeholder={t('examPapers.selectExam') || 'Select exam (optional)'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('examPapers.genericTemplate') || 'Generic Template (no exam)'}</SelectItem>
                {(exams || []).map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Title & Language */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">{t('examPapers.title') || 'Title'} *</Label>
          <Input
            {...form.register('title')}
            placeholder={t('examPapers.titlePlaceholder') || 'e.g., Mathematics Final Exam Paper'}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="language">{t('examPapers.language') || 'Language'} *</Label>
          <Controller
            control={form.control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_PAPER_LANGUAGES.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {languageConfig[lang as ExamPaperLanguage].label}
                      {languageConfig[lang as ExamPaperLanguage].isRtl && ' (RTL)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {/* Duration & Total Marks */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="durationMinutes">{t('examPapers.duration') || 'Duration (minutes)'} *</Label>
          <Input
            type="number"
            min="1"
            max="600"
            {...form.register('durationMinutes')}
          />
          {form.formState.errors.durationMinutes && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.durationMinutes.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="totalMarks">{t('examPapers.totalMarks') || 'Total Marks (optional)'}</Label>
          <Input
            type="number"
            min="0"
            {...form.register('totalMarks')}
            placeholder={t('examPapers.totalMarksPlaceholder') || 'Auto-calculated from questions'}
          />
        </div>
      </div>

      {/* Instructions */}
      <div>
        <Label htmlFor="instructions">{t('examPapers.instructions') || 'Instructions'}</Label>
        <Textarea
          {...form.register('instructions')}
          rows={3}
          placeholder={t('examPapers.instructionsPlaceholder') || 'Instructions for students...'}
        />
      </div>

      {/* Header & Footer HTML */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="headerHtml">{t('examPapers.headerHtml') || 'Header HTML'}</Label>
          <Textarea
            {...form.register('headerHtml')}
            rows={2}
            placeholder={t('examPapers.headerHtmlPlaceholder') || 'Custom header HTML...'}
          />
        </div>
        <div>
          <Label htmlFor="footerHtml">{t('examPapers.footerHtml') || 'Footer HTML'}</Label>
          <Textarea
            {...form.register('footerHtml')}
            rows={2}
            placeholder={t('examPapers.footerHtmlPlaceholder') || 'Custom footer HTML...'}
          />
        </div>
      </div>

      {/* Active & Default */}
      <div className="flex gap-6">
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
          <Label>{t('examPapers.active') || 'Active'}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="isDefaultForExamSubject"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t('examPapers.defaultForExamSubject') || 'Default for Exam Subject'}</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('examPapers.title') || 'Exam Paper Templates'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('examPapers.description') || 'Create and manage exam paper templates'}
          </p>
        </div>
        {hasCreate && (
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('examPapers.create') || 'Create Template'}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('examPapers.searchPlaceholder') || 'Search templates...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* School Filter */}
            <Select value={selectedSchoolId || 'all'} onValueChange={(val) => setSelectedSchoolId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('examPapers.filterSchool') || 'School'} />
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
                <SelectValue placeholder={t('examPapers.filterSubject') || 'Subject'} />
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

            {/* Exam Filter */}
            <Select value={selectedExamId || 'all'} onValueChange={(val) => setSelectedExamId(val === 'all' ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder={t('examPapers.filterExam') || 'Exam'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All Exams'}</SelectItem>
                {(exams || []).map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.templatesList') || 'Templates'}</CardTitle>
          <CardDescription>
            {filteredTemplates.length 
              ? t('examPapers.totalTemplates', { count: filteredTemplates.length }) || `${filteredTemplates.length} template(s) found`
              : t('examPapers.noTemplates') || 'No templates found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('examPapers.noTemplatesFound') || 'No templates found. Create your first template to get started.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">{t('examPapers.templateTitle') || 'Title'}</TableHead>
                  <TableHead>{t('examPapers.subject') || 'Subject'}</TableHead>
                  <TableHead>{t('examPapers.exam') || 'Exam'}</TableHead>
                  <TableHead>{t('examPapers.language') || 'Language'}</TableHead>
                  <TableHead>{t('examPapers.duration') || 'Duration'}</TableHead>
                  <TableHead>{t('examPapers.questions') || 'Questions'}</TableHead>
                  <TableHead>{t('examPapers.marks') || 'Marks'}</TableHead>
                  <TableHead>{t('examPapers.status') || 'Status'}</TableHead>
                  <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.title}
                        {template.isDefaultForExamSubject && (
                          <Badge variant="default" className="text-xs">
                            {t('examPapers.default') || 'Default'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getSubjectName(template.subjectId)}</Badge>
                    </TableCell>
                    <TableCell>
                      {template.examId ? (
                        <Badge variant="outline">{getExamName(template.examId)}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {t('examPapers.generic') || 'Generic'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {languageConfig[template.language]?.label || template.language}
                    </TableCell>
                    <TableCell>{template.durationMinutes} min</TableCell>
                    <TableCell>{template.items?.length || 0}</TableCell>
                    <TableCell>
                      {template.computedTotalMarks || template.totalMarks || '—'}
                      {template.hasMarksDiscrepancy && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 inline ml-1" title={t('examPapers.marksDiscrepancy') || 'Marks discrepancy'} />
                      )}
                    </TableCell>
                    <TableCell>
                      {template.isActive ? (
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
                          {hasRead && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/paper-preview/${template.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('examPapers.preview') || 'Preview'}
                            </DropdownMenuItem>
                          )}
                          {hasUpdate && (
                            <>
                              <DropdownMenuItem onClick={() => openEditorDialog(template)}>
                                <FileText className="h-4 w-4 mr-2" />
                                {t('examPapers.editQuestions') || 'Edit Questions'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('common.edit') || 'Edit'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasCreate && (
                            <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              {t('common.duplicate') || 'Duplicate'}
                            </DropdownMenuItem>
                          )}
                          {hasDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(template)}
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
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('examPapers.createTemplate') || 'Create Template'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.createDescription') || 'Create a new exam paper template'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <TemplateFormFields />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                {createTemplate.isPending ? (t('common.creating') || 'Creating...') : (t('common.create') || 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('examPapers.editTemplate') || 'Edit Template'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.editDescription') || 'Update the template details'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)}>
            <TemplateFormFields isEdit />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button type="submit" disabled={updateTemplate.isPending}>
                {updateTemplate.isPending ? (t('common.updating') || 'Updating...') : (t('common.update') || 'Update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Question Editor Dialog */}
      <TemplateQuestionEditor
        isOpen={isEditorDialogOpen}
        onClose={() => { setIsEditorDialogOpen(false); setEditingTemplateId(null); }}
        template={templateWithItems}
        isLoading={isLoadingTemplate}
        onAddItem={addItem}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onReorderItems={reorderItems}
        schools={schools || []}
        subjects={subjects || []}
        organizationId={organizationId}
      />

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('examPapers.deleteConfirm') || 'Delete Template'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('examPapers.deleteConfirmMessage') || 'Are you sure you want to delete this template? This action cannot be undone.'}
              {selectedTemplate && (
                <span className="block mt-2 font-semibold">{selectedTemplate.title}</span>
              )}
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

// Template Question Editor Component
interface TemplateQuestionEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template: ExamPaperTemplate | null;
  isLoading: boolean;
  onAddItem: ReturnType<typeof useAddExamPaperItem>;
  onUpdateItem: ReturnType<typeof useUpdateExamPaperItem>;
  onRemoveItem: ReturnType<typeof useRemoveExamPaperItem>;
  onReorderItems: ReturnType<typeof useReorderExamPaperItems>;
  schools: { id: string; schoolName: string }[];
  subjects: { id: string; name: string }[];
  organizationId?: string;
}

function TemplateQuestionEditor({
  isOpen,
  onClose,
  template,
  isLoading,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorderItems,
  schools,
  subjects,
  organizationId,
}: TemplateQuestionEditorProps) {
  const { t } = useLanguage();
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExamPaperItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Question filters for adding
  const questionFilters: QuestionFilters = useMemo(() => ({
    schoolId: template?.schoolId,
    subjectId: template?.subjectId,
    isActive: true,
    search: searchQuery || undefined,
    perPage: 50,
  }), [template?.schoolId, template?.subjectId, searchQuery]);

  const { data: questionsData, isLoading: questionsLoading } = useQuestions(questionFilters);
  const availableQuestions = questionsData?.data || [];

  // Filter out questions already in template
  const existingQuestionIds = useMemo(() => {
    return new Set(template?.items?.map(item => item.questionId) || []);
  }, [template?.items]);

  const filteredQuestions = useMemo(() => {
    return availableQuestions.filter(q => !existingQuestionIds.has(q.id));
  }, [availableQuestions, existingQuestionIds]);

  const handleAddQuestion = (question: Question) => {
    if (!template) return;

    const nextPosition = (template.items?.length || 0) + 1;

    onAddItem.mutate({
      templateId: template.id,
      data: {
        questionId: question.id,
        position: nextPosition,
        marksOverride: undefined,
        isMandatory: true,
        sectionLabel: '',
        notes: '',
      },
    });
    setIsAddQuestionDialogOpen(false);
  };

  const handleRemoveQuestion = (itemId: string) => {
    if (!template) return;
    onRemoveItem.mutate({
      templateId: template.id,
      itemId,
    });
  };

  const handleUpdateItem = (item: ExamPaperItem, updates: Partial<ExamPaperItem>) => {
    if (!template) return;
    onUpdateItem.mutate({
      templateId: template.id,
      itemId: item.id,
      data: updates,
    });
  };

  const items = template?.items || [];
  const totalMarks = items.reduce((sum, item) => {
    const marks = item.marksOverride ?? item.question?.marks ?? 0;
    return sum + marks;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('examPapers.editQuestions') || 'Edit Questions'}</DialogTitle>
          <DialogDescription>
            {template?.title} - {totalMarks} {t('examPapers.marks') || 'marks'} ({items.length} {t('examPapers.questions') || 'questions'})
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
            <Skeleton className="w-full h-12" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {t('examPapers.dragToReorder') || 'Drag questions to reorder'}
              </p>
              <Button onClick={() => setIsAddQuestionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('examPapers.addQuestion') || 'Add Question'}
              </Button>
            </div>

            {/* Questions List */}
            <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('examPapers.noQuestionsInTemplate') || 'No questions added yet. Click "Add Question" to get started.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('examPapers.question') || 'Question'}</TableHead>
                      <TableHead className="w-24">{t('examPapers.marks') || 'Marks'}</TableHead>
                      <TableHead className="w-32">{t('examPapers.section') || 'Section'}</TableHead>
                      <TableHead className="w-24">{t('examPapers.required') || 'Required'}</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.sort((a, b) => a.position - b.position).map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.position}</TableCell>
                        <TableCell>
                          <div className="max-w-[300px] truncate">
                            {item.question?.text || '—'}
                          </div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {item.question?.type || '—'}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {item.question?.difficulty || '—'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-20"
                            value={item.marksOverride ?? item.question?.marks ?? ''}
                            onChange={(e) => handleUpdateItem(item, { marksOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder={String(item.question?.marks || '')}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-28"
                            value={item.sectionLabel || ''}
                            onChange={(e) => handleUpdateItem(item, { sectionLabel: e.target.value || undefined })}
                            placeholder="A, B..."
                          />
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={item.isMandatory}
                            onCheckedChange={(checked) => handleUpdateItem(item, { isMandatory: !!checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(item.id)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close') || 'Close'}
          </Button>
        </DialogFooter>

        {/* Add Question Dialog */}
        <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{t('examPapers.selectQuestion') || 'Select Question'}</DialogTitle>
              <DialogDescription>
                {t('examPapers.selectQuestionDescription') || 'Choose a question from the question bank to add to this template'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('examPapers.searchQuestions') || 'Search questions...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-lg max-h-[50vh] overflow-y-auto">
                {questionsLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="w-full h-12" />
                    <Skeleton className="w-full h-12" />
                  </div>
                ) : filteredQuestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('examPapers.noQuestionsAvailable') || 'No questions available. Create questions in the Question Bank first.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('examPapers.question') || 'Question'}</TableHead>
                        <TableHead>{t('examPapers.type') || 'Type'}</TableHead>
                        <TableHead>{t('examPapers.difficulty') || 'Difficulty'}</TableHead>
                        <TableHead>{t('examPapers.marks') || 'Marks'}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuestions.map(question => (
                        <TableRow key={question.id}>
                          <TableCell>
                            <div 
                              className={cn("max-w-[300px] truncate", question.textRtl && "text-right")}
                              dir={question.textRtl ? 'rtl' : 'ltr'}
                            >
                              {question.text}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{question.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{question.difficulty}</Badge>
                          </TableCell>
                          <TableCell>{question.marks}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleAddQuestion(question)}
                              disabled={onAddItem.isPending}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              {t('common.add') || 'Add'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddQuestionDialogOpen(false)}>
                {t('common.cancel') || 'Cancel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
