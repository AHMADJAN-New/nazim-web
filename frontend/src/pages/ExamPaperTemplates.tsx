import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useExamPaperTemplates,
  useCreateExamPaperTemplate,
  useUpdateExamPaperTemplate,
  useDeleteExamPaperTemplate,
  useDuplicateExamPaperTemplate,
  EXAM_PAPER_LANGUAGES,
} from '@/hooks/useExamPapers';
import type { ExamPaperTemplate, ExamPaperLanguage } from '@/hooks/useExamPapers';
import { useSubjects, useClassSubjects } from '@/hooks/useSubjects';
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
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Copy, Eye, FileText, FileCode, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { examPaperTemplateSchema, type ExamPaperTemplateFormData } from '@/lib/validations/examPaperTemplate';
import { TemplateFileManager } from '@/components/examPapers/TemplateFileManager';
import { PaperPreview } from '@/components/examPapers/PaperPreview';
import { PaperGenerator } from '@/components/examPapers/PaperGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExamPaperTemplateFiles, type ExamPaperTemplateFile } from '@/hooks/useExamPaperTemplateFiles';

const languageConfig: Record<ExamPaperLanguage, { label: string; isRtl: boolean }> = {
  en: { label: 'English', isRtl: false },
  ps: { label: 'Pashto', isRtl: true },
  fa: { label: 'Farsi', isRtl: true },
  ar: { label: 'Arabic', isRtl: true },
};

