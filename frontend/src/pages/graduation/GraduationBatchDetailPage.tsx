import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGraduationBatch, useGenerateGraduationStudents, useApproveGraduationBatch, useIssueGraduationCertificates, useCertificateTemplatesV2 } from '@/hooks/useGraduation';
import { useLanguage } from '@/hooks/useLanguage';

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

  const studentCount = batch?.students?.length || 0;
  const passCount = useMemo(
    () => (batch?.students || []).filter((s: any) => s.final_result_status === 'pass').length,
    [batch?.students]
  );

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
            <p className="font-semibold">{batch.exam?.name || batch.exam_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('common.statusLabel')}</p>
            <p className="font-semibold capitalize">{batch.status}</p>
          </div>
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
        <CardHeader>
          <CardTitle>{t('nav.students') ?? 'Students'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>{t('common.statusLabel')}</TableHead>
                <TableHead>{t('common.notes') ?? 'Notes'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(batch.students || []).map((student: any) => (
                <TableRow key={student.id}>
                  <TableCell>{student.student?.full_name || student.student_id}</TableCell>
                  <TableCell className="capitalize">{student.final_result_status}</TableCell>
                  <TableCell>{student.eligibility_json?.issues?.length ? student.eligibility_json.issues.map((iss: any) => iss.type).join(', ') : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
