import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpDown, Edit, Trash2, Eye, Calendar, Users, GraduationCap, FileText, X, LayoutGrid, Table as TableIcon, RefreshCw, CheckCircle2, HelpCircle } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

import { AttendanceSettings } from '@/components/graduation/AttendanceSettings';
import { BatchWorkflowStepper } from '@/components/graduation/BatchWorkflowStepper';
import { ExamWeightsEditor } from '@/components/graduation/ExamWeightsEditor';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import { useGraduationBatches, useCreateGraduationBatch, useUpdateGraduationBatch, useDeleteGraduationBatch, useGenerateGraduationStudents, useApproveGraduationBatch } from '@/hooks/useGraduation';
import { useExams } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { useAuth } from '@/hooks/useAuth';


import { examClassesApi } from '@/lib/api/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { formatDate, formatDateTime } from '@/lib/utils';
import { graduationBatchSchema, type GraduationBatchFormData } from '@/lib/validations/graduation';

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: t('toast.graduation.status.draft') || 'Draft' },
    approved: { variant: 'default', label: t('toast.graduation.status.approved') || 'Approved' },
    issued: { variant: 'outline', label: t('toast.graduation.status.issued') || 'Issued' },
  };
  const config = variants[status] || variants.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Helper function to get status color for border
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft':
      return 'rgb(156 163 175)'; // gray-400
    case 'approved':
      return 'rgb(59 130 246)'; // blue-500
    case 'issued':
      return 'rgb(34 197 94)'; // green-500
    default:
      return 'rgb(156 163 175)';
  }
};

