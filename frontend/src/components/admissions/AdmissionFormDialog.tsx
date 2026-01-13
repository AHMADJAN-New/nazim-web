import { zodResolver } from '@hookform/resolvers/zod';
import { User, GraduationCap, Home, FileText, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
import { Textarea } from '@/components/ui/textarea';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudents } from '@/hooks/useStudents';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import {
  useCreateStudentAdmission,
  useUpdateStudentAdmission,
  type StudentAdmission,
  type StudentAdmissionInsert,
  type AdmissionStatus,
} from '@/hooks/useStudentAdmissions';
import { useResourceUsage } from '@/hooks/useSubscription';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

// Helper to convert empty strings to null for UUID fields
const uuidOrNull = z.preprocess(
  (val) => {
    if (val === '' || val === null || val === undefined) return null;
    return val;
  },
  z.string().uuid().nullable().optional()
);

const getAdmissionSchema = (t: ReturnType<typeof useLanguage>['t']) =>
  z.object({
    organization_id: z.string().uuid().optional(),
    school_id: uuidOrNull,
    student_id: z.string().uuid({ message: t('leave.studentRequired') }),
    academic_year_id: uuidOrNull,
    class_id: uuidOrNull,
    class_academic_year_id: uuidOrNull,
    residency_type_id: uuidOrNull,
    room_id: uuidOrNull,
    admission_year: z.string().max(10, t('admissions.admissionYearMaxLength')).optional().nullable(),
    admission_date: z.preprocess(
      (val) => {
        if (val instanceof Date) return val.toISOString().slice(0, 10);
        if (typeof val === 'string') return val;
        return val;
      },
      z.string().max(30, t('admissions.admissionDateTooLong')).optional()
    ),
    enrollment_status: z
      .enum(
        ['pending', 'admitted', 'active', 'inactive', 'suspended', 'withdrawn', 'graduated'] as [
          AdmissionStatus,
          ...AdmissionStatus[],
        ]
      )
      .default('admitted'),
    enrollment_type: z.string().max(50, t('admissions.enrollmentTypeTooLong')).optional().nullable(),
    shift: z.string().max(50, t('admissions.shiftTooLong')).optional().nullable(),
    is_boarder: z.boolean().default(false),
    fee_status: z.string().max(50, t('admissions.feeStatusTooLong')).optional().nullable(),
    placement_notes: z.string().max(500, t('admissions.placementNotesMaxLength')).optional().nullable(),
  });

interface AdmissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission?: StudentAdmission | null;
  admissions?: StudentAdmission[];
}

