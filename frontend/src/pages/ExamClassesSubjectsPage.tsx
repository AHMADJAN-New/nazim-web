import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useExam, useExamClasses, useExamSubjects,
  useAssignClassToExam, useRemoveClassFromExam,
  useEnrollSubjectToExam, useRemoveExamSubject, useUpdateExamSubject
} from '@/hooks/useExams';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useClassSubjects } from '@/hooks/useSubjects';
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
import { 
  ArrowLeft, Plus, Trash2, BookOpen, GraduationCap, CheckCircle2, Circle,
  Settings2
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { ExamClass, ExamSubject } from '@/types/domain/exam';

export function ExamClassesSubjectsPage() {
  const { t } = useLanguage();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(examId);
  const { data: examSubjects, isLoading: subjectsLoading } = useExamSubjects(examId);
  const { data: allClassAcademicYears } = useClassAcademicYears(organizationId);

  // Mutations
  const assignClass = useAssignClassToExam();
  const removeClass = useRemoveClassFromExam();
  const enrollSubject = useEnrollSubjectToExam();
  const removeSubject = useRemoveExamSubject();
  const updateSubject = useUpdateExamSubject();

  // Permissions
  const hasManage = useHasPermission('exams.manage');

  // State
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [selectedClassAcademicYearId, setSelectedClassAcademicYearId] = useState('');
  const [isRemoveClassDialogOpen, setIsRemoveClassDialogOpen] = useState(false);
  const [classToRemove, setClassToRemove] = useState<ExamClass | null>(null);
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedExamClassId, setSelectedExamClassId] = useState('');
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState('');
  const [subjectFormData, setSubjectFormData] = useState({
    totalMarks: '',
    passingMarks: '',
  });
  const [isRemoveSubjectDialogOpen, setIsRemoveSubjectDialogOpen] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState<ExamSubject | null>(null);
  const [isEditSubjectDialogOpen, setIsEditSubjectDialogOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<ExamSubject | null>(null);

  // Get class subjects for the selected exam class
  const selectedExamClass = examClasses?.find(ec => ec.id === selectedExamClassId);
  const { data: classSubjects } = useClassSubjects(
    selectedExamClass?.classAcademicYearId, 
    organizationId
  );

  // Filter out already assigned classes
  const availableClassAcademicYears = useMemo(() => {
    if (!allClassAcademicYears || !examClasses) return [];
    const assignedClassAcademicYearIds = new Set(examClasses.map(ec => ec.classAcademicYearId));
    return allClassAcademicYears.filter(cay => 
      !assignedClassAcademicYearIds.has(cay.id) && 
      exam?.academicYearId === cay.academicYearId
    );
  }, [allClassAcademicYears, examClasses, exam?.academicYearId]);

  // Filter out already assigned subjects for the selected exam class
  const availableClassSubjects = useMemo(() => {
    if (!classSubjects || !examSubjects || !selectedExamClassId) return [];
    const assignedClassSubjectIds = new Set(
      examSubjects
        .filter(es => es.examClassId === selectedExamClassId)
        .map(es => es.classSubjectId)
    );
    return classSubjects.filter(cs => !assignedClassSubjectIds.has(cs.id));
  }, [classSubjects, examSubjects, selectedExamClassId]);

  // Get subjects for a specific exam class
  const getSubjectsForClass = (examClassId: string) => {
    return examSubjects?.filter(es => es.examClassId === examClassId) || [];
  };

  // Calculate progress
  const totalClasses = examClasses?.length || 0;
  const classesWithSubjects = examClasses?.filter(ec => 
    getSubjectsForClass(ec.id).length > 0
  ).length || 0;

  const handleAddClass = () => {
    if (!examId || !selectedClassAcademicYearId) return;

    assignClass.mutate(
      { exam_id: examId, class_academic_year_id: selectedClassAcademicYearId },
      {
        onSuccess: () => {
          showToast.success(t('toast.classAssigned') || 'Class assigned to exam');
          setIsAddClassDialogOpen(false);
          setSelectedClassAcademicYearId('');
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.classAssignFailed') || 'Failed to assign class');
        },
      }
    );
  };

  const handleRemoveClass = () => {
    if (!classToRemove) return;

    removeClass.mutate(classToRemove.id, {
      onSuccess: () => {
        showToast.success(t('toast.classRemoved') || 'Class removed from exam');
        setIsRemoveClassDialogOpen(false);
        setClassToRemove(null);
      },
      onError: (error: Error) => {
        showToast.error(error.message || t('toast.classRemoveFailed') || 'Failed to remove class');
      },
    });
  };

  const handleAddSubject = () => {
    if (!examId || !selectedExamClassId || !selectedClassSubjectId) return;

    enrollSubject.mutate(
      {
        exam_id: examId,
        exam_class_id: selectedExamClassId,
        class_subject_id: selectedClassSubjectId,
        total_marks: subjectFormData.totalMarks ? parseInt(subjectFormData.totalMarks) : null,
        passing_marks: subjectFormData.passingMarks ? parseInt(subjectFormData.passingMarks) : null,
      },
      {
        onSuccess: () => {
          showToast.success(t('toast.subjectEnrolled') || 'Subject added to exam');
          setIsAddSubjectDialogOpen(false);
          resetSubjectForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.subjectEnrollFailed') || 'Failed to add subject');
        },
      }
    );
  };

  const handleRemoveSubject = () => {
    if (!subjectToRemove) return;

    removeSubject.mutate(subjectToRemove.id, {
      onSuccess: () => {
        showToast.success(t('toast.subjectRemoved') || 'Subject removed from exam');
        setIsRemoveSubjectDialogOpen(false);
        setSubjectToRemove(null);
      },
      onError: (error: Error) => {
        showToast.error(error.message || t('toast.subjectRemoveFailed') || 'Failed to remove subject');
      },
    });
  };

  const handleUpdateSubject = () => {
    if (!subjectToEdit) return;

    updateSubject.mutate(
      {
        id: subjectToEdit.id,
        data: {
          total_marks: subjectFormData.totalMarks ? parseInt(subjectFormData.totalMarks) : null,
          passing_marks: subjectFormData.passingMarks ? parseInt(subjectFormData.passingMarks) : null,
        },
      },
      {
        onSuccess: () => {
          showToast.success(t('toast.examSubjectUpdated') || 'Subject updated');
          setIsEditSubjectDialogOpen(false);
          setSubjectToEdit(null);
          resetSubjectForm();
        },
        onError: (error: Error) => {
          showToast.error(error.message || t('toast.examSubjectUpdateFailed') || 'Failed to update subject');
        },
      }
    );
  };

  const resetSubjectForm = () => {
    setSelectedClassSubjectId('');
    setSubjectFormData({ totalMarks: '', passingMarks: '' });
  };

  const openEditSubjectDialog = (subject: ExamSubject) => {
    setSubjectToEdit(subject);
    setSubjectFormData({
      totalMarks: subject.totalMarks?.toString() || '',
      passingMarks: subject.passingMarks?.toString() || '',
    });
    setIsEditSubjectDialogOpen(true);
  };

  const isLoading = examLoading || classesLoading || subjectsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.notFound') || 'Exam not found'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('exams.backToList') || 'Back to Exams'}
          </Button>
        </div>
      </div>
    );
  }

  const canModify = hasManage && ['draft', 'scheduled'].includes(exam.status);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('exams.classesSubjectsDescription') || 'Manage classes and subjects for this exam'}
          </p>
        </div>
        <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t('exams.classesAssigned') || 'Classes Assigned'}: {totalClasses}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {t('exams.classesConfigured') || 'Classes Configured'}: {classesWithSubjects}/{totalClasses}
              </span>
            </div>
            {classesWithSubjects === totalClasses && totalClasses > 0 ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {t('exams.allConfigured') || 'All Configured'}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Circle className="h-3 w-3" />
                {t('exams.pendingConfiguration') || 'Pending Configuration'}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Classes Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{t('exams.assignedClasses') || 'Assigned Classes'}</CardTitle>
            <CardDescription>
              {t('exams.assignedClassesDescription') || 'Classes included in this exam'}
            </CardDescription>
          </div>
          {canModify && (
            <Button onClick={() => setIsAddClassDialogOpen(true)} disabled={availableClassAcademicYears.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {t('exams.addClass') || 'Add Class'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!examClasses || examClasses.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('exams.noClassesAssigned') || 'No classes assigned yet. Add classes to configure subjects.'}
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {examClasses.map((examClass) => {
                const subjects = getSubjectsForClass(examClass.id);
                const className = examClass.classAcademicYear?.class?.name || 'Class';
                const sectionName = examClass.classAcademicYear?.sectionName;
                const displayName = sectionName ? `${className} - ${sectionName}` : className;

                return (
                  <AccordionItem key={examClass.id} value={examClass.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-4 w-4" />
                          <span className="font-medium">{displayName}</span>
                          <Badge variant="outline" className="ml-2">
                            {subjects.length} {t('exams.subjects') || 'subjects'}
                          </Badge>
                        </div>
                        {subjects.length > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-7 space-y-4">
                        {/* Subject List */}
                        {subjects.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                                <TableHead>{t('exams.totalMarks') || 'Total Marks'}</TableHead>
                                <TableHead>{t('exams.passingMarks') || 'Passing Marks'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {subjects.map((subject) => (
                                <TableRow key={subject.id}>
                                  <TableCell className="font-medium">
                                    {subject.subject?.name || subject.classSubject?.subject?.name || 'Subject'}
                                  </TableCell>
                                  <TableCell>{subject.totalMarks ?? '—'}</TableCell>
                                  <TableCell>{subject.passingMarks ?? '—'}</TableCell>
                                  <TableCell className="text-right">
                                    {canModify && (
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => openEditSubjectDialog(subject)}
                                        >
                                          <Settings2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setSubjectToRemove(subject);
                                            setIsRemoveSubjectDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4">
                            {t('exams.noSubjectsConfigured') || 'No subjects configured for this class yet.'}
                          </p>
                        )}

                        {/* Actions */}
                        {canModify && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExamClassId(examClass.id);
                                setIsAddSubjectDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t('exams.addSubject') || 'Add Subject'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setClassToRemove(examClass);
                                setIsRemoveClassDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('exams.removeClass') || 'Remove Class'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add Class Dialog */}
      <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.addClass') || 'Add Class to Exam'}</DialogTitle>
            <DialogDescription>
              {t('exams.addClassDescription') || 'Select a class to add to this exam'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('exams.selectClass') || 'Select Class'}</Label>
              <Select value={selectedClassAcademicYearId} onValueChange={setSelectedClassAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectClassPlaceholder') || 'Select a class'} />
                </SelectTrigger>
                <SelectContent>
                  {availableClassAcademicYears.map((cay) => {
                    const displayName = cay.sectionName 
                      ? `${cay.class?.name} - ${cay.sectionName}` 
                      : cay.class?.name || 'Class';
                    return (
                      <SelectItem key={cay.id} value={cay.id}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {availableClassAcademicYears.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('exams.noAvailableClasses') || 'All classes for this academic year are already assigned.'}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClassDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddClass} 
              disabled={!selectedClassAcademicYearId || assignClass.isPending}
            >
              {t('common.add') || 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Class Dialog */}
      <AlertDialog open={isRemoveClassDialogOpen} onOpenChange={setIsRemoveClassDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.removeClassConfirm') || 'Remove Class'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.removeClassConfirmMessage') || 'Are you sure you want to remove this class? All associated subjects will also be removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveClass} className="bg-destructive text-destructive-foreground">
              {t('common.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Subject Dialog */}
      <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.addSubject') || 'Add Subject'}</DialogTitle>
            <DialogDescription>
              {t('exams.addSubjectDescription') || 'Configure a subject for this class in the exam'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('exams.selectSubject') || 'Select Subject'}</Label>
              <Select value={selectedClassSubjectId} onValueChange={setSelectedClassSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectSubjectPlaceholder') || 'Select a subject'} />
                </SelectTrigger>
                <SelectContent>
                  {availableClassSubjects.map((cs) => (
                    <SelectItem key={cs.id} value={cs.id}>
                      {cs.subject?.name || 'Subject'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableClassSubjects.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('exams.noAvailableSubjects') || 'All subjects for this class are already configured.'}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total-marks">{t('exams.totalMarks') || 'Total Marks'}</Label>
                <Input
                  id="total-marks"
                  type="number"
                  min="0"
                  value={subjectFormData.totalMarks}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, totalMarks: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="passing-marks">{t('exams.passingMarks') || 'Passing Marks'}</Label>
                <Input
                  id="passing-marks"
                  type="number"
                  min="0"
                  max={subjectFormData.totalMarks || undefined}
                  value={subjectFormData.passingMarks}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, passingMarks: e.target.value })}
                  placeholder="33"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddSubjectDialogOpen(false); resetSubjectForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddSubject} 
              disabled={!selectedClassSubjectId || enrollSubject.isPending}
            >
              {t('common.add') || 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditSubjectDialogOpen} onOpenChange={setIsEditSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exams.editSubject') || 'Edit Subject'}</DialogTitle>
            <DialogDescription>
              {t('exams.editSubjectDescription') || 'Update marks configuration for this subject'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {subjectToEdit && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">{subjectToEdit.subject?.name || 'Subject'}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-total-marks">{t('exams.totalMarks') || 'Total Marks'}</Label>
                <Input
                  id="edit-total-marks"
                  type="number"
                  min="0"
                  value={subjectFormData.totalMarks}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, totalMarks: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="edit-passing-marks">{t('exams.passingMarks') || 'Passing Marks'}</Label>
                <Input
                  id="edit-passing-marks"
                  type="number"
                  min="0"
                  max={subjectFormData.totalMarks || undefined}
                  value={subjectFormData.passingMarks}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, passingMarks: e.target.value })}
                  placeholder="33"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditSubjectDialogOpen(false); setSubjectToEdit(null); resetSubjectForm(); }}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleUpdateSubject} disabled={updateSubject.isPending}>
              {t('common.update') || 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Subject Dialog */}
      <AlertDialog open={isRemoveSubjectDialogOpen} onOpenChange={setIsRemoveSubjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.removeSubjectConfirm') || 'Remove Subject'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.removeSubjectConfirmMessage') || 'Are you sure you want to remove this subject from the exam?'}
              {subjectToRemove && (
                <span className="block mt-2 font-semibold">{subjectToRemove.subject?.name || 'Subject'}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSubject} className="bg-destructive text-destructive-foreground">
              {t('common.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