export default function GraduationBatchesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [schoolId, setSchoolId] = useState<string | undefined>(undefined);
  const [academicYearId, setAcademicYearId] = useState<string | undefined>(undefined);
  const [classId, setClassId] = useState<string | undefined>(undefined);
  const [examId, setExamId] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // New filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('graduation_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { profile } = useAuth();
  const { data: schools = [] } = useSchools();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: classes = [] } = useClasses();
  const { data: allExams = [] } = useExams();
  
  // Initialize form early so we can use form.watch() later
  const form = useForm<GraduationBatchFormData>({
    resolver: zodResolver(graduationBatchSchema),
    defaultValues: {
      graduation_type: 'final_year',
      school_id: schoolId || '',
      academic_year_id: '',
      class_id: '',
      from_class_id: '',
      to_class_id: '',
      exam_ids: [],
      exam_weights: {},
      graduation_date: '',
      min_attendance_percentage: 75.0,
      require_attendance: true,
      exclude_approved_leaves: true,
    },
  });
  
  // Get class academic year for filtering exams by class
  const selectedAcademicYearId = form.watch('academic_year_id');
  const selectedClassId = form.watch('class_id') || form.watch('from_class_id');
  const { data: classAcademicYears = [] } = useClassAcademicYears(
    selectedAcademicYearId || undefined,
    profile?.organization_id
  );
  
  // Find the class_academic_year_id for the selected class and academic year
  const selectedClassAcademicYearId = useMemo(() => {
    if (!selectedClassId || !selectedAcademicYearId) return null;
    const classAcademicYear = classAcademicYears.find(
      (cay) => cay.classId === selectedClassId && cay.academicYearId === selectedAcademicYearId
    );
    return classAcademicYear?.id || null;
  }, [classAcademicYears, selectedClassId, selectedAcademicYearId]);
  
  // Fetch exam classes to filter exams by class
  const { data: allExamClasses = [] } = useQuery({
    queryKey: ['exam-classes-for-filtering', selectedClassAcademicYearId, profile?.organization_id],
    queryFn: async () => {
      if (!selectedClassAcademicYearId || !profile?.organization_id) return [];
      try {
        // Fetch all exam classes - API returns snake_case format
        const examClasses = await examClassesApi.list();
        // Filter by class_academic_year_id (API returns snake_case)
        const filtered = (examClasses as any[]).filter(
          (ec: any) => ec.class_academic_year_id === selectedClassAcademicYearId
        );
        
        if (import.meta.env.DEV) {
          console.log('[GraduationBatchesPage] Filtered exam classes:', {
            total: examClasses.length,
            filtered: filtered.length,
            classAcademicYearId: selectedClassAcademicYearId,
          });
        }
        
        return filtered;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[GraduationBatchesPage] Error fetching exam classes:', error);
        }
        return [];
      }
    },
    enabled: !!selectedClassAcademicYearId && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  // Filter exams by academic year AND class (BOTH filters must be applied)
  const exams = useMemo(() => {
    let filtered = allExams;
    
    // Step 1: Filter by academic year (required - always apply if selected)
    if (selectedAcademicYearId) {
      filtered = filtered.filter((exam) => exam.academicYearId === selectedAcademicYearId);
    }
    
    // Step 2: Filter by class (if class is selected) - MUST filter by BOTH academic year AND class
    if (selectedClassAcademicYearId) {
      if (allExamClasses.length > 0) {
        // API returns snake_case format: exam_id
        const examIdsWithClass = new Set(
          allExamClasses.map((ec: any) => ec.exam_id).filter(Boolean)
        );
        filtered = filtered.filter((exam) => examIdsWithClass.has(exam.id));
        
        if (import.meta.env.DEV) {
          console.log('[GraduationBatchesPage] Filtered exams:', {
            totalExams: allExams.length,
            afterAcademicYear: filtered.length,
            examIdsWithClass: Array.from(examIdsWithClass),
            selectedClassAcademicYearId,
          });
        }
      } else {
        // If class is selected but no exam classes found, return empty array
        filtered = [];
      }
    }
    
    return filtered;
  }, [allExams, selectedAcademicYearId, selectedClassAcademicYearId, allExamClasses]);
  
  // Auto-select school if there's only one, or use profile's default_school_id
  useEffect(() => {
    if (schools.length === 1) {
      // Auto-select if only one school
      setSchoolId(schools[0].id);
    } else if (profile?.default_school_id && !schoolId) {
      // Use default school from profile if available
      setSchoolId(profile.default_school_id);
    }
  }, [schools, profile?.default_school_id, schoolId]);
  
  // Default to current academic year on load
  useEffect(() => {
    if (currentAcademicYear && !academicYearId) {
      setAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear, academicYearId]);

  const { data: batches = [], isLoading } = useGraduationBatches({
    school_id: schoolId,
    academic_year_id: academicYearId,
    class_id: classId,
    exam_id: examId,
  });

  const createBatch = useCreateGraduationBatch();
  const updateBatch = useUpdateGraduationBatch();
  const deleteBatch = useDeleteGraduationBatch();
  const generateStudents = useGenerateGraduationStudents();
  const approveBatch = useApproveGraduationBatch();

  // Watch form values for conditional rendering
  const graduationType = form.watch('graduation_type');
  const examIds = form.watch('exam_ids') || [];
  const examWeights = form.watch('exam_weights') || {};
  const requireAttendance = form.watch('require_attendance') ?? true;
  const minAttendancePercentage = form.watch('min_attendance_percentage') ?? 75.0;
  const excludeApprovedLeaves = form.watch('exclude_approved_leaves') ?? true;

  // Update school_id when schoolId changes
  useEffect(() => {
    if (schoolId) {
      form.setValue('school_id', schoolId);
    }
  }, [schoolId, form]);

  const editForm = useForm<GraduationBatchFormData>({
    resolver: zodResolver(graduationBatchSchema),
    defaultValues: {
      graduation_type: 'final_year',
      school_id: '',
      academic_year_id: '',
      class_id: '',
      from_class_id: '',
      to_class_id: '',
      exam_ids: [],
      exam_weights: {},
      graduation_date: '',
      min_attendance_percentage: 75.0,
      require_attendance: true,
      exclude_approved_leaves: true,
    },
  });

  // Watch edit form values for conditional rendering
  const editGraduationType = editForm.watch('graduation_type');
  const editExamIds = editForm.watch('exam_ids');
  const editExamWeights = editForm.watch('exam_weights') || {};
  const editRequireAttendance = editForm.watch('require_attendance') ?? true;
  const editMinAttendancePercentage = editForm.watch('min_attendance_percentage') ?? 75.0;
  const editExcludeApprovedLeaves = editForm.watch('exclude_approved_leaves') ?? true;

  const classNameById = useMemo(
    () => Object.fromEntries(classes.map((c) => [c.id, c.name])),
    [classes]
  );
  const academicYearNameById = useMemo(
    () => Object.fromEntries(academicYears.map((ay) => [ay.id, ay.name])),
    [academicYears]
  );
  const examNameById = useMemo(
    () => Object.fromEntries(exams.map((ex) => [ex.id, ex.name])),
    [exams]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const total = batches.length;
    const draft = batches.filter((b: any) => b.status === 'draft').length;
    const approved = batches.filter((b: any) => b.status === 'approved').length;
    const issued = batches.filter((b: any) => b.status === 'issued').length;
    return { total, draft, approved, issued };
  }, [batches]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((batch: any) => {
      const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
      const matchesDateFrom = !dateFrom || batch.graduation_date >= dateFrom;
      const matchesDateTo = !dateTo || batch.graduation_date <= dateTo;
      const matchesSearch = !searchQuery || 
        batch.academic_year?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.class?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        batch.exam?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (batch.exams && Array.isArray(batch.exams) && batch.exams.some((e: any) => 
          e.exam?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      return matchesStatus && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [batches, statusFilter, dateFrom, dateTo, searchQuery]);

  // Sort batches
  const sortedBatches = useMemo(() => {
    return [...filteredBatches].sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      switch(sortField) {
        case 'academic_year':
          aVal = a.academic_year?.name || '';
          bVal = b.academic_year?.name || '';
          break;
        case 'graduation_date':
          aVal = a.graduation_date || '';
          bVal = b.graduation_date || '';
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          return 0;
      }
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredBatches, sortField, sortDirection]);

  // Group by academic year
  const groupedBatches = useMemo(() => {
    const groups: Record<string, typeof batches> = {};
    sortedBatches.forEach((batch: any) => {
      const year = batch.academic_year?.name || 'Unknown';
      if (!groups[year]) groups[year] = [];
      groups[year].push(batch);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
      .map(([year, items]) => ({ year, items }));
  }, [sortedBatches]);

  // For pagination, we'll show all groups but limit items per group
  // Or we can paginate the groups themselves
  const totalPages = Math.ceil(groupedBatches.length / 5); // Show 5 year groups per page
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * 5;
    return groupedBatches.slice(start, start + 5);
  }, [groupedBatches, page]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page on sort
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, dateFrom, dateTo, searchQuery, academicYearId, classId, examId]);

  // Report export columns
  const reportColumns = useMemo(() => [
    { key: 'academic_year', label: t('fees.academicYear') || 'Academic Year' },
    { key: 'class_name', label: t('search.class') || 'Class' },
    { key: 'graduation_type', label: t('toast.graduation.graduationType') || 'Graduation Type' },
    { key: 'class_transfer', label: t('toast.graduation.classTransfer') || 'Class Transfer' },
    { key: 'exams', label: t('nav.exams') || 'Exams' },
    { key: 'graduation_date', label: t('events.graduationDate') || 'Graduation Date' },
    { key: 'status', label: t('events.statusLabel') || 'Status' },
    { key: 'students_count', label: t('toast.graduation.table.students') || 'Students' },
    { key: 'created_at', label: t('events.createdAt') || 'Created At' },
  ], [t]);

  // Transform data for report
  const transformGraduationBatchData = useCallback((batches: typeof sortedBatches) => {
    return batches.map((batch: any) => ({
      academic_year: batch.academic_year?.name || batch.academic_year_id || '-',
      class_name: batch.class?.name || batch.class_id || '-',
      graduation_type: batch.graduation_type === 'final_year'
        ? (t('toast.graduation.types.finalYear') || 'Final Year')
        : batch.graduation_type === 'promotion'
          ? (t('toast.graduation.types.promotion') || 'Promotion')
          : batch.graduation_type === 'transfer'
            ? (t('toast.graduation.types.transfer') || 'Transfer')
            : batch.graduation_type || '-',
      class_transfer: (batch.graduation_type === 'transfer' || batch.graduation_type === 'promotion') && batch.from_class_id && batch.to_class_id
        ? `${batch.from_class?.name || batch.from_class_id} → ${batch.to_class?.name || batch.to_class_id}`
        : '-',
      exams: batch.exams && Array.isArray(batch.exams) && batch.exams.length > 0
        ? batch.exams.map((e: any) => e.name || e.exam?.name || 'Unknown').join(', ')
        : '-',
      graduation_date: batch.graduation_date ? formatDate(batch.graduation_date) : '-',
      status: batch.status === 'draft'
        ? (t('toast.graduation.status.draft') || 'Draft')
        : batch.status === 'approved'
          ? (t('toast.graduation.status.approved') || 'Approved')
          : batch.status === 'issued'
            ? (t('toast.graduation.status.issued') || 'Issued')
            : batch.status || '-',
      students_count: (batch.students_count || batch.students?.length || 0).toString(),
      created_at: batch.created_at ? formatDate(batch.created_at) : '-',
    }));
  }, [t]);

  // Build filters summary
  const buildFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (schoolId) {
      const school = schools.find(s => s.id === schoolId);
      if (school) filters.push(`${t('events.schoolManagement') || 'School'}: ${school.schoolName}`);
    }
    if (academicYearId) {
      const year = academicYears.find(ay => ay.id === academicYearId);
      if (year) filters.push(`${t('fees.academicYear') || 'Academic Year'}: ${year.name}`);
    }
    if (classId) {
      const cls = classes.find(c => c.id === classId);
      if (cls) filters.push(`${t('search.class') || 'Class'}: ${cls.name}`);
    }
    if (examId) {
      const exam = exams.find(e => e.id === examId);
      if (exam) filters.push(`${t('nav.exams') || 'Exam'}: ${exam.name}`);
    }
    if (statusFilter !== 'all') {
      filters.push(`${t('events.statusLabel') || 'Status'}: ${statusFilter}`);
    }
    if (dateFrom) {
      filters.push(`${t('toast.graduation.filters.dateFrom') || 'From Date'}: ${formatDate(dateFrom)}`);
    }
    if (dateTo) {
      filters.push(`${t('toast.graduation.filters.dateTo') || 'To Date'}: ${formatDate(dateTo)}`);
    }
    if (searchQuery) {
      filters.push(`${t('events.search') || 'Search'}: ${searchQuery}`);
    }
    return filters.join(', ');
  }, [schoolId, academicYearId, classId, examId, statusFilter, dateFrom, dateTo, searchQuery, schools, academicYears, classes, exams, t]);

  const handleCreate = async (data: GraduationBatchFormData) => {
    try {
      // Validate required UUID fields are not empty
      if (!data.academic_year_id || data.academic_year_id.trim() === '') {
        form.setError('academic_year_id', { 
          type: 'required', 
          message: t('events.required') || 'Academic year is required' 
        });
        return;
      }
      
      // Validate class selection based on graduation type
      if (data.graduation_type === 'final_year') {
        if (!data.class_id || data.class_id.trim() === '') {
          form.setError('class_id', { 
            type: 'required', 
            message: t('events.required') || 'Class is required' 
          });
          return;
        }
      } else if (data.graduation_type === 'promotion' || data.graduation_type === 'transfer') {
        if (!data.from_class_id || data.from_class_id.trim() === '') {
          form.setError('from_class_id', { 
            type: 'required', 
            message: t('events.required') || 'From class is required' 
          });
          return;
        }
        if (!data.to_class_id || data.to_class_id.trim() === '') {
          form.setError('to_class_id', { 
            type: 'required', 
            message: t('events.required') || 'To class is required' 
          });
          return;
        }
      }
      
      if (!data.school_id || data.school_id.trim() === '') {
        form.setError('school_id', { 
          type: 'required', 
          message: t('events.required') || 'School is required' 
        });
        return;
      }
      
      // Validate exam selection
      if (!data.exam_ids || data.exam_ids.length === 0) {
        form.setError('exam_ids', { 
          type: 'required', 
          message: t('events.required') || 'At least one exam is required' 
        });
        return;
      }

      // Prepare payload for API
      const payload: any = {
        school_id: data.school_id.trim(),
        academic_year_id: data.academic_year_id.trim(),
        exam_ids: data.exam_ids,
        graduation_date: data.graduation_date,
        graduation_type: data.graduation_type,
        min_attendance_percentage: data.min_attendance_percentage,
        require_attendance: data.require_attendance ?? true,
        exclude_approved_leaves: data.exclude_approved_leaves ?? true,
      };

      // Add class IDs based on graduation type
      if (data.graduation_type === 'final_year') {
        payload.class_id = data.class_id.trim();
      } else if (data.graduation_type === 'promotion' || data.graduation_type === 'transfer') {
        payload.from_class_id = data.from_class_id.trim();
        payload.to_class_id = data.to_class_id.trim();
        // For transfer, use from_class_id as the main class_id
        if (data.graduation_type === 'transfer') {
          payload.class_id = data.from_class_id.trim();
        } else {
          // For promotion, use class_id from form (or from_class_id as fallback)
          payload.class_id = data.class_id?.trim() || data.from_class_id.trim();
        }
      }

      // Add exam weights if provided and multiple exams
      if (data.exam_ids.length > 1 && data.exam_weights && Object.keys(data.exam_weights).length > 0) {
        payload.exam_weights = data.exam_weights;
      }

      await createBatch.mutateAsync(payload);
      setCreateOpen(false);
      form.reset({
        graduation_type: 'final_year',
        school_id: schoolId || '',
        academic_year_id: '',
        class_id: '',
        from_class_id: '',
        to_class_id: '',
        exam_ids: [],
        exam_weights: {},
        graduation_date: '',
        min_attendance_percentage: 75.0,
        require_attendance: true,
        exclude_approved_leaves: true,
      });
    } catch (error) {
      // Error handling is done by the mutation hook
      console.error('Failed to create graduation batch:', error);
    }
  };

  const handleRowClick = (batch: any) => {
    setSelectedBatch(batch);
    setIsSidePanelOpen(true);
  };

  const handleEdit = () => {
    if (!selectedBatch) return;
    
    // Extract exam IDs and weights from batch.exams pivot data
    const examIds: string[] = [];
    const examWeights: Record<string, number> = {};
    
    if (selectedBatch.exams && Array.isArray(selectedBatch.exams)) {
      selectedBatch.exams.forEach((exam: any) => {
        const examId = exam.id || exam.pivot?.exam_id || exam.exam_id;
        if (examId) {
          examIds.push(examId);
          // Extract weight from pivot if available
          if (exam.pivot?.weight_percentage !== null && exam.pivot?.weight_percentage !== undefined) {
            examWeights[examId] = parseFloat(exam.pivot.weight_percentage);
          }
        }
      });
    } else if (selectedBatch.exam_id) {
      examIds.push(selectedBatch.exam_id);
    }
    
    // For promotion/transfer, use from_class_id if available, otherwise fall back to class_id
    const isPromotionOrTransfer = selectedBatch.graduation_type === 'promotion' || 
                                   selectedBatch.graduation_type === 'transfer';
    
    editForm.reset({
      graduation_type: selectedBatch.graduation_type || 'final_year',
      school_id: selectedBatch.school_id || '',
      academic_year_id: selectedBatch.academic_year_id || '',
      class_id: selectedBatch.class_id || '',
      // For promotion/transfer, use from_class_id if available, otherwise fall back to class_id
      from_class_id: isPromotionOrTransfer 
        ? (selectedBatch.from_class_id || selectedBatch.class_id || '')
        : '',
      to_class_id: selectedBatch.to_class_id || '',
      exam_ids: examIds,
      exam_weights: examWeights,
      graduation_date: selectedBatch.graduation_date || '',
      min_attendance_percentage: selectedBatch.min_attendance_percentage ?? 75.0,
      require_attendance: selectedBatch.require_attendance ?? true,
      exclude_approved_leaves: selectedBatch.exclude_approved_leaves ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (data: GraduationBatchFormData) => {
    if (!selectedBatch) return;
    
    try {
      const payload: any = {
        academic_year_id: data.academic_year_id,
        class_id: data.class_id,
        exam_ids: data.exam_ids,
        graduation_date: data.graduation_date,
        graduation_type: data.graduation_type,
        min_attendance_percentage: data.min_attendance_percentage,
        require_attendance: data.require_attendance ?? true,
        exclude_approved_leaves: data.exclude_approved_leaves ?? true,
      };

      // Add from/to class IDs for promotion and transfer
      if (data.graduation_type === 'promotion' || data.graduation_type === 'transfer') {
        payload.from_class_id = data.from_class_id;
        payload.to_class_id = data.to_class_id;
        // For transfer, use from_class_id as the main class_id
        if (data.graduation_type === 'transfer') {
          payload.class_id = data.from_class_id;
        }
      }

      // Add exam weights if multiple exams
      if (data.exam_ids.length > 1 && data.exam_weights && Object.keys(data.exam_weights).length > 0) {
        payload.exam_weights = data.exam_weights;
      }

      await updateBatch.mutateAsync({
        id: selectedBatch.id,
        data: payload,
      });
      
      setIsEditDialogOpen(false);
      setIsSidePanelOpen(false);
      setSelectedBatch(null);
    } catch (error) {
      // Error handling is done by the mutation hook
      if (import.meta.env.DEV) {
        console.error('Failed to update graduation batch:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;
    await deleteBatch.mutateAsync(selectedBatch.id);
    setIsDeleteDialogOpen(false);
    setIsSidePanelOpen(false);
    setSelectedBatch(null);
  };

  const handleGenerateStudents = async (batch?: any) => {
    const targetBatch = batch || selectedBatch;
    if (!targetBatch) return;
    await generateStudents.mutateAsync({
      batchId: targetBatch.id,
      schoolId: targetBatch.school_id,
    });
  };

  const handleApprove = async (batch?: any) => {
    const targetBatch = batch || selectedBatch;
    if (!targetBatch) return;
    await approveBatch.mutateAsync({
      batchId: targetBatch.id,
      schoolId: targetBatch.school_id,
    });
  };

  // Show message if no school selected
  if (!schoolId && schools.length > 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title={t('nav.graduation.batches') || 'Graduation Batches'}
          description={t('toast.graduation.batches.description') || 'Manage graduation batches, approve students, and issue certificates'}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">{t('events.selectSchool') || 'Select a School'}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('toast.graduation.selectSchoolDescription') || 'Please select a school from the filters above to view graduation batches'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('nav.graduation.batches') || 'Graduation Batches'}
        description={t('toast.graduation.batches.description') || 'Manage graduation batches, approve students, and issue certificates'}
        icon={<GraduationCap className="h-5 w-5" />}
        primaryAction={{
          label: t('events.create') || 'Create Batch',
          onClick: () => setCreateOpen(true),
          icon: <GraduationCap className="h-4 w-4" />,
        }}
        rightSlot={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ReportExportButtons
              data={sortedBatches}
              columns={reportColumns}
              reportKey="graduation_batches"
              title={t('nav.graduation.batches') || 'Graduation Batches Report'}
              transformData={transformGraduationBatchData}
              buildFiltersSummary={buildFiltersSummary}
              schoolId={schoolId}
              templateType="graduation_batches"
              disabled={isLoading || sortedBatches.length === 0}
            />
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              aria-label={t('common.cardView') || 'Card view'}
              className="flex-shrink-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              aria-label={t('common.tableView') || 'Table view'}
              className="flex-shrink-0"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Dialog 
        open={createOpen} 
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            // Reset form when dialog closes
            form.reset({
              graduation_type: 'final_year',
              school_id: schoolId || '',
              academic_year_id: '',
              class_id: '',
              from_class_id: '',
              to_class_id: '',
              exam_ids: [],
              exam_weights: {},
              graduation_date: '',
              min_attendance_percentage: 75.0,
              require_attendance: true,
              exclude_approved_leaves: true,
            });
          }
        }}
      >
        <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('nav.graduation.batches')}</DialogTitle>
              <DialogDescription>
                {t('toast.graduation.batches.description') || 'Create a new graduation batch. Configure the graduation type, select classes, exams, and set eligibility criteria.'}
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleCreate)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Graduation Type */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="graduation_type">{t('events.type') || 'Graduation Type'}</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Graduation Types:</p>
                            <p className="text-xs mb-1">
                              <strong>Final Year:</strong> Students completing their final year
                            </p>
                            <p className="text-xs mb-1">
                              <strong>Promotion:</strong> Moving students to next class
                            </p>
                            <p className="text-xs">
                              <strong>Transfer:</strong> Moving students between classes
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Controller
                      control={form.control}
                      name="graduation_type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(val) => {
                            field.onChange(val);
                            // Reset from/to class when changing type
                            if (val === 'final_year') {
                              form.setValue('from_class_id', '');
                              form.setValue('to_class_id', '');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('events.type')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="final_year">
                              {t('toast.graduation.types.finalYear') || 'Final Year Graduation'}
                            </SelectItem>
                            <SelectItem value="promotion">
                              {t('toast.graduation.types.promotion') || 'Promotion'}
                            </SelectItem>
                            <SelectItem value="transfer">
                              {t('toast.graduation.types.transfer') || 'Transfer'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.graduation_type && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.graduation_type.message}
                      </p>
                    )}
                  </div>

                  {/* Academic Year */}
                  <div>
                    <Label>{t('fees.academicYear')}</Label>
                    <Controller
                      control={form.control}
                      name="academic_year_id"
                      render={({ field }) => (
                        <Select 
                          value={field.value || ''} 
                          onValueChange={(val) => {
                            field.onChange(val || '');
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('fees.academicYear')} />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((ay) => (
                              <SelectItem key={ay.id} value={ay.id}>
                                {ay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.academic_year_id && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.academic_year_id.message}
                      </p>
                    )}
                  </div>

                  {/* Conditional class fields based on graduation type */}
                  {graduationType === 'final_year' ? (
                    <div>
                      <Label>{t('search.class')}</Label>
                      <Controller
                        control={form.control}
                        name="class_id"
                        render={({ field }) => (
                          <Select 
                            value={field.value || ''} 
                            onValueChange={(val) => {
                              field.onChange(val || '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('events.selectClass')} />
                            </SelectTrigger>
                            <SelectContent>
                              {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {form.formState.errors.class_id && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.class_id.message}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label>{t('toast.graduation.fromClass') || 'From Class'}</Label>
                        <Controller
                          control={form.control}
                          name="from_class_id"
                          render={({ field }) => (
                            <Select 
                              value={field.value || undefined} 
                              onValueChange={(val) => {
                                field.onChange(val || '');
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('toast.graduation.selectFromClass') || 'Select From Class'} />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.from_class_id && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.from_class_id.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>{t('toast.graduation.toClass') || 'To Class'}</Label>
                        <Controller
                          control={form.control}
                          name="to_class_id"
                          render={({ field }) => (
                            <Select 
                              value={field.value || undefined} 
                              onValueChange={(val) => {
                                field.onChange(val || '');
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('toast.graduation.selectToClass') || 'Select To Class'} />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.filter((cls) => cls.id !== form.watch('from_class_id')).map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id}>
                                    {cls.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {form.formState.errors.to_class_id && (
                          <p className="text-sm text-destructive mt-1">
                            {form.formState.errors.to_class_id.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Exams */}
                  <div className="md:col-span-2">
                    <Label>{t('nav.exams')}</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                      {exams.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('events.noData') || 'No exams available'}</p>
                      ) : (
                        exams.map((exam) => (
                          <div key={exam.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`exam-${exam.id}`}
                              checked={examIds.includes(exam.id)}
                              onCheckedChange={(checked) => {
                                const currentIds = form.watch('exam_ids') || [];
                                if (checked) {
                                  form.setValue('exam_ids', [...currentIds, exam.id]);
                                } else {
                                  form.setValue('exam_ids', currentIds.filter((id) => id !== exam.id));
                                  // Remove weight when exam is deselected
                                  const currentWeights = form.watch('exam_weights') || {};
                                  const newWeights = { ...currentWeights };
                                  delete newWeights[exam.id];
                                  form.setValue('exam_weights', newWeights);
                                }
                              }}
                            />
                            <label
                              htmlFor={`exam-${exam.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {exam.name}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    {examIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {examIds.length} {examIds.length === 1 ? 'exam' : 'exams'} selected
                      </p>
                    )}
                    {form.formState.errors.exam_ids && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.exam_ids.message}
                      </p>
                    )}
                  </div>

                  {/* Exam Weights - Show when 2+ exams selected */}
                  {examIds.length > 1 && (
                    <div className="md:col-span-2">
                      <ExamWeightsEditor
                        examIds={examIds}
                        weights={examWeights}
                        onChange={(newWeights) => form.setValue('exam_weights', newWeights)}
                        exams={exams}
                      />
                      {form.formState.errors.exam_weights && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.exam_weights.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Attendance Settings */}
                  <div className="md:col-span-2">
                    <Label>{t('toast.graduation.attendance.title') || 'Attendance Requirements'}</Label>
                    <AttendanceSettings
                      minAttendancePercentage={minAttendancePercentage}
                      requireAttendance={requireAttendance}
                      excludeApprovedLeaves={excludeApprovedLeaves}
                      onChange={(settings) => {
                        form.setValue('min_attendance_percentage', settings.min_attendance_percentage);
                        form.setValue('require_attendance', settings.require_attendance);
                        form.setValue('exclude_approved_leaves', settings.exclude_approved_leaves);
                      }}
                    />
                  </div>

                  {/* Graduation Date */}
                  <div className="md:col-span-2">
                    <Label>{t('events.graduationDate') ?? 'Graduation Date'}</Label>
                    <Controller
                      control={form.control}
                      name="graduation_date"
                      render={({ field }) => (
                        <CalendarDatePicker
                          date={field.value ? new Date(field.value) : undefined}
                          onDateChange={(date) => field.onChange(date ? date.toISOString().split("T")[0] : '')}
                        />
                      )}
                    />
                    {form.formState.errors.graduation_date && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.graduation_date.message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">
                    <span className="text-xs sm:text-sm">{t('events.cancel')}</span>
                  </Button>
                  <Button type="submit" disabled={createBatch.isPending} className="w-full sm:w-auto">
                    <span className="text-xs sm:text-sm">{createBatch.isPending ? t('events.processing') : t('events.save')}</span>
                  </Button>
                </div>
              </form>
        </DialogContent>
      </Dialog>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t('toast.graduation.summary.totalBatches') || 'Total Batches'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">{t('toast.graduation.summary.draftBatches') || 'Draft'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">{t('toast.graduation.summary.approvedBatches') || 'Approved'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.issued}</div>
            <p className="text-xs text-muted-foreground">{t('toast.graduation.summary.issuedBatches') || 'Issued'}</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel 
        title={t('events.filters') || 'Search & Filter'}
        defaultOpenDesktop={true}
        defaultOpenMobile={false}
      >
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">{t('events.status') || 'Status'}</Label>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="text-xs sm:text-sm"
              >
                {t('subjects.all') || 'All'} ({stats.total})
              </Button>
              <Button 
                variant={statusFilter === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('draft')}
                className="text-xs sm:text-sm"
              >
                {t('toast.graduation.status.draft') || 'Draft'} ({stats.draft})
              </Button>
              <Button 
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
                className="text-xs sm:text-sm"
              >
                {t('toast.graduation.status.approved') || 'Approved'} ({stats.approved})
              </Button>
              <Button 
                variant={statusFilter === 'issued' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('issued')}
                className="text-xs sm:text-sm"
              >
                {t('toast.graduation.status.issued') || 'Issued'} ({stats.issued})
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">{t('events.search') || 'Search'}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('toast.graduation.filters.searchPlaceholder') || 'Search by year, class, exam...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                  aria-label={t('events.clear') || 'Clear'}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label>{t('events.schoolManagement')}</Label>
              <Select value={schoolId || ''} onValueChange={(val) => setSchoolId(val || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectSchool')} />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('fees.academicYear')}</Label>
              <Select value={academicYearId || ''} onValueChange={(val) => setAcademicYearId(val || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('search.class')}</Label>
              <Select value={classId || ''} onValueChange={(val) => setClassId(val || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('events.selectClass') ?? 'Select'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('nav.exams')}</Label>
              <Select value={examId || ''} onValueChange={(val) => setExamId(val || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('nav.exams')} />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('toast.graduation.filters.dateFrom') || 'From Date'}</Label>
              <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} />
            </div>
            <div>
              <Label>{t('toast.graduation.filters.dateTo') || 'To Date'}</Label>
              <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} />
            </div>
          </div>
        </div>
      </FilterPanel>

      {/* Grouped Batches by Academic Year */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p>{t('events.loading')}</p>
          </CardContent>
        </Card>
      ) : groupedBatches.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4 max-w-md mx-auto">
              <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {t('toast.graduation.noBatches.title') || 'No Graduation Batches'}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('toast.graduation.noBatches.description') || 'Get started by creating your first graduation batch'}
                </p>
                <div className="space-y-2 text-left bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium">Quick Start:</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Select a school from the filter above</li>
                    <li>Click "Create Batch" to start</li>
                    <li>Choose graduation type and configure settings</li>
                    <li>Generate eligible students</li>
                  </ol>
                </div>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <GraduationCap className="h-4 w-4 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('events.create') || 'Create Your First Batch'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedGroups.map(({ year, items }) => (
            <Card key={year}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{year}</CardTitle>
                  <Badge variant="outline">{items.length} {t('toast.graduation.summary.totalBatches') || 'batches'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((batch: any) => (
                      <Card
                        key={batch.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer border-l-4"
                        style={{ borderLeftColor: getStatusColor(batch.status) }}
                        onClick={() => navigate(`/graduation/batches/${batch.id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1">
                                {batch.class?.name || batch.class_id || 'Class'}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <StatusBadge status={batch.status} />
                                {batch.graduation_type !== 'final_year' && (
                                  <Badge variant="secondary" className="text-xs">
                                    {batch.graduation_type === 'promotion'
                                      ? t('toast.graduation.types.promotion') || 'Promotion'
                                      : batch.graduation_type === 'transfer'
                                        ? t('toast.graduation.types.transfer') || 'Transfer'
                                        : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(batch);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <BatchWorkflowStepper batch={batch} />
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                            <div>
                              <p className="text-xs text-muted-foreground">Students</p>
                              <p className="text-lg font-semibold flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {batch.students_count || batch.students?.length || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Exams</p>
                              <p className="text-lg font-semibold">{batch.exams?.length || 1}</p>
                            </div>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Academic Year:</span>
                              <span className="font-medium">{batch.academic_year?.name || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Date:</span>
                              <span className="font-medium">
                                {batch.graduation_date ? formatDate(batch.graduation_date) : '—'}
                              </span>
                            </div>
                            {(batch.graduation_type === 'promotion' || batch.graduation_type === 'transfer') &&
                              batch.from_class_id &&
                              batch.to_class_id && (
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Transfer:</span>
                                  <span className="font-medium text-xs">
                                    {batch.from_class?.name || batch.from_class_id} →{' '}
                                    {batch.to_class?.name || batch.to_class_id}
                                  </span>
                                </div>
                              )}
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            {batch.status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateStudents(batch);
                                  }}
                                  disabled={generateStudents.isPending}
                                >
                                  <RefreshCw className="h-3 w-3 sm:mr-1" />
                                  <span className="text-xs sm:text-sm">Generate</span>
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApprove(batch);
                                  }}
                                  disabled={approveBatch.isPending}
                                >
                                  <CheckCircle2 className="h-3 w-3 sm:mr-1" />
                                  <span className="text-xs sm:text-sm">Approve</span>
                                </Button>
                              </>
                            )}
                            {batch.status === 'approved' && (
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/graduation/batches/${batch.id}`);
                                }}
                              >
                                <FileText className="h-3 w-3 sm:mr-1" />
                                <span className="text-xs sm:text-sm">Issue Certificates</span>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <div className="inline-block min-w-full align-middle px-4 md:px-0">
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleSort('academic_year')}
                        >
                          {t('fees.academicYear')}
                          {sortField === 'academic_year' && (
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>{t('search.class')}</TableHead>
                      <TableHead>{t('toast.graduation.classTransfer') || 'Class Transfer'}</TableHead>
                      <TableHead>{t('nav.exams')}</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleSort('graduation_date')}
                        >
                          {t('events.graduationDate') || 'Date'}
                          {sortField === 'graduation_date' && (
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleSort('status')}
                        >
                          {t('events.statusLabel')}
                          {sortField === 'status' && (
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>{t('toast.graduation.table.students') || 'Students'}</TableHead>
                      <TableHead>{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((batch: any) => (
                      <TableRow 
                        key={batch.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(batch)}
                      >
                        <TableCell>{batch.academic_year?.name || batch.academic_year_id}</TableCell>
                        <TableCell>{batch.class?.name || batch.class_id}</TableCell>
                        <TableCell>
                          {batch.graduation_type === 'transfer' && batch.from_class_id && batch.to_class_id ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">{batch.from_class?.name || batch.from_class_id}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{batch.to_class?.name || batch.to_class_id}</span>
                            </div>
                          ) : batch.graduation_type === 'promotion' && batch.to_class_id ? (
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-muted-foreground">{batch.class?.name || batch.class_id}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">{batch.to_class?.name || batch.to_class_id}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.exams && Array.isArray(batch.exams) && batch.exams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {batch.exams.map((exam: any, idx: number) => (
                                <Badge key={exam.id || exam.pivot?.exam_id || idx} variant="outline" className="text-xs">
                                  {exam.name || 'Unknown Exam'}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            batch.exam?.name || batch.exam_id || '—'
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.graduation_date ? formatDate(batch.graduation_date) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={batch.status} />
                            {batch.graduation_type && batch.graduation_type !== 'final_year' && (
                              <Badge variant="secondary" className="text-xs w-fit">
                                {batch.graduation_type === 'transfer' ? (t('toast.graduation.type.transfer') || 'Transfer') :
                                 batch.graduation_type === 'promotion' ? (t('toast.graduation.type.promotion') || 'Promotion') :
                                 ''}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{batch.students_count || batch.students?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/graduation/batches/${batch.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {groupedBatches.length > 5 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {t('toast.graduation.pagination.showing') || 'Showing'} {(page - 1) * 5 + 1}-{Math.min(page * 5, groupedBatches.length)} {t('toast.graduation.pagination.of') || 'of'} {groupedBatches.length} {t('toast.graduation.summary.totalBatches') || 'year groups'}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs sm:text-sm"
                >
                  {t('events.previous') || 'Previous'}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="text-xs sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-xs sm:text-sm"
                >
                  {t('events.next') || 'Next'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Side Panel for Batch Details */}
      <Sheet open={isSidePanelOpen} onOpenChange={setIsSidePanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedBatch && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {t('nav.graduation.batches')}
                </SheetTitle>
                <SheetDescription>
                  {selectedBatch.academic_year?.name} • {selectedBatch.class?.name}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Status and Actions */}
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedBatch.status} />
                  <div className="flex gap-2">
                    {selectedBatch.status === 'draft' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEdit}
                          disabled={updateBatch.isPending}
                        >
                          <Edit className="h-4 w-4 sm:mr-2" />
                          <span className="text-xs sm:text-sm">{t('events.edit')}</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          disabled={deleteBatch.isPending}
                        >
                          <Trash2 className="h-4 w-4 sm:mr-2" />
                          <span className="text-xs sm:text-sm">{t('events.delete')}</span>
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/graduation/batches/${selectedBatch.id}`}>
                        <Eye className="h-4 w-4 sm:mr-2" />
                        <span className="text-xs sm:text-sm">{t('events.viewDetails') || 'View Details'}</span>
                      </Link>
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Batch Information */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {t('fees.academicYear')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{selectedBatch.academic_year?.name || selectedBatch.academic_year_id}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('search.class')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">{selectedBatch.class?.name || selectedBatch.class_id}</p>
                      {(selectedBatch.graduation_type === 'transfer' || selectedBatch.graduation_type === 'promotion') && 
                       (selectedBatch.from_class_id || selectedBatch.to_class_id) && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {selectedBatch.graduation_type === 'transfer' && selectedBatch.from_class_id && selectedBatch.to_class_id ? (
                            <div className="flex items-center gap-1">
                              <span>{selectedBatch.from_class?.name || selectedBatch.from_class_id}</span>
                              <span>→</span>
                              <span className="font-medium">{selectedBatch.to_class?.name || selectedBatch.to_class_id}</span>
                            </div>
                          ) : selectedBatch.graduation_type === 'promotion' && selectedBatch.to_class_id ? (
                            <div className="flex items-center gap-1">
                              <span>{selectedBatch.class?.name || selectedBatch.class_id}</span>
                              <span>→</span>
                              <span className="font-medium">{selectedBatch.to_class?.name || selectedBatch.to_class_id}</span>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        {t('events.graduationDate')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {selectedBatch.graduation_date ? formatDate(selectedBatch.graduation_date) : '—'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {t('table.students')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {selectedBatch.students_count || selectedBatch.students?.length || 0}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Exams */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">{t('nav.exams')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedBatch.exams && Array.isArray(selectedBatch.exams) && selectedBatch.exams.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedBatch.exams.map((exam: any, idx: number) => (
                          <Badge key={exam.id || exam.pivot?.exam_id || idx} variant="outline">
                            {exam.name || 'Unknown Exam'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{selectedBatch.exam?.name || selectedBatch.exam_id || '—'}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Actions for Draft Batches */}
                {selectedBatch.status === 'draft' && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleGenerateStudents}
                        disabled={generateStudents.isPending}
                        className="w-full"
                      >
                        {generateStudents.isPending ? t('events.processing') : t('events.generateStudents') || 'Generate Students'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleApprove}
                        disabled={approveBatch.isPending || !selectedBatch.students_count}
                        className="w-full"
                      >
                        {approveBatch.isPending ? t('events.processing') : t('events.approve')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('assets.deleteConfirm') || 'Are you sure you want to delete this graduation batch? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteBatch.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatch.isPending ? t('events.processing') : t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('events.edit')} {t('nav.graduation.batches')}</DialogTitle>
            <DialogDescription>
              {t('toast.graduation.editBatchDescription') || 'Update the graduation batch settings. Some fields may be locked if students have already been generated.'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Graduation Type - Read-only if batch has students */}
              <div>
                <Label>{t('events.type') || 'Graduation Type'}</Label>
                <Controller
                  control={editForm.control}
                  name="graduation_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        // Reset from/to class when changing type
                        if (val === 'final_year') {
                          editForm.setValue('from_class_id', '');
                          editForm.setValue('to_class_id', '');
                        }
                      }}
                      disabled={selectedBatch?.students_count > 0 || selectedBatch?.students?.length > 0}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="final_year">{t('toast.graduation.types.finalYear') || 'Final Year'}</SelectItem>
                        <SelectItem value="promotion">{t('toast.graduation.types.promotion') || 'Promotion'}</SelectItem>
                        <SelectItem value="transfer">{t('toast.graduation.types.transfer') || 'Transfer'}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {selectedBatch?.students_count > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('toast.graduation.cannotChangeTypeWithStudents') || 'Cannot change type when batch has students'}
                  </p>
                )}
                {editForm.formState.errors.graduation_type && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.graduation_type.message}
                  </p>
                )}
              </div>
              <div>
                <Label>{t('fees.academicYear')}</Label>
                <Controller
                  control={editForm.control}
                  name="academic_year_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('fees.academicYear')} />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((ay) => (
                          <SelectItem key={ay.id} value={ay.id}>
                            {ay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {editForm.formState.errors.academic_year_id && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.academic_year_id.message}
                  </p>
                )}
              </div>
              
              {/* Conditional class fields based on graduation type */}
              {editGraduationType === 'final_year' ? (
                <div>
                  <Label>{t('search.class')}</Label>
                  <Controller
                    control={editForm.control}
                    name="class_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('events.selectClass')} />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editForm.formState.errors.class_id && (
                    <p className="text-sm text-destructive mt-1">
                      {editForm.formState.errors.class_id.message}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <Label>{t('toast.graduation.fromClass') || 'From Class'}</Label>
                    <Controller
                      control={editForm.control}
                      name="from_class_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('toast.graduation.selectFromClass') || 'Select From Class'} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {editForm.formState.errors.from_class_id && (
                      <p className="text-sm text-destructive mt-1">
                        {editForm.formState.errors.from_class_id.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>{t('toast.graduation.toClass') || 'To Class'}</Label>
                    <Controller
                      control={editForm.control}
                      name="to_class_id"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('toast.graduation.selectToClass') || 'Select To Class'} />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.filter((cls) => cls.id !== editForm.watch('from_class_id')).map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {editForm.formState.errors.to_class_id && (
                      <p className="text-sm text-destructive mt-1">
                        {editForm.formState.errors.to_class_id.message}
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {/* Exams */}
              <div className="md:col-span-2">
                <Label>{t('nav.exams')}</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {exams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('events.noData') || 'No exams available'}</p>
                  ) : (
                    exams.map((exam) => (
                      <div key={exam.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-exam-${exam.id}`}
                          checked={editExamIds.includes(exam.id)}
                          onCheckedChange={(checked) => {
                            const currentIds = editForm.watch('exam_ids');
                            if (checked) {
                              editForm.setValue('exam_ids', [...currentIds, exam.id]);
                            } else {
                              editForm.setValue('exam_ids', currentIds.filter((id) => id !== exam.id));
                              // Remove weight when exam is deselected
                              const currentWeights = editForm.watch('exam_weights') || {};
                              const newWeights = { ...currentWeights };
                              delete newWeights[exam.id];
                              editForm.setValue('exam_weights', newWeights);
                            }
                          }}
                        />
                        <label
                          htmlFor={`edit-exam-${exam.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {exam.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                {editExamIds.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {editExamIds.length} {editExamIds.length === 1 ? 'exam' : 'exams'} selected
                  </p>
                )}
                {editForm.formState.errors.exam_ids && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.exam_ids.message}
                  </p>
                )}
              </div>

              {/* Exam Weights - Show when 2+ exams selected */}
              {editExamIds.length > 1 && (
                <div className="md:col-span-2">
                  <ExamWeightsEditor
                    examIds={editExamIds}
                    weights={editExamWeights}
                    onChange={(newWeights) => editForm.setValue('exam_weights', newWeights)}
                    exams={exams}
                  />
                  {editForm.formState.errors.exam_weights && (
                    <p className="text-sm text-destructive mt-1">
                      {editForm.formState.errors.exam_weights.message}
                    </p>
                  )}
                </div>
              )}

              {/* Attendance Settings */}
              <div className="md:col-span-2">
                <Label>{t('toast.graduation.attendance.title') || 'Attendance Requirements'}</Label>
                <AttendanceSettings
                  minAttendancePercentage={editMinAttendancePercentage}
                  requireAttendance={editRequireAttendance}
                  excludeApprovedLeaves={editExcludeApprovedLeaves}
                  onChange={(settings) => {
                    editForm.setValue('min_attendance_percentage', settings.min_attendance_percentage);
                    editForm.setValue('require_attendance', settings.require_attendance);
                    editForm.setValue('exclude_approved_leaves', settings.exclude_approved_leaves);
                  }}
                />
              </div>
              
              {/* Graduation Date */}
              <div className="md:col-span-2">
                <Label htmlFor="edit-graduation_date">{t('events.graduationDate') ?? 'Graduation Date'}</Label>
                <Controller
                  control={editForm.control}
                  name="graduation_date"
                  render={({ field }) => (
                    <CalendarDatePicker
                      date={field.value ? new Date(field.value) : undefined}
                      onDateChange={(date) => field.onChange(date ? date.toISOString().split("T")[0] : '')}
                    />
                  )}
                />
                {editForm.formState.errors.graduation_date && (
                  <p className="text-sm text-destructive mt-1">
                    {editForm.formState.errors.graduation_date.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('events.cancel')}
              </Button>
              <Button type="submit" disabled={updateBatch.isPending}>
                {updateBatch.isPending ? t('events.processing') : t('events.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
