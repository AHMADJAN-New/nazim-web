import { useState, useMemo, memo } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { courseStudentsApi } from '@/lib/api/client';
import { mapCourseStudentApiToDomain } from '@/mappers/courseStudentMapper';
import type * as Api from '@/types/api/courseStudent';
import type { CourseStudent } from '@/types/domain/courseStudent';
import { Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface AssignToCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormValues {
  studentId: string;
  courseId: string;
  registrationDate: string;
  feePaid: boolean;
  feeAmount?: number;
}

export const AssignToCourseDialog = memo(function AssignToCourseDialog({
  open,
  onOpenChange,
  onSuccess,
}: AssignToCourseDialogProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  
  // Get all course students for selection
  const { data: allStudents, isLoading: studentsLoading } = useCourseStudents(undefined, false);
  const { data: courses } = useShortTermCourses();

  const openCourses = (courses || []).filter((c) => c.status === 'open' || c.status === 'draft');

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      studentId: '',
      courseId: '',
      registrationDate: new Date().toISOString().split('T')[0],
      feePaid: false,
      feeAmount: undefined,
    },
  });

  const selectedCourseId = watch('courseId');
  const selectedStudentId = watch('studentId');

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];
    if (!search.trim()) return allStudents;
    
    const searchLower = search.toLowerCase();
    return allStudents.filter((s) =>
      s.fullName.toLowerCase().includes(searchLower) ||
      s.admissionNo.toLowerCase().includes(searchLower) ||
      s.fatherName?.toLowerCase().includes(searchLower) ||
      s.guardianPhone?.includes(search)
    );
  }, [allStudents, search]);

  // Get selected student
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId || !allStudents) return null;
    return allStudents.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, allStudents]);

  // Get selected course
  const selectedCourse = useMemo(() => {
    if (!selectedCourseId || !courses) return null;
    return courses.find((c) => c.id === selectedCourseId) || null;
  }, [selectedCourseId, courses]);

  // Check if student is already enrolled in selected course
  const isAlreadyEnrolled = useMemo(() => {
    if (!selectedStudent || !selectedCourseId || !allStudents) return false;
    
    return allStudents.some((s) => {
      if (s.id === selectedStudent.id) return false; // Don't check the same record
      if (s.courseId !== selectedCourseId) return false; // Must be in the selected course
      
      // Check by main_student_id if available
      if (selectedStudent.mainStudentId && s.mainStudentId) {
        return s.mainStudentId === selectedStudent.mainStudentId;
      }
      
      // Check by name matching
      return s.fullName === selectedStudent.fullName && 
             s.fatherName === selectedStudent.fatherName;
    });
  }, [selectedStudent, selectedCourseId, allStudents]);

  const enrollMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Call the new backend endpoint
      const result = await courseStudentsApi.enrollToNewCourse(data.studentId, {
        course_id: data.courseId,
        registration_date: data.registrationDate,
        fee_paid: data.feePaid,
        fee_amount: data.feeAmount,
      });
      return mapCourseStudentApiToDomain(result as Api.CourseStudent);
    },
    onSuccess: async () => {
      toast.success('Student enrolled in new course successfully');
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
      reset();
      setSearch('');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to enroll student in new course');
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (isAlreadyEnrolled) {
      toast.error('Student is already enrolled in this course');
      return;
    }
    await enrollMutation.mutateAsync(values);
  };

  const handleClose = () => {
    reset();
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Student to New Course</DialogTitle>
          <DialogDescription>
            Select an existing course student and assign them to a new course. Their personal information will be copied to the new enrollment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Student Search and Selection */}
          <div className="space-y-2">
            <Label>Search Student</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.searchStudentPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {studentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {search ? 'No students found' : 'Start typing to search for students'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStudents.map((student) => {
                      const course = courses?.find((c) => c.id === student.courseId);
                      return (
                        <label
                          key={student.id}
                          className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            {...register('studentId', { required: 'Please select a student' })}
                            value={student.id}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{student.fullName}</div>
                            <div className="text-sm text-muted-foreground">
                              {student.fatherName && `Father: ${student.fatherName}`}
                              {student.admissionNo && ` • Admission: ${student.admissionNo}`}
                            </div>
                            {course && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Current Course: {course.name}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {errors.studentId && (
              <p className="text-sm text-destructive">{errors.studentId.message}</p>
            )}
          </div>

          {/* Selected Student Info */}
          {selectedStudent && (
            <div className="p-3 bg-muted rounded-md space-y-1">
              <div className="text-sm font-medium">Selected Student</div>
              <div className="text-sm text-muted-foreground">
                {selectedStudent.fullName}
                {selectedStudent.fatherName && ` • ${selectedStudent.fatherName}`}
                {selectedStudent.guardianPhone && ` • ${selectedStudent.guardianPhone}`}
              </div>
            </div>
          )}

          {/* Course Selection */}
          <div className="space-y-2">
            <Label htmlFor="courseId">New Course *</Label>
            <Controller
              name="courseId"
              control={control}
              rules={{ required: 'Course is required' }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {openCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.courseId && (
              <p className="text-sm text-destructive">{errors.courseId.message}</p>
            )}
            {isAlreadyEnrolled && selectedCourse && (
              <p className="text-sm text-amber-600">
                ⚠️ This student is already enrolled in "{selectedCourse.name}"
              </p>
            )}
          </div>

          {/* Registration Date */}
          <div className="space-y-2">
            <Label htmlFor="registrationDate">Registration Date *</Label>
            <Input
              id="registrationDate"
              type="date"
              {...register('registrationDate', { required: 'Registration date is required' })}
            />
            {errors.registrationDate && (
              <p className="text-sm text-destructive">{errors.registrationDate.message}</p>
            )}
          </div>

          {/* Fee Information */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Controller
                name="feePaid"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="feePaid"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="feePaid" className="cursor-pointer">
                Fee Paid
              </Label>
            </div>

            {watch('feePaid') && (
              <div className="space-y-2">
                <Label htmlFor="feeAmount">Fee Amount</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={selectedCourse?.feeAmount ? `Default: ${selectedCourse.feeAmount}` : 'Enter amount'}
                  {...register('feeAmount', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Fee amount must be positive' },
                  })}
                />
                {errors.feeAmount && (
                  <p className="text-sm text-destructive">{errors.feeAmount.message}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isAlreadyEnrolled}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enrolling...
                </>
              ) : (
                'Assign to Course'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

