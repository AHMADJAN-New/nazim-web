import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Shield, UserRound } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSchools } from '@/hooks/useSchools';
import {
  useCreateStudent,
  useDeleteStudent,
  useStudentStats,
  useStudents,
  useUpdateStudent,
  type Student,
  type StudentInsert,
} from '@/hooks/useStudents';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableSortList } from '@/components/data-table/data-table-sort-list';
import { DataTableFilterList } from '@/components/data-table/data-table-filter-list';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableAdvancedToolbar } from '@/components/data-table/data-table-advanced-toolbar';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';

const studentSchema = z.object({
  organization_id: z.string().uuid().optional(),
  school_id: z.string().uuid().optional().nullable(),
  card_number: z.string().max(50, 'Card number must be 50 characters or less').optional().nullable(),
  admission_no: z.string().min(1, 'Admission number is required').max(50, 'Admission number must be 50 characters or less'),
  full_name: z.string().min(1, 'Full name is required').max(200, 'Name must be 200 characters or less'),
  father_name: z.string().min(1, 'Father name is required').max(150, 'Father name must be 150 characters or less'),
  grandfather_name: z.string().max(150, 'Grandfather name must be 150 characters or less').optional().nullable(),
  mother_name: z.string().max(150, 'Mother name must be 150 characters or less').optional().nullable(),
  gender: z.enum(['male', 'female']),
  birth_year: z.string().max(10, 'Birth year must be 10 characters or less').optional().nullable(),
  birth_date: z.string().max(30, 'Birth date must be 30 characters or less').optional().nullable(),
  age: z.number().min(3, 'Age must be at least 3').max(25, 'Age must be realistic for school').optional().nullable(),
  admission_year: z.string().max(10, 'Admission year must be 10 characters or less').optional().nullable(),
  orig_province: z.string().max(80, 'Province must be 80 characters or less').optional().nullable(),
  orig_district: z.string().max(80, 'District must be 80 characters or less').optional().nullable(),
  orig_village: z.string().max(80, 'Village must be 80 characters or less').optional().nullable(),
  curr_province: z.string().max(80, 'Province must be 80 characters or less').optional().nullable(),
  curr_district: z.string().max(80, 'District must be 80 characters or less').optional().nullable(),
  curr_village: z.string().max(80, 'Village must be 80 characters or less').optional().nullable(),
  nationality: z.string().max(80, 'Nationality must be 80 characters or less').optional().nullable(),
  preferred_language: z.string().max(50, 'Preferred language must be 50 characters or less').optional().nullable(),
  previous_school: z.string().max(150, 'Previous school must be 150 characters or less').optional().nullable(),
  guardian_name: z.string().max(150, 'Guardian name must be 150 characters or less').optional().nullable(),
  guardian_relation: z.string().max(100, 'Relation must be 100 characters or less').optional().nullable(),
  guardian_phone: z.string().max(30, 'Phone must be 30 characters or less').optional().nullable(),
  guardian_tazkira: z.string().max(50, 'Tazkira must be 50 characters or less').optional().nullable(),
  guardian_picture_path: z.string().max(255, 'Guardian picture path must be 255 characters or less').optional().nullable(),
  home_address: z.string().max(255, 'Address must be 255 characters or less').optional().nullable(),
  zamin_name: z.string().max(150, 'Guarantor name must be 150 characters or less').optional().nullable(),
  zamin_phone: z.string().max(30, 'Guarantor phone must be 30 characters or less').optional().nullable(),
  zamin_tazkira: z.string().max(50, 'Guarantor tazkira must be 50 characters or less').optional().nullable(),
  zamin_address: z.string().max(255, 'Guarantor address must be 255 characters or less').optional().nullable(),
  applying_grade: z.string().max(50, 'Applying grade must be 50 characters or less').optional().nullable(),
  is_orphan: z.boolean().default(false),
  admission_fee_status: z.enum(['paid', 'pending', 'waived', 'partial']).default('pending'),
  student_status: z.enum(['applied', 'admitted', 'active', 'withdrawn']).default('active'),
  disability_status: z.string().max(150, 'Disability info must be 150 characters or less').optional().nullable(),
  emergency_contact_name: z.string().max(150, 'Emergency contact must be 150 characters or less').optional().nullable(),
  emergency_contact_phone: z.string().max(30, 'Emergency contact phone must be 30 characters or less').optional().nullable(),
  family_income: z.string().max(100, 'Family income must be 100 characters or less').optional().nullable(),
});

