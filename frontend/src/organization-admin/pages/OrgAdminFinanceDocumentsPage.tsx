/**
 * Org Admin Finance Documents – same layout as school FinanceDocuments, org-scoped.
 */

import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { OrgFinanceDocumentsDialog } from '@/organization-admin/components/OrgFinanceDocumentsDialog';
import {
  useOrgFinanceDocuments,
  useDeleteOrgFinanceDocument,
  useDownloadOrgFinanceDocument,
  type OrgFinanceDocument,
} from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

const DOCUMENT_TYPES = [
  { value: 'invoice', labelKey: 'finance.documentTypes.invoice' },
  { value: 'receipt', labelKey: 'finance.documentTypes.receipt' },
  { value: 'budget', labelKey: 'finance.documentTypes.budget' },
  { value: 'report', labelKey: 'finance.documentTypes.report' },
  { value: 'tax_document', labelKey: 'finance.documentTypes.taxDocument' },
  { value: 'voucher', labelKey: 'finance.documentTypes.voucher' },
  { value: 'bank_statement', labelKey: 'finance.documentTypes.bankStatement' },
  { value: 'other', labelKey: 'finance.documentTypes.other' },
];

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return <File className="h-4 w-4" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatAmount = (amount: string | null): string => {
  if (!amount) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount));
};

function getDocumentTypeBadgeColor(type: string): string {
  switch (type) {
    case 'invoice':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'receipt':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'budget':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'report':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    case 'tax_document':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'voucher':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'bank_statement':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

export default function OrgAdminFinanceDocumentsPage() {
  const { t, tUnsafe } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [documentType, setDocumentType] = useState<string>(searchParams.get('document_type') || 'all');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [startDate, setStartDate] = useState<string>(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('end_date') || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<OrgFinanceDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: documents = [], isLoading: documentsLoading } = useOrgFinanceDocuments({
    documentType: documentType !== 'all' ? documentType : undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const deleteDocument = useDeleteOrgFinanceDocument();
  const downloadDocument = useDownloadOrgFinanceDocument();

  const stats = useMemo(() => {
    const totalAmount = documents.reduce((sum, doc) => sum + (doc.amount ? parseFloat(doc.amount) : 0), 0);
    return {
      totalDocuments: documents.length,
      totalAmount,
      byType: documents.reduce((acc, doc) => {
        acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [documents]);

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find((dt) => dt.value === type);
    return docType ? t(docType.labelKey) : type;
  };

  const handleFilterChange = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    await deleteDocument.mutateAsync(documentToDelete);
    setIsDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={tUnsafe('organizationAdmin.financeDocuments') ?? 'Finance Documents'}
        description={tUnsafe('organizationAdmin.financeDocumentsDesc') ?? 'Organization-level finance documents'}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.uploadDocument'),
          onClick: () => setIsDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.totalDocuments')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.totalAmount')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(stats.totalAmount.toString())}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('finance.documentTypes')}</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(stats.byType).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{getDocumentTypeLabel(type)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterPanel title={t('events.filters') ?? 'Filters'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t('finance.documentType')}</Label>
            <Select
              value={documentType}
              onValueChange={(v) => {
                setDocumentType(v);
                handleFilterChange('document_type', v);
              }}
            >
              <SelectTrigger><SelectValue placeholder={t('subjects.all')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all')}</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{t(type.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('events.startDate')}</Label>
            <CalendarDatePicker
              date={startDate ? new Date(startDate) : undefined}
              onDateChange={(d) => {
                const s = d ? d.toISOString().slice(0, 10) : '';
                setStartDate(s);
                handleFilterChange('start_date', s);
              }}
              placeholder={t('events.startDate') ?? 'Start date'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('events.endDate')}</Label>
            <CalendarDatePicker
              date={endDate ? new Date(endDate) : undefined}
              onDateChange={(d) => {
                const s = d ? d.toISOString().slice(0, 10) : '';
                setEndDate(s);
                handleFilterChange('end_date', s);
              }}
              placeholder={t('events.endDate') ?? 'End date'}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('events.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('assets.searchPlaceholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  handleFilterChange('search', e.target.value);
                }}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{t('students.documents')}</CardTitle>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <LoadingSpinner />
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('finance.noDocuments')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('finance.documentType')}</TableHead>
                    <TableHead>{t('courses.documentTitle')}</TableHead>
                    <TableHead>{t('finance.referenceNumber')}</TableHead>
                    <TableHead>{t('finance.amount')}</TableHead>
                    <TableHead>{t('finance.documentDate')}</TableHead>
                    <TableHead>{t('finance.fileName')}</TableHead>
                    <TableHead>{t('finance.fileSize')}</TableHead>
                    <TableHead>{t('finance.uploadedAt')}</TableHead>
                    <TableHead className="text-right">{t('events.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setPreviewDocument(doc);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <TableCell>
                        <Badge className={getDocumentTypeBadgeColor(doc.document_type)}>
                          {getDocumentTypeLabel(doc.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{doc.reference_number ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {doc.amount ? (
                          <span className="font-medium">{formatAmount(doc.amount)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.document_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(new Date(doc.document_date))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.mime_type)}
                          <span className="text-sm">{doc.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFileSize(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(new Date(doc.created_at))}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadDocument.mutate(doc.id)}
                            title={t('events.download')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDocumentToDelete(doc.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            title={t('events.delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <OrgFinanceDocumentsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{previewDocument?.title}</DialogTitle>
            {previewDocument && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge className={getDocumentTypeBadgeColor(previewDocument.document_type)}>
                  {getDocumentTypeLabel(previewDocument.document_type)}
                </Badge>
                {previewDocument.reference_number && (
                  <span>{previewDocument.reference_number}</span>
                )}
              </div>
            )}
          </DialogHeader>
          {previewDocument && (
            <div className="space-y-2 text-sm">
              {previewDocument.amount && (
                <p><span className="text-muted-foreground">{t('finance.amount')}:</span> {formatAmount(previewDocument.amount)}</p>
              )}
              {previewDocument.document_date && (
                <p><span className="text-muted-foreground">{t('finance.documentDate')}:</span> {formatDate(new Date(previewDocument.document_date))}</p>
              )}
              <p><span className="text-muted-foreground">{t('finance.fileName')}:</span> {previewDocument.file_name}</p>
              <Button
                className="w-full mt-4"
                onClick={() => downloadDocument.mutate(previewDocument.id)}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('events.download')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteDocumentConfirmation')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
