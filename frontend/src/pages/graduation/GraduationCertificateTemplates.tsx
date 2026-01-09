import {
  Plus,
  Pencil,
  Trash2,
  Image,
  FileText,
  Layout,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { GraduationCertificateLayoutEditor } from '@/components/certificates/GraduationCertificateLayoutEditor';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { CertificateLayoutConfig } from '@/hooks/useCertificateTemplates';
import {
  useCertificateTemplatesV2,
  useCreateCertificateTemplateV2,
  useUpdateCertificateTemplateV2,
  useDeleteCertificateTemplateV2,
  getGraduationCertificateBackgroundUrl,
} from '@/hooks/useGraduation';
import { formatDate } from '@/lib/utils';
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
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';

interface GraduationCertificateTemplate {
  id: string;
  organization_id: string;
  school_id: string | null;
  type: string;
  name: string;
  title: string;
  description: string | null;
  body_html: string | null;
  layout_config: CertificateLayoutConfig | null;
  background_image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Available font families including Bahij fonts
const fontFamilyOptions = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Bahij Nassim', label: 'Bahij Nassim (Regular)' },
  { value: 'Bahij Nassim-Bold', label: 'Bahij Nassim Bold' },
  { value: 'Bahij Nassim-Regular', label: 'Bahij Nassim Regular' },
  { value: 'Bahij Titr-Bold', label: 'Bahij Titr Bold' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
];

export default function GraduationCertificateTemplates() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GraduationCertificateTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [schoolId, setSchoolId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>({
    fontSize: 24,
    fontFamily: 'Arial',
    textColor: '#000000',
    rtl: true,
    enabledFields: ['header', 'studentName', 'fatherName', 'className', 'schoolName', 'academicYear', 'certificateNumber', 'graduationDate'],
    // Default positions (as percentages)
    headerPosition: { x: 50, y: 15 },
    studentNamePosition: { x: 50, y: 35 },
    fatherNamePosition: { x: 50, y: 42 },
    classNamePosition: { x: 50, y: 55 },
    schoolNamePosition: { x: 50, y: 65 },
    academicYearPosition: { x: 50, y: 72 },
    certificateNumberPosition: { x: 10, y: 90 },
    graduationDatePosition: { x: 90, y: 90 },
  });

  // Load all graduation templates (no school filter - show all templates for management)
  const { data: templates = [], isLoading } = useCertificateTemplatesV2({ type: 'graduation' });
  const { data: schools = [] } = useSchools();
  const createTemplate = useCreateCertificateTemplateV2();
  const updateTemplate = useUpdateCertificateTemplateV2();
  const deleteTemplate = useDeleteCertificateTemplateV2();

  // Auto-select default school if available
  useEffect(() => {
    if (schools.length > 0 && !schoolId && profile?.default_school_id) {
      setSchoolId(profile.default_school_id);
    } else if (schools.length === 1 && !schoolId) {
      // If only one school, auto-select it
      setSchoolId(schools[0].id);
    }
  }, [schools, profile?.default_school_id, schoolId]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setBackgroundImage(null);
    setSchoolId('');
    setIsActive(true);
    setLayoutConfig({
      fontSize: 24,
      fontFamily: 'Arial',
      textColor: '#000000',
      rtl: true,
    });
    setSelectedTemplate(null);
  };

  const handleOpenDialog = (template?: GraduationCertificateTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setName(template.name || template.title);
      setDescription(template.description || '');
      setSchoolId(template.school_id || '');
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
    if (!name.trim()) {
      alert('Template name is required');
      return;
    }

    const data = {
      type: 'graduation',
      title: name.trim(),
      name: name.trim(), // Backend also expects 'name' field
      description: description || null,
      background_image: backgroundImage,
      layout_config: layoutConfig,
      school_id: schoolId || undefined,
      is_active: isActive,
    };

    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({ id: selectedTemplate.id, data });
      } else {
        await createTemplate.mutateAsync(data);
      }
      // Close dialog and reset form after successful save
      // The query will automatically refetch, so the table will update
      handleCloseDialog();
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Don't close dialog on error so user can fix and retry
      if (import.meta.env.DEV) {
        console.error('Failed to save template:', error);
      }
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate.mutateAsync(templateToDelete);
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleOpenLayoutEditor = (template: GraduationCertificateTemplate) => {
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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImage(file);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('events.title') || 'Graduation Certificate Templates'}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('examPapers.createTemplate') || 'Create Template',
          onClick: () => handleOpenDialog(),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
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
                  <TableHead>{t('certificateTemplates.templateName') || 'Template Name'}</TableHead>
                  <TableHead>{t('events.description') || 'Description'}</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(templates as GraduationCertificateTemplate[]).map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {template.name || template.title}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {template.description || '-'}
                    </TableCell>
                    <TableCell>
                      {template.school_id ? (
                        schools.find(s => s.id === template.school_id)?.schoolName || template.school_id
                      ) : (
                        <span className="text-muted-foreground">All Schools</span>
                      )}
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
                      {formatDate(template.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLayoutEditor(template)}
                          title="Edit Layout"
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
              {selectedTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate
                ? 'Update the certificate template details and settings.'
                : 'Create a new certificate template for graduation certificates. All fields marked with * are required.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Graduation Certificate"
                />
              </div>
              <div className="space-y-2">
                <Label>School *</Label>
                <Select value={schoolId || ''} onValueChange={(value) => setSchoolId(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No schools available</div>
                    ) : (
                      schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.schoolName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!schoolId && (
                  <p className="text-xs text-destructive mt-1">School selection is required</p>
                )}
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div className="relative">
                    <Input
                      list="font-family-options"
                      value={layoutConfig.fontFamily || 'Arial'}
                      onChange={(e) => setLayoutConfig({ ...layoutConfig, fontFamily: e.target.value })}
                      placeholder="Type or select a font family"
                      className="pr-10"
                    />
                    <datalist id="font-family-options">
                      {fontFamilyOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type any font name or select from suggestions (includes Bahij fonts)
                  </p>
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
              disabled={!name || !schoolId || createTemplate.isPending || updateTemplate.isPending}
            >
              {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Editor Dialog */}
      {isLayoutEditorOpen && selectedTemplate && (
        <Dialog open={isLayoutEditorOpen} onOpenChange={setIsLayoutEditorOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Layout: {selectedTemplate.name || selectedTemplate.title}</DialogTitle>
              <DialogDescription>
                Customize the layout, positioning, and styling of certificate elements. Drag elements to reposition them.
              </DialogDescription>
            </DialogHeader>
            <GraduationCertificateLayoutEditor
              templateId={selectedTemplate.id}
              backgroundImageUrl={selectedTemplate.background_image_path ? getGraduationCertificateBackgroundUrl(selectedTemplate.id) : null}
              layoutConfig={layoutConfig}
              schoolId={selectedTemplate.school_id}
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
