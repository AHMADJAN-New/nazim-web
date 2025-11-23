import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, UserCheck, MapPin, Shield, ClipboardList } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSchools } from '@/hooks/useSchools';
import { useStudents } from '@/hooks/useStudents';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
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
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTableFilterList } from '@/components/data-table/data-table-filter-list';
import { DataTableSortList } from '@/components/data-table/data-table-sort-list';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

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
    .enum(['pending', 'admitted', 'active', 'inactive', 'suspended', 'withdrawn', 'graduated'] satisfies AdmissionStatus[])
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
  const isSuperAdmin = useIsSuperAdmin();
  const { data: organizations } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>(profile?.organization_id);
  const orgIdForQuery = selectedOrg === 'all' ? undefined : selectedOrg;

  const { data: admissions, isLoading } = useStudentAdmissions(orgIdForQuery);
  const { stats } = useAdmissionStats(orgIdForQuery);
  const { data: students } = useStudents(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  const { data: academicYears } = useAcademicYears(orgIdForQuery);
  const { data: classes } = useClasses(orgIdForQuery);
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
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdmissionStatus>('all');
  const [residencyFilter, setResidencyFilter] = useState<string>('all');

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

  const admittedStudentIds = new Set((admissions || []).map((adm) => adm.student_id));
  const availableStudents = (students || []).filter((student) => !admittedStudentIds.has(student.id));

  const columns = useMemo<ColumnDef<StudentAdmission>[]>(
    () => [
      {
        id: 'student',
        accessorKey: 'student.full_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{row.original.student?.full_name || 'Unassigned'}</span>
              {row.original.enrollment_status && (
                <Badge variant={statusVariant(row.original.enrollment_status)}> {row.original.enrollment_status}</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex gap-2 flex-wrap">
              {row.original.student?.admission_no && <span>Adm #{row.original.student.admission_no}</span>}
              {row.original.admission_year && <span>{row.original.admission_year}</span>}
            </div>
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        id: 'school_id',
        accessorKey: 'school_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="School" />,
        cell: ({ row }) => schools?.find((s) => s.id === row.original.school_id)?.school_name || '—',
        enableColumnFilter: true,
      },
      {
        id: 'class_academic_year_id',
        accessorKey: 'class_academic_year_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Class / Shift" />,
        cell: ({ row }) =>
          row.original.class_academic_year?.display_name ||
          classes?.find((cls) => cls.id === row.original.class_id)?.class_name ||
          '—',
        enableColumnFilter: true,
      },
      {
        id: 'residency_type_id',
        accessorKey: 'residency_type_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Residency" />,
        cell: ({ row }) => row.original.residency_type?.name || residencyTypes?.find((r) => r.id === row.original.residency_type_id)?.name || '—',
        enableColumnFilter: true,
      },
      {
        id: 'room_id',
        accessorKey: 'room_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Room" />,
        cell: ({ row }) => row.original.room?.room_number || '—',
      },
      {
        id: 'enrollment_status',
        accessorKey: 'enrollment_status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <Badge variant={statusVariant(row.original.enrollment_status)}>{row.original.enrollment_status}</Badge>,
        enableColumnFilter: true,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedAdmission(row.original);
                setIsEdit(true);
                setIsDialogOpen(true);
              }}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedAdmission(row.original);
              }}
            >
              <ClipboardList className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [classes, residencyTypes, schools],
  );

  const { table } = useDataTable<StudentAdmission>({
    data: admissions || [],
    columns,
    initialState: {
      sorting: [{ id: 'student', desc: false }],
      pagination: { pageSize: 10 },
    },
    getRowId: (row) => (row as StudentAdmission).id,
  });

  useEffect(() => {
    table.getColumn('enrollment_status')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
    table.getColumn('residency_type_id')?.setFilterValue(residencyFilter === 'all' ? undefined : residencyFilter);
    table.getColumn('school_id')?.setFilterValue(schoolFilter === 'all' ? undefined : schoolFilter);
  }, [residencyFilter, schoolFilter, statusFilter, table]);

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

    if (selectedAdmission) {
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
    reset({
      ...admission,
      admission_date: admission.admission_date?.toString().slice(0, 10),
      organization_id: admission.organization_id,
    });
    if (admission.academic_year_id) {
      setSelectedAcademicYear(admission.academic_year_id);
    }
  };

  const handleDelete = (admission: StudentAdmission) => {
    setSelectedAdmission(admission);
  };

  const confirmDelete = () => {
    if (selectedAdmission) {
      deleteAdmission.mutate(selectedAdmission.id, {
        onSuccess: () => setSelectedAdmission(null),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('admissions.title') || 'Student Admissions'}</h1>
          <p className="text-muted-foreground">
            {t('admissions.subtitle') || 'Admit registered students into classes with residency and year tracking.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Select value={selectedOrg || 'all'} onValueChange={(value) => setSelectedOrg(value === 'all' ? 'all' : value)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('admissions.add') || 'Admit Student'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEdit ? 'Update admission' : 'Admit student from registration'}</DialogTitle>
                <DialogDescription>
                  Map a registered learner into a class, academic year, and residency type with status tracking.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
              {isSuperAdmin && (
                <div>
                  <Label>Organization</Label>
                  <Controller
                    control={control}
                        name="organization_id"
                        render={({ field }) => (
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select organization" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizations?.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                    />
                  </div>
                )}
              <div>
                <Label>School</Label>
                <Controller
                  control={control}
                  name="school_id"
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select school" />
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
              <div>
                <Label>Student (from registration)</Label>
                <Controller
                      control={control}
                      name="student_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange} disabled={isEdit}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose student" />
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
                    <Label>Academic Year</Label>
                    <Controller
                      control={control}
                      name="academic_year_id"
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedAcademicYear(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
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
                    <Label>Class / Section</Label>
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
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class & section" />
                          </SelectTrigger>
                          <SelectContent>
                            {classAcademicYears?.map((cay) => (
                              <SelectItem key={cay.id} value={cay.id}>
                                {classes?.find((cls) => cls.id === cay.class_id)?.name || 'Class'}
                                {cay.section_name ? ` - ${cay.section_name}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Residency Type</Label>
                    <Controller
                      control={control}
                      name="residency_type_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select residency" />
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
                    <Label>Room / Dorm</Label>
                    <Controller
                      control={control}
                      name="room_id"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Assign room" />
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
                    <Label>Admission Year</Label>
                    <Input placeholder="2024" {...register('admission_year')} />
                  </div>
                  <div>
                    <Label>Admission Date</Label>
                    <Input type="date" {...register('admission_date')} />
                  </div>
                  <div>
                    <Label>Enrollment Status</Label>
                    <Controller
                      control={control}
                      name="enrollment_status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="admitted">Admitted</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                            <SelectItem value="graduated">Graduated</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Enrollment Type</Label>
                    <Input placeholder="Boarder / Day scholar" {...register('enrollment_type')} />
                  </div>
                  <div>
                    <Label>Shift</Label>
                    <Input placeholder="Morning / Evening" {...register('shift')} />
                  </div>
                  <div>
                    <Label>Fee Status</Label>
                    <Input placeholder="Paid / Partial / Waived" {...register('fee_status')} />
                  </div>
                  <div>
                    <Label>Boarder</Label>
                    <Controller
                      control={control}
                      name="is_boarder"
                      render={({ field }) => (
                        <Select value={field.value ? 'yes' : 'no'} onValueChange={(value) => field.onChange(value === 'yes')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Boarder" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Boarder</SelectItem>
                            <SelectItem value="no">Day scholar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Placement Notes</Label>
                  <Textarea placeholder="Health, guardian approvals, or special considerations" {...register('placement_notes')} />
                  {errors.placement_notes && (
                    <p className="text-destructive text-sm mt-1">{errors.placement_notes.message}</p>
                  )}
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    {isEdit ? 'Update admission' : 'Admit student'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
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
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Admissions</CardTitle>
              <CardDescription>Overview of class placements and residency tracking.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All schools</SelectItem>
                  {schools?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.school_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdmissionStatus | 'all')}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="admitted">Admitted</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={residencyFilter} onValueChange={(value) => setResidencyFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Residency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All residency</SelectItem>
                  {residencyTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <DataTable table={table}>
                <div className="space-y-3">
                  <DataTableToolbar table={table} placeholder="Search by student, admission #, residency" />
                  <DataTableAdvancedToolbar table={table}>
                    <DataTableFilterList table={table} />
                    <DataTableSortList table={table} />
                  </DataTableAdvancedToolbar>
                </div>
              </DataTable>
              <DataTablePagination table={table} />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedAdmission && !isDialogOpen} onOpenChange={(open) => !open && setSelectedAdmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove admission?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            This will keep the student registration but remove their class placement record.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StudentAdmissions;
