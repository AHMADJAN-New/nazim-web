import { useMemo, useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronUp, ChevronDown, ArrowUpDown, Edit, Trash2, Eye, Calendar, Users, GraduationCap, FileText, X, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useGraduationBatches, useCreateGraduationBatch, useUpdateGraduationBatch, useDeleteGraduationBatch, useGenerateGraduationStudents, useApproveGraduationBatch } from '@/hooks/useGraduation';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClasses } from '@/hooks/useClasses';
import { useExams } from '@/hooks/useExams';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useLanguage();
  const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
    draft: { variant: 'secondary', label: t('graduation.status.draft') || 'Draft' },
    approved: { variant: 'default', label: t('graduation.status.approved') || 'Approved' },
    issued: { variant: 'outline', label: t('graduation.status.issued') || 'Issued' },
  };
  const config = variants[status] || variants.draft;
  return <Badge variant={config.variant}>{config.label}</Badge>;
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
  const { data: exams = [] } = useExams();
  
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
  const [form, setForm] = useState({
    school_id: '',
    academic_year_id: '',
    class_id: '',
    exam_ids: [] as string[],
    graduation_date: '',
  });
  const [transferForm, setTransferForm] = useState({
    school_id: '',
    academic_year_id: '',
    from_class_id: '',
    to_class_id: '',
    exam_ids: [] as string[],
    graduation_date: '',
  });
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  // Initialize transfer form with school_id when dialog opens
  useEffect(() => {
    if (isTransferDialogOpen && schoolId && !transferForm.school_id) {
      setTransferForm((prev) => ({ ...prev, school_id: schoolId }));
    }
  }, [isTransferDialogOpen, schoolId, transferForm.school_id]);
  const [editForm, setEditForm] = useState({
    academic_year_id: '',
    class_id: '',
    exam_ids: [] as string[],
    graduation_date: '',
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.exam_ids.length === 0) {
      alert('Please select at least one exam');
      return;
    }
    await createBatch.mutateAsync({
      ...form,
      exam_ids: form.exam_ids,
      graduation_type: 'final_year',
    });
    setCreateOpen(false);
    setForm({
      school_id: '',
      academic_year_id: '',
      class_id: '',
      exam_ids: [],
      graduation_date: '',
    });
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.exam_ids.length === 0) {
      alert('Please select at least one exam');
      return;
    }
    if (!transferForm.from_class_id || !transferForm.to_class_id) {
      alert('Please select both from class and to class');
      return;
    }
    await createBatch.mutateAsync({
      school_id: transferForm.school_id || schoolId || '',
      academic_year_id: transferForm.academic_year_id,
      class_id: transferForm.from_class_id, // Use from_class_id as the main class_id
      from_class_id: transferForm.from_class_id,
      to_class_id: transferForm.to_class_id,
      exam_ids: transferForm.exam_ids,
      graduation_date: transferForm.graduation_date,
      graduation_type: 'transfer',
    });
    setIsTransferDialogOpen(false);
    setTransferForm({
      school_id: schoolId || '',
      academic_year_id: '',
      from_class_id: '',
      to_class_id: '',
      exam_ids: [],
      graduation_date: '',
    });
  };

  const handleRowClick = (batch: any) => {
    setSelectedBatch(batch);
    setIsSidePanelOpen(true);
  };

  const handleEdit = () => {
    if (!selectedBatch) return;
    setEditForm({
      academic_year_id: selectedBatch.academic_year_id,
      class_id: selectedBatch.class_id,
      exam_ids: selectedBatch.exams?.map((e: any) => e.id || e.pivot?.exam_id) || (selectedBatch.exam_id ? [selectedBatch.exam_id] : []),
      graduation_date: selectedBatch.graduation_date || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || editForm.exam_ids.length === 0) return;
    await updateBatch.mutateAsync({
      id: selectedBatch.id,
      data: editForm,
    });
    setIsEditDialogOpen(false);
    setIsSidePanelOpen(false);
    setSelectedBatch(null);
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;
    await deleteBatch.mutateAsync(selectedBatch.id);
    setIsDeleteDialogOpen(false);
    setIsSidePanelOpen(false);
    setSelectedBatch(null);
  };

  const handleGenerateStudents = async () => {
    if (!selectedBatch) return;
    await generateStudents.mutateAsync({
      batchId: selectedBatch.id,
      schoolId: selectedBatch.school_id,
    });
  };

  const handleApprove = async () => {
    if (!selectedBatch) return;
    await approveBatch.mutateAsync({
      batchId: selectedBatch.id,
      schoolId: selectedBatch.school_id,
    });
  };

  // Show message if no school selected
  if (!schoolId && schools.length > 0) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('nav.graduation.batches') || 'Graduation Batches'}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('graduation.batches.description') || 'Manage graduation batches, approve students, and issue certificates'}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">{t('common.selectSchool') || 'Select a School'}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('graduation.selectSchoolDescription') || 'Please select a school from the filters above to view graduation batches'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('nav.graduation.batches') || 'Graduation Batches'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('graduation.batches.description') || 'Manage graduation batches, approve students, and issue certificates'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <GraduationCap className="h-4 w-4 mr-2" />
                {t('common.create') || 'Create Batch'}
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('nav.graduation.batches')}</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('common.schoolManagement')}</Label>
                  <Select
                    value={form.school_id || schoolId || ''}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, school_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectSchool')} />
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
                  <Select
                    value={form.academic_year_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, academic_year_id: val }))}
                  >
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
                  <Label>{t('fees.class')}</Label>
                  <Select
                    value={form.class_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, class_id: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.selectClass')} />
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
                <div className="md:col-span-2">
                  <Label>{t('nav.exams')}</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {exams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('common.noData') || 'No exams available'}</p>
                    ) : (
                      exams.map((exam) => (
                        <div key={exam.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`exam-${exam.id}`}
                            checked={form.exam_ids.includes(exam.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setForm((prev) => ({ ...prev, exam_ids: [...prev.exam_ids, exam.id] }));
                              } else {
                                setForm((prev) => ({ ...prev, exam_ids: prev.exam_ids.filter((id) => id !== exam.id) }));
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
                  {form.exam_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.exam_ids.length} {form.exam_ids.length === 1 ? 'exam' : 'exams'} selected
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>{t('common.graduationDate') ?? 'Graduation Date'}</Label>
                  <Input
                    type="date"
                    value={form.graduation_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, graduation_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createBatch.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              {t('graduation.createTransfer') || 'Create Transfer Batch'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('graduation.createTransfer') || 'Create Transfer Batch'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTransfer}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('common.schoolManagement')}</Label>
                    <Select 
                      value={transferForm.school_id || schoolId || ''} 
                      onValueChange={(val) => setTransferForm((prev) => ({ ...prev, school_id: val }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectSchool')} />
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
                    <Select 
                      value={transferForm.academic_year_id} 
                      onValueChange={(val) => setTransferForm((prev) => ({ ...prev, academic_year_id: val }))}
                      required
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
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('graduation.fromClass') || 'From Class'}</Label>
                    <Select 
                      value={transferForm.from_class_id} 
                      onValueChange={(val) => setTransferForm((prev) => ({ ...prev, from_class_id: val }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('graduation.selectFromClass') || 'Select From Class'} />
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
                    <Label>{t('graduation.toClass') || 'To Class'}</Label>
                    <Select 
                      value={transferForm.to_class_id} 
                      onValueChange={(val) => setTransferForm((prev) => ({ ...prev, to_class_id: val }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('graduation.selectToClass') || 'Select To Class'} />
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
                </div>
                <div className="md:col-span-2">
                  <Label>{t('nav.exams')}</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {exams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('common.noData') || 'No exams available'}</p>
                    ) : (
                      exams.map((exam) => (
                        <div key={exam.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`transfer-exam-${exam.id}`}
                            checked={transferForm.exam_ids.includes(exam.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTransferForm((prev) => ({ ...prev, exam_ids: [...prev.exam_ids, exam.id] }));
                              } else {
                                setTransferForm((prev) => ({ ...prev, exam_ids: prev.exam_ids.filter((id) => id !== exam.id) }));
                              }
                            }}
                          />
                          <label
                            htmlFor={`transfer-exam-${exam.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {exam.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {transferForm.exam_ids.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {transferForm.exam_ids.length} {transferForm.exam_ids.length === 1 ? 'exam' : 'exams'} selected
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label>{t('common.graduationDate') ?? 'Graduation Date'}</Label>
                  <Input
                    type="date"
                    value={transferForm.graduation_date}
                    onChange={(e) => setTransferForm((prev) => ({ ...prev, graduation_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createBatch.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t('graduation.summary.totalBatches') || 'Total Batches'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{stats.draft}</div>
            <p className="text-xs text-muted-foreground">{t('graduation.summary.draftBatches') || 'Draft'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-500">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">{t('graduation.summary.approvedBatches') || 'Approved'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.issued}</div>
            <p className="text-xs text-muted-foreground">{t('graduation.summary.issuedBatches') || 'Issued'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          {t('common.all') || 'All'} ({stats.total})
        </Button>
        <Button 
          variant={statusFilter === 'draft' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('draft')}
        >
          {t('graduation.status.draft') || 'Draft'} ({stats.draft})
        </Button>
        <Button 
          variant={statusFilter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('approved')}
        >
          {t('graduation.status.approved') || 'Approved'} ({stats.approved})
        </Button>
        <Button 
          variant={statusFilter === 'issued' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('issued')}
        >
          {t('graduation.status.issued') || 'Issued'} ({stats.issued})
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('graduation.filters.searchPlaceholder') || 'Search by year, class, exam...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.filter')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{t('common.schoolManagement')}</Label>
            <Select value={schoolId || ''} onValueChange={(val) => setSchoolId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectSchool')} />
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
            <Label>{t('fees.class')}</Label>
            <Select value={classId || ''} onValueChange={(val) => setClassId(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectClass') ?? 'Select'} />
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
            <Label>{t('graduation.filters.dateFrom') || 'From Date'}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('graduation.filters.dateTo') || 'To Date'}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grouped Batches by Academic Year */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p>{t('common.loading')}</p>
          </CardContent>
        </Card>
      ) : groupedBatches.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center space-y-4">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">{t('graduation.noBatches.title') || 'No Graduation Batches'}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('graduation.noBatches.description') || 'Get started by creating your first graduation batch'}
                </p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <GraduationCap className="h-4 w-4 mr-2" />
                    {t('common.create') || 'Create Your First Batch'}
                  </Button>
                </DialogTrigger>
              </Dialog>
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
                  <Badge variant="outline">{items.length} {t('graduation.summary.totalBatches') || 'batches'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
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
                      <TableHead>{t('fees.class')}</TableHead>
                      <TableHead>{t('graduation.classTransfer') || 'Class Transfer'}</TableHead>
                      <TableHead>{t('nav.exams')}</TableHead>
                      <TableHead>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleSort('graduation_date')}
                        >
                          {t('common.graduationDate') || 'Date'}
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
                          {t('common.statusLabel')}
                          {sortField === 'status' && (
                            <ArrowUpDown className="ml-2 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>{t('graduation.table.students') || 'Students'}</TableHead>
                      <TableHead>{t('common.actions')}</TableHead>
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
                                {batch.graduation_type === 'transfer' ? (t('graduation.type.transfer') || 'Transfer') :
                                 batch.graduation_type === 'promotion' ? (t('graduation.type.promotion') || 'Promotion') :
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {groupedBatches.length > 5 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('graduation.pagination.showing') || 'Showing'} {(page - 1) * 5 + 1}-{Math.min(page * 5, groupedBatches.length)} {t('graduation.pagination.of') || 'of'} {groupedBatches.length} {t('graduation.summary.totalBatches') || 'year groups'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('common.previous') || 'Previous'}
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
                >
                  {t('common.next') || 'Next'}
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
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setIsDeleteDialogOpen(true)}
                          disabled={deleteBatch.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/graduation/batches/${selectedBatch.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.viewDetails') || 'View Details'}
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
                        {t('fees.class')}
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
                        {t('common.graduationDate')}
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
                        {t('nav.students')}
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
                        {generateStudents.isPending ? t('common.processing') : t('common.generateStudents') || 'Generate Students'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleApprove}
                        disabled={approveBatch.isPending || !selectedBatch.students_count}
                        className="w-full"
                      >
                        {approveBatch.isPending ? t('common.processing') : t('common.approve')}
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
            <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('graduation.deleteConfirm') || 'Are you sure you want to delete this graduation batch? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteBatch.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatch.isPending ? t('common.processing') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('common.edit')} {t('nav.graduation.batches')}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('fees.academicYear')}</Label>
                <Select
                  value={editForm.academic_year_id}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, academic_year_id: val }))}
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
              </div>
              <div>
                <Label>{t('fees.class')}</Label>
                <Select
                  value={editForm.class_id}
                  onValueChange={(val) => setEditForm((prev) => ({ ...prev, class_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('common.selectClass')} />
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
              <div className="md:col-span-2">
                <Label>{t('nav.exams')}</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {exams.map((exam) => (
                    <div key={exam.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-exam-${exam.id}`}
                        checked={editForm.exam_ids.includes(exam.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm((prev) => ({ ...prev, exam_ids: [...prev.exam_ids, exam.id] }));
                          } else {
                            setEditForm((prev) => ({ ...prev, exam_ids: prev.exam_ids.filter((id) => id !== exam.id) }));
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
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label>{t('common.graduationDate') ?? 'Graduation Date'}</Label>
                <Input
                  type="date"
                  value={editForm.graduation_date}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, graduation_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateBatch.isPending}>
                {updateBatch.isPending ? t('common.processing') : t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
