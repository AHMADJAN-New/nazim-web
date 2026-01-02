import { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { dmsApi } from "@/lib/api/client";
import type { IncomingDocument } from "@/types/dms";
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
import { useAuth } from "@/hooks/useAuth";
import { useAcademicYears, useCurrentAcademicYear } from "@/hooks/useAcademicYears";
import { DocumentNumberBadge } from "@/components/dms/DocumentNumberBadge";
import { SecurityBadge } from "@/components/dms/SecurityBadge";
import { ImageFileUploader } from "@/components/dms/ImageFileUploader";
import { FileText, Upload, Search, Plus, X, Eye, File, Download, Image as ImageIcon, Maximize2, X as XIcon, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/dms/RichTextEditor";
import { formatDate, formatDateForInput, getShortDescription } from "@/lib/dateUtils";
import { Separator } from "@/components/ui/separator";
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Under review", value: "under_review" },
  { label: "Completed", value: "completed" },
];

// Attachment Card Component
function AttachmentCard({
  file,
  onPreview,
  onDownload,
  canPreview,
  isImageFile,
  isPdfFile,
  previewLoading
}: {
  file: any;
  onPreview: (file: any) => void;
  onDownload: (id: string, name: string) => void;
  canPreview: (mimeType?: string) => boolean;
  isImageFile: (mimeType?: string) => boolean;
  isPdfFile: (mimeType?: string) => boolean;
  previewLoading: boolean;
}) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingThumbnail, setLoadingThumbnail] = useState(false);

  // Load thumbnail for images
  useEffect(() => {
    if (isImageFile(file.mime_type) && !thumbnailUrl && !loadingThumbnail) {
      setLoadingThumbnail(true);
      dmsApi.files.download(file.id)
        .then((result) => {
          const blob = result instanceof Blob ? result : (result as any).blob;
          const url = window.URL.createObjectURL(blob);
          setThumbnailUrl(url);
        })
        .catch(() => {
          // Silently fail - just won't show thumbnail
        })
        .finally(() => {
          setLoadingThumbnail(false);
        });
    }
    return () => {
      if (thumbnailUrl) {
        window.URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [file.id, file.mime_type]);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-muted flex items-center justify-center group">
        {isImageFile(file.mime_type) ? (
          loadingThumbnail ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
          ) : thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={file.original_name}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => onPreview(file)}
            />
          ) : (
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
          )
        ) : isPdfFile(file.mime_type) ? (
          <FileText className="h-12 w-12 text-red-500" />
        ) : (
          <File className="h-12 w-12 text-muted-foreground" />
        )}
        {canPreview(file.mime_type) && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={() => onPreview(file)}
          >
            <Eye className="h-8 w-8 text-white" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-medium text-sm truncate mb-1" title={file.original_name}>
          {file.original_name}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(2)} KB • ` : ''}v{file.version}
        </p>
        <div className="flex items-center gap-2">
          {canPreview(file.mime_type) && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs"
              onClick={() => onPreview(file)}
              disabled={previewLoading}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => onDownload(file.id, file.original_name)}
          >
            <Download className="h-3 w-3 mr-1" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component to display document view content with attachments
function DocumentViewContent({ doc }: { doc: IncomingDocument }) {
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    name: string;
    mime_type?: string;
    url?: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const { data: files = [] } = useQuery<Array<{
    id: string;
    original_name: string;
    size_bytes?: number | null;
    version: number;
    mime_type?: string;
  }>>({
    queryKey: ["dms", "files", "incoming", doc.id],
    queryFn: async () => {
      const result = await dmsApi.files.list({ owner_type: "incoming", owner_id: doc.id });
      return Array.isArray(result) ? result : [];
    },
    enabled: !!doc.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') ?? false;
  };

  const isPdfFile = (mimeType?: string) => {
    return mimeType === 'application/pdf';
  };

  const canPreview = (mimeType?: string) => {
    return isImageFile(mimeType) || isPdfFile(mimeType);
  };

  const handlePreview = async (file: { id: string; original_name: string; mime_type?: string }) => {
    try {
      setPreviewLoading(true);
      // Cleanup previous URL if exists
      if (previewUrlRef.current) {
        window.URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      const result = await dmsApi.files.download(file.id);
      const blob = result instanceof Blob ? result : (result as any).blob;
      const url = window.URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewFile({
        id: file.id,
        name: file.original_name,
        mime_type: file.mime_type,
        url: url,
      });
    } catch (error: any) {
      showToast.error(error.message || 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrlRef.current) {
      window.URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewFile(null);
  };

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      const result = await dmsApi.files.download(fileId);
      const blob = result instanceof Blob ? result : (result as any).blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success('File downloaded successfully');
    } catch (error: any) {
      showToast.error(error.message || 'Failed to download file');
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Document Number</Label>
            <p className="font-medium">{doc.full_indoc_number || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Received Date</Label>
            <p className="font-medium">{formatDate(doc.received_date)}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Subject</Label>
            <p className="font-medium">{doc.subject || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <p className="font-medium capitalize">{doc.status || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Security Level</Label>
            <div className="font-medium">
              <SecurityBadge level={doc.security_level_key} />
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Pages Count (ضمائم)</Label>
            <p className="font-medium">{doc.pages_count ?? "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Attachments Count</Label>
            <p className="font-medium">{doc.attachments_count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Sender Information */}
      <Separator />
      <div>
        <h3 className="text-lg font-semibold mb-4">Sender Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Sender Name</Label>
            <p className="font-medium">{doc.sender_name || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Sender Organization</Label>
            <p className="font-medium">{doc.sender_org || "N/A"}</p>
          </div>
          <div className="md:col-span-2">
            <Label className="text-muted-foreground">Sender Address</Label>
            <p className="font-medium">{doc.sender_address || "N/A"}</p>
          </div>
        </div>
      </div>

      {/* External Document Information */}
      <Separator />
      <div>
        <h3 className="text-lg font-semibold mb-4">External Document Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">External Document Number</Label>
            <p className="font-medium">{doc.external_doc_number || "N/A"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">External Document Date</Label>
            <p className="font-medium">{doc.external_doc_date ? formatDate(doc.external_doc_date) : "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Description / Content */}
      {doc.description && (
        <>
          <Separator />
          <div>
            <Label className="text-muted-foreground mb-2 block">Description / Content</Label>
            <div
              className="prose prose-sm max-w-none p-4 border rounded-lg bg-muted/50"
              dangerouslySetInnerHTML={{ __html: doc.description }}
            />
          </div>
        </>
      )}

      {/* Notes */}
      <Separator />
      <div>
        <Label className="text-muted-foreground mb-2 block">Notes</Label>
        <p className="text-sm whitespace-pre-wrap">{doc.notes || "No notes"}</p>
      </div>

      {/* Attachments */}
      <Separator />
      <div>
        <h3 className="text-lg font-semibold mb-4">Attachments ({files.length})</h3>
        {files && files.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file: any) => (
              <AttachmentCard
                key={file.id}
                file={file}
                onPreview={handlePreview}
                onDownload={handleDownload}
                canPreview={canPreview}
                isImageFile={isImageFile}
                isPdfFile={isPdfFile}
                previewLoading={previewLoading}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <File className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attachments found</p>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewFile?.name || 'File Preview'}</DialogTitle>
            <DialogDescription>Preview attachment file</DialogDescription>
          </DialogHeader>
          {previewFile && (
            <>
              <div className="flex items-center justify-between p-4 border-b bg-background">
                <DialogTitle className="text-lg font-semibold truncate flex-1 mr-4">{previewFile.name}</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePreview}
                  className="shrink-0"
                >
                  <XIcon className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-muted/30" style={{ height: 'calc(95vh - 73px)' }}>
                {previewLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-muted-foreground">Loading preview...</p>
                    </div>
                  </div>
                ) : previewFile.url && (
                  <div className="flex items-center justify-center h-full w-full">
                    {isImageFile(previewFile.mime_type) ? (
                      <img
                        src={previewFile.url}
                        alt={previewFile.name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        style={{ maxHeight: 'calc(95vh - 120px)' }}
                      />
                    ) : isPdfFile(previewFile.mime_type) ? (
                      <object
                        data={previewFile.url}
                        type="application/pdf"
                        className="w-full border-0 rounded-lg shadow-2xl"
                        style={{ height: 'calc(95vh - 120px)' }}
                        title={previewFile.name}
                      >
                        <div className="flex items-center justify-center h-full text-center p-8">
                          <div>
                            <p className="text-sm text-muted-foreground mb-4">
                              PDF preview is not available. Please download the file to view it.
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => handleDownload(previewFile.id, previewFile.name)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download PDF
                            </Button>
                          </div>
                        </div>
                      </object>
                    ) : (
                      <div className="text-center">
                        <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => handleDownload(previewFile.id, previewFile.name)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download File
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function IncomingDocuments() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    subject: "",
    sender_org: "",
    status: "",
    security_level_key: "",
    academic_year_id: "",
    routing_department_id: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<IncomingDocument | null>(null);
  const [editDoc, setEditDoc] = useState<IncomingDocument | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  // Get academic years
  const { data: academicYears } = useAcademicYears(profile?.organization_id);
  const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);
  
  // Get departments
  const { data: departments = [] } = useQuery({
    queryKey: ["dms", "departments"],
    queryFn: () => dmsApi.departments.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

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

  const { data, isLoading } = useQuery<PaginatedResponse<IncomingDocument> | IncomingDocument[]>({
    queryKey: ["dms", "incoming", apiFilters, page, pageSize],
    queryFn: async (): Promise<PaginatedResponse<IncomingDocument> | IncomingDocument[]> => {
      const response = await dmsApi.incoming.list({
        ...apiFilters,
        page,
        per_page: pageSize,
        paginate: true,
      });
      return response as PaginatedResponse<IncomingDocument> | IncomingDocument[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Handle both paginated and non-paginated responses
  const documents = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data || [];
  }, [data]);

  const paginationMeta = useMemo(() => {
    if (!data || Array.isArray(data)) return null;
    return data.meta || null;
  }, [data]);

  // Check for view query param and auto-open dialog
  useEffect(() => {
    const viewDocId = searchParams.get('view');
    if (viewDocId && documents.length > 0) {
      const doc = documents.find(d => d.id === viewDocId);
      if (doc) {
        setViewDoc(doc);
        setIsViewDialogOpen(true);
        // Clean up URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, documents, setSearchParams]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => dmsApi.incoming.create(payload),
    onSuccess: (data: any) => {
      showToast.success(t('toast.documentCreated') || 'Incoming document saved successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "incoming"] });
      // Store created document ID for file upload
      if (data?.id) {
        setUploadDocId(data.id);
        setIsUploadDialogOpen(true);
      }
      // Reset form and close dialog
      setNewDoc({
        subject: "",
        sender_org: "",
        sender_name: "",
        sender_address: "",
        received_date: "",
        description: "",
        pages_count: "",
        attachments_count: "0",
        is_manual_number: false,
        manual_indoc_number: "",
        external_doc_number: "",
        external_doc_date: "",
        security_level_key: "",
        routing_department_id: "",
        status: "pending",
        notes: "",
        academic_year_id: currentAcademicYear?.id || "",
      });
      setIsDialogOpen(false);
    },
    onError: (err: any) => showToast.error(err.message || t('toast.documentCreateFailed') || 'Failed to save document'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => dmsApi.incoming.update(id, payload),
    onSuccess: () => {
      showToast.success(t('toast.documentUpdated') || 'Incoming document updated successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "incoming"] });
      setIsEditDialogOpen(false);
      setEditDoc(null);
      setNewDoc({
        subject: "",
        sender_org: "",
        sender_name: "",
        sender_address: "",
        received_date: "",
        description: "",
        pages_count: "",
        attachments_count: "0",
        is_manual_number: false,
        manual_indoc_number: "",
        external_doc_number: "",
        external_doc_date: "",
        security_level_key: "",
        routing_department_id: "",
        status: "pending",
        notes: "",
        academic_year_id: currentAcademicYear?.id || "",
      });
    },
    onError: (err: any) => showToast.error(err.message || t('toast.documentUpdateFailed') || 'Failed to update document'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dmsApi.incoming.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.documentDeleted') || 'Incoming document deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ["dms", "incoming"] });
      await queryClient.refetchQueries({ queryKey: ["dms", "incoming"] });
      setIsDeleteDialogOpen(false);
      setDeleteDocId(null);
    },
    onError: (err: any) => showToast.error(err.message || t('toast.documentDeleteFailed') || 'Failed to delete document'),
  });

  const [newDoc, setNewDoc] = useState({
    subject: "",
    sender_org: "",
    sender_name: "",
    sender_address: "",
    received_date: "",
    description: "",
    pages_count: "",
    attachments_count: "0",
    is_manual_number: false,
    manual_indoc_number: "",
    external_doc_number: "",
    external_doc_date: "",
    security_level_key: "",
    routing_department_id: "",
    status: "pending",
    notes: "",
    academic_year_id: currentAcademicYear?.id || "",
  });
  const readyToSave = useMemo(() => !!newDoc.subject && !!newDoc.received_date, [newDoc]);

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setNewDoc({
        subject: "",
        sender_org: "",
        sender_name: "",
        sender_address: "",
        received_date: "",
        description: "",
        pages_count: "",
        attachments_count: "0",
        is_manual_number: false,
        manual_indoc_number: "",
        external_doc_number: "",
        external_doc_date: "",
        security_level_key: "",
        routing_department_id: "",
        status: "pending",
        notes: "",
        academic_year_id: currentAcademicYear?.id || "",
      });
    }
  };

  const handleUploadDialogOpenChange = (open: boolean) => {
    setIsUploadDialogOpen(open);
    if (!open) {
      setUploadDocId(null);
    }
  };

  const openUploadDialog = (docId: string) => {
    setUploadDocId(docId);
    setIsUploadDialogOpen(true);
  };

  const openViewDialog = (doc: IncomingDocument) => {
    setViewDoc(doc);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (doc: IncomingDocument) => {
    setEditDoc(doc);
    setNewDoc({
      subject: doc.subject || "",
      sender_org: doc.sender_org || "",
      sender_name: doc.sender_name || "",
      sender_address: doc.sender_address || "",
      received_date: formatDateForInput(doc.received_date),
      description: doc.description || "",
      pages_count: doc.pages_count?.toString() || "",
      attachments_count: doc.attachments_count?.toString() || "0",
      is_manual_number: !!doc.manual_indoc_number,
      manual_indoc_number: doc.manual_indoc_number || "",
      external_doc_number: doc.external_doc_number || "",
      external_doc_date: formatDateForInput(doc.external_doc_date),
      security_level_key: doc.security_level_key || "",
      routing_department_id: doc.routing_department_id || "none",
      status: doc.status || "pending",
      notes: doc.notes || "",
      academic_year_id: doc.academic_year_id || currentAcademicYear?.id || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (docId: string) => {
    setDeleteDocId(docId);
    setIsDeleteDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditDoc(null);
      setNewDoc({
        subject: "",
        sender_org: "",
        sender_name: "",
        sender_address: "",
        received_date: "",
        description: "",
        pages_count: "",
        attachments_count: "0",
        is_manual_number: false,
        manual_indoc_number: "",
        external_doc_number: "",
        external_doc_date: "",
        security_level_key: "",
        routing_department_id: "",
        status: "pending",
        notes: "",
        academic_year_id: currentAcademicYear?.id || "",
      });
    }
  };

  const handleDelete = () => {
    if (deleteDocId) {
      deleteMutation.mutate(deleteDocId);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    if (!paginationMeta) return [];
    const pages: (number | 'ellipsis')[] = [];
    const totalPages = paginationMeta.last_page;
    const currentPage = paginationMeta.current_page;

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
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
            <h1 className="text-3xl font-bold">Incoming Documents</h1>
            <p className="text-muted-foreground">Manage and track incoming documents</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Incoming Document</DialogTitle>
              <DialogDescription>
                Create a new incoming document record. Fill in the required fields and save.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Select
                      value={newDoc.academic_year_id || currentAcademicYear?.id || ""}
                      onValueChange={(value) => setNewDoc((s) => ({ ...s, academic_year_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears?.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name} {year.isCurrent ? "(Current)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Received Date <span className="text-destructive">*</span></Label>
                    <CalendarDatePicker date={newDoc.received_date ? new Date(newDoc.received_date) : undefined} onDateChange={(date) => setNewDoc(date ? date.toISOString().split("T")[0] : "")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Input
                    value={newDoc.subject}
                    onChange={(e) => setNewDoc((s) => ({ ...s, subject: e.target.value }))}
                    placeholder="Exam letter"
                  />
                </div>
              </div>

              <Separator />

              {/* Sender Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Sender Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Sender Name</Label>
                    <Input
                      value={newDoc.sender_name}
                      onChange={(e) => setNewDoc((s) => ({ ...s, sender_name: e.target.value }))}
                      placeholder="Sender name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sender Organization</Label>
                    <Input
                      value={newDoc.sender_org}
                      onChange={(e) => setNewDoc((s) => ({ ...s, sender_org: e.target.value }))}
                      placeholder="MoE"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sender Address</Label>
                  <Input
                    value={newDoc.sender_address}
                    onChange={(e) => setNewDoc((s) => ({ ...s, sender_address: e.target.value }))}
                    placeholder="Sender address"
                  />
                </div>
              </div>

              <Separator />

              {/* Document Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Document Content</h3>
                <RichTextEditor
                  value={newDoc.description}
                  onChange={(value) => setNewDoc((s) => ({ ...s, description: value }))}
                  label="Description / Content"
                  placeholder="Enter document description or content..."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pages Count (ضمائم)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newDoc.pages_count}
                      onChange={(e) => setNewDoc((s) => ({ ...s, pages_count: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attachments Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newDoc.attachments_count}
                      onChange={(e) => setNewDoc((s) => ({ ...s, attachments_count: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Document Number Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Document Number</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="manual-number"
                    checked={newDoc.is_manual_number}
                    onCheckedChange={(checked) => setNewDoc((s) => ({ ...s, is_manual_number: checked === true }))}
                  />
                  <Label htmlFor="manual-number" className="cursor-pointer">
                    Assign document number manually
                  </Label>
                </div>
                {newDoc.is_manual_number && (
                  <div className="space-y-2">
                    <Label>Manual Document Number</Label>
                    <Input
                      value={newDoc.manual_indoc_number}
                      onChange={(e) => setNewDoc((s) => ({ ...s, manual_indoc_number: e.target.value }))}
                      placeholder="IN-2025-001"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>External Document Number</Label>
                    <Input
                      value={newDoc.external_doc_number}
                      onChange={(e) => setNewDoc((s) => ({ ...s, external_doc_number: e.target.value }))}
                      placeholder="External reference number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>External Document Date</Label>
                    <CalendarDatePicker date={newDoc.external_doc_date ? new Date(newDoc.external_doc_date) : undefined} onDateChange={(date) => setNewDoc(date ? date.toISOString().split("T")[0] : "")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Security Level</Label>
                  <Select
                    value={newDoc.security_level_key || "none"}
                    onValueChange={(value) => setNewDoc((s) => ({ ...s, security_level_key: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select security level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="secret">Secret</SelectItem>
                      <SelectItem value="top_secret">Top Secret</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newDoc.status}
                    onValueChange={(value) => setNewDoc((s) => ({ ...s, status: value }))}
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
                  <Label>Routing Department</Label>
                  <Select
                    value={newDoc.routing_department_id || "none"}
                    onValueChange={(value) => setNewDoc((s) => ({ ...s, routing_department_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={newDoc.notes}
                    onChange={(e) => setNewDoc((s) => ({ ...s, notes: e.target.value }))}
                    placeholder="Additional notes"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  disabled={!readyToSave || createMutation.isPending}
                  onClick={() => createMutation.mutate({
                    ...newDoc,
                    routing_department_id: newDoc.routing_department_id === "none" ? "" : newDoc.routing_department_id,
                    pages_count: newDoc.pages_count ? parseInt(newDoc.pages_count) : null,
                    attachments_count: newDoc.attachments_count ? parseInt(newDoc.attachments_count) : 0,
                    is_manual_number: newDoc.is_manual_number || false,
                  })}
                >
                  {createMutation.isPending ? "Saving..." : "Save Document"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Document Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Incoming Document</DialogTitle>
            <DialogDescription>
              Update the incoming document information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select
                    value={newDoc.academic_year_id || currentAcademicYear?.id || ""}
                    onValueChange={(value) => setNewDoc((s) => ({ ...s, academic_year_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYears?.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name} {year.isCurrent ? "(Current)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Received Date <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={newDoc.received_date}
                    onChange={(e) => setNewDoc((s) => ({ ...s, received_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Input
                  value={newDoc.subject}
                  onChange={(e) => setNewDoc((s) => ({ ...s, subject: e.target.value }))}
                  placeholder="Exam letter"
                />
              </div>
            </div>

            <Separator />

            {/* Sender Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Sender Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input
                    value={newDoc.sender_name}
                    onChange={(e) => setNewDoc((s) => ({ ...s, sender_name: e.target.value }))}
                    placeholder="Sender name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sender Organization</Label>
                  <Input
                    value={newDoc.sender_org}
                    onChange={(e) => setNewDoc((s) => ({ ...s, sender_org: e.target.value }))}
                    placeholder="Organization name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sender Address</Label>
                <Input
                  value={newDoc.sender_address}
                  onChange={(e) => setNewDoc((s) => ({ ...s, sender_address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>
            </div>

            <Separator />

            {/* Document Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Document Details</h3>
              <div className="space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={newDoc.description || ""}
                  onChange={(value) => setNewDoc((s) => ({ ...s, description: value }))}
                  placeholder="Document description"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Pages Count</Label>
                  <Input
                    type="number"
                    value={newDoc.pages_count}
                    onChange={(e) => setNewDoc((s) => ({ ...s, pages_count: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attachments Count</Label>
                  <Input
                    type="number"
                    value={newDoc.attachments_count}
                    onChange={(e) => setNewDoc((s) => ({ ...s, attachments_count: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>External Document Number</Label>
                  <Input
                    value={newDoc.external_doc_number}
                    onChange={(e) => setNewDoc((s) => ({ ...s, external_doc_number: e.target.value }))}
                    placeholder="External reference number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>External Document Date</Label>
                  <Input
                    type="date"
                    value={newDoc.external_doc_date}
                    onChange={(e) => setNewDoc((s) => ({ ...s, external_doc_date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Security Level</Label>
                <Select
                  value={newDoc.security_level_key || "none"}
                  onValueChange={(value) => setNewDoc((s) => ({ ...s, security_level_key: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select security level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="confidential">Confidential</SelectItem>
                    <SelectItem value="secret">Secret</SelectItem>
                    <SelectItem value="top_secret">Top Secret</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Routing Department</Label>
                <Select
                  value={newDoc.routing_department_id || "none"}
                  onValueChange={(value) => setNewDoc((s) => ({ ...s, routing_department_id: value === "none" ? "" : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newDoc.status}
                  onValueChange={(value) => setNewDoc((s) => ({ ...s, status: value }))}
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
                <Label>Notes</Label>
                <Input
                  value={newDoc.notes}
                  onChange={(e) => setNewDoc((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                disabled={!readyToSave || updateMutation.isPending}
                onClick={() => {
                  if (editDoc) {
                    updateMutation.mutate({
                      id: editDoc.id,
                      payload: {
                        ...newDoc,
                        routing_department_id: newDoc.routing_department_id === "none" ? "" : newDoc.routing_department_id,
                        pages_count: newDoc.pages_count ? parseInt(newDoc.pages_count) : null,
                        attachments_count: newDoc.attachments_count ? parseInt(newDoc.attachments_count) : 0,
                        is_manual_number: newDoc.is_manual_number || false,
                      },
                    });
                  }
                }}
              >
                {updateMutation.isPending ? "Updating..." : "Update Document"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleEditDialogClose(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters Card - Always Visible */}
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
              <Label>Subject</Label>
              <Input
                placeholder="Search by subject..."
                value={filters.subject}
                onChange={(e) => setFilters((s) => ({ ...s, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Sender Organization</Label>
              <Input
                placeholder="Search by sender..."
                value={filters.sender_org}
                onChange={(e) => setFilters((s) => ({ ...s, sender_org: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, status: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Security Level</Label>
              <Select
                value={filters.security_level_key || "all"}
                onValueChange={(value) => setFilters((s) => ({ ...s, security_level_key: value === "all" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="confidential">Confidential</SelectItem>
                  <SelectItem value="secret">Secret</SelectItem>
                  <SelectItem value="top_secret">Top Secret</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={filters.routing_department_id === "" ? "unassigned" : (filters.routing_department_id || "all")}
                onValueChange={(value) => setFilters((s) => ({ ...s, routing_department_id: value === "all" || value === "unassigned" ? "" : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setFilters({ subject: "", sender_org: "", status: "", security_level_key: "", academic_year_id: "", routing_department_id: "" })}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents</CardTitle>
          {paginationMeta && (
            <div className="text-sm text-muted-foreground">
              Showing {paginationMeta.from || 0} to {paginationMeta.to || 0} of {paginationMeta.total} documents
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
          ) : !documents || documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No documents found</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>External Doc</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Security</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <DocumentNumberBadge value={doc.full_indoc_number} type="incoming" />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{doc.subject || "No subject"}</TableCell>
                      <TableCell className="max-w-[250px]">
                        <div className="text-sm text-muted-foreground truncate">
                          {getShortDescription(doc.description, 80)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.sender_name && <div className="font-medium">{doc.sender_name}</div>}
                          {doc.sender_org && <div className="text-muted-foreground">{doc.sender_org}</div>}
                          {!doc.sender_name && !doc.sender_org && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.external_doc_number && <div className="font-medium">{doc.external_doc_number}</div>}
                          {doc.external_doc_date && <div className="text-muted-foreground">{formatDate(doc.external_doc_date)}</div>}
                          {!doc.external_doc_number && !doc.external_doc_date && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.pages_count ? (
                          <span className="text-sm">{doc.pages_count} {doc.pages_count === 1 ? 'page' : 'pages'}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <SecurityBadge level={doc.security_level_key} />
                      </TableCell>
                      <TableCell>
                        {doc.routing_department_id ? (
                          <Badge variant="outline">
                            {departments.find(d => d.id === doc.routing_department_id)?.name || 'Unknown'}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{doc.status}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatDate(doc.received_date)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('common.actions') || 'Actions'}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openViewDialog(doc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('common.view') || 'View'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('common.edit') || 'Edit'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openUploadDialog(doc.id)}>
                              <Upload className="h-4 w-4 mr-2" />
                              {t('dms.uploadFiles') || 'Upload Files'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(doc.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete') || 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {paginationMeta && paginationMeta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Rows per page:</Label>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (paginationMeta.current_page > 1) {
                              setPage(paginationMeta.current_page - 1);
                            }
                          }}
                          className={paginationMeta.current_page === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((pageNum, idx) => (
                        <PaginationItem key={idx}>
                          {pageNum === 'ellipsis' ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(pageNum);
                              }}
                              isActive={pageNum === paginationMeta.current_page}
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
                            if (paginationMeta.current_page < paginationMeta.last_page) {
                              setPage(paginationMeta.current_page + 1);
                            }
                          }}
                          className={paginationMeta.current_page === paginationMeta.last_page ? "pointer-events-none opacity-50" : ""}
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

      {/* View Document Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              View complete document information, content, and attachments
            </DialogDescription>
          </DialogHeader>
          {viewDoc && (
            <DocumentViewContent doc={viewDoc} />
          )}
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={handleUploadDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Scanned Images / Files</DialogTitle>
            <DialogDescription>
              Upload scanned images or attachments for this document. Images will be automatically compressed.
            </DialogDescription>
          </DialogHeader>
          {uploadDocId && (
            <ImageFileUploader
              ownerType="incoming"
              ownerId={uploadDocId}
              fileType="scan"
              maxFiles={10}
              compressionOptions={{
                maxWidth: 1920,
                maxHeight: 1920,
                quality: 0.85,
                maxSizeMB: 2,
                mimeType: 'image/jpeg',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