export function AdmissionFormDialog({
  open,
  onOpenChange,
  admission,
  admissions = [],
}: AdmissionFormDialogProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;
  const isEdit = !!admission;

  // Data
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useStudents(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  
  // Debug: Log students loading state
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[AdmissionFormDialog] Students hook state:', {
        open,
        orgIdForQuery,
        isLoadingStudents,
        studentsCount: students?.length || 0,
        studentsError,
        profile: profile?.organization_id,
        studentsArray: students?.slice(0, 3).map(s => ({ id: s.id, name: s.fullName || s.full_name })),
      });
    }
  }, [open, orgIdForQuery, isLoadingStudents, students, studentsError, profile]);
  const { data: academicYears } = useAcademicYears(orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  // State for academic year -> classAcademicYears
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYear, orgIdForQuery);

  // Mutations
  const createAdmission = useCreateStudentAdmission();
  const updateAdmission = useUpdateStudentAdmission();

  // Usage / limit
  const studentUsage = useResourceUsage('students');
  const isLimitReached = !studentUsage.isUnlimited && studentUsage.remaining === 0;
  const canCreateAdmission = !isLimitReached;

  // Schema + form
  const admissionSchema = useMemo(() => getAdmissionSchema(t), [t]);

  const formMethods = useForm<z.infer<typeof admissionSchema>>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      enrollment_status: 'admitted',
      is_boarder: false,
      admission_year: new Date().getFullYear().toString(),
    },
    mode: 'onSubmit',
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = formMethods;

  // Quick entry mode + step
  const [quickMode, setQuickMode] = useState(true);
  const [tab, setTab] = useState<'basic' | 'academic' | 'residency' | 'additional'>('basic');

  // Watchers
  const formAcademicYear = watch('academic_year_id');
  const isBoarder = watch('is_boarder');
  const studentId = watch('student_id');
  const schoolId = watch('school_id');
  const classAcademicYearId = watch('class_academic_year_id');
  const roomId = watch('room_id');
  const enrollmentStatus = watch('enrollment_status');

  // Refs for keyboard flow
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (formAcademicYear) setSelectedAcademicYear(formAcademicYear);
  }, [formAcademicYear]);

  // Auto-select school if only one exists
  useEffect(() => {
    if (schools && schools.length === 1 && !isEdit && !watch('school_id')) {
      setValue('school_id', schools[0].id, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schools, isEdit, setValue]);

  // Available students (exclude already admitted) when creating
  const admittedStudentIds = useMemo(() => {
    if (!admissions || admissions.length === 0) return new Set<string>();
    const ids = admissions.map((adm) => adm.studentId).filter(Boolean);
    if (import.meta.env.DEV) {
      console.log('[AdmissionFormDialog] Admitted student IDs:', ids);
    }
    return new Set(ids);
  }, [admissions]);
  
  const availableStudents = useMemo(() => {
    // Debug: Log students data
    if (import.meta.env.DEV) {
      console.log('[AdmissionFormDialog] Processing students:', {
        studentsCount: students?.length || 0,
        studentsArray: students?.slice(0, 5).map(s => ({ 
          id: s.id, 
          name: s.fullName || s.full_name,
          admissionNo: s.admissionNumber || s.admission_no 
        })),
        isEdit,
        admittedStudentIdsSize: admittedStudentIds.size,
        admittedIds: Array.from(admittedStudentIds),
        isLoadingStudents,
        studentsError: studentsError?.message,
        orgIdForQuery,
      });
    }
    
    // If still loading, return empty array (will show loading state)
    if (isLoadingStudents) {
      return [];
    }
    
    // If there's an error, log it but still try to show students if available
    if (studentsError) {
      console.error('[AdmissionFormDialog] Error loading students:', studentsError);
      // Even with error, try to return students if they exist (might be stale cache)
    }
    
    // If no students data, return empty
    if (!students || students.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[AdmissionFormDialog] No students found. isLoadingStudents:', isLoadingStudents, 'error:', studentsError?.message, 'orgId:', orgIdForQuery);
      }
      return [];
    }
    
    // When editing, show all students
    if (isEdit) {
      if (import.meta.env.DEV) {
        console.log('[AdmissionFormDialog] Edit mode - showing all students:', students.length);
      }
      return students;
    }
    
    // When creating, filter out already admitted students
    // BUT: If all students are filtered out, show them anyway (might be a data issue)
    const filtered = students.filter((s) => {
      if (!s.id) {
        if (import.meta.env.DEV) {
          console.warn('[AdmissionFormDialog] Student without ID:', s);
        }
        return false;
      }
      const isAdmitted = admittedStudentIds.has(s.id);
      return !isAdmitted;
    });
    
    // If all students are filtered out, show all students anyway (data might be inconsistent)
    const result = filtered.length > 0 ? filtered : students;
    
    if (import.meta.env.DEV) {
      console.log('[AdmissionFormDialog] Filtered students result:', {
        total: students.length,
        filtered: filtered.length,
        finalResult: result.length,
        admitted: admittedStudentIds.size,
        sampleResult: result.slice(0, 3).map(s => ({ id: s.id, name: s.fullName || s.full_name })),
        warning: filtered.length === 0 && students.length > 0 ? 'All students filtered out, showing all anyway' : null,
      });
    }
    
    return result;
  }, [students, admittedStudentIds, isEdit, isLoadingStudents, studentsError, orgIdForQuery]);

  // Options (memoized for performance)
  const studentOptions: ComboboxOption[] = useMemo(() => {
    const list = availableStudents || [];
    if (list.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[AdmissionFormDialog] No student options available');
      }
      return [];
    }
    return list.map((student) => ({
      value: student.id,
      label: `${student.fullName || student.full_name || 'Unknown'} (${student.admissionNumber || student.admission_no || 'N/A'})`,
    }));
  }, [availableStudents]);

  const roomOptions: ComboboxOption[] = useMemo(() => {
    return (
      rooms?.map((room) => ({
        value: room.id,
        label:
          room.roomNumber || room.building?.buildingName
            ? `${room.roomNumber}${room.building?.buildingName ? ` - ${room.building.buildingName}` : ''}`
            : room.id,
      })) || []
    );
  }, [rooms]);

  // Load admission data when editing
  useEffect(() => {
    if (admission && isEdit) {
      if (admission.academicYearId) setSelectedAcademicYear(admission.academicYearId);

      reset({
        organization_id: admission.organizationId,
        school_id: admission.schoolId,
        student_id: admission.studentId,
        academic_year_id: admission.academicYearId,
        class_id: admission.classId,
        class_academic_year_id: admission.classAcademicYearId,
        residency_type_id: admission.residencyTypeId,
        room_id: admission.roomId,
        admission_year: admission.admissionYear,
        admission_date: admission.admissionDate ? new Date(admission.admissionDate).toISOString().slice(0, 10) : undefined,
        enrollment_status: admission.enrollmentStatus,
        enrollment_type: admission.enrollmentType,
        shift: admission.shift,
        is_boarder: admission.isBoarder,
        fee_status: admission.feeStatus,
        placement_notes: admission.placementNotes,
      });

      setQuickMode(false); // editing usually wants full visibility
      setTab('basic');
    } else if (!admission) {
      reset({
        enrollment_status: 'admitted',
        is_boarder: false,
        admission_year: new Date().getFullYear().toString(),
      });
      setSelectedAcademicYear(undefined);
      setTab('basic');
      setQuickMode(true);
    }
  }, [admission, isEdit, reset]);

  // Keyboard shortcuts (Esc close, Ctrl/Cmd+Enter submit)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(onSubmit)();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onOpenChange, handleSubmit]);

  const toNullIfEmpty = (value: string | undefined | null): string | null | undefined => {
    if (value === '' || value === null) return null;
    return value || undefined;
  };

  const normalizeDateToISO = (val: unknown): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    if (typeof val === 'string') return val;
    return undefined;
  };

  const selectedStudent = useMemo(() => students?.find((s) => s.id === studentId), [students, studentId]);
  const selectedSchool = useMemo(() => schools?.find((s) => s.id === schoolId), [schools, schoolId]);
  const selectedYear = useMemo(
    () => academicYears?.find((y) => y.id === formAcademicYear),
    [academicYears, formAcademicYear]
  );
  const selectedCay = useMemo(
    () => classAcademicYears?.find((c) => c.id === classAcademicYearId),
    [classAcademicYears, classAcademicYearId]
  );
  const selectedRoom = useMemo(() => rooms?.find((r) => r.id === roomId), [rooms, roomId]);

  const onSubmit = (data: z.infer<typeof admissionSchema>) => {
    if (!isEdit && isLimitReached) {
      showToast.error(
        t('admissions.limitReached') ||
          `Student limit reached (${studentUsage.current}/${studentUsage.limit}). Please disable an old admission record first or upgrade your plan.`
      );
      return;
    }

    const payload: StudentAdmissionInsert = {
      studentId: data.student_id,
      organizationId: data.organization_id || profile?.organization_id,
      schoolId: data.school_id,
      academicYearId: data.academic_year_id || undefined,
      classId: toNullIfEmpty(data.class_id),
      classAcademicYearId: toNullIfEmpty(data.class_academic_year_id),
      residencyTypeId: toNullIfEmpty(data.residency_type_id),
      roomId: toNullIfEmpty(data.room_id),
      admissionYear: data.admission_year,
      admissionDate: normalizeDateToISO(data.admission_date),
      enrollmentStatus: data.enrollment_status,
      enrollmentType: data.enrollment_type,
      shift: data.shift,
      isBoarder: data.is_boarder,
      feeStatus: data.fee_status,
      placementNotes: data.placement_notes,
    };

    // If school not set, fallback to student's school
    if (!payload.schoolId && selectedStudent?.schoolId) {
      payload.schoolId = selectedStudent.schoolId;
    }

    // If classAcademicYear selected, derive consistent IDs
    const cay = classAcademicYears?.find((c) => c.id === data.class_academic_year_id);
    if (cay) {
      payload.classId = cay.classId;
      payload.academicYearId = cay.academicYearId;
      if (!payload.roomId && cay.roomId) payload.roomId = cay.roomId;
    } else {
      // If user explicitly cleared fields, keep null
      if (!data.class_academic_year_id) {
        if (data.room_id === '') payload.roomId = null;
      }
    }

    if (admission && isEdit) {
      const { organizationId, schoolId, ...updatePayload } = payload;
      updateAdmission.mutate(
        { id: admission.id, data: updatePayload },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        }
      );
    } else {
      createAdmission.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      });
    }
  };

  const isBusy = updateAdmission.isPending || createAdmission.isPending;
  const isCreateDisabled = !isEdit && !canCreateAdmission;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={(el) => {
          dialogRef.current = el;
        }}
        className="max-w-6xl w-full sm:w-[92vw] p-0 gap-0 flex flex-col"
        aria-describedby="admission-form-description"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl">
                {isEdit
                  ? t('admissions.updateAdmission') || 'Update admission'
                  : t('admissions.admitStudentFromRegistration') || 'Admit student from registration'}
              </DialogTitle>
              <DialogDescription id="admission-form-description" className="text-sm">
                {t('admissions.dialogDescription') ||
                  'Map a registered learner into a class, academic year, and residency type with status tracking.'}
              </DialogDescription>
            </div>

            {!isEdit && (
              <div className="flex items-center gap-2 pt-1">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">{t('admissions.quickMode') || 'Quick mode'}</Label>
                <Switch checked={quickMode} onCheckedChange={setQuickMode} />
              </div>
            )}
          </div>
        </DialogHeader>

        {!isEdit && isLimitReached && (
          <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex-shrink-0">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('admissions.limitReached') ||
                  `Student limit reached (${studentUsage.current}/${studentUsage.limit}). Please disable an old admission record first or upgrade your plan to add new admissions.`}
              </AlertDescription>
            </Alert>
          </div>
        )}

        <FormProvider {...formMethods}>
          <form
            onSubmit={handleSubmit(onSubmit, (errs) => {
              if (import.meta.env.DEV) console.error('[AdmissionFormDialog] validation errors:', errs);
              const firstError = Object.values(errs)[0];
              if (firstError?.message) showToast.error(firstError.message);
            })}
            className="flex-1 overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
                {/* Left: Wizard / Cards */}
                <Card className="border overflow-hidden flex flex-col">
                  <CardContent className="p-0 sm:p-4 sm:pt-4 pt-0 flex flex-col flex-1 min-h-0">
                    <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full flex flex-col flex-1 min-h-0">
                      <div className="px-2 sm:px-0 pb-2 sm:pb-4 sticky top-0 z-20 bg-card flex-shrink-0 border-b border-border/40">
                        <TabsList className="w-full grid grid-cols-4 bg-muted/50 z-10 h-auto py-1">
                        <TabsTrigger 
                          value="basic" 
                          className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-colors"
                        >
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{t('admissions.basicInfo') || 'Basic'}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="academic" 
                          className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-colors"
                        >
                          <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{t('students.academicInfo') || 'Academic'}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="residency" 
                          className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-colors"
                        >
                          <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{t('admissions.residencyInfo') || 'Residency'}</span>
                        </TabsTrigger>
                        <TabsTrigger 
                          value="additional" 
                          className="gap-1.5 sm:gap-2 text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span>{t('admissions.additionalInfo') || 'Extra'}</span>
                        </TabsTrigger>
                      </TabsList>
                      </div>

                      {/* BASIC */}
                      <TabsContent value="basic" className="px-2 sm:px-0 pt-4 sm:pt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {schools && schools.length > 1 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('admissions.school') || 'School'}</Label>
                              <Controller
                                control={control}
                                name="school_id"
                                render={({ field }) => (
                                  <Select
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                    disabled={isCreateDisabled}
                                  >
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder={t('admissions.selectSchool') || 'Select school'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {schools?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.schoolName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                          )}

                          <div className={`space-y-2 ${schools && schools.length > 1 ? '' : 'sm:col-span-2'}`}>
                            <Label className="text-sm font-medium">
                              {t('admissions.studentFromRegistration') || 'Student (from registration)'}
                              <span className="text-destructive ml-1">*</span>
                            </Label>
                            <Controller
                              control={control}
                              name="student_id"
                              render={({ field }) => (
                                <>
                                  {isLoadingStudents ? (
                                    <div className="h-10 flex items-center justify-center text-sm text-muted-foreground">
                                      {t('common.loading') || 'Loading students...'}
                                    </div>
                                  ) : studentsError ? (
                                    <div className="h-10 flex flex-col items-center justify-center text-sm text-destructive">
                                      <span>{t('common.error') || 'Error loading students'}</span>
                                      {import.meta.env.DEV && (
                                        <span className="text-xs mt-1">{String(studentsError)}</span>
                                      )}
                                    </div>
                                  ) : studentOptions.length === 0 ? (
                                    <div className="h-10 flex items-center justify-center text-sm text-muted-foreground border border-dashed rounded-md">
                                      {isEdit 
                                        ? (t('admissions.noStudentsFound') || 'No students found.')
                                        : (t('admissions.noStudentsAvailable') || 'No available students. All students may already be admitted.')}
                                    </div>
                                  ) : (
                                    <Combobox
                                      options={studentOptions}
                                      value={field.value || ''}
                                      onValueChange={(val) => {
                                        field.onChange(val);
                                        // if student has a school, auto set it (only if not set)
                                        const st = students?.find((x) => x.id === val);
                                        if (st?.schoolId && !watch('school_id')) {
                                          setValue('school_id', st.schoolId, { shouldValidate: false });
                                        }
                                      }}
                                      placeholder={t('admissions.chooseStudent') || 'Choose student'}
                                      searchPlaceholder={t('admissions.searchStudent') || 'Search by name or admission number...'}
                                      emptyText={
                                        isEdit 
                                          ? (t('admissions.noStudentsFound') || 'No students found.')
                                          : (t('admissions.noStudentsAvailable') || 'No available students. All students may already be admitted.')
                                      }
                                      disabled={isEdit || isCreateDisabled || isLoadingStudents}
                                      className={`h-10 ${errors.student_id ? 'border-destructive' : ''}`}
                                    />
                                  )}
                                </>
                              )}
                            />
                            {errors.student_id && (
                              <p className="text-destructive text-sm mt-1.5 font-medium">{errors.student_id.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setTab('academic')}
                            className="gap-2"
                          >
                            {t('common.next') || 'Next'} <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      {/* ACADEMIC */}
                      <TabsContent value="academic" className="px-2 sm:px-0 pt-4 sm:pt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.academicYear') || 'Academic Year'}</Label>
                            <Controller
                              control={control}
                              name="academic_year_id"
                              render={({ field }) => (
                                <Select
                                  value={field.value || ''}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    setSelectedAcademicYear(value);
                                    // reset dependent fields
                                    setValue('class_academic_year_id', '');
                                    setValue('class_id', '');
                                    // room will be re-derived if classAcademicYear has room
                                    setValue('room_id', isBoarder ? watch('room_id') : '');
                                  }}
                                  disabled={isCreateDisabled}
                                >
                                  <SelectTrigger className={`h-10 ${errors.academic_year_id ? 'border-destructive' : ''}`}>
                                    <SelectValue placeholder={t('admissions.selectAcademicYear') || 'Select academic year'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {academicYears?.map((year) => (
                                      <SelectItem key={year.id} value={year.id}>
                                        {year.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('students.classSection') || 'Class / Section'}</Label>
                            <Controller
                              control={control}
                              name="class_academic_year_id"
                              render={({ field }) => (
                                <Select
                                  value={field.value || ''}
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    const selected = classAcademicYears?.find((cay) => cay.id === value);
                                    if (selected) {
                                      setValue('class_id', selected.classId, { shouldValidate: false });
                                      setValue('academic_year_id', selected.academicYearId, { shouldValidate: false });
                                      if (selected.roomId && isBoarder) {
                                        setValue('room_id', selected.roomId, { shouldValidate: false });
                                      }
                                      // Speed: jump to next tab when class is picked
                                      if (quickMode) setTab('residency');
                                    }
                                  }}
                                  disabled={!selectedAcademicYear || isCreateDisabled}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue
                                      placeholder={
                                        !selectedAcademicYear
                                          ? t('admissions.selectAcademicYearFirst') || 'Select academic year first'
                                          : t('admissions.selectClassSection') || 'Select class & section'
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {classAcademicYears && classAcademicYears.length > 0 ? (
                                      classAcademicYears.map((cay) => (
                                        <SelectItem key={cay.id} value={cay.id}>
                                          {cay.class?.name || cay.classId || t('search.class') || 'Class'}
                                          {cay.sectionName ? ` - ${cay.sectionName}` : ''}
                                          {cay.capacity && cay.currentStudentCount !== undefined && (
                                            <span className="text-xs text-muted-foreground ml-2">
                                              ({cay.currentStudentCount}/{cay.capacity})
                                            </span>
                                          )}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        {selectedAcademicYear
                                          ? t('admissions.noClassesForYear') || 'No classes available for this academic year'
                                          : t('admissions.selectAcademicYearFirst') || 'Please select an academic year first'}
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {!selectedAcademicYear && (
                              <p className="text-xs text-muted-foreground mt-1.5">
                                {t('admissions.selectAcademicYearToSeeClasses') ||
                                  'Select an academic year above to see available classes'}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-between gap-2">
                          <Button type="button" variant="outline" onClick={() => setTab('basic')}>
                            {t('common.back') || 'Back'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setTab('residency')} className="gap-2">
                            {t('common.next') || 'Next'} <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      {/* RESIDENCY */}
                      <TabsContent value="residency" className="px-2 sm:px-0 pt-4 sm:pt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.residencyType') || 'Residency Type'}</Label>
                            <Controller
                              control={control}
                              name="residency_type_id"
                              render={({ field }) => (
                                <Select value={field.value || ''} onValueChange={field.onChange} disabled={isCreateDisabled}>
                                  <SelectTrigger className={`h-10 ${errors.residency_type_id ? 'border-destructive' : ''}`}>
                                    <SelectValue placeholder={t('admissions.selectResidency') || 'Select residency'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {residencyTypes?.map((type) => (
                                      <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.boarder') || 'Boarder'}</Label>
                            <Controller
                              control={control}
                              name="is_boarder"
                              render={({ field }) => (
                                <Select
                                  value={field.value ? 'yes' : 'no'}
                                  onValueChange={(value) => {
                                    const v = value === 'yes';
                                    field.onChange(v);
                                    if (!v) {
                                      // If not boarder, clear room quickly
                                      setValue('room_id', '', { shouldValidate: false });
                                    }
                                  }}
                                  disabled={isCreateDisabled}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder={t('admissions.boarder') || 'Boarder'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="yes">{t('admissions.boarderYes') || 'Boarder'}</SelectItem>
                                    <SelectItem value="no">{t('admissions.boarderNo') || 'Day scholar'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          {/* Room only if boarder (speed + less confusion) */}
                          {!quickMode || isBoarder ? (
                            <div className={`space-y-2 ${quickMode ? 'sm:col-span-2' : ''}`}>
                              <Label className="text-sm font-medium">{t('admissions.roomDorm') || 'Room / Dorm'}</Label>
                              <Controller
                                control={control}
                                name="room_id"
                                render={({ field }) => (
                                  <Combobox
                                    options={roomOptions}
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                    placeholder={t('admissions.assignRoom') || 'Assign room'}
                                    searchPlaceholder={t('admissions.searchRoom') || 'Search rooms...'}
                                    emptyText={t('admissions.noRoomsFound') || 'No rooms found.'}
                                    disabled={!isBoarder || isCreateDisabled}
                                    className="h-10"
                                  />
                                )}
                              />
                              {!isBoarder && (
                                <p className="text-xs text-muted-foreground">
                                  {t('admissions.roomDisabledWhenNotBoarder') || 'Room is only required for boarders.'}
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex justify-between gap-2">
                          <Button type="button" variant="outline" onClick={() => setTab('academic')}>
                            {t('common.back') || 'Back'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setTab('additional')} className="gap-2">
                            {t('common.next') || 'Next'} <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TabsContent>

                      {/* ADDITIONAL */}
                      <TabsContent value="additional" className="px-2 sm:px-0 pt-4 sm:pt-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.enrollmentStatus') || 'Enrollment Status'}</Label>
                            <Controller
                              control={control}
                              name="enrollment_status"
                              render={({ field }) => (
                                <Select value={field.value} onValueChange={field.onChange} disabled={isCreateDisabled}>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder={t('events.status') || 'Status'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">{t('admissions.pending') || 'Pending'}</SelectItem>
                                    <SelectItem value="admitted">{t('admissions.admitted') || 'Admitted'}</SelectItem>
                                    <SelectItem value="active">{t('events.active') || 'Active'}</SelectItem>
                                    <SelectItem value="inactive">{t('events.inactive') || 'Inactive'}</SelectItem>
                                    <SelectItem value="suspended">{t('students.suspended') || 'Suspended'}</SelectItem>
                                    <SelectItem value="withdrawn">{t('admissions.withdrawn') || 'Withdrawn'}</SelectItem>
                                    <SelectItem value="graduated">{t('students.graduated') || 'Graduated'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.admissionYear') || 'Admission Year'}</Label>
                            <Input
                              placeholder={new Date().getFullYear().toString()}
                              {...register('admission_year')}
                              disabled={isCreateDisabled}
                              className={`h-10 ${errors.admission_year ? 'border-destructive' : ''}`}
                            />
                          </div>

                          {/* In quick mode: keep date optional and compact */}
                          {!quickMode && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">{t('studentReportCard.admissionDate') || 'Admission Date'}</Label>
                              <CalendarFormField
                                control={control}
                                name="admission_date"
                                label={t('studentReportCard.admissionDate') || 'Admission Date'}
                                disabled={isCreateDisabled}
                              />
                            </div>
                          )}

                          {!quickMode && (
                            <>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('admissions.enrollmentType') || 'Enrollment Type'}</Label>
                                <Input
                                  placeholder={t('admissions.enrollmentTypePlaceholder') || 'Boarder / Day scholar'}
                                  {...register('enrollment_type')}
                                  disabled={isCreateDisabled}
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('admissions.shift') || 'Shift'}</Label>
                                <Input
                                  placeholder={t('admissions.shiftPlaceholder') || 'Morning / Evening'}
                                  {...register('shift')}
                                  disabled={isCreateDisabled}
                                  className="h-10"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('admissions.feeStatus') || 'Fee Status'}</Label>
                                <Input
                                  placeholder={t('admissions.feeStatusPlaceholder') || 'Paid / Partial / Waived'}
                                  {...register('fee_status')}
                                  disabled={isCreateDisabled}
                                  className="h-10"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {!quickMode && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('admissions.placementNotes') || 'Placement Notes'}</Label>
                            <Textarea
                              placeholder={t('admissions.placementNotesPlaceholder') || 'Health, guardian approvals, or special considerations'}
                              {...register('placement_notes')}
                              disabled={isCreateDisabled}
                              className="min-h-[100px] resize-y"
                            />
                            {errors.placement_notes && (
                              <p className="text-destructive text-sm mt-1.5 font-medium">{errors.placement_notes.message}</p>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between gap-2">
                          <Button type="button" variant="outline" onClick={() => setTab('residency')}>
                            {t('common.back') || 'Back'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setTab('basic')}>
                            {t('admissions.startOver') || 'Start over'}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Right: Sticky Summary / Fast confidence */}
                <div className="lg:sticky lg:top-4 h-fit">
                  <Card className="border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{t('admissions.summary') || 'Summary'}</div>
                        {quickMode && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {t('admissions.quick') || 'Quick'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <SummaryRow label={t('admissions.student') || 'Student'} value={selectedStudent?.fullName || selectedStudent?.full_name || '—'} />
                        <SummaryRow label={t('admissions.school') || 'School'} value={selectedSchool?.schoolName || '—'} />
                        <SummaryRow label={t('admissions.academicYear') || 'Academic Year'} value={selectedYear?.name || '—'} />
                        <SummaryRow
                          label={t('students.classSection') || 'Class/Section'}
                          value={
                            selectedCay
                              ? `${selectedCay.class?.name || selectedCay.classId || '—'}${selectedCay.sectionName ? ` - ${selectedCay.sectionName}` : ''}`
                              : '—'
                          }
                        />
                        <SummaryRow label={t('admissions.roomDorm') || 'Room'} value={selectedRoom?.roomNumber || selectedRoom?.id || (isBoarder ? '—' : t('admissions.notRequired') || 'Not required')} />
                        <SummaryRow label={t('admissions.enrollmentStatus') || 'Status'} value={enrollmentStatus || '—'} />
                      </div>

                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        {t('admissions.shortcutsHint') || 'Shortcuts: Esc = close, Ctrl/Cmd+Enter = save'}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <DialogFooter className="px-4 sm:px-6 pt-4 pb-4 sm:pb-6 flex-shrink-0 border-t">
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial">
                  {t('events.cancel') || 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="flex-1 sm:flex-initial"
                  disabled={isCreateDisabled || isBusy}
                >
                  {isBusy
                    ? t('events.saving') || 'Saving...'
                    : isEdit
                      ? t('admissions.updateAdmission') || 'Update admission'
                      : t('admissions.admitStudent') || 'Admit student'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-right font-medium line-clamp-2">{value}</div>
    </div>
  );
}
