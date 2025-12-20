import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import { useIdCardTemplates } from '@/hooks/useIdCardTemplates';
import {
  useStudentIdCards,
  useExportIdCards,
  type StudentIdCard,
  type StudentIdCardFilters,
  type ExportIdCardRequest,
} from '@/hooks/useStudentIdCards';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';

export default function IdCardExport() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  // Filter states
  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [classAcademicYearId, setClassAcademicYearId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>('active');
  const [printedStatus, setPrintedStatus] = useState<string>('all');
  const [feeStatus, setFeeStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Export options
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');
  const [exportSides, setExportSides] = useState<'front' | 'back' | 'both'>('both');
  const [cardsPerPage, setCardsPerPage] = useState<number>(6);
  const [quality, setQuality] = useState<'standard' | 'high'>('high');
  const [includeUnprinted, setIncludeUnprinted] = useState<boolean>(true);
  const [includeUnpaid, setIncludeUnpaid] = useState<boolean>(true);

  // Student selection
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Data hooks
  const { data: academicYears = [] } = useAcademicYears(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear();
  const { data: classes = [] } = useClasses(organizationId);
  const { data: classAcademicYears = [] } = useClassAcademicYears(academicYearId, organizationId);
  const { data: templates = [] } = useIdCardTemplates(true);

  // Set default academic year
  useEffect(() => {
    if (currentAcademicYear && !academicYearId) {
      setAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear?.id, academicYearId]);

  // Filters for ID cards
  const cardFilters: StudentIdCardFilters = useMemo(() => ({
    academicYearId: academicYearId || undefined,
    classId: classId || undefined,
    classAcademicYearId: classAcademicYearId || undefined,
    enrollmentStatus: enrollmentStatus === 'all' ? undefined : enrollmentStatus,
    idCardTemplateId: templateId || undefined,
    isPrinted: printedStatus === 'all' ? undefined : printedStatus === 'printed',
    cardFeePaid: feeStatus === 'all' ? undefined : feeStatus === 'paid',
    search: searchQuery || undefined,
  }), [academicYearId, classId, classAcademicYearId, enrollmentStatus, templateId, printedStatus, feeStatus, searchQuery]);

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
      .reduce((sum, c) => sum + c.cardFee, 0);
    const totalFeePending = idCards
      .filter(c => !c.cardFeePaid)
      .reduce((sum, c) => sum + c.cardFee, 0);

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
        return (
          card.student?.fullName?.toLowerCase().includes(query) ||
          card.student?.admissionNumber?.toLowerCase().includes(query)
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
          <CardTitle>{t('idCards.export.title') || 'ID Card Export'}</CardTitle>
          <CardDescription>
            {t('idCards.export.description') || 'Export ID cards as ZIP or PDF files'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  {t('idCards.feePaid') || 'Fee Paid'} ({statistics.feePaidPercentage}%)
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">
                  {statistics.totalFeeCollected.toFixed(2)}
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
              <CardTitle className="text-lg">{t('common.filters') || 'Filters'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>{t('academic.academicYears.academicYear') || 'Academic Year'}</Label>
                  <Select value={academicYearId} onValueChange={setAcademicYearId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.select') || 'Select'} />
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
                  <Label>{t('classes.class') || 'Class'}</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all') || 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.all') || 'All'}</SelectItem>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('idCards.template') || 'Template'}</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all') || 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('common.all') || 'All'}</SelectItem>
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
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      <SelectItem value="active">{t('students.active') || 'Active'}</SelectItem>
                      <SelectItem value="inactive">{t('students.inactive') || 'Inactive'}</SelectItem>
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
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
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
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      <SelectItem value="paid">{t('idCards.feePaid') || 'Paid'}</SelectItem>
                      <SelectItem value="unpaid">{t('idCards.feeUnpaid') || 'Unpaid'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>{t('common.search') || 'Search'}</Label>
                  <Input
                    placeholder={t('common.search') || 'Search students...'}
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
                      <SelectItem value="back">{t('idCards.back') || 'Back Only'}</SelectItem>
                      <SelectItem value="both">{t('idCards.both') || 'Both Sides'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {exportFormat === 'pdf' && (
                  <div>
                    <Label>{t('idCards.export.cardsPerPage') || 'Cards Per Page'}</Label>
                    <Select
                      value={cardsPerPage.toString()}
                      onValueChange={(value) => setCardsPerPage(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="9">9</SelectItem>
                      </SelectContent>
                    </Select>
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
                          {t('common.deselectAll') || 'Deselect All'}
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4 mr-1" />
                          {t('common.selectAll') || 'Select All'}
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
                        <TableHead>{t('students.admissionNo') || 'Admission No'}</TableHead>
                        <TableHead>{t('classes.class') || 'Class'}</TableHead>
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
                                {card.student?.fullName || '-'}
                              </TableCell>
                              <TableCell>{card.student?.admissionNumber || '-'}</TableCell>
                              <TableCell>{card.class?.name || '-'}</TableCell>
                              <TableCell>{card.template?.name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={card.cardFeePaid ? 'default' : 'outline'}>
                                  {card.cardFeePaid
                                    ? t('idCards.feePaid') || 'Paid'
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
                    ? t('common.processing') || 'Processing...'
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

