import { useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import {
  useStudentEducationalHistory,
  useCreateStudentEducationalHistory,
  useUpdateStudentEducationalHistory,
  useDeleteStudentEducationalHistory,
  StudentEducationalHistory,
  StudentEducationalHistoryInsert,
  Student,
} from '@/hooks/useStudents';
import { educationalHistorySchema, type EducationalHistoryFormData } from '@/lib/validations';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

interface StudentEducationalHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function StudentEducationalHistoryDialog({
  open,
  onOpenChange,
  student,
}: StudentEducationalHistoryDialogProps) {
  const { t } = useLanguage();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentEducationalHistory | null>(null);

  const { data: history, isLoading } = useStudentEducationalHistory(student?.id);
  const createHistory = useCreateStudentEducationalHistory();
  const updateHistory = useUpdateStudentEducationalHistory();
  const deleteHistory = useDeleteStudentEducationalHistory();

  const formMethods = useForm<EducationalHistoryFormData>({
    resolver: zodResolver(educationalHistorySchema),
    defaultValues: {
      institution_name: '',
      academic_year: '',
      grade_level: '',
      start_date: '',
      end_date: '',
      achievements: '',
      notes: '',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = formMethods;

  const resetForm = () => {
    reset({
      institution_name: '',
      academic_year: '',
      grade_level: '',
      start_date: '',
      end_date: '',
      achievements: '',
      notes: '',
    });
    setSelectedRecord(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (record: StudentEducationalHistory) => {
    setSelectedRecord(record);
    reset({
      institution_name: record.institution_name,
      academic_year: record.academic_year || '',
      grade_level: record.grade_level || '',
      start_date: record.start_date || '',
      end_date: record.end_date || '',
      achievements: record.achievements || '',
      notes: record.notes || '',
    });
    setIsFormDialogOpen(true);
  };

  const handleSave = async (data: EducationalHistoryFormData) => {
    if (!student) return;

    if (selectedRecord) {
      await updateHistory.mutateAsync({
        id: selectedRecord.id,
        studentId: student.id,
        data: {
          institution_name: data.institution_name,
          academic_year: data.academic_year || null,
          grade_level: data.grade_level || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          achievements: data.achievements || null,
          notes: data.notes || null,
        },
      });
    } else {
      await createHistory.mutateAsync({
        student_id: student.id,
        organization_id: student.organizationId,
        school_id: student.schoolId,
        institution_name: data.institution_name,
        academic_year: data.academic_year || null,
        grade_level: data.grade_level || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        achievements: data.achievements || null,
        notes: data.notes || null,
      });
    }

    setIsFormDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedRecord || !student) return;

    await deleteHistory.mutateAsync({
      id: selectedRecord.id,
      studentId: student.id,
    });

    setIsDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('students.educationalHistory') || 'Educational History'}
            </DialogTitle>
            <DialogDescription>
              {t('students.educationalHistoryDescription') || 'View and manage educational history for'} {student.fullName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('students.addHistory') || 'Add History'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('students.institutionName') || 'Institution'}</TableHead>
                    <TableHead>{t('students.academicYear') || 'Academic Year'}</TableHead>
                    <TableHead>{t('students.gradeLevel') || 'Grade'}</TableHead>
                    <TableHead>{t('students.period') || 'Period'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.institution_name}</TableCell>
                      <TableCell>{record.academic_year || '—'}</TableCell>
                      <TableCell>{record.grade_level || '—'}</TableCell>
                      <TableCell>
                        {record.start_date && record.end_date
                          ? `${formatDate(record.start_date)} - ${formatDate(record.end_date)}`
                          : record.start_date
                            ? formatDate(record.start_date)
                            : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(record)}
                            title={t('common.edit') || 'Edit'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedRecord(record);
                              setIsDeleteDialogOpen(true);
                            }}
                            title={t('common.delete') || 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('students.noEducationalHistory') || 'No educational history recorded'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Form Dialog */}
      <Dialog 
        open={isFormDialogOpen} 
        onOpenChange={(open) => {
          setIsFormDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRecord
                ? t('students.editHistory') || 'Edit Educational History'
                : t('students.addHistory') || 'Add Educational History'}
            </DialogTitle>
            <DialogDescription>
              {t('students.educationalHistoryFormDescription') || 'Enter the educational history details'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...formMethods}>
          <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
            <div>
              <Label htmlFor="institution_name">{t('students.institutionName') || 'Institution Name'} *</Label>
              <Input
                id="institution_name"
                {...register('institution_name')}
                placeholder={t('students.institutionPlaceholder') || 'School or institution name'}
              />
              {errors.institution_name && (
                <p className="text-sm text-destructive mt-1">{errors.institution_name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="academic_year">{t('students.academicYear') || 'Academic Year'}</Label>
                <Input
                  id="academic_year"
                  {...register('academic_year')}
                  placeholder={t('students.academicYearPlaceholder') || '1403'}
                />
                {errors.academic_year && (
                  <p className="text-sm text-destructive mt-1">{errors.academic_year.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="grade_level">{t('students.gradeLevel') || 'Grade Level'}</Label>
                <Input
                  id="grade_level"
                  {...register('grade_level')}
                  placeholder={t('students.gradeLevelPlaceholder') || '5'}
                />
                {errors.grade_level && (
                  <p className="text-sm text-destructive mt-1">{errors.grade_level.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">{t('students.startDate') || 'Start Date'}</Label>
                <CalendarFormField control={control} name="start_date" label={t('students.startDate') || 'Start Date'} />
                {errors.start_date && (
                  <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="end_date">{t('students.endDate') || 'End Date'}</Label>
                <CalendarFormField control={control} name="end_date" label={t('students.endDate') || 'End Date'} />
                {errors.end_date && (
                  <p className="text-sm text-destructive mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="achievements">{t('students.achievements') || 'Achievements'}</Label>
              <Textarea
                id="achievements"
                {...register('achievements')}
                placeholder={t('students.achievementsPlaceholder') || 'Any achievements or awards'}
                rows={2}
              />
              {errors.achievements && (
                <p className="text-sm text-destructive mt-1">{errors.achievements.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="notes">{t('students.notes') || 'Notes'}</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder={t('students.notesPlaceholder') || 'Additional notes'}
                rows={2}
              />
              {errors.notes && (
                <p className="text-sm text-destructive mt-1">{errors.notes.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsFormDialogOpen(false)}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={createHistory.isPending || updateHistory.isPending}
              >
                {createHistory.isPending || updateHistory.isPending
                  ? t('common.saving') || 'Saving...'
                  : t('common.save') || 'Save'}
              </Button>
            </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteHistory') || 'Delete Educational History'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteHistoryConfirm') || 'Are you sure you want to delete this educational history record? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default StudentEducationalHistoryDialog;

