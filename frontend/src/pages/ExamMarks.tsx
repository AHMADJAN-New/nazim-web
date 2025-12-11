import { useEffect, useMemo, useState, useRef } from 'react';
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
  useLatestExamFromCurrentYear,
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
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Save, UserX, ArrowLeft, Search, QrCode, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { showToast } from '@/lib/toast';

type SortField = 'name' | 'rollNumber' | 'secretNumber' | 'admissionNo' | 'marks';
type SortDirection = 'asc' | 'desc' | null;

interface StudentMarksRowProps {
  student: ExamStudent;
  examSubject: ExamSubject;
  examId: string;
  result?: ExamResult;
  onMarksChange: (studentId: string, marks: number | null, isAbsent: boolean, remarks: string) => void;
  hasUpdate: boolean;
  isHighlighted?: boolean;
  marksInputRef?: React.RefObject<HTMLInputElement>;
}

function StudentMarksRow({ 
  student, 
  examSubject, 
  examId, 
  result, 
  onMarksChange, 
  hasUpdate,
  isHighlighted = false,
  marksInputRef
}: StudentMarksRowProps) {
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
    const numValue = value === '' ? null : Number(value);
    if (numValue !== null && numValue > maxMarks) {
      return;
    }
    setMarks(value);
    onMarksChange(student.id, numValue, isAbsent, remarks);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Save this student's marks
      const numValue = marks === '' ? null : Number(marks);
      onMarksChange(student.id, numValue, isAbsent, remarks);
      // Focus will move to next input via parent component
    }
  };

  const handlePresentChange = (checked: boolean) => {
    const newIsAbsent = !checked;
    setIsAbsent(newIsAbsent);
    if (newIsAbsent) {
      setMarks('');
      onMarksChange(student.id, null, true, remarks);
    } else {
      onMarksChange(student.id, marks ? Number(marks) : null, false, remarks);
    }
  };

  const handleRemarksChange = (value: string) => {
    setRemarks(value);
    onMarksChange(student.id, marks ? Number(marks) : null, isAbsent, value);
  };

  const maxMarks = examSubject.totalMarks || 100;
  const marksNum = marks ? Number(marks) : null;
  const isValid = marksNum === null || (marksNum >= 0 && marksNum <= maxMarks);
  
  const studentName = student.studentAdmission?.student?.fullName || 
    (student.studentAdmission?.student as any)?.full_name || 
    student.studentAdmissionId || 
    'Unknown Student';
  
  const admissionNo = (student.studentAdmission?.student as any)?.admission_no || 
    (student.studentAdmission?.student as any)?.student_code || 
    '—';

  return (
    <TableRow className={cn(isHighlighted && 'bg-primary/10 ring-2 ring-primary')}>
      <TableCell className="font-medium">{studentName}</TableCell>
      <TableCell className="font-mono text-sm">{student.examRollNumber || '—'}</TableCell>
      <TableCell className="font-mono text-sm">{student.examSecretNumber || '—'}</TableCell>
      <TableCell className="text-muted-foreground font-mono text-sm">{admissionNo}</TableCell>
      <TableCell>
        <Input
          ref={marksInputRef}
          type="number"
          value={marks}
          onChange={(e) => handleMarksChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasUpdate || isAbsent}
          min={0}
          max={maxMarks}
          step="0.01"
          className={cn(
            'w-24',
            !isValid && 'border-destructive',
            isHighlighted && 'ring-2 ring-primary'
          )}
          placeholder="0"
          autoFocus={isHighlighted}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={!isAbsent}
            onCheckedChange={handlePresentChange}
            disabled={!hasUpdate}
          />
          <Label className="text-sm cursor-pointer" onClick={() => hasUpdate && handlePresentChange(!isAbsent)}>
            {isAbsent ? 'Absent' : 'Present'}
          </Label>
        </div>
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
        {marksNum === null && !isAbsent && (
          <span className="text-muted-foreground text-sm">—</span>
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
  const latestExam = useLatestExamFromCurrentYear(organizationId);
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

  // Search states
  const [searchAdmission, setSearchAdmission] = useState('');
  const [searchRollNumber, setSearchRollNumber] = useState('');
  const [searchSecretNumber, setSearchSecretNumber] = useState('');

  // Fast entry mode
  const [fastEntryMode, setFastEntryMode] = useState(false);
  const [fastEntryValue, setFastEntryValue] = useState('');
  const [fastEntryError, setFastEntryError] = useState('');
  const fastEntryInputRef = useRef<HTMLInputElement>(null);
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const studentInputRefs = useRef<Record<string, React.RefObject<HTMLInputElement>>>({});

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const hasUpdate = useHasPermission('exams.enter_marks');
  
  // Fetch marks progress for the selected exam
  const { data: marksProgress } = useMarksProgress(selectedExamId);

  // Set exam from URL params
  useEffect(() => {
    if (urlExamId) {
      setSelectedExamId(urlExamId);
    }
  }, [urlExamId]);

  // Auto-select latest exam
  useEffect(() => {
    if (!urlExamId && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, urlExamId]);

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

  // Initialize input refs for students
  useEffect(() => {
    if (examStudents) {
      examStudents.forEach((student) => {
        if (!studentInputRefs.current[student.id]) {
          studentInputRefs.current[student.id] = { current: null };
        }
      });
    }
  }, [examStudents]);

  // Focus fast entry input when mode is enabled
  useEffect(() => {
    if (fastEntryMode && fastEntryInputRef.current) {
      fastEntryInputRef.current.focus();
    }
  }, [fastEntryMode]);

  const selectedSubject = examSubjects?.find((s) => s.id === selectedSubjectId);
  const selectedClass = examClasses?.find((c) => c.id === selectedClassId);
  const selectedExam = exams?.find((e) => e.id === selectedExamId);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!examStudents) return [];
    
    let filtered = examStudents;

    if (searchAdmission) {
      filtered = filtered.filter((student) => {
        const admissionNo = (student.studentAdmission?.student as any)?.admission_no || '';
        const studentCode = (student.studentAdmission?.student as any)?.student_code || '';
        return admissionNo.toLowerCase().includes(searchAdmission.toLowerCase()) ||
               studentCode.toLowerCase().includes(searchAdmission.toLowerCase());
      });
    }

    if (searchRollNumber) {
      filtered = filtered.filter((student) => 
        student.examRollNumber?.toLowerCase().includes(searchRollNumber.toLowerCase())
      );
    }

    if (searchSecretNumber) {
      filtered = filtered.filter((student) => 
        student.examSecretNumber?.toLowerCase().includes(searchSecretNumber.toLowerCase())
      );
    }

    // Sort
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortField) {
          case 'name':
            aValue = (a.studentAdmission?.student?.fullName || 
              (a.studentAdmission?.student as any)?.full_name || '').toLowerCase();
            bValue = (b.studentAdmission?.student?.fullName || 
              (b.studentAdmission?.student as any)?.full_name || '').toLowerCase();
            break;
          case 'rollNumber':
            aValue = a.examRollNumber || '';
            bValue = b.examRollNumber || '';
            break;
          case 'secretNumber':
            aValue = a.examSecretNumber || '';
            bValue = b.examSecretNumber || '';
            break;
          case 'admissionNo':
            aValue = (a.studentAdmission?.student as any)?.admission_no || 
              (a.studentAdmission?.student as any)?.student_code || '';
            bValue = (b.studentAdmission?.student as any)?.admission_no || 
              (b.studentAdmission?.student as any)?.student_code || '';
            break;
          case 'marks':
            aValue = marksData[a.id]?.marks ?? -1;
            bValue = marksData[b.id]?.marks ?? -1;
            break;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [examStudents, searchAdmission, searchRollNumber, searchSecretNumber, sortField, sortDirection, marksData]);

  // Calculate progress for current subject
  const subjectProgress = useMemo(() => {
    if (!examStudents || !selectedSubject) return { entered: 0, total: 0, percentage: 0 };
    
    const total = examStudents.length;
    const entered = examStudents.filter((student) => {
      const data = marksData[student.id];
      return data && (data.marks !== null || data.isAbsent);
    }).length;

    return {
      entered,
      total,
      percentage: total > 0 ? (entered / total) * 100 : 0,
    };
  }, [examStudents, marksData, selectedSubject]);

  // Fast entry handler
  const handleFastEntry = (value: string) => {
    if (!value.trim() || !examStudents) return;

    const trimmedValue = value.trim();
    const student = examStudents.find((s) => 
      s.examRollNumber === trimmedValue ||
      s.examSecretNumber === trimmedValue ||
      (s.studentAdmission?.student as any)?.admission_no === trimmedValue ||
      (s.studentAdmission?.student as any)?.student_code === trimmedValue
    );

    if (!student) {
      setFastEntryError('Student not found');
      setTimeout(() => setFastEntryError(''), 2000);
      return;
    }

    setFastEntryError('');
    setHighlightedStudentId(student.id);
    setFastEntryValue('');

    // Focus the marks input for this student
    setTimeout(() => {
      const inputRef = studentInputRefs.current[student.id];
      if (inputRef?.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 100);

    // Clear highlight after 2 seconds
    setTimeout(() => setHighlightedStudentId(null), 2000);
  };

  const handleFastEntryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFastEntry(fastEntryValue);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={() => handleSort(field)}
      >
        {children}
        {direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 ml-1" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3 w-3 ml-1" />
        ) : (
          <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
        )}
      </Button>
    );
  };

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
          showToast.success(t('toast.marksSaved') || 'Marks saved successfully');
        },
        onError: (error: Error) => {
          setIsSaving(false);
          showToast.error(error.message || t('toast.marksSaveFailed') || 'Failed to save marks');
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
              <Select value={selectedExamId || ''} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(exams || []).map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} {exam.academicYear?.name ? `(${exam.academicYear.name})` : ''}
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
            <Select value={selectedClassId || ''} onValueChange={setSelectedClassId} disabled={!selectedExamId}>
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
            <Select value={selectedSubjectId || ''} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
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

      {selectedSubject && examStudents && examStudents.length > 0 && (
        <>
          {/* Progress Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('exams.marksEntryProgress') || 'Marks Entry Progress'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedSubject.subject?.name || 'Subject'}: {subjectProgress.entered} / {subjectProgress.total} entered
                  </span>
                  <span className="font-medium">{subjectProgress.percentage.toFixed(0)}%</span>
                </div>
                <Progress value={subjectProgress.percentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Fast Entry Mode */}
          {fastEntryMode && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Fast Entry Mode
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setFastEntryMode(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  Scan roll number or secret number to instantly find and enter marks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      ref={fastEntryInputRef}
                      value={fastEntryValue}
                      onChange={(e) => setFastEntryValue(e.target.value)}
                      onKeyDown={handleFastEntryKeyDown}
                      placeholder="Scan roll number or secret number..."
                      className="flex-1"
                    />
                    <Button onClick={() => handleFastEntry(fastEntryValue)}>
                      Find Student
                    </Button>
                  </div>
                  {fastEntryError && (
                    <p className="text-sm text-destructive">{fastEntryError}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search and Fast Entry Toggle */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('exams.marksEntry') || 'Marks Entry'}</CardTitle>
                <Button
                  variant={fastEntryMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFastEntryMode(!fastEntryMode)}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {fastEntryMode ? 'Exit Fast Entry' : 'Fast Entry Mode'}
                </Button>
              </div>
              <CardDescription>
                {selectedSubject.subject?.name || 'Subject'} | Total: {selectedSubject.totalMarks || 'N/A'} | Passing: {selectedSubject.passingMarks || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-sm">Search by Admission No</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchAdmission}
                      onChange={(e) => setSearchAdmission(e.target.value)}
                      placeholder="Admission number..."
                      className="pl-8"
                    />
                    {searchAdmission && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setSearchAdmission('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Search by Roll Number</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchRollNumber}
                      onChange={(e) => setSearchRollNumber(e.target.value)}
                      placeholder="Roll number..."
                      className="pl-8"
                    />
                    {searchRollNumber && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setSearchRollNumber('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Search by Secret Number</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchSecretNumber}
                      onChange={(e) => setSearchSecretNumber(e.target.value)}
                      placeholder="Secret number..."
                      className="pl-8"
                    />
                    {searchSecretNumber && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-7 w-7 p-0"
                        onClick={() => setSearchSecretNumber('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>
                          <SortButton field="name">Student Name</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="rollNumber">Roll Number</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="secretNumber">Secret Number</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="admissionNo">Admission No</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="marks">Marks</SortButton>
                        </TableHead>
                        <TableHead>Present/Absent</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => {
                          const result = examResults?.find((r) => r.examStudentId === student.id);
                          const inputRef = studentInputRefs.current[student.id] || { current: null };
                          if (!studentInputRefs.current[student.id]) {
                            studentInputRefs.current[student.id] = { current: null };
                          }
                          return (
                            <StudentMarksRow
                              key={student.id}
                              student={student}
                              examSubject={selectedSubject}
                              examId={selectedExamId}
                              result={result}
                              onMarksChange={handleMarksChange}
                              hasUpdate={hasUpdate}
                              isHighlighted={highlightedStudentId === student.id}
                              marksInputRef={inputRef}
                            />
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedSubject && (!examStudents || examStudents.length === 0) && (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              {t('exams.noStudentsEnrolled') || 'No students enrolled for this exam class.'}
            </p>
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
