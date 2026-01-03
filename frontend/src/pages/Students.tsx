import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentSchema, type StudentFormData } from '@/lib/validations';
import { Plus, Pencil, Trash2, Shield, UserRound, Eye, Printer, FileText, BookOpen, AlertTriangle, Search, MoreHorizontal, DollarSign } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
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
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import StudentProfileView from '@/components/students/StudentProfileView';
import { StudentDocumentsDialog } from '@/components/students/StudentDocumentsDialog';
import { StudentEducationalHistoryDialog } from '@/components/students/StudentEducationalHistoryDialog';
import { StudentDisciplineRecordsDialog } from '@/components/students/StudentDisciplineRecordsDialog';
import { generateStudentProfilePdf } from '@/lib/studentProfilePdf';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';


// Helper function to convert StudentFormData to domain Student format
const cleanStudentData = (data: StudentFormData): Partial<Student> => {
  const cleaned: Partial<Student> = {};

  // Map snake_case form fields to camelCase domain fields ONLY
  // Don't keep both formats - only camelCase for domain model
  if (data.admission_no !== undefined) {
    cleaned.admissionNumber = data.admission_no?.trim() || '';
  }
  if (data.card_number !== undefined) {
    cleaned.cardNumber = data.card_number || null;
  }
  if (data.full_name !== undefined) {
    cleaned.fullName = data.full_name?.trim() || '';
  }
  if (data.father_name !== undefined) {
    cleaned.fatherName = data.father_name?.trim() || '';
  }
  if (data.grandfather_name !== undefined) {
    cleaned.grandfatherName = data.grandfather_name || null;
  }
  if (data.mother_name !== undefined) {
    cleaned.motherName = data.mother_name || null;
  }
  if (data.birth_year !== undefined) {
    cleaned.birthYear = data.birth_year || null;
  }
  if (data.birth_date !== undefined) {
    cleaned.birthDate = data.birth_date || null;
  }
  if (data.admission_year !== undefined) {
    cleaned.admissionYear = data.admission_year || null;
  }
  if (data.orig_province !== undefined) {
    cleaned.origProvince = data.orig_province || null;
  }
  if (data.orig_district !== undefined) {
    cleaned.origDistrict = data.orig_district || null;
  }
  if (data.orig_village !== undefined) {
    cleaned.origVillage = data.orig_village || null;
  }
  if (data.curr_province !== undefined) {
    cleaned.currProvince = data.curr_province || null;
  }
  if (data.curr_district !== undefined) {
    cleaned.currDistrict = data.curr_district || null;
  }
  if (data.curr_village !== undefined) {
    cleaned.currVillage = data.curr_village || null;
  }
  if (data.preferred_language !== undefined) {
    cleaned.preferredLanguage = data.preferred_language || null;
  }
  if (data.previous_school !== undefined) {
    cleaned.previousSchool = data.previous_school || null;
  }
  if (data.guardian_name !== undefined) {
    cleaned.guardianName = data.guardian_name || null;
  }
  if (data.guardian_relation !== undefined) {
    cleaned.guardianRelation = data.guardian_relation || null;
  }
  if (data.guardian_phone !== undefined) {
    cleaned.guardianPhone = data.guardian_phone || null;
  }
  if (data.guardian_tazkira !== undefined) {
    cleaned.guardianTazkira = data.guardian_tazkira || null;
  }
  if (data.guardian_picture_path !== undefined) {
    cleaned.guardianPicturePath = data.guardian_picture_path || null;
  }
  if (data.home_address !== undefined) {
    cleaned.homeAddress = data.home_address || null;
  }
  if (data.zamin_name !== undefined) {
    cleaned.zaminName = data.zamin_name || null;
  }
  if (data.zamin_phone !== undefined) {
    cleaned.zaminPhone = data.zamin_phone || null;
  }
  if (data.zamin_tazkira !== undefined) {
    cleaned.zaminTazkira = data.zamin_tazkira || null;
  }
  if (data.zamin_address !== undefined) {
    cleaned.zaminAddress = data.zamin_address || null;
  }
  if (data.applying_grade !== undefined) {
    cleaned.applyingGrade = data.applying_grade || null;
  }
  if (data.disability_status !== undefined) {
    cleaned.disabilityStatus = data.disability_status || null;
  }
  if (data.emergency_contact_name !== undefined) {
    cleaned.emergencyContactName = data.emergency_contact_name || null;
  }
  if (data.emergency_contact_phone !== undefined) {
    cleaned.emergencyContactPhone = data.emergency_contact_phone || null;
  }
  if (data.family_income !== undefined) {
    cleaned.familyIncome = data.family_income || null;
  }
  if (data.school_id !== undefined) {
    cleaned.schoolId = data.school_id || null;
  }
  if (data.gender !== undefined) {
    cleaned.gender = data.gender;
  }
  if (data.age !== undefined) {
    cleaned.age = data.age || null;
  }
  if (data.is_orphan !== undefined) {
    cleaned.isOrphan = data.is_orphan;
  }
  if (data.admission_fee_status !== undefined) {
    cleaned.admissionFeeStatus = data.admission_fee_status;
  }
  if (data.student_status !== undefined) {
    cleaned.status = data.student_status as Student['status'];
  }
  if (data.nationality !== undefined) {
    cleaned.nationality = data.nationality || null;
  }

  // Ensure admissionNumber is never empty string - if empty, don't include it in update
  if (cleaned.admissionNumber === '' || cleaned.admissionNumber === null) {
    delete cleaned.admissionNumber;
  }

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

// Component for displaying student picture in table cell
function StudentPictureCell({ student }: { student: Student }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    // Only fetch if picturePath exists and is not empty
    const hasPicture = student.picturePath && student.picturePath.trim() !== '' && student.id;
    
    if (hasPicture) {
      let currentBlobUrl: string | null = null;
      
      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/students/${student.id}/picture`;
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });
          
          if (!response.ok) {
            if (response.status === 404) {
              setImageError(true);
              return;
            }
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          setImageUrl(blobUrl);
          setImageError(false);
        } catch (error) {
          if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
            console.error('Failed to fetch student picture:', error);
          }
          setImageError(true);
        }
      };
      
      fetchImage();
      
      return () => {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      };
    } else {
      // No picture path, show placeholder immediately
      setImageUrl(null);
      setImageError(true);
    }
  }, [student.id, student.picturePath]);
  
  return (
    <div className="flex items-center justify-center w-12 h-12">
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={student.fullName}
          className="w-12 h-12 rounded-full object-cover border-2 border-border"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
          <UserRound className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function Students() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  // Use paginated version of the hook
  const { 
    data: students, 
    isLoading, 
    error,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useStudents(orgIdForQuery, true);
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

  const onDialogSubmit = async (values: StudentFormData, isEdit: boolean, pictureFile?: File | null) => {
    // Use same cleaning as existing submit
    const cleanedData = cleanStudentData(values as StudentFormData);
    // Resolve organizationId respecting multi-tenancy
    // All users are restricted to their own organization
    let organizationId = cleanedData.organizationId || profile?.organization_id || null;
    // Fallback: derive organization from selected school (for admin without header org selection)
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
      
      // DEBUG: Log original student data and form data
      if (import.meta.env.DEV) {
        console.log('[Student Update] Original Student Data:', selectedStudent);
        console.log('[Student Update] Form Payload (after cleanStudentData):', updatePayload);
      }
      
      // Only send changed fields - compare with original student data
      // CRITICAL: Both selectedStudent and updatePayload are now in camelCase domain format
      const changedFields: Partial<Student> = {};
      const unchangedFields: string[] = [];
      
      // Normalize values for comparison
      const normalizeValue = (val: any): any => {
        if (val === undefined || val === null || val === '') return null;
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed === '' ? null : trimmed;
        }
        if (val instanceof Date) return val.toISOString();
        return val;
      };
      
      // Compare each field in updatePayload with selectedStudent
      Object.keys(updatePayload).forEach((key) => {
        const domainKey = key as keyof Student;
        const newValue = updatePayload[domainKey];
        const oldValue = selectedStudent[domainKey];
        
        const normalizedNew = normalizeValue(newValue);
        const normalizedOld = normalizeValue(oldValue);
        
        // Only include if value has actually changed
        if (normalizedNew !== normalizedOld) {
          // CRITICAL: Don't send null values that would overwrite existing data
          // Only send if new value is explicitly provided and different
          if (normalizedNew !== null || normalizedOld === null) {
            changedFields[domainKey] = newValue;
            if (import.meta.env.DEV) {
              console.log(`[Student Update] Field Changed: ${domainKey}`, {
                old: normalizedOld,
                new: normalizedNew,
              });
            }
          } else {
            // New value is null but old value exists - don't overwrite
            if (import.meta.env.DEV) {
              console.log(`[Student Update] Field Skipped (null would overwrite): ${domainKey}`, {
                old: normalizedOld,
                new: normalizedNew,
              });
            }
            unchangedFields.push(domainKey);
          }
        } else {
          unchangedFields.push(domainKey);
        }
      });
      
      // CRITICAL: Only send fields that were actually in the form values
      // Remove any fields from changedFields that weren't explicitly in the form
      const fieldsToRemove: string[] = [];
      Object.keys(changedFields).forEach((key) => {
        // Map camelCase domain keys back to snake_case form keys
        const formKeyMap: Record<string, string> = {
          'admissionNumber': 'admission_no',
          'cardNumber': 'card_number',
          'fullName': 'full_name',
          'fatherName': 'father_name',
          'grandfatherName': 'grandfather_name',
          'motherName': 'mother_name',
          'birthYear': 'birth_year',
          'birthDate': 'birth_date',
          'admissionYear': 'admission_year',
          'origProvince': 'orig_province',
          'origDistrict': 'orig_district',
          'origVillage': 'orig_village',
          'currProvince': 'curr_province',
          'currDistrict': 'curr_district',
          'currVillage': 'curr_village',
          'preferredLanguage': 'preferred_language',
          'previousSchool': 'previous_school',
          'guardianName': 'guardian_name',
          'guardianRelation': 'guardian_relation',
          'guardianPhone': 'guardian_phone',
          'guardianTazkira': 'guardian_tazkira',
          'guardianPicturePath': 'guardian_picture_path',
          'homeAddress': 'home_address',
          'zaminName': 'zamin_name',
          'zaminPhone': 'zamin_phone',
          'zaminTazkira': 'zamin_tazkira',
          'zaminAddress': 'zamin_address',
          'applyingGrade': 'applying_grade',
          'disabilityStatus': 'disability_status',
          'emergencyContactName': 'emergency_contact_name',
          'emergencyContactPhone': 'emergency_contact_phone',
          'familyIncome': 'family_income',
          'schoolId': 'school_id',
          'isOrphan': 'is_orphan',
          'admissionFeeStatus': 'admission_fee_status',
          'status': 'student_status',
        };
        
        const formKey = formKeyMap[key] || key;
        // If the field wasn't in the form values, don't send it
        // This prevents sending fields that weren't actually changed by the user
        if (!(formKey in values) && key !== 'organizationId') {
          if (import.meta.env.DEV) {
            console.log(`[Student Update] Removing ${key} from changes - not in form values`, {
              formKey,
              inValues: formKey in values,
            });
          }
          fieldsToRemove.push(key);
        }
      });
      
      fieldsToRemove.forEach((key) => {
        delete changedFields[key as keyof Student];
        unchangedFields.push(key);
      });
      
      // DEBUG: Log what will be sent
      if (import.meta.env.DEV) {
        console.log('[Student Update] Changed Fields:', Object.keys(changedFields));
        console.log('[Student Update] Unchanged Fields:', unchangedFields);
        console.log('[Student Update] Payload to Send:', changedFields);
      }
      
      // Only update if there are changes
      if (Object.keys(changedFields).length > 0) {
        await new Promise<void>((resolve, reject) => {
          updateStudent.mutate(
            { id: selectedStudent.id, data: changedFields },
            {
              onSuccess: async (updatedStudent) => {
                // Upload picture if one was selected during edit (don't error if no picture)
                if (pictureFile && updatedStudent?.id && organizationId) {
                  try {
                    await pictureUpload.mutateAsync({
                      file: pictureFile,
                      studentId: updatedStudent.id,
                      organizationId,
                      schoolId: cleanedData.schoolId || null,
                    });
                  } catch (error) {
                    // Silently fail - picture upload is optional
                    if (import.meta.env.DEV) {
                      console.warn('Picture upload failed (non-critical):', error);
                    }
                  }
                }
                resolve();
              },
              onError: () => reject()
            }
          );
        });
      } else {
        // No changes to student data, but still try to upload picture if provided
        if (pictureFile && selectedStudent.id && organizationId) {
          try {
            await pictureUpload.mutateAsync({
              file: pictureFile,
              studentId: selectedStudent.id,
              organizationId,
              schoolId: cleanedData.schoolId || null,
            });
          } catch (error) {
            // Silently fail - picture upload is optional
            if (import.meta.env.DEV) {
              console.warn('Picture upload failed (non-critical):', error);
            }
          }
        }
      }
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
    // DEBUG: Log the student being edited
    if (import.meta.env.DEV) {
      console.log('[handleEdit] Setting selectedStudent:', student);
      console.log('[handleEdit] Student fields:', {
        fullName: student.fullName,
        fatherName: student.fatherName,
        schoolId: student.schoolId,
        admissionNumber: student.admissionNumber,
      });
    }
    setSelectedStudent(student);
    // Note: The form will be reset by StudentFormDialog component
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

  // Client-side filtering for search
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
      .sort((a, b) => {
        // Handle cases where admissionNumber might be undefined
        const aAdmission = a.admissionNumber || '';
        const bAdmission = b.admissionNumber || '';
        return aAdmission.localeCompare(bAdmission);
      });
  }, [students, statusFilter, genderFilter, schoolFilter, searchQuery]);

  // Define columns for DataTable
  const columns: ColumnDef<Student>[] = [
    {
      id: 'picture',
      header: t('students.picture') || 'Picture',
      cell: ({ row }) => <StudentPictureCell student={row.original} />,
    },
    {
      accessorKey: 'admissionNumber',
      header: t('students.admissionNumber') || 'Admission #',
      cell: ({ row }) => <span className="font-medium">{row.original.admissionNumber}</span>,
    },
    {
      accessorKey: 'student',
      header: t('students.student') || 'Student',
      cell: ({ row }) => {
        const student = row.original;
        return (
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
        );
      },
    },
    {
      accessorKey: 'school',
      header: t('students.school') || 'School',
      cell: ({ row }) => {
        const school = schools?.find((s) => s.id === row.original.schoolId);
        return school?.school_name || row.original.school?.schoolName || '—';
      },
    },
    {
      accessorKey: 'gender',
      header: t('students.gender') || 'Gender',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.gender === 'male' ? t('students.male') : t('students.female')}
        </Badge>
      ),
    },
    {
      accessorKey: 'applyingGrade',
      header: t('students.applyingGrade') || 'Applying Grade',
      cell: ({ row }) => row.original.applyingGrade || '—',
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('students.actions') || 'Actions'}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('students.viewProfile') || 'View Profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrint(row.original)}>
                <Printer className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('students.printProfile') || 'Print Profile'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDocumentsDialogStudent(row.original)}>
                <FileText className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('students.studentDocuments') || 'Documents'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setHistoryDialogStudent(row.original)}>
                <BookOpen className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                {t('students.educationalHistory') || 'Educational History'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDisciplineDialogStudent(row.original)}>
                <AlertTriangle className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                {t('students.disciplineRecords') || 'Discipline Records'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('common.edit') || 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete') || 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: filteredStudents,
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
        <PageHeader
          title={t('students.title') || 'Students'}
          description={t('students.subtitle') || 'Manage admissions with complete Afghan student records'}
          primaryAction={{
            label: t('students.add') || 'Register Student',
            onClick: () => setIsCreateOpen(true),
            icon: <Plus className="h-4 w-4" />,
          }}
          secondaryActions={[
            {
              label: t('studentReport.title') || 'Student Registration Report',
              href: '/reports/student-registrations',
              icon: <FileText className="h-4 w-4" />,
              variant: 'outline',
            },
          ]}
        />
        <StudentFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
          onSubmitData={onDialogSubmit}
        />

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

      <FilterPanel title={t('common.filters')}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('students.searchPlaceholder') || 'Search by name, admission number, father name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
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
                  {school.schoolName}
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
              <SelectItem value="all">{t('students.allGenders') || 'All Genders'}</SelectItem>
              <SelectItem value="male">{t('students.male') || 'Male'}</SelectItem>
              <SelectItem value="female">{t('students.female') || 'Female'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

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
            <div className="space-y-4 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">{t('students.picture') || 'Picture'}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('students.admissionNo') || 'Admission #'}</TableHead>
                        <TableHead className="min-w-[200px]">{t('students.student') || 'Student'}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('students.school') || 'School'}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('students.gender') || 'Gender'}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('students.applyingGrade') || 'Applying Grade'}</TableHead>
                        <TableHead className="text-right w-[100px]">{t('students.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow 
                            key={student.id}
                            onClick={() => handleView(student)}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            <TableCell className="w-[60px]">
                              <StudentPictureCell student={student} />
                            </TableCell>
                            <TableCell className="font-medium hidden sm:table-cell">{student.admissionNumber}</TableCell>
                            <TableCell className="min-w-[200px]">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold break-words min-w-0">{student.fullName}</span>
                                  <Badge variant={statusBadge(student.status)} className="shrink-0 text-xs">
                                    {student.status === 'applied' ? t('students.applied') :
                                     student.status === 'admitted' ? t('students.admitted') :
                                     student.status === 'active' ? t('students.active') :
                                     student.status === 'withdrawn' ? t('students.withdrawn') :
                                     student.status}
                                  </Badge>
                                  {student.isOrphan && (
                                    <Badge variant="destructive" className="shrink-0 text-xs">
                                      {t('students.orphan') || 'Orphan'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                                  <span className="break-words">{t('students.father') || 'Father'}: {student.fatherName}</span>
                                  {student.guardianPhone && (
                                    <span className="break-words hidden sm:inline">{t('students.guardian') || 'Guardian'}: {student.guardianPhone}</span>
                                  )}
                                </div>
                                {/* Show admission number on mobile */}
                                <div className="text-xs text-muted-foreground sm:hidden">
                                  {t('students.admissionNo') || 'Admission #'}: {student.admissionNumber}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {schools?.find((school) => school.id === student.schoolId)?.school_name || student.school?.schoolName || '—'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="outline">
                                {student.gender === 'male' ? t('students.male') : t('students.female')}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{student.applyingGrade || '—'}</TableCell>
                            <TableCell className="text-right w-[100px]" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleView(student)}>
                                    <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('students.viewProfile') || 'View Profile'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePrint(student)}>
                                    <Printer className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('students.printProfile') || 'Print Profile'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDocumentsDialogStudent(student)}>
                                    <FileText className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('students.studentDocuments') || 'Documents'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setHistoryDialogStudent(student)}>
                                    <BookOpen className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    {t('students.educationalHistory') || 'Educational History'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setDisciplineDialogStudent(student)}>
                                    <AlertTriangle className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    {t('students.disciplineRecords') || 'Discipline Records'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/students/${student.id}/fees`)}>
                                    <DollarSign className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                                    {t('fees.studentFeeAssignments') || 'Fee Assignments'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEdit(student)}>
                                    <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('common.edit') || 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(student)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('common.delete') || 'Delete'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            {t('students.noDataFound') || 'No data found.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  showPageSizeSelector={true}
                  showTotalCount={true}
                />
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