export default function ExamPaperTemplates() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;
  const userDefaultSchoolId = profile?.default_school_id;

  // Permissions
  const hasCreate = useHasPermission('exams.papers.create');
  const hasUpdate = useHasPermission('exams.papers.update');
  const hasDelete = useHasPermission('exams.papers.delete');
  const hasRead = useHasPermission('exams.papers.read');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(userDefaultSchoolId || undefined);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isTemplateFilesDialogOpen, setIsTemplateFilesDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExamPaperTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  // Data hooks
  const { data: schools } = useSchools(organizationId);
  const { data: academicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
  const { data: subjects } = useSubjects(organizationId);
  const { data: exams } = useExams(organizationId);
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, organizationId);

  // Templates data
  const { data: templates, isLoading } = useExamPaperTemplates({
    schoolId: selectedSchoolId,
    examId: selectedExamId,
    subjectId: selectedSubjectId,
  });

  // Mutations
  const createTemplate = useCreateExamPaperTemplate();
  const updateTemplate = useUpdateExamPaperTemplate();
  const deleteTemplate = useDeleteExamPaperTemplate();
  const duplicateTemplate = useDuplicateExamPaperTemplate();

  // Set default academic year for filters
  useEffect(() => {
    if (currentAcademicYear && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, selectedAcademicYearId]);

  // Form setup
  const form = useForm<ExamPaperTemplateFormData>({
    resolver: zodResolver(examPaperTemplateSchema),
    defaultValues: {
      schoolId: userDefaultSchoolId || '',
      academicYearId: currentAcademicYear?.id || '',
      classAcademicYearId: '',
      subjectId: '',
      examId: null,
      examSubjectId: null,
      templateFileId: null,
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

  const handleTemplateFileSelect = (templateFile: ExamPaperTemplateFile) => {
    form.setValue('templateFileId', templateFile.id);
    form.setValue('language', templateFile.language);
    setIsTemplateFilesDialogOpen(false);
  };

  // Watch form values for cascading
  const watchedAcademicYearId = form.watch('academicYearId');
  const watchedClassAcademicYearId = form.watch('classAcademicYearId');

  // Get class academic years for the selected academic year in form
  const { data: formClassAcademicYears } = useClassAcademicYears(watchedAcademicYearId || undefined, organizationId);
  
  // Get class subjects for the selected class academic year in form
  const { data: classSubjects } = useClassSubjects(watchedClassAcademicYearId || undefined, organizationId);

  // Get template files for the selected language
  const watchedLanguage = form.watch('language');
  const { data: templateFiles } = useExamPaperTemplateFiles({
    language: watchedLanguage,
    isActive: true,
  });

  // Set default academic year in form when current academic year is available
  useEffect(() => {
    if (currentAcademicYear && !form.getValues('academicYearId')) {
      form.setValue('academicYearId', currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, form]);

  const resetForm = () => {
    form.reset({
      schoolId: userDefaultSchoolId || selectedSchoolId || '',
      academicYearId: currentAcademicYear?.id || '',
      classAcademicYearId: '',
      subjectId: '',
      examId: null,
      examSubjectId: null,
      templateFileId: null,
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
    const academicYearId = template.classAcademicYear?.academicYearId || currentAcademicYear?.id || '';
    
    form.reset({
      schoolId: template.schoolId,
      academicYearId: academicYearId,
      classAcademicYearId: template.classAcademicYearId || '',
      subjectId: template.subjectId,
      examId: template.examId || null,
      examSubjectId: template.examSubjectId || null,
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

  const handleCreate = async (data: ExamPaperTemplateFormData) => {
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
      templateFileId: data.templateFileId || undefined,
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

  const handleUpdate = async (data: ExamPaperTemplateFormData) => {
    if (!selectedTemplate) return;

    updateTemplate.mutate({
      id: selectedTemplate.id,
      data: {
        examId: data.examId || undefined,
        examSubjectId: data.examSubjectId || undefined,
        subjectId: data.subjectId,
        classAcademicYearId: data.classAcademicYearId || undefined,
        templateFileId: data.templateFileId || undefined,
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

  const TemplateFormFields = ({ isEdit = false }: { isEdit?: boolean }) => {
    // Create subject options with class and academic year info
    const subjectOptions = useMemo<ComboboxOption[]>(() => {
      if (watchedClassAcademicYearId && classSubjects && classSubjects.length > 0) {
        return classSubjects.map(cs => {
          const className = cs.classAcademicYear?.class?.name || '—';
          const academicYearName = cs.classAcademicYear?.academicYear?.name || '—';
          const subjectName = cs.subject?.name || '—';
          return {
            value: cs.subjectId,
            label: `${subjectName} (${className} - ${academicYearName})`,
          };
        });
      } else {
        return (subjects || []).map(subject => ({
          value: subject.id,
          label: subject.name,
        }));
      }
    }, [watchedClassAcademicYearId, classSubjects, subjects]);

    const showSchoolSelect = !userDefaultSchoolId;

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {/* School */}
        <div>
          <Label>{t('examPapers.school') || 'School'} *</Label>
          {showSchoolSelect ? (
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
          ) : (
            <Input value={schools?.find(s => s.id === userDefaultSchoolId)?.schoolName || ''} disabled />
          )}
          {form.formState.errors.schoolId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.schoolId.message}</p>
          )}
        </div>

        {/* Academic Year (Required) */}
        <div>
          <Label>{t('examPapers.academicYear') || 'Academic Year'} *</Label>
          <Controller
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <Select 
                value={field.value} 
                onValueChange={(val) => {
                  field.onChange(val);
                  // Clear class and subject when academic year changes
                  form.setValue('classAcademicYearId', '');
                  form.setValue('subjectId', '');
                }}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.selectAcademicYear') || 'Select academic year'} />
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
          <Label>{t('examPapers.classAcademicYear') || 'Class'} *</Label>
          <Controller
            control={form.control}
            name="classAcademicYearId"
            render={({ field }) => (
              <Select 
                value={field.value} 
                onValueChange={(val) => {
                  field.onChange(val);
                  // Clear subject when class changes
                  form.setValue('subjectId', '');
                }}
                disabled={!watchedAcademicYearId || isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !watchedAcademicYearId 
                      ? (t('examPapers.selectAcademicYearFirst') || 'Select academic year first')
                      : (t('examPapers.selectClass') || 'Select class')
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

        {/* Subject (Required) - Subject assigned to class in academic year */}
        <div>
          <Label>{t('examPapers.subject') || 'Subject'} *</Label>
          <Controller
            control={form.control}
            name="subjectId"
            render={({ field }) => (
              <Select 
                value={field.value} 
                onValueChange={field.onChange}
                disabled={!watchedClassAcademicYearId || isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !watchedClassAcademicYearId 
                      ? (t('examPapers.selectClassFirst') || 'Select class first')
                      : (t('examPapers.selectSubject') || 'Select subject')
                  } />
                </SelectTrigger>
                <SelectContent>
                  {watchedClassAcademicYearId && classSubjects && classSubjects.length > 0 ? (
                    classSubjects.map(cs => (
                      <SelectItem key={cs.id} value={cs.subjectId}>
                        {cs.subject?.name || '—'}
                      </SelectItem>
                    ))
                  ) : (
                    (subjects || []).map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.subjectId && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.subjectId.message}</p>
          )}
          {watchedClassAcademicYearId && classSubjects && classSubjects.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('examPapers.subjectsForClass') || 'Showing subjects for selected class'}
            </p>
          )}
        </div>

        {/* Exam (optional) */}
        <div>
          <Label>{t('examPapers.exam') || 'Exam (Optional)'}</Label>
          <Controller
            control={form.control}
            name="examId"
            render={({ field }) => (
              <Select value={field.value || '__none__'} onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.selectExam') || 'Select exam (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('examPapers.genericTemplate') || 'Generic Template (no exam)'}</SelectItem>
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
            <Label>{t('examPapers.title') || 'Title'} *</Label>
            <Input
              {...form.register('title')}
              placeholder={t('examPapers.titlePlaceholder') || 'e.g., Mathematics Final Exam Paper'}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div>
            <Label>{t('examPapers.language') || 'Language'} *</Label>
            <Controller
              control={form.control}
              name="language"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('examPapers.selectLanguage') || 'Select language'} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_PAPER_LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                        {languageConfig[lang.value]?.isRtl && ' (RTL)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.language && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.language.message}</p>
            )}
          </div>
        </div>

        {/* Duration & Total Marks */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('examPapers.duration') || 'Duration (minutes)'} *</Label>
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
            <Label>{t('examPapers.totalMarks') || 'Total Marks (optional)'}</Label>
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
          <Label>{t('examPapers.instructions') || 'Instructions'}</Label>
          <Textarea
            {...form.register('instructions')}
            rows={3}
            placeholder={t('examPapers.instructionsPlaceholder') || 'Instructions for students...'}
          />
        </div>

        {/* Template File Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>{t('examPapers.templateFile') || 'Template File (Optional)'}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTemplateFilesDialogOpen(true)}
            >
              <FileCode className="h-4 w-4 mr-2" />
              Manage Template Files
            </Button>
          </div>
          <Controller
            control={form.control}
            name="templateFileId"
            render={({ field }) => (
              <Select
                value={field.value || '__none__'}
                onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.selectTemplateFile') || 'Select template file (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t('examPapers.useDefaultTemplate') || 'Use Default Template'}
                  </SelectItem>
                  {(templateFiles || []).map((tf) => (
                    <SelectItem key={tf.id} value={tf.id}>
                      {tf.name} ({languageConfig[tf.language].label})
                      {tf.isDefault && ' ⭐'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t('examPapers.templateFileHelp') || 'Select a custom template file or use the default template for this language'}
          </p>
        </div>

        {/* Header & Footer HTML */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('examPapers.headerHtml') || 'Header HTML'}</Label>
            <Textarea
              {...form.register('headerHtml')}
              rows={2}
              placeholder={t('examPapers.headerHtmlPlaceholder') || 'Custom header HTML...'}
            />
          </div>
          <div>
            <Label>{t('examPapers.footerHtml') || 'Footer HTML'}</Label>
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
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('examPapers.title') || 'Exam Papers'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('examPapers.description') || 'Create and manage exam papers'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'templates' && filteredTemplates && filteredTemplates.length > 0 && (
            <ReportExportButtons
              data={filteredTemplates}
              columns={[
                { key: 'title', label: t('examPapers.templateTitle') || 'Title' },
                { key: 'subject', label: t('examPapers.subject') || 'Subject' },
                { key: 'exam', label: t('examPapers.exam') || 'Exam' },
                { key: 'className', label: t('examPapers.class') || 'Class' },
                { key: 'language', label: t('examPapers.language') || 'Language' },
                { key: 'duration', label: t('examPapers.duration') || 'Duration' },
                { key: 'questionsCount', label: t('examPapers.questions') || 'Questions' },
                { key: 'totalMarks', label: t('examPapers.marks') || 'Total Marks' },
                { key: 'status', label: t('examPapers.status') || 'Status' },
              ]}
              reportKey="exam_paper_templates"
              title={t('examPapers.title') || 'Exam Papers'}
              transformData={(data) => data.map((template: ExamPaperTemplate) => ({
                title: template.title || '-',
                subject: getSubjectName(template.subjectId),
                exam: template.examId ? getExamName(template.examId) || '-' : (t('examPapers.generic') || 'Generic'),
                className: template.classAcademicYear?.class?.name || '-',
                language: languageConfig[template.language]?.label || template.language,
                duration: `${template.durationMinutes} min`,
                questionsCount: template.itemsCount ?? template.items?.length ?? 0,
                totalMarks: template.computedTotalMarks || template.totalMarks || '-',
                status: template.isActive ? (t('common.active') || 'Active') : (t('common.inactive') || 'Inactive'),
              }))}
              buildFiltersSummary={() => {
                const parts: string[] = [];
                if (selectedSchoolId) {
                  const school = schools?.find(s => s.id === selectedSchoolId);
                  if (school) parts.push(`School: ${school.schoolName}`);
                }
                if (selectedSubjectId) {
                  parts.push(`Subject: ${getSubjectName(selectedSubjectId)}`);
                }
                if (selectedExamId) {
                  const exam = exams?.find(e => e.id === selectedExamId);
                  if (exam) parts.push(`Exam: ${exam.name}`);
                }
                parts.push(`Total: ${filteredTemplates.length} paper(s)`);
                return parts.join(' | ');
              }}
              schoolId={profile?.default_school_id}
              templateType="exam_paper_templates"
              disabled={!filteredTemplates || filteredTemplates.length === 0}
            />
          )}
          {hasCreate && activeTab === 'templates' && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t('examPapers.create') || 'Create Template'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Exam Papers</TabsTrigger>
          <TabsTrigger value="template-files">Template Files</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative md:col-span-1">
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    {t('examPapers.search') || 'Search'}
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('examPapers.searchPlaceholder') || 'Search papers...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

            {/* School Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterSchool') || 'School'}
              </Label>
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
            </div>

            {/* Subject Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterSubject') || 'Subject'}
              </Label>
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
            </div>

            {/* Exam Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterExam') || 'Exam'}
              </Label>
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
          </div>
        </CardContent>
      </Card>

          {/* Templates Table */}
          <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.papersList') || 'Exam Papers'}</CardTitle>
          <CardDescription>
            {filteredTemplates.length 
              ? t('examPapers.totalPapers', { count: filteredTemplates.length }) || `${filteredTemplates.length} paper(s) found`
              : t('examPapers.noPapers') || 'No papers found'}
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
                {t('examPapers.noPapersFound') || 'No papers found. Create your first exam paper to get started.'}
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
                    <TableCell>{template.itemsCount ?? template.items?.length ?? 0}</TableCell>
                    <TableCell>
                      {template.computedTotalMarks || template.totalMarks || '—'}
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
                            <>
                              <DropdownMenuItem onClick={() => {
                                setSelectedTemplate(template);
                                setIsPreviewDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('examPapers.preview') || 'Preview'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedTemplate(template);
                                setIsGenerateDialogOpen(true);
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                {t('examPapers.generatePdf') || 'Generate PDF'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasRead && (
                            <DropdownMenuItem onClick={() => navigate(`/exams/papers/${template.id}/edit`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              {t('examPapers.editQuestions') || 'Edit Questions'}
                            </DropdownMenuItem>
                          )}
                          {hasUpdate && (
                            <DropdownMenuItem onClick={() => openEditDialog(template)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t('common.edit') || 'Edit'}
                            </DropdownMenuItem>
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
            <DialogTitle>{t('examPapers.createPaper') || 'Create Exam Paper'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.createDescription') || 'Create a new exam paper'}
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
            <DialogTitle>{t('examPapers.editPaper') || 'Edit Exam Paper'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.editDescription') || 'Update the exam paper details'}
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

          {/* Delete Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('examPapers.deleteConfirm') || 'Delete Exam Paper'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('examPapers.deleteConfirmMessage') || 'Are you sure you want to delete this exam paper? This action cannot be undone.'}
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
        </TabsContent>

        {/* Template Files Tab */}
        <TabsContent value="template-files">
          <TemplateFileManager />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      {selectedTemplate && (
        <PaperPreview
          templateId={selectedTemplate.id}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />
      )}

      {/* Generate PDF Dialog */}
      {selectedTemplate && (
        <PaperGenerator
          templateId={selectedTemplate.id}
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
        />
      )}

      {/* Template Files Manager Dialog */}
      <Dialog open={isTemplateFilesDialogOpen} onOpenChange={setIsTemplateFilesDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Template Files</DialogTitle>
            <DialogDescription>
              Create and manage HTML template files for exam papers
            </DialogDescription>
          </DialogHeader>
          <TemplateFileManager
            onSelect={handleTemplateFileSelect}
            selectedLanguage={watchedLanguage}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateFilesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
