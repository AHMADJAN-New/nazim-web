import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, UserCheck, MapPin, Shield, ClipboardList, Pencil, Trash2, Search } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStudents } from '@/hooks/useStudents';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import {
  useAdmissionStats,
  useCreateStudentAdmission,
  useDeleteStudentAdmission,
  useStudentAdmissions,
  useUpdateStudentAdmission,
  type StudentAdmission,
  type StudentAdmissionInsert,
  type AdmissionStatus,
} from '@/hooks/useStudentAdmissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading';

const admissionSchema = z.object({
  organization_id: z.string().uuid().optional(),
  school_id: z.string().uuid().optional().nullable(),
  student_id: z.string().uuid({ message: 'Student is required' }),
  academic_year_id: z.string().uuid().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  class_academic_year_id: z.string().uuid().optional().nullable(),
  residency_type_id: z.string().uuid().optional().nullable(),
  room_id: z.string().uuid().optional().nullable(),
  admission_year: z.string().max(10, 'Admission year must be 10 characters or less').optional().nullable(),
  admission_date: z.string().max(30, 'Admission date is too long').optional(),
  enrollment_status: z
    .enum(['pending', 'admitted', 'active', 'inactive', 'suspended', 'withdrawn', 'graduated'] as [AdmissionStatus, ...AdmissionStatus[]])
    .default('admitted'),
  enrollment_type: z.string().max(50, 'Enrollment type is too long').optional().nullable(),
  shift: z.string().max(50, 'Shift is too long').optional().nullable(),
  is_boarder: z.boolean().default(false),
  fee_status: z.string().max(50, 'Fee status is too long').optional().nullable(),
  placement_notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

const statusVariant = (status: AdmissionStatus) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
    case 'pending':
      return 'secondary';
    case 'inactive':
    case 'suspended':
      return 'outline';
    case 'withdrawn':
      return 'destructive';
    case 'graduated':
      return 'default';
    default:
      return 'secondary';
  }
};

