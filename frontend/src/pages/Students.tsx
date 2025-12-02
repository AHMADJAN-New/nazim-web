import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentSchema, type StudentFormData } from '@/lib/validations';
import { Plus, Pencil, Trash2, Shield, UserRound, Eye, Printer, FileText, BookOpen, AlertTriangle, Search } from 'lucide-react';
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
  useStudentEducationalHistory,
  useStudentDisciplineRecords,
} from '@/hooks/useStudents';
import type { Student } from '@/types/domain/student';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import StudentProfileView from '@/components/students/StudentProfileView';
import { StudentDocumentsDialog } from '@/components/students/StudentDocumentsDialog';
import { StudentEducationalHistoryDialog } from '@/components/students/StudentEducationalHistoryDialog';
import { StudentDisciplineRecordsDialog } from '@/components/students/StudentDisciplineRecordsDialog';
import { generateStudentProfilePdf } from '@/lib/studentProfilePdf';
import { toast } from 'sonner';


// Helper function to convert StudentFormData to domain Student format
const cleanStudentData = (data: StudentFormData): Partial<Student> => {
  const cleaned: any = { ...data };

  // List of optional fields that should be null if empty
  const optionalFields = [
    'cardNumber', 'grandfatherName', 'motherName', 'birthYear', 'birthDate',
    'admissionYear', 'origProvince', 'origDistrict', 'origVillage',
    'currProvince', 'currDistrict', 'currVillage', 'nationality',
    'preferredLanguage', 'previousSchool', 'guardianName', 'guardianRelation',
    'guardianPhone', 'guardianTazkira', 'guardianPicturePath', 'homeAddress',
    'zaminName', 'zaminPhone', 'zaminTazkira', 'zaminAddress', 'applyingGrade',
    'disabilityStatus', 'emergencyContactName', 'emergencyContactPhone', 'familyIncome'
  ];

  optionalFields.forEach(field => {
    if (cleaned[field] === '' || (typeof cleaned[field] === 'string' && cleaned[field].trim() === '')) {
      cleaned[field] = null;
    }
  });

  return cleaned;
};

