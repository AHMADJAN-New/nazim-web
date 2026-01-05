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

const statusOptions = [
  { label: "All Statuses", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Under review", value: "under_review" },
  { label: "Completed", value: "completed" },
  { label: "Draft", value: "draft" },
  { label: "Issued", value: "issued" },
  { label: "Printed", value: "printed" },
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
          <Label className="text-muted-foreground">Document Number</Label>
          <p className="font-medium mt-1">
            {incomingDoc?.full_indoc_number || outgoingDoc?.full_outdoc_number || "N/A"}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Subject</Label>
          <p className="font-medium mt-1">{doc.subject || "N/A"}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Date</Label>
          <p className="font-medium mt-1">
            {formatDate(
              incomingDoc?.received_date || outgoingDoc?.issue_date || ""
            )}
          </p>
        </div>
        <div>
          <Label className="text-muted-foreground">Status</Label>
          <div className="mt-1">
            <Badge variant={doc.status === 'completed' || doc.status === 'issued' ? 'default' : doc.status === 'pending' || doc.status === 'draft' ? 'secondary' : 'outline'}>
              {doc.status ? doc.status.replace('_', ' ') : 'N/A'}
            </Badge>
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground">Security Level</Label>
          <div className="mt-1">
            <SecurityBadge level={doc.security_level_key} />
          </div>
        </div>
        {incomingDoc && (
          <>
            <div>
              <Label className="text-muted-foreground">Sender Name</Label>
              <p className="font-medium mt-1">{incomingDoc.sender_name || "N/A"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Sender Organization</Label>
              <p className="font-medium mt-1">{incomingDoc.sender_org || "N/A"}</p>
            </div>
            {incomingDoc.sender_address && (
              <div>
                <Label className="text-muted-foreground">Sender Address</Label>
                <p className="font-medium mt-1">{incomingDoc.sender_address}</p>
              </div>
            )}
          </>
        )}
        {outgoingDoc && (
          <div>
            <Label className="text-muted-foreground">Recipient Type</Label>
            <p className="font-medium mt-1 capitalize">{outgoingDoc.recipient_type || "N/A"}</p>
          </div>
        )}
        {doc.external_doc_number && (
          <div>
            <Label className="text-muted-foreground">External Document Number</Label>
            <p className="font-medium mt-1">{doc.external_doc_number}</p>
          </div>
        )}
        {doc.external_doc_date && (
          <div>
            <Label className="text-muted-foreground">External Document Date</Label>
            <p className="font-medium mt-1">{formatDate(doc.external_doc_date)}</p>
          </div>
        )}
        {doc.pages_count && (
          <div>
            <Label className="text-muted-foreground">Pages</Label>
            <p className="font-medium mt-1">{doc.pages_count}</p>
          </div>
        )}
        {doc.attachments_count && (
          <div>
            <Label className="text-muted-foreground">Attachments</Label>
            <p className="font-medium mt-1">{doc.attachments_count}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {doc.description && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Description</Label>
          <div 
            className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/50"
            dangerouslySetInnerHTML={{ __html: doc.description }}
          />
        </div>
      )}

      {/* Notes */}
      {doc.notes && (
        <div>
          <Label className="text-muted-foreground mb-2 block">Notes</Label>
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
    if (appliedSearchQuery) parts.push(`Search: ${appliedSearchQuery}`);
    if (appliedFilters.status !== 'all') parts.push(`Status: ${appliedFilters.status}`);
    if (appliedFilters.security_level_key !== 'all') {
      parts.push(`Security: ${appliedFilters.security_level_key === 'none' ? 'None' : appliedFilters.security_level_key}`);
    }
    if (appliedFilters.academic_year_id && appliedFilters.academic_year_id !== 'all') {
      const year = academicYears?.find(y => y.id === appliedFilters.academic_year_id);
      if (year) parts.push(`Academic Year: ${year.name}`);
    }
    if (appliedFilters.from_date) parts.push(`From: ${appliedFilters.from_date}`);
    if (appliedFilters.to_date) parts.push(`To: ${appliedFilters.to_date}`);
    return parts.length > 0 ? parts.join(' | ') : 'All documents';
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
        title={t('dms.archiveSearch') || 'Archive & Search'}
        description={t('dms.archiveSearchDescription') || 'Search and browse all incoming and outgoing documents'}
        icon={<Archive className="h-5 w-5" />}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
            <p className="text-xs text-muted-foreground">All documents in archive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incoming Documents</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncoming}</div>
            <p className="text-xs text-muted-foreground">Received documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outgoing Documents</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOutgoing}</div>
            <p className="text-xs text-muted-foreground">Issued documents</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel
        title={t('events.filters') || 'Search & Filter'}
        footer={
          <div className="flex gap-2">
            <Button onClick={handleApplyFilters}>
              <Search className="h-4 w-4 mr-2" />
              {t('common.applyFilters') || 'Apply Filters'}
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
              {t('common.clearAll') || 'Clear All'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Search Query */}
          <div className="space-y-2">
            <Label>{t('events.search') || 'Search'}</Label>
            <Input
              placeholder={t('assets.searchPlaceholder') || 'Search by document number, subject, sender, description, external doc number...'}
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
              <Label>{t('events.status') || 'Status'}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((s) => ({ ...s, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('dms.securityLevel') || 'Security Level'}</Label>
              <Select
                value={filters.security_level_key}
                onValueChange={(value) => setFilters((s) => ({ ...s, security_level_key: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allLevels') || 'All Levels'}</SelectItem>
                  <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                  <SelectItem value="top_secret">Top Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('academic.academicYears.academicYear') || 'Academic Year'}</Label>
              <Select
                value={filters.academic_year_id || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, academic_year_id: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.allYears') || 'All years'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.allYears') || 'All years'}</SelectItem>
                  {academicYears?.map((year) => (
                    <SelectItem key={year.id} value={year.id}>
                      {year.name} {year.isCurrent ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('library.fromDate') || 'From Date'}</Label>
              <CalendarDatePicker date={filters.from_date ? new Date(filters.from_date) : undefined} onDateChange={(date) => setFilters((s) => ({ ...s, from_date: date ? date.toISOString().split("T")[0] : "" }))} />
            </div>

            <div className="space-y-2">
              <Label>{t('library.toDate') || 'To Date'}</Label>
              <CalendarDatePicker date={filters.to_date ? new Date(filters.to_date) : undefined} onDateChange={(date) => setFilters((s) => ({ ...s, to_date: date ? date.toISOString().split("T")[0] : "" }))} />
            </div>
          </div>
        </div>
      </FilterPanel>

      {/* Results with Tabs */}
      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading search results...
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
                    Incoming Documents
                    {incomingMeta && (
                      <Badge variant="secondary" className="ml-1">
                        {incomingMeta.total}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Outgoing Documents
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
                        { key: 'document_number', label: 'Document Number' },
                        { key: 'subject', label: 'Subject' },
                        { key: 'sender_name', label: 'Sender Name' },
                        { key: 'sender_org', label: 'Sender Organization' },
                        { key: 'received_date', label: 'Received Date' },
                        { key: 'status', label: 'Status' },
                        { key: 'security_level', label: 'Security Level' },
                        { key: 'external_doc_number', label: 'External Doc Number' },
                        { key: 'pages_count', label: 'Pages' },
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
                        { key: 'document_number', label: 'Document Number' },
                        { key: 'subject', label: 'Subject' },
                        { key: 'recipient_type', label: 'Recipient Type' },
                        { key: 'issue_date', label: 'Issue Date' },
                        { key: 'status', label: 'Status' },
                        { key: 'security_level', label: 'Security Level' },
                        { key: 'external_doc_number', label: 'External Doc Number' },
                        { key: 'pages_count', label: 'Pages' },
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
                      Showing {incomingMeta.from || 0} to {incomingMeta.to || 0} of {incomingMeta.total} documents
                    </span>
                    {incomingMeta.last_page > 1 && (
                      <span>Page {incomingMeta.current_page} of {incomingMeta.last_page}</span>
                    )}
                  </div>
                )}
                {incomingDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No incoming documents found</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document Number</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Sender</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Security</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                  <p className="font-medium truncate">{doc.subject || "No subject"}</p>
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
                                  View
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
                      Showing {outgoingMeta.from || 0} to {outgoingMeta.to || 0} of {outgoingMeta.total} documents
                    </span>
                    {outgoingMeta.last_page > 1 && (
                      <span>Page {outgoingMeta.current_page} of {outgoingMeta.last_page}</span>
                    )}
                  </div>
                )}
                {outgoingDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No outgoing documents found</p>
                  </div>
                ) : (
                  <>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document Number</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Security</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
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
                                  <p className="font-medium truncate">{doc.subject || "No subject"}</p>
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
                                  View
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
              {viewDoc?.type === 'incoming' ? 'Incoming' : 'Outgoing'} Document Details
            </DialogTitle>
            <DialogDescription>
              View complete document information and content
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