export function StudentAdmissions() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  const { data: admissions, isLoading, error: admissionsError } = useStudentAdmissions(orgIdForQuery);
  
  // Debug logging
  useEffect(() => {
    if (admissions) {
      console.log('[StudentAdmissions] Admissions data:', admissions.length, 'records');
      console.log('[StudentAdmissions] Sample admission:', admissions[0]);
    }
    if (admissionsError) {
      console.error('[StudentAdmissions] Error:', admissionsError);
    }
  }, [admissions, admissionsError]);
  const { stats } = useAdmissionStats(orgIdForQuery);
  const { data: students } = useStudents(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  const { data: academicYears } = useAcademicYears(orgIdForQuery);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | undefined>();
  const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYear, orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  const createAdmission = useCreateStudentAdmission();
  const updateAdmission = useUpdateStudentAdmission();
  const deleteAdmission = useDeleteStudentAdmission();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmission | null>(null);
  const [admissionToDelete, setAdmissionToDelete] = useState<StudentAdmission | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdmissionStatus>('all');
  const [residencyFilter, setResidencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof admissionSchema>>({
    resolver: zodResolver(admissionSchema),
    defaultValues: {
      enrollment_status: 'admitted',
      is_boarder: false,
      admission_year: new Date().getFullYear().toString(),
    },
  });

  const formAcademicYear = watch('academic_year_id');
  useEffect(() => {
    if (formAcademicYear) {
      setSelectedAcademicYear(formAcademicYear);
    }
  }, [formAcademicYear]);

  // Auto-select school if only one exists
  useEffect(() => {
    if (schools && schools.length === 1 && !isEdit && !watch('school_id')) {
      setValue('school_id', schools[0].id, { shouldValidate: false });
    }
  }, [schools, isEdit, setValue, watch]);

  const admittedStudentIds = new Set((admissions || []).map((adm) => adm.student_id));
  const availableStudents = (students || []).filter((student) => !admittedStudentIds.has(student.id));

  // Filter admissions for display
  const filteredAdmissions = useMemo(() => {
    const list = admissions || [];
    const searchLower = (searchQuery || '').toLowerCase().trim();
    
    return list
      .filter((admission) => {
        // Apply filters
        if (schoolFilter !== 'all' && admission.school_id !== schoolFilter) return false;
        if (statusFilter !== 'all' && admission.enrollment_status !== statusFilter) return false;
        if (residencyFilter !== 'all' && admission.residency_type_id !== residencyFilter) return false;
        
        // Apply search query
        if (searchLower) {
          const matchesStudentName = admission.student?.full_name?.toLowerCase().includes(searchLower);
          const matchesAdmissionNo = admission.student?.admission_no?.toLowerCase().includes(searchLower);
          const matchesAdmissionYear = admission.admission_year?.toLowerCase().includes(searchLower);
          const matchesClass = admission.class?.name?.toLowerCase().includes(searchLower);
          const matchesSection = admission.class_academic_year?.section_name?.toLowerCase().includes(searchLower);
          
          if (!matchesStudentName && !matchesAdmissionNo && !matchesAdmissionYear && !matchesClass && !matchesSection) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        // Sort by student name
        const nameA = a.student?.full_name || '';
        const nameB = b.student?.full_name || '';
        return nameA.localeCompare(nameB);
      });
  }, [admissions, schoolFilter, statusFilter, residencyFilter, searchQuery]);

  const onSubmit = (data: z.infer<typeof admissionSchema>) => {
    const payload: StudentAdmissionInsert = {
      ...data,
      organization_id: data.organization_id || profile?.organization_id,
    };

    const selectedStudent = students?.find((student) => student.id === data.student_id);
    if (!payload.school_id && selectedStudent?.school_id) {
      payload.school_id = selectedStudent.school_id;
    }

    const selectedCay = classAcademicYears?.find((cay) => cay.id === data.class_academic_year_id);
    if (selectedCay) {
      payload.class_id = selectedCay.class_id;
      payload.academic_year_id = selectedCay.academic_year_id;
      if (!payload.room_id && selectedCay.room_id) {
        payload.room_id = selectedCay.room_id;
      }
    }

    if (selectedAdmission && isEdit) {
      updateAdmission.mutate(
        { id: selectedAdmission.id, data: payload },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            setSelectedAdmission(null);
            setIsEdit(false);
            reset();
          },
        },
      );
    } else {
      createAdmission.mutate(payload, {
        onSuccess: () => {
          setIsDialogOpen(false);
          reset();
        },
      });
    }
  };

  const handleEdit = (admission: StudentAdmission) => {
    setSelectedAdmission(admission);
    setIsEdit(true);
    setIsDialogOpen(true);
    // Clear delete state when editing
    setAdmissionToDelete(null);
    
    // Set academic year first so classes load
    if (admission.academic_year_id) {
      setSelectedAcademicYear(admission.academic_year_id);
    }
    
    reset({
      ...admission,
      admission_date: admission.admission_date?.toString().slice(0, 10),
      organization_id: admission.organization_id,
    });
  };

  const handleDelete = (admission: StudentAdmission) => {
    setAdmissionToDelete(admission);
  };

  const confirmDelete = () => {
    if (admissionToDelete) {
      deleteAdmission.mutate(admissionToDelete.id, {
        onSuccess: () => setAdmissionToDelete(null),
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admissions.title') || 'Student Admissions'}</h1>
          <p className="text-muted-foreground">
            {t('admissions.subtitle') || 'Admit registered students into classes with residency and year tracking.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                // Reset edit state when dialog closes
                setSelectedAdmission(null);
                setIsEdit(false);
                setSelectedAcademicYear(undefined);
                reset();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => {
                // Clear edit state when opening create dialog
                setSelectedAdmission(null);
                setIsEdit(false);
                setAdmissionToDelete(null);
                setSelectedAcademicYear(undefined);
                reset();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('admissions.add') || 'Admit Student'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
              <DialogHeader>
                <DialogTitle>{isEdit ? (t('admissions.updateAdmission') || 'Update admission') : (t('admissions.admitStudentFromRegistration') || 'Admit student from registration')}</DialogTitle>
                <DialogDescription>
                  {t('admissions.dialogDescription') || 'Map a registered learner into a class, academic year, and residency type with status tracking.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
              {schools && schools.length > 1 && (
                <div>
                  <Label>{t('admissions.school') || 'School'}</Label>
                  <Controller
                    control={control}
                    name="school_id"
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admissions.selectSchool') || 'Select school'} />
                        </SelectTrigger>
                        <SelectContent>
                          {schools?.map((school) => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.school_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
              <div>
                <Label>{t('admissions.studentFromRegistration') || 'Student (from registration)'}</Label>
                <Controller
                      control={control}
                      name="student_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange} disabled={isEdit}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admissions.chooseStudent') || 'Choose student'} />
                          </SelectTrigger>
                          <SelectContent>
                            {(isEdit ? students : availableStudents)?.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name} ({student.admission_no})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.student_id && <p className="text-destructive text-sm mt-1">{errors.student_id.message}</p>}
                  </div>
                  <div>
                    <Label>{t('admissions.academicYear') || 'Academic Year'}</Label>
                    <Controller
                      control={control}
                      name="academic_year_id"
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedAcademicYear(value);
                            // Clear class selection when academic year changes
                            setValue('class_academic_year_id', '');
                            setValue('class_id', '');
                            setValue('room_id', '');
                          }}
                        >
                          <SelectTrigger>
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
                  <div>
                    <Label>{t('admissions.classSection') || 'Class / Section'}</Label>
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
                              setValue('class_id', selected.class_id);
                              setValue('academic_year_id', selected.academic_year_id);
                              if (selected.room_id) {
                                setValue('room_id', selected.room_id);
                              }
                            }
                          }}
                          disabled={!selectedAcademicYear}
                        >
                          <SelectTrigger>
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
                                  {cay.class?.name || cay.class_id || t('admissions.class') || 'Class'}
                                  {cay.section_name ? ` - ${cay.section_name}` : ''}
                                  {cay.capacity && cay.current_student_count !== undefined && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({cay.current_student_count}/{cay.capacity})
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admissions.selectAcademicYearToSeeClasses') || 'Select an academic year above to see available classes'}
                      </p>
                    )}
                    {selectedAcademicYear && classAcademicYears && classAcademicYears.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('admissions.noClassesAssignedToYear') || 'No classes have been assigned to this academic year yet'}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{t('admissions.residencyType') || 'Residency Type'}</Label>
                    <Controller
                      control={control}
                      name="residency_type_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
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
                  <div>
                    <Label>{t('admissions.roomDorm') || 'Room / Dorm'}</Label>
                    <Controller
                      control={control}
                      name="room_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admissions.assignRoom') || 'Assign room'} />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms?.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
                                {room.room_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('admissions.admissionYear') || 'Admission Year'}</Label>
                    <Input placeholder={new Date().getFullYear().toString()} {...register('admission_year')} />
                  </div>
                  <div>
                    <Label>{t('admissions.admissionDate') || 'Admission Date'}</Label>
                    <Input type="date" {...register('admission_date')} />
                  </div>
                  <div>
                    <Label>{t('admissions.enrollmentStatus') || 'Enrollment Status'}</Label>
                    <Controller
                      control={control}
                      name="enrollment_status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('admissions.status') || 'Status'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t('admissions.pending') || 'Pending'}</SelectItem>
                            <SelectItem value="admitted">{t('admissions.admitted') || 'Admitted'}</SelectItem>
                            <SelectItem value="active">{t('admissions.active') || 'Active'}</SelectItem>
                            <SelectItem value="inactive">{t('admissions.inactive') || 'Inactive'}</SelectItem>
                            <SelectItem value="suspended">{t('admissions.suspended') || 'Suspended'}</SelectItem>
                            <SelectItem value="withdrawn">{t('admissions.withdrawn') || 'Withdrawn'}</SelectItem>
                            <SelectItem value="graduated">{t('admissions.graduated') || 'Graduated'}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>{t('admissions.enrollmentType') || 'Enrollment Type'}</Label>
                    <Input placeholder={t('admissions.enrollmentTypePlaceholder') || 'Boarder / Day scholar'} {...register('enrollment_type')} />
                  </div>
                  <div>
                    <Label>{t('admissions.shift') || 'Shift'}</Label>
                    <Input placeholder={t('admissions.shiftPlaceholder') || 'Morning / Evening'} {...register('shift')} />
                  </div>
                  <div>
                    <Label>{t('admissions.feeStatus') || 'Fee Status'}</Label>
                    <Input placeholder={t('admissions.feeStatusPlaceholder') || 'Paid / Partial / Waived'} {...register('fee_status')} />
                  </div>
                  <div>
                    <Label>{t('admissions.boarder') || 'Boarder'}</Label>
                    <Controller
                      control={control}
                      name="is_boarder"
                      render={({ field }) => (
                        <Select value={field.value ? 'yes' : 'no'} onValueChange={(value) => field.onChange(value === 'yes')}>
                          <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>{t('admissions.placementNotes') || 'Placement Notes'}</Label>
                  <Textarea placeholder={t('admissions.placementNotesPlaceholder') || 'Health, guardian approvals, or special considerations'} {...register('placement_notes')} />
                  {errors.placement_notes && (
                    <p className="text-destructive text-sm mt-1">{errors.placement_notes.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    {isEdit ? (t('admissions.updateAdmission') || 'Update admission') : (t('admissions.admitStudent') || 'Admit student')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total admissions</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all residency types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active students</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently studying</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending/Admitted</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting activation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Boarders</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.boarders}</div>
            <p className="text-xs text-muted-foreground">Students with accommodation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admissions.list') || 'Admissions'}</CardTitle>
          <CardDescription>{t('admissions.listDescription') || 'Overview of class placements and residency tracking.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : admissionsError ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <p className="text-destructive font-medium">Error loading admissions</p>
              <p className="text-sm text-muted-foreground">
                {admissionsError instanceof Error ? admissionsError.message : 'Unknown error occurred'}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Please ensure the migration <code className="bg-muted px-1 rounded">20250205000034_fix_student_admissions_rls_policies.sql</code> has been applied.
              </p>
            </div>
          ) : (
            <div className="space-y-4 overflow-x-auto">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('common.search') || 'Search by student name, admission number, class...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder={t('admissions.school') || 'School'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admissions.allSchools') || 'All Schools'}</SelectItem>
                      {schools?.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.school_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdmissionStatus | 'all')}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder={t('admissions.status') || 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admissions.allStatus') || 'All Status'}</SelectItem>
                      <SelectItem value="pending">{t('admissions.pending') || 'Pending'}</SelectItem>
                      <SelectItem value="admitted">{t('admissions.admitted') || 'Admitted'}</SelectItem>
                      <SelectItem value="active">{t('admissions.active') || 'Active'}</SelectItem>
                      <SelectItem value="inactive">{t('admissions.inactive') || 'Inactive'}</SelectItem>
                      <SelectItem value="suspended">{t('admissions.suspended') || 'Suspended'}</SelectItem>
                      <SelectItem value="withdrawn">{t('admissions.withdrawn') || 'Withdrawn'}</SelectItem>
                      <SelectItem value="graduated">{t('admissions.graduated') || 'Graduated'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={residencyFilter} onValueChange={(value) => setResidencyFilter(value)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder={t('admissions.residency') || 'Residency'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admissions.allResidency') || 'All Residency'}</SelectItem>
                      {residencyTypes?.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admissions.student') || 'Student'}</TableHead>
                        <TableHead>{t('admissions.school') || 'School'}</TableHead>
                        <TableHead>{t('admissions.class') || 'Class / Shift'}</TableHead>
                        <TableHead>{t('admissions.residency') || 'Residency'}</TableHead>
                        <TableHead>{t('admissions.room') || 'Room'}</TableHead>
                        <TableHead>{t('admissions.status') || 'Status'}</TableHead>
                        <TableHead className="text-right">{t('admissions.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmissions.length > 0 ? (
                        filteredAdmissions.map((admission) => (
                          <TableRow key={admission.id}>
                            <TableCell>
                              <div className="space-y-1 min-w-[200px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold break-words">{admission.student?.full_name || 'Unassigned'}</span>
                                  {admission.enrollment_status && (
                                    <Badge variant={statusVariant(admission.enrollment_status)} className="shrink-0">
                                      {admission.enrollment_status === 'pending' ? t('admissions.pending') :
                                       admission.enrollment_status === 'admitted' ? t('admissions.admitted') :
                                       admission.enrollment_status === 'active' ? t('admissions.active') :
                                       admission.enrollment_status === 'inactive' ? t('admissions.inactive') :
                                       admission.enrollment_status === 'suspended' ? t('admissions.suspended') :
                                       admission.enrollment_status === 'withdrawn' ? t('admissions.withdrawn') :
                                       admission.enrollment_status === 'graduated' ? t('admissions.graduated') :
                                       admission.enrollment_status}
                                    </Badge>
                                  )}
                                  {admission.is_boarder && (
                                    <Badge variant="secondary" className="shrink-0">
                                      {t('admissions.boarder') || 'Boarder'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                                  {admission.student?.admission_no && (
                                    <span className="break-words">{t('admissions.admissionNo') || 'Adm'}: #{admission.student.admission_no}</span>
                                  )}
                                  {admission.admission_year && (
                                    <span>{t('admissions.year') || 'Year'}: {admission.admission_year}</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {schools?.find((s) => s.id === admission.school_id)?.school_name || '—'}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const className = admission.class?.name;
                                const sectionName = admission.class_academic_year?.section_name;
                                if (className) {
                                  return sectionName ? `${className} - ${sectionName}` : className;
                                }
                                return '—';
                              })()}
                            </TableCell>
                            <TableCell>
                              {admission.residency_type?.name || 
                               residencyTypes?.find((r) => r.id === admission.residency_type_id)?.name || 
                               '—'}
                            </TableCell>
                            <TableCell>
                              {admission.room?.room_number || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(admission.enrollment_status)}>
                                {admission.enrollment_status === 'pending' ? t('admissions.pending') :
                                 admission.enrollment_status === 'admitted' ? t('admissions.admitted') :
                                 admission.enrollment_status === 'active' ? t('admissions.active') :
                                 admission.enrollment_status === 'inactive' ? t('admissions.inactive') :
                                 admission.enrollment_status === 'suspended' ? t('admissions.suspended') :
                                 admission.enrollment_status === 'withdrawn' ? t('admissions.withdrawn') :
                                 admission.enrollment_status === 'graduated' ? t('admissions.graduated') :
                                 admission.enrollment_status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(admission)}
                                  title={t('common.edit') || 'Edit'}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(admission)}
                                  title={t('common.delete') || 'Delete'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            {t('admissions.noDataFound') || 'No data found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!admissionToDelete} onOpenChange={(open) => !open && setAdmissionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admissions.removeAdmission') || 'Remove admission?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admissions.removeAdmissionDescription') || 'This will keep the student registration but remove their class placement record.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.delete') || 'Remove'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StudentAdmissions;
