import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { OutgoingDocument } from "@/types/dms";
import type { PaginatedResponse } from "@/types/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYears } from "@/hooks/useAcademicYears";
import { formatDate } from "@/lib/utils";
import { getShortDescription } from "@/lib/dateUtils";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { LoadingSpinner } from "@/components/ui/loading";
import { Search, Eye } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker";

const recipientTypeOptions = [
  { label: "All Types", value: "all" },
  { label: "Student", value: "student" },
  { label: "Staff", value: "staff" },
  { label: "Applicant", value: "applicant" },
  { label: "External", value: "external" },
];

interface IssuedLettersTableProps {
  onRowClick: (letter: OutgoingDocument) => void;
}

export function IssuedLettersTable({ onRowClick }: IssuedLettersTableProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const [search, setSearch] = useState("");
  const [recipientType, setRecipientType] = useState<string>("all");
  const [academicYearId, setAcademicYearId] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // Fetch academic years
  const { data: academicYears = [] } = useAcademicYears(profile?.organization_id);

  // Build API filters
  const apiFilters = useMemo(() => {
    const filters: Record<string, any> = {
      status: "issued",
      page,
      per_page: pageSize,
      paginate: true,
    };

    if (debouncedSearch.trim()) {
      filters.subject = debouncedSearch.trim();
    }

    if (recipientType && recipientType !== "all") {
      filters.recipient_type = recipientType;
    }

    if (academicYearId && academicYearId !== "all") {
      filters.academic_year_id = academicYearId;
    }

    if (fromDate) {
      filters.from_date = fromDate;
    }

    if (toDate) {
      filters.to_date = toDate;
    }

    return filters;
  }, [debouncedSearch, recipientType, academicYearId, fromDate, toDate, page, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, recipientType, academicYearId, fromDate, toDate]);

  // Fetch issued letters
  const { data, isLoading } = useQuery<PaginatedResponse<OutgoingDocument> | OutgoingDocument[]>({
    queryKey: ["dms", "outgoing", "issued", apiFilters],
    queryFn: async (): Promise<PaginatedResponse<OutgoingDocument> | OutgoingDocument[]> => {
      const response = await dmsApi.outgoing.list(apiFilters);
      return response as PaginatedResponse<OutgoingDocument> | OutgoingDocument[];
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Handle both paginated and non-paginated responses
  const letters = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data || [];
  }, [data]);

  const paginationMeta = useMemo(() => {
    if (!data || Array.isArray(data)) return null;
    return data.meta || null;
  }, [data]);

  // Get recipient display name
  const getRecipientName = (letter: OutgoingDocument): string => {
    if (letter.recipient_type === "external") {
      return letter.external_recipient_name || "External Recipient";
    }
    // For student/staff/applicant, we'd need to fetch the actual name
    // For now, show the type
    return letter.recipient_type || "Unknown";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("dms.issueLetter.issuedLetters.title") || "All Issued Letters"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label htmlFor="search">{t("common.search") || "Search"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t("dms.issueLetter.issuedLetters.searchPlaceholder") || "Search by subject or document number..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="recipient-type">{t("dms.issueLetter.issuedLetters.recipientType") || "Recipient Type"}</Label>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger id="recipient-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recipientTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="academic-year">{t("dms.issueLetter.issuedLetters.academicYear") || "Academic Year"}</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger id="academic-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all") || "All"}</SelectItem>
                  {academicYears.map((ay) => (
                    <SelectItem key={ay.id} value={ay.id}>
                      {ay.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="from-date">{t("dms.issueLetter.issuedLetters.fromDate") || "From"}</Label>
                <CalendarDatePicker
                  date={fromDate ? new Date(fromDate) : undefined}
                  onDateChange={(date) => setFromDate(date ? date.toISOString().split("T")[0] : "")}
                />
              </div>
              <div>
                <Label htmlFor="to-date">{t("dms.issueLetter.issuedLetters.toDate") || "To"}</Label>
                <CalendarDatePicker
                  date={toDate ? new Date(toDate) : undefined}
                  onDateChange={(date) => setToDate(date ? date.toISOString().split("T")[0] : "")}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : letters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("dms.issueLetter.issuedLetters.noLettersFound") || "No issued letters found"}
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("dms.issueLetter.issuedLetters.documentNumber") || "Document Number"}</TableHead>
                        <TableHead>{t("dms.issueLetter.issuedLetters.subject") || "Subject"}</TableHead>
                        <TableHead>{t("dms.issueLetter.issuedLetters.recipient") || "Recipient"}</TableHead>
                        <TableHead>{t("dms.issueLetter.issuedLetters.issueDate") || "Issue Date"}</TableHead>
                        <TableHead>{t("dms.issueLetter.issuedLetters.security") || "Security"}</TableHead>
                        <TableHead className="text-right">{t("common.actions") || "Actions"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {letters.map((letter) => (
                        <TableRow
                          key={letter.id}
                          onClick={() => onRowClick(letter)}
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <TableCell className="font-medium">
                            <DocumentNumberBadge value={letter.full_outdoc_number} type="outgoing" />
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="truncate" title={letter.subject || undefined}>
                              {letter.subject || t("dms.issueLetter.issuedLetters.noSubject") || "No subject"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{getRecipientName(letter)}</div>
                              <Badge variant="outline" className="text-xs">
                                {letter.recipient_type || "Unknown"}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(letter.issue_date)}</TableCell>
                          <TableCell>
                            <SecurityBadge level={letter.security_level_key} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRowClick(letter);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {t("common.view") || "View"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination */}
              {paginationMeta && (
                <DataTablePagination
                  table={{
                    getState: () => ({
                      pagination: {
                        pageIndex: page - 1,
                        pageSize,
                      },
                    }),
                    setPageIndex: (index: number) => setPage(index + 1),
                    setPageSize: setPageSize,
                    getPageCount: () => paginationMeta.last_page,
                    getCanPreviousPage: () => page > 1,
                    getCanNextPage: () => page < paginationMeta.last_page,
                  } as any}
                  paginationMeta={paginationMeta}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

