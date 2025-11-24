import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Shield, UserRound, IdCard, Printer, Upload, BookOpen, Smile } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSchools } from '@/hooks/useSchools';
import {
  useCreateStudent,
  useDeleteStudent,
  useUploadStudentPicture,
  useUploadStudentDocument,
  useCreateStudentPreviousStudy,
  useCreateStudentBehavior,
  useStudentDocuments,
  useStudentPreviousStudies,
  useStudentBehaviors,
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
  const uploadStudentPicture = useUploadStudentPicture();
  const uploadStudentDocument = useUploadStudentDocument();
  const createPreviousStudy = useCreateStudentPreviousStudy();
  const createBehavior = useCreateStudentBehavior();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Student['student_status']>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [previousStudy, setPreviousStudy] = useState({
    institution_name: '',
    level: '',
    start_year: '',
    end_year: '',
    notes: '',
  });
  const [behaviorEntry, setBehaviorEntry] = useState({
    behavior_type: 'positive' as 'positive' | 'negative',
    severity: 'low' as 'low' | 'medium' | 'high',
    title: '',
    description: '',
    occurred_on: '',
  });
  const profilePrintRef = useRef<HTMLDivElement>(null);

  const { data: studentDocuments } = useStudentDocuments(profileStudent?.id);
  const { data: studentPreviousStudies } = useStudentPreviousStudies(profileStudent?.id);
  const { data: studentBehaviors } = useStudentBehaviors(profileStudent?.id);

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

  const resetFormState = () => {
    reset();
    setSelectedStudent(null);
    setPhotoFile(null);
    setDocumentFile(null);
    setDocumentType('');
    setDocumentDescription('');
  };

  const onSubmit = async (data: StudentFormData) => {
    const payload: StudentInsert = {
      ...data,
      organization_id: data.organization_id || profile?.organization_id,
      school_id: data.school_id || null,
    };

    try {
      if (selectedStudent) {
        const updated = await updateStudent.mutateAsync({ id: selectedStudent.id, data: payload });

        if (updated && photoFile) {
          await uploadStudentPicture.mutateAsync({
            studentId: selectedStudent.id,
            organizationId: updated.organization_id,
            schoolId: updated.school_id,
            file: photoFile,
          });
        }

        if (updated && documentFile && documentType) {
          await uploadStudentDocument.mutateAsync({
            studentId: selectedStudent.id,
            organizationId: updated.organization_id,
            schoolId: updated.school_id,
            file: documentFile,
            documentType,
            description: documentDescription,
          });
        }

        setIsEditOpen(false);
      } else {
        const created = await createStudent.mutateAsync(payload);

        if (created && photoFile) {
          await uploadStudentPicture.mutateAsync({
            studentId: created.id,
            organizationId: created.organization_id,
            schoolId: created.school_id,
            file: photoFile,
          });
        }

        if (created && documentFile && documentType) {
          await uploadStudentDocument.mutateAsync({
            studentId: created.id,
            organizationId: created.organization_id,
            schoolId: created.school_id,
            file: documentFile,
            documentType,
            description: documentDescription,
          });
        }

        setIsCreateOpen(false);
      }

      resetFormState();
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    reset({
      ...student,
      age: student.age ?? undefined,
    });
    setPhotoFile(null);
    setDocumentFile(null);
    setDocumentType('');
    setDocumentDescription('');
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

  const handleProfileView = (student: Student) => {
    setProfileStudent(student);
  };

  const handleCloseProfile = () => {
    setProfileStudent(null);
    setDocumentFile(null);
    setDocumentType('');
    setDocumentDescription('');
    setPreviousStudy({ institution_name: '', level: '', start_year: '', end_year: '', notes: '' });
    setBehaviorEntry({ behavior_type: 'positive', severity: 'low', title: '', description: '', occurred_on: '' });
  };

  const getStudentImageUrl = (student?: Student | null) => {
    if (!student?.picture_path) return null;
    const { data } = supabase.storage.from('student-files').getPublicUrl(student.picture_path);
    return data.publicUrl;
  };

  const handlePrintProfile = () => {
    if (!profilePrintRef.current) return;
    const printContents = profilePrintRef.current.innerHTML;
    const printWindow = window.open('', 'PRINT', 'height=720,width=1080');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Student Profile</title>`);
    printWindow.document.write(
      '<style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#f5f5f5;} .profile-card{max-width:960px;margin:0 auto;border-radius:12px;background:white;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,0.08);} .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;} .badge{display:inline-block;padding:4px 10px;border-radius:9999px;background:#eef2ff;color:#4338ca;font-size:12px;font-weight:600;} h2{margin:0 0 8px 0;} p{margin:4px 0;} </style>'
    );
    printWindow.document.write('</head><body>');
    printWindow.document.write(`<div class="profile-card">${printContents}</div>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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
            <Button variant="ghost" size="icon" onClick={() => handleProfileView(row.original)}>
              <IdCard className="h-4 w-4" />
            </Button>
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
    [schools, handleDelete, handleEdit, handleProfileView],
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
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                  Organize the registration by completing the cards below. You can now attach a profile photo and important
                  enrollment documents without leaving this dialog.
                </div>

                <Tabs defaultValue="identity" className="space-y-4">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="identity">Identity</TabsTrigger>
                    <TabsTrigger value="guardian">Guardian</TabsTrigger>
                    <TabsTrigger value="residency">Residency</TabsTrigger>
                    <TabsTrigger value="safety">Safety & Attachments</TabsTrigger>
                  </TabsList>

                  <TabsContent value="identity" className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 grid md:grid-cols-2 gap-4">
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
                            {errors.organization_id && (
                              <p className="text-destructive text-sm mt-1">{errors.organization_id.message}</p>
                            )}
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
                                  <SelectItem value="">Unassigned</SelectItem>
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
                          <Label>Admission #</Label>
                          <Input placeholder="2024-001" {...register('admission_no')} />
                          {errors.admission_no && (
                            <p className="text-destructive text-sm mt-1">{errors.admission_no.message}</p>
                          )}
                        </div>
                        <div>
                          <Label>Student Card #</Label>
                          <Input placeholder="Card number" {...register('card_number')} />
                          {errors.card_number && <p className="text-destructive text-sm mt-1">{errors.card_number.message}</p>}
                        </div>
                        <div>
                          <Label>Full Name</Label>
                          <Input placeholder="Full name" {...register('full_name')} />
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
                            control={control}
                            name="gender"
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
                          <Input placeholder="1386" {...register('birth_year')} />
                        </div>
                        <div>
                          <Label>Birth Date</Label>
                          <Input placeholder="2024-02-01" {...register('birth_date')} />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <Input type="number" placeholder="12" {...register('age', { valueAsNumber: true })} />
                          {errors.age && <p className="text-destructive text-sm mt-1">{errors.age.message}</p>}
                        </div>
                        <div>
                          <Label>Admission Year</Label>
                          <Input placeholder="2024" {...register('admission_year')} />
                        </div>
                        <div>
                          <Label>Applying Grade</Label>
                          <Input placeholder="e.g. 7" {...register('applying_grade')} />
                        </div>
                      </div>
                      <Card className="border-dashed border-2 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-3">
                          {photoFile ? (
                            <img src={URL.createObjectURL(photoFile)} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserRound className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <p className="font-semibold">Student Photo</p>
                        <p className="text-sm text-muted-foreground mb-3">Attach a face photo for badges and profiles.</p>
                        <div className="flex flex-col gap-2 w-full">
                          <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                          {selectedStudent?.picture_path && !photoFile && (
                            <p className="text-xs text-muted-foreground">
                              Existing photo will remain unless you upload a new one.
                            </p>
                          )}
                        </div>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="guardian" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Guardian Name</Label>
                        <Input placeholder="Guardian" {...register('guardian_name')} />
                      </div>
                      <div>
                        <Label>Guardian Relation</Label>
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
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Guarantor Name</Label>
                        <Input placeholder="Guarantor" {...register('zamin_name')} />
                      </div>
                      <div>
                        <Label>Guarantor Phone</Label>
                        <Input placeholder="Phone" {...register('zamin_phone')} />
                      </div>
                      <div>
                        <Label>Guarantor Tazkira</Label>
                        <Input placeholder="Tazkira" {...register('zamin_tazkira')} />
                      </div>
                      <div>
                        <Label>Guarantor Address</Label>
                        <Input placeholder="Address" {...register('zamin_address')} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="residency" className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
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
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
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
                    </div>
                    <div>
                      <Label>Home Address</Label>
                      <Textarea placeholder="Full address" {...register('home_address')} />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Nationality</Label>
                        <Input placeholder="Afghan" {...register('nationality')} />
                      </div>
                      <div>
                        <Label>Preferred Language</Label>
                        <Input placeholder="Dari / Pashto" {...register('preferred_language')} />
                      </div>
                      <div>
                        <Label>Previous School</Label>
                        <Input placeholder="Previous school name" {...register('previous_school')} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="safety" className="space-y-4">
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

                    <Card className="p-4 border-dashed border-2">
                      <div className="flex items-start gap-3">
                        <Upload className="h-5 w-5 text-primary mt-0.5" />
                        <div className="w-full space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">Attach enrollment documents</p>
                              <p className="text-sm text-muted-foreground">Upload transcript, birth certificate, or guardian ID.</p>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-3 gap-3">
                            <div className="md:col-span-2 flex flex-col gap-2">
                              <Input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                              <Input
                                placeholder="Document type (e.g. tazkira, transcript)"
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                              />
                            </div>
                            <div>
                              <Input
                                placeholder="Notes"
                                value={documentDescription}
                                onChange={(e) => setDocumentDescription(e.target.value)}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">Files are stored securely in the student bucket.</p>
                        </div>
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>

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

      <Dialog open={!!profileStudent} onOpenChange={(open) => !open && handleCloseProfile()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>Student profile & dossier</DialogTitle>
                <DialogDescription>
                  Preview, print, and enrich the student record with documents, prior studies, and behavior notes.
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintProfile}>
                  <Printer className="w-4 h-4 mr-2" /> Print profile
                </Button>
                {profileStudent && (
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(profileStudent)}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="studies">Previous studies</TabsTrigger>
              <TabsTrigger value="behavior">Behavior</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div ref={profilePrintRef} className="space-y-4">
                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-3 gap-4 items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-white shadow-inner border overflow-hidden flex items-center justify-center">
                          {profileStudent?.picture_path || photoFile ? (
                            <img
                              src={photoFile ? URL.createObjectURL(photoFile) : getStudentImageUrl(profileStudent) || ''}
                              alt={profileStudent?.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserRound className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Admission #{profileStudent?.admission_no}</p>
                          <h3 className="text-2xl font-bold">{profileStudent?.full_name}</h3>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={statusBadge(profileStudent?.student_status || 'active')}>
                              {profileStudent?.student_status}
                            </Badge>
                            <Badge variant="outline">{profileStudent?.gender}</Badge>
                            {profileStudent?.is_orphan && <Badge variant="destructive">Orphan</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Guardian</p>
                        <p className="text-muted-foreground">{profileStudent?.guardian_name || '—'}</p>
                        <p className="text-muted-foreground">{profileStudent?.guardian_phone || '—'}</p>
                        <p className="text-muted-foreground">{profileStudent?.home_address || 'Home address pending'}</p>
                      </div>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Residency</p>
                        <p className="text-muted-foreground">Origin: {profileStudent?.orig_province || '—'}</p>
                        <p className="text-muted-foreground">Current: {profileStudent?.curr_province || '—'}</p>
                        <p className="text-muted-foreground">Applying grade: {profileStudent?.applying_grade || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Identity</CardTitle>
                      <IdCard className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p>Father: {profileStudent?.father_name}</p>
                      <p>Mother: {profileStudent?.mother_name || '—'}</p>
                      <p>Age: {profileStudent?.age || '—'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Schooling</CardTitle>
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p>Admission year: {profileStudent?.admission_year || '—'}</p>
                      <p>Previous school: {profileStudent?.previous_school || '—'}</p>
                      <p>Fee status: {profileStudent?.admission_fee_status}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Safety</CardTitle>
                      <Shield className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1">
                      <p>Disability: {profileStudent?.disability_status || 'None reported'}</p>
                      <p>Emergency: {profileStudent?.emergency_contact_name || '—'} {profileStudent?.emergency_contact_phone}</p>
                      <p>Income: {profileStudent?.family_income || '—'}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <div className="w-full space-y-3">
                      <div>
                        <p className="font-semibold">Upload supporting document</p>
                        <p className="text-sm text-muted-foreground">Store scanned IDs, transcripts, or certificates.</p>
                      </div>
                      <Input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] || null)} />
                      <div className="grid md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Document type (e.g. transcript)"
                          value={documentType}
                          onChange={(e) => setDocumentType(e.target.value)}
                        />
                        <Input
                          placeholder="Description"
                          value={documentDescription}
                          onChange={(e) => setDocumentDescription(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        disabled={!profileStudent || !documentFile || !documentType || uploadStudentDocument.isPending}
                        onClick={() => {
                          if (!profileStudent || !documentFile || !documentType) return;
                          uploadStudentDocument.mutate({
                            studentId: profileStudent.id,
                            organizationId: profileStudent.organization_id,
                            schoolId: profileStudent.school_id,
                            file: documentFile,
                            documentType,
                            description: documentDescription,
                          });
                          setDocumentFile(null);
                          setDocumentType('');
                          setDocumentDescription('');
                        }}
                      >
                        {uploadStudentDocument.isPending ? 'Uploading...' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="font-semibold mb-2">Existing files</p>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {(studentDocuments || []).length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
                    {(studentDocuments || []).map((doc) => {
                      const { data } = supabase.storage.from('student-files').getPublicUrl(doc.file_path);
                      return (
                        <div key={doc.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{doc.document_type}</p>
                            <p className="text-xs text-muted-foreground">{doc.description || doc.file_name}</p>
                          </div>
                          <a className="text-primary text-sm" href={data.publicUrl} target="_blank" rel="noreferrer">
                            View
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="studies" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                  <div className="w-full space-y-3">
                    <div className="grid md:grid-cols-4 gap-2">
                      <Input
                        placeholder="Institution"
                        value={previousStudy.institution_name}
                        onChange={(e) => setPreviousStudy((prev) => ({ ...prev, institution_name: e.target.value }))}
                      />
                      <Input
                        placeholder="Level"
                        value={previousStudy.level}
                        onChange={(e) => setPreviousStudy((prev) => ({ ...prev, level: e.target.value }))}
                      />
                      <Input
                        placeholder="Start year"
                        value={previousStudy.start_year}
                        onChange={(e) => setPreviousStudy((prev) => ({ ...prev, start_year: e.target.value }))}
                      />
                      <Input
                        placeholder="End year"
                        value={previousStudy.end_year}
                        onChange={(e) => setPreviousStudy((prev) => ({ ...prev, end_year: e.target.value }))}
                      />
                    </div>
                    <Textarea
                      placeholder="Notes about performance or curriculum"
                      value={previousStudy.notes}
                      onChange={(e) => setPreviousStudy((prev) => ({ ...prev, notes: e.target.value }))}
                    />
                    <Button
                      type="button"
                      disabled={!profileStudent || !previousStudy.institution_name || createPreviousStudy.isPending}
                      onClick={() => {
                        if (!profileStudent || !previousStudy.institution_name) return;
                        createPreviousStudy.mutate({
                          student_id: profileStudent.id,
                          organization_id: profileStudent.organization_id,
                          school_id: profileStudent.school_id,
                          ...previousStudy,
                        });
                        setPreviousStudy({ institution_name: '', level: '', start_year: '', end_year: '', notes: '' });
                      }}
                    >
                      {createPreviousStudy.isPending ? 'Saving...' : 'Add previous study'}
                    </Button>
                  </div>
                </div>
              </Card>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(studentPreviousStudies || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No previous studies recorded yet.</p>
                )}
                {(studentPreviousStudies || []).map((study) => (
                  <Card key={study.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{study.institution_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {study.level || '—'} • {study.start_year || '—'} - {study.end_year || '—'}
                        </p>
                      </div>
                      <Badge variant="outline">Recorded</Badge>
                    </div>
                    {study.notes && <p className="text-sm text-muted-foreground mt-2">{study.notes}</p>}
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Smile className="w-5 h-5 text-primary mt-0.5" />
                  <div className="w-full space-y-3">
                    <div className="grid md:grid-cols-3 gap-2">
                      <Select
                        value={behaviorEntry.behavior_type}
                        onValueChange={(value) => setBehaviorEntry((prev) => ({ ...prev, behavior_type: value as 'positive' | 'negative' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="positive">Positive</SelectItem>
                          <SelectItem value="negative">Negative</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={behaviorEntry.severity}
                        onValueChange={(value) => setBehaviorEntry((prev) => ({ ...prev, severity: value as 'low' | 'medium' | 'high' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Severity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={behaviorEntry.occurred_on}
                        onChange={(e) => setBehaviorEntry((prev) => ({ ...prev, occurred_on: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="Title (e.g. Leadership in class project)"
                      value={behaviorEntry.title}
                      onChange={(e) => setBehaviorEntry((prev) => ({ ...prev, title: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Details, interventions, or praise"
                      value={behaviorEntry.description}
                      onChange={(e) => setBehaviorEntry((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <Button
                      type="button"
                      disabled={!profileStudent || !behaviorEntry.title || createBehavior.isPending}
                      onClick={() => {
                        if (!profileStudent || !behaviorEntry.title) return;
                        createBehavior.mutate({
                          student_id: profileStudent.id,
                          organization_id: profileStudent.organization_id,
                          school_id: profileStudent.school_id,
                          reported_by: profile?.id || null,
                          ...behaviorEntry,
                        });
                        setBehaviorEntry({ behavior_type: 'positive', severity: 'low', title: '', description: '', occurred_on: '' });
                      }}
                    >
                      {createBehavior.isPending ? 'Saving...' : 'Log behavior'}
                    </Button>
                  </div>
                </div>
              </Card>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(studentBehaviors || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No behavior notes yet.</p>
                )}
                {(studentBehaviors || []).map((behavior) => (
                  <Card key={behavior.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{behavior.title}</p>
                        <p className="text-sm text-muted-foreground">{behavior.behavior_type} • {behavior.severity || '—'}</p>
                      </div>
                      <Badge variant={behavior.behavior_type === 'positive' ? 'default' : 'destructive'}>
                        {behavior.behavior_type}
                      </Badge>
                    </div>
                    {behavior.description && <p className="text-sm text-muted-foreground mt-2">{behavior.description}</p>}
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
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
