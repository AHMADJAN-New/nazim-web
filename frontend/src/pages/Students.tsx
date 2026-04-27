import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Shield, UserRound, Eye, Printer, FileText, BookOpen, AlertTriangle, Search, MoreHorizontal, DollarSign, History, Download, GraduationCap, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { studentSchema, type StudentFormData } from '@/lib/validations';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import {
  useCreateStudent,
  useDeleteStudent,
  useStudentStats,
  useStudents,
  useUpdateStudent,
  useStudentEducationalHistory,
  useStudentDisciplineRecords,
  usePrintStudentProfile,
} from '@/hooks/useStudents';
import type { Student } from '@/types/domain/student';
import { useStudentGuardianPictureUpload } from '@/hooks/useStudentGuardianPictureUpload';
import { useStudentIdCards, useExportIndividualIdCard } from '@/hooks/useStudentIdCards';
import { useStudentPictureUpload } from '@/hooks/useStudentPictureUpload';
import { useStudentAutocomplete } from '@/hooks/useStudentAutocomplete';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useDataTable } from '@/hooks/use-data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { AdmissionFormDialog } from '@/components/admissions/AdmissionFormDialog';
import StudentFormDialog from '@/components/students/StudentFormDialog';
import StudentAdmissionsDialog from '@/components/students/StudentAdmissionsDialog';
import { BulkAssignAdmissionFromStudentsDialog } from '@/components/students/BulkAssignAdmissionFromStudentsDialog';
import StudentProfileView from '@/components/students/StudentProfileView';
import { StudentIdCardPreview } from '@/components/id-cards/StudentIdCardPreview';
import { StudentDocumentsDialog } from '@/components/students/StudentDocumentsDialog';
import { StudentEducationalHistoryDialog } from '@/components/students/StudentEducationalHistoryDialog';
import { StudentDisciplineRecordsDialog } from '@/components/students/StudentDisciplineRecordsDialog';
import { CachedDataBanner } from '@/components/layout/CachedDataBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { PictureCell } from '@/components/shared/PictureCell';
import { showToast } from '@/lib/toast';
import type { StudentIdCard } from '@/types/domain/studentIdCard';
import type { StudentAdmission } from '@/hooks/useStudentAdmissions';


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
  if (data.tazkira_number !== undefined) {
    cleaned.tazkiraNumber = data.tazkira_number || null;
  }
  if (data.phone !== undefined) {
    cleaned.phone = data.phone || null;
  }
  if (data.notes !== undefined) {
    cleaned.notes = data.notes || null;
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

const statusBadge = (status: Student['status']): 'success' | 'info' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'admitted':
      return 'info';
    case 'applied':
      return 'warning';
    case 'suspended':
      return 'warning';
    case 'graduated':
      return 'success';
    case 'withdrawn':
      return 'destructive';
    default:
      return 'secondary';
  }
};

const admissionStatusBadge = (
  status: NonNullable<Student['latestAdmission']>['enrollmentStatus']
): 'success' | 'info' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'admitted':
      return 'info';
    case 'pending':
      return 'warning';
    case 'inactive':
      return 'secondary';
    case 'suspended':
      return 'warning';
    case 'graduated':
      return 'success';
    case 'withdrawn':
      return 'destructive';
    default:
      return 'secondary';
  }
};

// Component for displaying student picture in table cell
// Uses centralized PictureCell component with image caching
function StudentPictureCell({ student }: { student: Student }) {
  return (
    <PictureCell
      type="student"
      entityId={student.id}
      picturePath={student.picturePath}
      alt={student.fullName}
      size="md"
    />
  );
}

