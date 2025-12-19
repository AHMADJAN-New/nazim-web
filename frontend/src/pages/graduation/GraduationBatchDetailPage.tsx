import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGraduationBatch, useGenerateGraduationStudents, useApproveGraduationBatch, useIssueGraduationCertificates, useCertificateTemplatesV2 } from '@/hooks/useGraduation';
import { useBulkDeactivateAdmissionsByStudentIds } from '@/hooks/useStudentAdmissions';
import { useLanguage } from '@/hooks/useLanguage';
import { X } from 'lucide-react';

export default function GraduationBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { data, isLoading } = useGraduationBatch(id);
  const batch = data?.batch ?? data;
  const auditLogs = data?.audit_logs ?? [];
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);

  const templates = useCertificateTemplatesV2({
    school_id: batch?.school_id,
    type: 'graduation',
  });

  const generateStudents = useGenerateGraduationStudents();
  const approveBatch = useApproveGraduationBatch();
  const issueCertificates = useIssueGraduationCertificates();
  const bulkDeactivate = useBulkDeactivateAdmissionsByStudentIds();

  // Auto-select template based on school_id when templates load
  useEffect(() => {
    if (templates.data && templates.data.length > 0 && batch?.school_id && !templateId) {
      // Find template assigned to this school
      const schoolTemplate = templates.data.find((t: any) => t.school_id === batch.school_id);
      if (schoolTemplate) {
        setTemplateId(schoolTemplate.id);
      } else {
        // If no school-specific template, use first active template
        const activeTemplate = templates.data.find((t: any) => t.is_active);
        if (activeTemplate) {
          setTemplateId(activeTemplate.id);
        }
      }
    }
  }, [templates.data, batch?.school_id, templateId]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkDeactivateDialogOpen, setIsBulkDeactivateDialogOpen] = useState(false);

  const studentCount = batch?.students?.length || 0;
  const passCount = useMemo(
    () => (batch?.students || []).filter((s: any) => s.final_result_status === 'pass').length,
    [batch?.students]
  );

  const selectedCount = selectedStudentIds.size;
  const canBulkDeactivate = selectedCount > 0 && batch?.status === 'draft';

  if (!id) return null;

  if (isLoading) {
    return <p className="p-4">{t('common.loading')}</p>;
  }

  if (!batch) {
    return <p className="p-4">{t('common.notFound') ?? 'Batch not found'}</p>;
  }

  const handleGenerate = async () => {
    await generateStudents.mutateAsync({ batchId: id, schoolId: batch.school_id });
  };

  const handleApprove = async () => {
    await approveBatch.mutateAsync({ batchId: id, schoolId: batch.school_id });
  };

  const handleIssue = async () => {
    if (!templateId) return;
    await issueCertificates.mutateAsync({ batchId: id, templateId, schoolId: batch.school_id });
  };

  const handleBulkDeactivate = async () => {
    if (selectedStudentIds.size === 0 || !batch?.class_id || !batch?.academic_year_id) return;
    
    const studentIds = Array.from(selectedStudentIds);
    await bulkDeactivate.mutateAsync({
      student_ids: studentIds,
      class_id: batch.class_id,
      academic_year_id: batch.academic_year_id,
    }, {
      onSuccess: () => {
        setSelectedStudentIds(new Set());
        setIsBulkDeactivateDialogOpen(false);
      },
    });
  };

  const handleSelectAll = () => {
    if (!batch?.students) return;
    if (selectedStudentIds.size === batch.students.length) {
      setSelectedStudentIds(new Set());
    } else {
      const allIds = new Set(batch.students.map((s: any) => s.student_id));
      setSelectedStudentIds(allIds);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentIds(newSet);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('nav.graduation.batches')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('fees.academicYear')}</p>
            <p className="font-semibold">{batch.academic_year?.name || batch.academic_year_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('fees.class')}</p>
            <p className="font-semibold">{batch.class?.name || batch.class_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('nav.exams')}</p>
            <div className="font-semibold">
              {batch.exams && Array.isArray(batch.exams) && batch.exams.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {batch.exams.map((exam: any, idx: number) => (
                    <span key={exam.exam_id || exam.id || idx}>
                      {exam.exam?.name || exam.name || exam.exam_id || exam.id}
                      {idx < batch.exams.length - 1 && ', '}
                    </span>
                  ))}
                </div>
              ) : (
                batch.exam?.name || batch.exam_id || '-'
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('common.statusLabel')}</p>
            <p className="font-semibold capitalize">{batch.status}</p>
          </div>
          {batch.graduation_type && (
            <div>
              <p className="text-sm text-muted-foreground">{t('graduation.graduationType') || 'Type'}</p>
              <p className="font-semibold capitalize">
                {batch.graduation_type === 'transfer' ? (t('graduation.type.transfer') || 'Transfer') :
                 batch.graduation_type === 'promotion' ? (t('graduation.type.promotion') || 'Promotion') :
                 (t('graduation.type.finalYear') || 'Final Year')}
              </p>
            </div>
          )}
          {/* Class Transfer Information - Show prominently if exists */}
          {(batch.from_class_id || batch.to_class_id) && (
            <div className="md:col-span-3">
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  {t('graduation.classTransfer') || 'Class Transfer Information'}
                </p>
                <div className="flex items-center gap-2 text-base">
                  {batch.graduation_type === 'transfer' && batch.from_class_id && batch.to_class_id ? (
                    <>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.from_class?.name || batch.from_class_id}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">→</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.to_class?.name || batch.to_class_id}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {t('graduation.type.transfer') || 'Transfer'}
                      </Badge>
                    </>
                  ) : batch.graduation_type === 'promotion' && batch.to_class_id ? (
                    <>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.class?.name || batch.class_id}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">→</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.to_class?.name || batch.to_class_id}
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {t('graduation.type.promotion') || 'Promotion'}
                      </Badge>
                    </>
                  ) : batch.from_class_id && batch.to_class_id ? (
                    <>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.from_class?.name || batch.from_class_id}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">→</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.to_class?.name || batch.to_class_id}
                      </span>
                    </>
                  ) : batch.to_class_id ? (
                    <>
                      <span className="text-muted-foreground">{t('graduation.transferringTo') || 'Transferring to'}:</span>
                      <span className="font-semibold text-blue-800 dark:text-blue-200">
                        {batch.to_class?.name || batch.to_class_id}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">{t('common.graduationDate')}</p>
            <p className="font-semibold">{batch.graduation_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('common.actions')}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generateStudents.isPending || batch.status !== 'draft'}>
                {t('common.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleApprove} disabled={approveBatch.isPending || batch.status !== 'draft'}>
                {t('common.approve') ?? 'Approve'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('certificates.issued') ?? 'Issue Certificates'}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={templateId || ''} onValueChange={(val) => setTemplateId(val || undefined)}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder={t('certificates.templates') ?? 'Select template'} />
              </SelectTrigger>
              <SelectContent>
                {(templates.data || []).map((tpl: any) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.title || tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleIssue}
              disabled={!templateId || issueCertificates.isPending || batch.status !== 'approved'}
            >
              {t('certificates.issued') ?? 'Issue'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('common.total') ?? 'Total'}</p>
            <p className="font-semibold">{studentCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('common.pass') ?? 'Pass'}</p>
            <p className="font-semibold">{passCount}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('nav.students') ?? 'Students'}</CardTitle>
          {canBulkDeactivate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeactivateDialogOpen(true)}
              disabled={bulkDeactivate.isPending}
            >
              <X className="w-4 h-4 mr-2" />
              {t('admissions.bulkDeactivate') || `Deactivate Admissions (${selectedCount})`}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={batch?.students && selectedStudentIds.size === batch.students.length && batch.students.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>{t('common.statusLabel')}</TableHead>
                <TableHead>{t('common.notes') ?? 'Notes'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batch.students || []).map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedStudentIds.has(student.student_id)}
                      onCheckedChange={() => handleToggleStudent(student.student_id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell>{student.student?.full_name || student.student_id}</TableCell>
                  <TableCell className="capitalize">{student.final_result_status}</TableCell>
                  <TableCell>{student.eligibility_json?.issues?.length ? student.eligibility_json.issues.map((iss: any) => iss.type).join(', ') : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isBulkDeactivateDialogOpen} onOpenChange={setIsBulkDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admissions.bulkDeactivateTitle') || 'Deactivate Student Admissions'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admissions.bulkDeactivateDescription') || 
                `Are you sure you want to deactivate admissions for ${selectedCount} selected student(s)? This will set their enrollment status to inactive in the admissions table.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeactivate.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeactivate}
              disabled={bulkDeactivate.isPending}
            >
              {bulkDeactivate.isPending 
                ? (t('common.processing') || 'Processing...') 
                : (t('admissions.deactivate') || 'Deactivate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.auditLog') ?? 'Recent Activity'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {auditLogs.map((log: any) => (
              <li key={log.id} className="flex justify-between border-b pb-1">
                <span className="capitalize">{log.action}</span>
                <span className="text-muted-foreground">{log.performed_at}</span>
              </li>
            ))}
            {auditLogs.length === 0 && <li>{t('common.noData') ?? 'No activity yet'}</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
