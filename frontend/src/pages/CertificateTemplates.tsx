import React, { useState } from 'react';
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useUpdateCertificateTemplate,
  useDeleteCertificateTemplate,
  useSetDefaultCertificateTemplate,
  CertificateTemplate,
  CertificateLayoutConfig,
  getCertificateBackgroundUrl,
} from '@/hooks/useCertificateTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Image,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CertificateTemplates() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>({
    fontSize: 24,
    fontFamily: 'Arial',
    textColor: '#000000',
    rtl: true,
  });

  const { data: templates = [], isLoading } = useCertificateTemplates();
  const createTemplate = useCreateCertificateTemplate();
  const updateTemplate = useUpdateCertificateTemplate();
  const deleteTemplate = useDeleteCertificateTemplate();
  const setDefaultTemplate = useSetDefaultCertificateTemplate();

  const resetForm = () => {
    setName('');
    setDescription('');
    setBackgroundImage(null);
    setIsDefault(false);
    setIsActive(true);
    setLayoutConfig({
      fontSize: 24,
      fontFamily: 'Arial',
      textColor: '#000000',
      rtl: true,
    });
    setSelectedTemplate(null);
  };

  const handleOpenDialog = (template?: CertificateTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setName(template.name);
      setDescription(template.description || '');
      setIsDefault(template.is_default);
      setIsActive(template.is_active);
      setLayoutConfig(template.layout_config || {});
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    const data = {
      name,
      description: description || null,
      background_image: backgroundImage,
      layout_config: layoutConfig,
      is_default: isDefault,
      is_active: isActive,
    };

    if (selectedTemplate) {
      await updateTemplate.mutateAsync({ id: selectedTemplate.id, data });
    } else {
      await createTemplate.mutateAsync(data);
    }
    handleCloseDialog();
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate.mutateAsync(templateToDelete);
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultTemplate.mutateAsync(id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImage(file);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Certificate Templates</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No templates yet</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                Create Your First Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      {template.background_image_path ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Image className="h-4 w-4" />
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!template.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(template.id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTemplateToDelete(template.id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Course Completion Certificate"
                />
              </div>
              <div className="space-y-2">
                <Label>Background Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {selectedTemplate?.background_image_path && !backgroundImage && (
                  <p className="text-sm text-muted-foreground">Current image will be kept</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of this template..."
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Layout Settings</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={layoutConfig.fontSize || 24}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fontSize: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Input
                    value={layoutConfig.fontFamily || 'Arial'}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fontFamily: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <Input
                    type="color"
                    value={layoutConfig.textColor || '#000000'}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, textColor: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={layoutConfig.rtl ?? true}
                  onCheckedChange={(checked) => setLayoutConfig({ ...layoutConfig, rtl: checked })}
                />
                <Label>Right-to-Left (RTL) for Pashto/Arabic</Label>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label>Set as Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this certificate template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
