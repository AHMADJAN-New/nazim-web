import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useExams,
  useExam,
  useExamClasses,
  useExamSubjects,
  useExamStudents,
  useExamResults,
  useSaveExamResult,
  useBulkSaveExamResults,
  useUpdateExamResult,
  useMarksProgress,
} from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import type { Exam, ExamClass, ExamSubject, ExamStudent, ExamResult } from '@/types/domain/exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Save, UserX, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface StudentMarksRowProps {
  student: ExamStudent;
  examSubject: ExamSubject;
  examId: string;
  result?: ExamResult;
  onMarksChange: (studentId: string, marks: number | null, isAbsent: boolean, remarks: string) => void;
  hasUpdate: boolean;
}

function StudentMarksRow({ student, examSubject, examId, result, onMarksChange, hasUpdate }: StudentMarksRowProps) {
  const [marks, setMarks] = useState<string>(result?.marksObtained?.toString() || '');
  const [isAbsent, setIsAbsent] = useState<boolean>(result?.isAbsent || false);
  const [remarks, setRemarks] = useState<string>(result?.remarks || '');

  useEffect(() => {
    if (result) {
      setMarks(result.marksObtained?.toString() || '');
      setIsAbsent(result.isAbsent || false);
      setRemarks(result.remarks || '');
    }
  }, [result]);

  const handleMarksChange = (value: string) => {
    setMarks(value);
    const numValue = value === '' ? null : Number(value);
    onMarksChange(student.id, numValue, isAbsent, remarks);
  };

  const handleAbsentChange = (checked: boolean) => {
    setIsAbsent(checked);
    if (checked) {
      setMarks('');
    }
    onMarksChange(student.id, checked ? null : (marks ? Number(marks) : null), checked, remarks);
  };

  const handleRemarksChange = (value: string) => {
    setRemarks(value);
    onMarksChange(student.id, marks ? Number(marks) : null, isAbsent, value);
  };

  const maxMarks = examSubject.totalMarks || 100;
  const marksNum = marks ? Number(marks) : null;
  const isValid = marksNum === null || (marksNum >= 0 && marksNum <= maxMarks);

  return (
    <TableRow>
      <TableCell className="font-medium">
        {student.studentAdmission?.student?.fullName || student.studentAdmissionId}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={marks}
          onChange={(e) => handleMarksChange(e.target.value)}
          disabled={!hasUpdate || isAbsent}
          min={0}
          max={maxMarks}
          className={!isValid ? 'border-destructive' : ''}
          placeholder="0"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isAbsent}
            onCheckedChange={handleAbsentChange}
            disabled={!hasUpdate}
          />
          <Label className="text-sm">{isAbsent ? 'Absent' : 'Present'}</Label>
        </div>
      </TableCell>
      <TableCell>
        <Textarea
          value={remarks}
          onChange={(e) => handleRemarksChange(e.target.value)}
          disabled={!hasUpdate}
          placeholder="Remarks..."
          rows={1}
          className="min-h-[40px]"
        />
      </TableCell>
      <TableCell>
        {marksNum !== null && !isAbsent && (
          <Badge variant={marksNum >= (examSubject.passingMarks || 0) ? 'default' : 'destructive'}>
            {marksNum >= (examSubject.passingMarks || 0) ? 'Pass' : 'Fail'}
          </Badge>
        )}
        {isAbsent && (
          <Badge variant="outline">
            <UserX className="h-3 w-3 mr-1" />
            Absent
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ExamMarks() {
  const { t } = useLanguage();
  const { examId: urlExamId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const { data: urlExam } = useExam(urlExamId);
  const [selectedExamId, setSelectedExamId] = useState<string>(urlExamId || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const { data: examClasses } = useExamClasses(selectedExamId);
  const { data: examSubjects } = useExamSubjects(selectedExamId, selectedClassId);
  const { data: examStudents } = useExamStudents(selectedExamId, selectedClassId);
  const { data: examResults } = useExamResults(selectedExamId, selectedSubjectId);

  const saveResult = useSaveExamResult();
  const bulkSaveResults = useBulkSaveExamResults();
  const updateResult = useUpdateExamResult();

  const [marksData, setMarksData] = useState<Record<string, { marks: number | null; isAbsent: boolean; remarks: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  const hasUpdate = useHasPermission('exams.enter_marks');
  
  // Fetch marks progress for the selected exam
  const { data: marksProgress } = useMarksProgress(selectedExamId);

  // Set exam from URL params
  useEffect(() => {
    if (urlExamId && !selectedExamId) {
      setSelectedExamId(urlExamId);
    }
  }, [urlExamId, selectedExamId]);

  useEffect(() => {
    if (exams && exams.length > 0 && !selectedExamId && !urlExamId) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId, urlExamId]);

  useEffect(() => {
    if (examClasses && examClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(examClasses[0].id);
    }
  }, [examClasses, selectedClassId]);

  useEffect(() => {
    if (examSubjects && examSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(examSubjects[0].id);
    }
  }, [examSubjects, selectedSubjectId]);

  // Initialize marks data from existing results
  useEffect(() => {
    if (examResults && examStudents) {
      const initialData: Record<string, { marks: number | null; isAbsent: boolean; remarks: string }> = {};
      examStudents.forEach((student) => {
        const result = examResults.find((r) => r.examStudentId === student.id);
        initialData[student.id] = {
          marks: result?.marksObtained || null,
          isAbsent: result?.isAbsent || false,
          remarks: result?.remarks || '',
        };
      });
      setMarksData(initialData);
    }
  }, [examResults, examStudents]);

  const selectedSubject = examSubjects?.find((s) => s.id === selectedSubjectId);
  const selectedClass = examClasses?.find((c) => c.id === selectedClassId);
  const selectedExam = exams?.find((e) => e.id === selectedExamId);

  const handleMarksChange = (studentId: string, marks: number | null, isAbsent: boolean, remarks: string) => {
    setMarksData((prev) => ({
      ...prev,
      [studentId]: { marks, isAbsent, remarks },
    }));
  };

  const handleBulkSave = () => {
    if (!selectedExamId || !selectedSubjectId || !examStudents) return;

    setIsSaving(true);
    const results = examStudents.map((student) => {
      const data = marksData[student.id] || { marks: null, isAbsent: false, remarks: '' };
      return {
        exam_student_id: student.id,
        marks_obtained: data.marks,
        is_absent: data.isAbsent,
        remarks: data.remarks || null,
      };
    });

    bulkSaveResults.mutate(
      {
        exam_id: selectedExamId,
        exam_subject_id: selectedSubjectId,
        results,
      },
      {
        onSuccess: () => {
          setIsSaving(false);
        },
        onError: () => {
          setIsSaving(false);
        },
      }
    );
  };

  const hasChanges = useMemo(() => {
    if (!examResults || !examStudents) return false;
    return examStudents.some((student) => {
      const result = examResults.find((r) => r.examStudentId === student.id);
      const currentData = marksData[student.id];
      if (!currentData) return false;
      return (
        currentData.marks !== (result?.marksObtained || null) ||
        currentData.isAbsent !== (result?.isAbsent || false) ||
        currentData.remarks !== (result?.remarks || '')
      );
    });
  }, [marksData, examResults, examStudents]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-4">
          {urlExamId && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{t('exams.marks') || 'Exam Marks'}</h1>
            <p className="text-sm text-muted-foreground">
              {t('exams.marksDescription') || 'Enter and manage exam marks for students.'}
              {marksProgress && (
                <span className="ml-2">
                  ({t('exams.progress') || 'Progress'}: {marksProgress.totalEntered}/{marksProgress.totalExpected} - {marksProgress.overallPercentage.toFixed(0)}%)
                </span>
              )}
            </p>
          </div>
        </div>
        {selectedSubject && hasUpdate && (
          <Button onClick={handleBulkSave} disabled={!hasChanges || isSaving || bulkSaveResults.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? t('common.saving') || 'Saving...' : t('common.saveAll') || 'Save All Marks'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('exams.exam') || 'Exam'}</CardTitle>
          </CardHeader>
          <CardContent>
            {examsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(exams || []).map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('exams.class') || 'Class'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedExamId}>
              <SelectTrigger>
                <SelectValue placeholder={t('exams.selectClass') || 'Select class'} />
              </SelectTrigger>
              <SelectContent>
                {(examClasses || []).map((examClass) => (
                  <SelectItem key={examClass.id} value={examClass.id}>
                    {examClass.classAcademicYear?.class?.name || examClass.id}
                    {examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('exams.subject') || 'Subject'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder={t('exams.selectSubject') || 'Select subject'} />
              </SelectTrigger>
              <SelectContent>
                {(examSubjects || []).map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.subject?.name || subject.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedSubject && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {t('exams.marksEntry') || 'Marks Entry'} - {selectedSubject.subject?.name || selectedSubject.id}
                </CardTitle>
                <CardDescription>
                  {t('exams.marksEntryDescription') || 'Enter marks for all enrolled students. Total marks: '}
                  {selectedSubject.totalMarks || 'N/A'} | {t('exams.passingMarks') || 'Passing marks'}: {selectedSubject.passingMarks || 'N/A'}
                </CardDescription>
              </div>
              {selectedClass && (
                <Badge variant="outline">
                  {selectedClass.classAcademicYear?.class?.name || 'Class'}
                  {selectedClass.classAcademicYear?.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!examStudents || examStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('exams.noStudentsEnrolled') || 'No students enrolled for this exam class.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('exams.student') || 'Student'}</TableHead>
                    <TableHead>{t('exams.marksObtained') || 'Marks Obtained'}</TableHead>
                    <TableHead>{t('exams.absent') || 'Absent'}</TableHead>
                    <TableHead>{t('exams.remarks') || 'Remarks'}</TableHead>
                    <TableHead>{t('exams.status') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examStudents.map((student) => {
                    const result = examResults?.find((r) => r.examStudentId === student.id);
                    return (
                      <StudentMarksRow
                        key={student.id}
                        student={student}
                        examSubject={selectedSubject}
                        examId={selectedExamId}
                        result={result}
                        onMarksChange={handleMarksChange}
                        hasUpdate={hasUpdate}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedExamId && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              {t('exams.selectExamToStart') || 'Select an exam to start entering marks.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

