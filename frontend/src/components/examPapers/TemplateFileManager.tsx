import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Eye, Star, MoreHorizontal, Code } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useExamPaperTemplateFiles, useCreateExamPaperTemplateFile, useUpdateExamPaperTemplateFile, useDeleteExamPaperTemplateFile, useSetDefaultTemplateFile, usePreviewTemplateFile, type ExamPaperTemplateFile } from '@/hooks/useExamPaperTemplateFiles';
import { useLanguage } from '@/hooks/useLanguage';
import { examPaperTemplateFileSchema, type ExamPaperTemplateFileFormData } from '@/lib/validations/examPaperTemplateFile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const languageConfig: Record<'en' | 'ps' | 'fa' | 'ar', { label: string; isRtl: boolean }> = {
  en: { label: 'English', isRtl: false },
  ps: { label: 'Pashto', isRtl: true },
  fa: { label: 'Farsi', isRtl: true },
  ar: { label: 'Arabic', isRtl: true },
};

interface TemplateFileManagerProps {
  onSelect?: (templateFile: ExamPaperTemplateFile) => void;
  selectedLanguage?: 'en' | 'ps' | 'fa' | 'ar';
}

export function TemplateFileManager({ onSelect, selectedLanguage }: TemplateFileManagerProps) {
  const { t } = useLanguage();
  const [languageFilter, setLanguageFilter] = useState<'en' | 'ps' | 'fa' | 'ar' | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<ExamPaperTemplateFile | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // Data hooks
  const { data: templateFiles, isLoading } = useExamPaperTemplateFiles({
    language: languageFilter !== 'all' ? languageFilter : undefined,
  });

  // Mutations
  const createTemplateFile = useCreateExamPaperTemplateFile();
  const updateTemplateFile = useUpdateExamPaperTemplateFile();
  const deleteTemplateFile = useDeleteExamPaperTemplateFile();
  const setDefaultTemplateFile = useSetDefaultTemplateFile();
  const previewTemplateFile = usePreviewTemplateFile();

  // Form setup
  const form = useForm<ExamPaperTemplateFileFormData>({
    resolver: zodResolver(examPaperTemplateFileSchema),
    defaultValues: {
      name: '',
      description: '',
      language: selectedLanguage || 'en',
      templateHtml: '',
      cssStyles: '',
      isDefault: false,
      isActive: true,
    },
  });

  const resetForm = () => {
    form.reset({
      name: '',
      description: '',
      language: selectedLanguage || 'en',
      templateHtml: '',
      cssStyles: '',
      isDefault: false,
      isActive: true,
    });
  };

  const handleCreate = async (data: ExamPaperTemplateFileFormData) => {
    createTemplateFile.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        resetForm();
      },
    });
  };

  const handleUpdate = async (data: ExamPaperTemplateFileFormData) => {
    if (!selectedTemplateFile) return;

    updateTemplateFile.mutate({
      id: selectedTemplateFile.id,
      ...data,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        resetForm();
        setSelectedTemplateFile(null);
      },
    });
  };

  const handleDelete = () => {
    if (!selectedTemplateFile) return;
    deleteTemplateFile.mutate(selectedTemplateFile.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setSelectedTemplateFile(null);
      },
    });
  };

  const handleSetDefault = (templateFile: ExamPaperTemplateFile) => {
    setDefaultTemplateFile.mutate(templateFile.id);
  };

  const handlePreview = async (templateFile: ExamPaperTemplateFile) => {
    setSelectedTemplateFile(templateFile);
    previewTemplateFile.mutate(templateFile.id, {
      onSuccess: (response) => {
        setPreviewHtml(response.html);
        setIsPreviewDialogOpen(true);
      },
    });
  };

  const handleEdit = (templateFile: ExamPaperTemplateFile) => {
    setSelectedTemplateFile(templateFile);
    form.reset({
      name: templateFile.name,
      description: templateFile.description || '',
      language: templateFile.language,
      templateHtml: templateFile.templateHtml,
      cssStyles: templateFile.cssStyles || '',
      isDefault: templateFile.isDefault,
      isActive: templateFile.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const filteredTemplateFiles = useMemo(() => {
    if (!templateFiles) return [];
    if (languageFilter === 'all') return templateFiles;
    return templateFiles.filter(tf => tf.language === languageFilter);
  }, [templateFiles, languageFilter]);

  const TemplateFileFormFields = () => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          {...form.register('name')}
          placeholder="e.g., Default Pashto Template"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register('description')}
          rows={2}
          placeholder="Optional description..."
        />
      </div>

      <div>
        <Label htmlFor="language">Language *</Label>
        <Controller
          control={form.control}
          name="language"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ps">Pashto</SelectItem>
                <SelectItem value="fa">Farsi</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.language && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.language.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="templateHtml">Template HTML *</Label>
        <Textarea
          id="templateHtml"
          {...form.register('templateHtml')}
          rows={15}
          className="font-mono text-sm"
          placeholder="<!DOCTYPE html>..."
        />
        {form.formState.errors.templateHtml && (
          <p className="text-sm text-destructive mt-1">{form.formState.errors.templateHtml.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="cssStyles">CSS Styles (Optional)</Label>
        <Textarea
          id="cssStyles"
          {...form.register('cssStyles')}
          rows={8}
          className="font-mono text-sm"
          placeholder="/* Additional CSS styles */"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          control={form.control}
          name="isDefault"
          render={({ field }) => (
            <Switch
              id="isDefault"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isDefault" className="cursor-pointer">
          Set as default for this language
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Switch
              id="isActive"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Active
        </Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Files</h2>
          <p className="text-sm text-muted-foreground">
            Manage HTML templates for exam papers
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template File
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Language:</Label>
          <Select value={languageFilter} onValueChange={(value) => setLanguageFilter(value as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="ps">Pashto</SelectItem>
              <SelectItem value="fa">Farsi</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredTemplateFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No template files found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplateFiles.map((templateFile) => (
                  <TableRow key={templateFile.id}>
                    <TableCell className="font-medium">{templateFile.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {languageConfig[templateFile.language].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {templateFile.isDefault ? (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {templateFile.isActive ? (
                        <Badge variant="outline" className="text-green-600">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                      )}
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
                          <DropdownMenuItem onClick={() => handlePreview(templateFile)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(templateFile)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {!templateFile.isDefault && (
                            <DropdownMenuItem onClick={() => handleSetDefault(templateFile)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          {onSelect && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onSelect(templateFile)}>
                                <Code className="h-4 w-4 mr-2" />
                                Select
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplateFile(templateFile);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Template File</DialogTitle>
            <DialogDescription>
              Create a new HTML template file for exam papers
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)}>
            <TemplateFileFormFields />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTemplateFile.isPending}>
                {createTemplateFile.isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template File</DialogTitle>
            <DialogDescription>
              Update the template file
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)}>
            <TemplateFileFormFields />
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetForm();
                  setSelectedTemplateFile(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTemplateFile.isPending}>
                {updateTemplateFile.isPending ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTemplateFile?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of {selectedTemplateFile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewTemplateFile.isPending ? (
              <div className="text-center py-8">Loading preview...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border-0"
                  title="Template Preview"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(previewHtml);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              Print Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

