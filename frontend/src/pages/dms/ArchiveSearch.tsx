import { useQuery } from "@tanstack/react-query";
import { Search, X, Eye, FileText, Archive, Calendar, User, Building2, File, Download, Inbox, Send, FileCheck } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { FilterPanel } from "@/components/layout/FilterPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dmsApi } from "@/lib/api/client";
import { formatDate, getShortDescription } from "@/lib/dateUtils";
import type { IncomingDocument, OutgoingDocument } from "@/types/dms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

// Status options will be translated in the component using t() function
const statusOptions = [
  { labelKey: "dms.archiveSearch.allStatuses", value: "all" },
  { labelKey: "dms.archiveSearch.pending", value: "pending" },
  { labelKey: "dms.archiveSearch.underReview", value: "under_review" },
  { labelKey: "dms.archiveSearch.completed", value: "completed" },
  { labelKey: "dms.archiveSearch.draft", value: "draft" },
  { labelKey: "dms.archiveSearch.issued", value: "issued" },
  { labelKey: "dms.archiveSearch.printed", value: "printed" },
];

// Simple document view using data from archive list (no API call)
function DocumentViewContent({ type, doc }: { type: 'incoming' | 'outgoing'; doc: IncomingDocument | OutgoingDocument }) {
  const incomingDoc = type === 'incoming' ? doc as IncomingDocument : null;
  const outgoingDoc = type === 'outgoing' ? doc as OutgoingDocument : null;

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.documentNumber')}</Label>
          <p className="font-medium mt-1">
            {incomingDoc?.full_indoc_number || outgoingDoc?.full_outdoc_number || "N/A"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.subject')}</Label>
          <p className="font-medium mt-1">{doc.subject || "N/A"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.date')}</Label>
          <p className="font-medium mt-1">
            {formatDate(
              incomingDoc?.received_date || outgoingDoc?.issue_date || ""
            )}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.status')}</Label>
          <div className="mt-1">
            <Badge variant={doc.status === 'completed' || doc.status === 'issued' ? 'default' : doc.status === 'pending' || doc.status === 'draft' ? 'secondary' : 'outline'}>
              {doc.status ? doc.status.replace('_', ' ') : 'N/A'}
            </Badge>
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.securityLevel')}</Label>
          <div className="mt-1">
            <SecurityBadge level={doc.security_level_key} />
          </div>
        </div>
        {incomingDoc && (
          <>
            <div>
              <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.senderName')}</Label>
              <p className="font-medium mt-1">{incomingDoc.sender_name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.senderOrganization')}</Label>
              <p className="font-medium mt-1">{incomingDoc.sender_org || "N/A"}</p>
            </div>
            {incomingDoc.sender_address && (
              <div>
                <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.senderAddress')}</Label>
                <p className="font-medium mt-1">{incomingDoc.sender_address}</p>
              </div>
            )}
          </>
        )}
        {outgoingDoc && (
          <div>
            <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.recipientType')}</Label>
            <p className="font-medium mt-1 capitalize">{outgoingDoc.recipient_type || "N/A"}</p>
          </div>
        )}
        {doc.external_doc_number && (
          <div>
            <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.externalDocNumber')}</Label>
            <p className="font-medium mt-1">{doc.external_doc_number}</p>
          </div>
        )}
        {doc.external_doc_date && (
          <div>
            <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.externalDocDate')}</Label>
            <p className="font-medium mt-1">{formatDate(doc.external_doc_date)}</p>
          </div>
        )}
        {doc.pages_count && (
          <div>
            <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.pages')}</Label>
            <p className="font-medium mt-1">{doc.pages_count}</p>
          </div>
        )}
        {doc.attachments_count && (
          <div>
            <Label className="text-muted-foreground">{t('dms.archiveSearch.viewDialog.attachments')}</Label>
            <p className="font-medium mt-1">{doc.attachments_count}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {doc.description && (
        <div>
          <Label className="text-muted-foreground mb-2 block">{t('dms.archiveSearch.viewDialog.descriptionLabel')}</Label>
          <div 
            className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/50"
            dangerouslySetInnerHTML={{ __html: doc.description }}
          />
        </div>
      )}

      {/* Notes */}
      {doc.notes && (
        <div>
          <Label className="text-muted-foreground mb-2 block">{t('dms.archiveSearch.viewDialog.notes')}</Label>
          <p className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">{doc.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function ArchiveSearch() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: academicYears } = useAcademicYears(profile?.organization_id);

  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    security_level_key: "all",
    academic_year_id: "all",
    from_date: "",
    to_date: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    status: "all",
    security_level_key: "all",
    academic_year_id: "all",
    from_date: "",
    to_date: "",
  });
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [incomingPage, setIncomingPage] = useState(1);
  const [outgoingPage, setOutgoingPage] = useState(1);
  const [pageSize] = useState(DEFAULT_PAGE_SIZE);
  const [viewDoc, setViewDoc] = useState<{ type: 'incoming' | 'outgoing'; doc: IncomingDocument | OutgoingDocument } | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Build API params from applied filters
  const apiParams = useMemo(() => {
    const params: Record<string, any> = {
      page: 1,
      per_page: pageSize,
      document_type: activeTab, // Use active tab to determine document type
    };

    if (appliedSearchQuery.trim().length > 0) {
      params.q = appliedSearchQuery.trim();
    }

    if (appliedFilters.status !== "all") {
      params.status = appliedFilters.status;
    }

    if (appliedFilters.security_level_key !== "all") {
      if (appliedFilters.security_level_key === "none") {
        params.security_level_key = "";
      } else {
        params.security_level_key = appliedFilters.security_level_key;
      }
    }

    if (appliedFilters.academic_year_id && appliedFilters.academic_year_id !== "all") {
      params.academic_year_id = appliedFilters.academic_year_id;
    }

    if (appliedFilters.from_date) {
      params.from_date = appliedFilters.from_date;
    }

    if (appliedFilters.to_date) {
      params.to_date = appliedFilters.to_date;
    }

    return params;
  }, [appliedSearchQuery, appliedFilters, pageSize, activeTab]);

  // Fetch archive data - always enabled to load data automatically
  const { data, isLoading } = useQuery({
    queryKey: ["dms", "archive", apiParams, incomingPage, outgoingPage],
    queryFn: async () => {
      const params = {
        ...apiParams,
        incoming_page: incomingPage,
        outgoing_page: outgoingPage,
      };
      return await dmsApi.archive(params);
    },
    enabled: true, // Always enabled to load data automatically
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const incomingDocs = useMemo(() => data?.incoming?.data || [], [data]);
  const outgoingDocs = useMemo(() => data?.outgoing?.data || [], [data]);
  const incomingMeta = data?.incoming?.meta;
  const outgoingMeta = data?.outgoing?.meta;

  // Calculate summary stats
  const totalDocuments = (incomingMeta?.total || 0) + (outgoingMeta?.total || 0);
  const totalIncoming = incomingMeta?.total || 0;
  const totalOutgoing = outgoingMeta?.total || 0;

  // Prepare data for export - Incoming Documents
  const incomingExportData = useMemo(() => {
    return incomingDocs.map((doc: IncomingDocument) => ({
      document_number: doc.full_indoc_number || '',
      subject: doc.subject || '',
      sender_name: doc.sender_name || '',
      sender_org: doc.sender_org || '',
      received_date: doc.received_date || '',
      status: doc.status || '',
      security_level: doc.security_level_key || '',
      external_doc_number: doc.external_doc_number || '',
      pages_count: doc.pages_count || 0,
    }));
  }, [incomingDocs]);

  // Prepare data for export - Outgoing Documents
  const outgoingExportData = useMemo(() => {
    return outgoingDocs.map((doc: OutgoingDocument) => ({
      document_number: doc.full_outdoc_number || '',
      subject: doc.subject || '',
      recipient_type: doc.recipient_type || '',
      issue_date: doc.issue_date || '',
      status: doc.status || '',
      security_level: doc.security_level_key || '',
      external_doc_number: doc.external_doc_number || '',
      pages_count: doc.pages_count || 0,
    }));
  }, [outgoingDocs]);

  // Build filters summary
  const buildFiltersSummary = () => {
    const parts: string[] = [];
    if (appliedSearchQuery) parts.push(`${t('dms.archiveSearch.filterSummary.search')}: ${appliedSearchQuery}`);
    if (appliedFilters.status !== 'all') parts.push(`${t('dms.archiveSearch.filterSummary.status')}: ${appliedFilters.status}`);
    if (appliedFilters.security_level_key !== 'all') {
      const securityValue = appliedFilters.security_level_key === 'none' ? t('dms.archiveSearch.none') : appliedFilters.security_level_key;
      parts.push(`${t('dms.archiveSearch.filterSummary.security')}: ${securityValue}`);
    }
    if (appliedFilters.academic_year_id && appliedFilters.academic_year_id !== 'all') {
      const year = academicYears?.find(y => y.id === appliedFilters.academic_year_id);
      if (year) parts.push(`${t('dms.archiveSearch.filterSummary.academicYear')}: ${year.name}`);
    }
    if (appliedFilters.from_date) parts.push(`${t('dms.archiveSearch.filterSummary.from')}: ${appliedFilters.from_date}`);
    if (appliedFilters.to_date) parts.push(`${t('dms.archiveSearch.filterSummary.to')}: ${appliedFilters.to_date}`);
    return parts.length > 0 ? parts.join(' | ') : t('dms.archiveSearch.filterSummary.allDocuments');
  };

  // Reset pages when applied filters change or tab changes
  useEffect(() => {
    setIncomingPage(1);
    setOutgoingPage(1);
  }, [appliedFilters, appliedSearchQuery, activeTab]);

  const handleView = (type: 'incoming' | 'outgoing', doc: IncomingDocument | OutgoingDocument) => {
    setViewDoc({ type, doc });
    setIsViewDialogOpen(true);
  };

  // Apply filters handler
  const handleApplyFilters = () => {
    setAppliedSearchQuery(searchQuery);
    setAppliedFilters(filters);
    setIncomingPage(1);
    setOutgoingPage(1);
  };

  const getPageNumbers = (meta: any) => {
    if (!meta) return [];
    const pages: (number | 'ellipsis')[] = [];
    const totalPages = meta.last_page;
    const currentPage = meta.current_page;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <PageHeader
        title={t('dms.archiveSearch.title')}
        description={t('dms.archiveSearch.description')}
        icon={<Archive className="h-5 w-5" />}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dms.archiveSearch.totalDocuments')}</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">{t('dms.archiveSearch.allDocumentsInArchive')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dms.archiveSearch.incomingDocuments')}</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncoming}</div>
            <p className="text-xs text-muted-foreground">{t('dms.archiveSearch.receivedDocuments')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dms.archiveSearch.outgoingDocuments')}</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOutgoing}</div>
            <p className="text-xs text-muted-foreground">{t('dms.archiveSearch.issuedDocuments')}</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel
        title={t('dms.archiveSearch.searchAndFilter')}
        footer={
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>
              <Search className="h-4 w-4 mr-2" />
              {t('dms.archiveSearch.applyFilters')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setFilters({
                  status: "all",
                  security_level_key: "all",
                  academic_year_id: "all",
                  from_date: "",
                  to_date: "",
                });
                setAppliedSearchQuery("");
                setAppliedFilters({
                  status: "all",
                  security_level_key: "all",
                  academic_year_id: "all",
                  from_date: "",
                  to_date: "",
                });
              }}
            >
              <X className="h-4 w-4 mr-2" />
              {t('dms.archiveSearch.clearAll')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search Query */}
          <div className="space-y-2">
            <Label>{t('dms.archiveSearch.search')}</Label>
            <Input
              placeholder={t('dms.archiveSearch.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyFilters();
                }
              }}
            />
          </div>

          {/* Filters Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>{t('dms.archiveSearch.status')}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((s) => ({ ...s, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dms.archiveSearch.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('dms.archiveSearch.pending')}</SelectItem>
                  <SelectItem value="under_review">{t('dms.archiveSearch.underReview')}</SelectItem>
                  <SelectItem value="completed">{t('dms.archiveSearch.completed')}</SelectItem>
                  <SelectItem value="draft">{t('dms.archiveSearch.draft')}</SelectItem>
                  <SelectItem value="issued">{t('dms.archiveSearch.issued')}</SelectItem>
                  <SelectItem value="printed">{t('dms.archiveSearch.printed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('dms.archiveSearch.securityLevel')}</Label>
              <Select
                value={filters.security_level_key}
                onValueChange={(value) => setFilters((s) => ({ ...s, security_level_key: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dms.archiveSearch.allLevels')}</SelectItem>
                  <SelectItem value="none">{t('dms.archiveSearch.none')}</SelectItem>
                  <SelectItem value="public">{t('dms.archiveSearch.public')}</SelectItem>
                  <SelectItem value="internal">{t('dms.archiveSearch.internal')}</SelectItem>
                  <SelectItem value="confidential">{t('dms.archiveSearch.confidential')}</SelectItem>
                  <SelectItem value="secret">{t('dms.archiveSearch.secret')}</SelectItem>
                  <SelectItem value="top_secret">{t('dms.archiveSearch.topSecret')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('dms.archiveSearch.academicYear')}</Label>
              <Select
                value={filters.academic_year_id || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, academic_year_id: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dms.archiveSearch.allYears')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dms.archiveSearch.allYears')}</SelectItem>
                  {academicYears?.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name} {year.isCurrent ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('dms.archiveSearch.fromDate')}</Label>
              <CalendarDatePicker date={filters.from_date ? new Date(filters.from_date) : undefined} onDateChange={(date) => setFilters((s) => ({ ...s, from_date: date ? date.toISOString().split("T")[0] : "" }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('dms.archiveSearch.toDate')}</Label>
              <CalendarDatePicker date={filters.to_date ? new Date(filters.to_date) : undefined} onDateChange={(date) => setFilters((s) => ({ ...s, to_date: date ? date.toISOString().split("T")[0] : "" }))} />
            </div>
          </div>
        </div>
      </FilterPanel>

      {/* Results with Tabs */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('dms.archiveSearch.loadingSearchResults')}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "incoming" | "outgoing")}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="incoming" className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    {t('dms.archiveSearch.incomingDocumentsTab')}
                    {incomingMeta && (
                      <Badge variant="secondary" className="ml-1">
                        {incomingMeta.total}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    {t('dms.archiveSearch.outgoingDocumentsTab')}
                    {outgoingMeta && (
                      <Badge variant="secondary" className="ml-1">
                        {outgoingMeta.total}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <div className="flex gap-2">
                  {activeTab === 'incoming' && (
                    <ReportExportButtons
                      data={incomingExportData}
                      columns={[
                        { key: 'document_number', label: t('dms.archiveSearch.exportColumns.documentNumber') },
                        { key: 'subject', label: t('dms.archiveSearch.exportColumns.subject') },
                        { key: 'sender_name', label: t('dms.archiveSearch.exportColumns.senderName') },
                        { key: 'sender_org', label: t('dms.archiveSearch.exportColumns.senderOrg') },
                        { key: 'received_date', label: t('dms.archiveSearch.exportColumns.receivedDate') },
                        { key: 'status', label: t('dms.archiveSearch.exportColumns.status') },
                        { key: 'security_level', label: t('dms.archiveSearch.exportColumns.securityLevel') },
                        { key: 'external_doc_number', label: t('dms.archiveSearch.exportColumns.externalDocNumber') },
                        { key: 'pages_count', label: t('dms.archiveSearch.exportColumns.pages') },
                      ]}
                      reportKey="dms_archive_incoming"
                      title="DMS Archive - Incoming Documents"
                      transformData={(data) => data}
                      buildFiltersSummary={buildFiltersSummary}
                      templateType="dms"
                      disabled={incomingExportData.length === 0}
                      errorNoData={t('events.noDataToExport') || 'No data to export'}
                    />
                  )}
                  {activeTab === 'outgoing' && (
                    <ReportExportButtons
                      data={outgoingExportData}
                      columns={[
                        { key: 'document_number', label: t('dms.archiveSearch.exportColumns.documentNumber') },
                        { key: 'subject', label: t('dms.archiveSearch.exportColumns.subject') },
                        { key: 'recipient_type', label: t('dms.archiveSearch.exportColumns.recipientType') },
                        { key: 'issue_date', label: t('dms.archiveSearch.exportColumns.issueDate') },
                        { key: 'status', label: t('dms.archiveSearch.exportColumns.status') },
                        { key: 'security_level', label: t('dms.archiveSearch.exportColumns.securityLevel') },
                        { key: 'external_doc_number', label: t('dms.archiveSearch.exportColumns.externalDocNumber') },
                        { key: 'pages_count', label: t('dms.archiveSearch.exportColumns.pages') },
                      ]}
                      reportKey="dms_archive_outgoing"
                      title="DMS Archive - Outgoing Documents"
                      transformData={(data) => data}
                      buildFiltersSummary={buildFiltersSummary}
                      templateType="dms"
                      disabled={outgoingExportData.length === 0}
                      errorNoData={t('events.noDataToExport') || 'No data to export'}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Incoming Documents Tab */}
              <TabsContent value="incoming" className="space-y-4 mt-0">
                {incomingMeta && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {t('dms.archiveSearch.showingResults')
                        .replace('{from}', String(incomingMeta.from || 0))
                        .replace('{to}', String(incomingMeta.to || 0))
                        .replace('{total}', String(incomingMeta.total))}
                    </span>
                    {incomingMeta.last_page > 1 && (
                      <span>{t('dms.archiveSearch.pageInfo')
                        .replace('{current}', String(incomingMeta.current_page))
                        .replace('{total}', String(incomingMeta.last_page))}</span>
                    )}
                  </div>
                )}
                {incomingDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('dms.archiveSearch.noIncomingDocumentsFound')}</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('dms.archiveSearch.documentNumber')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.subject')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.sender')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.date')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.status')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.security')}</TableHead>
                            <TableHead className="text-right">{t('dms.archiveSearch.view')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomingDocs.map((doc: IncomingDocument) => (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <DocumentNumberBadge value={doc.full_indoc_number} type="incoming" />
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="font-medium truncate">{doc.subject || t('dms.archiveSearch.noSubject')}</p>
                                  {doc.description && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                      {getShortDescription(doc.description, 60)}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[200px]">
                                  {doc.sender_name && (
                                    <p className="text-sm font-medium truncate">{doc.sender_name}</p>
                                  )}
                                  {doc.sender_org && (
                                    <p className="text-xs text-muted-foreground truncate">{doc.sender_org}</p>
                                  )}
                                  {!doc.sender_name && !doc.sender_org && (
                                    <span className="text-muted-foreground text-sm">N/A</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(doc.received_date)}</TableCell>
                              <TableCell>
                                <Badge variant={doc.status === 'completed' ? 'default' : doc.status === 'pending' ? 'secondary' : 'outline'}>
                                  {doc.status ? doc.status.replace('_', ' ') : 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <SecurityBadge level={doc.security_level_key} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => handleView('incoming', doc)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('dms.archiveSearch.view')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Incoming Pagination */}
                    {incomingMeta && incomingMeta.total > 0 && incomingMeta.last_page > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (incomingMeta.current_page > 1) {
                                    setIncomingPage(incomingMeta.current_page - 1);
                                  }
                                }}
                                className={incomingMeta.current_page === 1 ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                            {getPageNumbers(incomingMeta).map((pageNum, idx) => (
                              <PaginationItem key={idx}>
                                {pageNum === 'ellipsis' ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setIncomingPage(pageNum);
                                    }}
                                    isActive={pageNum === incomingMeta.current_page}
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                )}
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (incomingMeta.current_page < incomingMeta.last_page) {
                                    setIncomingPage(incomingMeta.current_page + 1);
                                  }
                                }}
                                className={incomingMeta.current_page === incomingMeta.last_page ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Outgoing Documents Tab */}
              <TabsContent value="outgoing" className="space-y-4 mt-0">
                {outgoingMeta && (
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {t('dms.archiveSearch.showingResults')
                        .replace('{from}', String(outgoingMeta.from || 0))
                        .replace('{to}', String(outgoingMeta.to || 0))
                        .replace('{total}', String(outgoingMeta.total))}
                    </span>
                    {outgoingMeta.last_page > 1 && (
                      <span>{t('dms.archiveSearch.pageInfo')
                        .replace('{current}', String(outgoingMeta.current_page))
                        .replace('{total}', String(outgoingMeta.last_page))}</span>
                    )}
                  </div>
                )}
                {outgoingDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('dms.archiveSearch.noOutgoingDocumentsFound')}</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('dms.archiveSearch.documentNumber')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.subject')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.recipient')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.date')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.status')}</TableHead>
                            <TableHead>{t('dms.archiveSearch.security')}</TableHead>
                            <TableHead className="text-right">{t('dms.archiveSearch.view')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outgoingDocs.map((doc: OutgoingDocument) => (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <DocumentNumberBadge value={doc.full_outdoc_number} type="outgoing" />
                              </TableCell>
                              <TableCell>
                                <div className="max-w-[300px]">
                                  <p className="font-medium truncate">{doc.subject || t('dms.archiveSearch.noSubject')}</p>
                                  {doc.description && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                      {getShortDescription(doc.description, 60)}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm capitalize">{doc.recipient_type || "N/A"}</span>
                              </TableCell>
                              <TableCell>{formatDate(doc.issue_date)}</TableCell>
                              <TableCell>
                                <Badge variant={doc.status === 'issued' ? 'default' : doc.status === 'draft' ? 'secondary' : 'outline'}>
                                  {doc.status ? doc.status.replace('_', ' ') : 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <SecurityBadge level={doc.security_level_key} />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="ghost" onClick={() => handleView('outgoing', doc)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('dms.archiveSearch.view')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Outgoing Pagination */}
                    {outgoingMeta && outgoingMeta.total > 0 && outgoingMeta.last_page > 1 && (
                      <div className="mt-6 flex justify-center">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (outgoingMeta.current_page > 1) {
                                    setOutgoingPage(outgoingMeta.current_page - 1);
                                  }
                                }}
                                className={outgoingMeta.current_page === 1 ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                            {getPageNumbers(outgoingMeta).map((pageNum, idx) => (
                              <PaginationItem key={idx}>
                                {pageNum === 'ellipsis' ? (
                                  <PaginationEllipsis />
                                ) : (
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setOutgoingPage(pageNum);
                                    }}
                                    isActive={pageNum === outgoingMeta.current_page}
                                  >
                                    {pageNum}
                                  </PaginationLink>
                                )}
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (outgoingMeta.current_page < outgoingMeta.last_page) {
                                    setOutgoingPage(outgoingMeta.current_page + 1);
                                  }
                                }}
                                className={outgoingMeta.current_page === outgoingMeta.last_page ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      )}

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewDoc?.type === 'incoming' ? t('dms.archiveSearch.viewDialog.incomingTitle') : t('dms.archiveSearch.viewDialog.outgoingTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('dms.archiveSearch.viewDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <DocumentViewContent type={viewDoc.type} doc={viewDoc.doc} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
