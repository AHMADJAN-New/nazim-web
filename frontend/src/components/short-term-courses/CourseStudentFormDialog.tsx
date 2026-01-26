import { useQueryClient } from '@tanstack/react-query';
import { useEffect, memo, useState as useReactState, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<string>('basic');
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
    if (!open) {
      setActiveTab('basic');
      return;
    }
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
    <>
      <style>{`
        @media (max-width: 639px) {
          [data-radix-dialog-content][data-state="open"] {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            transform: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-5xl max-h-[100vh] h-[100vh] sm:max-h-[95vh] sm:h-[95vh] w-full sm:w-[95vw] md:w-[90vw] lg:w-full p-0 gap-0 flex flex-col m-0 sm:m-4 rounded-none sm:rounded-lg"
          aria-describedby="course-student-form-description"
        >
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">{isEdit ? t('courses.registrationForm.editCourseStudent') : t('courses.registrationForm.registerCourseStudent')}</DialogTitle>
            <DialogDescription id="course-student-form-description" className="text-sm">
              {isEdit ? t('courses.registrationForm.updateDescription') : t('courses.registrationForm.registerDescription')}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0 px-4 sm:px-6">
                <TabsList className="flex w-full gap-1 h-auto mb-3 sm:mb-4 flex-shrink-0 overflow-x-auto pb-1 scrollbar-hide">
                  <TabsTrigger value="basic" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">{t('courses.registrationForm.basicInfo')}</TabsTrigger>
                  <TabsTrigger value="address" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">{t('courses.registrationForm.address')}</TabsTrigger>
                  <TabsTrigger value="guardian" className="text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 min-w-fit">{t('courses.registrationForm.guardianFee')}</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pb-4 min-h-0">
                  <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="courseId">{t('courses.registrationForm.course')} *</Label>
                  <Controller
                    name="courseId"
                    control={control}
                    rules={{ required: t('courses.registrationForm.courseRequired') }}
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
                  <CalendarFormField control={control} name="registrationDate" label={t('courses.registrationForm.registrationDate')} required />
                </div>

                <div>
                  <Label htmlFor="admissionNo">{t('courses.registrationForm.admissionNo')}</Label>
                  <Input
                    id="admissionNo"
                    placeholder={t('courses.registrationForm.autoGenerated')}
                    {...register('admissionNo')}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('courses.registrationForm.autoGenerated')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="fullName">{t('courses.registrationForm.fullName')} *</Label>
                  <Input
                    id="fullName"
                    placeholder={t('courses.registrationForm.fullNamePlaceholder')}
                    {...register('fullName', { required: t('userManagement.fullNameRequired') })}
                  />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <Label htmlFor="fatherName">{t('courses.registrationForm.fatherName')}</Label>
                  <Input
                    id="fatherName"
                    placeholder={t('courses.registrationForm.fatherNamePlaceholder')}
                    {...register('fatherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="grandfatherName">{t('courses.registrationForm.grandfatherName')}</Label>
                  <Input
                    id="grandfatherName"
                    placeholder={t('courses.registrationForm.grandfatherNamePlaceholder')}
                    {...register('grandfatherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="motherName">{t('courses.registrationForm.motherName')}</Label>
                  <Input
                    id="motherName"
                    placeholder={t('courses.registrationForm.motherNamePlaceholder')}
                    {...register('motherName')}
                  />
                </div>

                <div>
                  <Label htmlFor="gender">{t('courses.registrationForm.gender')}</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('courses.registrationForm.selectGender')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">{t('courses.registrationForm.male')}</SelectItem>
                          <SelectItem value="female">{t('courses.registrationForm.female')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="birthYear">{t('courses.registrationForm.birthYear')}</Label>
                  <Input
                    id="birthYear"
                    type="number"
                    placeholder="1387"
                    {...register('birthYear', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <CalendarFormField control={control} name="birthDate" label={t('courses.registrationForm.birthDate')} />
                </div>

                <div>
                  <Label htmlFor="age">{t('courses.registrationForm.age')}</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder={t('courses.registrationForm.agePlaceholder')}
                    {...register('age', { valueAsNumber: true })}
                  />
                </div>

                <div>
                  <Label htmlFor="nationality">{t('courses.registrationForm.nationality')}</Label>
                  <Input
                    id="nationality"
                    placeholder={t('courses.registrationForm.nationalityPlaceholder')}
                    {...register('nationality')}
                  />
                </div>

                <div>
                  <Label htmlFor="preferredLanguage">{t('courses.registrationForm.preferredLanguage')}</Label>
                  <Input
                    id="preferredLanguage"
                    placeholder={t('courses.registrationForm.preferredLanguagePlaceholder')}
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

                  <TabsContent value="address" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origProvince">{t('courses.registrationForm.originProvince')}</Label>
                  <Input
                    id="origProvince"
                    placeholder={t('courses.registrationForm.originProvince')}
                    {...register('origProvince')}
                  />
                </div>

                <div>
                  <Label htmlFor="origDistrict">{t('courses.registrationForm.originDistrict')}</Label>
                  <Input
                    id="origDistrict"
                    placeholder={t('courses.registrationForm.originDistrict')}
                    {...register('origDistrict')}
                  />
                </div>

                <div>
                  <Label htmlFor="origVillage">{t('courses.registrationForm.originVillage')}</Label>
                  <Input
                    id="origVillage"
                    placeholder={t('courses.registrationForm.originVillage')}
                    {...register('origVillage')}
                  />
                </div>

                <div>
                  <Label htmlFor="currProvince">{t('courses.registrationForm.currentProvince')}</Label>
                  <Input
                    id="currProvince"
                    placeholder={t('courses.registrationForm.currentProvince')}
                    {...register('currProvince')}
                  />
                </div>

                <div>
                  <Label htmlFor="currDistrict">{t('courses.registrationForm.currentDistrict')}</Label>
                  <Input
                    id="currDistrict"
                    placeholder={t('courses.registrationForm.currentDistrict')}
                    {...register('currDistrict')}
                  />
                </div>

                <div>
                  <Label htmlFor="currVillage">{t('courses.registrationForm.currentVillage')}</Label>
                  <Input
                    id="currVillage"
                    placeholder={t('courses.registrationForm.currentVillage')}
                    {...register('currVillage')}
                  />
                </div>

                <div className="md:col-span-3">
                  <Label htmlFor="homeAddress">{t('courses.registrationForm.homeAddress')}</Label>
                  <Textarea
                    id="homeAddress"
                    placeholder={t('courses.registrationForm.homeAddressPlaceholder')}
                    {...register('homeAddress')}
                  />
                </div>
              </div>
                  </TabsContent>

                  <TabsContent value="guardian" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guardianName">{t('courses.registrationForm.guardianName')}</Label>
                  <Input
                    id="guardianName"
                    placeholder={t('courses.registrationForm.guardianNamePlaceholder')}
                    {...register('guardianName')}
                  />
                </div>

                <div>
                  <Label htmlFor="guardianRelation">{t('courses.registrationForm.relation')}</Label>
                  <Input
                    id="guardianRelation"
                    placeholder={t('courses.registrationForm.relationPlaceholder')}
                    {...register('guardianRelation')}
                  />
                </div>

                <div>
                  <Label htmlFor="guardianPhone">{t('courses.registrationForm.guardianPhone')}</Label>
                  <Input
                    id="guardianPhone"
                    placeholder={t('courses.registrationForm.guardianPhonePlaceholder')}
                    {...register('guardianPhone')}
                  />
                </div>

                <div>
                  <Label htmlFor="isOrphan">{t('courses.registrationForm.orphanStatus')}</Label>
                  <Controller
                    name="isOrphan"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ? 'yes' : 'no'} onValueChange={(val) => field.onChange(val === 'yes')}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('courses.registrationForm.selectStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">{t('courses.registrationForm.hasParents')}</SelectItem>
                          <SelectItem value="yes">{t('courses.registrationForm.orphan')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="disabilityStatus">{t('courses.registrationForm.disabilityStatus')}</Label>
                  <Input
                    id="disabilityStatus"
                    placeholder={t('courses.registrationForm.disabilityStatusPlaceholder')}
                    {...register('disabilityStatus')}
                  />
                </div>

                <div>
                  <Label htmlFor="feePaid">{t('courses.registrationForm.feeStatus')}</Label>
                  <Controller
                    name="feePaid"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ? 'paid' : 'pending'} onValueChange={(val) => field.onChange(val === 'paid')}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('courses.registrationForm.selectStatus')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{t('courses.registrationForm.pending')}</SelectItem>
                          <SelectItem value="paid">{t('courses.registrationForm.paid')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="feeAmount">{t('courses.registrationForm.feeAmount')}</Label>
                  <Input
                    id="feeAmount"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={t('courses.registrationForm.feeAmountPlaceholder')}
                    {...register('feeAmount', { valueAsNumber: true })}
                  />
                </div>
              </div>
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="px-4 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 flex-shrink-0 border-t bg-background">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="flex gap-2 flex-1 order-2 sm:order-1">
                    {activeTab !== 'basic' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const tabs = ['basic', 'address', 'guardian'];
                          const currentIndex = tabs.indexOf(activeTab);
                          if (currentIndex > 0) {
                            setActiveTab(tabs[currentIndex - 1]);
                          }
                        }}
                        className="flex-1 sm:flex-initial text-sm"
                      >
                        {t('events.previous') || 'Previous'}
                      </Button>
                    )}
                    {activeTab !== 'guardian' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const tabs = ['basic', 'address', 'guardian'];
                          const currentIndex = tabs.indexOf(activeTab);
                          if (currentIndex < tabs.length - 1) {
                            setActiveTab(tabs[currentIndex + 1]);
                          }
                        }}
                        className="flex-1 sm:flex-initial text-sm"
                      >
                        {t('events.next') || 'Next'}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto text-sm">
                      {t('courses.registrationForm.cancel') || t('events.cancel')}
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                      className="w-full sm:w-auto sm:min-w-[150px] text-sm"
                    >
                      {isEdit ? t('courses.registrationForm.updateStudent') : t('courses.registrationForm.registerStudent')}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default CourseStudentFormDialog;
