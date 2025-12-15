import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLetterTypes, useCreateLetterType, useUpdateLetterType, useDeleteLetterType } from "@/hooks/useLetterTypes";
import type { LetterTypeEntity } from "@/types/dms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/hooks/useLanguage";
import { Search, Plus, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const letterTypeFormSchema = z.object({
  key: z.string().min(1, "Key is required").max(50, "Key must be 50 characters or less").regex(/^[a-z0-9_]+$/, "Key must contain only lowercase letters, numbers, and underscores"),
  name: z.string().min(1, "Name is required").max(255, "Name must be 255 characters or less"),
  description: z.string().max(1000, "Description must be 1000 characters or less").optional().nullable(),
  active: z.boolean().default(true),
});

type LetterTypeFormData = z.infer<typeof letterTypeFormSchema>;

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
            <CardTitle>Letter Types</CardTitle>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Letter Type
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
                  placeholder="Search by name, key, or description..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filters.active} onValueChange={(value) => setFilters({ ...filters, active: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredLetterTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No letter types found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {letterType.active ? "Active" : "Inactive"}
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLetterType(letterType);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLetterType(letterType);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
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
                            Delete
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
            <DialogTitle>Create Letter Type</DialogTitle>
            <DialogDescription>Add a new letter type for organizing templates and letterheads.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreate(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-key"
                {...registerCreate("key")}
                placeholder="e.g., application, moe_letter"
                className="font-mono"
              />
              {errorsCreate.key && <p className="text-sm text-destructive">{errorsCreate.key.message}</p>}
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and underscores only</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="create-name" {...registerCreate("name")} placeholder="e.g., Application Letters" />
              {errorsCreate.name && <p className="text-sm text-destructive">{errorsCreate.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                {...registerCreate("description")}
                placeholder="Optional description..."
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
              <Label htmlFor="create-active">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Letter Type</DialogTitle>
            <DialogDescription>Update the letter type information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-key">
                Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-key"
                {...registerEdit("key")}
                placeholder="e.g., application, moe_letter"
                className="font-mono"
              />
              {errorsEdit.key && <p className="text-sm text-destructive">{errorsEdit.key.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="edit-name" {...registerEdit("name")} placeholder="e.g., Application Letters" />
              {errorsEdit.name && <p className="text-sm text-destructive">{errorsEdit.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                {...registerEdit("description")}
                placeholder="Optional description..."
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
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Letter Type Details</DialogTitle>
          </DialogHeader>
          {selectedLetterType && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Key</Label>
                <p className="font-mono text-sm">{selectedLetterType.key}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p>{selectedLetterType.name}</p>
              </div>
              {selectedLetterType.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p>{selectedLetterType.description}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={selectedLetterType.active ? "default" : "secondary"}>
                  {selectedLetterType.active ? "Active" : "Inactive"}
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
            <AlertDialogTitle>Delete Letter Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this letter type? This action cannot be undone. The letter type cannot be deleted if it's in use by templates or letterheads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

