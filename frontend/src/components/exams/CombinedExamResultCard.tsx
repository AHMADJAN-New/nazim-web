import { AlertCircle, User } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { kashfCardTextFor } from '@/lib/exams/kashfCardText';
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
  percentage?: number | null;
  grade_name?: string | null;
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
    combined_obtained_raw?: number | null;
    overall_percentage?: number | null;
    overall_grade?: string | null;
    overall_result?: 'Pass' | 'Fail' | 'Incomplete';
    is_complete?: boolean;
    absence_count?: number;
    marks_cut?: number;
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

function StudentPhoto({
  studentId,
  picturePath,
}: {
  studentId?: string | null;
  picturePath?: string | null;
}) {
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

function SideMarks({ side }: { side: CombinedMarkSide }) {
  const { language } = useLanguage();
  const kashfCardText = kashfCardTextFor(language);

  if (!side.enrolled) {
    return (
      <Badge variant="outline" className="text-xs">
        {kashfCardText.notInExam}
      </Badge>
    );
  }
  if (side.is_absent) {
    return (
      <Badge variant="outline" className="text-xs">
        {kashfCardText.absent}
      </Badge>
    );
  }
  if (side.missing_mark || side.marks_obtained === null) {
    return (
      <Badge
        variant="outline"
        className="border-amber-300 text-xs text-amber-800 dark:text-amber-200"
      >
        {kashfCardText.missingMark}
      </Badge>
    );
  }

  return (
    <p className="font-semibold tabular-nums" dir="ltr">
      {formatMark(side.marks_obtained)}
      {side.total_marks !== null ? ` / ${formatMark(side.total_marks)}` : ''}
    </p>
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
  const { language } = useLanguage();
  const kashfCardText = kashfCardTextFor(language);
  const classLabel = card.student.class
    ? `${card.student.class}${card.student.section ? ` - ${card.student.section}` : ''}`
    : null;
  const summary = card.summary;
  const passingValues = card.subjects
    .map((subject) => subject.combined_passing)
    .filter((value): value is number => value !== null && value !== undefined);
  const fullValues = card.subjects
    .map((subject) => subject.combined_total)
    .filter((value): value is number => value !== null && value !== undefined);
  const passingUniform =
    passingValues.length > 0 && passingValues.every((value) => value === passingValues[0]);
  const fullUniform = fullValues.length > 0 && fullValues.every((value) => value === fullValues[0]);
  const minimumValue =
    passingValues.length === 0
      ? null
      : passingUniform
        ? passingValues[0]
        : summary.combined_passing;
  const maximumValue = fullUniform ? fullValues[0] : summary.combined_total;
  const resultKey =
    summary.overall_result === 'Pass'
      ? 'pass'
      : summary.overall_result === 'Fail'
        ? 'fail'
        : 'incomplete';
  const resultLabel =
    resultKey === 'pass'
      ? kashfCardText.pass
      : resultKey === 'fail'
        ? kashfCardText.fail
        : kashfCardText.incomplete;
  const displaySchool = schoolName || organizationName || card.organization_name || '';

  return (
    <article className="kashf-sheet kashf-wide student-report-card" dir="rtl">
      <header className="kashf-head">
        <div className="kashf-head-side">
          <StudentPhoto studentId={card.student.id} picturePath={card.student.picture_path} />
        </div>
        <div className="kashf-head-text">
          {displaySchool ? <p className="kashf-school">{displaySchool}</p> : null}
          <h2 className="kashf-title">{kashfCardText.title}</h2>
          <p className="kashf-exam">
            {card.exam_a.name} + {card.exam_b.name}
            {card.academic_year ? ` — ${card.academic_year}` : ''}
            {classLabel ? ` — ${classLabel}` : ''}
          </p>
        </div>
        <div className="kashf-head-side" />
      </header>

      <div className="kashf-identity">
        <Info label={kashfCardText.fullName} value={card.student.full_name} />
        <Info label={kashfCardText.fatherName} value={card.student.father_name} />
        <Info label={kashfCardText.rollNumber} value={card.student.roll_number} />
        <Info label={kashfCardText.admissionNo} value={card.student.admission_no} />
        <Info
          label={kashfCardText.examA}
          value={card.exam_a.name}
          detail={examPeriod(card.exam_a)}
        />
        <Info
          label={kashfCardText.examB}
          value={card.exam_b.name}
          detail={examPeriod(card.exam_b)}
        />
      </div>

      {!card.enrolled_in_second_exam ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{kashfCardText.notEnrolledSecond}</p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{kashfCardText.subject}</TableHead>
              <TableHead className="text-center">{card.exam_a.name}</TableHead>
              <TableHead className="text-center">{card.exam_b.name}</TableHead>
              <TableHead className="text-center">{kashfCardText.combined}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {card.subjects.map((subject, index) => (
              <TableRow key={subject.class_subject_id || `${subject.subject_name}-${index}`}>
                <TableCell className="text-start font-medium">{subject.subject_name}</TableCell>
                <TableCell className="text-center">
                  <SideMarks side={subject.exam_a} />
                </TableCell>
                <TableCell className="text-center">
                  <SideMarks side={subject.exam_b} />
                </TableCell>
                <TableCell className="text-center">
                  {subject.combined_obtained === null ? (
                    <Badge
                      variant="outline"
                      className="border-amber-300 text-xs text-amber-800 dark:text-amber-200"
                    >
                      {kashfCardText.incomplete}
                    </Badge>
                  ) : (
                    <span className="font-semibold tabular-nums" dir="ltr">
                      {formatMark(subject.combined_obtained)}
                      {subject.combined_total !== null
                        ? ` / ${formatMark(subject.combined_total)}`
                        : ''}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="kashf-totals">
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">
            {passingUniform ? kashfCardText.minimumMarks : kashfCardText.passingTotal}
          </p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(minimumValue)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.maximumMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(maximumValue)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.obtainedMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(summary.combined_obtained)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.totalMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(summary.combined_total)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.overallPercentage}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {summary.overall_percentage !== null && summary.overall_percentage !== undefined
              ? `${formatMark(summary.overall_percentage)}%`
              : '—'}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.overallGrade}</p>
          <p className="text-base font-semibold">{summary.overall_grade || '—'}</p>
        </div>
        {summary.marks_cut !== undefined ? (
          <>
            <div className="kashf-stat">
              <p className="text-xs text-muted-foreground">{kashfCardText.absenceCount}</p>
              <p className="text-base font-semibold tabular-nums" dir="ltr">
                {summary.absence_count ?? 0}
              </p>
            </div>
            <div className="kashf-stat">
              <p className="text-xs text-muted-foreground">{kashfCardText.marksCut}</p>
              <p className="text-base font-semibold tabular-nums" dir="ltr">
                {formatMark(summary.marks_cut)}
              </p>
            </div>
          </>
        ) : null}
        <div className={`kashf-stat kashf-verdict kashf-${resultKey}`}>
          <p className="text-xs text-muted-foreground">{kashfCardText.overallResult}</p>
          <p className="text-base font-semibold">{resultLabel}</p>
        </div>
      </div>

      <p className="kashf-attest">
        {kashfCardText.attestationLead(displaySchool || '—')}
        <strong>{card.student.full_name || '—'}</strong>
        {kashfCardText.attestationBetween}
        <strong>{card.student.father_name || '—'}</strong>
        {kashfCardText.attestationEnding(
          resultKey,
          `${card.exam_a.name} + ${card.exam_b.name}`,
          summary.overall_grade || '—',
        )}
      </p>
      <p className="kashf-conduct">{kashfCardText.conduct}</p>

      <div className="kashf-signs">
        <div>
          <i />
          <span>{kashfCardText.principal}</span>
        </div>
        <div>
          <i />
          <span>{kashfCardText.schoolSeal}</span>
        </div>
      </div>
    </article>
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
