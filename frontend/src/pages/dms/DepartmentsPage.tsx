import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLanguage } from "@/hooks/useLanguage";
import { Building, Plus, Edit2, Trash2, FileText, Users, Search } from "lucide-react";
import { useState } from "react";
import { useMemo } from "react";

import { FilterPanel } from "@/components/layout/FilterPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dmsApi } from "@/lib/api/client";
import { showToast } from "@/lib/toast";
import { formatDate, formatDateTime } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  organization_id: string;
  school_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DepartmentStats {
  id: string;
  name: string;
  incoming_count: number;
}

export default function DepartmentsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "" });

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ["dms", "departments"],
    queryFn: () => dmsApi.departments.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: stats = [] } = useQuery<DepartmentStats[]>({
    queryKey: ["dms", "departments", "stats"],
    queryFn: () => dmsApi.departments.stats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Create stats map for quick lookup
  const statsMap = new Map(stats.map(s => [s.id, s]));

  // Filter departments based on search
  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) => dmsApi.departments.create(payload),
    onSuccess: () => {
      showToast.success(t('toast.departmentCreated') || 'Department created successfully');
      setForm({ name: "" });
      setIsCreateDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["dms", "departments"] });
      void queryClient.invalidateQueries({ queryKey: ["dms", "departments", "stats"] });
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.departmentCreateFailed') || 'Failed to create department');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { name: string } }) =>
      dmsApi.departments.update(id, payload),
    onSuccess: () => {
      showToast.success(t('toast.departmentUpdated') || 'Department updated successfully');
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      setForm({ name: "" });
      void queryClient.invalidateQueries({ queryKey: ["dms", "departments"] });
      void queryClient.invalidateQueries({ queryKey: ["dms", "departments", "stats"] });
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.departmentUpdateFailed') || 'Failed to update department');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dmsApi.departments.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.departmentDeleted') || 'Department deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeletingDepartment(null);
      await queryClient.invalidateQueries({ queryKey: ["dms", "departments"] });
      await queryClient.refetchQueries({ queryKey: ["dms", "departments"] });
      await queryClient.invalidateQueries({ queryKey: ["dms", "departments", "stats"] });
    },
    onError: (err: any) => {
      showToast.error(err.message || t('toast.departmentDeleteFailed') || 'Failed to delete department');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast.error(t('toast.departmentNameRequired') || 'Department name is required');
      return;
    }
    createMutation.mutate(form);
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setForm({ name: department.name });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !editingDepartment) {
      showToast.error(t('toast.departmentNameRequired') || 'Department name is required');
      return;
    }
    updateMutation.mutate({ id: editingDepartment.id, payload: form });
  };

  const handleDelete = (department: Department) => {
    setDeletingDepartment(department);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingDepartment) {
      deleteMutation.mutate(deletingDepartment.id);
    }
  };

  const totalIncoming = stats.reduce((sum, stat) => sum + stat.incoming_count, 0);

  // Prepare data for export
  const departmentsExportData = useMemo(() => {
    return filteredDepartments.map((dept) => {
      const stat = statsMap.get(dept.id);
      const docCount = stat?.incoming_count || 0;
      return {
        name: dept.name,
        documents_count: docCount,
        created_at: dept.created_at ? new Date(dept.created_at).toLocaleDateString() : '-',
      };
    });
  }, [filteredDepartments, statsMap]);

  // Build filters summary
  const buildFiltersSummary = () => {
    if (searchQuery) {
      return `${t('dms.departmentsPage.filterSummary.search')}: ${searchQuery}`;
    }
    return t('dms.departmentsPage.filterSummary.allDepartments');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <PageHeader
        title={t('dms.departmentsPage.title')}
        description={t('dms.departmentsPage.description')}
        icon={<Building className="h-5 w-5" />}
        primaryAction={{
          label: t('dms.departmentsPage.addDepartment'),
          onClick: () => setIsCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dms.departmentsPage.totalDepartments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dms.departmentsPage.documentsAssigned')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIncoming}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('dms.departmentsPage.incomingDocuments')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('dms.departmentsPage.unassignedDocuments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">{t('dms.departmentsPage.checkIncomingDocuments')}</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel title={t('events.filters')}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('dms.departmentsPage.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ReportExportButtons
            data={departmentsExportData}
            columns={[
              { key: 'name', label: t('dms.departmentsPage.departmentName') },
              { key: 'documents_count', label: t('dms.departmentsPage.documents') },
              { key: 'created_at', label: t('dms.departmentsPage.created') },
            ]}
            reportKey="dms_departments"
            title={t('dms.departmentsPage.title')}
            transformData={(data) => data}
            buildFiltersSummary={buildFiltersSummary}
            templateType="dms"
            disabled={departmentsExportData.length === 0}
            errorNoData={t('events.noDataToExport') || 'No data to export'}
          />
        </div>
      </FilterPanel>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('dms.departmentsPage.departments')}</CardTitle>
          <CardDescription>
            {t('dms.departmentsPage.departmentsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? t('dms.departmentsPage.noDepartmentsFound') : t('dms.departmentsPage.noDepartmentsYet')}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dms.departmentsPage.createFirstDepartment')}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dms.departmentsPage.departmentName')}</TableHead>
                    <TableHead>{t('dms.departmentsPage.documents')}</TableHead>
                    <TableHead>{t('dms.departmentsPage.created')}</TableHead>
                    <TableHead className="text-right">{t('dms.departmentsPage.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((dept) => {
                    const stat = statsMap.get(dept.id);
                    const docCount = stat?.incoming_count || 0;
                    return (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell>
                          <Badge variant={docCount > 0 ? "default" : "secondary"}>
                            <FileText className="h-3 w-3 mr-1" />
                            {docCount} {docCount === 1 ? t('dms.departmentsPage.document') : t('dms.departmentsPage.documentsPlural')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dept.created_at
                            ? new Date(dept.created_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(dept)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(dept)}
                              disabled={docCount > 0}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Department Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dms.departmentsPage.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dms.departmentsPage.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">{t('dms.departmentsPage.createDialog.nameLabel')}</Label>
              <Input
                id="create-name"
                placeholder={t('dms.departmentsPage.createDialog.namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('dms.departmentsPage.createDialog.nameHint')}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setForm({ name: "" });
                }}
              >
                {t('dms.departmentsPage.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? t('dms.departmentsPage.createDialog.creating')
                  : t('dms.departmentsPage.createDialog.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dms.departmentsPage.editDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dms.departmentsPage.editDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('dms.departmentsPage.editDialog.nameLabel') || t('dms.departmentsPage.createDialog.nameLabel')}</Label>
              <Input
                id="edit-name"
                placeholder={t('dms.departmentsPage.createDialog.namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDepartment(null);
                  setForm({ name: "" });
                }}
              >
                {t('dms.departmentsPage.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending
                  ? t('dms.departmentsPage.editDialog.updating')
                  : t('dms.departmentsPage.editDialog.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dms.departmentsPage.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dms.departmentsPage.deleteDialog.description').replace('{name}', deletingDepartment?.name || '')}
              {statsMap.get(deletingDepartment?.id || '')?.incoming_count ? (
                <span className="block mt-2 text-destructive font-medium">
                  {t('dms.departmentsPage.deleteDialog.hasDocuments').replace('{count}', String(statsMap.get(deletingDepartment?.id || '')?.incoming_count || 0))}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dms.departmentsPage.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={
                deleteMutation.isPending ||
                (deletingDepartment && (statsMap.get(deletingDepartment.id)?.incoming_count || 0) > 0)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('dms.departmentsPage.deleteDialog.deleting') : t('dms.departmentsPage.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
