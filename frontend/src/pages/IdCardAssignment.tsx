import {
  Filter,
  Search,
  CheckSquare,
  Square,
  Eye,
  Printer,
  DollarSign,
  Download,
  Trash2,
  Edit,
  X,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { StudentIdCardPreview } from '@/components/id-cards/StudentIdCardPreview';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import { useIdCardTemplates } from '@/hooks/useIdCardTemplates';
import { useSchools } from '@/hooks/useSchools';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { useFinanceAccounts, useIncomeCategories } from '@/hooks/useFinance';
import {
  useStudentIdCards,
  useAssignIdCards,
  useUpdateStudentIdCard,
  useMarkCardPrinted,
  useMarkCardFeePaid,
  useDeleteStudentIdCard,
  type StudentIdCard,
  type StudentIdCardFilters,
  type AssignIdCardRequest,
} from '@/hooks/useStudentIdCards';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

export default function IdCardAssignment() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const organizationId = profile?.organization_id;

  // Student type: 'regular' or 'course'
  const [studentType, setStudentType] = useState<'regular' | 'course'>('regular');

  // Filter states
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [schoolId, setSchoolId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [classAcademicYearId, setClassAcademicYearId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('active');
  const [templateId, setTemplateId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Helper to convert empty string to 'all' for Select components
  const schoolIdForSelect = schoolId || 'all';
  const classIdForSelect = classId || 'all';
  const courseIdForSelect = courseId || 'all';
  const templateIdForSelect = templateId || 'all';

  // Student selection (using admission IDs for regular students, course student IDs for course students)
  const [selectedAdmissionIds, setSelectedAdmissionIds] = useState<Set<string>>(new Set());
  const [selectedCourseStudentIds, setSelectedCourseStudentIds] = useState<Set<string>>(new Set());

  // Assignment panel
  const [selectedTemplateForAssignment, setSelectedTemplateForAssignment] = useState<string>('');
  const [cardFee, setCardFee] = useState<string>('');
  const [cardFeePaid, setCardFeePaid] = useState<boolean>(false);
  const [accountId, setAccountId] = useState<string>('');
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>('');
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  // Management table
  const [editingCard, setEditingCard] = useState<StudentIdCard | null>(null);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  const [selectedCardsForBulkAction, setSelectedCardsForBulkAction] = useState<Set<string>>(new Set());

  // Dialogs
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAppliedNavigationPreset, setHasAppliedNavigationPreset] = useState(false);
  const presetStudentType = searchParams.get('studentType');
  const presetAdmissionId = searchParams.get('admissionId');
  const presetCourseStudentId = searchParams.get('courseStudentId');
  const presetAcademicYearId = searchParams.get('academicYearId');
  const presetSchoolId = searchParams.get('schoolId');
  const presetClassId = searchParams.get('classId');
  const presetClassAcademicYearId = searchParams.get('classAcademicYearId');
  const presetCourseId = searchParams.get('courseId');

  // Data hooks
  const { data: academicYears = [], refetch: refetchAcademicYears } = useAcademicYears(organizationId);
  const { data: currentAcademicYear, refetch: refetchCurrentAcademicYear } = useCurrentAcademicYear();
  const { data: schools = [] } = useSchools(organizationId);
  const { data: classes = [] } = useClasses(organizationId);
  const { data: classAcademicYears = [] } = useClassAcademicYears(academicYearId, organizationId);
  const { data: templates = [], refetch: refetchTemplates } = useIdCardTemplates(true);
  const { data: courses = [], refetch: refetchCourses } = useShortTermCourses(organizationId, false);
  
  // Regular students (only fetch when in regular mode)
  const { data: studentAdmissions = [], refetch: refetchStudentAdmissions } = useStudentAdmissions(organizationId, false, {
    academic_year_id: academicYearId || undefined,
    school_id: schoolId || undefined,
    class_id: classId || undefined,
    class_academic_year_id: classAcademicYearId || undefined,
    enrollment_status: enrollmentStatus === 'all' ? undefined : enrollmentStatus,
  });

  // Course students (only fetch when in course mode)
  const effectiveCourseId = courseId || undefined;
  const { data: courseStudents = [], refetch: refetchCourseStudents } = useCourseStudents(effectiveCourseId, false);

  // Set default academic year
  useEffect(() => {
    if (currentAcademicYear && !academicYearId) {
      setAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, academicYearId]);

  // Refresh data on page navigation/mount so newly admitted students appear immediately.
  const refreshAssignmentData = useCallback(async (showSuccessToast = true) => {
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        refetchAcademicYears(),
        refetchCurrentAcademicYear(),
        refetchTemplates(),
        refetchCourses(),
        refetchStudentAdmissions(),
        refetchCourseStudents(),
        refetchIdCards(),
        queryClient.invalidateQueries({ queryKey: ['classes'] }),
        queryClient.refetchQueries({ queryKey: ['classes'] }),
        queryClient.invalidateQueries({ queryKey: ['schools'] }),
        queryClient.refetchQueries({ queryKey: ['schools'] }),
      ]);

      if (showSuccessToast) {
        showToast.success(t('toast.refreshed') || 'ID card assignment data refreshed');
      }
    } catch (error) {
      showToast.error(t('toast.refreshFailed') || 'Failed to refresh assignment data');
    } finally {
      setIsRefreshing(false);
    }
  }, [
    queryClient,
    refetchAcademicYears,
    refetchCurrentAcademicYear,
    refetchTemplates,
    refetchCourses,
    refetchStudentAdmissions,
    refetchCourseStudents,
    refetchIdCards,
    t,
  ]);

  useEffect(() => {
    void refreshAssignmentData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply pre-selection from navigation query params (e.g. from Admissions actions dropdown).
  useEffect(() => {
    if (hasAppliedNavigationPreset) {
      return;
    }
    if (!presetAdmissionId && !presetCourseStudentId) {
      return;
    }

    if (presetStudentType === 'course') {
      setStudentType('course');
      if (presetAcademicYearId) setAcademicYearId(presetAcademicYearId);
      if (presetSchoolId) setSchoolId(presetSchoolId);
      if (presetCourseId) setCourseId(presetCourseId);

      if (presetCourseStudentId) {
        setSelectedCourseStudentIds(new Set([presetCourseStudentId]));
      }

      setHasAppliedNavigationPreset(true);
      return;
    }

    setStudentType('regular');
    if (presetAcademicYearId) setAcademicYearId(presetAcademicYearId);
    if (presetSchoolId) setSchoolId(presetSchoolId);
    if (presetClassId) setClassId(presetClassId);
    if (presetClassAcademicYearId) setClassAcademicYearId(presetClassAcademicYearId);

    if (presetAdmissionId) {
      setSelectedAdmissionIds(new Set([presetAdmissionId]));
    }

    setHasAppliedNavigationPreset(true);
  }, [
    hasAppliedNavigationPreset,
    presetAdmissionId,
    presetCourseStudentId,
    presetStudentType,
    presetAcademicYearId,
    presetSchoolId,
    presetClassId,
    presetClassAcademicYearId,
    presetCourseId,
    studentAdmissions,
    courseStudents,
  ]);

  // Filters for ID cards
  const cardFilters: StudentIdCardFilters = useMemo(() => ({
    academicYearId: academicYearId || undefined,
    schoolId: schoolId || undefined,
    classId: studentType === 'regular' ? (classId || undefined) : undefined,
    classAcademicYearId: studentType === 'regular' ? (classAcademicYearId || undefined) : undefined,
    courseId: studentType === 'course' ? (courseId || undefined) : undefined,
    studentType: studentType,
    enrollmentStatus: enrollmentStatus === 'all' ? undefined : enrollmentStatus,
    templateId: templateId || undefined,
    search: searchQuery || undefined,
  }), [academicYearId, schoolId, classId, classAcademicYearId, courseId, studentType, enrollmentStatus, templateId, searchQuery]);

  const { data: idCards = [], isLoading: cardsLoading, refetch: refetchIdCards } = useStudentIdCards(cardFilters);
  const { data: financeAccounts = [] } = useFinanceAccounts({ isActive: true });
  const { data: incomeCategories = [] } = useIncomeCategories({ isActive: true });
  const assignCards = useAssignIdCards();
  const updateCard = useUpdateStudentIdCard();
  const markPrinted = useMarkCardPrinted();
  const markFeePaid = useMarkCardFeePaid();
  const deleteCard = useDeleteStudentIdCard();

  // Filter students by search query (handles both regular and course students)
  const filteredStudents = useMemo(() => {
    if (studentType === 'course') {
      const students = courseStudents as import('@/types/domain/courseStudent').CourseStudent[];
      if (!searchQuery) return students;
      const query = searchQuery.toLowerCase();
      return students.filter(courseStudent => {
        return (
          courseStudent.fullName?.toLowerCase().includes(query) ||
          courseStudent.admissionNo?.toLowerCase().includes(query)
        );
      });
    } else {
      // Regular students
      if (!searchQuery) return studentAdmissions;
      const query = searchQuery.toLowerCase();
      return studentAdmissions.filter(admission => {
        const student = admission.student;
        if (!student) return false;
        return (
          student.fullName?.toLowerCase().includes(query) ||
          student.admissionNumber?.toLowerCase().includes(query) ||
          student.studentCode?.toLowerCase().includes(query)
        );
      });
    }
  }, [studentAdmissions, courseStudents, searchQuery, studentType]);

  // Get students with card status (handles both regular and course students)
  const studentsWithCardStatus = useMemo(() => {
    if (studentType === 'course') {
      const courseStudents = filteredStudents as import('@/types/domain/courseStudent').CourseStudent[];
      return courseStudents.map(courseStudent => {
        const card = idCards.find(c => c.courseStudentId === courseStudent.id);
        return {
          courseStudent,
          card,
          hasCard: !!card,
          isPrinted: card?.isPrinted ?? false,
          feePaid: card?.cardFeePaid ?? false,
        };
      });
    } else {
      const admissions = filteredStudents as typeof studentAdmissions;
      return admissions.map(admission => {
        const card = idCards.find(c => c.studentAdmissionId === admission.id);
        return {
          admission,
          card,
          hasCard: !!card,
          isPrinted: card?.isPrinted ?? false,
          feePaid: card?.cardFeePaid ?? false,
        };
      });
    }
  }, [filteredStudents, idCards, studentType, studentAdmissions]);

  // Handle student selection (using admission IDs for regular students, course student IDs for course students)
  const toggleStudentSelection = (id: string) => {
    if (studentType === 'course') {
      setSelectedCourseStudentIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedAdmissionIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const selectAllStudents = () => {
    if (studentType === 'course') {
      if (selectedCourseStudentIds.size === studentsWithCardStatus.length) {
        setSelectedCourseStudentIds(new Set());
      } else {
        setSelectedCourseStudentIds(new Set(studentsWithCardStatus.map(s => s.courseStudent!.id)));
      }
    } else {
      if (selectedAdmissionIds.size === studentsWithCardStatus.length) {
        setSelectedAdmissionIds(new Set());
      } else {
        setSelectedAdmissionIds(new Set(studentsWithCardStatus.map(s => s.admission!.id)));
      }
    }
  };

  const selectByClass = (classAcadYearId: string) => {
    if (studentType === 'regular') {
      const classAdmissions = studentsWithCardStatus
        .filter(s => s.admission?.classAcademicYearId === classAcadYearId)
        .map(s => s.admission!.id);
      setSelectedAdmissionIds(new Set(classAdmissions));
    }
    // Course students don't have classes, so this function does nothing for course mode
  };

  // Handle bulk assignment (handles both regular and course students)
  const handleBulkAssign = async () => {
    const hasSelectedStudents = studentType === 'course' 
      ? selectedCourseStudentIds.size > 0 
      : selectedAdmissionIds.size > 0;

    if (!academicYearId || !selectedTemplateForAssignment || !hasSelectedStudents) {
      return;
    }

    // Validate account and category if fee is paid
    if (cardFeePaid && (!accountId || !incomeCategoryId)) {
      showToast.error(t('idCards.accountAndCategoryRequired') || 'Account and Income Category are required when fee is paid');
      return;
    }

    const request: AssignIdCardRequest = {
      academicYearId,
      idCardTemplateId: selectedTemplateForAssignment,
      studentAdmissionIds: studentType === 'regular' ? Array.from(selectedAdmissionIds) : undefined,
      courseStudentIds: studentType === 'course' ? Array.from(selectedCourseStudentIds) : undefined,
      classId: studentType === 'regular' ? (classId || null) : null,
      classAcademicYearId: studentType === 'regular' ? (classAcademicYearId || null) : null,
      cardFee: cardFee ? parseFloat(cardFee) : undefined,
      cardFeePaid: cardFeePaid,
      cardFeePaidDate: cardFeePaid ? new Date().toISOString() : undefined,
      accountId: cardFeePaid && accountId ? accountId : null,
      incomeCategoryId: cardFeePaid && incomeCategoryId ? incomeCategoryId : null,
    };

    try {
      await assignCards.mutateAsync(request);
      setIsAssignDialogOpen(false);
      setSelectedAdmissionIds(new Set());
      setSelectedCourseStudentIds(new Set());
      setSelectedTemplateForAssignment('');
      setCardFee('');
      setCardFeePaid(false);
      setAccountId('');
      setIncomeCategoryId('');
    } catch (error) {
      // Error handled by hook
    }
  };

  // Handle card management actions
  const handleMarkPrinted = async (cardId: string) => {
    await markPrinted.mutateAsync(cardId);
  };

  const handleMarkFeePaid = async (cardId: string) => {
    await markFeePaid.mutateAsync({ id: cardId, paidDate: new Date() });
  };

  const handleEditCard = (card: StudentIdCard) => {
    setEditingCard(card);
    setCardFee(card.cardFee?.toString() || '');
    setCardFeePaid(card.cardFeePaid);
    // Pre-fill account and category from existing income entry if available
    setAccountId(card.incomeEntry?.accountId || '');
    setIncomeCategoryId(card.incomeEntry?.incomeCategoryId || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;

    // Validate account and category if fee is paid
    if (cardFeePaid && (!accountId || !incomeCategoryId)) {
      showToast.error(t('idCards.accountAndCategoryRequired') || 'Account and Income Category are required when fee is paid');
      return;
    }

    await updateCard.mutateAsync({
      id: editingCard.id,
      cardFee: cardFee ? parseFloat(cardFee) : undefined,
      cardFeePaid: cardFeePaid,
      cardFeePaidDate: cardFeePaid ? new Date().toISOString() : undefined,
      accountId: cardFeePaid && accountId ? accountId : null,
      incomeCategoryId: cardFeePaid && incomeCategoryId ? incomeCategoryId : null,
    });

    setIsEditDialogOpen(false);
    setEditingCard(null);
    setAccountId('');
    setIncomeCategoryId('');
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    await deleteCard.mutateAsync(deleteCardId);
    setIsDeleteDialogOpen(false);
    setDeleteCardId(null);
  };

  const handlePreview = (cardId: string, side: 'front' | 'back') => {
    setPreviewStudentId(cardId);
    setPreviewSide(side);
    setIsPreviewDialogOpen(true);
  };

  // Filter cards for management table
  const filteredCards = useMemo(() => {
    return idCards.filter(card => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          card.student?.fullName?.toLowerCase().includes(query) ||
          card.student?.admissionNumber?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [idCards, searchQuery]);

  // Report export columns (handles both regular and course students)
  const reportColumns = useMemo(() => [
    { key: 'student_name', label: t('students.student') || 'Student' },
    { key: 'admission_number', label: t('examReports.admissionNo') || 'Admission No' },
    { key: 'class_name', label: studentType === 'course' ? (t('courses.course') || 'Course') : (t('search.class') || 'Class') },
    { key: 'template_name', label: t('idCards.template') || 'Template' },
    { key: 'card_number', label: t('attendanceReports.cardNumber') || 'Card Number' },
    { key: 'fee_status', label: t('idCards.feeStatus') || 'Fee Status' },
    { key: 'fee_amount', label: t('courses.feeAmount') || 'Fee Amount' },
    { key: 'printed_status', label: t('idCards.printedStatus') || 'Printed Status' },
    { key: 'printed_at', label: t('idCards.printedAt') || 'Printed At' },
    { key: 'assigned_at', label: t('idCards.assignedAt') || 'Assigned At' },
  ], [t, studentType]);

  // Transform data for report (handles both regular and course students)
  const transformIdCardData = useCallback((cards: typeof filteredCards) => {
    return cards.map(card => ({
      student_name: card.courseStudentId 
        ? (card.courseStudent?.fullName || '-')
        : (card.student?.fullName || '-'),
      admission_number: card.courseStudentId
        ? (card.courseStudent?.admissionNo || '-')
        : (card.student?.admissionNumber || '-'),
      class_name: card.courseStudentId
        ? (card.courseStudent?.course?.name || '-')
        : (card.class?.name || '-'),
      template_name: card.template?.name || '-',
      card_number: card.cardNumber || '-',
      fee_status: card.cardFeePaid 
        ? (t('courses.feePaid') || 'Paid')
        : (t('idCards.feeUnpaid') || 'Unpaid'),
      fee_amount: card.cardFee ? card.cardFee.toString() : '-',
      printed_status: card.isPrinted
        ? (t('idCards.printed') || 'Printed')
        : (t('idCards.unprinted') || 'Unprinted'),
      printed_at: card.printedAt ? formatDate(card.printedAt) : '-',
      assigned_at: card.createdAt ? formatDate(card.createdAt) : '-',
    }));
  }, [t]);

  // Build filters summary
  const buildFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (academicYearId) {
      const year = academicYears.find(ay => ay.id === academicYearId);
      if (year) filters.push(`${t('fees.academicYear') || 'Academic Year'}: ${year.name}`);
    }
    if (schoolId) {
      const school = schools.find(s => s.id === schoolId);
      if (school) filters.push(`${t('common.schoolManagement') || 'School'}: ${school.schoolName}`);
    }
    if (studentType === 'regular' && classId) {
      const cls = classes.find(c => c.id === classId);
      if (cls) filters.push(`${t('search.class') || 'Class'}: ${cls.name}`);
    }
    if (studentType === 'course' && courseId) {
      const course = courses.find(c => c.id === courseId);
      if (course) filters.push(`${t('courses.course') || 'Course'}: ${course.name}`);
    }
    if (templateId) {
      const template = templates.find(t => t.id === templateId);
      if (template) filters.push(`${t('idCards.template') || 'Template'}: ${template.name}`);
    }
    if (enrollmentStatus !== 'all') {
      filters.push(`${t('students.enrollmentStatus') || 'Enrollment Status'}: ${enrollmentStatus}`);
    }
    if (searchQuery) {
      filters.push(`${t('events.search') || 'Search'}: ${searchQuery}`);
    }
    return filters.join(', ');
  }, [academicYearId, schoolId, classId, courseId, studentType, templateId, enrollmentStatus, searchQuery, academicYears, schools, classes, courses, templates, t]);

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{t('idCards.assignment.title') || 'ID Card Assignment'}</CardTitle>
              <CardDescription>
                {t('idCards.assignment.description') || 'Assign ID card templates to students and manage card assignments'}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshAssignmentData(true)}
              disabled={isRefreshing}
              className="self-start"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing ? 'animate-spin' : '')} />
              <span className="ml-2 hidden sm:inline">{t('common.refresh') || 'Refresh'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="assignment" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assignment">
                {t('idCards.assignment.title') || 'Assignment'}
              </TabsTrigger>
              <TabsTrigger value="assigned">
                {t('idCards.assignedCards.title') || t('idCards.assignedCards') || 'Assigned Cards'} ({filteredCards.length})
              </TabsTrigger>
            </TabsList>

            {/* Assignment Tab */}
            <TabsContent value="assignment" className="space-y-4 mt-4">
              {/* Student Type Selection */}
              <div className="flex gap-2 mb-4">
                <Tabs value={studentType} onValueChange={(value) => {
                  setStudentType(value as 'regular' | 'course');
                  // Clear selections when switching modes
                  setSelectedAdmissionIds(new Set());
                  setSelectedCourseStudentIds(new Set());
                  // Reset filters
                  if (value === 'course') {
                    setClassId('');
                    setClassAcademicYearId('');
                  } else {
                    setCourseId('');
                  }
                }}>
                  <TabsList>
                    <TabsTrigger value="regular">
                      {t('students.students') || 'Regular Students'}
                    </TabsTrigger>
                    <TabsTrigger value="course">
                      {t('courses.courseStudents') || 'Course Students'}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>{t('academic.academicYears.academicYear') || 'Academic Year'}</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('events.select') || 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map(year => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('schools.school') || 'School'}</Label>
              <Select value={schoolIdForSelect} onValueChange={(value) => setSchoolId(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('subjects.all') || 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Show Class filter for regular students, Course filter for course students */}
            {studentType === 'regular' ? (
              <div>
                <Label>{t('search.class') || 'Class'}</Label>
                <Select value={classIdForSelect} onValueChange={(value) => setClassId(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('subjects.all') || 'All'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>{t('courses.course') || 'Course'}</Label>
                <Select value={courseIdForSelect} onValueChange={(value) => setCourseId(value === 'all' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('subjects.all') || 'All'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t('students.enrollmentStatus') || 'Enrollment Status'}</Label>
              <Select value={enrollmentStatus} onValueChange={setEnrollmentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                  <SelectItem value="active">{t('events.active') || 'Active'}</SelectItem>
                  <SelectItem value="inactive">{t('events.inactive') || 'Inactive'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('idCards.template') || 'Template'}</Label>
              <Select value={templateIdForSelect} onValueChange={(value) => setTemplateId(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('subjects.all') || 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('events.search') || 'Search students...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Main Content: Student List + Assignment Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Student List (40%) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {t('table.students') || 'Students'} ({studentsWithCardStatus.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllStudents}
                >
                  {(studentType === 'course' 
                    ? selectedCourseStudentIds.size === studentsWithCardStatus.length
                    : selectedAdmissionIds.size === studentsWithCardStatus.length) ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      {t('events.deselectAll') || 'Deselect All'}
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      {t('events.selectAll') || 'Select All'}
                    </>
                  )}
                </Button>
              </div>

              <ScrollArea className="h-[500px] border rounded-lg p-2">
                <div className="space-y-2">
                  {studentType === 'course' 
                    ? studentsWithCardStatus.map((item) => {
                        // Type guard for course students
                        if (!('courseStudent' in item)) return null;
                        const courseStudent = item.courseStudent;
                        const isSelected = selectedCourseStudentIds.has(courseStudent.id);
                        return (
                          <div
                            key={courseStudent.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted/50"
                            )}
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('[role="checkbox"]')) {
                                return;
                              }
                              toggleStudentSelection(courseStudent.id);
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCourseStudentIds(prev => new Set(prev).add(courseStudent.id));
                                  } else {
                                    setSelectedCourseStudentIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(courseStudent.id);
                                      return next;
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{courseStudent.fullName}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('examReports.admissionNo') || 'Admission'}: {courseStudent.admissionNo}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {item.hasCard ? (
                                  <Badge variant="default" className="text-xs">
                                    {t('assets.assigned') || 'Assigned'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {t('idCards.notAssigned') || 'Not Assigned'}
                                  </Badge>
                                )}
                                {item.isPrinted && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('idCards.printed') || 'Printed'}
                                  </Badge>
                                )}
                                {item.feePaid && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('courses.feePaid') || 'Fee Paid'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    : studentsWithCardStatus.map((item) => {
                        // Type guard for regular students
                        if (!('admission' in item)) return null;
                        const admission = item.admission;
                        const student = admission.student;
                        if (!student) return null;

                        const isSelected = selectedAdmissionIds.has(admission.id);
                        return (
                          <div
                            key={admission.id}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer",
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-muted/50"
                            )}
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.closest('button') || target.closest('[role="checkbox"]')) {
                                return;
                              }
                              toggleStudentSelection(admission.id);
                            }}
                          >
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAdmissionIds(prev => new Set(prev).add(admission.id));
                                  } else {
                                    setSelectedAdmissionIds(prev => {
                                      const next = new Set(prev);
                                      next.delete(admission.id);
                                      return next;
                                    });
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{student.fullName}</div>
                              <div className="text-sm text-muted-foreground">
                                {t('examReports.admissionNo') || 'Admission'}: {student.admissionNumber}
                              </div>
                              <div className="flex gap-1 mt-1">
                                {item.hasCard ? (
                                  <Badge variant="default" className="text-xs">
                                    {t('assets.assigned') || 'Assigned'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {t('idCards.notAssigned') || 'Not Assigned'}
                                  </Badge>
                                )}
                                {item.isPrinted && (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('idCards.printed') || 'Printed'}
                                  </Badge>
                                )}
                                {item.feePaid && (
                                  <Badge variant="outline" className="text-xs">
                                    {t('courses.feePaid') || 'Fee Paid'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                </div>
              </ScrollArea>
            </div>

            {/* Assignment Panel (60%) */}
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('idCards.assignment.assignTemplate')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>{t('idCards.template') || 'Template'}</Label>
                    <Select
                      value={selectedTemplateForAssignment}
                      onValueChange={setSelectedTemplateForAssignment}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('studentReportCard.selectTemplate') || 'Select template'} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('idCards.cardFee') || 'Card Fee'}</Label>
                      <Input
                        type="number"
                        value={cardFee}
                        onChange={(e) => setCardFee(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fee-paid"
                          checked={cardFeePaid}
                          onCheckedChange={(checked) => setCardFeePaid(checked as boolean)}
                        />
                        <Label htmlFor="fee-paid" className="cursor-pointer">
                          {t('courses.feePaid') || 'Fee Paid'}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {cardFeePaid && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('finance.accounts.account') || 'Account'} *</Label>
                        <Select value={accountId} onValueChange={setAccountId} required>
                          <SelectTrigger className={!accountId ? 'border-destructive' : ''}>
                            <SelectValue placeholder={t('events.select') || 'Select account'} />
                          </SelectTrigger>
                          <SelectContent>
                            {financeAccounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} {account.currency?.code ? `(${account.currency.code})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!accountId && (
                          <p className="text-sm text-destructive mt-1">
                            {t('events.required') || 'Required'}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>{t('finance.incomeCategories.category') || 'Income Category'} *</Label>
                        <Select value={incomeCategoryId} onValueChange={setIncomeCategoryId} required>
                          <SelectTrigger className={!incomeCategoryId ? 'border-destructive' : ''}>
                            <SelectValue placeholder={t('events.select') || 'Select category'} />
                          </SelectTrigger>
                          <SelectContent>
                            {incomeCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!incomeCategoryId && (
                          <p className="text-sm text-destructive mt-1">
                            {t('events.required') || 'Required'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {t('idCards.selectedStudents') || 'Selected'}: {studentType === 'course' 
                        ? selectedCourseStudentIds.size 
                        : selectedAdmissionIds.size}
                    </div>
                    <Button
                      onClick={() => setIsAssignDialogOpen(true)}
                      disabled={
                        !academicYearId || 
                        !selectedTemplateForAssignment || 
                        (studentType === 'course' 
                          ? selectedCourseStudentIds.size === 0 
                          : selectedAdmissionIds.size === 0)
                      }
                    >
                      {t('idCards.assign') || 'Assign Cards'}
                    </Button>
                  </div>

                  {/* Preview Section */}
                  <Separator />
                  <div>
                    <Label>{t('events.preview') || 'Preview'}</Label>
                    <div className="flex gap-2 mt-2">
                      <Select
                        value={previewStudentId || ''}
                        onValueChange={(value) => setPreviewStudentId(value || null)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('idCards.selectStudentForPreview') || 'Select student'} />
                        </SelectTrigger>
                        <SelectContent>
                          {studentType === 'course'
                            ? studentsWithCardStatus
                                .filter(s => s.hasCard && 'courseStudent' in s)
                                .map((item) => {
                                  if ('courseStudent' in item) {
                                    return (
                                      <SelectItem key={item.courseStudent.id} value={item.courseStudent.id}>
                                        {item.courseStudent.fullName}
                                      </SelectItem>
                                    );
                                  }
                                  return null;
                                })
                            : studentsWithCardStatus
                                .filter(s => s.hasCard && 'admission' in s)
                                .map((item) => {
                                  if ('admission' in item && item.admission.student) {
                                    return (
                                      <SelectItem key={item.admission.id} value={item.admission.id}>
                                        {item.admission.student.fullName}
                                      </SelectItem>
                                    );
                                  }
                                  return null;
                                })}
                        </SelectContent>
                      </Select>
                      <Select value={previewSide} onValueChange={(value: 'front' | 'back') => setPreviewSide(value)}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="front">{t('idCards.front') || 'Front'}</SelectItem>
                          <SelectItem value="back">{t('events.back') || 'Back'}</SelectItem>
                        </SelectContent>
                      </Select>
                      {previewStudentId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const card = studentType === 'course'
                              ? idCards.find(c => c.courseStudentId === previewStudentId)
                              : idCards.find(c => c.studentAdmissionId === previewStudentId);
                            if (card) handlePreview(card.id, previewSide);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('events.preview') || 'Preview'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            </TabsContent>

            {/* Assigned Cards Tab */}
            <TabsContent value="assigned" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {t('idCards.assignedCards.title') || 'Assigned Cards'}
                      </CardTitle>
                      <CardDescription>
                        {t('idCards.assignedCards.description') || 'View and manage assigned ID cards'}
                      </CardDescription>
                    </div>
                    <ReportExportButtons
                      data={filteredCards}
                      columns={reportColumns}
                      reportKey="id_cards_assignment"
                      title={t('idCards.assignedCards.title') || 'ID Cards Assignment Report'}
                      transformData={transformIdCardData}
                      buildFiltersSummary={buildFiltersSummary}
                      schoolId={schoolId || undefined}
                      templateType="id_cards"
                      disabled={cardsLoading || filteredCards.length === 0}
                    />
                  </div>
                </CardHeader>
                <CardContent>
              {cardsLoading ? (
                <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all">
                      {t('subjects.all') || 'All'} ({filteredCards.length})
                    </TabsTrigger>
                    <TabsTrigger value="unprinted">
                      {t('idCards.unprinted') || 'Unprinted'} ({filteredCards.filter(c => !c.isPrinted).length})
                    </TabsTrigger>
                    <TabsTrigger value="printed">
                      {t('idCards.printed') || 'Printed'} ({filteredCards.filter(c => c.isPrinted).length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    {filteredCards.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('idCards.noCards') || 'No ID cards found'}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('students.student') || 'Student'}</TableHead>
                            <TableHead>{t('examReports.admissionNo') || 'Admission No'}</TableHead>
                            <TableHead>{studentType === 'course' ? (t('courses.course') || 'Course') : (t('search.class') || 'Class')}</TableHead>
                            <TableHead>{t('idCards.template') || 'Template'}</TableHead>
                            <TableHead>{t('idCards.feeStatus') || 'Fee Status'}</TableHead>
                            <TableHead>{t('idCards.printedStatus') || 'Printed Status'}</TableHead>
                            <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCards.map(card => (
                            <TableRow key={card.id}>
                              <TableCell className="font-medium">
                                {card.student?.fullName || '-'}
                              </TableCell>
                              <TableCell>{card.student?.admissionNumber || '-'}</TableCell>
                              <TableCell>
                                {card.courseStudentId 
                                  ? (card.courseStudent?.course?.name || '-')
                                  : (card.class?.name || '-')}
                              </TableCell>
                              <TableCell>{card.template?.name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={card.cardFeePaid ? 'default' : 'outline'}>
                                  {card.cardFeePaid
                                    ? t('courses.feePaid') || 'Paid'
                                    : t('idCards.feeUnpaid') || 'Unpaid'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={card.isPrinted ? 'default' : 'secondary'}>
                                  {card.isPrinted
                                    ? t('idCards.printed') || 'Printed'
                                    : t('idCards.unprinted') || 'Unprinted'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const studentId = card.courseStudentId || card.studentAdmissionId;
                                      setPreviewStudentId(studentId);
                                      setPreviewSide('front');
                                      handlePreview(card.id, 'front');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {!card.isPrinted && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkPrinted(card.id)}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {!card.cardFeePaid && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkFeePaid(card.id)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCard(card)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeleteCardId(card.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="unprinted" className="mt-4">
                    {filteredCards.filter(c => !c.isPrinted).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('idCards.noUnprintedCards') || 'No unprinted cards found'}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('students.student') || 'Student'}</TableHead>
                            <TableHead>{t('examReports.admissionNo') || 'Admission No'}</TableHead>
                            <TableHead>{studentType === 'course' ? (t('courses.course') || 'Course') : (t('search.class') || 'Class')}</TableHead>
                            <TableHead>{t('idCards.template') || 'Template'}</TableHead>
                            <TableHead>{t('idCards.feeStatus') || 'Fee Status'}</TableHead>
                            <TableHead>{t('idCards.printedStatus') || 'Printed Status'}</TableHead>
                            <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCards.filter(c => !c.isPrinted).map(card => (
                            <TableRow key={card.id}>
                              <TableCell className="font-medium">
                                {card.student?.fullName || '-'}
                              </TableCell>
                              <TableCell>{card.student?.admissionNumber || '-'}</TableCell>
                              <TableCell>
                                {card.courseStudentId 
                                  ? (card.courseStudent?.course?.name || '-')
                                  : (card.class?.name || '-')}
                              </TableCell>
                              <TableCell>{card.template?.name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={card.cardFeePaid ? 'default' : 'outline'}>
                                  {card.cardFeePaid
                                    ? t('courses.feePaid') || 'Paid'
                                    : t('idCards.feeUnpaid') || 'Unpaid'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {t('idCards.unprinted') || 'Unprinted'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const studentId = card.courseStudentId || card.studentAdmissionId;
                                      setPreviewStudentId(studentId);
                                      setPreviewSide('front');
                                      handlePreview(card.id, 'front');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkPrinted(card.id)}
                                  >
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                  {!card.cardFeePaid && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkFeePaid(card.id)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCard(card)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeleteCardId(card.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="printed" className="mt-4">
                    {filteredCards.filter(c => c.isPrinted).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('idCards.noPrintedCards') || 'No printed cards found'}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('students.student') || 'Student'}</TableHead>
                            <TableHead>{t('examReports.admissionNo') || 'Admission No'}</TableHead>
                            <TableHead>{studentType === 'course' ? (t('courses.course') || 'Course') : (t('search.class') || 'Class')}</TableHead>
                            <TableHead>{t('idCards.template') || 'Template'}</TableHead>
                            <TableHead>{t('idCards.feeStatus') || 'Fee Status'}</TableHead>
                            <TableHead>{t('idCards.printedStatus') || 'Printed Status'}</TableHead>
                            <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCards.filter(c => c.isPrinted).map(card => (
                            <TableRow key={card.id}>
                              <TableCell className="font-medium">
                                {card.student?.fullName || '-'}
                              </TableCell>
                              <TableCell>{card.student?.admissionNumber || '-'}</TableCell>
                              <TableCell>
                                {card.courseStudentId 
                                  ? (card.courseStudent?.course?.name || '-')
                                  : (card.class?.name || '-')}
                              </TableCell>
                              <TableCell>{card.template?.name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={card.cardFeePaid ? 'default' : 'outline'}>
                                  {card.cardFeePaid
                                    ? t('courses.feePaid') || 'Paid'
                                    : t('idCards.feeUnpaid') || 'Unpaid'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="default">
                                  {t('idCards.printed') || 'Printed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const studentId = card.courseStudentId || card.studentAdmissionId;
                                      setPreviewStudentId(studentId);
                                      setPreviewSide('front');
                                      handlePreview(card.id, 'front');
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {!card.cardFeePaid && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleMarkFeePaid(card.id)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditCard(card)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDeleteCardId(card.id);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('idCards.assignment.confirmAssign') || 'Confirm Assignment'}</DialogTitle>
            <DialogDescription>
              {t('idCards.assignment.assignToStudents', { 
                count: studentType === 'course' 
                  ? selectedCourseStudentIds.size 
                  : selectedAdmissionIds.size 
              }) ||
                `Assign ID card to ${studentType === 'course' 
                  ? selectedCourseStudentIds.size 
                  : selectedAdmissionIds.size} student(s)?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleBulkAssign} disabled={assignCards.isPending}>
              {assignCards.isPending
                ? t('events.processing') || 'Processing...'
                : t('events.confirm') || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('idCards.editCard') || 'Edit ID Card'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('idCards.cardFee') || 'Card Fee'}</Label>
              <Input
                type="number"
                value={cardFee}
                onChange={(e) => setCardFee(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-fee-paid"
                checked={cardFeePaid}
                onCheckedChange={(checked) => setCardFeePaid(checked as boolean)}
              />
              <Label htmlFor="edit-fee-paid" className="cursor-pointer">
                {t('courses.feePaid') || 'Fee Paid'}
              </Label>
            </div>
            {cardFeePaid && (
              <>
                <div>
                  <Label>{t('finance.accounts.account') || 'Account'} *</Label>
                  <Select value={accountId} onValueChange={setAccountId} required>
                    <SelectTrigger className={!accountId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('events.select') || 'Select account'} />
                    </SelectTrigger>
                    <SelectContent>
                      {financeAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} {account.currency?.code ? `(${account.currency.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!accountId && (
                    <p className="text-sm text-destructive mt-1">
                      {t('events.required') || 'Required'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>{t('finance.incomeCategories.category') || 'Income Category'} *</Label>
                  <Select value={incomeCategoryId} onValueChange={setIncomeCategoryId} required>
                    <SelectTrigger className={!incomeCategoryId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={t('events.select') || 'Select category'} />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeCategories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!incomeCategoryId && (
                    <p className="text-sm text-destructive mt-1">
                      {t('events.required') || 'Required'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCard.isPending}>
              {updateCard.isPending ? t('events.saving') || 'Saving...' : t('events.save') || 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('idCards.deleteConfirm') || 'Are you sure you want to delete this ID card assignment?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} disabled={deleteCard.isPending}>
              {deleteCard.isPending ? t('events.deleting') || 'Deleting...' : t('events.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('events.preview') || 'Card Preview'}</DialogTitle>
          </DialogHeader>
          {previewStudentId && (
            <StudentIdCardPreview
              card={idCards.find(c => c.id === previewStudentId) || null}
              side={previewSide}
              showControls={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

