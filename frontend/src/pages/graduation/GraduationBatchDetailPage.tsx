import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGraduationBatch, useGenerateGraduationStudents, useApproveGraduationBatch, useIssueGraduationCertificates, useCertificateTemplatesV2 } from '@/hooks/useGraduation';
import { useBulkDeactivateAdmissionsByStudentIds } from '@/hooks/useStudentAdmissions';
import { useLanguage } from '@/hooks/useLanguage';
import { X, RefreshCw, CheckCircle2, FileText, Users, TrendingUp, XCircle, ArrowLeft, Hash, Info } from 'lucide-react';
import { BatchWorkflowStepper } from '@/components/graduation/BatchWorkflowStepper';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function GraduationBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data, isLoading } = useGraduationBatch(id);
  const batch = data?.batch ?? data;
  const auditLogs = data?.audit_logs ?? [];
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);

  // Load templates for the batch's school
  // Backend returns templates with matching school_id OR null school_id (general templates)
  const templates = useCertificateTemplatesV2(
    batch?.school_id
      ? {
          school_id: batch.school_id, // Backend handles this - returns school-specific + general templates
          type: 'graduation',
        }
      : { type: 'graduation' } // If no school_id yet, just get all graduation templates
  );

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
  
  // Certificate number configuration dialog
  const [isCertificateConfigDialogOpen, setIsCertificateConfigDialogOpen] = useState(false);
  const [startingNumber, setStartingNumber] = useState<number | undefined>(undefined);
  const [prefix, setPrefix] = useState<string>('NZM');
  const [certificateType, setCertificateType] = useState<string>('GRADUATION');
  const [padding, setPadding] = useState<number>(4);

  const studentCount = batch?.students?.length || 0;
  const passCount = useMemo(
    () => (batch?.students || []).filter((s: any) => s.final_result_status === 'pass').length,
    [batch?.students]
  );
  const failCount = studentCount - passCount;
  const passRate = studentCount > 0 ? Math.round((passCount / studentCount) * 100) : 0;
  const hasPassedStudents = passCount > 0;

  const selectedCount = selectedStudentIds.size;
  const canBulkDeactivate = selectedCount > 0 && batch?.status === 'draft';

  // Calculate preview certificate numbers - MUST be before any early returns
  const previewNumbers = useMemo(() => {
    if (!passCount || !batch?.graduation_date) return [];
    const year = new Date(batch.graduation_date).getFullYear();
    const typePart = certificateType || 'GRADUATION';
    const start = startingNumber || 1;
    const pad = padding || 4;
    const pref = prefix || 'NZM';
    
    const numbers: string[] = [];
    for (let i = 0; i < Math.min(passCount, 5); i++) {
      const num = start + i;
      numbers.push(`${pref}-${typePart}-${year}-${String(num).padStart(pad, '0')}`);
    }
    if (passCount > 5) {
      numbers.push('...');
      const lastNum = start + passCount - 1;
      numbers.push(`${pref}-${typePart}-${year}-${String(lastNum).padStart(pad, '0')}`);
    }
    return numbers;
  }, [passCount, batch?.graduation_date, startingNumber, prefix, certificateType, padding]);

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

  const handleIssueClick = () => {
    if (!templateId) return;
    setIsCertificateConfigDialogOpen(true);
  };

  const handleIssue = async () => {
    if (!templateId) return;
    setIsCertificateConfigDialogOpen(false);
    await issueCertificates.mutateAsync({ 
      batchId: id, 
      templateId, 
      schoolId: batch.school_id,
      startingNumber: startingNumber || undefined,
      prefix: prefix || undefined,
      certificateType: certificateType || undefined,
      padding: padding || undefined,
    });
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
      {/* Header with Actions */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/graduation/batches')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back') || 'Back'}
            </Button>
            <h1 className="text-3xl font-bold">{batch.class?.name || batch.class_id || 'Batch'}</h1>
            <Badge variant={batch.status === 'draft' ? 'secondary' : batch.status === 'approved' ? 'default' : 'outline'}>
              {batch.status === 'draft'
                ? t('graduation.status.draft') || 'Draft'
                : batch.status === 'approved'
                  ? t('graduation.status.approved') || 'Approved'
                  : t('graduation.status.issued') || 'Issued'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {batch.academic_year?.name || batch.academic_year_id} •{' '}
            {batch.graduation_date ? formatDate(batch.graduation_date) : 'No date set'}
          </p>
        </div>
        <div className="flex gap-2">
          {batch.status === 'draft' && (
            <>
              <Button onClick={handleGenerate} disabled={generateStudents.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Students
              </Button>
              <Button onClick={handleApprove} disabled={approveBatch.isPending}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Batch
              </Button>
            </>
          )}
          {batch.status === 'approved' && (
            <Button 
              onClick={handleIssue} 
              disabled={!templateId || issueCertificates.isPending || !hasPassedStudents}
              title={!hasPassedStudents ? 'No students with pass status' : !templateId ? 'Please select a template' : ''}
            >
              <FileText className="h-4 w-4 mr-2" />
              Issue Certificates
            </Button>
          )}
        </div>
      </div>

      {/* Workflow Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchWorkflowStepper batch={batch} />
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{studentCount}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Passed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{passCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-500">{failCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">{passRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for organized content */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList>
          <TabsTrigger value="students">
            {t('nav.students') ?? 'Students'} ({studentCount})
          </TabsTrigger>
          <TabsTrigger value="exams">
            {t('nav.exams')} ({batch.exams?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="space-y-4">
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
                      <TableCell>
                        <Badge
                          variant={
                            student.final_result_status === 'pass'
                              ? 'default'
                              : student.final_result_status === 'fail'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {student.final_result_status || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{student.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('nav.exams')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batch.exams && Array.isArray(batch.exams) && batch.exams.length > 0 ? (
                  batch.exams.map((exam: any, idx: number) => {
                    const examId = exam.exam_id || exam.id;
                    const examName = exam.exam?.name || exam.name || examId;
                    const weight = exam.pivot?.weight_percentage;
                    const hasWeight = weight !== null && weight !== undefined && batch.exams.length > 1;
                    return (
                      <div key={examId || idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{examName}</p>
                          {hasWeight && (
                            <p className="text-sm text-muted-foreground">Weight: {parseFloat(weight).toFixed(0)}%</p>
                          )}
                        </div>
                        <Badge variant="outline">{examName}</Badge>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground">{batch.exam?.name || batch.exam_id || 'No exams'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Settings</CardTitle>
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
                <div className="flex flex-wrap gap-2">
                  {batch.exams.map((exam: any, idx: number) => {
                    const examId = exam.exam_id || exam.id;
                    const examName = exam.exam?.name || exam.name || examId;
                    const weight = exam.pivot?.weight_percentage;
                    const hasWeight = weight !== null && weight !== undefined && batch.exams.length > 1;
                    return (
                      <Badge key={examId || idx} variant="outline" className="text-sm">
                        {examName}
                        {hasWeight && ` (${parseFloat(weight).toFixed(0)}%)`}
                      </Badge>
                    );
                  })}
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
            <p className="font-semibold">{batch.graduation_date ? formatDate(batch.graduation_date) : '—'}</p>
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
          {(batch.require_attendance !== undefined || batch.min_attendance_percentage !== undefined) && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{t('graduation.attendance.requireAttendance') || 'Require Attendance'}</p>
                <p className="font-semibold">{batch.require_attendance ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</p>
              </div>
              {batch.require_attendance && batch.min_attendance_percentage !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('graduation.attendance.minPercentage') || 'Minimum Attendance %'}</p>
                  <p className="font-semibold">{batch.min_attendance_percentage}%</p>
                </div>
              )}
              {batch.require_attendance && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('graduation.attendance.excludeLeaves') || 'Exclude Approved Leaves'}</p>
                  <p className="font-semibold">{batch.exclude_approved_leaves ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}</p>
                </div>
              )}
            </>
          )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('common.auditLog') || 'History'}</CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs && auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{log.action || 'Action'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.created_at ? formatDateTime(log.created_at) : '—'}
                        </p>
                        {log.description && (
                          <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No history available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('certificates.templates') ?? 'Certificate Template'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-select">{t('certificates.selectTemplate') ?? 'Select Template'}</Label>
              <Select value={templateId || ''} onValueChange={(val) => setTemplateId(val || undefined)}>
                <SelectTrigger id="template-select" className="w-full mt-2">
                  <SelectValue placeholder={t('certificates.templates') ?? 'Select a template'} />
                </SelectTrigger>
                <SelectContent>
                  {templates.isLoading ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading templates...</div>
                  ) : (templates.data || []).length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No templates available</div>
                  ) : (
                    (templates.data || []).map((tpl: any) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.title || tpl.name || 'Untitled Template'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!templateId && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t('certificates.templateRequired') ?? 'Please select a template before issuing certificates'}
                </p>
              )}
            </div>
            {templateId && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {templates.data?.find((t: any) => t.id === templateId)?.title || 
                   templates.data?.find((t: any) => t.id === templateId)?.name || 
                   'Selected template'}
                </p>
                {templates.data?.find((t: any) => t.id === templateId)?.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {templates.data.find((t: any) => t.id === templateId)?.description}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Issue Certificates Card - Always visible */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('certificates.issued') ?? 'Issue Certificates'}</CardTitle>
          <Button
            onClick={handleIssueClick}
            disabled={!templateId || issueCertificates.isPending || batch.status !== 'approved' || !hasPassedStudents}
            title={
              batch.status !== 'approved' 
                ? 'Batch must be approved first' 
                : !hasPassedStudents 
                  ? 'No students with pass status' 
                  : !templateId 
                    ? 'Please select a template' 
                    : ''
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('certificates.issued') ?? 'Issue Certificates'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('common.total') ?? 'Total Students'}</p>
              <p className="text-2xl font-bold">{studentCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('common.pass') ?? 'Passed'}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">{passCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('common.fail') ?? 'Failed'}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">{failCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('common.passRate') ?? 'Pass Rate'}</p>
              <p className="text-2xl font-bold">{passRate}%</p>
            </div>
          </div>
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

      {/* Certificate Number Configuration Dialog */}
      <Dialog open={isCertificateConfigDialogOpen} onOpenChange={setIsCertificateConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Certificate Number Configuration
            </DialogTitle>
            <DialogDescription>
              Configure how certificate numbers will be generated for {passCount} passing student(s)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">For Schools with Existing Certificates</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    If your school has already issued certificates and you want to continue numbering, 
                    enter the next number in the "Starting Number" field. For example, if your last certificate 
                    was number 150, enter 151 as the starting number.
                  </p>
                </div>
              </div>
            </div>

            {/* Starting Number */}
            <div className="space-y-2">
              <Label htmlFor="starting-number">
                Starting Number <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="starting-number"
                type="number"
                min="1"
                placeholder="Leave empty to auto-generate from 1"
                value={startingNumber || ''}
                onChange={(e) => setStartingNumber(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              />
              <p className="text-xs text-muted-foreground">
                The sequence number to start from. If empty, will continue from the last issued certificate number.
              </p>
            </div>

            {/* Prefix */}
            <div className="space-y-2">
              <Label htmlFor="prefix">
                Prefix <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="prefix"
                type="text"
                maxLength={20}
                placeholder="NZM"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Prefix for certificate numbers (e.g., "NZM", "SCH", "CERT"). Default: "NZM"
              </p>
            </div>

            {/* Certificate Type/Code */}
            <div className="space-y-2">
              <Label htmlFor="certificate-type">
                Certificate Type/Code <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="certificate-type"
                type="text"
                maxLength={50}
                placeholder="GRADUATION"
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
              />
              <p className="text-xs text-muted-foreground">
                Certificate type or code (e.g., "GRADUATION", "DIPLOMA", "CERT"). This appears in the certificate number. Default: "GRADUATION"
              </p>
            </div>

            {/* Padding */}
            <div className="space-y-2">
              <Label htmlFor="padding">
                Number Padding <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="padding"
                type="number"
                min="1"
                max="10"
                placeholder="4"
                value={padding}
                onChange={(e) => setPadding(parseInt(e.target.value, 10) || 4)}
              />
              <p className="text-xs text-muted-foreground">
                Number of digits for the sequence (e.g., 4 = 0001, 5 = 00001). Default: 4
              </p>
            </div>

            {/* Preview */}
            {previewNumbers.length > 0 && (
              <div className="space-y-2">
                <Label>Preview Certificate Numbers</Label>
                <div className="bg-muted rounded-lg p-4 space-y-1">
                  {previewNumbers.map((num, idx) => (
                    <p key={idx} className="text-sm font-mono text-muted-foreground">
                      {num}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Format: {prefix || 'NZM'}-{certificateType || 'GRADUATION'}-{batch?.graduation_date ? new Date(batch.graduation_date).getFullYear() : 'YYYY'}-{'[SEQUENCE]'}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCertificateConfigDialogOpen(false)}
              disabled={issueCertificates.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleIssue}
              disabled={issueCertificates.isPending}
            >
              {issueCertificates.isPending ? 'Issuing...' : 'Issue Certificates'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
