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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useStudentDisciplineRecords,
  useCreateStudentDisciplineRecord,
  useUpdateStudentDisciplineRecord,
  useDeleteStudentDisciplineRecord,
  useResolveStudentDisciplineRecord,
  StudentDisciplineRecord,
  StudentDisciplineRecordInsert,
  DisciplineSeverity,
  Student,
} from '@/hooks/useStudents';
import { AlertTriangle, Plus, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading';

interface StudentDisciplineRecordsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

const severityColors: Record<DisciplineSeverity, string> = {
  minor: 'bg-blue-100 text-blue-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  major: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800',
};

export function StudentDisciplineRecordsDialog({
  open,
  onOpenChange,
  student,
}: StudentDisciplineRecordsDialogProps) {
  const { t } = useLanguage();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StudentDisciplineRecord | null>(null);
  const [formData, setFormData] = useState<Partial<StudentDisciplineRecordInsert>>({
    severity: 'minor',
    resolved: false,
  });

  const { data: records, isLoading } = useStudentDisciplineRecords(student?.id);
  const createRecord = useCreateStudentDisciplineRecord();
  const updateRecord = useUpdateStudentDisciplineRecord();
  const deleteRecord = useDeleteStudentDisciplineRecord();
  const resolveRecord = useResolveStudentDisciplineRecord();

  const resetForm = () => {
    setFormData({ severity: 'minor', resolved: false });
    setSelectedRecord(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (record: StudentDisciplineRecord) => {
    setSelectedRecord(record);
    setFormData({
      incident_date: record.incident_date,
      incident_type: record.incident_type,
      description: record.description || '',
      severity: record.severity,
      action_taken: record.action_taken || '',
      resolved: record.resolved,
    });
    setIsFormDialogOpen(true);
  };

  const handleSave = async () => {
    if (!student || !formData.incident_date || !formData.incident_type) return;

    if (selectedRecord) {
      await updateRecord.mutateAsync({
        id: selectedRecord.id,
        studentId: student.id,
        data: formData,
      });
    } else {
      await createRecord.mutateAsync({
        student_id: student.id,
        organization_id: student.organization_id,
        school_id: student.school_id,
        incident_date: formData.incident_date,
        incident_type: formData.incident_type,
        description: formData.description || null,
        severity: formData.severity || 'minor',
        action_taken: formData.action_taken || null,
        resolved: formData.resolved || false,
      });
    }

    setIsFormDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedRecord || !student) return;

    await deleteRecord.mutateAsync({
      id: selectedRecord.id,
      studentId: student.id,
    });

    setIsDeleteDialogOpen(false);
    setSelectedRecord(null);
  };

  const handleResolve = async (record: StudentDisciplineRecord) => {
    if (!student) return;

    await resolveRecord.mutateAsync({
      id: record.id,
      studentId: student.id,
    });
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('students.disciplineRecords') || 'Discipline Records'}
            </DialogTitle>
            <DialogDescription>
              {t('students.disciplineRecordsDescription') || 'View and manage discipline records for'} {student.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                {t('students.addDisciplineRecord') || 'Add Record'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : records && records.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('students.incidentDate') || 'Date'}</TableHead>
                    <TableHead>{t('students.incidentType') || 'Type'}</TableHead>
                    <TableHead>{t('students.severity') || 'Severity'}</TableHead>
                    <TableHead>{t('students.status') || 'Status'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.incident_date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell className="font-medium">{record.incident_type}</TableCell>
                      <TableCell>
                        <Badge className={severityColors[record.severity]}>
                          {t(`students.severity${record.severity.charAt(0).toUpperCase() + record.severity.slice(1)}`) || record.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.resolved ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {t('students.resolved') || 'Resolved'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {t('students.pending') || 'Pending'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!record.resolved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResolve(record)}
                              title={t('students.markResolved') || 'Mark Resolved'}
                              disabled={resolveRecord.isPending}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
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
                {t('students.noDisciplineRecords') || 'No discipline records'}
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
                ? t('students.editDisciplineRecord') || 'Edit Discipline Record'
                : t('students.addDisciplineRecord') || 'Add Discipline Record'}
            </DialogTitle>
            <DialogDescription>
              {t('students.disciplineRecordFormDescription') || 'Enter the discipline record details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="incident_date">{t('students.incidentDate') || 'Incident Date'} *</Label>
                <Input
                  id="incident_date"
                  type="date"
                  value={formData.incident_date || ''}
                  onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="incident_type">{t('students.incidentType') || 'Incident Type'} *</Label>
                <Input
                  id="incident_type"
                  value={formData.incident_type || ''}
                  onChange={(e) => setFormData({ ...formData, incident_type: e.target.value })}
                  placeholder={t('students.incidentTypePlaceholder') || 'e.g., Tardiness, Fighting'}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="severity">{t('students.severity') || 'Severity'}</Label>
              <Select
                value={formData.severity || 'minor'}
                onValueChange={(value) => setFormData({ ...formData, severity: value as DisciplineSeverity })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">{t('students.severityMinor') || 'Minor'}</SelectItem>
                  <SelectItem value="moderate">{t('students.severityModerate') || 'Moderate'}</SelectItem>
                  <SelectItem value="major">{t('students.severityMajor') || 'Major'}</SelectItem>
                  <SelectItem value="severe">{t('students.severitySevere') || 'Severe'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">{t('students.description') || 'Description'}</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('students.disciplineDescriptionPlaceholder') || 'Describe the incident'}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="action_taken">{t('students.actionTaken') || 'Action Taken'}</Label>
              <Textarea
                id="action_taken"
                value={formData.action_taken || ''}
                onChange={(e) => setFormData({ ...formData, action_taken: e.target.value })}
                placeholder={t('students.actionTakenPlaceholder') || 'What action was taken'}
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
              disabled={!formData.incident_date || !formData.incident_type || createRecord.isPending || updateRecord.isPending}
            >
              {createRecord.isPending || updateRecord.isPending
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
            <AlertDialogTitle>{t('students.deleteDisciplineRecord') || 'Delete Discipline Record'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteDisciplineConfirm') || 'Are you sure you want to delete this discipline record? This action cannot be undone.'}
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

export default StudentDisciplineRecordsDialog;

