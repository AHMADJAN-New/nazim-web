import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Search, Plus, Eye, Edit, Trash2, MoreHorizontal, Download, Image as ImageIcon } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

import { LetterheadForm } from "@/components/dms/LetterheadForm";
import { FilterPanel } from "@/components/layout/FilterPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dmsApi } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { Letterhead } from "@/types/dms";
import type { PaginatedResponse } from "@/types/pagination";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useLanguage } from "@/hooks/useLanguage";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";

const letterTypeOptions = [
  { value: "application", label: "Application" },
  { value: "moe_letter", label: "MOE Letter" },
  { value: "parent_letter", label: "Parent Letter" },
  { value: "announcement", label: "Announcement" },
  { value: "official", label: "Official" },
  { value: "student_letter", label: "Student Letter" },
  { value: "staff_letter", label: "Staff Letter" },
  { value: "general", label: "General" },
];

export default function LetterheadsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    letter_type: "",
    file_type: "",
    active: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLetterhead, setSelectedLetterhead] = useState<Letterhead | null>(null);
  const [deleteLetterheadId, setDeleteLetterheadId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  // Filter out "all" values before sending to API
  const apiFilters = useMemo(() => {
    const cleaned: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }, [filters]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const { data, isLoading } = useQuery<PaginatedResponse<Letterhead> | Letterhead[]>({
    queryKey: ["dms", "letterheads", apiFilters, page, pageSize],
    queryFn: async (): Promise<PaginatedResponse<Letterhead> | Letterhead[]> => {
      const response = await dmsApi.letterheads.list({
        ...apiFilters,
        page,
        per_page: pageSize,
        paginate: true,
      });
      return response as PaginatedResponse<Letterhead> | Letterhead[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Handle both paginated and non-paginated responses
  const letterheads = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data || [];
  }, [data]);

  const paginationMeta = useMemo(() => {
    if (!data || Array.isArray(data)) return null;
    return data.meta || null;
  }, [data]);

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await dmsApi.letterheads.create(formData);
    },
    onSuccess: () => {
      showToast.success(t('toast.letterheadCreated') || 'Letterhead created successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "letterheads"] });
      setIsCreateDialogOpen(false);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.letterheadCreateFailed') || 'Failed to create letterhead');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: FormData }) => {
      return await dmsApi.letterheads.update(id, formData);
    },
    onSuccess: () => {
      showToast.success(t('toast.letterheadUpdated') || 'Letterhead updated successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "letterheads"] });
      setIsEditDialogOpen(false);
      setSelectedLetterhead(null);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.letterheadUpdateFailed') || 'Failed to update letterhead');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dmsApi.letterheads.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.letterheadDeleted') || 'Letterhead deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ["dms", "letterheads"] });
      await queryClient.refetchQueries({ queryKey: ["dms", "letterheads"] });
      setIsDeleteDialogOpen(false);
      setDeleteLetterheadId(null);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.letterheadDeleteFailed') || 'Failed to delete letterhead');
    },
  });

  const handleFormSubmit = (data: any & { file?: File }) => {
    const formData = new FormData();
    formData.append("name", data.name);
    if (data.file) {
      formData.append("file", data.file);
    }
    if (data.file_type) {
      formData.append("file_type", data.file_type);
    }
    if (data.letter_type) {
      formData.append("letter_type", data.letter_type);
    }
    if (data.default_for_layout) {
      formData.append("default_for_layout", data.default_for_layout);
    }
    if (data.position) {
      formData.append("position", data.position);
    }
    formData.append("active", data.active ? "1" : "0");

    if (selectedLetterhead) {
      updateMutation.mutate({ id: selectedLetterhead.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openViewDialog = (letterhead: Letterhead) => {
    setSelectedLetterhead(letterhead);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (letterhead: Letterhead) => {
    setSelectedLetterhead(letterhead);
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = async (letterhead: Letterhead) => {
    setSelectedLetterhead(letterhead);
    setIsPreviewDialogOpen(true);
    setPreviewHtml("");

    if (letterhead.file_type === "html") {
      try {
        const preview = await dmsApi.letterheads.preview(letterhead.id) as {
          html?: string;
        };
        setPreviewHtml(preview.html || "");
      } catch (error: any) {
        showToast.error(error.message || "Failed to load preview");
      }
    }
  };

  const openDeleteDialog = (letterheadId: string) => {
    setDeleteLetterheadId(letterheadId);
    setIsDeleteDialogOpen(true);
  };

  const handleDownload = async (letterhead: Letterhead) => {
    try {
      const { blob, filename } = await dmsApi.letterheads.download(letterhead.id);
      if (!(blob instanceof Blob)) {
        throw new Error('Download failed: invalid file response');
      }
      if (blob.size === 0) {
        throw new Error('Download failed: empty file');
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${letterhead.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success('Letterhead downloaded successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to download letterhead');
    }
  };

  const handleDelete = () => {
    if (deleteLetterheadId) {
      deleteMutation.mutate(deleteLetterheadId);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!paginationMeta) return [];
    const pages: (number | 'ellipsis')[] = [];
    const totalPages = paginationMeta.last_page;
    const currentPage = paginationMeta.current_page;

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

  const previewSource =
    selectedLetterhead?.image_url || selectedLetterhead?.preview_url || selectedLetterhead?.file_url || null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <PageHeader
        title={t('dms.letterheads') || 'Letterheads'}
        description={t('dms.letterheadsDescription') || 'Manage letterhead files and configurations'}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('dms.uploadLetterhead') || 'Upload Letterhead',
          onClick: () => setIsCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('dms.createLetterhead') || 'Create Letterhead'}</DialogTitle>
              <DialogDescription>
                {t('dms.letterheadsDescription') || 'Upload a new letterhead file (PDF or image).'}
              </DialogDescription>
            </DialogHeader>
            <LetterheadForm
              onSubmit={handleFormSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>

      <FilterPanel title={t('events.filters') || 'Search & Filter'}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t('events.search') || 'Search'}</Label>
            <Input
              placeholder={t('dms.searchByName') || 'Search by name...'}
              value={filters.search}
              onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('dms.letterType') || 'Letter Type'}</Label>
            <Select
              value={filters.letter_type || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, letter_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allTypes') || 'All Types'}</SelectItem>
                {letterTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('dms.fileType') || 'File Type'}</Label>
            <Select
              value={filters.file_type || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, file_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.allTypes') || 'All Types'}</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('events.status') || 'Status'}</Label>
            <Select
              value={filters.active || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, active: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('subjects.all') || 'All'}</SelectItem>
                <SelectItem value="true">{t('events.active') || 'Active'}</SelectItem>
                <SelectItem value="false">{t('events.inactive') || 'Inactive'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      {/* Letterheads Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dms.letterheadsTitle') || 'Letterheads'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading') || 'Loading...'}</div>
          ) : letterheads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('dms.letterheadsNoLetterheads') || 'No letterheads found. Upload your first letterhead to get started.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.name') || 'Name'}</TableHead>
                      <TableHead>{t('dms.fileType') || 'File Type'}</TableHead>
                      <TableHead>{t('dms.letterType') || 'Letter Type'}</TableHead>
                      <TableHead>{t('dms.position') || 'Position'}</TableHead>
                      <TableHead>{t('dms.layout') || 'Layout'}</TableHead>
                      <TableHead>{t('common.status') || 'Status'}</TableHead>
                      <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {letterheads.map((letterhead) => (
                      <TableRow key={letterhead.id}>
                        <TableCell className="font-medium">{letterhead.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {letterhead.file_type?.toUpperCase() || "IMAGE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {letterhead.letter_type ? (
                            <Badge variant="secondary">{letterhead.letter_type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{letterhead.position || "header"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{letterhead.default_for_layout || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={letterhead.active ? "default" : "secondary"}>
                            {letterhead.active ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t("events.actions") || "Actions"}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openViewDialog(letterhead)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t("common.view") || "View"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPreviewDialog(letterhead)}>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                {t("common.preview") || "Preview"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(letterhead)}>
                                <Download className="h-4 w-4 mr-2" />
                                {t("common.download") || "Download"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(letterhead)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common.edit") || "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(letterhead.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("common.delete") || "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {paginationMeta && paginationMeta.last_page > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={paginationMeta.current_page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              onClick={() => setPage(pageNum as number)}
                              isActive={paginationMeta.current_page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(paginationMeta.last_page, p + 1))}
                          className={paginationMeta.current_page === paginationMeta.last_page ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dms.letterheads.viewTitle") || "Letterhead Details"}</DialogTitle>
            <DialogDescription>
              {t("dms.letterheads.viewDescription") || "View letterhead information and configuration."}
            </DialogDescription>
          </DialogHeader>
          {selectedLetterhead && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">{t("common.name") || "Name"}</Label>
                  <p className="font-medium">{selectedLetterhead.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.fileType") || "File Type"}</Label>
                  <div className="font-medium">
                    <Badge variant="outline">
                      {selectedLetterhead.file_type?.toUpperCase() || "IMAGE"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.letterType") || "Letter Type"}</Label>
                  <p className="font-medium">{selectedLetterhead.letter_type || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.position") || "Position"}</Label>
                  <p className="font-medium capitalize">{selectedLetterhead.position || "header"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.letterheads.defaultLayout") || "Default Layout"}</Label>
                  <p className="font-medium">{selectedLetterhead.default_for_layout || "None"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("common.status") || "Status"}</Label>
                  <div className="font-medium">
                    <Badge variant={selectedLetterhead.active ? "default" : "secondary"}>
                      {selectedLetterhead.active ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedLetterhead.preview_url && selectedLetterhead.file_type === "image" && (
                <div>
                  <Label className="text-muted-foreground">{t("common.preview") || "Preview"}</Label>
                  <div className="mt-2 border rounded-lg overflow-hidden">
                    <img
                      src={selectedLetterhead.preview_url}
                      alt={selectedLetterhead.name}
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.letterheads.editTitle") || "Edit Letterhead"}</DialogTitle>
            <DialogDescription>
              {t("dms.letterheads.editDescription") || "Update letterhead configuration and settings."}
            </DialogDescription>
          </DialogHeader>
          {selectedLetterhead && (
            <LetterheadForm
              letterhead={selectedLetterhead}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedLetterhead(null);
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.letterheads.previewTitle") || "Letterhead Preview"}</DialogTitle>
            <DialogDescription>
              {t("dms.letterheads.previewDescription") || "Preview the letterhead as it will appear in documents."}
            </DialogDescription>
          </DialogHeader>
           {selectedLetterhead && (
             <div className="space-y-4">
               {selectedLetterhead.file_type === "html" && previewHtml ? (
                 <div className="border rounded-lg p-4 bg-white">
                   <iframe
                     srcDoc={previewHtml}
                     className="w-full min-h-[400px] border-0"
                     title="Letterhead Preview"
                   />
                 </div>
               ) : previewSource ? (
                 <div className="border rounded-lg overflow-hidden bg-white">
                   <img
                     src={previewSource}
                     alt={selectedLetterhead.name}
                     className="w-full h-auto max-h-[600px] object-contain"
                   />
                 </div>
               ) : (
                 <div className="border rounded-lg p-8 text-center text-muted-foreground">
                   <p>Preview not available. Please download the letterhead to view it.</p>
                   <Button
                     variant="outline"
                     className="mt-4"
                     onClick={() => handleDownload(selectedLetterhead)}
                   >
                     <Download className="h-4 w-4 mr-2" />
                     Download
                   </Button>
                 </div>
               )}
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete") || "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dms.letterheads.deleteDescription") || "This action cannot be undone. This will permanently delete the letterhead. If the letterhead is in use by any templates or documents, it cannot be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeleteLetterheadId(null);
            }}>
              {t("common.cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete") || "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
