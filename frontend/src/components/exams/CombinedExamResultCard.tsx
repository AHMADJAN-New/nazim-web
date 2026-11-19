import { Award, AlertCircle, BookOpen, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';

export type CombinedMarkSide = {
  enrolled: boolean;
  is_absent: boolean;
  marks_obtained: number | null;
  total_marks: number | null;
  passing_marks: number | null;
  missing_mark: boolean;
};

export type CombinedSubjectRow = {
  class_subject_id?: string | null;
  subject_name: string;
  subject_code?: string | null;
  exam_a: CombinedMarkSide;
  exam_b: CombinedMarkSide;
  combined_obtained: number | null;
  combined_total: number | null;
  combined_passing: number | null;
  is_pass: boolean | null;
  is_complete: boolean;
  incomplete_reasons?: string[];
};

export type CombinedReportCard = {
  enrolled_in_second_exam: boolean;
  organization_name?: string | null;
  academic_year?: string | null;
  exam_a: {
    id: string;
    name: string;
    academic_year?: string | null;
    start_date_formatted?: string | null;
    end_date_formatted?: string | null;
  };
  exam_b: {
    id: string;
    name: string;
    academic_year?: string | null;
    start_date_formatted?: string | null;
    end_date_formatted?: string | null;
  };
  student: {
    exam_student_id?: string;
    id?: string | null;
    full_name: string;
    admission_no?: string | null;
    roll_number?: string | null;
    class?: string | null;
    section?: string | null;
    father_name?: string | null;
    birth_date_formatted?: string | null;
    picture_path?: string | null;
  };
  subjects: CombinedSubjectRow[];
  summary: {
    total_subjects?: number;
    passed_subjects?: number;
    failed_subjects?: number;
    incomplete_subjects?: number;
    combined_obtained?: number | null;
    combined_total?: number | null;
    combined_passing?: number | null;
    overall_percentage?: number | null;
    overall_result?: 'Pass' | 'Fail' | 'Incomplete';
    is_complete?: boolean;
  };
};

function formatMark(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '—';
  }
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function examPeriod(exam: CombinedReportCard['exam_a']): string {
  const start = exam.start_date_formatted;
  const end = exam.end_date_formatted;
  if (start && end) return `${start} — ${end}`;
  return start || end || '';
}

function StudentPhoto({ studentId, picturePath }: { studentId?: string | null; picturePath?: string | null }) {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !picturePath) {
      setImageUrl(null);
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;

    const load = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const response = await fetch(`/api/students/${studentId}/picture`, {
          headers: {
            Accept: 'image/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (!response.ok) return;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        revoked = url;
        setImageUrl(url);
      } catch {
        if (!cancelled) setImageUrl(null);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [studentId, picturePath]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 sm:h-28 sm:w-28">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-10 w-10 text-muted-foreground/50" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('studentReportCard.studentPhoto')}</p>
    </div>
  );
}

function SideMarks({
  side,
  t,
}: {
  side: CombinedMarkSide;
  t: (key: 'examReports.absent' | 'studentReportCard.missingMark' | 'studentReportCard.notInExam' | 'studentReportCard.passingMark') => string;
}) {
  if (!side.enrolled) {
    return <Badge variant="outline" className="text-xs">{t('studentReportCard.notInExam')}</Badge>;
  }
  if (side.is_absent) {
    return <Badge variant="outline" className="text-xs">{t('examReports.absent')}</Badge>;
  }
  if (side.missing_mark || side.marks_obtained === null) {
    return <Badge variant="outline" className="border-amber-300 text-xs text-amber-800 dark:text-amber-200">{t('studentReportCard.missingMark')}</Badge>;
  }

  return (
    <div className="space-y-1">
      <p className="font-semibold tabular-nums" dir="ltr">
        {formatMark(side.marks_obtained)}
        {side.total_marks !== null ? ` / ${formatMark(side.total_marks)}` : ''}
      </p>
      <p className="text-xs text-muted-foreground">
        {t('studentReportCard.passingMark')}{' '}
        <span className="tabular-nums" dir="ltr">{formatMark(side.passing_marks)}</span>
      </p>
    </div>
  );
}

export function CombinedExamResultCard({
  card,
  schoolName,
  organizationName,
}: {
  card: CombinedReportCard;
  schoolName?: string | null;
  organizationName?: string | null;
}) {
  const { t, isRTL } = useLanguage();
  const summary = card.summary;
  const classLabel = card.student.class
    ? `${card.student.class}${card.student.section ? ` - ${card.student.section}` : ''}`
    : null;
  const displaySchool = schoolName || organizationName || card.organization_name || '';
  const overall = summary.overall_result ?? 'Incomplete';

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="overflow-hidden border-2">
        <CardHeader className="space-y-3 border-b text-center">
          {displaySchool ? (
            <p className="text-sm font-medium text-muted-foreground">{displaySchool}</p>
          ) : null}
          <div className="flex items-center justify-center gap-2">
            <Award className="hidden h-6 w-6 text-primary md:inline-flex" />
            <CardTitle className="text-xl sm:text-2xl">{t('studentReportCard.combinedTitle')}</CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">{card.exam_a.name}</Badge>
            <span className="text-muted-foreground">+</span>
            <Badge variant="secondary">{card.exam_b.name}</Badge>
            {classLabel ? <Badge variant="outline">{classLabel}</Badge> : null}
            {card.academic_year ? <Badge variant="outline">{card.academic_year}</Badge> : null}
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">{t('studentReportCard.combineHint')}</p>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-[auto_1fr]">
          <StudentPhoto studentId={card.student.id} picturePath={card.student.picture_path} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label={t('userManagement.fullName')} value={card.student.full_name} />
            <Info label={t('examReports.fatherName')} value={card.student.father_name} />
            <Info label={t('examReports.admissionNo')} value={card.student.admission_no} />
            <Info label={t('students.rollNo')} value={card.student.roll_number} />
            <Info label={t('studentReportCard.examA')} value={card.exam_a.name} detail={examPeriod(card.exam_a)} />
            <Info label={t('studentReportCard.examB')} value={card.exam_b.name} detail={examPeriod(card.exam_b)} />
          </div>
        </CardContent>
      </Card>

      {!card.enrolled_in_second_exam ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{t('studentReportCard.notEnrolledSecond')}</p>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 text-primary" />
            {t('studentReportCard.academicPerformance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">{t('studentReportCard.subjectName')}</TableHead>
                  <TableHead className="text-center">{card.exam_a.name}</TableHead>
                  <TableHead className="text-center">{card.exam_b.name}</TableHead>
                  <TableHead className="text-center">{t('studentReportCard.combined')}</TableHead>
                  <TableHead className="text-center">{t('examReports.result')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.subjects.map((subject, index) => (
                  <TableRow key={subject.class_subject_id || `${subject.subject_name}-${index}`}>
                    <TableCell className="text-start font-medium">{subject.subject_name}</TableCell>
                    <TableCell className="text-center">
                      <SideMarks side={subject.exam_a} t={t} />
                    </TableCell>
                    <TableCell className="text-center">
                      <SideMarks side={subject.exam_b} t={t} />
                    </TableCell>
                    <TableCell className="text-center">
                      {subject.combined_obtained === null ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="border-amber-300 text-xs text-amber-800 dark:text-amber-200">
                            {t('examReports.incomplete')}
                          </Badge>
                          {subject.combined_passing !== null ? (
                            <p className="text-xs text-muted-foreground">
                              {t('studentReportCard.combinedPassingMark')}{' '}
                              <span dir="ltr" className="tabular-nums">{formatMark(subject.combined_passing)}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold tabular-nums" dir="ltr">
                            {formatMark(subject.combined_obtained)}
                            {subject.combined_total !== null ? ` / ${formatMark(subject.combined_total)}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('studentReportCard.combinedPassingMark')}{' '}
                            <span dir="ltr" className="tabular-nums">{formatMark(subject.combined_passing)}</span>
                          </p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <ResultBadge complete={subject.is_complete} pass={subject.is_pass} t={t} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-amber-50 font-semibold dark:bg-amber-950/20">
                  <TableCell className="text-start">{t('studentReportCard.grandTotal')}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-center">
                    {summary.is_complete && summary.combined_obtained !== null && summary.combined_obtained !== undefined ? (
                      <span className="tabular-nums" dir="ltr">
                        {formatMark(summary.combined_obtained)} / {formatMark(summary.combined_total)}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        {t('studentReportCard.incompleteCombined')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <ResultBadge
                      complete={summary.is_complete === true && overall !== 'Incomplete'}
                      pass={overall === 'Pass' ? true : overall === 'Fail' ? false : null}
                      t={t}
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('studentReportCard.passedSubjects')} value={String(summary.passed_subjects ?? 0)} />
        <Stat label={t('studentReportCard.failedSubjects')} value={String(summary.failed_subjects ?? 0)} />
        <Stat label={t('studentReportCard.subjectsIncomplete')} value={String(summary.incomplete_subjects ?? 0)} />
        <Stat
          label={t('studentReportCard.overallPercentage')}
          value={summary.overall_percentage !== null && summary.overall_percentage !== undefined
            ? `${formatMark(summary.overall_percentage)}%`
            : '—'}
        />
      </div>
    </div>
  );
}

function Info({ label, value, detail }: { label: string; value?: string | null; detail?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-semibold">{value || '—'}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-1 p-3 sm:p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums" dir="ltr">{value}</p>
      </CardContent>
    </Card>
  );
}

function ResultBadge({
  complete,
  pass,
  t,
}: {
  complete: boolean;
  pass: boolean | null;
  t: (key: 'events.pass' | 'events.fail' | 'examReports.incomplete') => string;
}) {
  if (!complete || pass === null) {
    return <Badge variant="outline">{t('examReports.incomplete')}</Badge>;
  }
  if (pass) {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('events.pass')}</Badge>;
  }
  return <Badge variant="destructive">{t('events.fail')}</Badge>;
}
