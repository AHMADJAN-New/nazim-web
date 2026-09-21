import { Award, Loader2, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatMark, formatPercentage } from '@/lib/reporting/markFormat';

export type TopStudentReportRow = Record<string, unknown> & {
  classId: string;
  className: string;
  rank: number;
  rollNumber: string;
  studentName: string;
  fatherName: string;
  marksObtained: number | string;
  percentage: number;
  result: string;
};

type ClassOption = {
  id: string;
  label: string;
};

interface TopStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentClassId: string;
  classes: ClassOption[];
  examName?: string;
  subjectName?: string;
  marksLabel?: string;
  schoolId?: string;
  loadRows: (classIds: string[]) => Promise<TopStudentReportRow[]>;
}

type Scope = 'current' | 'selected' | 'all';

export function TopStudentsDialog({
  open,
  onOpenChange,
  currentClassId,
  classes,
  examName,
  subjectName,
  marksLabel,
  schoolId,
  loadRows,
}: TopStudentsDialogProps) {
  const { t } = useLanguage();
  const [scope, setScope] = useState<Scope>('current');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [rows, setRows] = useState<TopStudentReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope('current');
    setSelectedClassIds(currentClassId ? [currentClassId] : []);
  }, [currentClassId, open]);

  const requestedClassIds = useMemo(() => {
    if (scope === 'all') return classes.map((item) => item.id);
    if (scope === 'selected') return selectedClassIds;
    return currentClassId ? [currentClassId] : [];
  }, [classes, currentClassId, scope, selectedClassIds]);

  useEffect(() => {
    if (!open || requestedClassIds.length === 0) {
      setRows([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void loadRows(requestedClassIds)
      .then((loadedRows) => {
        if (!cancelled) setRows(loadedRows);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setRows([]);
          setError(loadError instanceof Error ? loadError.message : 'Failed to load top students');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadRows, open, requestedClassIds]);

  const exportColumns = [
    { key: 'className', label: t('examReports.className') || 'Class' },
    { key: 'rank', label: t('examReports.rank') || 'Position' },
    { key: 'rollNumber', label: t('students.rollNumber') || 'Roll Number' },
    { key: 'studentName', label: t('examReports.studentName') || 'Student Name' },
    { key: 'fatherName', label: t('examReports.fatherName') || 'Father Name' },
    { key: 'marksObtained', label: marksLabel || t('examReports.obtainedMarks') || 'Obtained Marks' },
    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
    { key: 'result', label: t('examReports.result') || 'Result' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pe-8">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t('events.topPerformers') || 'Top Students'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {subjectName || 'Subject'}{examName ? ` · ${examName}` : ''} — top three students per class, including ties.
              </DialogDescription>
            </div>
            <ReportExportButtons
              data={rows}
              columns={exportColumns}
              reportKey="top_students"
              title={`${t('events.topPerformers') || 'Top Students'}${subjectName ? ` - ${subjectName}` : ''}${examName ? ` - ${examName}` : ''}`}
              transformData={(data) => data.map((row) => ({
                ...row,
                marksObtained: formatMark(row.marksObtained),
                percentage: formatPercentage(row.percentage),
              }))}
              schoolId={schoolId}
              disabled={isLoading || rows.length === 0}
            />
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={scope === 'current' ? 'default' : 'outline'} onClick={() => setScope('current')}>
              Current class
            </Button>
            <Button size="sm" variant={scope === 'selected' ? 'default' : 'outline'} onClick={() => setScope('selected')}>
              Multiple classes
            </Button>
            <Button size="sm" variant={scope === 'all' ? 'default' : 'outline'} onClick={() => setScope('all')}>
              All classes
            </Button>
          </div>

          {scope === 'selected' && (
            <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((classOption) => (
                <Label key={classOption.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-background">
                  <Checkbox
                    checked={selectedClassIds.includes(classOption.id)}
                    onCheckedChange={(checked) => {
                      setSelectedClassIds((current) =>
                        checked
                          ? [...new Set([...current, classOption.id])]
                          : current.filter((id) => id !== classOption.id)
                      );
                    }}
                  />
                  <span>{classOption.label}</span>
                </Label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{requestedClassIds.length} classes</span>
              <span>·</span>
              <span>{rows.length} students</span>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
          ) : !isLoading && rows.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              No top students were found for the selected classes.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('examReports.className') || 'Class'}</TableHead>
                    <TableHead>{t('examReports.rank') || 'Position'}</TableHead>
                    <TableHead>{t('examReports.studentName') || 'Student Name'}</TableHead>
                    <TableHead>{t('examReports.fatherName') || 'Father Name'}</TableHead>
                    <TableHead>{t('students.rollNumber') || 'Roll Number'}</TableHead>
                    <TableHead>{marksLabel || t('examReports.obtainedMarks') || 'Marks'}</TableHead>
                    <TableHead>{t('examReports.percentage') || 'Percentage'}</TableHead>
                    <TableHead>{t('examReports.result') || 'Result'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={`${row.classId}-${row.rollNumber}-${index}`}>
                      <TableCell className="whitespace-nowrap font-medium">{row.className}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Award className="h-3.5 w-3.5 text-amber-500" />
                          {row.rank}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{row.studentName}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.fatherName}</TableCell>
                      <TableCell>{row.rollNumber}</TableCell>
                      <TableCell>{formatMark(row.marksObtained)}</TableCell>
                      <TableCell className="font-semibold">{formatPercentage(row.percentage)}</TableCell>
                      <TableCell>{row.result}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
