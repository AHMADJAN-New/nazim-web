import {
  Download,
  FileArchive,
  FileText,
  CheckSquare,
  Square,
  Filter,
  Search,
  TrendingUp,
  Printer,
  DollarSign,
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useAuth } from '@/hooks/useAuth';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useIdCardTemplates } from '@/hooks/useIdCardTemplates';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import {
  useStudentIdCards,
  useExportIdCards,
  type StudentIdCard,
  type StudentIdCardFilters,
  type ExportIdCardRequest,
} from '@/hooks/useStudentIdCards';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'idCardExportSettings';

interface ExportSettings {
  studentType?: 'regular' | 'course';
  academicYearId?: string;
  schoolId?: string;
  classId?: string;
  classAcademicYearId?: string;
  courseId?: string;
  templateId?: string;
  enrollmentStatus?: string;
  printedStatus?: string;
  feeStatus?: string;
  exportFormat?: 'zip' | 'pdf';
  exportSides?: 'front' | 'back' | 'both';
  cardsPerPage?: number;
  quality?: 'standard' | 'high';
  includeUnprinted?: boolean;
  includeUnpaid?: boolean;
}

function loadSettings(): ExportSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[IdCardExport] Failed to load settings from localStorage:', error);
    }
  }
  return {};
}

function saveSettings(settings: ExportSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[IdCardExport] Failed to save settings to localStorage:', error);
    }
  }
}