export function Students() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const canReadStudentAdmissions = useHasPermission('student_admissions.read');
  const canCreateStudentAdmissions = useHasPermission('student_admissions.create');
  const canUpdateStudentAdmissions = useHasPermission('student_admissions.update');
  const canManageStudentAdmissions = Boolean(canReadStudentAdmissions || canCreateStudentAdmissions);
  const orgIdForQuery = profile?.organization_id;

  const { data: academicYears = [] } = useAcademicYears(orgIdForQuery);
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const selectedAcademicYearId = academicYearFilter !== 'all' ? academicYearFilter : undefined;
  const { data: classAcademicYears = [] } = useClassAcademicYears(selectedAcademicYearId, orgIdForQuery);
  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    classAcademicYears.forEach((entry) => {
      if (entry.classId && entry.class?.name) {
        map.set(entry.classId, entry.class.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [classAcademicYears]);

  type StudentStatusFilter = 'all' | Student['status'] | 'with_admission' | 'without_admission';
  const [statusFilter, setStatusFilter] = useState<StudentStatusFilter>('all');
  const [originalProvinceFilter, setOriginalProvinceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { data: studentAutocomplete } = useStudentAutocomplete();

  const studentFilters = useMemo(() => ({
    search: searchQuery.trim() || undefined,
    student_status:
      statusFilter !== 'all' && statusFilter !== 'with_admission' && statusFilter !== 'without_admission'
        ? statusFilter
        : undefined,
    admission_presence:
      statusFilter === 'with_admission'
        ? 'with_admission'
        : statusFilter === 'without_admission'
          ? 'without_admission'
          : undefined,
    orig_province: originalProvinceFilter !== 'all' ? originalProvinceFilter : undefined,
    academic_year_id: selectedAcademicYearId,
    class_id: classFilter !== 'all' ? classFilter : undefined,
  }), [searchQuery, statusFilter, originalProvinceFilter, selectedAcademicYearId, classFilter]);

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
    isFromCache,
    cachedAt,
  } = useStudents(orgIdForQuery, true, studentFilters);
  const { data: stats } = useStudentStats(orgIdForQuery);
  const { data: schools } = useSchools(orgIdForQuery);
  const {
    data: studentIdCards = [],
    refetch: refetchStudentIdCards,
  } = useStudentIdCards({
    studentType: 'regular',
  });
  const exportIndividualIdCard = useExportIndividualIdCard();

  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const pictureUpload = useStudentPictureUpload();
  const guardianPictureUpload = useStudentGuardianPictureUpload();
  const printProfile = usePrintStudentProfile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentToView, setStudentToView] = useState<Student | null>(null);
  const [studentForAdmissionsDialog, setStudentForAdmissionsDialog] = useState<Student | null>(null);
  const [isStudentAdmissionsDialogOpen, setIsStudentAdmissionsDialogOpen] = useState(false);
  const [isAdmissionFormOpen, setIsAdmissionFormOpen] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<StudentAdmission | null>(null);
  const [preselectedAdmissionStudent, setPreselectedAdmissionStudent] = useState<Student | null>(null);
  // Dialog states for documents, history, and discipline from main table
  const [documentsDialogStudent, setDocumentsDialogStudent] = useState<Student | null>(null);
  const [historyDialogStudent, setHistoryDialogStudent] = useState<Student | null>(null);
  const [disciplineDialogStudent, setDisciplineDialogStudent] = useState<Student | null>(null);
  const [assignedCardPreview, setAssignedCardPreview] = useState<StudentIdCard | null>(null);
  const [isAssignedCardPreviewOpen, setIsAssignedCardPreviewOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);

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
      tazkira_number: '',
      phone: '',
      notes: '',
    },
  });

  const onDialogSubmit = async (
    values: StudentFormData,
    isEdit: boolean,
    pictureFile?: File | null,
    guardianPictureFile?: File | null,
    options?: { openAdmissionFormAfterCreate?: boolean }
  ) => {
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
      const errorMessage = t('students.organizationRequired') || 'Organization is required to create a student. Please select an organization.';
      toast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('Organization is required to create/update student', {
          profile,
          cleanedData,
          schools,
        });
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
                    if (import.meta.env.DEV) {
                      console.warn('Picture upload failed (non-critical):', error);
                    }
                  }
                }
                if (guardianPictureFile && updatedStudent?.id && organizationId) {
                  try {
                    await guardianPictureUpload.mutateAsync({
                      file: guardianPictureFile,
                      studentId: updatedStudent.id,
                      organizationId,
                      schoolId: cleanedData.schoolId || null,
                    });
                  } catch (error) {
                    if (import.meta.env.DEV) {
                      console.warn('Guardian picture upload failed (non-critical):', error);
                    }
                  }
                }
                resolve();
              },
              onError: (error: Error) => reject(error)
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
            if (import.meta.env.DEV) {
              console.warn('Picture upload failed (non-critical):', error);
            }
          }
        }
        if (guardianPictureFile && selectedStudent.id && organizationId) {
          try {
            await guardianPictureUpload.mutateAsync({
              file: guardianPictureFile,
              studentId: selectedStudent.id,
              organizationId,
              schoolId: cleanedData.schoolId || null,
            });
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('Guardian picture upload failed (non-critical):', error);
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
              }
            }
            if (guardianPictureFile && createdStudent?.id && organizationId) {
              try {
                await guardianPictureUpload.mutateAsync({
                  file: guardianPictureFile,
                  studentId: createdStudent.id,
                  organizationId,
                  schoolId: cleanedData.schoolId || null,
                });
              } catch (error) {
                if (import.meta.env.DEV) {
                  console.error('Failed to upload guardian picture:', error);
                }
              }
            }
            if (
              options?.openAdmissionFormAfterCreate &&
              createdStudent &&
              canCreateStudentAdmissions
            ) {
              setSelectedAdmission(null);
              setPreselectedAdmissionStudent(createdStudent);
              window.setTimeout(() => {
                setIsAdmissionFormOpen(true);
              }, 0);
            }
            resolve();
          },
          onError: (error) => {
            if (import.meta.env.DEV) {
              console.error('Failed to create student:', error);
            }
            // Error toast is already shown by useCreateStudent hook
            reject(error);
          }
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

  const handleManageAdmissions = (student: Student) => {
    setStudentForAdmissionsDialog(student);
    setIsStudentAdmissionsDialogOpen(true);
  };

  const handleCreateAdmissionForStudent = (student: Student) => {
    setSelectedAdmission(null);
    setPreselectedAdmissionStudent(student);
    setIsStudentAdmissionsDialogOpen(false);
    setIsAdmissionFormOpen(true);
  };

  const handleEditAdmission = (admission: StudentAdmission) => {
    setSelectedAdmission(admission);
    setPreselectedAdmissionStudent(studentForAdmissionsDialog);
    setIsStudentAdmissionsDialogOpen(false);
    setIsAdmissionFormOpen(true);
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
      await printProfile.mutateAsync(student.id);
    } catch (error) {
      console.error('Error generating student profile PDF:', error);
      toast.error('Failed to generate student profile PDF.');
    }
  };

  const studentIdCardByStudentId = useMemo(() => {
    const cardsMap = new Map<string, StudentIdCard>();
    studentIdCards.forEach((card) => {
      const studentId = card.student?.id ?? card.studentId;
      if (studentId) {
        cardsMap.set(studentId, card);
      }
    });
    return cardsMap;
  }, [studentIdCards]);

  const findAssignedCardForStudent = useCallback(async (student: Student): Promise<StudentIdCard | null> => {
    const existingCard = studentIdCardByStudentId.get(student.id) || null;
    if (existingCard) {
      return existingCard;
    }

    const refreshed = await refetchStudentIdCards();
    const list = refreshed.data ?? [];
    return list.find((card) => (card.student?.id === student.id || card.studentId === student.id)) ?? null;
  }, [studentIdCardByStudentId, refetchStudentIdCards]);

  const handleViewAssignedCard = async (student: Student) => {
    try {
      const card = await findAssignedCardForStudent(student);
      if (!card) {
        showToast.info(t('idCards.noCards') || 'No assigned ID card found for this student');
        return;
      }
      setAssignedCardPreview(card);
      setIsAssignedCardPreviewOpen(true);
    } catch (error) {
      showToast.error(t('toast.idCardPreviewFailed') || 'Failed to load assigned ID card');
    }
  };

  const handleDownloadAssignedCard = async (student: Student) => {
    try {
      const card = await findAssignedCardForStudent(student);
      if (!card) {
        showToast.info(t('idCards.noCards') || 'No assigned ID card found for this student');
        return;
      }

      await exportIndividualIdCard.mutateAsync({
        id: card.id,
        format: 'pdf',
        side: 'both',
      });
    } catch (error) {
      showToast.error(t('toast.idCardExportFailed') || 'Failed to download assigned ID card');
    }
  };

  useEffect(() => {
    setClassFilter('all');
  }, [selectedAcademicYearId]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, originalProvinceFilter, selectedAcademicYearId, classFilter, setPage]);

  // Server-side filtering returns only matching records.
  const filteredStudents = useMemo(() => {
    return students || [];
  }, [students]);
  const filteredRecordsCount = pagination?.total ?? filteredStudents.length;
  const originalProvinceOptions = useMemo(() => {
    const options = new Set<string>();

    (studentAutocomplete?.origProvinces ?? []).forEach((province) => {
      if (province && province.trim()) {
        options.add(province.trim());
      }
    });

    (students ?? []).forEach((student) => {
      if (student.origProvince && student.origProvince.trim()) {
        options.add(student.origProvince.trim());
      }
    });

    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [studentAutocomplete?.origProvinces, students]);

  const visibleStudentIds = useMemo(() => filteredStudents.map((s) => s.id), [filteredStudents]);
  const allVisibleSelected =
    visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.has(id));

  const toggleStudentRowSelected = useCallback((studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedStudentIds((prev) => {
      if (visibleStudentIds.length === 0) {
        return prev;
      }
      if (visibleStudentIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        visibleStudentIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleStudentIds.forEach((id) => next.add(id));
      return next;
    });
  }, [visibleStudentIds]);

  const bulkAssignPreviewStudents = useMemo(() => {
    const list = students || [];
    return Array.from(selectedStudentIds)
      .map((id) => list.find((s) => s.id === id))
      .filter((s): s is Student => Boolean(s));
  }, [selectedStudentIds, students]);

  const getStudentStatusLabel = useCallback((status: Student['status']) => {
    switch (status) {
      case 'applied':
        return t('students.applied');
      case 'admitted':
        return t('students.admitted');
      case 'active':
        return t('events.active');
      case 'suspended':
        return t('students.suspended') || 'Suspended';
      case 'graduated':
        return t('students.graduated') || 'Graduated';
      case 'withdrawn':
        return t('students.withdrawn');
      default:
        return status;
    }
  }, [t]);

  const getAdmissionStatusLabel = useCallback((status: NonNullable<Student['latestAdmission']>['enrollmentStatus']) => {
    switch (status) {
      case 'pending':
        return t('admissions.pending') || 'Pending';
      case 'admitted':
        return t('admissions.admitted') || 'Admitted';
      case 'active':
        return t('events.active') || 'Active';
      case 'inactive':
        return t('events.inactive') || 'Inactive';
      case 'suspended':
        return t('students.suspended') || 'Suspended';
      case 'withdrawn':
        return t('students.withdrawn') || 'Withdrawn';
      case 'graduated':
        return t('students.graduated') || 'Graduated';
      default:
        return status;
    }
  }, [t]);

  const getCurrentClassLabel = useCallback(
    (student: Student) => {
      if (student.latestAdmission?.isAssignedToClass && student.currentClass?.name) {
        return student.currentClass.name;
      }

      if (student.latestAdmission?.isCurrentEnrollment) {
        return t('students.waitingForClass');
      }

      return t('students.notInClass');
    },
    [t]
  );

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
                  {getStudentStatusLabel(student.status)}
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
            <div className="text-xs text-muted-foreground sm:hidden">
              {t('students.mobileAdmissionPrefix')}:{' '}
              {student.latestAdmission
                ? getAdmissionStatusLabel(student.latestAdmission.enrollmentStatus)
                : t('students.noAdmissionRecord')}
            </div>
            <div className="text-xs text-muted-foreground sm:hidden">
              {t('students.mobileClassPrefix')}: {getCurrentClassLabel(student)}
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
      accessorKey: 'latestAdmission',
      header: t('students.tableAdmissionColumn'),
      cell: ({ row }) => {
        const latestAdmission = row.original.latestAdmission;

        if (!latestAdmission) {
          return <span className="text-muted-foreground text-sm">{t('students.noAdmissionRecord')}</span>;
        }

        return (
          <div className="space-y-1">
            <Badge variant={admissionStatusBadge(latestAdmission.enrollmentStatus)}>
              {getAdmissionStatusLabel(latestAdmission.enrollmentStatus)}
            </Badge>
            <div className="text-xs text-muted-foreground">
              {latestAdmission.isCurrentEnrollment
                ? t('students.currentEnrollmentActive')
                : t('students.currentEnrollmentInactive')}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'currentClass',
      header: t('students.tableCurrentClassColumn'),
      cell: ({ row }) => {
        const student = row.original;

        if (student.latestAdmission?.isAssignedToClass && student.currentClass?.name) {
          return (
            <div className="space-y-1">
              <div className="font-medium">{student.currentClass.name}</div>
              {student.latestAdmission.sectionName && (
                <div className="text-xs text-muted-foreground">{student.latestAdmission.sectionName}</div>
              )}
            </div>
          );
        }

        return (
          <span className="text-sm text-muted-foreground">
            {getCurrentClassLabel(student)}
          </span>
        );
      },
    },
    {
      accessorKey: 'gender',
      header: t('students.gender') || 'Gender',
      cell: ({ row }) => (
        <Badge variant={row.original.gender === 'male' ? 'info' : 'muted'}>
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
      header: () => <div className="text-right">{t('events.actions') || 'Actions'}</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('events.actions') || 'Actions'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleView(row.original)}>
                <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('students.viewProfile') || 'View Profile'}
              </DropdownMenuItem>
              {canManageStudentAdmissions ? (
                <DropdownMenuItem onClick={() => handleManageAdmissions(row.original)}>
                  <GraduationCap className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {t('nav.admissions') || 'Admissions'}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => handlePrint(row.original)}>
                <Printer className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('students.printProfile') || 'Print Profile'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleViewAssignedCard(row.original)}>
                <Eye className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {t('idCards.assignedCards.title') || 'View Assigned ID Card'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => void handleDownloadAssignedCard(row.original)}
                disabled={exportIndividualIdCard.isPending}
              >
                <Download className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {t('students.idCardDownload') || 'ID Card Download'}
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
              <DropdownMenuItem onClick={() => navigate(`/students/${row.original.id}/history`)}>
                <History className="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                {t('students.viewHistory') || 'View History'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                {t('events.edit') || 'Edit'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('events.delete') || 'Delete'}
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
          title={t('nav.students') || 'Students'}
          description={t('students.listDescription') || 'Search, filter and update admissions.'}
          primaryAction={{
            label: t('events.add') || 'Register Student',
            onClick: () => setIsCreateOpen(true),
            icon: <Plus className="h-4 w-4" />,
          }}
          secondaryActions={[
            {
              label: t('nav.students') || 'Student Registration Report',
              href: '/reports/student-registrations',
              icon: <FileText className="h-4 w-4" />,
              variant: 'outline',
            },
          ]}
        />
        <CachedDataBanner isFromCache={!!isFromCache} cachedAt={cachedAt ?? null} />
        <StudentFormDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSuccess={() => setIsCreateOpen(false)}
          onSubmitData={onDialogSubmit}
        />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          title={t('events.total') || 'Total Students'}
          value={stats?.total ?? 0}
          icon={UserRound}
          description={t('students.acrossSelected') || 'Across selected organization'}
          color="blue"
        />
        <StatsCard
          title={t('students.male') || 'Male'}
          value={stats?.male ?? 0}
          icon={Shield}
          description={t('students.registeredMale') || 'Registered male students'}
          color="blue"
        />
        <StatsCard
          title={t('students.female') || 'Female'}
          value={stats?.female ?? 0}
          icon={Shield}
          description={t('students.registeredFemale') || 'Registered female students'}
          color="purple"
        />
        <StatsCard
          title={t('students.orphans') || 'Orphans'}
          value={stats?.orphans ?? 0}
          icon={Shield}
          description={t('students.needingSpecial') || 'Needing special care'}
          color="amber"
        />
      </div>

      <FilterPanel title={t('events.filters')}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('students.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('academic.academicYears.academicYear') || 'Academic Year'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.allYears') || 'All Years'}</SelectItem>
              {academicYears.map((year) => (
                <SelectItem key={year.id} value={year.id}>
                  {year.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={classFilter}
            onValueChange={setClassFilter}
            disabled={!selectedAcademicYearId || classOptions.length === 0}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('academic.classLabel') || 'Class'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('students.allClasses') || 'All Classes'}</SelectItem>
              {classOptions.map((classOption) => (
                <SelectItem key={classOption.id} value={classOption.id}>
                  {classOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder={t('students.statusOptions.label') ?? t('students.status') ?? 'Status'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('userManagement.allStatus') || 'All Status'}</SelectItem>
              <SelectItem value="with_admission">{t('students.withAnyAdmission') || 'With admission'}</SelectItem>
              <SelectItem value="without_admission">{t('students.withoutAdmission') || 'Without admission'}</SelectItem>
              <SelectItem value="applied">{t('students.applied') || 'Applied'}</SelectItem>
              <SelectItem value="admitted">{t('students.admitted') || 'Admitted'}</SelectItem>
              <SelectItem value="active">{t('events.active') || 'Active'}</SelectItem>
              <SelectItem value="suspended">{t('students.suspended') || 'Suspended'}</SelectItem>
              <SelectItem value="graduated">{t('students.graduated') || 'Graduated'}</SelectItem>
              <SelectItem value="withdrawn">{t('students.withdrawn') || 'Withdrawn'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={originalProvinceFilter} onValueChange={setOriginalProvinceFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('students.originProvince') || 'Original Province'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {`${t('common.all') || 'All'} ${t('students.originProvince') || 'Provinces'}`}
              </SelectItem>
              {originalProvinceOptions.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
              {originalProvinceOptions.length === 0 ? (
                <SelectItem value="no-province-options" disabled>
                  {t('students.noDataFound') || 'No data found.'}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      {canUpdateStudentAdmissions && selectedStudentIds.size > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">{t('students.selectedCount', { count: selectedStudentIds.size })}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setBulkAssignOpen(true)} className="gap-2 flex-shrink-0" aria-label={t('students.bulkAssignToClass')}>
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('students.bulkAssignToClass')}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedStudentIds(new Set())}>
              {t('students.clearSelection')}
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{t('students.list') || 'Student Registrations'}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {t('websitePublic.filteredResults') || 'Filtered Results'}: {filteredRecordsCount}
            </Badge>
          </CardTitle>
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
                        {canUpdateStudentAdmissions ? (
                          <TableHead className="w-[44px] px-2">
                            <Checkbox
                              checked={allVisibleSelected}
                              onCheckedChange={() => toggleSelectAllVisible()}
                              disabled={visibleStudentIds.length === 0}
                              aria-label={t('students.selectAllOnPage')}
                              className={visibleStudentIds.length === 0 ? 'opacity-40' : undefined}
                            />
                          </TableHead>
                        ) : null}
                        <TableHead className="w-[60px]">{t('students.picture') || 'Picture'}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('students.admissionNumber') || 'Admission #'}</TableHead>
                        <TableHead className="min-w-[200px]">{t('students.student') || 'Student'}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('students.school') || 'School'}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('students.tableAdmissionColumn')}</TableHead>
                        <TableHead className="hidden xl:table-cell">{t('students.tableCurrentClassColumn')}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('students.gender') || 'Gender'}</TableHead>
                        <TableHead className="hidden xl:table-cell">{t('students.applyingGrade') || 'Applying Grade'}</TableHead>
                        <TableHead className="text-right w-[100px]">{t('events.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <TableRow
                            key={student.id}
                            onClick={(e) => {
                              const el = e.target as HTMLElement;
                              if (el.closest('[data-student-row-toggle]')) return;
                              handleView(student);
                            }}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {canUpdateStudentAdmissions ? (
                              <TableCell
                                className="w-[44px] px-2 align-middle"
                                data-student-row-toggle
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  checked={selectedStudentIds.has(student.id)}
                                  onCheckedChange={() => toggleStudentRowSelected(student.id)}
                                  aria-label={t('students.selectStudent')}
                                />
                              </TableCell>
                            ) : null}
                            <TableCell className="w-[60px]">
                              <StudentPictureCell student={student} />
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="space-y-1">
                                <div className="font-medium">داخله نمبر: {student.admissionNumber || '—'}</div>
                                <div className="text-xs text-muted-foreground">کارت: {student.cardNumber || '—'}</div>
                              </div>
                            </TableCell>
                            <TableCell className="min-w-[200px]">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold break-words min-w-0">{student.fullName}</span>
                                  <Badge variant={statusBadge(student.status)} className="shrink-0 text-xs">
                                    {getStudentStatusLabel(student.status)}
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
                                  {t('examReports.admissionNo') || 'Admission #'}: {student.admissionNumber}
                                </div>
                                <div className="text-xs text-muted-foreground sm:hidden">
                                  {t('students.cardNumber') || 'Card Number'}: {student.cardNumber || '—'}
                                </div>
                                <div className="text-xs text-muted-foreground sm:hidden">
                                  {t('students.mobileAdmissionPrefix')}:{' '}
                                  {student.latestAdmission
                                    ? getAdmissionStatusLabel(student.latestAdmission.enrollmentStatus)
                                    : t('students.noAdmissionRecord')}
                                </div>
                                <div className="text-xs text-muted-foreground sm:hidden">
                                  {t('students.mobileClassPrefix')}: {getCurrentClassLabel(student)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {schools?.find((school) => school.id === student.schoolId)?.school_name || student.school?.schoolName || '—'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {student.latestAdmission ? (
                                <div className="space-y-1">
                                  <Badge variant={admissionStatusBadge(student.latestAdmission.enrollmentStatus)}>
                                    {getAdmissionStatusLabel(student.latestAdmission.enrollmentStatus)}
                                  </Badge>
                                  <div className="text-xs text-muted-foreground">
                                    {student.latestAdmission.isCurrentEnrollment
                                      ? t('students.currentEnrollmentActive')
                                      : t('students.currentEnrollmentInactive')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">{t('students.noAdmissionRecord')}</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">
                              {student.latestAdmission?.isAssignedToClass && student.currentClass?.name ? (
                                <div className="space-y-1">
                                  <div className="font-medium">{student.currentClass.name}</div>
                                  {student.latestAdmission.sectionName && (
                                    <div className="text-xs text-muted-foreground">{student.latestAdmission.sectionName}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">{getCurrentClassLabel(student)}</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant={student.gender === 'male' ? 'info' : 'muted'}>
                                {student.gender === 'male' ? t('students.male') : t('students.female')}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden xl:table-cell">{student.applyingGrade || '—'}</TableCell>
                            <TableCell className="text-right w-[100px]" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>{t('events.actions') || 'Actions'}</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleView(student)}>
                                    <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('students.viewProfile') || 'View Profile'}
                                  </DropdownMenuItem>
                                  {canManageStudentAdmissions ? (
                                    <DropdownMenuItem onClick={() => handleManageAdmissions(student)}>
                                      <GraduationCap className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                      {t('nav.admissions') || 'Admissions'}
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuItem onClick={() => handlePrint(student)}>
                                    <Printer className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('students.printProfile') || 'Print Profile'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => void handleViewAssignedCard(student)}>
                                    <Eye className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    {t('idCards.assignedCards.title') || 'View Assigned ID Card'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void handleDownloadAssignedCard(student)}
                                    disabled={exportIndividualIdCard.isPending}
                                  >
                                    <Download className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    {t('students.idCardDownload') || 'ID Card Download'}
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
                                  <DropdownMenuItem onClick={() => navigate(`/students/${student.id}/history`)}>
                                    <History className="mr-2 h-4 w-4 text-teal-600 dark:text-teal-400" />
                                    {t('students.viewHistory') || 'View History'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleEdit(student)}>
                                    <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    {t('events.edit') || 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(student)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('events.delete') || 'Delete'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={canUpdateStudentAdmissions ? 10 : 9} className="h-24 text-center">
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
        onManageAdmissions={handleManageAdmissions}
      />

      <StudentAdmissionsDialog
        open={isStudentAdmissionsDialogOpen}
        onOpenChange={(open) => {
          setIsStudentAdmissionsDialogOpen(open);
          if (!open) {
            setStudentForAdmissionsDialog(null);
          }
        }}
        student={studentForAdmissionsDialog}
        onCreateAdmission={handleCreateAdmissionForStudent}
        onEditAdmission={handleEditAdmission}
      />

      <AdmissionFormDialog
        open={isAdmissionFormOpen}
        onOpenChange={(open) => {
          setIsAdmissionFormOpen(open);
          if (!open) {
            setSelectedAdmission(null);
            setPreselectedAdmissionStudent(null);
          }
        }}
        admission={selectedAdmission}
        admissions={[]}
        preselectedStudentId={selectedAdmission ? null : preselectedAdmissionStudent?.id ?? null}
      />

      <BulkAssignAdmissionFromStudentsDialog
        open={bulkAssignOpen}
        onOpenChange={setBulkAssignOpen}
        studentIds={Array.from(selectedStudentIds)}
        studentsPreview={bulkAssignPreviewStudents}
        defaultAcademicYearId={selectedAcademicYearId ?? null}
        onSuccess={() => setSelectedStudentIds(new Set())}
      />

      <Dialog
        open={isAssignedCardPreviewOpen}
        onOpenChange={(open) => {
          setIsAssignedCardPreviewOpen(open);
          if (!open) {
            setAssignedCardPreview(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('idCards.assignedCards.title') || 'Assigned ID Card'}</DialogTitle>
          </DialogHeader>
          <StudentIdCardPreview
            card={assignedCardPreview}
            side="front"
            showControls={true}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!studentToDelete} onOpenChange={(open) => !open && setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteStudentRecord') || 'Delete student record?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteStudentDescription') || 'Removing this student will keep the audit trail but hide it from admissions lists.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('events.delete') || 'Delete'}</AlertDialogAction>
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

      {/* Report Progress Dialog for Print */}
      <ReportProgressDialog
        open={printProfile.isGenerating || printProfile.status !== null}
        onOpenChange={(open) => {
          if (!open) {
            printProfile.reset();
          }
        }}
        status={printProfile.status}
        progress={printProfile.progress}
        fileName={printProfile.fileName}
        error={printProfile.error}
        onDownload={() => {
          printProfile.downloadReport();
          // Also open print dialog
          printProfile.openPrintDialog();
        }}
        onClose={() => {
          printProfile.reset();
        }}
      />
    </div>
  );
}

export default Students;
