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

import { CertificateLayoutEditor } from '@/components/certificates/CertificateLayoutEditor';
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
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { useLanguage } from '@/hooks/useLanguage';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { formatDate, formatDateTime } from '@/lib/utils';

// Available font families for certificate templates
// These fonts are supported by pdfmake for certificate generation
const fontFamilyOptions = [
  { value: 'Roboto', label: 'Roboto (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'BahijNassim', label: 'Bahij Nassim (RTL Support)' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Tahoma', label: 'Tahoma' },
];

export default function CertificateTemplates() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [courseId, setCourseId] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>({
    fontSize: 24,
    fontFamily: 'Roboto',
    textColor: '#000000',
    rtl: true,
    enabledFields: ['header', 'studentName', 'fatherName', 'courseName', 'certificateNumber', 'date'],
    // Default positions (as percentages)
    headerPosition: { x: 50, y: 15 },
    studentNamePosition: { x: 50, y: 35 },
    fatherNamePosition: { x: 50, y: 42 },
    courseNamePosition: { x: 50, y: 65 },
    certificateNumberPosition: { x: 10, y: 90 },
    datePosition: { x: 90, y: 90 },
  });

  const { data: templates = [], isLoading } = useCertificateTemplates();
  const { data: courses = [] } = useShortTermCourses();
  const createTemplate = useCreateCertificateTemplate();
  const updateTemplate = useUpdateCertificateTemplate();
  const deleteTemplate = useDeleteCertificateTemplate();
  const setDefaultTemplate = useSetDefaultCertificateTemplate();

  const resetForm = () => {
    setName('');
    setDescription('');
    setBackgroundImage(null);
    setCourseId('');
    setIsDefault(false);
    setIsActive(true);
    setLayoutConfig({
      fontSize: 24,
      fontFamily: 'Roboto',
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
      setCourseId(template.course_id || '');
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
      course_id: courseId || null,
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

  const handleOpenLayoutEditor = (template: CertificateTemplate) => {
    setSelectedTemplate(template);
    setLayoutConfig(template.layout_config || {});
    setIsLayoutEditorOpen(true);
  };

  const handleLayoutSave = async (newConfig: CertificateLayoutConfig) => {
    if (!selectedTemplate) return;
    
    await updateTemplate.mutateAsync({
      id: selectedTemplate.id,
      data: {
        layout_config: newConfig,
      },
    });
    
    setIsLayoutEditorOpen(false);
    // The updateTemplate mutation will automatically invalidate queries
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
        <h1 className="text-2xl font-bold">{t('certificateTemplates.title')}</h1>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('certificateTemplates.createTemplate') || t('examPapers.createTemplate')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('certificateTemplates.templates') || 'Templates'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">{t('certificateTemplates.noTemplatesYet') || 'No templates yet'}</p>
              <Button className="mt-4" onClick={() => handleOpenDialog()}>
                {t('certificateTemplates.createFirstTemplate') || 'Create Your First Template'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('certificateTemplates.templateName')}</TableHead>
                  <TableHead>{t('events.description')}</TableHead>
                  <TableHead>{t('certificateTemplates.background') || 'Background'}</TableHead>
                  <TableHead>{t('certificateTemplates.status') || 'Status'}</TableHead>
                  <TableHead>{t('certificateTemplates.created') || 'Created'}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
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
                            {t('certificateTemplates.default') || 'Default'}
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
                          <span className="text-sm">{t('certificateTemplates.yes') || 'Yes'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">{t('certificateTemplates.none') || 'None'}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? (t('certificateTemplates.active') || 'Active') : (t('certificateTemplates.inactive') || 'Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(template.created_at)}
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
                          onClick={() => handleOpenLayoutEditor(template)}
                          title={t('certificateTemplates.editLayout') || 'Edit Layout'}
                        >
                          <Layout className="h-4 w-4" />
                        </Button>
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
              {selectedTemplate ? (t('certificateTemplates.editTemplate') || 'Edit Template') : (t('certificateTemplates.createTemplate') || 'Create Template')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('certificateTemplates.templateNameRequired') || 'Template Name *'}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('certificateTemplates.templateNamePlaceholder') || 'e.g., Course Completion Certificate'}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('certificateTemplates.courseOptional') || 'Course (Optional)'}</Label>
                <Select value={courseId || 'none'} onValueChange={(value) => setCourseId(value === 'none' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('certificateTemplates.selectCourseOptional') || 'Select a course (optional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('certificateTemplates.noneGeneralTemplate') || 'None (General Template)'}</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('certificateTemplates.assignTemplateToCourse') || 'Assign this template to a specific course. Select "None" for general use.'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('certificateTemplates.backgroundImage') || 'Background Image'}</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {selectedTemplate?.background_image_path && !backgroundImage && (
                <p className="text-sm text-muted-foreground">{t('certificateTemplates.currentImageKept') || 'Current image will be kept'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('certificateTemplates.description') || 'Description'}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('certificateTemplates.descriptionPlaceholder') || 'Description of this template...'}
                rows={2}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">{t('certificateTemplates.layoutSettings') || 'Layout Settings'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('certificateTemplates.fontSize') || 'Font Size'}</Label>
                  <Input
                    type="number"
                    value={layoutConfig.fontSize || 24}
                    onChange={(e) => setLayoutConfig({ ...layoutConfig, fontSize: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('certificateTemplates.fontFamily') || 'Font Family'}</Label>
                  <Select
                    value={layoutConfig.fontFamily || 'Roboto'}
                    onValueChange={(value) => setLayoutConfig({ ...layoutConfig, fontFamily: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('certificateTemplates.selectFontFamily') || 'Select font family'} />
                    </SelectTrigger>
                    <SelectContent>
                      {fontFamilyOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('certificateTemplates.fontFamilyHint') || 'Select a font family for the certificate text. Bahij Nassim is recommended for RTL languages (Pashto, Arabic, Farsi).'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('certificateTemplates.textColor') || 'Text Color'}</Label>
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
                <Label>{t('certificateTemplates.rtlForPashtoArabic') || 'Right-to-Left (RTL) for Pashto/Arabic'}</Label>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isDefault}
                  onCheckedChange={setIsDefault}
                />
                <Label>{t('certificateTemplates.setAsDefault') || 'Set as Default'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label>{t('certificateTemplates.active') || 'Active'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('certificateTemplates.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? (t('certificateTemplates.saving') || 'Saving...') : (t('certificateTemplates.saveTemplate') || 'Save Template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Editor Dialog */}
      {isLayoutEditorOpen && selectedTemplate && (
        <Dialog open={isLayoutEditorOpen} onOpenChange={setIsLayoutEditorOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('certificateTemplates.editLayoutTitle', { name: selectedTemplate.name }) || `Edit Layout: ${selectedTemplate.name}`}</DialogTitle>
            </DialogHeader>
            <CertificateLayoutEditor
              templateId={selectedTemplate.id}
              backgroundImageUrl={selectedTemplate.background_image_path ? getCertificateBackgroundUrl(selectedTemplate.id) : null}
              layoutConfig={layoutConfig}
              courseId={selectedTemplate.course_id}
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
            <AlertDialogTitle>{t('certificateTemplates.deleteTemplate') || 'Delete Template'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('certificateTemplates.deleteTemplateConfirm') || 'Are you sure you want to delete this certificate template? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('certificateTemplates.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('certificateTemplates.delete') || 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
