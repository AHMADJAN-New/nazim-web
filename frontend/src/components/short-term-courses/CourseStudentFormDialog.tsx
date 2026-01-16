import { useQueryClient } from '@tanstack/react-query';
import { useEffect, memo, useState as useReactState } from 'react';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';

import { CourseStudentPictureUpload } from './CourseStudentPictureUpload';

import { Button } from '@/components/ui/button';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useCourseStudentPictureUpload } from '@/hooks/useCourseStudentPictureUpload';
import { useCreateCourseStudent, useUpdateCourseStudent } from '@/hooks/useCourseStudents';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import type { CourseStudent } from '@/types/domain/courseStudent';


interface CourseStudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: CourseStudent | null;
  courseId?: string;
  onSuccess?: () => void;
}

interface StudentFormValues {
  courseId: string;
  admissionNo?: string;
  registrationDate: string;
  fullName: string;
  fatherName: string;
  grandfatherName: string;
  motherName: string;
  gender: 'male' | 'female';
  birthYear: number | undefined;
  birthDate: string;
  age: number | undefined;
  origProvince: string;
  origDistrict: string;
  origVillage: string;
  currProvince: string;
  currDistrict: string;
  currVillage: string;
  nationality: string;
  preferredLanguage: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  homeAddress: string;
  isOrphan: boolean;
  disabilityStatus: string;
  feePaid: boolean;
  feeAmount: number | undefined;
}

