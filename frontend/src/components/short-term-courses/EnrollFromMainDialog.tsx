import { Search, UserPlus } from 'lucide-react';
import { useState, useMemo, memo, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnrollFromMain } from '@/hooks/useCourseStudents';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudents } from '@/hooks/useStudents';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';

interface EnrollFromMainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: ShortTermCourse;
  courses?: ShortTermCourse[];
  onSuccess?: () => void;
}

export const EnrollFromMainDialog = memo(function EnrollFromMainDialog({
  open,
  onOpenChange,
  course,
  courses,
  onSuccess,
}: EnrollFromMainDialogProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(course?.id || '');
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [feePaid, setFeePaid] = useState(false);
  
  // Update selectedCourseId when course prop changes
  useEffect(() => {
    if (course?.id) {
      setSelectedCourseId(course.id);
    }
  }, [course?.id]);
  
  const selectedCourse = course || (courses?.find(c => c.id === selectedCourseId));
  const openCourses = courses?.filter(c => c.status === 'open' || c.status === 'draft') || [];

  const { data: studentsData, isLoading, error } = useStudents(undefined, false);
  const enrollMutation = useEnrollFromMain();

  // Handle both paginated and non-paginated responses
  const students = useMemo(() => {
    if (!studentsData) {
      if (import.meta.env.DEV) {
        console.log('[EnrollFromMainDialog] No students data:', { studentsData, error });
      }
      return [];
    }
    // Check if it's a paginated response
    if (typeof studentsData === 'object' && 'data' in studentsData && !Array.isArray(studentsData)) {
      return (studentsData as any).data || [];
    }
    // Otherwise it's an array
    return Array.isArray(studentsData) ? studentsData : [];
  }, [studentsData, error]);

  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students) || students.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[EnrollFromMainDialog] No students to filter:', { students, studentsData });
      }
      return [];
    }
    const searchLower = search.toLowerCase();
    return students.filter((s: any) => {
      // Handle both domain types (camelCase) and API types (snake_case)
      const fullName = s.fullName || s.full_name || '';
      const admissionNo = s.admissionNumber || s.admission_no || '';
      const fatherName = s.fatherName || s.father_name || '';
      return (
        fullName.toLowerCase().includes(searchLower) ||
        admissionNo.toLowerCase().includes(searchLower) ||
        fatherName.toLowerCase().includes(searchLower)
      );
    });
  }, [students, search, studentsData]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleEnroll = async () => {
    if (selectedIds.length === 0) {
      // Show error - no students selected
      return;
    }
    
    if (!selectedCourse) {
      // Show error - no course selected
      return;
    }

    try {
      const result = await enrollMutation.mutateAsync({
        course_id: selectedCourse.id,
        main_student_ids: selectedIds,
        registration_date: registrationDate,
        fee_paid: feePaid,
        fee_amount: selectedCourse.feeAmount ?? undefined,
      });

      // Success - clear selections
      setSelectedIds([]);
      setSearch('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error('[EnrollFromMainDialog] Enrollment failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('courses.enrollFromMainDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {selectedCourse 
              ? t('courses.enrollFromMainDialog.description', { courseName: selectedCourse.name })
              : t('courses.enrollFromMainDialog.descriptionNoCourse')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {openCourses.length > 0 && (
            <div>
              <Label htmlFor="courseSelect" className="text-base font-semibold">
                {t('courses.enrollFromMainDialog.selectCourse')} <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={selectedCourseId} 
                onValueChange={(value) => {
                  setSelectedCourseId(value);
                  // Clear selected students when course changes
                  setSelectedIds([]);
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="courseSelect" className="w-full">
                  <SelectValue placeholder={t('courses.enrollFromMainDialog.selectCoursePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {openCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        {c.feeAmount && (
                          <span className="text-xs text-muted-foreground">
                            {t('courses.enrollFromMainDialog.fee')} {c.feeAmount}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedCourse && selectedCourseId && (
                <p className="text-sm text-destructive mt-1">
                  {t('courses.enrollFromMainDialog.courseNotFound')}
                </p>
              )}
            </div>
          )}
          
          {openCourses.length === 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('courses.enrollFromMainDialog.noOpenCourses')}
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registrationDate">{t('courses.enrollFromMainDialog.registrationDate')}</Label>
              <CalendarDatePicker date={registrationDate ? new Date(registrationDate) : undefined} onDateChange={(date) => setRegistrationDate(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="feePaid"
                checked={feePaid}
                onCheckedChange={(checked) => setFeePaid(checked === true)}
              />
              <Label htmlFor="feePaid" className="cursor-pointer">
                {t('courses.enrollFromMainDialog.markFeeAsPaid')} {selectedCourse?.feeAmount ? `(${selectedCourse.feeAmount})` : ''}
              </Label>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('courses.enrollFromMainDialog.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('courses.enrollFromMainDialog.studentsSelected', { count: selectedIds.length })}</span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedIds.length === filteredStudents.length ? t('courses.enrollFromMainDialog.deselectAll') : t('courses.enrollFromMainDialog.selectAll')}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-4 space-y-2">
                {filteredStudents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 space-y-2">
                    <p>
                      {search ? t('courses.enrollFromMainDialog.noStudentsMatchSearch') : t('courses.enrollFromMainDialog.noStudentsAvailable')}
                    </p>
                    {!isLoading && students.length === 0 && (
                      <p className="text-xs">
                        {t('courses.enrollFromMainDialog.ensureStudentsInMainTable')}
                      </p>
                    )}
                    {!isLoading && students.length > 0 && search && (
                      <p className="text-xs">
                        {t('courses.enrollFromMainDialog.tryDifferentSearch', { count: students.length })}
                      </p>
                    )}
                  </div>
                ) : (
                  filteredStudents.map((student: any) => {
                    const studentId = student.id;
                    const fullName = student.fullName || student.full_name || '-';
                    const fatherName = student.fatherName || student.father_name;
                    const admissionNo = student.admissionNumber || student.admission_no || 'No ID';
                    
                    return (
                      <div
                        key={`enroll-student-${studentId}`}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedIds.includes(studentId)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleToggle(studentId)}
                      >
                        <Checkbox
                          checked={selectedIds.includes(studentId)}
                          onCheckedChange={() => handleToggle(studentId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{fullName}</div>
                          <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
                            {fatherName && (
                              <div className="truncate">{t('courses.enrollFromMainDialog.sonOf')} {fatherName}</div>
                            )}
                            {(student.grandfatherName || student.grandfather_name) && (
                              <div className="truncate text-xs">{t('courses.enrollFromMainDialog.grandsonOf')} {student.grandfatherName || student.grandfather_name}</div>
                            )}
                            {(student.motherName || student.mother_name) && (
                              <div className="truncate text-xs">{t('courses.enrollFromMainDialog.daughterOf')} {student.motherName || student.mother_name}</div>
                            )}
                            {(student.currProvince || student.curr_province) && (
                              <div className="truncate text-xs">
                                {(student.currProvince || student.curr_province)}
                                {(student.currDistrict || student.curr_district) && `, ${student.currDistrict || student.curr_district}`}
                                {(student.currVillage || student.curr_village) && `, ${student.currVillage || student.curr_village}`}
                              </div>
                            )}
                            {(student.guardianName || student.guardian_name) && (
                              <div className="truncate text-xs">{t('courses.enrollFromMainDialog.guardian')} {student.guardianName || student.guardian_name}</div>
                            )}
                            {(student.nationality) && (
                              <div className="truncate text-xs">{t('courses.enrollFromMainDialog.nationality')} {student.nationality}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {admissionNo}
                          </Badge>
                          {(student.gender) && (
                            <Badge variant="secondary" className="text-xs">
                              {student.gender === 'male' ? 'M' : student.gender === 'female' ? 'F' : student.gender}
                            </Badge>
                          )}
                          {(student.birthYear || student.birth_year) && (
                            <span className="text-xs text-muted-foreground">
                              {t('courses.enrollFromMainDialog.born')} {student.birthYear || student.birth_year}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('courses.enrollFromMainDialog.cancel')}
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={selectedIds.length === 0 || !selectedCourse || enrollMutation.isPending}
          >
            {enrollMutation.isPending 
              ? t('courses.enrollFromMainDialog.enrolling')
              : selectedIds.length === 0
              ? t('courses.enrollFromMainDialog.selectStudents')
              : !selectedCourse
              ? t('courses.enrollFromMainDialog.selectCourseButton')
              : t('courses.enrollFromMainDialog.enrollStudents', { 
                  count: selectedIds.length, 
                  courseName: selectedCourse.name
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EnrollFromMainDialog;
