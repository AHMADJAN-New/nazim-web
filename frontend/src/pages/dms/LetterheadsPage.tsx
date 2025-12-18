import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import type { Letterhead } from "@/types/dms";
import type { PaginatedResponse } from "@/types/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/hooks/useLanguage";
import { FileText, Search, Plus, Eye, Edit, Trash2, MoreHorizontal, Download, Image as ImageIcon } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { LetterheadForm } from "@/components/dms/LetterheadForm";
import { Badge } from "@/components/ui/badge";

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
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

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
    setPreviewPdfUrl(null);
    try {
      const preview = await dmsApi.letterheads.preview(letterhead.id) as {
        html?: string;
        preview_url?: string;
        file_url?: string;
        letterhead?: Partial<Letterhead> & { file_type?: string };
      };
      setPreviewHtml(preview.html || "");

      // Merge URLs from backend so preview has usable sources
      setSelectedLetterhead((prev) => ({
        ...(prev || letterhead),
        preview_url: preview.preview_url ?? letterhead.preview_url ?? null,
        file_url: preview.file_url ?? (letterhead as any).file_url ?? null,
        file_type: preview.letterhead?.file_type ?? letterhead.file_type,
      }) as Letterhead);

      // For PDFs, fetch as blob to bypass object-src/auth header issues
      const fileType = (preview as any)?.letterhead?.file_type ?? letterhead.file_type;
      if (fileType === "pdf") {
        try {
          const { blob } = await dmsApi.letterheads.download(letterhead.id);
          if (blob instanceof Blob && blob.size > 0) {
            const url = URL.createObjectURL(blob);
            setPreviewPdfUrl(url);
          }
        } catch {
          // Ignore preview fetch errors; download button remains available
        }
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load preview');
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

  // Clean up PDF object URL when dialog closes or selection changes
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Letterheads</h1>
            <p className="text-muted-foreground">Manage letterhead files and configurations</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Upload Letterhead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Upload Letterhead</DialogTitle>
              <DialogDescription>
                Upload a new letterhead file (PDF or image).
              </DialogDescription>
            </DialogHeader>
            <LetterheadForm
              onSubmit={handleFormSubmit}
              onCancel={() => setIsCreateDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by name..."
                value={filters.search}
                onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <Select
                value={filters.letter_type || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, letter_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {letterTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File Type</Label>
              <Select
                value={filters.file_type || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, file_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.active || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, active: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Letterheads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Letterheads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : letterheads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No letterheads found. Upload your first letterhead to get started.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>File Type</TableHead>
                      <TableHead>Letter Type</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Layout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                            {letterhead.active ? "Active" : "Inactive"}
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
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openViewDialog(letterhead)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPreviewDialog(letterhead)}>
                                <ImageIcon className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(letterhead)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(letterhead)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(letterhead.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
            <DialogTitle>Letterhead Details</DialogTitle>
            <DialogDescription>
              View letterhead information and configuration.
            </DialogDescription>
          </DialogHeader>
          {selectedLetterhead && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedLetterhead.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">File Type</Label>
                  <div className="font-medium">
                    <Badge variant="outline">
                      {selectedLetterhead.file_type?.toUpperCase() || "IMAGE"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Letter Type</Label>
                  <p className="font-medium">{selectedLetterhead.letter_type || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Position</Label>
                  <p className="font-medium capitalize">{selectedLetterhead.position || "header"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Default Layout</Label>
                  <p className="font-medium">{selectedLetterhead.default_for_layout || "None"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="font-medium">
                    <Badge variant={selectedLetterhead.active ? "default" : "secondary"}>
                      {selectedLetterhead.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedLetterhead.preview_url && selectedLetterhead.file_type === "image" && (
                <div>
                  <Label className="text-muted-foreground">Preview</Label>
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
            <DialogTitle>Edit Letterhead</DialogTitle>
            <DialogDescription>
              Update letterhead configuration and settings.
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
            <DialogTitle>Letterhead Preview</DialogTitle>
            <DialogDescription>
              Preview the letterhead as it will appear in documents.
            </DialogDescription>
          </DialogHeader>
           {selectedLetterhead && (
             <div className="space-y-4">
               {/* PDF preview */}
               {selectedLetterhead.file_type === "pdf" ? (
                 <div className="border rounded-lg bg-white">
                   {previewPdfUrl ? (
                     <object
                       data={previewPdfUrl}
                       type="application/pdf"
                       className="w-full min-h-[500px] border-0 rounded-lg"
                     >
                       <div className="p-6 text-center text-muted-foreground">
                         <p className="mb-4">PDF preview is not available. Please download to view.</p>
                         <Button
                           variant="outline"
                           onClick={() => handleDownload(selectedLetterhead)}
                         >
                           <Download className="h-4 w-4 mr-2" />
                           Download PDF
                         </Button>
                       </div>
                     </object>
                   ) : selectedLetterhead.file_url ? (
                     <object
                       data={selectedLetterhead.file_url}
                       type="application/pdf"
                       className="w-full min-h-[500px] border-0 rounded-lg"
                     >
                       <div className="p-6 text-center text-muted-foreground">
                         <p className="mb-4">PDF preview is not available. Please download to view.</p>
                         <Button
                           variant="outline"
                           onClick={() => handleDownload(selectedLetterhead)}
                         >
                           <Download className="h-4 w-4 mr-2" />
                           Download PDF
                         </Button>
                       </div>
                     </object>
                   ) : (
                     <div className="border rounded-lg p-8 text-center text-muted-foreground">
                       <p>Loading PDF preview...</p>
                     </div>
                   )}
                 </div>
               ) : previewHtml ? (
                 <div className="border rounded-lg p-4 bg-white">
                   <iframe
                     srcDoc={previewHtml}
                     className="w-full min-h-[400px] border-0"
                     title="Letterhead Preview"
                   />
                 </div>
               ) : (
                 <div className="border rounded-lg p-8 text-center text-muted-foreground">
                   <p>Loading preview...</p>
                 </div>
               )}
               {(selectedLetterhead.preview_url || (selectedLetterhead as any).file_url) && selectedLetterhead.file_type === "image" && (
                 <div>
                   <Label>Image Preview</Label>
                   <div className="mt-2 border rounded-lg overflow-hidden">
                     <img
                       src={selectedLetterhead.preview_url || (selectedLetterhead as any).file_url || ''}
                       alt={selectedLetterhead.name}
                       className="w-full h-auto max-h-96 object-contain"
                       onError={(e) => {
                         const fileUrl = (selectedLetterhead as any).file_url;
                         if (fileUrl && e.currentTarget.src !== fileUrl) {
                           e.currentTarget.src = fileUrl;
                         }
                       }}
                     />
                   </div>
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the letterhead.
              If the letterhead is in use by any templates or documents, it cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeleteLetterheadId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
