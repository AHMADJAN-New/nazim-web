import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useExams,
  useExam,
  useExamClasses,
  useExamStudents,
  useEnrollStudent,
  useBulkEnrollStudents,
  useRemoveStudentFromExam,
  useEnrollAllStudents,
  useEnrollmentStats,
} from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { Exam, ExamClass, ExamStudent } from '@/types/domain/exam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Trash2, 
  Users, 
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BookOpen,
  UserPlus,
  X,
  ArrowLeft,
  UsersRound,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ExamStudentEnrollment() {
  const { t } = useLanguage();
  const { examId: urlExamId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Data fetching - only fetch exams list if no examId in URL
  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  // Fetch single exam if examId is in URL
  const { data: urlExam, isLoading: urlExamLoading } = useExam(urlExamId);
  
  // State
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedExamClass, setSelectedExamClass] = useState<ExamClass | null>(null);
  
  // Fetch enrollment stats when exam is selected
  const { data: enrollmentStats } = useEnrollmentStats(selectedExam?.id);
  const enrollAllStudents = useEnrollAllStudents();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [studentToRemove, setStudentToRemove] = useState<ExamStudent | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  // Fetch exam classes and students
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExam?.id);
  const { data: enrolledStudents, isLoading: studentsLoading } = useExamStudents(
    selectedExam?.id,
    selectedExamClass?.id
  );

  // Fetch available students from admissions
  const { data: studentAdmissions, isLoading: admissionsLoading } = useStudentAdmissions(
    organizationId,
    false
  );

  // Filter students by class academic year and exclude already enrolled
  const availableStudents = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    if (!selectedExamClass?.classAcademicYearId) return [];
    
    // Filter by class academic year
    const classStudents = studentAdmissions.filter(sa => 
      sa.classAcademicYearId === selectedExamClass.classAcademicYearId
    );
    
    // Filter out already enrolled students
    if (!enrolledStudents || !Array.isArray(enrolledStudents)) return classStudents;
    
    const enrolledAdmissionIds = new Set(
      enrolledStudents.map(es => es.studentAdmissionId)
    );
    
    return classStudents.filter(sa => 
      sa.id && !enrolledAdmissionIds.has(sa.id)
    );
  }, [studentAdmissions, enrolledStudents, selectedExamClass?.classAcademicYearId]);

  // Filter students by search query
  const filteredAvailableStudents = useMemo(() => {
    if (!searchQuery) return availableStudents;
    const query = searchQuery.toLowerCase();
    return availableStudents.filter(student => {
      const fullName = `${student.student?.fullName || ''}`.toLowerCase();
      const admissionNo = `${student.admissionNo || ''}`.toLowerCase();
      return fullName.includes(query) || admissionNo.includes(query);
    });
  }, [availableStudents, searchQuery]);

  // Set exam from URL params when available
  useEffect(() => {
    if (urlExam && !selectedExam) {
      setSelectedExam(urlExam);
    }
  }, [urlExam, selectedExam]);

  // Auto-select first exam class when exam is selected
  useEffect(() => {
    if (examClasses && examClasses.length > 0 && !selectedExamClass) {
      setSelectedExamClass(examClasses[0]);
    }
  }, [examClasses, selectedExamClass]);

  // Mutations
  const enrollStudent = useEnrollStudent();
  const bulkEnrollStudents = useBulkEnrollStudents();
  const removeStudent = useRemoveStudentFromExam();

  const hasAssign = useHasPermission('exams.assign');

  // Handlers
  const handleEnroll = () => {
    if (!selectedExam?.id || !selectedExamClass?.id || !selectedStudentId) return;
    
    enrollStudent.mutate({
      exam_id: selectedExam.id,
      exam_class_id: selectedExamClass.id,
      student_admission_id: selectedStudentId,
    }, {
      onSuccess: () => {
        setSelectedStudentId('');
      }
    });
  };

  const handleBulkEnroll = () => {
    if (!selectedExam?.id || !selectedExamClass?.id || selectedStudentIds.length === 0) return;
    
    // Enroll students one by one (could be optimized with a bulk API endpoint)
    selectedStudentIds.forEach((studentAdmissionId) => {
      enrollStudent.mutate({
        exam_id: selectedExam.id,
        exam_class_id: selectedExamClass.id,
        student_admission_id: studentAdmissionId,
      });
    });
    
    setSelectedStudentIds([]);
    setShowBulkEnroll(false);
  };

  const handleRemoveStudent = () => {
    if (!studentToRemove) return;
    removeStudent.mutate(studentToRemove.id, {
      onSuccess: () => {
        setIsRemoveDialogOpen(false);
        setStudentToRemove(null);
      }
    });
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Stats
  const stats = useMemo(() => ({
    totalEnrolled: enrolledStudents?.length ?? 0,
    availableCount: availableStudents.length,
    selectedCount: selectedStudentIds.length,
  }), [enrolledStudents?.length, availableStudents.length, selectedStudentIds.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {urlExamId && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('exams.studentEnrollment') || 'Student Enrollment'}</h1>
              <p className="text-muted-foreground mt-1">
                {t('exams.studentEnrollmentDescription') || 'Enroll students in exams by class'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedExam && selectedExamClass && (
              <>
                <Badge variant="outline" className="gap-1 py-1.5 px-3">
                  <GraduationCap className="h-3 w-3" />
                  {selectedExam.name}
                </Badge>
                <Badge className="gap-1 py-1.5 px-3">
                  {selectedExamClass.classAcademicYear?.class?.name}
                  {selectedExamClass.classAcademicYear?.sectionName && ` - ${selectedExamClass.classAcademicYear.sectionName}`}
                </Badge>
              </>
            )}
            {selectedExam && hasAssign && (
              <Button 
                variant="default"
                onClick={() => enrollAllStudents.mutate(selectedExam.id)}
                disabled={enrollAllStudents.isPending}
              >
                <UsersRound className="h-4 w-4 mr-2" />
                {t('exams.enrollAllClasses') || 'Enroll All Classes'}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 border-sky-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('exams.enrolled') || 'Enrolled'}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.totalEnrolled}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-sky-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('exams.available') || 'Available'}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.availableCount}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('exams.selected') || 'Selected'}
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.selectedCount}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Exam & Class Selector - Left Panel */}
          <div className="lg:col-span-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('exams.selectExamAndClass') || 'Select Exam & Class'}</CardTitle>
                <CardDescription>
                  {t('exams.selectExamAndClassDescription') || 'Choose an exam and class to enroll students'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Exam Selection */}
                <div>
                  <Label>{t('exams.exam') || 'Exam'}</Label>
                  <Select
                    value={selectedExam?.id || ''}
                    onValueChange={(value) => {
                      const exam = exams?.find(e => e.id === value);
                      setSelectedExam(exam || null);
                      setSelectedExamClass(null);
                    }}
                    disabled={examsLoading}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                    </SelectTrigger>
                    <SelectContent>
                      {examsLoading ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t('common.loading') || 'Loading...'}
                        </div>
                      ) : !exams || exams.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          {t('exams.noExamsFound') || 'No exams found'}
                        </div>
                      ) : (
                        exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name} ({exam.academicYear?.name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Class Selection */}
                {selectedExam && (
                  <div>
                    <Label>{t('exams.class') || 'Class'}</Label>
                    <Select
                      value={selectedExamClass?.id || ''}
                      onValueChange={(value) => {
                        const examClass = examClasses?.find(ec => ec.id === value);
                        setSelectedExamClass(examClass || null);
                      }}
                      disabled={classesLoading}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('exams.selectClass') || 'Select class'} />
                      </SelectTrigger>
                      <SelectContent>
                        {classesLoading ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {t('common.loading') || 'Loading...'}
                          </div>
                        ) : !examClasses || examClasses.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            {t('exams.noClassesAssigned') || 'No classes assigned to this exam'}
                          </div>
                        ) : (
                          examClasses.map((examClass) => (
                            <SelectItem key={examClass.id} value={examClass.id}>
                              {examClass.classAcademicYear?.class?.name}
                              {examClass.classAcademicYear?.sectionName && ` - ${examClass.classAcademicYear.sectionName}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!selectedExam && (
                  <div className="text-center py-8 rounded-lg border-2 border-dashed">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('exams.selectExamFirst') || 'Select an exam to get started'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enrollment Panel - Right */}
          <div className="lg:col-span-8 space-y-4">
            {!selectedExam || !selectedExamClass ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-16">
                  <div className="text-center">
                    <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <h3 className="text-lg font-medium mt-4">
                      {t('exams.selectExamAndClassPrompt') || 'Select an exam and class to enroll students'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('exams.selectExamAndClassHint') || 'Choose an exam and class from the left panel'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Two Column Layout: Available Students | Selected Students */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Available Students Section */}
                  <Card className="border-violet-200 dark:border-violet-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-violet-600" />
                            {t('exams.availableStudents') || 'Available Students'}
                          </CardTitle>
                          <CardDescription>
                            {stats.availableCount} {t('exams.studentsAvailable') || 'students available'}
                          </CardDescription>
                        </div>
                        {stats.availableCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Select all available students
                              const allIds = filteredAvailableStudents.map(s => s.id).filter(Boolean) as string[];
                              setSelectedStudentIds(prev => {
                                const newIds = [...new Set([...prev, ...allIds])];
                                return newIds;
                              });
                            }}
                          >
                            {t('exams.selectAll') || 'Select All'}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={t('exams.searchStudents') || 'Search students...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                          />
                          {searchQuery && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 h-7 w-7"
                              onClick={() => setSearchQuery('')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {admissionsLoading ? (
                          <Skeleton className="h-64 w-full" />
                        ) : filteredAvailableStudents.length === 0 ? (
                          <div className="p-8 text-sm text-muted-foreground text-center rounded-lg border-2 border-dashed">
                            {searchQuery 
                              ? t('exams.noStudentsMatchSearch') || 'No students match your search'
                              : t('exams.allStudentsEnrolled') || 'All students enrolled'}
                          </div>
                        ) : (
                          <ScrollArea className="h-[400px] border rounded-lg p-3">
                            <div className="space-y-2">
                              {filteredAvailableStudents.map((student) => (
                                <div 
                                  key={student.id} 
                                  className={cn(
                                    "flex items-center space-x-3 p-2 rounded-lg border transition-colors",
                                    selectedStudentIds.includes(student.id)
                                      ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800"
                                      : "hover:bg-muted/50 border-transparent"
                                  )}
                                >
                                  <Checkbox
                                    id={`available-${student.id}`}
                                    checked={selectedStudentIds.includes(student.id)}
                                    onCheckedChange={() => toggleStudentSelection(student.id)}
                                  />
                                  <label
                                    htmlFor={`available-${student.id}`}
                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                  >
                                    <div className="font-semibold">
                                      {student.student?.fullName || 'Unknown Student'}
                                    </div>
                                    {student.admissionNo && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {t('students.admissionNo') || 'Admission No'}: {student.admissionNo}
                                      </div>
                                    )}
                                  </label>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => toggleStudentSelection(student.id)}
                                  >
                                    {selectedStudentIds.includes(student.id) ? (
                                      <X className="h-4 w-4" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Selected Students Section */}
                  <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            {t('exams.selectedStudents') || 'Selected Students'}
                          </CardTitle>
                          <CardDescription>
                            {selectedStudentIds.length} {t('exams.studentsSelected') || 'students selected'}
                          </CardDescription>
                        </div>
                        {selectedStudentIds.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStudentIds([])}
                          >
                            {t('exams.clearAll') || 'Clear All'}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedStudentIds.length === 0 ? (
                        <div className="p-8 text-sm text-muted-foreground text-center rounded-lg border-2 border-dashed">
                          {t('exams.noStudentsSelected') || 'No students selected. Select students from the left panel.'}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <ScrollArea className="h-[400px] border rounded-lg p-3">
                            <div className="space-y-2">
                              {selectedStudentIds.map((studentId) => {
                                const student = availableStudents.find(s => s.id === studentId);
                                if (!student) return null;
                                return (
                                  <div 
                                    key={studentId}
                                    className="flex items-center space-x-3 p-2 rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm truncate">
                                        {student.student?.fullName || 'Unknown Student'}
                                      </div>
                                      {student.admissionNo && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {t('students.admissionNo') || 'Admission No'}: {student.admissionNo}
                                        </div>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => toggleStudentSelection(studentId)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                          <div className="pt-3 border-t">
                            <Button
                              onClick={handleBulkEnroll}
                              disabled={selectedStudentIds.length === 0 || enrollStudent.isPending}
                              className="w-full"
                              size="lg"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              {t('exams.enrollSelected') || `Enroll ${selectedStudentIds.length} Student(s)`}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Enroll Section (Single Student) */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      {t('exams.quickEnroll') || 'Quick Enroll Single Student'}
                    </CardTitle>
                    <CardDescription>
                      {t('exams.quickEnrollDescription') || 'Enroll a single student quickly'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label>{t('exams.selectStudent') || 'Select Student'}</Label>
                        <Select
                          value={selectedStudentId}
                          onValueChange={setSelectedStudentId}
                          disabled={admissionsLoading}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={
                              admissionsLoading
                                ? (t('common.loading') || 'Loading...')
                                : (t('exams.selectStudentToEnroll') || 'Select a student to enroll')
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {admissionsLoading ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                {t('common.loading') || 'Loading students...'}
                              </div>
                            ) : availableStudents.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                {t('exams.allStudentsEnrolled') || 'All students enrolled'}
                              </div>
                            ) : (
                              availableStudents.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                  {student.student?.fullName || student.admissionNo || student.id}
                                  {student.admissionNo && ` (${student.admissionNo})`}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleEnroll}
                        disabled={!selectedStudentId || enrollStudent.isPending || admissionsLoading}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('exams.enroll') || 'Enroll'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Enrolled Students List */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {t('exams.enrolledStudents') || 'Enrolled Students'}
                      <Badge variant="secondary" className="ml-1">{stats.totalEnrolled}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {t('exams.enrolledStudentsDescription') || 'Students enrolled in this exam class'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {studentsLoading ? (
                      <Skeleton className="h-32 w-full" />
                    ) : !enrolledStudents || enrolledStudents.length === 0 ? (
                      <div className="text-center py-12 rounded-lg border-2 border-dashed">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
                        <h3 className="font-medium mt-3">{t('exams.noStudentsEnrolled') || 'No students enrolled yet'}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('exams.enrollStudentsHint') || 'Enroll students above to get started'}
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('students.admissionNo') || 'Admission No'}</TableHead>
                            <TableHead>{t('students.name') || 'Name'}</TableHead>
                            <TableHead>{t('students.class') || 'Class'}</TableHead>
                            <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {enrolledStudents.map((examStudent) => (
                            <TableRow key={examStudent.id}>
                              <TableCell className="font-medium">
                                {examStudent.studentAdmission?.admissionNo || '—'}
                              </TableCell>
                              <TableCell>
                                {examStudent.studentAdmission?.student?.fullName || '—'}
                              </TableCell>
                              <TableCell>
                                {examStudent.examClass?.classAcademicYear?.class?.name || '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {hasAssign && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setStudentToRemove(examStudent);
                                      setIsRemoveDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Remove Student Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.removeStudent') || 'Remove Student'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.removeStudentConfirm') || 'Are you sure you want to remove this student from the exam? This action cannot be undone.'}
              {studentToRemove && (
                <span className="block mt-2 font-semibold">
                  {studentToRemove.studentAdmission?.student?.fullName || studentToRemove.studentAdmission?.admissionNo}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveStudent} 
              className="bg-destructive text-destructive-foreground"
            >
              {t('common.remove') || 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

