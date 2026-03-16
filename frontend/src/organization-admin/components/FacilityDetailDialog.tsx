/**
 * Facility detail (Overview, Staff, Maintenance, Documents, Finance) in a dialog.
 */

import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Users,
  Wrench,
  LayoutDashboard,
  Upload,
  Download,
  Trash2,
  Pencil,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFacility,
  useOrgFacilityStaff,
  useOrgFacilityMaintenance,
  useOrgFacilityDocuments,
  useCreateOrgFacilityDocument,
  useDeleteOrgFacilityDocument,
  useDownloadOrgFacilityDocument,
} from '@/hooks/useOrgFacilities';
import {
  useOrgFinanceExpenseEntries,
  useOrgFinanceIncomeEntries,
} from '@/hooks/useOrgFinance';
import { FacilityMaintenanceDialog } from '@/organization-admin/components/FacilityMaintenanceDialog';
import { FacilityStaffDialog } from '@/organization-admin/components/FacilityStaffDialog';
import { formatDate, formatCurrency } from '@/lib/utils';

const FACILITY_DOC_TYPES = [
  { value: 'deed', label: 'Deed / Title' },
  { value: 'permit', label: 'Permit' },
  { value: 'photo', label: 'Photo' },
  { value: 'plan', label: 'Plan / Map' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

function FacilityDocumentUploadDialog({
  open,
  onOpenChange,
  facilityId,
  onSubmit,
  isSubmitting,
  docTypes,
  t,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
  docTypes: { value: string; label: string }[];
  t: (key: string) => string;
}) {
  const [documentType, setDocumentType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('title', title.trim() || file.name);
    if (description.trim()) formData.append('description', description.trim());
    if (documentDate) formData.append('document_date', documentDate);
    formData.append('file', file);
    onSubmit(formData);
    setDocumentType('other');
    setTitle('');
    setDescription('');
    setDocumentDate('');
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('organizationAdmin.uploadDocument') ?? 'Upload document'}</DialogTitle>
          <DialogDescription>{t('organizationAdmin.uploadDocumentDescription') ?? 'Add a document for this facility.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('organizationAdmin.documentType') ?? 'Type'}</Label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            >
              {docTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-title">{t('common.title') ?? 'Title'} *</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('organizationAdmin.documentTitlePlaceholder') ?? 'Document title'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-desc">{t('common.description') ?? 'Description'}</Label>
            <Textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-date">{t('common.date')}</Label>
            <CalendarDatePicker
              date={documentDate ? parseLocalDate(documentDate) : undefined}
              onDateChange={(date) => setDocumentDate(date ? dateToLocalYYYYMMDD(date) : '')}
              placeholder={t('common.date')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-file">{t('organizationAdmin.file') ?? 'File'} *</Label>
            <Input
              id="doc-file"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel') ?? 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting || !file}>
              {isSubmitting ? <LoadingSpinner size="sm" /> : (t('organizationAdmin.upload') ?? 'Upload')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type FacilityDetailTab = 'overview' | 'staff' | 'maintenance' | 'documents' | 'finance';

export interface FacilityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string | null;
  initialTab?: FacilityDetailTab | null;
  onEdit?: (id: string) => void;
}

export function FacilityDetailDialog({
  open,
  onOpenChange,
  facilityId,
  initialTab = 'overview',
  onEdit,
}: FacilityDetailDialogProps) {
  const { t } = useLanguage();
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);

  const { data: facility, isLoading: facilityLoading } = useOrgFacility(facilityId ?? undefined);
  const { data: staff = [] } = useOrgFacilityStaff(facilityId ?? undefined);
  const { data: maintenance = [] } = useOrgFacilityMaintenance(facilityId ?? undefined);
  const { data: documents = [], isLoading: docsLoading } = useOrgFacilityDocuments(facilityId ?? undefined);
  const createDocument = useCreateOrgFacilityDocument(facilityId ?? '');
  const deleteDocument = useDeleteOrgFacilityDocument(facilityId ?? '');
  const downloadDocument = useDownloadOrgFacilityDocument();
  const { data: expenseEntries = [] } = useOrgFinanceExpenseEntries({
    facilityId: facilityId ?? undefined,
    perPage: 100,
  });
  const { data: incomeEntries = [] } = useOrgFinanceIncomeEntries({
    facilityId: facilityId ?? undefined,
    perPage: 100,
  });

  const totals = useMemo(() => {
    const income = incomeEntries.reduce((s, e) => s + e.amount, 0);
    const expense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [incomeEntries, expenseEntries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0 gap-0">
        {!facilityId ? null : facilityLoading ? (
          <div className="flex min-h-[200px] items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : !facility ? (
          <div className="px-6 py-12 text-center">
            <p className="text-muted-foreground">{t('common.notFound')}</p>
          </div>
        ) : (
          <>
            {/* Hero strip */}
            <div className="border-b border-muted/50 bg-muted/20 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="flex items-center gap-2 text-xl font-semibold m-0">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    {facility.name}
                  </DialogTitle>
                  {facility.facilityType?.name && (
                    <Badge variant="secondary" className="font-normal">
                      {facility.facilityType.name}
                    </Badge>
                  )}
                  <Badge variant={facility.isActive ? 'default' : 'secondary'}>
                    {facility.isActive ? t('common.active') : t('common.inactive')}
                  </Badge>
                </div>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(facilityId!)} className="shrink-0">
                    <Pencil className="h-4 w-4" />
                    <span className="ml-2">{t('common.edit')}</span>
                  </Button>
                )}
              </div>
              {(facility.address || facility.city) && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {[facility.address, facility.city, facility.district].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div className="px-6 py-4">
              <Tabs
                key={`${facilityId}-${initialTab ?? 'overview'}`}
                defaultValue={initialTab ?? 'overview'}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-10 gap-1 p-1 bg-muted/50">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('organizationAdmin.overview')}</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('organizationAdmin.facilityStaff')}</span>
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                <span className="hidden sm:inline">{t('organizationAdmin.maintenance')}</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t('organizationAdmin.documents')}</span>
              </TabsTrigger>
              <TabsTrigger value="finance" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">{t('organizationAdmin.facilityFinance')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Summary section */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('organizationAdmin.quickStats') ?? 'Summary'}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Card className="border-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('organizationAdmin.facilityType') ?? 'Type'}
                      </p>
                      <p className="mt-1 text-lg font-semibold">{facility.facilityType?.name ?? '—'}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('organizationAdmin.linkedAccount') ?? 'Linked account'}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {facility.financeAccount?.name ?? (t('organizationAdmin.noAccountLinked') ?? 'None')}
                      </p>
                      {facility.financeAccount?.currentBalance != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('organizationAdmin.balance') ?? 'Balance'}: {formatCurrency(facility.financeAccount.currentBalance)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="border-muted/50 sm:col-span-2 lg:col-span-1">
                    <CardContent className="pt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t('organizationAdmin.quickStats') ?? 'Finance summary'}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>{t('finance.income') ?? 'Income'}: {formatCurrency(totals.income)}</p>
                        <p>{t('finance.expenses') ?? 'Expenses'}: {formatCurrency(totals.expense)}</p>
                        <p className="font-semibold">{t('organizationAdmin.net') ?? 'Net'}: {formatCurrency(totals.net)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              {/* Location section */}
              {(facility.areaSqm != null && facility.areaSqm > 0) ||
              facility.city ||
              facility.district ||
              facility.landmark ||
              facility.latitude != null ||
              facility.longitude != null ||
              facility.address ? (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('organizationAdmin.location') ?? 'Location'}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {facility.areaSqm != null && facility.areaSqm > 0 && (
                      <Card className="border-muted/50">
                        <CardContent className="pt-4">
                          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {t('organizationAdmin.areaSqm') ?? 'Area'}
                          </p>
                          <p className="mt-1 text-lg font-semibold">{Number(facility.areaSqm).toLocaleString()} m²</p>
                        </CardContent>
                      </Card>
                    )}
                    {(facility.city || facility.district || facility.landmark) && (
                      <Card className="border-muted/50 sm:col-span-2">
                        <CardContent className="pt-4">
                          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {t('organizationAdmin.location') ?? 'Location'}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            {facility.city && <p><span className="font-medium">{t('organizationAdmin.city') ?? 'City'}:</span> {facility.city}</p>}
                            {facility.district && <p><span className="font-medium">{t('organizationAdmin.district') ?? 'District'}:</span> {facility.district}</p>}
                            {facility.landmark && <p><span className="font-medium">{t('organizationAdmin.landmark') ?? 'Landmark'}:</span> {facility.landmark}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {(facility.latitude != null || facility.longitude != null) && (
                      <Card className="border-muted/50 sm:col-span-2 lg:col-span-3">
                        <CardContent className="pt-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t('organizationAdmin.coordinates') ?? 'Coordinates'}
                          </p>
                          <p className="mt-1 font-mono text-sm">
                            {facility.latitude != null && facility.longitude != null
                              ? `${Number(facility.latitude).toFixed(5)}, ${Number(facility.longitude).toFixed(5)}`
                              : facility.latitude != null
                                ? `Lat: ${Number(facility.latitude).toFixed(5)}`
                                : facility.longitude != null
                                  ? `Lon: ${Number(facility.longitude).toFixed(5)}`
                                  : '—'}
                          </p>
                          {facility.latitude != null && facility.longitude != null && (
                            <a
                              href={`https://www.google.com/maps?q=${facility.latitude},${facility.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-sm text-primary hover:underline"
                            >
                              {t('organizationAdmin.viewOnMap') ?? 'View on map'}
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {facility.address && (
                    <Card className="mt-3 border-muted/50">
                      <CardContent className="pt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t('common.address') ?? 'Address'}
                        </p>
                        <p className="mt-1 text-sm whitespace-pre-wrap">{facility.address}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="staff" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('organizationAdmin.facilityStaff') ?? 'Staff'}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setStaffDialogOpen(true)}>
                    {t('organizationAdmin.addStaff') ?? 'Add staff'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {staff.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      {t('organizationAdmin.noStaff') ?? 'No staff assigned.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('organizationAdmin.role') ?? 'Role'}</TableHead>
                            <TableHead>{t('common.name') ?? 'Name'}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('common.phone') ?? 'Phone'}</TableHead>
                            <TableHead className="hidden lg:table-cell">{t('organizationAdmin.startDate') ?? 'Start'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staff.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell>{s.role}</TableCell>
                              <TableCell>
                                {s.staff
                                  ? ((`${s.staff.firstName ?? ''} ${s.staff.fatherName ?? ''}`.trim() || s.displayName) ?? '—')
                                  : s.displayName ?? '—'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">{s.phone ?? '—'}</TableCell>
                              <TableCell className="hidden lg:table-cell">
                                {s.startDate ? formatDate(s.startDate) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('organizationAdmin.maintenanceLog') ?? 'Maintenance log'}</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => setMaintenanceDialogOpen(true)}>
                    {t('organizationAdmin.addMaintenance') ?? 'Add record'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {maintenance.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      {t('organizationAdmin.noMaintenanceRecords') ?? 'No maintenance records.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('common.date') ?? 'Date'}</TableHead>
                            <TableHead>{t('common.description') ?? 'Description'}</TableHead>
                            <TableHead>{t('common.status') ?? 'Status'}</TableHead>
                            <TableHead className="text-right">{t('organizationAdmin.cost') ?? 'Cost'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maintenance.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell>{formatDate(m.maintainedAt)}</TableCell>
                              <TableCell>{m.description ?? '—'}</TableCell>
                              <TableCell>{m.status}</TableCell>
                              <TableCell className="text-right">
                                {m.costAmount != null ? formatCurrency(m.costAmount) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>{t('organizationAdmin.facilityDocuments') ?? 'Facility documents'}</CardTitle>
                  <Button size="sm" onClick={() => setDocDialogOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('organizationAdmin.uploadDocument') ?? 'Upload'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">
                      {t('organizationAdmin.noDocuments') ?? 'No documents yet.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('organizationAdmin.documentType') ?? 'Type'}</TableHead>
                            <TableHead>{t('common.title') ?? 'Title'}</TableHead>
                            <TableHead className="hidden md:table-cell">{t('common.date') ?? 'Date'}</TableHead>
                            <TableHead className="text-right">{t('common.actions') ?? 'Actions'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell className="capitalize">{doc.documentType}</TableCell>
                              <TableCell>{doc.title}</TableCell>
                              <TableCell className="hidden md:table-cell">
                                {doc.documentDate ? formatDate(doc.documentDate) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => downloadDocument.mutate({ facilityId, id: doc.id })}
                                  disabled={downloadDocument.isPending}
                                  title={t('events.download') ?? 'Download'}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm(t('common.confirmDelete') ?? 'Delete this document?')) {
                                      deleteDocument.mutate(doc.id);
                                    }
                                  }}
                                  disabled={deleteDocument.isPending}
                                  title={t('common.delete') ?? 'Delete'}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <FacilityDocumentUploadDialog
                open={docDialogOpen}
                onOpenChange={setDocDialogOpen}
                facilityId={facilityId}
                onSubmit={(formData) => {
                  createDocument.mutate(formData);
                  setDocDialogOpen(false);
                }}
                isSubmitting={createDocument.isPending}
                docTypes={FACILITY_DOC_TYPES}
                t={t}
              />
            </TabsContent>

            <TabsContent value="finance" className="mt-6">
              <div className="mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link
                    to={`/org-admin/finance/expenses?facility_id=${facilityId}${facility.financeAccountId ? `&account_id=${facility.financeAccountId}` : ''}`}
                  >
                    {t('organizationAdmin.addExpense') ?? 'Add expense'}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    to={`/org-admin/finance/income?facility_id=${facilityId}${facility.financeAccountId ? `&account_id=${facility.financeAccountId}` : ''}`}
                  >
                    {t('organizationAdmin.addIncome') ?? 'Add income'}
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('organizationAdmin.recentExpenses') ?? 'Recent expenses'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenseEntries.length === 0 ? (
                      <p className="py-4 text-muted-foreground">
                        {t('organizationAdmin.noExpensesForFacility') ?? 'No expenses linked to this facility.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('common.date') ?? 'Date'}</TableHead>
                              <TableHead>{t('common.description') ?? 'Description'}</TableHead>
                              <TableHead>{t('finance.category') ?? 'Category'}</TableHead>
                              <TableHead className="text-right">{t('common.amount') ?? 'Amount'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {expenseEntries.slice(0, 20).map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>{formatDate(e.date)}</TableCell>
                                <TableCell>{e.description ?? e.referenceNo ?? '—'}</TableCell>
                                <TableCell>{e.expenseCategory?.name ?? '—'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('organizationAdmin.recentIncome') ?? 'Recent income'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {incomeEntries.length === 0 ? (
                      <p className="py-4 text-muted-foreground">
                        {t('organizationAdmin.noIncomeForFacility') ?? 'No income linked to this facility.'}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('common.date') ?? 'Date'}</TableHead>
                              <TableHead>{t('common.description') ?? 'Description'}</TableHead>
                              <TableHead>{t('finance.category') ?? 'Category'}</TableHead>
                              <TableHead className="text-right">{t('common.amount') ?? 'Amount'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {incomeEntries.slice(0, 20).map((e) => (
                              <TableRow key={e.id}>
                                <TableCell>{formatDate(e.date)}</TableCell>
                                <TableCell>{e.description ?? e.referenceNo ?? '—'}</TableCell>
                                <TableCell>{e.incomeCategory?.name ?? '—'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {facilityId && (
            <>
              <FacilityStaffDialog
                open={staffDialogOpen}
                onOpenChange={setStaffDialogOpen}
                facilityId={facilityId}
              />
              <FacilityMaintenanceDialog
                open={maintenanceDialogOpen}
                onOpenChange={setMaintenanceDialogOpen}
                facilityId={facilityId}
              />
            </>
          )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
