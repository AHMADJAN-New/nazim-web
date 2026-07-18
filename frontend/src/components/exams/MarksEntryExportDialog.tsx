import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useLanguage } from '@/hooks/useLanguage';
import { useServerReport } from '@/hooks/useServerReport';
import { calendarState } from '@/lib/calendarState';
import { showToast } from '@/lib/toast';
import type { ExamClass, ExamSubject } from '@/types/domain/exam';

export type StudentIdMode = 'roll' | 'secret' | 'both';

interface MarksEntryExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examName?: string;
  schoolId?: string | null;
  examClasses: ExamClass[];
  examSubjects: ExamSubject[];
  defaultClassId?: string;
  defaultSubjectId?: string;
}

export function MarksEntryExportDialog({
  open,
  onOpenChange,
  examId,
  examName,
  schoolId,
  examClasses,
  examSubjects,
  defaultClassId,
  defaultSubjectId,
}: MarksEntryExportDialogProps) {
  const { t, language } = useLanguage();
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [studentIdMode, setStudentIdMode] = useState<StudentIdMode>('roll');
  const [showReportProgress, setShowReportProgress] = useState(false);

  const {
    generateReport,
    status,
    progress,
    downloadUrl,
    isGenerating,
    reset: resetReport,
    downloadReport,
  } = useServerReport();

  useEffect(() => {
    if (!open) return;
    const classId = defaultClassId || examClasses[0]?.id || '';
    setSelectedClassIds(classId ? [classId] : []);
    setStudentIdMode('roll');
  }, [open, defaultClassId, examClasses]);

  const subjectsForSelectedClasses = useMemo(() => {
    if (selectedClassIds.length === 0) return [];
    return (examSubjects || []).filter((s) => selectedClassIds.includes(s.examClassId));
  }, [examSubjects, selectedClassIds]);

  useEffect(() => {
    if (!open) return;
    const availableIds = subjectsForSelectedClasses.map((s) => s.id);
    if (availableIds.length === 0) {
      setSelectedSubjectIds([]);
      return;
    }
    setSelectedSubjectIds((prev) => {
      const kept = prev.filter((id) => availableIds.includes(id));
      if (kept.length > 0) return kept;
      if (defaultSubjectId && availableIds.includes(defaultSubjectId)) {
        return [defaultSubjectId];
      }
      return availableIds;
    });
  }, [open, subjectsForSelectedClasses, defaultSubjectId]);

  const toggleClass = (classId: string, checked: boolean) => {
    setSelectedClassIds((prev) =>
      checked ? [...prev, classId] : prev.filter((id) => id !== classId)
    );
  };

  const toggleSubject = (subjectId: string, checked: boolean) => {
    setSelectedSubjectIds((prev) =>
      checked ? [...prev, subjectId] : prev.filter((id) => id !== subjectId)
    );
  };

  const selectAllClasses = () => setSelectedClassIds(examClasses.map((c) => c.id));
  const selectAllSubjects = () =>
    setSelectedSubjectIds(subjectsForSelectedClasses.map((s) => s.id));

  const canExport =
    !!examId && selectedClassIds.length > 0 && selectedSubjectIds.length > 0 && !isGenerating;

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!canExport) return;

    setShowReportProgress(true);
    resetReport();

    const title =
      format === 'pdf'
        ? `${t('exams.marksEntryTemplates')} PDF — ${examName || ''}`
        : `${t('exams.marksEntryTemplates')} Excel — ${examName || ''}`;

    const calendar = calendarState.get();
    const calendarPreference =
      calendar === 'gregorian'
        ? 'gregorian'
        : calendar === 'hijri_shamsi'
          ? 'jalali'
          : 'qamari';
    const languageCode =
      language === 'en' ? 'en' : language === 'ps' ? 'ps' : language === 'fa' ? 'fa' : 'ar';

    try {
      await generateReport({
        reportKey:
          format === 'pdf' ? 'exam_marks_entry_pdf_zip' : 'exam_marks_entry_excel_zip',
        reportType: format,
        title,
        brandingId: schoolId ?? undefined,
        async: true,
        language: languageCode,
        calendarPreference,
        columns: [],
        rows: [],
        parameters: {
          exam_id: examId,
          exam_class_ids: selectedClassIds,
          exam_subject_ids: selectedSubjectIds,
          student_id_mode: studentIdMode,
          language: languageCode,
          calendar_preference: calendarPreference,
        },
        onComplete: () => {
          showToast.success(t('exams.marksEntryZipReady'));
          void downloadReport();
        },
        onError: (error) => {
          showToast.error(error || t('exams.marksEntryZipFailed'));
        },
      });
    } catch (error: unknown) {
      showToast.error(
        error instanceof Error && error.message
          ? error.message
          : t('exams.marksEntryZipFailed')
      );
    }
  };

  const classLabel = (examClass: ExamClass) => {
    const name = examClass.classAcademicYear?.class?.name || examClass.id;
    const section = examClass.classAcademicYear?.sectionName;
    return section ? `${name} - ${section}` : name;
  };

  const subjectLabel = (subject: ExamSubject) => {
    const name =
      subject.subject?.name ||
      subject.classSubject?.subject?.name ||
      subject.id;
    const examClass = examClasses.find((c) => c.id === subject.examClassId);
    if (!examClass || selectedClassIds.length <= 1) {
      return name;
    }
    return `${classLabel(examClass)} — ${name}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('exams.downloadMarksEntryTemplates')}</DialogTitle>
            <DialogDescription>
              {t('exams.downloadMarksEntryTemplatesDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('exams.classes')}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={selectAllClasses}>
                  {t('exams.selectAll')}
                </Button>
              </div>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {examClasses.map((examClass) => (
                  <label key={examClass.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedClassIds.includes(examClass.id)}
                      onCheckedChange={(checked) => toggleClass(examClass.id, checked === true)}
                    />
                    <span>{classLabel(examClass)}</span>
                  </label>
                ))}
                {examClasses.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('exams.noClassesAssigned')}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('exams.subjects')}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllSubjects}
                  disabled={subjectsForSelectedClasses.length === 0}
                >
                  {t('exams.selectAll')}
                </Button>
              </div>
              <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {subjectsForSelectedClasses.map((subject) => (
                  <label key={subject.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedSubjectIds.includes(subject.id)}
                      onCheckedChange={(checked) => toggleSubject(subject.id, checked === true)}
                    />
                    <span>{subjectLabel(subject)}</span>
                  </label>
                ))}
                {subjectsForSelectedClasses.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('exams.noSubjectsConfigured')}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('exams.studentIdColumns')}</Label>
              <RadioGroup
                value={studentIdMode}
                onValueChange={(value) => setStudentIdMode(value as StudentIdMode)}
                className="space-y-2"
              >
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="roll" id="id-mode-roll" />
                  <span>{t('exams.studentIdModeRoll')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="secret" id="id-mode-secret" />
                  <span>{t('exams.studentIdModeSecret')}</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="both" id="id-mode-both" />
                  <span>{t('exams.studentIdModeBoth')}</span>
                </label>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {studentIdMode === 'secret'
                  ? t('exams.studentIdModeSecretHint')
                  : t('exams.studentIdModeHint')}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canExport}
              onClick={() => void handleExport('excel')}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 me-2" />
              )}
              <span className="hidden sm:inline">{t('examReports.downloadExcelZip')}</span>
              <span className="sm:hidden">{t('common.exportExcel')}</span>
            </Button>
            <Button
              type="button"
              disabled={!canExport}
              onClick={() => void handleExport('pdf')}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 me-2" />
              )}
              <span className="hidden sm:inline">{t('examReports.downloadPdfZip')}</span>
              <span className="sm:hidden">{t('common.exportPdf')}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportProgressDialog
        open={showReportProgress}
        onOpenChange={setShowReportProgress}
        status={status}
        progress={progress}
        downloadUrl={downloadUrl}
      />
    </>
  );
}
