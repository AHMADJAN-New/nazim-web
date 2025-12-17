import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCertificateTemplatesV2, useCreateCertificateTemplateV2 } from '@/hooks/useGraduation';
import { useLanguage } from '@/hooks/useLanguage';

export default function CertificateTemplatesPage() {
  const { t } = useLanguage();
  const { data: templates = [], isLoading } = useCertificateTemplatesV2();
  const createTemplate = useCreateCertificateTemplateV2();

  const [form, setForm] = useState({
    title: '',
    type: 'graduation',
    body_html: '<h1>{{student_name}}</h1>',
    rtl: true,
    page_size: 'A4' as 'A4' | 'A5' | 'custom',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTemplate.mutateAsync(form);
    setForm((prev) => ({ ...prev, title: '', body_html: prev.body_html }));
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title') ?? 'Title'}</TableHead>
                  <TableHead>{t('common.type') ?? 'Type'}</TableHead>
                  <TableHead>{t('common.statusLabel')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl: any) => (
                  <TableRow key={tpl.id}>
                    <TableCell>{tpl.title || tpl.name}</TableCell>
                    <TableCell className="capitalize">{tpl.type}</TableCell>
                    <TableCell>{tpl.is_active ? t('common.active') ?? 'Active' : t('common.inactive') ?? 'Inactive'}</TableCell>
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
                <Label>{t('common.title') ?? 'Title'}</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>{t('common.type') ?? 'Type'}</Label>
                <Select value={form.type} onValueChange={(val) => setForm((prev) => ({ ...prev, type: val as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="completion">Completion</SelectItem>
                    <SelectItem value="merit">Merit</SelectItem>
                    <SelectItem value="appreciation">Appreciation</SelectItem>
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
              <div className="md:col-span-2">
                <Label>{t('common.body') ?? 'Body HTML'}</Label>
                <Textarea
                  value={form.body_html}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_html: e.target.value }))}
                  rows={8}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={createTemplate.isPending}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
