import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Eye, Edit, Trash2, MoreHorizontal, Copy, Play } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

import { TemplateForm } from "@/components/dms/TemplateForm";
import { TemplatePreview } from "@/components/dms/TemplatePreview";
import { FilterPanel } from "@/components/layout/FilterPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dmsApi } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import type { LetterTemplate } from "@/types/dms";
import type { PaginatedResponse } from "@/types/pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

export default function TemplatesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    letter_type: "",
    active: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

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

  const { data, isLoading } = useQuery<PaginatedResponse<LetterTemplate> | LetterTemplate[]>({
    queryKey: ["dms", "templates", apiFilters, page, pageSize],
    queryFn: async (): Promise<PaginatedResponse<LetterTemplate> | LetterTemplate[]> => {
      const response = await dmsApi.templates.list({
        ...apiFilters,
        page,
        per_page: pageSize,
        paginate: true,
      });
      return response as PaginatedResponse<LetterTemplate> | LetterTemplate[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Handle both paginated and non-paginated responses
  const templates = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.data || [];
  }, [data]);

  const paginationMeta = useMemo(() => {
    if (!data || Array.isArray(data)) return null;
    return data.meta || null;
  }, [data]);

  const createMutation = useMutation({
    mutationFn: (payload: any) => dmsApi.templates.create(payload),
    onSuccess: () => {
      showToast.success(t('certificateTemplates.templateCreated') || 'Template created successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "templates"] });
      setIsCreateDialogOpen(false);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.templateCreateFailed') || 'Failed to create template');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => dmsApi.templates.update(id, payload),
    onSuccess: () => {
      showToast.success(t('certificateTemplates.templateUpdated') || 'Template updated successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "templates"] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.templateUpdateFailed') || 'Failed to update template');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dmsApi.templates.delete(id),
    onSuccess: async () => {
      showToast.success(t('certificateTemplates.templateDeleted') || 'Template deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ["dms", "templates"] });
      await queryClient.refetchQueries({ queryKey: ["dms", "templates"] });
      setIsDeleteDialogOpen(false);
      setDeleteTemplateId(null);
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.templateDeleteFailed') || 'Failed to delete template');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => dmsApi.templates.duplicate(id, { name }),
    onSuccess: () => {
      showToast.success(t('toast.templateDuplicated') || 'Template duplicated successfully');
      queryClient.invalidateQueries({ queryKey: ["dms", "templates"] });
    },
    onError: (err: any) => {
      showToast.error(err.message || 'Failed to duplicate template');
    },
  });

  const openViewDialog = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };

  const openDeleteDialog = (templateId: string) => {
    setDeleteTemplateId(templateId);
    setIsDeleteDialogOpen(true);
  };

  const handleDuplicate = (template: LetterTemplate) => {
    duplicateMutation.mutate({ id: template.id, name: `${template.name} (Copy)` });
  };

  const handleDelete = () => {
    if (deleteTemplateId) {
      deleteMutation.mutate(deleteTemplateId);
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

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <PageHeader
        title={t("dms.templatesTitle") || "Letter Templates"}
        description={t("dms.templatesDescription") || "Manage letter templates and their configurations"}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t("dms.createTemplate") || "Create Template",
          onClick: () => setIsCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.createTemplate") || "Create Template"}</DialogTitle>
            <DialogDescription>
              {t("dms.templatesDescription") || "Create a new letter template with variables and letterhead."}
            </DialogDescription>
          </DialogHeader>
          <TemplateForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <FilterPanel title={t("events.filters")}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("common.search") || "Search"}</Label>
            <Input
              placeholder={t("dms.templatesSearchPlaceholder") || "Search by name..."}
              value={filters.search}
              onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("dms.category") || "Category"}</Label>
            <Select
              value={filters.category || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all") || "All"}</SelectItem>
                <SelectItem value="student">{t("students.student") || "Student"}</SelectItem>
                <SelectItem value="staff">{t("settings.staff") || "Staff"}</SelectItem>
                <SelectItem value="applicant">{t("admissions.applicant") || "Applicant"}</SelectItem>
                <SelectItem value="general">{t("common.general") || "General"}</SelectItem>
                <SelectItem value="announcement">{t("common.announcement") || "Announcement"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("dms.letterType") || "Letter Type"}</Label>
            <Select
              value={filters.letter_type || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, letter_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.allTypes") || "All Types"}</SelectItem>
                {letterTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("common.status") || "Status"}</Label>
            <Select
              value={filters.active || "all"}
              onValueChange={(value) => setFilters((s) => ({ ...s, active: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all") || "All"}</SelectItem>
                <SelectItem value="true">{t("common.active") || "Active"}</SelectItem>
                <SelectItem value="false">{t("common.inactive") || "Inactive"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dms.templates") || "Templates"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t("common.loading") || "Loading..."}</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("dms.templatesNoTemplates") || "No templates found. Create your first template to get started."}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.name") || "Name"}</TableHead>
                      <TableHead>{t("dms.category") || "Category"}</TableHead>
                      <TableHead>{t("dms.letterType") || "Letter Type"}</TableHead>
                      <TableHead>{t("dms.letterhead") || "Letterhead"}</TableHead>
                      <TableHead>{t("dms.layout") || "Layout"}</TableHead>
                      <TableHead>{t("common.status") || "Status"}</TableHead>
                      <TableHead className="text-right">{t("events.actions") || "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {template.letter_type ? (
                            <Badge variant="secondary">{template.letter_type}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {template.letterhead ? (
                            <span className="text-sm">{template.letterhead.name}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{template.page_layout || "A4_portrait"}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.active ? "default" : "secondary"}>
                            {template.active ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
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
                              <DropdownMenuItem onClick={() => openViewDialog(template)}>
                                <Eye className="h-4 w-4 mr-2" />
                                {t("common.view") || "View"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openPreviewDialog(template)}>
                                <Play className="h-4 w-4 mr-2" />
                                {t("common.preview") || "Preview"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(template)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t("common.edit") || "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                <Copy className="h-4 w-4 mr-2" />
                                {t("common.duplicate") || "Duplicate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(template.id)}
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
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.templates.viewTitle") || "Template Details"}</DialogTitle>
            <DialogDescription>
              {t("dms.templates.viewDescription") || "View template information and configuration."}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">{t("common.name") || "Name"}</Label>
                  <p className="font-medium">{selectedTemplate.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.category") || "Category"}</Label>
                  <p className="font-medium">{selectedTemplate.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.letterType") || "Letter Type"}</Label>
                  <p className="font-medium">{selectedTemplate.letter_type || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.templates.pageLayout") || "Page Layout"}</Label>
                  <p className="font-medium">{selectedTemplate.page_layout || "A4_portrait"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("dms.letterhead") || "Letterhead"}</Label>
                  <p className="font-medium">{selectedTemplate.letterhead?.name || "None"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("common.status") || "Status"}</Label>
                  <div className="font-medium">
                    <Badge variant={selectedTemplate.active ? "default" : "secondary"}>
                      {selectedTemplate.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              {selectedTemplate.variables && Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">{t("dms.templates.variables") || "Variables"}</Label>
                  <div className="mt-2 space-y-1">
                    {selectedTemplate.variables.map((varDef: any, idx: number) => (
                      <div key={idx} className="text-sm">
                        <code className="bg-muted px-2 py-1 rounded">{"{{" + varDef.name + "}}"}</code>
                        {varDef.label && <span className="ml-2 text-muted-foreground">({varDef.label})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.templates.editTitle") || "Edit Template"}</DialogTitle>
            <DialogDescription>
              {t("dms.templates.editDescription") || "Update template configuration and settings."}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplateForm
              template={selectedTemplate}
              onSubmit={(data) => updateMutation.mutate({ id: selectedTemplate.id, payload: data })}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
              }}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dms.templates.previewTitle") || "Template Preview"}</DialogTitle>
            <DialogDescription>
              {t("dms.templates.previewDescription") || "Preview the template with letterhead and variable values."}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <TemplatePreview
              template={selectedTemplate}
              onClose={() => {
                setIsPreviewDialogOpen(false);
                setSelectedTemplate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete") || "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dms.templates.deleteDescription") || "This action cannot be undone. This will permanently delete the template. If the template is in use by any documents, it cannot be deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setDeleteTemplateId(null);
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
