import { format } from 'date-fns';
import { Search, MoreHorizontal, Printer, Eye, FileText, Calendar, User } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { PaperPreview } from '@/components/examPapers/PaperPreview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Skeleton } from '@/components/ui/skeleton';
import type { ExamPaperTemplate } from '@/hooks/useExamPapers';
import { useExamPaperTemplates, useUpdatePrintStatus } from '@/hooks/useExamPapers';
import { useExams } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useSubjects } from '@/hooks/useSubjects';


type PrintStatus = 'not_printed' | 'printing' | 'printed' | 'cancelled';

const printStatusConfig: Record<PrintStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_printed: { label: 'Not Printed', variant: 'secondary' },
  printing: { label: 'Printing', variant: 'default' },
  printed: { label: 'Printed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

export default function ExamPaperPrintTracking() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;
  const userDefaultSchoolId = profile?.default_school_id;

  // Permissions
  const hasRead = useHasPermission('exams.papers.read');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(userDefaultSchoolId || undefined);
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();
  const [selectedPrintStatus, setSelectedPrintStatus] = useState<PrintStatus | 'all'>('all');

  // Dialog states
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ExamPaperTemplate | null>(null);
  const updatePrintStatus = useUpdatePrintStatus();

  // Data hooks
  const { data: schools } = useSchools(organizationId);
  const { data: subjects } = useSubjects(organizationId);
  const { data: exams } = useExams(organizationId);

  // Templates data
  const { data: templates, isLoading } = useExamPaperTemplates({
    schoolId: selectedSchoolId,
    examId: selectedExamId,
    subjectId: selectedSubjectId,
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(template => {
      if (searchQuery && !template.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedPrintStatus !== 'all' && (template.printStatus || 'not_printed') !== selectedPrintStatus) {
        return false;
      }
      return true;
    });
  }, [templates, searchQuery, selectedPrintStatus]);

  // Helper functions
  const getSubjectName = (subjectId: string) => {
    return subjects?.find(s => s.id === subjectId)?.name || subjectId;
  };

  const getExamName = (examId: string) => {
    return exams?.find(e => e.id === examId)?.name || examId;
  };

  const getSchoolName = (schoolId: string) => {
    return schools?.find(s => s.id === schoolId)?.schoolName || schoolId;
  };

  const openDetailsDialog = (template: ExamPaperTemplate) => {
    setSelectedTemplate(template);
    setIsDetailsDialogOpen(true);
  };

  if (!hasRead) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t('common.unauthorized') || 'You do not have permission to view this page.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('examPapers.printTracking') || 'Print Tracking'}</h1>
          <p className="text-sm text-muted-foreground">
            {t('examPapers.printTrackingDescription') || 'Track print status and copies printed for exam papers'}
          </p>
        </div>
        <div className="flex gap-2">
          {filteredTemplates && filteredTemplates.length > 0 && (
            <ReportExportButtons
              data={filteredTemplates}
              columns={[
                { key: 'title', label: t('examPapers.paperTitle') || 'Title' },
                { key: 'school', label: t('examPapers.school') || 'School' },
                { key: 'subject', label: t('examPapers.subject') || 'Subject' },
                { key: 'exam', label: t('examPapers.exam') || 'Exam' },
                { key: 'printStatus', label: t('examPapers.printStatus') || 'Print Status' },
                { key: 'copiesPrinted', label: t('examPapers.copiesPrinted') || 'Copies Printed' },
                { key: 'lastPrinted', label: t('examPapers.lastPrinted') || 'Last Printed' },
                { key: 'printedBy', label: t('examPapers.printedBy') || 'Printed By' },
              ]}
              reportKey="exam_paper_print_tracking"
              title={t('examPapers.printTracking') || 'Exam Paper Print Tracking'}
              transformData={(data) => data.map((template: ExamPaperTemplate) => ({
                title: template.title || '-',
                school: getSchoolName(template.schoolId),
                subject: getSubjectName(template.subjectId),
                exam: template.examId ? getExamName(template.examId) : (t('examPapers.generic') || 'Generic'),
                printStatus: printStatusConfig[(template.printStatus || 'not_printed') as PrintStatus].label,
                copiesPrinted: template.copiesPrinted ?? 0,
                lastPrinted: template.lastPrintedAt 
                  ? format(new Date(template.lastPrintedAt), 'MMM dd, yyyy HH:mm')
                  : '-',
                printedBy: template.printedBy || '-',
              }))}
              buildFiltersSummary={() => {
                const parts: string[] = [];
                if (selectedSchoolId) {
                  const school = schools?.find(s => s.id === selectedSchoolId);
                  if (school) parts.push(`School: ${school.schoolName}`);
                }
                if (selectedSubjectId) {
                  parts.push(`Subject: ${getSubjectName(selectedSubjectId)}`);
                }
                if (selectedExamId) {
                  const exam = exams?.find(e => e.id === selectedExamId);
                  if (exam) parts.push(`Exam: ${exam.name}`);
                }
                if (selectedPrintStatus !== 'all') {
                  parts.push(`Status: ${printStatusConfig[selectedPrintStatus].label}`);
                }
                parts.push(`Total: ${filteredTemplates.length} paper(s)`);
                return parts.join(' | ');
              }}
              schoolId={profile?.default_school_id}
              templateType="exam_paper_print_tracking"
              disabled={!filteredTemplates || filteredTemplates.length === 0}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-1">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                {t('examPapers.search') || 'Search'}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('examPapers.searchPlaceholder') || 'Search papers...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* School Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterSchool') || 'School'}
              </Label>
              <Select value={selectedSchoolId || 'all'} onValueChange={(val) => setSelectedSchoolId(val === 'all' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.filterSchool') || 'School'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All Schools'}</SelectItem>
                  {(schools || []).map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterSubject') || 'Subject'}
              </Label>
              <Select value={selectedSubjectId || 'all'} onValueChange={(val) => setSelectedSubjectId(val === 'all' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.filterSubject') || 'Subject'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All Subjects'}</SelectItem>
                  {(subjects || []).map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Exam Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.filterExam') || 'Exam'}
              </Label>
              <Select value={selectedExamId || 'all'} onValueChange={(val) => setSelectedExamId(val === 'all' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.filterExam') || 'Exam'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All Exams'}</SelectItem>
                  {(exams || []).map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Print Status Filter */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t('examPapers.printStatus') || 'Print Status'}
              </Label>
              <Select value={selectedPrintStatus} onValueChange={(val) => setSelectedPrintStatus(val as PrintStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examPapers.filterPrintStatus') || 'Print Status'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all') || 'All Statuses'}</SelectItem>
                  {Object.entries(printStatusConfig).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Papers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.papersList') || 'Exam Papers'}</CardTitle>
          <CardDescription>
            {filteredTemplates.length 
              ? t('examPapers.totalPapers', { count: filteredTemplates.length }) || `${filteredTemplates.length} paper(s) found`
              : t('examPapers.noPapers') || 'No papers found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
              <Skeleton className="w-full h-12" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                {t('examPapers.noPapersFound') || 'No papers found. Create your first exam paper to get started.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t('examPapers.paperTitle') || 'Title'}</TableHead>
                    <TableHead>{t('examPapers.school') || 'School'}</TableHead>
                    <TableHead>{t('examPapers.subject') || 'Subject'}</TableHead>
                    <TableHead>{t('examPapers.exam') || 'Exam'}</TableHead>
                    <TableHead>{t('examPapers.printStatus') || 'Print Status'}</TableHead>
                    <TableHead>{t('examPapers.copiesPrinted') || 'Copies Printed'}</TableHead>
                    <TableHead>{t('examPapers.lastPrinted') || 'Last Printed'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => {
                    const printStatus = (template.printStatus || 'not_printed') as PrintStatus;
                    const statusConfig = printStatusConfig[printStatus];
                    const copiesPrinted = template.copiesPrinted ?? 0;
                    const lastPrintedAt = template.lastPrintedAt ? new Date(template.lastPrintedAt) : null;
                    const printedBy = template.printedBy;

                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          {template.title}
                          {template.isDefaultForExamSubject && (
                            <Badge variant="secondary" className="ml-2">
                              {t('examPapers.default') || 'Default'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getSchoolName(template.schoolId)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{getSubjectName(template.subjectId)}</Badge>
                        </TableCell>
                        <TableCell>
                          {template.examId ? (
                            <Badge variant="outline">{getExamName(template.examId)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Printer className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{copiesPrinted}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lastPrintedAt ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{format(lastPrintedAt, 'MMM dd, yyyy HH:mm')}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/exams/papers/${template.id}/edit`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                {t('common.edit') || 'Edit'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedTemplate(template);
                                setIsPreviewDialogOpen(true);
                              }}>
                                <Printer className="h-4 w-4 mr-2" />
                                {t('examPapers.print') || 'Print'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetailsDialog(template)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t('common.viewDetails') || 'View Details'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('examPapers.paperDetails') || 'Paper Details'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.paperDetailsDescription') || 'View detailed information about the exam paper'}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.paperTitle') || 'Title'}</Label>
                  <p className="text-sm font-medium">{selectedTemplate.title}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.school') || 'School'}</Label>
                  <p className="text-sm">{getSchoolName(selectedTemplate.schoolId)}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.subject') || 'Subject'}</Label>
                  <p className="text-sm">{getSubjectName(selectedTemplate.subjectId)}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.exam') || 'Exam'}</Label>
                  <p className="text-sm">{selectedTemplate.examId ? getExamName(selectedTemplate.examId) : '—'}</p>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.printStatus') || 'Print Status'}</Label>
                  <Badge variant={printStatusConfig[(selectedTemplate.printStatus || 'not_printed') as PrintStatus].variant}>
                    {printStatusConfig[(selectedTemplate.printStatus || 'not_printed') as PrintStatus].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.copiesPrinted') || 'Copies Printed'}</Label>
                  <p className="text-sm font-medium">{selectedTemplate.copiesPrinted ?? 0}</p>
                </div>
                {selectedTemplate.lastPrintedAt && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.lastPrinted') || 'Last Printed'}</Label>
                    <p className="text-sm">{format(selectedTemplate.lastPrintedAt, 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
                {selectedTemplate.printedBy && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.printedBy') || 'Printed By'}</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{selectedTemplate.printedBy}</p>
                    </div>
                  </div>
                )}
                {selectedTemplate.printNotes && (
                  <div className="col-span-2">
                    <Label className="text-xs font-medium text-muted-foreground">{t('examPapers.printNotes') || 'Print Notes'}</Label>
                    <p className="text-sm text-muted-foreground">{selectedTemplate.printNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              {t('common.close') || 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      {selectedTemplate && (
        <PaperPreview
          templateId={selectedTemplate.id}
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
        />
      )}
    </div>
  );
}

