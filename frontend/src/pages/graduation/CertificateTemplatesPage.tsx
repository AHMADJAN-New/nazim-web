import { useState } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  useCertificateTemplatesV2, 
  useCreateCertificateTemplateV2,
  useUpdateCertificateTemplateV2,
  useDeleteCertificateTemplateV2,
  getGraduationCertificateBackgroundUrl,
} from '@/hooks/useGraduation';
import { CertificateLayoutConfig } from '@/hooks/useCertificateTemplates';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { GraduationCertificateLayoutEditor } from '@/components/certificates/GraduationCertificateLayoutEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Layout, Pencil, Trash2, Image } from 'lucide-react';
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

export default function CertificateTemplatesPage() {
  const { t } = useLanguage();
  const { data: templates = [], isLoading } = useCertificateTemplatesV2({ type: 'graduation' });
  const { data: schools = [] } = useSchools();
  const createTemplate = useCreateCertificateTemplateV2();
  const updateTemplate = useUpdateCertificateTemplateV2();
  const deleteTemplate = useDeleteCertificateTemplateV2();
  
  const [isLayoutEditorOpen, setIsLayoutEditorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<GraduationCertificateTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<CertificateLayoutConfig>({});

  const [form, setForm] = useState({
    title: '',
    type: 'graduation' as const,
    school_id: '',
    description: '',
    body_html: '',
    rtl: true,
    page_size: 'A4' as 'A4' | 'A5' | 'custom',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTemplate.mutateAsync({
      type: form.type,
      title: form.title,
      school_id: form.school_id || undefined,
      description: form.description || null,
      body_html: form.body_html || null,
      rtl: form.rtl,
      page_size: form.page_size,
      is_active: form.is_active,
    });
    setForm((prev) => ({ 
      ...prev, 
      title: '', 
      description: '',
      body_html: '',
      school_id: '',
    }));
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

  const handleDelete = async () => {
    if (!templateToDelete) return;
    await deleteTemplate.mutateAsync(templateToDelete);
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('certificates.templates') ?? 'Certificate Templates'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground">No templates yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title') ?? 'Title'}</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead>{t('common.statusLabel') ?? 'Status'}</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">{t('common.actions') ?? 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(templates as GraduationCertificateTemplate[]).map((tpl) => (
                  <TableRow key={tpl.id}>
                    <TableCell>{tpl.title || tpl.name}</TableCell>
                    <TableCell>
                      {tpl.school_id ? (
                        schools.find(s => s.id === tpl.school_id)?.schoolName || tpl.school_id
                      ) : (
                        <span className="text-muted-foreground">All Schools</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tpl.background_image_path ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <Image className="h-4 w-4" />
                          <span className="text-sm">Yes</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tpl.is_active ? 'default' : 'secondary'}>
                        {tpl.is_active ? t('common.active') ?? 'Active' : t('common.inactive') ?? 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(tpl.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {tpl.layout_config && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenLayoutEditor(tpl)}
                            title="Edit Layout"
                          >
                            <Layout className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTemplateToDelete(tpl.id);
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

      <Card>
        <CardHeader>
          <CardTitle>{t('common.create')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('common.title') ?? 'Title'} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>School (Optional)</Label>
                <Select 
                  value={form.school_id || 'none'} 
                  onValueChange={(val) => setForm((prev) => ({ ...prev, school_id: val === 'none' ? '' : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a school (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (General Template)</SelectItem>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  placeholder="Description of this template..."
                />
              </div>
              <div className="md:col-span-2">
                <Label>{t('common.body') ?? 'Body HTML'} (Optional - for backward compatibility)</Label>
                <Textarea
                  value={form.body_html}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_html: e.target.value }))}
                  rows={4}
                  placeholder="HTML template with placeholders like {{student_name}}"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Use the Layout Editor button to create templates with drag-and-drop positioning.
                </p>
              </div>
              <div>
                <Label>{t('common.pageSize') ?? 'Page Size'}</Label>
                <Select
                  value={form.page_size}
                  onValueChange={(val) => setForm((prev) => ({ ...prev, page_size: val as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="A5">A5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.rtl}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, rtl: val }))}
                />
                <Label>{t('common.rtl') ?? 'RTL'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(val) => setForm((prev) => ({ ...prev, is_active: val }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createTemplate.isPending || !form.title}>
                {createTemplate.isPending ? 'Saving...' : t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
