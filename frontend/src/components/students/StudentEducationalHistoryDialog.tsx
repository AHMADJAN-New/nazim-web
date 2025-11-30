import { useState } from 'react';
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
import {
  useStudentEducationalHistory,
  useCreateStudentEducationalHistory,
  useUpdateStudentEducationalHistory,
  useDeleteStudentEducationalHistory,
  StudentEducationalHistory,
  StudentEducationalHistoryInsert,
  Student,
} from '@/hooks/useStudents';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
  const [formData, setFormData] = useState<Partial<StudentEducationalHistoryInsert>>({});

  const { data: history, isLoading } = useStudentEducationalHistory(student?.id);
  const createHistory = useCreateStudentEducationalHistory();
  const updateHistory = useUpdateStudentEducationalHistory();
  const deleteHistory = useDeleteStudentEducationalHistory();

  const resetForm = () => {
    setFormData({});
    setSelectedRecord(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (record: StudentEducationalHistory) => {
    setSelectedRecord(record);
    setFormData({
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

  const handleSave = async () => {
    if (!student || !formData.institution_name) return;

    if (selectedRecord) {
      await updateHistory.mutateAsync({
        id: selectedRecord.id,
        studentId: student.id,
        data: formData,
      });
    } else {
      await createHistory.mutateAsync({
        student_id: student.id,
        organization_id: student.organization_id,
        school_id: student.school_id,
        institution_name: formData.institution_name,
        academic_year: formData.academic_year || null,
        grade_level: formData.grade_level || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        achievements: formData.achievements || null,
        notes: formData.notes || null,
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
              {t('students.educationalHistoryDescription') || 'View and manage educational history for'} {student.full_name}
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
                          ? `${format(new Date(record.start_date), 'yyyy-MM-dd')} - ${format(new Date(record.end_date), 'yyyy-MM-dd')}`
                          : record.start_date
                            ? format(new Date(record.start_date), 'yyyy-MM-dd')
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
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="institution_name">{t('students.institutionName') || 'Institution Name'} *</Label>
              <Input
                id="institution_name"
                value={formData.institution_name || ''}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                placeholder={t('students.institutionPlaceholder') || 'School or institution name'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="academic_year">{t('students.academicYear') || 'Academic Year'}</Label>
                <Input
                  id="academic_year"
                  value={formData.academic_year || ''}
                  onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                  placeholder={t('students.academicYearPlaceholder') || '1403'}
                />
              </div>
              <div>
                <Label htmlFor="grade_level">{t('students.gradeLevel') || 'Grade Level'}</Label>
                <Input
                  id="grade_level"
                  value={formData.grade_level || ''}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                  placeholder={t('students.gradeLevelPlaceholder') || '5'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">{t('students.startDate') || 'Start Date'}</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">{t('students.endDate') || 'End Date'}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="achievements">{t('students.achievements') || 'Achievements'}</Label>
              <Textarea
                id="achievements"
                value={formData.achievements || ''}
                onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                placeholder={t('students.achievementsPlaceholder') || 'Any achievements or awards'}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notes">{t('students.notes') || 'Notes'}</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('students.notesPlaceholder') || 'Additional notes'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.institution_name || createHistory.isPending || updateHistory.isPending}
            >
              {createHistory.isPending || updateHistory.isPending
                ? t('common.saving') || 'Saving...'
                : t('common.save') || 'Save'}
            </Button>
          </DialogFooter>
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

