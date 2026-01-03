import { 
  Eye, 
  MoreHorizontal, 
  Download, 
  Ban, 
  ExternalLink, 
  Award,
  User,
  Calendar,
  FileText,
  School,
  GraduationCap,
  Hash,
  Shield,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { GraduationCertificatePdfGenerator } from '@/components/graduation/GraduationCertificatePdfGenerator';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useIssuedCertificates, useRevokeCertificate } from '@/hooks/useGraduation';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { issuedCertificatesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function IssuedCertificatesPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: schools = [] } = useSchools();
  const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
  const [batchId, setBatchId] = useState<string | undefined>(undefined);
  const [studentId, setStudentId] = useState<string | undefined>(undefined);
  const [previewCertificateId, setPreviewCertificateId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Revoke dialog state
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeCertificateId, setRevokeCertificateId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSchoolId, setRevokeSchoolId] = useState<string>('');
  
  // Side panel state
  const [selectedCertificate, setSelectedCertificate] = useState<any | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // Auto-select school if there's only one, or use profile's default_school_id
  useEffect(() => {
    if (schools.length === 1 && !schoolId) {
      // Auto-select if only one school
      setSchoolId(schools[0].id);
    } else if (profile?.default_school_id && !schoolId) {
      // Use default school from profile if available
      setSchoolId(profile.default_school_id);
    }
  }, [schools, profile?.default_school_id, schoolId]);

  const { data: certificates = [], isLoading } = useIssuedCertificates({
    school_id: schoolId,
    batch_id: batchId,
    student_id: studentId,
  });

  const revoke = useRevokeCertificate();

  const handleDownload = async (id: string) => {
    try {
      // Get the certificate to find its school_id
      const certificate = certificates.find((c: any) => c.id === id);
      const certSchoolId = certificate?.school_id;
      
      // Determine which school_id to use (priority: certificate's school > filter > default > auto)
      const schoolIdToUse = certSchoolId 
        || schoolId // Use selected school from filter
        || profile?.default_school_id
        || (schools.length === 1 ? schools[0].id : undefined);
      
      const file = await issuedCertificatesApi.downloadPdf(id, schoolIdToUse);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.filename || 'certificate.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      // If error indicates school selection needed, show better message
      if (error.message?.includes('school') || error.message?.includes('No default')) {
        if (schools.length > 1) {
          showToast.error('Please select a school from the filter dropdown above, or contact administrator to set a default school.');
        } else {
          showToast.error('Please contact administrator to set a default school for your account.');
        }
      } else {
        showToast.error(error.message || 'Failed to download certificate');
      }
    }
  };

  const handleRevoke = (id: string) => {
    const certificate = certificates.find((c: any) => c.id === id);
    const certSchoolId = certificate?.school_id;
    
    // Determine which school_id to use (priority: certificate's school > filter > default > auto)
    const schoolIdToUse = certSchoolId 
      || schoolId // Use selected school from filter
      || profile?.default_school_id
      || (schools.length === 1 ? schools[0].id : '');
    
    // Set initial school selection
    setRevokeSchoolId(schoolIdToUse || '');
    setRevokeCertificateId(id);
    setRevokeReason('');
    setRevokeDialogOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!revokeCertificateId || !revokeReason.trim()) {
      showToast.error('Please enter a revoke reason');
      return;
    }
    
    // If multiple schools and none selected, require selection
    if (schools.length > 1 && !revokeSchoolId) {
      showToast.error('Please select a school');
      return;
    }
    
    try {
      await revoke.mutateAsync({ 
        id: revokeCertificateId, 
        reason: revokeReason.trim(),
        school_id: revokeSchoolId || undefined, // Backend will auto-select if not provided
      });
      setRevokeDialogOpen(false);
      setRevokeCertificateId(null);
      setRevokeReason('');
      setRevokeSchoolId('');
    } catch (error: any) {
      // Error is already handled by the mutation's onError
      // If it's a school selection error, the backend will return a clear message
    }
  };

  const handlePreview = (certId: string) => {
    // Get the certificate to find its school_id
    const certificate = certificates.find((c: any) => c.id === certId);
    const certSchoolId = certificate?.school_id;
    
    // Determine which school_id to use (priority: certificate's school > filter > default > auto)
    const schoolIdToUse = certSchoolId 
      || schoolId // Use selected school from filter
      || profile?.default_school_id
      || (schools.length === 1 ? schools[0].id : undefined);
    
    setPreviewCertificateId(certId);
    setIsPreviewOpen(true);
    // Note: schoolId state is already set, and GraduationCertificatePdfGenerator will use it
    // The backend will auto-select from certificate if schoolId is not provided
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewCertificateId(null);
  };

  const handleRowClick = (cert: any) => {
    setSelectedCertificate(cert);
    setIsSidePanelOpen(true);
  };

  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedCertificate(null);
  };

  // Report export columns
  const reportColumns = useMemo(() => [
    { key: 'certificate_no', label: 'Certificate No' },
    { key: 'student_name', label: t('students.name') || 'Student' },
    { key: 'student_id', label: t('students.studentId') || 'Student ID' },
    { key: 'batch_graduation_date', label: t('common.graduationDate') || 'Graduation Date' },
    { key: 'batch_class', label: t('fees.class') || 'Class' },
    { key: 'issued_at', label: 'Issued At' },
    { key: 'status', label: t('common.statusLabel') || 'Status' },
    { key: 'revoked_at', label: 'Revoked At' },
    { key: 'revoke_reason', label: 'Revoke Reason' },
  ], [t]);

  // Transform data for report
  const transformCertificateData = useCallback((certs: typeof certificates) => {
    return certs.map((cert: any) => ({
      certificate_no: cert.certificate_no || '-',
      student_name: cert.student?.full_name || cert.student_id || '-',
      student_id: cert.student_id || '-',
      batch_graduation_date: cert.batch?.graduation_date ? formatDate(cert.batch.graduation_date) : '-',
      batch_class: cert.batch?.class_id || '-',
      issued_at: cert.issued_at ? formatDateTime(cert.issued_at) : '-',
      status: cert.revoked_at
        ? 'Revoked'
        : 'Valid',
      revoked_at: cert.revoked_at ? formatDateTime(cert.revoked_at) : '-',
      revoke_reason: cert.revoke_reason || '-',
    }));
  }, []);

  // Build filters summary
  const buildFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (schoolId) {
      const school = schools.find(s => s.id === schoolId);
      if (school) filters.push(`${t('common.schoolManagement') || 'School'}: ${school.schoolName}`);
    }
    if (batchId) {
      filters.push(`Batch ID: ${batchId}`);
    }
    if (studentId) {
      filters.push(`Student ID: ${studentId}`);
    }
    return filters.join(', ');
  }, [schoolId, batchId, studentId, schools, t]);


  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title={t('certificates.issued') ?? 'Issued Certificates'}
        icon={<Award className="h-5 w-5" />}
        rightSlot={
          <ReportExportButtons
            data={certificates}
            columns={reportColumns}
            reportKey="graduation_issued_certificates"
            title={t('certificates.issued') || 'Issued Certificates Report'}
            transformData={transformCertificateData}
            buildFiltersSummary={buildFiltersSummary}
            schoolId={schoolId}
            templateType="graduation_certificates"
            disabled={isLoading || certificates.length === 0}
          />
        }
      />

      <FilterPanel title={t('common.filters') || 'Search & Filter'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{t('common.schoolManagement')}</Label>
            <Select value={schoolId || ''} onValueChange={(val) => setSchoolId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectSchool')} />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.schoolName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('nav.graduation.batches')}</Label>
            <Input value={batchId || ''} onChange={(e) => setBatchId(e.target.value || undefined)} placeholder={t('common.autoGenerated')} />
          </div>
          <div>
            <Label>{t('students.name') ?? 'Student ID'}</Label>
            <Input value={studentId || ''} onChange={(e) => setStudentId(e.target.value || undefined)} placeholder="Student ID" />
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{t('certificates.issued') ?? 'Issued Certificates'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('common.noData') || 'No certificates found'}</p>
              <p className="text-xs mt-2">
                {t('certificates.noIssuedCertificates') || 'No certificates have been issued yet, or you may not have permission to view them.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate No</TableHead>
                  <TableHead>{t('students.name') ?? 'Student'}</TableHead>
                  <TableHead>{t('common.statusLabel')}</TableHead>
                  <TableHead>Issued At</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert: any) => (
                  <TableRow 
                    key={cert.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(cert)}
                  >
                    <TableCell className="font-medium">{cert.certificate_no}</TableCell>
                    <TableCell>{cert.student?.full_name || cert.student_id}</TableCell>
                    <TableCell>
                      {cert.revoked_at ? (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Revoked
                        </Badge>
                      ) : (
                        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3" />
                          Valid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(cert.issued_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handlePreview(cert.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t('common.preview') || 'Preview'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownload(cert.id)}>
                            <Download className="mr-2 h-4 w-4" />
                            {t('common.download') || 'Download PDF'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a 
                              href={`/verify/certificate/${cert.verification_hash}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {t('common.verify') || 'Verify Certificate'}
                            </a>
                          </DropdownMenuItem>
                          {!cert.revoked_at && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRevoke(cert.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                {t('certificates.revoke') || 'Revoke Certificate'}
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

      {/* Certificate Preview Dialog */}
      {previewCertificateId && (
        <GraduationCertificatePdfGenerator
          certificateId={previewCertificateId}
          schoolId={schoolId}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
        />
      )}

      {/* Revoke Certificate Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {schools.length > 1 && !revokeSchoolId && (
              <div className="space-y-2">
                <Label htmlFor="revoke-school">Select School *</Label>
                <Select value={revokeSchoolId} onValueChange={setRevokeSchoolId}>
                  <SelectTrigger id="revoke-school">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Please select the school for this certificate
                </p>
              </div>
            )}
            {revokeSchoolId && schools.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="revoke-school">School</Label>
                <Select value={revokeSchoolId} onValueChange={setRevokeSchoolId}>
                  <SelectTrigger id="revoke-school">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  School automatically selected from certificate. You can change it if needed.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="revoke-reason">Revoke Reason *</Label>
              <Textarea
                id="revoke-reason"
                placeholder="Enter the reason for revoking this certificate..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRevoke}
              disabled={!revokeReason.trim() || (schools.length > 1 && !revokeSchoolId)}
            >
              Revoke Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certificate Details Side Panel */}
      <Sheet open={isSidePanelOpen} onOpenChange={setIsSidePanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedCertificate && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificate Details
                </SheetTitle>
                <SheetDescription>
                  {selectedCertificate.certificate_no}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                    {selectedCertificate.revoked_at ? (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Revoked
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid
                      </Badge>
                    )}
                  </div>
                  {selectedCertificate.revoked_at && selectedCertificate.revoke_reason && (
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Revoke Reason</p>
                      <p className="text-sm text-destructive">{selectedCertificate.revoke_reason}</p>
                    </div>
                  )}
                </div>

                {/* Certificate Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Certificate Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Hash className="h-4 w-4" />
                        Certificate Number
                      </p>
                      <p className="text-base font-semibold">{selectedCertificate.certificate_no}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Issued Date
                      </p>
                      <p className="text-base">{formatDateTime(selectedCertificate.issued_at)}</p>
                    </div>
                    {selectedCertificate.revoked_at && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Revoked Date</p>
                        <p className="text-base text-destructive">{formatDateTime(selectedCertificate.revoked_at)}</p>
                      </div>
                    )}
                    {selectedCertificate.verification_hash && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          Verification Hash
                        </p>
                        <p className="text-xs font-mono break-all text-muted-foreground">
                          {selectedCertificate.verification_hash}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Student Information */}
                {selectedCertificate.student && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Student Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Student Name</p>
                        <p className="text-base font-semibold">{selectedCertificate.student.full_name || 'N/A'}</p>
                      </div>
                      {selectedCertificate.student.father_name && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Father Name</p>
                          <p className="text-base">{selectedCertificate.student.father_name}</p>
                        </div>
                      )}
                      {selectedCertificate.student_id && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Student ID</p>
                          <p className="text-base">{selectedCertificate.student_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Batch Information */}
                {selectedCertificate.batch && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Batch Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedCertificate.batch.graduation_date && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Graduation Date</p>
                          <p className="text-base">{formatDate(selectedCertificate.batch.graduation_date)}</p>
                        </div>
                      )}
                      {selectedCertificate.batch.class_id && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Class</p>
                          <p className="text-base">{selectedCertificate.batch.class_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* School Information */}
                {selectedCertificate.school && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <School className="h-5 w-5" />
                      School Information
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">School Name</p>
                      <p className="text-base font-semibold">{selectedCertificate.school.school_name || 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handlePreview(selectedCertificate.id);
                        handleCloseSidePanel();
                      }}
                      className="w-full"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleDownload(selectedCertificate.id);
                        handleCloseSidePanel();
                      }}
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      asChild
                      className="w-full"
                    >
                      <a 
                        href={`/verify/certificate/${selectedCertificate.verification_hash}`} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Verify
                      </a>
                    </Button>
                    {!selectedCertificate.revoked_at && (
                      <Button
                        variant="destructive"
                        onClick={() => {
                          handleRevoke(selectedCertificate.id);
                          handleCloseSidePanel();
                        }}
                        className="w-full"
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
