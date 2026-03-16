/**
 * Org Admin Facility Detail – Overview, Staff, Maintenance, Finance tabs
 */

import {
  ArrowLeft,
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
} from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
  }

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
            <Label htmlFor="doc-date">{t('common.date') ?? 'Date'}</Label>
            <Input
              id="doc-date"
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
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

export default function OrgAdminFacilityDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const facilityId = id ?? '';
  const [docDialogOpen, setDocDialogOpen] = useState(false);

  const { data: facility, isLoading: facilityLoading } = useOrgFacility(facilityId);
  const { data: staff = [] } = useOrgFacilityStaff(facilityId);
  const { data: maintenance = [] } = useOrgFacilityMaintenance(facilityId);
  const { data: documents = [], isLoading: docsLoading } = useOrgFacilityDocuments(facilityId);
  const createDocument = useCreateOrgFacilityDocument(facilityId);
  const deleteDocument = useDeleteOrgFacilityDocument(facilityId);
  const downloadDocument = useDownloadOrgFacilityDocument();
  const { data: expenseEntries = [] } = useOrgFinanceExpenseEntries({
    facilityId: facilityId || undefined,
    perPage: 100,
  });
  const { data: incomeEntries = [] } = useOrgFinanceIncomeEntries({
    facilityId: facilityId || undefined,
    perPage: 100,
  });

  const totals = useMemo(() => {
    const income = incomeEntries.reduce((s, e) => s + e.amount, 0);
    const expense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [incomeEntries, expenseEntries]);

  if (facilityLoading || !facility) {
    return (
      <div className="container mx-auto flex min-h-[40vh] max-w-7xl items-center justify-center overflow-x-hidden p-4 md:p-6">
        {facilityLoading ? <LoadingSpinner /> : <p>{t('common.notFound') ?? 'Not found'}</p>}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/org-admin/facilities">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader
            title={facility.name}
            description={facility.facilityType?.name ?? facility.address ?? undefined}
            icon={<Building2 className="h-5 w-5" />}
          />
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/org-admin/facilities/${facilityId}/edit`}>
            {t('common.edit') ?? 'Edit'}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.overview') ?? 'Overview'}</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.facilityStaff') ?? 'Staff'}</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.maintenance') ?? 'Maintenance'}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.documents') ?? 'Documents'}</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('organizationAdmin.facilityFinance') ?? 'Finance'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  {t('organizationAdmin.facilityType') ?? 'Type'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{facility.facilityType?.name ?? '—'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  {t('organizationAdmin.linkedAccount') ?? 'Linked account'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{facility.financeAccount?.name ?? (t('organizationAdmin.noAccountLinked') ?? 'None')}</p>
                {facility.financeAccount?.currentBalance != null && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('organizationAdmin.balance') ?? 'Balance'}: {formatCurrency(facility.financeAccount.currentBalance)}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  {t('organizationAdmin.quickStats') ?? 'Quick stats'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base">{t('finance.income') ?? 'Income'}: {formatCurrency(totals.income)}</p>
                <p className="text-base">{t('finance.expenses') ?? 'Expenses'}: {formatCurrency(totals.expense)}</p>
                <p className="mt-1 text-base font-semibold">{t('organizationAdmin.net') ?? 'Net'}: {formatCurrency(totals.net)}</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facility.areaSqm != null && facility.areaSqm > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {t('organizationAdmin.areaSqm') ?? 'Area'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-semibold">{Number(facility.areaSqm).toLocaleString()} m²</p>
                </CardContent>
              </Card>
            )}
            {(facility.city || facility.district || facility.landmark) && (
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {t('organizationAdmin.location') ?? 'Location'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {facility.city && <p className="text-base"><span className="font-medium">{t('organizationAdmin.city') ?? 'City'}:</span> {facility.city}</p>}
                  {facility.district && <p className="text-base"><span className="font-medium">{t('organizationAdmin.district') ?? 'District'}:</span> {facility.district}</p>}
                  {facility.landmark && <p className="text-base"><span className="font-medium">{t('organizationAdmin.landmark') ?? 'Landmark'}:</span> {facility.landmark}</p>}
                </CardContent>
              </Card>
            )}
            {(facility.latitude != null || facility.longitude != null) && (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium text-muted-foreground">
                    {t('organizationAdmin.coordinates') ?? 'Coordinates'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-mono text-base">
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
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">
                  {t('common.address') ?? 'Address'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{facility.address}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('organizationAdmin.facilityStaff') ?? 'Staff'}</CardTitle>
              <Button size="sm" asChild>
                <Link to={`/org-admin/facilities/${facilityId}/edit?tab=staff`}>
                  {t('organizationAdmin.addStaff') ?? 'Add staff'}
                </Link>
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
              <Button size="sm" asChild>
                <Link to={`/org-admin/facilities/${facilityId}/edit?tab=maintenance`}>
                  {t('organizationAdmin.addMaintenance') ?? 'Add record'}
                </Link>
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
    </div>
  );
}
