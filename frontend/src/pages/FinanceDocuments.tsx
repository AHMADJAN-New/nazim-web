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
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { FinanceDocumentPreviewDialog } from '@/components/finance/FinanceDocumentPreviewDialog';
import { FinanceDocumentsDialog } from '@/components/finance/FinanceDocumentsDialog';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useFinanceDocuments,
  useDeleteFinanceDocument,
  useDownloadFinanceDocument,
  FinanceDocument,
} from '@/hooks/useFinanceDocuments';
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
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

export default function FinanceDocuments() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filters
  const [documentType, setDocumentType] = useState<string>(searchParams.get('document_type') || 'all');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [startDate, setStartDate] = useState<string>(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('end_date') || '');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<FinanceDocument | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Data fetching
  const { data: documents = [], isLoading: documentsLoading } = useFinanceDocuments({
    documentType: documentType && documentType !== 'all' ? documentType : undefined,
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const deleteDocument = useDeleteFinanceDocument();
  const downloadDocument = useDownloadFinanceDocument();

  // Filter documents by search term (already done server-side, but keep for consistency)
  const filteredDocuments = useMemo(() => {
    return documents;
  }, [documents]);

  // Check for view query param and auto-open preview dialog
  useEffect(() => {
    const viewDocId = searchParams.get('view');
    if (viewDocId && documents.length > 0) {
      const doc = documents.find(d => d.id === viewDocId);
      if (doc) {
        setPreviewDocument(doc);
        setIsPreviewOpen(true);
        // Clean up URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, documents, setSearchParams]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = documents.reduce((sum, doc) => {
      return sum + (doc.amount ? parseFloat(doc.amount) : 0);
    }, 0);

    return {
      totalDocuments: documents.length,
      totalAmount,
      byType: documents.reduce((acc, doc) => {
        acc[doc.document_type] = (acc[doc.document_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }, [documents]);

  const handleFilterChange = (key: string, value: string) => {
    if (value === 'all' || value === '') {
      searchParams.delete(key);
    } else {
      searchParams.set(key, value);
    }
    setSearchParams(searchParams);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    await deleteDocument.mutateAsync(documentToDelete);
    setIsDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDownload = async (id: string) => {
    await downloadDocument.mutateAsync(id);
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'receipt':
        return 'bg-green-100 text-green-800';
      case 'budget':
        return 'bg-purple-100 text-purple-800';
      case 'report':
        return 'bg-orange-100 text-orange-800';
      case 'tax_document':
        return 'bg-red-100 text-red-800';
      case 'voucher':
        return 'bg-yellow-100 text-yellow-800';
      case 'bank_statement':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const docType = DOCUMENT_TYPES.find((dt) => dt.value === type);
    return docType ? t(docType.labelKey) : type;
  };

  const isLoading = documentsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('finance.financeDocuments')}
        description={t('finance.manageFinanceDocuments')}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.uploadDocument'),
          onClick: () => setIsDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
        rightSlot={
          <ReportExportButtons
            data={filteredDocuments}
            columns={[
              { key: 'document_type', label: t('finance.documentType') },
              { key: 'title', label: t('finance.documentTitle') },
              { key: 'reference_number', label: t('finance.referenceNumber') },
              { key: 'amount', label: t('finance.amount') },
              { key: 'document_date', label: t('finance.documentDate') },
              { key: 'file_name', label: t('finance.fileName') },
              { key: 'file_size', label: t('finance.fileSize') },
              { key: 'created_at', label: t('finance.uploadedAt') },
            ]}
            reportKey="finance_documents"
            title={t('finance.financeDocuments') || 'Finance Documents'}
            transformData={(data) =>
              data.map((doc) => ({
                document_type: getDocumentTypeLabel(doc.document_type),
                title: doc.title,
                reference_number: doc.reference_number || '-',
                amount: doc.amount ? formatAmount(doc.amount) : '-',
                document_date: doc.document_date ? formatDate(new Date(doc.document_date)) : '-',
                file_name: doc.file_name,
                file_size: formatFileSize(doc.file_size),
                created_at: formatDate(new Date(doc.created_at)),
              }))
            }
            buildFiltersSummary={() => {
              const filters: string[] = [];
              if (documentType && documentType !== 'all') {
                filters.push(`${t('finance.documentType')}: ${getDocumentTypeLabel(documentType)}`);
              }
              if (startDate) {
                filters.push(`${t('finance.startDate')}: ${formatDate(new Date(startDate))}`);
              }
              if (endDate) {
                filters.push(`${t('finance.endDate')}: ${formatDate(new Date(endDate))}`);
              }
              if (search) {
                filters.push(`${t('common.search')}: ${search}`);
              }
              return filters.join(', ');
            }}
            templateType="finance_documents"
            disabled={isLoading || filteredDocuments.length === 0}
            errorNoData={t('finance.noDocuments') || 'No documents to export'}
          />
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('finance.totalDocuments')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('finance.totalAmount')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatAmount(stats.totalAmount.toString())}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('finance.documentTypes')}
            </CardTitle>
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

      <FilterPanel title={t('common.filters') || 'Filters'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>{t('finance.documentType')}</Label>
            <Select
              value={documentType}
              onValueChange={(value) => {
                setDocumentType(value);
                handleFilterChange('document_type', value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.all')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('finance.startDate')}</Label>
            <CalendarDatePicker
              date={startDate ? new Date(startDate) : undefined}
              onDateChange={(date) => {
                const dateStr = date ? date.toISOString().slice(0, 10) : '';
                setStartDate(dateStr);
                handleFilterChange('start_date', dateStr);
              }}
              placeholder={t('finance.startDate') || 'Start date'}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('finance.endDate')}</Label>
            <CalendarDatePicker
              date={endDate ? new Date(endDate) : undefined}
              onDateChange={(date) => {
                const dateStr = date ? date.toISOString().slice(0, 10) : '';
                setEndDate(dateStr);
                handleFilterChange('end_date', dateStr);
              }}
              placeholder={t('finance.endDate') || 'End date'}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('finance.searchPlaceholder')}
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

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('finance.documents')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner />
          ) : filteredDocuments.length === 0 ? (
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
                    <TableHead>{t('finance.documentTitle')}</TableHead>
                    <TableHead>{t('finance.referenceNumber')}</TableHead>
                    <TableHead>{t('finance.amount')}</TableHead>
                    <TableHead>{t('finance.documentDate')}</TableHead>
                    <TableHead>{t('finance.fileName')}</TableHead>
                    <TableHead>{t('finance.fileSize')}</TableHead>
                    <TableHead>{t('finance.uploadedAt')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
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
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.reference_number || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.amount ? (
                          <span className="font-medium">{formatAmount(doc.amount)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {doc.document_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(new Date(doc.document_date))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.mime_type)}
                          <span className="text-sm">{doc.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(new Date(doc.created_at))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc.id)}
                            title={t('common.download')}
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
                            title={t('common.delete')}
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

      {/* Upload Dialog */}
      <FinanceDocumentsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      {/* Preview Dialog */}
      <FinanceDocumentPreviewDialog
        document={previewDocument}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        getDocumentTypeLabel={getDocumentTypeLabel}
        getDocumentTypeBadgeColor={getDocumentTypeBadgeColor}
        formatAmount={formatAmount}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finance.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('finance.deleteDocumentConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

