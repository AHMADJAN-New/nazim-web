import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Download, MoreHorizontal, FileText } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { PaperPreview } from '@/components/examPapers/PaperPreview';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useExamPaperTemplate, useAddExamPaperItem, useUpdateExamPaperItem, useRemoveExamPaperItem, useReorderExamPaperItems } from '@/hooks/useExamPapers';
import { useLanguage } from '@/hooks/useLanguage';
import { useQuestions } from '@/hooks/useQuestions';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { examPaperTemplatesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { PaperGenerator } from '@/components/examPapers/PaperGenerator';
import { mapExamPaperItemDomainToInsert } from '@/mappers/examPaperMapper';
import { Input as NumberInput } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';


interface SortableItemProps {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onQuickUpdateAnswerLines: (itemId: string, answerLinesCount: number | null, showAnswerLines: boolean | null) => void;
}

function SortableItem({ item, onEdit, onDelete, onQuickUpdateAnswerLines }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const { t } = useLanguage();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const question = item.question;
  const marks = item.marksOverride || question?.marks || 0;
  const isEssayType = question?.type && ['short', 'descriptive', 'essay'].includes(question.type);
  const defaultLines = question?.type === 'short' ? 3 : question?.type === 'essay' ? 6 : 4;
  const currentLines = item.answerLinesCount ?? defaultLines;
  const showLines = item.showAnswerLines ?? true;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{item.position + 1}</TableCell>
      <TableCell>
        <div className="max-w-md">
          <p className="text-sm line-clamp-2">{question?.text || t('examPapers.noQuestion')}</p>
          {item.sectionLabel && (
            <Badge variant="outline" className="mt-1 text-xs">
              {item.sectionLabel}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">{question?.type || '—'}</Badge>
      </TableCell>
      <TableCell>{marks}</TableCell>
      <TableCell>
        {isEssayType && (
          <div className="flex items-center gap-2">
            <Badge variant={showLines ? "default" : "outline"}>
              {showLines ? t('examPapers.linesCount', { count: currentLines }) : t('examPapers.hidden')}
            </Badge>
          </div>
        )}
        {!isEssayType && <span className="text-muted-foreground text-sm">—</span>}
      </TableCell>
      <TableCell>
        {item.isMandatory ? (
          <Badge variant="default">{t('examPapers.required')}</Badge>
        ) : (
          <Badge variant="outline">{t('examPapers.optional')}</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onEdit(item)}>
              {t('common.edit')}
            </DropdownMenuItem>
            {isEssayType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('examPapers.answerLines')}</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, null, !showLines)}
                >
                  {showLines ? t('examPapers.hideLines') : t('examPapers.showLines')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 3, null)}
                  disabled={currentLines === 3}
                >
                  {t('examPapers.setToLines', { count: 3 })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 4, null)}
                  disabled={currentLines === 4}
                >
                  {t('examPapers.setToLines', { count: 4 })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 6, null)}
                  disabled={currentLines === 6}
                >
                  {t('examPapers.setToLines', { count: 6 })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 8, null)}
                  disabled={currentLines === 8}
                >
                  {t('examPapers.setToLines', { count: 8 })}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.remove')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function ExamPaperTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | null>(null); // null = all academic years
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const { profile } = useAuth();
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [marksOverride, setMarksOverride] = useState<number | null>(null);
  const [sectionLabel, setSectionLabel] = useState<string>('');
  const [isMandatory, setIsMandatory] = useState(true);
  const [notes, setNotes] = useState<string>('');
  const [answerLinesCount, setAnswerLinesCount] = useState<number | null>(null);
  const [showAnswerLines, setShowAnswerLines] = useState<boolean | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const queryClient = useQueryClient();

  // Fetch template with items
  const { data: template, isLoading: templateLoading } = useExamPaperTemplate(id);
  
  // Fetch academic years
  const { data: academicYears } = useAcademicYears(profile?.organizationId);
  
  // Get class academic year IDs for the selected academic year (if selected)
  const classAcademicYearIds = useMemo(() => {
    if (!selectedAcademicYearId || !template?.subjectId) return undefined;
    // We'll need to fetch class academic years for this academic year and subject
    // For now, we'll filter questions by classAcademicYearId in the frontend
    return undefined; // Will filter in frontend
  }, [selectedAcademicYearId, template?.subjectId]);
  
  // Fetch questions for the same subject (all academic years or filtered)
  // Only fetch when template is loaded and has a subjectId
  // Don't filter by schoolId - show all questions for the subject across all schools
  const questionFilters = useMemo(() => {
    if (!template?.subjectId) return undefined;
    
    return {
      // Don't include schoolId - show questions from all schools for this subject
      subjectId: template.subjectId,
      isActive: true, // Only show active questions
    };
  }, [template?.subjectId]);

  const { data: availableQuestions, isLoading: questionsLoading, error: questionsError } = useQuestions(
    questionFilters,
    false // Don't use pagination for this query
  );


  // Mutations
  const addItem = useAddExamPaperItem();
  const updateItem = useUpdateExamPaperItem();
  const deleteItem = useRemoveExamPaperItem();
  const reorderItems = useReorderExamPaperItems();

  // Filter available questions
  // Note: When usePaginated is false, useQuestions returns { data: [...], ... }
  // So availableQuestions is already the data array, not an object with a data property
  const filteredQuestions = useMemo(() => {
    // availableQuestions is the data array when usePaginated is false
    const questions = Array.isArray(availableQuestions) ? availableQuestions : (availableQuestions?.data || []);
    if (!Array.isArray(questions) || questions.length === 0) return [];
    
    const templateQuestionIds = new Set(template?.items?.map(item => item.questionId) || []);
    
    return questions.filter(q => {
      // Filter by academic year if selected
      // If academic year is selected, only show questions from that academic year
      // If question doesn't have a classAcademicYear, include it (might be generic questions)
      if (selectedAcademicYearId) {
        // If question has a classAcademicYear, check if it matches
        if (q.classAcademicYear?.academicYearId) {
          if (q.classAcademicYear.academicYearId !== selectedAcademicYearId) {
            return false;
          }
        }
        // If question doesn't have a classAcademicYear, we could exclude it or include it
        // For now, let's include it so users can see all questions
        // If you want to exclude questions without academic year when filtering, uncomment below:
        // return false;
      }
      
      // Exclude already added questions
      const notAlreadyAdded = !templateQuestionIds.has(q.id);
      return notAlreadyAdded;
    });
  }, [availableQuestions, selectedAcademicYearId, template?.items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !template?.items) return;

    const oldIndex = template.items.findIndex(item => item.id === active.id);
    const newIndex = template.items.findIndex(item => item.id === over.id);

    if (oldIndex !== newIndex) {
      const newItems = arrayMove(template.items, oldIndex, newIndex);
      const reorderedItems = newItems.map((item, index) => ({
        id: item.id,
        position: index,
        sectionLabel: item.sectionLabel || null,
      }));

      reorderItems.mutate({
        templateId: id!,
        items: reorderedItems,
      });
    }
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const toggleAllQuestions = () => {
    if (selectedQuestionIds.length === filteredQuestions.length) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestionIds.length === 0) {
      showToast.error(t('toast.examPaperSelectAtLeastOneQuestion'));
      return;
    }

    if (!id) {
      showToast.error(t('toast.examPaperTemplateIdMissing'));
      return;
    }

    setIsAddingQuestions(true);

    let addedCount = 0;
    let errorCount = 0;

    try {
      // Add questions sequentially using API client directly
      for (const questionId of selectedQuestionIds) {
        try {
          const insertData = mapExamPaperItemDomainToInsert({
            questionId,
            marksOverride: marksOverride || undefined,
            sectionLabel: sectionLabel || undefined,
            answerLinesCount: answerLinesCount || undefined,
            showAnswerLines: showAnswerLines ?? undefined,
            isMandatory: isMandatory ?? true,
            notes: notes || undefined,
          });

          await examPaperTemplatesApi.addItem(id, insertData);
          addedCount++;
        } catch (error) {
          errorCount++;
          // Continue with next question even if one fails
        }
      }

      // Invalidate queries to refresh the template
      await queryClient.invalidateQueries({ queryKey: ['exam-paper-template', id] });

      // Close dialog and reset state
      setIsAddQuestionDialogOpen(false);
      setSelectedQuestionIds([]);
      setMarksOverride(null);
      setSectionLabel('');
      setAnswerLinesCount(null);
      setShowAnswerLines(null);
      setIsMandatory(true);
      setNotes('');
      setSelectedAcademicYearId(null); // Reset filter

      // Show success/error message
      if (addedCount > 0) {
        if (errorCount > 0) {
          showToast.success(t('toast.examPaperQuestionsAddedPartial'), {
            added: addedCount,
            failed: errorCount,
          });
        } else {
          showToast.success(t('toast.examPaperQuestionsAddedSuccess'), { count: addedCount });
        }
      } else {
        showToast.error(t('toast.examPaperQuestionsAddFailed'));
      }
    } finally {
      setIsAddingQuestions(false);
    }
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setMarksOverride(item.marksOverride || null);
    setSectionLabel(item.sectionLabel || '');
    setAnswerLinesCount(item.answerLinesCount || null);
    setShowAnswerLines(item.showAnswerLines ?? null);
    setIsMandatory(item.isMandatory);
    setNotes(item.notes || '');
    setIsEditItemDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem) return;

    updateItem.mutate({
      templateId: id!,
      itemId: selectedItem.id,
      data: {
        marksOverride: marksOverride || undefined,
        sectionLabel: sectionLabel || undefined,
        answerLinesCount: answerLinesCount || undefined,
        showAnswerLines: showAnswerLines ?? undefined,
        isMandatory,
        notes: notes || undefined,
      },
    }, {
      onSuccess: () => {
        setIsEditItemDialogOpen(false);
        setSelectedItem(null);
        setMarksOverride(null);
        setSectionLabel('');
        setAnswerLinesCount(null);
        setShowAnswerLines(null);
        setIsMandatory(true);
        setNotes('');
      },
    });
  };

  const handleDeleteItem = () => {
    if (!selectedItem) return;

    deleteItem.mutate({
      templateId: id!,
      itemId: selectedItem.id,
    }, {
      onSuccess: () => {
        setIsDeleteItemDialogOpen(false);
        setSelectedItem(null);
      },
    });
  };

  const handleQuickUpdateAnswerLines = (itemId: string, answerLinesCount: number | null, showAnswerLines: boolean | null) => {
    updateItem.mutate({
      templateId: id!,
      itemId,
      data: {
        answerLinesCount: answerLinesCount ?? undefined,
        showAnswerLines: showAnswerLines ?? undefined,
      },
    });
  };

  const totalMarks = useMemo(() => {
    if (!template?.items || template.items.length === 0) return 0;
    const total = template.items.reduce((sum, item) => {
      // Get marks from override or question, ensure it's a number
      const marksOverride = item.marksOverride != null ? Number(item.marksOverride) : null;
      const questionMarks = item.question?.marks != null ? Number(item.question.marks) : null;
      const marks = marksOverride ?? questionMarks ?? 0;
      // Ensure marks is a valid number (not NaN)
      const validMarks = isNaN(marks) ? 0 : marks;
      return sum + validMarks;
    }, 0);
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(total * 100) / 100;
  }, [template?.items]);

  if (templateLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">{t('examPapers.loadingTemplate')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">{t('examPapers.templateNotFound')}</p>
            <Button onClick={() => navigate('/exams/papers')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('examPapers.backToTemplates')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/exams/papers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{template.title}</h1>
            <p className="text-sm text-muted-foreground">
              {t('examPapers.questionsCountSummary', {
                count: template.items?.length || 0,
                marks: totalMarks.toFixed(1).replace(/\.0$/, ''),
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setIsPreviewDialogOpen(true)}
            aria-label={t('common.preview')}
          >
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{t('common.preview')}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={() => setIsGenerateDialogOpen(true)}
            aria-label={t('examPapers.generatePdf')}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{t('examPapers.generatePdf')}</span>
          </Button>
          <Button size="sm" className="flex-shrink-0" onClick={() => setIsAddQuestionDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{t('examPapers.addQuestion')}</span>
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.templateInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('examPapers.subject')}</Label>
              <p className="font-medium">{template.subject?.name || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('examPapers.language')}</Label>
              <p className="font-medium">{template.language}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('examPapers.duration')}</Label>
              <p className="font-medium">{template.durationMinutes} {t('examPaperPreview.minutes')}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('examPapers.totalMarks')}</Label>
              <p className="font-medium">{totalMarks.toFixed(1).replace(/\.0$/, '')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.questions')}</CardTitle>
          <CardDescription>
            {t('examPapers.dragToReorder')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!template.items || template.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                {t('examPapers.noQuestionsYet')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>#</TableHead>
                    <TableHead>{t('examPapers.question')}</TableHead>
                    <TableHead>{t('examPapers.type')}</TableHead>
                    <TableHead>{t('examPapers.marks')}</TableHead>
                    <TableHead>{t('examPapers.answerLines')}</TableHead>
                    <TableHead>{t('examPapers.required')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={template.items.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {template.items.map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={(item) => {
                          setSelectedItem(item);
                          setIsDeleteItemDialogOpen(true);
                        }}
                        onQuickUpdateAnswerLines={handleQuickUpdateAnswerLines}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examPapers.addQuestionFromBank')}</DialogTitle>
            <DialogDescription>
              {t('examPapers.addQuestionFromBankDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Academic Year Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>{t('examPapers.filterByAcademicYear')}</Label>
                <Select
                  value={selectedAcademicYearId || '__all__'}
                  onValueChange={(val) => setSelectedAcademicYearId(val === '__all__' ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('examPapers.allAcademicYears')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t('examPapers.allAcademicYears')}</SelectItem>
                    {academicYears?.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && t('examPapers.currentYear')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground pt-8">
                {t('examPapers.questionsAvailable', { count: filteredQuestions.length })}
                {selectedQuestionIds.length > 0 && (
                  <span className="ml-2 font-medium">
                    {t('examPapers.selectedCount', { count: selectedQuestionIds.length })}
                  </span>
                )}
              </div>
            </div>

            {/* Questions Table */}
            {questionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('examPapers.loadingQuestions')}</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">
                  {questionsError ? (
                    t('examPapers.errorLoadingQuestions', { message: questionsError.message })
                  ) : (Array.isArray(availableQuestions) ? availableQuestions.length > 0 : availableQuestions?.data?.length > 0) ? (
                    t('examPapers.noQuestionsAvailableForFilter', {
                      total: Array.isArray(availableQuestions) ? availableQuestions.length : availableQuestions.data.length,
                    })
                  ) : template?.subjectId ? (
                    t('examPapers.noQuestionsForSubject', {
                      subject: template.subject?.name || template.subjectId,
                    })
                  ) : (
                    t('examPapers.selectSubjectForTemplateFirst')
                  )}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredQuestions.length > 0 && selectedQuestionIds.length === filteredQuestions.length}
                          onCheckedChange={toggleAllQuestions}
                        />
                      </TableHead>
                      <TableHead>{t('examPapers.questionText')}</TableHead>
                      <TableHead className="w-24">{t('examPapers.type')}</TableHead>
                      <TableHead className="w-20">{t('examPapers.marks')}</TableHead>
                      <TableHead className="w-32">{t('examPapers.difficulty')}</TableHead>
                      <TableHead className="w-40">{t('examPapers.academicYear')}</TableHead>
                      <TableHead className="w-32">{t('examPapers.reference')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((question) => (
                      <TableRow
                        key={question.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedQuestionIds.includes(question.id) ? 'bg-muted' : ''
                        }`}
                        onClick={() => toggleQuestionSelection(question.id)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedQuestionIds.includes(question.id)}
                            onCheckedChange={() => toggleQuestionSelection(question.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm font-medium line-clamp-2">
                              {question.text}
                            </p>
                            {question.options && question.options.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('examPapers.optionsCount', { count: question.options.length })}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {question.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{question.marks}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              question.difficulty === 'easy'
                                ? 'default'
                                : question.difficulty === 'medium'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {question.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {question.classAcademicYear?.academicYearName || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {question.reference || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Question Details Form */}
            {selectedQuestionIds.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('examPapers.settingsForSelected', { count: selectedQuestionIds.length })}
                  </CardTitle>
                  <CardDescription>
                    {t('examPapers.settingsAppliedToAll')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>{t('examPapers.marksOverride')}</Label>
                      <NumberInput
                        type="number"
                        value={marksOverride || ''}
                        onChange={(e) => setMarksOverride(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder={t('examPapers.marksOverridePlaceholder')}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('examPapers.marksOverridePlaceholder')}
                      </p>
                    </div>
                    <div>
                      <Label>{t('examPapers.sectionLabel')}</Label>
                      <Input
                        value={sectionLabel}
                        onChange={(e) => setSectionLabel(e.target.value)}
                        placeholder={t('examPapers.sectionLabelPlaceholder')}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t('examPapers.notesOptional')}</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder={t('examPapers.notesPlaceholderQuestions')}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isMandatory"
                      checked={isMandatory}
                      onCheckedChange={setIsMandatory}
                    />
                    <Label htmlFor="isMandatory" className="cursor-pointer">
                      {t('examPapers.requiredMandatory')}
                    </Label>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddQuestionDialogOpen(false);
              setSelectedQuestionIds([]);
              setSelectedAcademicYearId(null);
              setMarksOverride(null);
              setSectionLabel('');
              setAnswerLinesCount(null);
              setShowAnswerLines(null);
              setIsMandatory(true);
              setNotes('');
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddQuestions} disabled={selectedQuestionIds.length === 0 || isAddingQuestions}>
              {isAddingQuestions 
                ? t('examPapers.addingQuestionsCount', { count: selectedQuestionIds.length })
                : t('examPapers.addQuestionsCount', { count: selectedQuestionIds.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examPapers.editQuestionItem')}</DialogTitle>
            <DialogDescription>
              {t('examPapers.editQuestionItemDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{t('examPapers.questionLabel')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedItem?.question?.text || t('examPapers.noQuestion')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('examPapers.marksOverride')}</Label>
                <NumberInput
                  type="number"
                  value={marksOverride || ''}
                  onChange={(e) => setMarksOverride(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>{t('examPapers.sectionLabel')}</Label>
                <Input
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>{t('examPapers.notesOptional')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            {selectedItem?.question?.type && ['short', 'descriptive', 'essay'].includes(selectedItem.question.type) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <Label>{t('examPapers.answerLinesCount')}</Label>
                  <NumberInput
                    type="number"
                    min="0"
                    max="50"
                    value={answerLinesCount || ''}
                    onChange={(e) => setAnswerLinesCount(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder={t('examPapers.autoBasedOnType')}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('examPapers.defaultLinesCount', {
                      count:
                        selectedItem.question.type === 'short'
                          ? 3
                          : selectedItem.question.type === 'essay'
                            ? 6
                            : 4,
                    })}
                  </p>
                </div>
                <div className="flex flex-col justify-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="editShowAnswerLines"
                      checked={showAnswerLines ?? true}
                      onCheckedChange={(checked) => setShowAnswerLines(checked)}
                    />
                    <Label htmlFor="editShowAnswerLines" className="cursor-pointer">
                      {t('examPapers.showAnswerLines')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('examPapers.toggleAnswerLines')}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsMandatory"
                checked={isMandatory}
                onCheckedChange={setIsMandatory}
              />
              <Label htmlFor="editIsMandatory" className="cursor-pointer">
                {t('examPapers.requiredMandatory')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
              {updateItem.isPending ? t('examPapers.updating') : t('common.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={isDeleteItemDialogOpen} onOpenChange={setIsDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('examPapers.removeQuestion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('examPapers.removeQuestionConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      {id && (
        <PaperPreview
          templateId={id}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />
      )}

      {/* Generate PDF Dialog */}
      {id && (
        <PaperGenerator
          templateId={id}
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
        />
      )}
    </div>
  );
}