const statusBadge = (status: Student['status']) => {
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
  const { t, isRTL } = useLanguage();
  const { data: profile } = useProfile();
  const isSuperAdmin = useIsSuperAdmin();
  const { data: organizations } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string | undefined>(profile?.organization_id);
  const orgIdForQuery = selectedOrg === 'all' ? undefined : selectedOrg;

  const { data: students, isLoading, error } = useStudents(orgIdForQuery);
  const { data: stats } = useStudentStats(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const pictureUpload = useStudentPictureUpload();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToView, setStudentToView] = useState<Student | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dialog states for documents, history, and discipline from main table
  const [documentsDialogStudent, setDocumentsDialogStudent] = useState<Student | null>(null);
  const [historyDialogStudent, setHistoryDialogStudent] = useState<Student | null>(null);
  const [disciplineDialogStudent, setDisciplineDialogStudent] = useState<Student | null>(null);

  // Debug logging removed for performance (was causing excessive re-renders)

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

  const onDialogSubmit = async (values: any, isEdit: boolean, pictureFile?: File | null) => {
    // Use same cleaning as existing submit
    const cleanedData = cleanStudentData(values as StudentFormData);
    // Resolve organizationId respecting multi-tenancy
    let organizationId = cleanedData.organizationId || profile?.organization_id || null;
    if (isSuperAdmin) {
      if (selectedOrg && selectedOrg !== 'all') {
        organizationId = selectedOrg;
      }
    }
    // Fallback: derive organization from selected school (for super_admin without header org selection)
    if (!organizationId && cleanedData.schoolId) {
      const schoolMatch = schools?.find((s) => s.id === cleanedData.schoolId);
      if (schoolMatch && (schoolMatch as any).organization_id) {
        organizationId = (schoolMatch as any).organization_id as string;
      }
    }
    if (!organizationId) {
      if (import.meta.env.DEV) {
        console.warn('Organization is required to create/update student');
      }
      return;
    }

    const payload: Partial<Student> = {
      ...cleanedData,
      organizationId,
      schoolId: cleanedData.schoolId || null,
    };

    if (isEdit && selectedStudent) {
      // Remove organizationId from update payload - it should never be updated
      const { organizationId: _, ...updatePayload } = payload;
      await new Promise<void>((resolve, reject) => {
        updateStudent.mutate(
          { id: selectedStudent.id, data: updatePayload },
          {
            onSuccess: async (updatedStudent) => {
              // Upload picture if one was selected during edit
              if (pictureFile && updatedStudent?.id && organizationId) {
                try {
                  await pictureUpload.mutateAsync({
                    file: pictureFile,
                    studentId: updatedStudent.id,
                    organizationId,
                    schoolId: cleanedData.schoolId || null,
                  });
                } catch (error) {
                  if (import.meta.env.DEV) {
                    console.error('Failed to upload picture:', error);
                  }
                  // Don't reject the whole mutation if picture upload fails
                }
              }
              resolve();
            },
            onError: () => reject()
          }
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        createStudent.mutate(payload, {
          onSuccess: async (createdStudent) => {
            // Upload picture if one was selected during creation
            if (pictureFile && createdStudent?.id && organizationId) {
              try {
                await pictureUpload.mutateAsync({
                  file: pictureFile,
                  studentId: createdStudent.id,
                  organizationId,
                  schoolId: cleanedData.schoolId || null,
                });
              } catch (error) {
                if (import.meta.env.DEV) {
                  console.error('Failed to upload picture:', error);
                }
                // Don't reject the whole mutation if picture upload fails
              }
            }
            resolve();
          },
          onError: () => reject()
        });
      });
    }
  };

  const onSubmit = (data: StudentFormData) => {
    // Clean the data (convert empty strings to null)
    const cleanedData = cleanStudentData(data);
    const payload: Partial<Student> = {
      ...cleanedData,
      organizationId: cleanedData.organizationId || profile?.organization_id,
      schoolId: cleanedData.schoolId || null,
    };

    if (selectedStudent) {
      // Remove organizationId from update payload - it should never be updated
      const { organizationId, ...updatePayload } = payload;
      updateStudent.mutate(
        { id: selectedStudent.id, data: updatePayload },
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

  const handleView = (student: Student) => {
    setStudentToView(student);
    setIsViewOpen(true);
  };

  const handleDelete = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteStudent.mutate(studentToDelete.id, {
        onSuccess: () => setStudentToDelete(null),
      });
    }
  };

  const handlePrint = async (student: Student) => {
    try {
      // Get school name
      const schoolName = schools?.find(s => s.id === student.schoolId)?.school_name || student.school?.schoolName || null;

      // Get student picture URL
      let pictureUrl: string | null = null;
      if (student.picturePath && student.organizationId) {
        // Construct URL from Laravel API storage path
        const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
        const schoolPath = student.schoolId ? `${student.schoolId}/` : '';
        const path = `${student.organizationId}/${schoolPath}${student.id}/picture/${student.picturePath}`;
        // Laravel typically serves files from /storage/ path
        pictureUrl = `${baseUrl.replace('/api', '')}/storage/student-files/${path}`;
      }

      // Get guardian picture URL
      let guardianPictureUrl: string | null = null;
      if (student.guardianPicturePath?.startsWith('http')) {
        guardianPictureUrl = student.guardianPicturePath;
      }

      // TODO: Migrate to Laravel API endpoints for educational history and discipline records
      // For now, return empty arrays until endpoints are implemented
      const educationalHistory: any[] = [];
      const disciplineRecords: any[] = [];

      await generateStudentProfilePdf({
        student,
        schoolName,
        pictureUrl,
        guardianPictureUrl,
        isRTL,
        educationalHistory,
        disciplineRecords,
      });
    } catch (error) {
      console.error('Error generating student profile PDF:', error);
      toast.error('Failed to generate student profile PDF.');
    }
  };

  // Filter and sort students for display
  const filteredStudents = useMemo(() => {
    const list = students || [];
    const searchLower = (searchQuery || '').toLowerCase().trim();
    
    return list
      .filter((student) => {
        // Apply filters
        if (statusFilter !== 'all' && student.status !== statusFilter) return false;
        if (genderFilter !== 'all' && student.gender !== genderFilter) return false;
        if (schoolFilter !== 'all' && student.schoolId !== schoolFilter) return false;
        
        // Apply search query
        if (searchLower) {
          const matchesName = student.fullName?.toLowerCase().includes(searchLower);
          const matchesAdmissionNo = student.admissionNumber?.toLowerCase().includes(searchLower);
          const matchesFatherName = student.fatherName?.toLowerCase().includes(searchLower);
          const matchesGuardianPhone = student.guardianPhone?.toLowerCase().includes(searchLower);
          const matchesCardNumber = student.cardNumber?.toLowerCase().includes(searchLower);
          
          if (!matchesName && !matchesAdmissionNo && !matchesFatherName && !matchesGuardianPhone && !matchesCardNumber) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));
  }, [students, statusFilter, genderFilter, schoolFilter, searchQuery]);

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
                <SelectValue placeholder={t('students.organization') || 'Organization'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('students.allOrganizations') || 'All Organizations'}</SelectItem>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('students.add') || 'Register Student'}
          </Button>
          <StudentFormDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            onSuccess={() => setIsCreateOpen(false)}
            onSubmitData={onDialogSubmit}
          />
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
            <p className="text-xs text-muted-foreground">{t('students.acrossSelected') || 'Across selected organization'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.male') || 'Male'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.male ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t('students.registeredMale') || 'Registered male students'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.female') || 'Female'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.female ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t('students.registeredFemale') || 'Registered female students'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('students.orphans') || 'Orphans'}</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orphans ?? 0}</div>
            <p className="text-xs text-muted-foreground">{t('students.needingSpecial') || 'Needing special care'}</p>
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
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('students.searchPlaceholder') || 'Search by name, admission number, father name...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder={t('students.school') || 'School'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('students.allSchools') || 'All Schools'}</SelectItem>
                      {schools?.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.school_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder={t('students.status') || 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('students.allStatus') || 'All Status'}</SelectItem>
                      <SelectItem value="applied">{t('students.applied') || 'Applied'}</SelectItem>
                      <SelectItem value="admitted">{t('students.admitted') || 'Admitted'}</SelectItem>
                      <SelectItem value="active">{t('students.active') || 'Active'}</SelectItem>
                      <SelectItem value="withdrawn">{t('students.withdrawn') || 'Withdrawn'}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={genderFilter} onValueChange={(value) => setGenderFilter(value as typeof genderFilter)}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder={t('students.gender') || 'Gender'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      <SelectItem value="male">{t('students.male') || 'Male'}</SelectItem>
                      <SelectItem value="female">{t('students.female') || 'Female'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('students.admissionNo') || 'Admission #'}</TableHead>
                        <TableHead>{t('students.student') || 'Student'}</TableHead>
                        <TableHead>{t('students.school') || 'School'}</TableHead>
                        <TableHead>{t('students.gender') || 'Gender'}</TableHead>
                        <TableHead>{t('students.applyingGrade') || 'Applying Grade'}</TableHead>
                        <TableHead className="text-right">{t('students.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.admissionNumber}</TableCell>
                            <TableCell>
                              <div className="space-y-1 min-w-[200px]">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold break-words">{student.fullName}</span>
                                  <Badge variant={statusBadge(student.status)} className="shrink-0">
                                    {student.status === 'applied' ? t('students.applied') :
                                     student.status === 'admitted' ? t('students.admitted') :
                                     student.status === 'active' ? t('students.active') :
                                     student.status === 'withdrawn' ? t('students.withdrawn') :
                                     student.status}
                                  </Badge>
                                  {student.isOrphan && (
                                    <Badge variant="destructive" className="shrink-0">
                                      {t('students.orphan') || 'Orphan'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                                  <span className="break-words">{t('students.father') || 'Father'}: {student.fatherName}</span>
                                  {student.guardianPhone && (
                                    <span className="break-words">{t('students.guardian') || 'Guardian'}: {student.guardianPhone}</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {schools?.find((school) => school.id === student.schoolId)?.school_name || student.school?.schoolName || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {student.gender === 'male' ? t('students.male') : t('students.female')}
                              </Badge>
                            </TableCell>
                            <TableCell>{student.applyingGrade || '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1 flex-wrap">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleView(student)}
                                  title={t('students.viewProfile') || 'View Profile'}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handlePrint(student)}
                                  title={t('students.printProfile') || 'Print Profile'}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDocumentsDialogStudent(student)}
                                  title={t('students.studentDocuments') || 'Documents'}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setHistoryDialogStudent(student)}
                                  title={t('students.educationalHistory') || 'History'}
                                >
                                  <BookOpen className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setDisciplineDialogStudent(student)}
                                  title={t('students.disciplineRecords') || 'Discipline'}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleEdit(student)}
                                  title={t('common.edit') || 'Edit'}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDelete(student)}
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
                          <TableCell colSpan={6} className="h-24 text-center">
                            {t('students.noDataFound') || 'No data found.'}
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

      <StudentFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        student={selectedStudent || undefined}
        onSuccess={() => {
          setIsEditOpen(false);
          setSelectedStudent(null);
        }}
        onSubmitData={onDialogSubmit}
      />

      <StudentProfileView
        open={isViewOpen}
        onOpenChange={(open) => {
          setIsViewOpen(open);
          if (!open) setStudentToView(null);
        }}
        student={studentToView}
      />

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteStudentRecord') || 'Delete student record?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteStudentDescription') || 'Removing this student will keep the audit trail but hide it from admissions lists.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.delete') || 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Documents Dialog */}
      <StudentDocumentsDialog
        open={!!documentsDialogStudent}
        onOpenChange={(open) => !open && setDocumentsDialogStudent(null)}
        student={documentsDialogStudent}
      />

      {/* Educational History Dialog */}
      <StudentEducationalHistoryDialog
        open={!!historyDialogStudent}
        onOpenChange={(open) => !open && setHistoryDialogStudent(null)}
        student={historyDialogStudent}
      />

      {/* Discipline Records Dialog */}
      <StudentDisciplineRecordsDialog
        open={!!disciplineDialogStudent}
        onOpenChange={(open) => !open && setDisciplineDialogStudent(null)}
        student={disciplineDialogStudent}
      />
    </div>
  );
}

export default Students;