export default function IdCardExport() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  // Load saved settings
  const savedSettings = loadSettings();

  // Student type state
  const [studentType, setStudentType] = useState<'regular' | 'course'>(savedSettings.studentType || 'regular');

  // Filter states
  const [academicYearId, setAcademicYearId] = useState<string>(savedSettings.academicYearId || '');
  const [schoolId, setSchoolId] = useState<string>(savedSettings.schoolId || '');
  const [classId, setClassId] = useState<string>(savedSettings.classId || '');
  const [classAcademicYearId, setClassAcademicYearId] = useState<string>(savedSettings.classAcademicYearId || '');
  const [courseId, setCourseId] = useState<string>(savedSettings.courseId || '');
  const [templateId, setTemplateId] = useState<string>(savedSettings.templateId || '');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>(savedSettings.enrollmentStatus || 'active');
  const [printedStatus, setPrintedStatus] = useState<string>(savedSettings.printedStatus || 'all');
  const [feeStatus, setFeeStatus] = useState<string>(savedSettings.feeStatus || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Helper to convert empty string to 'all' for Select components
  const schoolIdForSelect = schoolId || 'all';
  const classIdForSelect = classId || 'all';
  const courseIdForSelect = courseId || 'all';
  const templateIdForSelect = templateId || 'all';

  // Export options
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>(savedSettings.exportFormat || 'zip');
  const [exportSides, setExportSides] = useState<'front' | 'back' | 'both'>(savedSettings.exportSides || 'both');
  const [cardsPerPage, setCardsPerPage] = useState<number>(savedSettings.cardsPerPage || 6);
  const [quality, setQuality] = useState<'standard' | 'high'>(savedSettings.quality || 'high');
  const [includeUnprinted, setIncludeUnprinted] = useState<boolean>(savedSettings.includeUnprinted !== undefined ? savedSettings.includeUnprinted : true);
  const [includeUnpaid, setIncludeUnpaid] = useState<boolean>(savedSettings.includeUnpaid !== undefined ? savedSettings.includeUnpaid : true);

  // Student selection
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: academicYears = [] } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: schools = [] } = useSchools(organizationId);
  const { data: classes = [] } = useClasses(organizationId);
  const { data: classAcademicYears = [] } = useClassAcademicYears(academicYearId, organizationId);
  const { data: courses = [] } = useShortTermCourses(organizationId);
  const { data: templates = [] } = useIdCardTemplates(true);

  // Set default academic year (only if not already set from saved settings)
  useEffect(() => {
    if (currentAcademicYear && !academicYearId) {
      setAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, academicYearId]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings: ExportSettings = {
      studentType,
      academicYearId,
      schoolId,
      classId,
      classAcademicYearId,
      courseId,
      templateId,
      enrollmentStatus,
      printedStatus,
      feeStatus,
      exportFormat,
      exportSides,
      cardsPerPage,
      quality,
      includeUnprinted,
      includeUnpaid,
    };
    saveSettings(settings);
  }, [studentType, academicYearId, schoolId, classId, classAcademicYearId, courseId, templateId, enrollmentStatus, printedStatus, feeStatus, exportFormat, exportSides, cardsPerPage, quality, includeUnprinted, includeUnpaid]);

  // Filters for ID cards
  const cardFilters: StudentIdCardFilters = useMemo(() => ({
    academicYearId: academicYearId || undefined,
    schoolId: schoolId || undefined,
    classId: studentType === 'regular' ? (classId || undefined) : undefined,
    classAcademicYearId: studentType === 'regular' ? (classAcademicYearId || undefined) : undefined,
    courseId: studentType === 'course' ? (courseId || undefined) : undefined,
    enrollmentStatus: enrollmentStatus === 'all' ? undefined : enrollmentStatus,
    idCardTemplateId: templateId || undefined,
    isPrinted: printedStatus === 'all' ? undefined : printedStatus === 'printed',
    cardFeePaid: feeStatus === 'all' ? undefined : feeStatus === 'paid',
    search: searchQuery || undefined,
  }), [studentType, academicYearId, schoolId, classId, classAcademicYearId, courseId, enrollmentStatus, templateId, printedStatus, feeStatus, searchQuery]);

  const { data: idCards = [], isLoading: cardsLoading } = useStudentIdCards(cardFilters);
  const exportCards = useExportIdCards();

  // Statistics
  const statistics = useMemo(() => {
    const total = idCards.length;
    const printed = idCards.filter(c => c.isPrinted).length;
    const unprinted = total - printed;
    const feePaid = idCards.filter(c => c.cardFeePaid).length;
    const feeUnpaid = total - feePaid;
    const totalFeeCollected = idCards
      .filter(c => c.cardFeePaid)
      .reduce((sum, c) => sum + (Number(c.cardFee) || 0), 0);
    const totalFeePending = idCards
      .filter(c => !c.cardFeePaid)
      .reduce((sum, c) => sum + (Number(c.cardFee) || 0), 0);

    return {
      total,
      printed,
      unprinted,
      feePaid,
      feeUnpaid,
      totalFeeCollected,
      totalFeePending,
      printedPercentage: total > 0 ? Math.round((printed / total) * 100) : 0,
      unprintedPercentage: total > 0 ? Math.round((unprinted / total) * 100) : 0,
      feePaidPercentage: total > 0 ? Math.round((feePaid / total) * 100) : 0,
      feeUnpaidPercentage: total > 0 ? Math.round((feeUnpaid / total) * 100) : 0,
    };
  }, [idCards]);

  // Filter cards by search and export options
  const filteredCards = useMemo(() => {
    let filtered = idCards;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(card => {
        const studentName = card.student?.fullName?.toLowerCase() || card.courseStudent?.fullName?.toLowerCase() || '';
        const admissionNumber = card.student?.admissionNumber?.toLowerCase() || card.courseStudent?.admissionNo?.toLowerCase() || '';
        return (
          studentName.includes(query) ||
          admissionNumber.includes(query)
        );
      });
    }

    // Apply export options filters
    if (!includeUnprinted) {
      filtered = filtered.filter(c => c.isPrinted);
    }
    if (!includeUnpaid) {
      filtered = filtered.filter(c => c.cardFeePaid);
    }

    return filtered;
  }, [idCards, searchQuery, includeUnprinted, includeUnpaid]);

  // Handle card selection
  const toggleCardSelection = (cardId: string) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const selectAllCards = () => {
    if (selectedCardIds.size === filteredCards.length) {
      setSelectedCardIds(new Set());
    } else {
      setSelectedCardIds(new Set(filteredCards.map(c => c.id)));
    }
  };

  const selectByStatus = (status: 'printed' | 'unprinted' | 'paid' | 'unpaid') => {
    let cards: StudentIdCard[] = [];
    if (status === 'printed') {
      cards = filteredCards.filter(c => c.isPrinted);
    } else if (status === 'unprinted') {
      cards = filteredCards.filter(c => !c.isPrinted);
    } else if (status === 'paid') {
      cards = filteredCards.filter(c => c.cardFeePaid);
    } else if (status === 'unpaid') {
      cards = filteredCards.filter(c => !c.cardFeePaid);
    }
    setSelectedCardIds(new Set(cards.map(c => c.id)));
  };

  // Handle export
  const handleExportSelected = async () => {
    if (selectedCardIds.size === 0) return;

    const request: ExportIdCardRequest = {
      cardIds: Array.from(selectedCardIds),
      format: exportFormat,
      sides: exportSides,
      cardsPerPage: exportFormat === 'pdf' ? cardsPerPage : undefined,
      quality,
      includeUnprinted,
      includeUnpaid,
    };

    try {
      await exportCards.mutateAsync(request);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleExportAll = async () => {
    const request: ExportIdCardRequest = {
      filters: cardFilters,
      format: exportFormat,
      sides: exportSides,
      cardsPerPage: exportFormat === 'pdf' ? cardsPerPage : undefined,
      quality,
      includeUnprinted,
      includeUnpaid,
    };

    try {
      await exportCards.mutateAsync(request);
    } catch (error) {
      // Error handled by hook
    }
  };

  return (
    <div className="container mx-auto py-4 space-y-4 max-w-7xl px-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('events.export') || 'ID Card Export'}</CardTitle>
          <CardDescription>
            {t('idCards.export.description') || 'Export ID cards as ZIP or PDF files'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Student Type Selector */}
          <Tabs value={studentType} onValueChange={(value) => setStudentType(value as 'regular' | 'course')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regular">
                {t('idCards.assignment.regularStudents') || 'Regular Students'}
              </TabsTrigger>
              <TabsTrigger value="course">
                {t('idCards.assignment.courseStudents') || 'Course Students'}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{statistics.total}</div>
                <div className="text-sm text-muted-foreground">
                  {t('idCards.totalCards') || 'Total Cards'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{statistics.printed}</div>
                <div className="text-sm text-muted-foreground">
                  {t('idCards.printed') || 'Printed'} ({statistics.printedPercentage}%)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{statistics.feePaid}</div>
                <div className="text-sm text-muted-foreground">
                  {t('courses.feePaid') || 'Fee Paid'} ({statistics.feePaidPercentage}%)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {(Number(statistics.totalFeeCollected) || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('idCards.totalFeeCollected') || 'Fee Collected'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('events.filters') || 'Filters'}</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <Label>{t('idCards.printedStatus') || 'Printed Status'}</Label>
                  <Select value={printedStatus} onValueChange={setPrintedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                      <SelectItem value="printed">{t('idCards.printed') || 'Printed'}</SelectItem>
                      <SelectItem value="unprinted">{t('idCards.unprinted') || 'Unprinted'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('idCards.feeStatus') || 'Fee Status'}</Label>
                  <Select value={feeStatus} onValueChange={setFeeStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                      <SelectItem value="paid">{t('courses.feePaid') || 'Paid'}</SelectItem>
                      <SelectItem value="unpaid">{t('idCards.feeUnpaid') || 'Unpaid'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>{t('events.search') || 'Search'}</Label>
                  <Input
                    placeholder={t('events.search') || 'Search students...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content: Export Options + Student Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Export Options (Left) */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">{t('idCards.export.options') || 'Export Options'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('idCards.export.format') || 'Export Format'}</Label>
                  <Select value={exportFormat} onValueChange={(value: 'zip' | 'pdf') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zip">
                        <div className="flex items-center gap-2">
                          <FileArchive className="h-4 w-4" />
                          ZIP (PNG/PDF)
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Single PDF
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('idCards.export.sides') || 'Card Sides'}</Label>
                  <Select value={exportSides} onValueChange={(value: 'front' | 'back' | 'both') => setExportSides(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">{t('idCards.front') || 'Front Only'}</SelectItem>
                      <SelectItem value="back">{t('events.back') || 'Back Only'}</SelectItem>
                      <SelectItem value="both">{t('idCards.both') || 'Both Sides'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportFormat === 'pdf' && (
                  <div>
                    <Label>{t('idCards.export.cardsPerPage') || 'Cards Per Page (Each card gets its own page)'}</Label>
                    <Select
                      value={cardsPerPage.toString()}
                      onValueChange={(value) => setCardsPerPage(parseInt(value))}
                      disabled
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 (Each card on separate page)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Each ID card will be placed on its own page without A4 background
                    </p>
                  </div>
                )}

                <div>
                  <Label>{t('idCards.export.quality') || 'Quality'}</Label>
                  <Select value={quality} onValueChange={(value: 'standard' | 'high') => setQuality(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (96 DPI)</SelectItem>
                      <SelectItem value="high">High (300 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-unprinted" className="cursor-pointer">
                      {t('idCards.export.includeUnprinted') || 'Include Unprinted Cards'}
                    </Label>
                    <Switch
                      id="include-unprinted"
                      checked={includeUnprinted}
                      onCheckedChange={setIncludeUnprinted}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-unpaid" className="cursor-pointer">
                      {t('idCards.export.includeUnpaid') || 'Include Unpaid Cards'}
                    </Label>
                    <Switch
                      id="include-unpaid"
                      checked={includeUnpaid}
                      onCheckedChange={setIncludeUnpaid}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Selection (Center) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t('idCards.export.studentSelection') || 'Student Selection'} ({filteredCards.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllCards}>
                      {selectedCardIds.size === filteredCards.length ? (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectByStatus('printed')}
                    >
                      {t('idCards.selectPrinted') || 'Select Printed'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectByStatus('unprinted')}
                    >
                      {t('idCards.selectUnprinted') || 'Select Unprinted'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedCardIds.size === filteredCards.length && filteredCards.length > 0}
                            onCheckedChange={selectAllCards}
                          />
                        </TableHead>
                        <TableHead>{t('students.student') || 'Student'}</TableHead>
                        <TableHead>{t('examReports.admissionNo') || 'Admission No'}</TableHead>
                        <TableHead>{studentType === 'regular' ? (t('search.class') || 'Class') : (t('courses.course') || 'Course')}</TableHead>
                        <TableHead>{t('idCards.template') || 'Template'}</TableHead>
                        <TableHead>{t('idCards.feeStatus') || 'Fee Status'}</TableHead>
                        <TableHead>{t('idCards.printedStatus') || 'Printed Status'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {t('idCards.noCards') || 'No ID cards found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCards.map(card => {
                          const isSelected = selectedCardIds.has(card.id);
                          return (
                            <TableRow
                              key={card.id}
                              className={cn(
                                "cursor-pointer",
                                isSelected && "bg-primary/5"
                              )}
                              onClick={() => toggleCardSelection(card.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleCardSelection(card.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {card.student?.fullName || card.courseStudent?.fullName || '-'}
                              </TableCell>
                              <TableCell>{card.student?.admissionNumber || card.courseStudent?.admissionNo || '-'}</TableCell>
                              <TableCell>
                                {studentType === 'regular' 
                                  ? (card.class?.name || '-')
                                  : (card.courseStudent?.course?.name || '-')
                                }
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
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
                {selectedCardIds.size > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t('idCards.selectedCards', { count: selectedCardIds.size }) ||
                      `${selectedCardIds.size} card(s) selected`}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Export Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportAll}
                  disabled={filteredCards.length === 0 || exportCards.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('idCards.export.exportAll') || 'Export All Filtered'}
                </Button>
                <Button
                  onClick={handleExportSelected}
                  disabled={selectedCardIds.size === 0 || exportCards.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportCards.isPending
                    ? t('events.processing') || 'Processing...'
                    : t('idCards.export.exportSelected') || `Export Selected (${selectedCardIds.size})`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}


