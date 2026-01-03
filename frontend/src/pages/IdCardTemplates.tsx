import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Image,
  FileText,
  Layout,
} from 'lucide-react';
import React, { useState } from 'react';

import { IdCardLayoutEditor } from '@/components/id-cards/IdCardLayoutEditor';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useIdCardTemplates,
  useCreateIdCardTemplate,
  useUpdateIdCardTemplate,
  useDeleteIdCardTemplate,
  useSetDefaultIdCardTemplate,
  IdCardTemplate,
  IdCardLayoutConfig,
  getIdCardBackgroundUrl,
} from '@/hooks/useIdCardTemplates';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

export default function IdCardTemplates() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IdCardTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundImageFront, setBackgroundImageFront] = useState<File | null>(null);
  const [backgroundImageBack, setBackgroundImageBack] = useState<File | null>(null);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [layoutConfigFront, setLayoutConfigFront] = useState<IdCardLayoutConfig>({
    fontSize: 12,
    fontFamily: 'Arial',
    textColor: '#000000',
    rtl: false,
    enabledFields: ['studentName', 'studentCode', 'admissionNumber', 'class', 'studentPhoto', 'qrCode'],
  });
  const [layoutConfigBack, setLayoutConfigBack] = useState<IdCardLayoutConfig>({
    fontSize: 10,
    fontFamily: 'Arial',
    textColor: '#000000',
    rtl: false,
    enabledFields: ['schoolName', 'expiryDate', 'cardNumber'],
  });

  const { data: templates = [], isLoading } = useIdCardTemplates();
  const createTemplate = useCreateIdCardTemplate();
  const updateTemplate = useUpdateIdCardTemplate();
  const deleteTemplate = useDeleteIdCardTemplate();
  const setDefaultTemplate = useSetDefaultIdCardTemplate();

  const resetForm = () => {
    setName('');
    setDescription('');
    setBackgroundImageFront(null);
    setBackgroundImageBack(null);
    setIsDefault(false);
    setIsActive(true);
    setLayoutConfigFront({
      fontSize: 12,
      fontFamily: 'Arial',
      textColor: '#000000',
      rtl: false,
      enabledFields: ['studentName', 'studentCode', 'admissionNumber', 'class', 'studentPhoto', 'qrCode'],
    });
    setLayoutConfigBack({
      fontSize: 10,
      fontFamily: 'Arial',
      textColor: '#000000',
      rtl: false,
      enabledFields: ['schoolName', 'expiryDate', 'cardNumber'],
    });
    setSelectedTemplate(null);
  };

  const handleOpenDialog = (template?: IdCardTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setName(template.name);
      setDescription(template.description || '');
      setIsDefault(template.isDefault);
      setIsActive(template.isActive);
      setLayoutConfigFront(template.layoutConfigFront || {});
      setLayoutConfigBack(template.layoutConfigBack || {});
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
      background_image_front: backgroundImageFront,
      background_image_back: backgroundImageBack,
      layout_config_front: layoutConfigFront,
      layout_config_back: layoutConfigBack,
      card_size: 'CR80',
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

  const handleOpenLayoutEditor = (template: IdCardTemplate) => {
    setSelectedTemplate(template);
    setLayoutConfigFront(template.layoutConfigFront || {});
    setLayoutConfigBack(template.layoutConfigBack || {});
    setIsLayoutEditorOpen(true);
  };

  const handleLayoutSave = async (newConfigFront: IdCardLayoutConfig, newConfigBack: IdCardLayoutConfig) => {
    if (!selectedTemplate) return;
    
    await updateTemplate.mutateAsync({
      id: selectedTemplate.id,
      data: {
        layout_config_front: newConfigFront,
        layout_config_back: newConfigBack,
      },
    });
    
    setIsLayoutEditorOpen(false);
  };

  const handleFileChangeFront = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFront(file);
    }
  };

  const handleFileChangeBack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageBack(file);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">{t('idCards.title') || 'ID Card Templates'}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden md:block">
                {t('idCards.description') || 'Create and manage ID card templates for your organization'}
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="ml-2">{t('idCards.createTemplate') || 'Create Template'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('idCards.noTemplates') || 'No templates yet'}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                {t('idCards.createFirstTemplate') || 'Create Your First Template'}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('idCards.templateName') || 'Template Name'}</TableHead>
                  <TableHead>{t('idCards.description') || 'Description'}</TableHead>
                  <TableHead>{t('idCards.background') || 'Background'}</TableHead>
                  <TableHead>{t('idCards.status') || 'Status'}</TableHead>
                  <TableHead>{t('idCards.created') || 'Created'}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.isDefault && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            {t('idCards.default') || 'Default'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.backgroundImagePathFront ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Image className="h-4 w-4" />
                            <span className="text-sm">{t('idCards.front') || 'Front'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('idCards.none') || 'None'}</span>
                        )}
                        {template.backgroundImagePathBack && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Image className="h-4 w-4" />
                            <span className="text-sm">{t('idCards.back') || 'Back'}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? (t('idCards.active') || 'Active') : (t('idCards.inactive') || 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(template.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5 sm:gap-2">
                        {!template.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(template.id)}
                            className="flex-shrink-0"
                            aria-label={t('idCards.setAsDefault') || 'Set as Default'}
                          >
                            <Star className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">{t('idCards.setAsDefault') || 'Set as Default'}</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLayoutEditor(template)}
                          className="flex-shrink-0"
                          aria-label={t('idCards.editLayout') || 'Edit Layout'}
                        >
                          <Layout className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">{t('idCards.editLayout') || 'Edit Layout'}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(template)}
                          className="flex-shrink-0"
                          aria-label={t('common.edit') || 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">{t('common.edit') || 'Edit'}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTemplateToDelete(template.id);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="flex-shrink-0"
                          aria-label={t('common.delete') || 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">{t('common.delete') || 'Delete'}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? (t('idCards.editTemplate') || 'Edit Template') : (t('idCards.createTemplate') || 'Create Template')}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate 
                ? (t('idCards.editTemplateDescription') || 'Update the ID card template settings and configuration.')
                : (t('idCards.createTemplateDescription') || 'Create a new ID card template with custom layout and styling.')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('idCards.templateName') || 'Template Name'} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('idCards.templateNamePlaceholder') || 'e.g., Student ID Card'}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('idCards.description') || 'Description'}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('idCards.descriptionPlaceholder') || 'Description of this template...'}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('idCards.backgroundFront') || 'Background Image (Front)'}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChangeFront}
                />
                {selectedTemplate?.backgroundImagePathFront && !backgroundImageFront && (
                  <p className="text-sm text-muted-foreground">{t('idCards.currentImageKept') || 'Current image will be kept'}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('idCards.backgroundBack') || 'Background Image (Back)'}</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChangeBack}
                />
                {selectedTemplate?.backgroundImagePathBack && !backgroundImageBack && (
                  <p className="text-sm text-muted-foreground">{t('idCards.currentImageKept') || 'Current image will be kept'}</p>
                )}
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label>{t('idCards.setAsDefault') || 'Set as Default'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label>{t('idCards.active') || 'Active'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending 
                ? (t('common.saving') || 'Saving...') 
                : (t('common.save') || 'Save Template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Editor Dialog */}
      {isLayoutEditorOpen && selectedTemplate && (
        <Dialog open={isLayoutEditorOpen} onOpenChange={setIsLayoutEditorOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('idCards.editLayout') || 'Edit Layout'}: {selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                {t('idCards.editLayoutDescription') || 'Customize the layout, positioning, and styling of ID card elements. Drag elements to reposition them.'}
              </DialogDescription>
            </DialogHeader>
            <IdCardLayoutEditor
              templateId={selectedTemplate.id}
              backgroundImageUrlFront={selectedTemplate.backgroundImagePathFront ? getIdCardBackgroundUrl(selectedTemplate.id, 'front') : null}
              backgroundImageUrlBack={selectedTemplate.backgroundImagePathBack ? getIdCardBackgroundUrl(selectedTemplate.id, 'back') : null}
              layoutConfigFront={layoutConfigFront}
              layoutConfigBack={layoutConfigBack}
              onSave={handleLayoutSave}
              onCancel={() => setIsLayoutEditorOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('idCards.deleteTemplate') || 'Delete Template'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('idCards.deleteConfirmation') || 'Are you sure you want to delete this ID card template? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