export const CourseStudentFormDialog = memo(function CourseStudentFormDialog({
  open,
  onOpenChange,
  student,
  courseId,
  onSuccess,
}: CourseStudentFormDialogProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const isEdit = !!student;
  const createMutation = useCreateCourseStudent();
  const updateMutation = useUpdateCourseStudent();
  const { data: courses } = useShortTermCourses();
  const [selectedPictureFile, setSelectedPictureFile] = useReactState<File | null>(null);
  const pictureUpload = useCourseStudentPictureUpload();
  const queryClient = useQueryClient();

  const openCourses = (courses || []).filter((c) => c.status === 'open' || c.status === 'draft');

  const form = useForm<StudentFormValues>({
    defaultValues: {
      courseId: courseId || '',
      admissionNo: '',
      registrationDate: new Date().toISOString().split('T')[0],
      fullName: '',
      fatherName: '',
      grandfatherName: '',
      motherName: '',
      gender: 'male',
      birthYear: undefined,
      birthDate: '',
      age: undefined,
      origProvince: '',
      origDistrict: '',
      origVillage: '',
      currProvince: '',
      currDistrict: '',
      currVillage: '',
      nationality: 'Afghan',
      preferredLanguage: 'Dari',
      guardianName: '',
      guardianRelation: '',
      guardianPhone: '',
      homeAddress: '',
      isOrphan: false,
      disabilityStatus: '',
      feePaid: false,
      feeAmount: undefined,
    },
  });
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open) return;
    if (student) {
      reset({
        courseId: student.courseId || '',
        admissionNo: student.admissionNo || '',
        registrationDate: student.registrationDate || new Date().toISOString().split('T')[0],
        fullName: student.fullName || '',
        fatherName: student.fatherName || '',
        grandfatherName: student.grandfatherName || '',
        motherName: student.motherName || '',
        gender: (student.gender as 'male' | 'female') || 'male',
        birthYear: student.birthYear ?? undefined,
        birthDate: student.birthDate || '',
        age: student.age ?? undefined,
        origProvince: student.origProvince || '',
        origDistrict: student.origDistrict || '',
        origVillage: student.origVillage || '',
        currProvince: student.currProvince || '',
        currDistrict: student.currDistrict || '',
        currVillage: student.currVillage || '',
        nationality: student.nationality || 'Afghan',
        preferredLanguage: student.preferredLanguage || 'Dari',
        guardianName: student.guardianName || '',
        guardianRelation: student.guardianRelation || '',
        guardianPhone: student.guardianPhone || '',
        homeAddress: student.homeAddress || '',
        isOrphan: student.isOrphan ?? false,
        disabilityStatus: student.disabilityStatus || '',
        feePaid: student.feePaid ?? false,
        feeAmount: student.feeAmount ?? undefined,
      });
    } else {
      reset({
        courseId: courseId || '',
        admissionNo: '',
        registrationDate: new Date().toISOString().split('T')[0],
        fullName: '',
        fatherName: '',
        grandfatherName: '',
        motherName: '',
        gender: 'male',
        birthYear: undefined,
        birthDate: '',
        age: undefined,
        origProvince: '',
        origDistrict: '',
        origVillage: '',
        currProvince: '',
        currDistrict: '',
        currVillage: '',
        nationality: 'Afghan',
        preferredLanguage: 'Dari',
        guardianName: '',
        guardianRelation: '',
        guardianPhone: '',
        homeAddress: '',
        isOrphan: false,
        disabilityStatus: '',
        feePaid: false,
        feeAmount: undefined,
      });
    }
  }, [open, student, courseId, reset]);

  const onSubmit = async (values: StudentFormValues) => {
    if (import.meta.env.DEV) {
      console.log('[CourseStudentFormDialog] FORM SUBMITTED with values:', values);
      console.log('[CourseStudentFormDialog] Form state:', {
        isValid: form.formState.isValid,
        isDirty: form.formState.isDirty,
        errors: form.formState.errors,
        isSubmitting: form.formState.isSubmitting,
      });
    }
    const payload: Partial<CourseStudent> = {
      courseId: values.courseId,
      admissionNo: values.admissionNo || undefined, // Let backend auto-generate if empty
      registrationDate: values.registrationDate,
      fullName: values.fullName,
      fatherName: values.fatherName || null,
      grandfatherName: values.grandfatherName || null,
      motherName: values.motherName || null,
      gender: values.gender || null,
      birthYear: values.birthYear ?? null,
      birthDate: values.birthDate || null,
      age: values.age ?? null,
      origProvince: values.origProvince || null,
      origDistrict: values.origDistrict || null,
      origVillage: values.origVillage || null,
      currProvince: values.currProvince || null,
      currDistrict: values.currDistrict || null,
      currVillage: values.currVillage || null,
      nationality: values.nationality || null,
      preferredLanguage: values.preferredLanguage || null,
      guardianName: values.guardianName || null,
      guardianRelation: values.guardianRelation || null,
      guardianPhone: values.guardianPhone || null,
      homeAddress: values.homeAddress || null,
      isOrphan: values.isOrphan ?? null,
      disabilityStatus: values.disabilityStatus || null,
      feePaid: values.feePaid ?? false,
      feeAmount: values.feeAmount ?? null,
    };

    if (isEdit && student) {
      await updateMutation.mutateAsync({ id: student.id, data: payload });
      // Picture upload is handled by the CourseStudentPictureUpload component in edit mode
    } else {
      const newStudent = await createMutation.mutateAsync(payload);
      // Upload picture if one was selected during creation
      if (selectedPictureFile && newStudent?.id && profile?.organization_id) {
        try {
          const uploadResult = await pictureUpload.mutateAsync({
            courseStudentId: newStudent.id,
            organizationId: profile.organization_id,
            schoolId: profile.default_school_id || null,
            file: selectedPictureFile,
          });
          
          if (import.meta.env.DEV) {
            console.log('[CourseStudentFormDialog] Picture uploaded after creation:', uploadResult);
          }
          
          // Force refresh the student data to get the updated picture_path
          // The mutation already invalidates queries, but we can also manually refetch
          await queryClient.refetchQueries({ queryKey: ['course-students'] });
        } catch (error) {
          // Picture upload failed, but student was created - log error but don't block
          if (import.meta.env.DEV) {
            console.error('[CourseStudentFormDialog] Failed to upload picture after creation:', error);
          }
        }
      }
    }
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Course Student' : 'Register Course Student'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the student details below.' : 'Fill in the details to register a new student in a short-term course.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="guardian">Guardian & Fee</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseId">Course *</Label>
                  <Controller
                    name="courseId"
                    control={control}
                    rules={{ required: 'Course is required' }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('events.selectCourse')} />
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
                  {errors.courseId && <p className="text-sm text-destructive mt-1">{errors.courseId.message}</p>}
                </div>

                <div>
                  <CalendarFormField control={control} name="registrationDate" label="Registration Date" required />
                </div>

                <div>
                  <Label htmlFor="admissionNo">Admission No</Label>
                  <Input
                    id="admissionNo"
                    placeholder={t('events.autoGenerated')}
                    {...register('admissionNo')}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('events.autoGenerated')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Student full name"
                    {...register('fullName', { required: t('userManagement.fullNameRequired') })}
                  />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <Label htmlFor="fatherName">Father Name</Label>
                  <Input
                    id="fatherName"
                    placeholder="Father name"
                    {...register('fatherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="grandfatherName">Grandfather Name</Label>
                  <Input
                    id="grandfatherName"
                    placeholder="Grandfather name"
                    {...register('grandfatherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="motherName">Mother Name</Label>
                  <Input
                    id="motherName"
                    placeholder="Mother name"
                    {...register('motherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="birthYear">Birth Year</Label>
                  <Input
                    id="birthYear"
                    type="number"
                    placeholder="1387"
                    {...register('birthYear', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <CalendarFormField control={control} name="birthDate" label="Birth Date" />
                </div>

                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="e.g., 18"
                    {...register('age', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    placeholder="Afghan"
                    {...register('nationality')}
                  />
                </div>

                <div>
                  <Label htmlFor="preferredLanguage">Preferred Language</Label>
                  <Input
                    id="preferredLanguage"
                    placeholder="Dari / Pashto"
                    {...register('preferredLanguage')}
                  />
                </div>
              </div>

              {/* Student Picture Upload */}
              <div className="mt-4">
                <CourseStudentPictureUpload
                  courseStudentId={student?.id}
                  organizationId={profile?.organization_id}
                  schoolId={profile?.default_school_id || null}
                  currentFileName={student?.picturePath || null}
                  onFileSelected={setSelectedPictureFile}
                  allowUploadWithoutStudent={!isEdit}
                />
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origProvince">Origin Province</Label>
                  <Input
                    id="origProvince"
                    placeholder="Province"
                    {...register('origProvince')}
                  />
                </div>

                <div>
                  <Label htmlFor="origDistrict">Origin District</Label>
                  <Input
                    id="origDistrict"
                    placeholder="District"
                    {...register('origDistrict')}
                  />
                </div>

                <div>
                  <Label htmlFor="origVillage">Origin Village</Label>
                  <Input
                    id="origVillage"
                    placeholder="Village"
                    {...register('origVillage')}
                  />
                </div>

                <div>
                  <Label htmlFor="currProvince">Current Province</Label>
                  <Input
                    id="currProvince"
                    placeholder="Province"
                    {...register('currProvince')}
                  />
                </div>

                <div>
                  <Label htmlFor="currDistrict">Current District</Label>
                  <Input
                    id="currDistrict"
                    placeholder="District"
                    {...register('currDistrict')}
                  />
                </div>

                <div>
                  <Label htmlFor="currVillage">Current Village</Label>
                  <Input
                    id="currVillage"
                    placeholder="Village"
                    {...register('currVillage')}
                  />
                </div>

                <div className="md:col-span-3">
                  <Label htmlFor="homeAddress">Home Address</Label>
                  <Textarea
                    id="homeAddress"
                    placeholder="Full home address"
                    {...register('homeAddress')}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="guardian" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardianName">Guardian Name</Label>
                  <Input
                    id="guardianName"
                    placeholder="Guardian name"
                    {...register('guardianName')}
                  />
                </div>

                <div>
                  <Label htmlFor="guardianRelation">Relation</Label>
                  <Input
                    id="guardianRelation"
                    placeholder="e.g., Father, Uncle"
                    {...register('guardianRelation')}
                  />
                </div>

                <div>
                  <Label htmlFor="guardianPhone">Guardian Phone</Label>
                  <Input
                    id="guardianPhone"
                    placeholder="Phone number"
                    {...register('guardianPhone')}
                  />
                </div>

                <div>
                  <Label htmlFor="isOrphan">Orphan Status</Label>
                  <Controller
                    name="isOrphan"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ? 'yes' : 'no'} onValueChange={(val) => field.onChange(val === 'yes')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">Has Parents</SelectItem>
                          <SelectItem value="yes">Orphan</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="disabilityStatus">Disability Status</Label>
                  <Input
                    id="disabilityStatus"
                    placeholder="e.g., None, Hearing impairment"
                    {...register('disabilityStatus')}
                  />
                </div>

                <div>
                  <Label htmlFor="feePaid">Fee Status</Label>
                  <Controller
                    name="feePaid"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ? 'paid' : 'pending'} onValueChange={(val) => field.onChange(val === 'paid')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="feeAmount">Fee Amount</Label>
                  <Input
                    id="feeAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="e.g., 5000"
                    {...register('feeAmount', { valueAsNumber: true })}
                  />
                </div>
              </div>
            </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {isEdit ? 'Update Student' : 'Register Student'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

export default CourseStudentFormDialog;