type StudentFormData = z.infer<typeof studentSchema>;

const statusBadge = (status: Student['student_status']) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
      return 'secondary';
    case 'applied':
      return 'outline';
    case 'withdrawn':
      return 'destructive';
    default:
      return 'secondary';
  }
};

export function Students() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: organizations } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>(profile?.organization_id);
  const orgIdForQuery = selectedOrg === 'all' ? undefined : selectedOrg;

  const { data: students, isLoading } = useStudents(orgIdForQuery);
  const { data: stats } = useStudentStats(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Student['student_status']>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      is_orphan: false,
      admission_fee_status: 'pending',
      student_status: 'active',
      preferred_language: 'Dari',
      nationality: 'Afghan',
    },
  });

  const onSubmit = (data: StudentFormData) => {
    const payload: StudentInsert = {
      ...data,
      organization_id: data.organization_id || profile?.organization_id,
      school_id: data.school_id || null,
    };

    if (selectedStudent) {
      updateStudent.mutate(
        { id: selectedStudent.id, data: payload },
        {
          onSuccess: () => {
            setIsEditOpen(false);
            setSelectedStudent(null);
            reset();
          },
        },
      );
    } else {
      createStudent.mutate(payload, {
        onSuccess: () => {
          setIsCreateOpen(false);
          reset();
        },
      });
    }
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    reset({
      ...student,
      age: student.age ?? undefined,
    });
    setIsEditOpen(true);
  };

  const handleDelete = (student: Student) => {
    setSelectedStudent(student);
  };

  const confirmDelete = () => {
    if (selectedStudent) {
      deleteStudent.mutate(selectedStudent.id, {
        onSuccess: () => setSelectedStudent(null),
      });
    }
  };

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: 'admission_no',
        accessorKey: 'admission_no',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Admission #" />,
        cell: ({ row }) => <span className="font-medium">{row.original.admission_no}</span>,
        enableColumnFilter: true,
      },
      {
        id: 'full_name',
        accessorKey: 'full_name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Student" />,
        cell: ({ row }) => (
          <div className="space-y-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold break-words">{row.original.full_name}</span>
              <Badge variant={statusBadge(row.original.student_status)} className="shrink-0">{row.original.student_status}</Badge>
              {row.original.is_orphan && (
                <Badge variant="destructive" className="shrink-0">
                  Orphan
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
              <span className="break-words">Father: {row.original.father_name}</span>
              {row.original.guardian_phone && <span className="break-words">Guardian: {row.original.guardian_phone}</span>}
            </div>
          </div>
        ),
        enableColumnFilter: false,
      },
      {
        id: 'school_id',
        accessorKey: 'school_id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="School" />,
        cell: ({ row }) => schools?.find((school) => school.id === row.original.school_id)?.school_name || '—',
        enableColumnFilter: true,
      },
      {
        id: 'gender',
        accessorKey: 'gender',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Gender" />,
        cell: ({ row }) => <Badge variant="outline">{row.original.gender}</Badge>,
        enableColumnFilter: true,
      },
      {
        id: 'applying_grade',
        accessorKey: 'applying_grade',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Applying Grade" />,
        cell: ({ row }) => row.original.applying_grade || '—',
        enableColumnFilter: true,
      },
      {
        id: 'admission_fee_status',
        accessorKey: 'admission_fee_status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Fee Status" />,
        cell: ({ row }) => <Badge variant="secondary">{row.original.admission_fee_status}</Badge>,
        enableColumnFilter: true,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [schools],
  );

  const { table } = useDataTable<Student>({
    data: students || [],
    columns,
    initialState: {
      sorting: [{ id: 'admission_no', desc: false }],
      pagination: { pageSize: 10 },
    },
    getRowId: (row) => (row as Student).id,
  });

  useEffect(() => {
    table.getColumn('student_status')?.setFilterValue(statusFilter === 'all' ? undefined : statusFilter);
    table.getColumn('gender')?.setFilterValue(genderFilter === 'all' ? undefined : genderFilter);
    table.getColumn('school_id')?.setFilterValue(schoolFilter === 'all' ? undefined : schoolFilter);
  }, [genderFilter, schoolFilter, statusFilter, table]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('students.title') || 'Students'}</h1>
          <p className="text-muted-foreground">
            {t('students.subtitle') || 'Manage admissions with complete Afghan student records'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Select value={selectedOrg || 'all'} onValueChange={(value) => setSelectedOrg(value === 'all' ? 'all' : value)}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('students.add') || 'Register Student'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
              <DialogHeader>
                <DialogTitle>{t('students.add') || 'Register Student'}</DialogTitle>
                <DialogDescription>
                  {t('students.addDescription') || 'Capture admission details with guardian and residency information.'}
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
                    <Label>Admission No</Label>
                    <Input placeholder="SH-2024-001" {...register('admission_no')} />
                    {errors.admission_no && (
                      <p className="text-destructive text-sm mt-1">{errors.admission_no.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Card Number</Label>
                    <Input placeholder="Card-1001" {...register('card_number')} />
                  </div>
                  <div>
                    <Label>Full Name</Label>
                    <Input placeholder="Student full name" {...register('full_name')} />
                    {errors.full_name && <p className="text-destructive text-sm mt-1">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <Label>Father Name</Label>
                    <Input placeholder="Father name" {...register('father_name')} />
                    {errors.father_name && <p className="text-destructive text-sm mt-1">{errors.father_name.message}</p>}
                  </div>
                  <div>
                    <Label>Grandfather Name</Label>
                    <Input placeholder="Grandfather name" {...register('grandfather_name')} />
                  </div>
                  <div>
                    <Label>Mother Name</Label>
                    <Input placeholder="Mother name" {...register('mother_name')} />
                  </div>
                  <div>
                    <Label>Gender</Label>
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
                    {errors.gender && <p className="text-destructive text-sm mt-1">{errors.gender.message}</p>}
                  </div>
                  <div>
                    <Label>Birth Year</Label>
                    <Input placeholder="1387" {...register('birth_year')} />
                  </div>
                  <div>
                    <Label>Birth Date</Label>
                    <Input placeholder="2008-03-21" {...register('birth_date')} />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input type="number" placeholder="15" {...register('age', { valueAsNumber: true })} />
                    {errors.age && <p className="text-destructive text-sm mt-1">{errors.age.message}</p>}
                  </div>
                  <div>
                    <Label>Admission Year</Label>
                    <Input placeholder="2024" {...register('admission_year')} />
                  </div>
                  <div>
                    <Label>Applying Grade</Label>
                    <Input placeholder="Grade 7" {...register('applying_grade')} />
                  </div>
                  <div>
                    <Label>Preferred Language</Label>
                    <Input placeholder="Dari / Pashto" {...register('preferred_language')} />
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <Input placeholder="Afghan" {...register('nationality')} />
                  </div>
                  <div>
                    <Label>Previous School</Label>
                    <Input placeholder="Previous madrasa or school" {...register('previous_school')} />
                  </div>
                </div>

                <Tabs defaultValue="origin" className="w-full">
                  <TabsList>
                    <TabsTrigger value="origin">Origin</TabsTrigger>
                    <TabsTrigger value="current">Current</TabsTrigger>
                    <TabsTrigger value="guardian">Guardian</TabsTrigger>
                  </TabsList>
                  <TabsContent value="origin" className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Origin Province</Label>
                      <Input placeholder="Province" {...register('orig_province')} />
                    </div>
                    <div>
                      <Label>Origin District</Label>
                      <Input placeholder="District" {...register('orig_district')} />
                    </div>
                    <div>
                      <Label>Origin Village</Label>
                      <Input placeholder="Village" {...register('orig_village')} />
                    </div>
                  </TabsContent>
                  <TabsContent value="current" className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Current Province</Label>
                      <Input placeholder="Province" {...register('curr_province')} />
                    </div>
                    <div>
                      <Label>Current District</Label>
                      <Input placeholder="District" {...register('curr_district')} />
                    </div>
                    <div>
                      <Label>Current Village</Label>
                      <Input placeholder="Village" {...register('curr_village')} />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Home Address</Label>
                      <Textarea placeholder="Full address" {...register('home_address')} />
                    </div>
                  </TabsContent>
                  <TabsContent value="guardian" className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Guardian Name</Label>
                      <Input placeholder="Guardian" {...register('guardian_name')} />
                    </div>
                    <div>
                      <Label>Relation</Label>
                      <Input placeholder="Relation" {...register('guardian_relation')} />
                    </div>
                    <div>
                      <Label>Guardian Phone</Label>
                      <Input placeholder="Phone" {...register('guardian_phone')} />
                    </div>
                    <div>
                      <Label>Guardian Tazkira</Label>
                      <Input placeholder="Tazkira" {...register('guardian_tazkira')} />
                    </div>
                    <div>
                      <Label>Guardian Picture Path</Label>
                      <Input placeholder="Storage path" {...register('guardian_picture_path')} />
                    </div>
                    <div>
                      <Label>Zamin/Guarantor Name</Label>
                      <Input placeholder="Guarantor" {...register('zamin_name')} />
                    </div>
                    <div>
                      <Label>Zamin Phone</Label>
                      <Input placeholder="Phone" {...register('zamin_phone')} />
                    </div>
                    <div>
                      <Label>Zamin Tazkira</Label>
                      <Input placeholder="Tazkira" {...register('zamin_tazkira')} />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Zamin Address</Label>
                      <Textarea placeholder="Guarantor address" {...register('zamin_address')} />
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label>Admission Fee Status</Label>
                    <Controller
                      control={control}
                      name="admission_fee_status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Fee status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="waived">Waived</SelectItem>
                            <SelectItem value="partial">Partial</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Student Status</Label>
                    <Controller
                      control={control}
                      name="student_status"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Applied</SelectItem>
                            <SelectItem value="admitted">Admitted</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Orphan Status</Label>
                    <Controller
                      control={control}
                      name="is_orphan"
                      render={({ field }) => (
                        <Select value={field.value ? 'yes' : 'no'} onValueChange={(value) => field.onChange(value === 'yes')}>
                          <SelectTrigger>
                            <SelectValue placeholder="Orphan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Orphan</SelectItem>
                            <SelectItem value="no">Has parents</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div>
                    <Label>Disability Status</Label>
                    <Input placeholder="e.g. Hearing impairment" {...register('disability_status')} />
                  </div>
                  <div>
                    <Label>Emergency Contact Name</Label>
                    <Input placeholder="Emergency contact" {...register('emergency_contact_name')} />
                  </div>
                  <div>
                    <Label>Emergency Contact Phone</Label>
                    <Input placeholder="Contact phone" {...register('emergency_contact_phone')} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>Family Income / Support Details</Label>
                    <Textarea placeholder="Monthly income or donor support" {...register('family_income')} />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    {selectedStudent ? 'Update Student' : 'Register Student'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.total') || 'Total Students'}</CardTitle>
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">Across selected organization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.male') || 'Male'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.male ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered male students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.female') || 'Female'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.female ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered female students</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.orphans') || 'Orphans'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orphans ?? 0}</div>
            <p className="text-xs text-muted-foreground">Needing special care</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('students.list') || 'Student Registrations'}</CardTitle>
          <CardDescription>{t('students.listDescription') || 'Search, filter and update admissions.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4 overflow-x-auto">
              <DataTable table={table}>
                <div className="space-y-3">
                  <DataTableToolbar
                    table={table}
                    placeholder="Search students, admission #, guardian phone"
                  >
                    <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="School" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Schools</SelectItem>
                        {schools?.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.school_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="admitted">Admitted</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={genderFilter} onValueChange={(value) => setGenderFilter(value as typeof genderFilter)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </DataTableToolbar>

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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update registration and guardian details.</DialogDescription>
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
                <Label>Admission No</Label>
                <Input placeholder="SH-2024-001" {...register('admission_no')} />
                {errors.admission_no && <p className="text-destructive text-sm mt-1">{errors.admission_no.message}</p>}
              </div>
              <div>
                <Label>Card Number</Label>
                <Input placeholder="Card-1001" {...register('card_number')} />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input placeholder="Student full name" {...register('full_name')} />
                {errors.full_name && <p className="text-destructive text-sm mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <Label>Father Name</Label>
                <Input placeholder="Father name" {...register('father_name')} />
                {errors.father_name && <p className="text-destructive text-sm mt-1">{errors.father_name.message}</p>}
              </div>
              <div>
                <Label>Guardian Phone</Label>
                <Input placeholder="Phone" {...register('guardian_phone')} />
              </div>
              <div>
                <Label>Applying Grade</Label>
                <Input placeholder="Grade 7" {...register('applying_grade')} />
              </div>
              <div>
                <Label>Student Status</Label>
                <Controller
                  control={control}
                  name="student_status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="admitted">Admitted</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full">
                Update Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!selectedStudent && !isEditOpen} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student record?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">
            Removing this student will keep the audit trail but hide it from admissions lists.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Students;
