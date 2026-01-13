import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import type { LetterTypeEntity } from "@/types/dms";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useLetterTypes, useCreateLetterType, useUpdateLetterType, useDeleteLetterType } from "@/hooks/useLetterTypes";


// Schema will be created inside component to access t() function
const createLetterTypeFormSchema = (t: (key: string) => string) => z.object({
  key: z.string()
    .min(1, t('dms.letterTypesPage.validation.keyRequired'))
    .max(50, t('dms.letterTypesPage.validation.keyMaxLength'))
    .regex(/^[a-z0-9_]+$/, t('dms.letterTypesPage.validation.keyInvalidFormat')),
  name: z.string()
    .min(1, t('dms.letterTypesPage.validation.nameRequired'))
    .max(255, t('dms.letterTypesPage.validation.nameMaxLength')),
  description: z.string()
    .max(1000, t('dms.letterTypesPage.validation.descriptionMaxLength'))
    .optional()
    .nullable(),
  active: z.boolean().default(true),
});

type LetterTypeFormData = {
  key: string;
  name: string;
  description?: string | null;
  active: boolean;
};

export default function LetterTypesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: "",
    active: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLetterType, setSelectedLetterType] = useState<LetterTypeEntity | null>(null);
  const [deleteLetterTypeId, setDeleteLetterTypeId] = useState<string | null>(null);

  // Filter out "all" values before sending to API
  const apiFilters = useMemo(() => {
    const cleaned: Record<string, any> = {};
    if (filters.search) cleaned.search = filters.search;
    if (filters.active && filters.active !== "all") {
      cleaned.active = filters.active === "true";
    }
    return cleaned;
  }, [filters]);

  const { data: letterTypes = [], isLoading } = useLetterTypes(false);

  // Filter letter types client-side
  const filteredLetterTypes = useMemo(() => {
    let filtered = letterTypes;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (lt) =>
          lt.name.toLowerCase().includes(searchLower) ||
          lt.key.toLowerCase().includes(searchLower) ||
          (lt.description && lt.description.toLowerCase().includes(searchLower))
      );
    }
    if (filters.active && filters.active !== "all") {
      const isActive = filters.active === "true";
      filtered = filtered.filter((lt) => lt.active === isActive);
    }
    return filtered;
  }, [letterTypes, filters]);

  const createMutation = useCreateLetterType();
  const updateMutation = useUpdateLetterType();
  const deleteMutation = useDeleteLetterType();

  const letterTypeFormSchema = useMemo(() => createLetterTypeFormSchema(t), [t]);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    control: controlCreate,
    formState: { errors: errorsCreate },
    reset: resetCreate,
  } = useForm<LetterTypeFormData>({
    resolver: zodResolver(letterTypeFormSchema),
    defaultValues: {
      key: "",
      name: "",
      description: "",
      active: true,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    control: controlEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
  } = useForm<LetterTypeFormData>({
    resolver: zodResolver(letterTypeFormSchema),
  });

  useEffect(() => {
    if (selectedLetterType && isEditDialogOpen) {
      resetEdit({
        key: selectedLetterType.key,
        name: selectedLetterType.name,
        description: selectedLetterType.description || "",
        active: selectedLetterType.active ?? true,
      });
    }
  }, [selectedLetterType, isEditDialogOpen, resetEdit]);

  const handleCreate = (data: LetterTypeFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetCreate();
      },
    });
  };

  const handleUpdate = (data: LetterTypeFormData) => {
    if (!selectedLetterType) return;
    updateMutation.mutate(
      { id: selectedLetterType.id, ...data },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          setSelectedLetterType(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteLetterTypeId) return;
    deleteMutation.mutate(deleteLetterTypeId, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setDeleteLetterTypeId(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dms.letterTypesPage.title')}</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('dms.letterTypesPage.createButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('dms.letterTypesPage.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filters.active} onValueChange={(value) => setFilters({ ...filters, active: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('dms.letterTypesPage.allStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dms.letterTypesPage.allStatus')}</SelectItem>
                <SelectItem value="true">{t('dms.letterTypesPage.active')}</SelectItem>
                <SelectItem value="false">{t('dms.letterTypesPage.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">{t('dms.letterTypesPage.loading')}</div>
          ) : filteredLetterTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t('dms.letterTypesPage.noLetterTypesFound')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dms.letterTypesPage.key')}</TableHead>
                  <TableHead>{t('dms.letterTypesPage.name')}</TableHead>
                  <TableHead>{t('dms.letterTypesPage.description')}</TableHead>
                  <TableHead>{t('dms.letterTypesPage.status')}</TableHead>
                  <TableHead className="text-right">{t('dms.letterTypesPage.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLetterTypes.map((letterType) => (
                  <TableRow key={letterType.id}>
                    <TableCell className="font-mono text-sm">{letterType.key}</TableCell>
                    <TableCell className="font-medium">{letterType.name}</TableCell>
                    <TableCell className="text-muted-foreground">{letterType.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={letterType.active ? "default" : "secondary"}>
                        {letterType.active ? t('dms.letterTypesPage.active') : t('dms.letterTypesPage.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('dms.letterTypesPage.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLetterType(letterType);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('dms.letterTypesPage.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLetterType(letterType);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('dms.letterTypesPage.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setDeleteLetterTypeId(letterType.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('dms.letterTypesPage.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dms.letterTypesPage.createDialog.title')}</DialogTitle>
            <DialogDescription>{t('dms.letterTypesPage.createDialog.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-key">
                {t('dms.letterTypesPage.createDialog.keyLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-key"
                {...registerCreate("key")}
                placeholder={t('dms.letterTypesPage.createDialog.keyPlaceholder')}
                className="font-mono"
              />
              {errorsCreate.key && <p className="text-sm text-destructive">{errorsCreate.key.message}</p>}
              <p className="text-xs text-muted-foreground">{t('dms.letterTypesPage.createDialog.keyHint')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">
                {t('dms.letterTypesPage.createDialog.nameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input id="create-name" {...registerCreate("name")} placeholder={t('dms.letterTypesPage.createDialog.namePlaceholder')} />
              {errorsCreate.name && <p className="text-sm text-destructive">{errorsCreate.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">{t('dms.letterTypesPage.createDialog.descriptionLabel')}</Label>
              <Textarea
                id="create-description"
                {...registerCreate("description")}
                placeholder={t('dms.letterTypesPage.createDialog.descriptionPlaceholder')}
                rows={3}
              />
              {errorsCreate.description && <p className="text-sm text-destructive">{errorsCreate.description.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="active"
                control={controlCreate}
                render={({ field }) => (
                  <Switch
                    id="create-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="create-active">{t('dms.letterTypesPage.createDialog.activeLabel')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('dms.letterTypesPage.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? t('dms.letterTypesPage.createDialog.creating') : t('dms.letterTypesPage.createDialog.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dms.letterTypesPage.editDialog.title')}</DialogTitle>
            <DialogDescription>{t('dms.letterTypesPage.editDialog.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-key">
                {t('dms.letterTypesPage.createDialog.keyLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-key"
                {...registerEdit("key")}
                placeholder={t('dms.letterTypesPage.createDialog.keyPlaceholder')}
                className="font-mono"
              />
              {errorsEdit.key && <p className="text-sm text-destructive">{errorsEdit.key.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                {t('dms.letterTypesPage.createDialog.nameLabel')} <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-name" {...registerEdit("name")} placeholder={t('dms.letterTypesPage.createDialog.namePlaceholder')} />
              {errorsEdit.name && <p className="text-sm text-destructive">{errorsEdit.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('dms.letterTypesPage.createDialog.descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                {...registerEdit("description")}
                placeholder={t('dms.letterTypesPage.createDialog.descriptionPlaceholder')}
                rows={3}
              />
              {errorsEdit.description && <p className="text-sm text-destructive">{errorsEdit.description.message}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Controller
                name="active"
                control={controlEdit}
                render={({ field }) => (
                  <Switch
                    id="edit-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="edit-active">{t('dms.letterTypesPage.createDialog.activeLabel')}</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('dms.letterTypesPage.createDialog.cancel')}
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('dms.letterTypesPage.editDialog.updating') : t('dms.letterTypesPage.editDialog.update')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dms.letterTypesPage.viewDialog.title')}</DialogTitle>
          </DialogHeader>
          {selectedLetterType && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t('dms.letterTypesPage.key')}</Label>
                <p className="font-mono text-sm">{selectedLetterType.key}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('dms.letterTypesPage.name')}</Label>
                <p>{selectedLetterType.name}</p>
              </div>
              {selectedLetterType.description && (
                <div>
                  <Label className="text-muted-foreground">{t('dms.letterTypesPage.description')}</Label>
                  <p>{selectedLetterType.description}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">{t('dms.letterTypesPage.status')}</Label>
                <Badge variant={selectedLetterType.active ? "default" : "secondary"}>
                  {selectedLetterType.active ? t('dms.letterTypesPage.active') : t('dms.letterTypesPage.inactive')}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dms.letterTypesPage.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dms.letterTypesPage.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dms.letterTypesPage.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('dms.letterTypesPage.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

