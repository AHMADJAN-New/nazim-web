import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useExamPaperTemplate, useAddExamPaperItem, useUpdateExamPaperItem, useRemoveExamPaperItem, useReorderExamPaperItems } from '@/hooks/useExamPapers';
import { useQuestions } from '@/hooks/useQuestions';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Plus, Trash2, GripVertical, Eye, Download, MoreHorizontal, FileText } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { PaperPreview } from '@/components/examPapers/PaperPreview';
import { PaperGenerator } from '@/components/examPapers/PaperGenerator';
import { examPaperTemplatesApi } from '@/lib/api/client';
import { mapExamPaperItemDomainToInsert } from '@/mappers/examPaperMapper';
import { Input as NumberInput } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
          <p className="text-sm line-clamp-2">{question?.text || 'No question'}</p>
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
              {showLines ? `${currentLines} lines` : 'Hidden'}
            </Badge>
          </div>
        )}
        {!isEssayType && <span className="text-muted-foreground text-sm">—</span>}
      </TableCell>
      <TableCell>
        {item.isMandatory ? (
          <Badge variant="default">Required</Badge>
        ) : (
          <Badge variant="outline">Optional</Badge>
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
              Edit
            </DropdownMenuItem>
            {isEssayType && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Answer Lines</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, null, !showLines)}
                >
                  {showLines ? 'Hide Lines' : 'Show Lines'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 3, null)}
                  disabled={currentLines === 3}
                >
                  Set to 3 lines
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 4, null)}
                  disabled={currentLines === 4}
                >
                  Set to 4 lines
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 6, null)}
                  disabled={currentLines === 6}
                >
                  Set to 6 lines
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onQuickUpdateAnswerLines(item.id, 8, null)}
                  disabled={currentLines === 8}
                >
                  Set to 8 lines
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(item)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
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
      showToast.error('Please select at least one question');
      return;
    }

    if (!id) {
      showToast.error('Template ID is missing');
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
          showToast.success(`Added ${addedCount} question${addedCount !== 1 ? 's' : ''}. ${errorCount} failed.`);
        } else {
          showToast.success(`Successfully added ${addedCount} question${addedCount !== 1 ? 's' : ''}`);
        }
      } else {
        showToast.error('Failed to add questions');
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
            <p className="text-center">Loading template...</p>
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
            <p className="text-center text-destructive">Template not found</p>
            <Button onClick={() => navigate('/exams/paper-templates')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/exams/paper-templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{template.title}</h1>
            <p className="text-sm text-muted-foreground">
              {template.items?.length || 0} questions • {totalMarks.toFixed(1).replace(/\.0$/, '')} total marks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewDialogOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsGenerateDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button onClick={() => setIsAddQuestionDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Subject</Label>
              <p className="font-medium">{template.subject?.name || '—'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Language</Label>
              <p className="font-medium">{template.language}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <p className="font-medium">{template.durationMinutes} min</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Marks</Label>
              <p className="font-medium">{totalMarks.toFixed(1).replace(/\.0$/, '')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Drag and drop to reorder questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!template.items || template.items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                No questions added yet. Click "Add Question" to get started.
              </p>
            </div>
          ) : (
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
                    <TableHead>Question</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Answer Lines</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
          )}
        </CardContent>
      </Card>

      {/* Add Question Dialog */}
      <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Question from Question Bank</DialogTitle>
            <DialogDescription>
              Select a question from the question bank. You can filter by academic year to see questions from different years.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Academic Year Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Filter by Academic Year</Label>
                <Select
                  value={selectedAcademicYearId || '__all__'}
                  onValueChange={(val) => setSelectedAcademicYearId(val === '__all__' ? null : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Academic Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Academic Years</SelectItem>
                    {academicYears?.map((year) => (
                      <SelectItem key={year.id} value={year.id}>
                        {year.name} {year.isCurrent && '(Current)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground pt-8">
                {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''} available
                {selectedQuestionIds.length > 0 && (
                  <span className="ml-2 font-medium">
                    ({selectedQuestionIds.length} selected)
                  </span>
                )}
              </div>
            </div>

            {/* Questions Table */}
            {questionsLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading questions...</p>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">
                  {questionsError ? (
                    `Error loading questions: ${questionsError.message}`
                  ) : (Array.isArray(availableQuestions) ? availableQuestions.length > 0 : availableQuestions?.data?.length > 0) ? (
                    `No questions available for the selected filter. ${Array.isArray(availableQuestions) ? availableQuestions.length : availableQuestions.data.length} question${(Array.isArray(availableQuestions) ? availableQuestions.length : availableQuestions.data.length) !== 1 ? 's' : ''} found but already added or filtered out.`
                  ) : template?.subjectId ? (
                    `No questions found for subject "${template.subject?.name || template.subjectId}". Please check if questions exist in the question bank for this subject.`
                  ) : (
                    'Please select a subject for this template first.'
                  )}
                </p>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredQuestions.length > 0 && selectedQuestionIds.length === filteredQuestions.length}
                          onCheckedChange={toggleAllQuestions}
                        />
                      </TableHead>
                      <TableHead>Question Text</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead className="w-20">Marks</TableHead>
                      <TableHead className="w-32">Difficulty</TableHead>
                      <TableHead className="w-40">Academic Year</TableHead>
                      <TableHead className="w-32">Reference</TableHead>
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
                                {question.options.length} option{question.options.length !== 1 ? 's' : ''}
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
                          {question.classAcademicYear?.academicYearName || 'N/A'}
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
                    Settings for {selectedQuestionIds.length} Selected Question{selectedQuestionIds.length !== 1 ? 's' : ''}
                  </CardTitle>
                  <CardDescription>
                    These settings will be applied to all selected questions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Marks Override (Optional)</Label>
                      <NumberInput
                        type="number"
                        value={marksOverride || ''}
                        onChange={(e) => setMarksOverride(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Leave empty to use each question's default marks"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to use each question's default marks
                      </p>
                    </div>
                    <div>
                      <Label>Section Label (Optional)</Label>
                      <Input
                        value={sectionLabel}
                        onChange={(e) => setSectionLabel(e.target.value)}
                        placeholder="e.g., Section A, Part 1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Additional notes for these questions..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isMandatory"
                      checked={isMandatory}
                      onCheckedChange={setIsMandatory}
                    />
                    <Label htmlFor="isMandatory" className="cursor-pointer">
                      Required (mandatory)
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
              Cancel
            </Button>
            <Button onClick={handleAddQuestions} disabled={selectedQuestionIds.length === 0 || isAddingQuestions}>
              {isAddingQuestions 
                ? `Adding ${selectedQuestionIds.length} question${selectedQuestionIds.length !== 1 ? 's' : ''}...` 
                : `Add ${selectedQuestionIds.length} Question${selectedQuestionIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question Item</DialogTitle>
            <DialogDescription>
              Update the question item settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Question:</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedItem?.question?.text || 'No question'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Marks Override (Optional)</Label>
                <NumberInput
                  type="number"
                  value={marksOverride || ''}
                  onChange={(e) => setMarksOverride(e.target.value ? parseFloat(e.target.value) : null)}
                />
              </div>
              <div>
                <Label>Section Label (Optional)</Label>
                <Input
                  value={sectionLabel}
                  onChange={(e) => setSectionLabel(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            {selectedItem?.question?.type && ['short', 'descriptive', 'essay'].includes(selectedItem.question.type) && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <Label>Answer Lines Count (Optional)</Label>
                  <NumberInput
                    type="number"
                    min="0"
                    max="50"
                    value={answerLinesCount || ''}
                    onChange={(e) => setAnswerLinesCount(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Auto (based on question type)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default: {selectedItem.question.type === 'short' ? '3' : selectedItem.question.type === 'essay' ? '6' : '4'} lines
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
                      Show Answer Lines
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Toggle to show/hide answer lines
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
                Required (mandatory)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
              {updateItem.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={isDeleteItemDialogOpen} onOpenChange={setIsDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this question from the template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
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

