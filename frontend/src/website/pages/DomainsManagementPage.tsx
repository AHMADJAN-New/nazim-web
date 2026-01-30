import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Globe, Search, CheckCircle2, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteDomains,
  useCreateWebsiteDomain,
  useUpdateWebsiteDomain,
  useDeleteWebsiteDomain,
  type WebsiteDomain,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { formatDate } from '@/lib/utils';

const domainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').max(255),
  isPrimary: z.boolean().default(false),
  verificationStatus: z.string().optional().nullable(),
  sslStatus: z.string().optional().nullable(),
});

type DomainFormData = z.infer<typeof domainSchema>;

export default function DomainsManagementPage() {
  const { t } = useLanguage();
  const { data: domains = [], isLoading } = useWebsiteDomains();
  const createDomain = useCreateWebsiteDomain();
  const updateDomain = useUpdateWebsiteDomain();
  const deleteDomain = useDeleteWebsiteDomain();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDomain, setEditDomain] = useState<WebsiteDomain | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      domain: '',
      isPrimary: false,
      verificationStatus: null,
      sslStatus: null,
    },
  });

  const filteredDomains = useMemo(() => {
    return domains.filter((domain) => {
      return domain.domain.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [domains, searchQuery]);

  const handleCreate = async (data: DomainFormData) => {
    await createDomain.mutateAsync({
      domain: data.domain,
      isPrimary: data.isPrimary,
      verificationStatus: data.verificationStatus,
      sslStatus: data.sslStatus,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: DomainFormData) => {
    if (!editDomain) return;
    await updateDomain.mutateAsync({
      id: editDomain.id,
      domain: data.domain,
      isPrimary: data.isPrimary,
      verificationStatus: data.verificationStatus,
      sslStatus: data.sslStatus,
    });
    setEditDomain(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDomain.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (domain: WebsiteDomain) => {
    setEditDomain(domain);
    form.reset({
      domain: domain.domain,
      isPrimary: domain.isPrimary ?? false,
      verificationStatus: domain.verificationStatus,
      sslStatus: domain.sslStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.domains.title')}
        description={t('websiteAdmin.domains.description')}
        icon={<Globe className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.domains.new'),
          onClick: () => {
            form.reset();
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="space-y-2">
          <Label>{t('websiteAdmin.common.search')}</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('websiteAdmin.domains.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </FilterPanel>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('websiteAdmin.domains.fields.domain')}</TableHead>
                <TableHead>{t('websiteAdmin.domains.fields.primary')}</TableHead>
                <TableHead>{t('websiteAdmin.domains.fields.verificationStatus')}</TableHead>
                <TableHead>{t('websiteAdmin.domains.fields.sslStatus')}</TableHead>
                <TableHead>{t('websiteAdmin.common.created')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.domains.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDomains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>
                      {domain.isPrimary ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={domain.verificationStatus || 'unverified'} />
                    </TableCell>
                    <TableCell>
                      {domain.sslStatus === 'active' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(domain.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(domain)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.domains.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.domains.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">{t('websiteAdmin.domains.fields.domain')} *</Label>
              <Input id="domain" {...form.register('domain')} placeholder={t('websiteAdmin.domains.placeholders.domain')} />
              {form.formState.errors.domain && (
                <p className="text-sm text-destructive">{form.formState.errors.domain.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isPrimary"
                checked={form.watch('isPrimary')}
                onCheckedChange={(checked) => form.setValue('isPrimary', checked)}
              />
              <Label htmlFor="isPrimary">{t('websiteAdmin.domains.fields.primary')}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationStatus">{t('websiteAdmin.domains.fields.verificationStatus')}</Label>
              <Select
                value={form.watch('verificationStatus') || ''}
                onValueChange={(value) => form.setValue('verificationStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.domains.placeholders.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('websiteAdmin.common.notSet')}</SelectItem>
                  <SelectItem value="verified">{t('websiteAdmin.statuses.verified')}</SelectItem>
                  <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                  <SelectItem value="unverified">{t('websiteAdmin.statuses.unverified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sslStatus">{t('websiteAdmin.domains.fields.sslStatus')}</Label>
              <Select
                value={form.watch('sslStatus') || ''}
                onValueChange={(value) => form.setValue('sslStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.domains.placeholders.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('websiteAdmin.common.notSet')}</SelectItem>
                  <SelectItem value="active">{t('websiteAdmin.statuses.active')}</SelectItem>
                  <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                  <SelectItem value="expired">{t('websiteAdmin.statuses.expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createDomain.isPending}>
                {t('common.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDomain} onOpenChange={(open) => !open && setEditDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.domains.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.domains.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-domain">{t('websiteAdmin.domains.fields.domain')} *</Label>
              <Input id="edit-domain" {...form.register('domain')} />
              {form.formState.errors.domain && (
                <p className="text-sm text-destructive">{form.formState.errors.domain.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isPrimary"
                checked={form.watch('isPrimary')}
                onCheckedChange={(checked) => form.setValue('isPrimary', checked)}
              />
              <Label htmlFor="edit-isPrimary">{t('websiteAdmin.domains.fields.primary')}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-verificationStatus">{t('websiteAdmin.domains.fields.verificationStatus')}</Label>
              <Select
                value={form.watch('verificationStatus') || ''}
                onValueChange={(value) => form.setValue('verificationStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.domains.placeholders.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('websiteAdmin.common.notSet')}</SelectItem>
                  <SelectItem value="verified">{t('websiteAdmin.statuses.verified')}</SelectItem>
                  <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                  <SelectItem value="unverified">{t('websiteAdmin.statuses.unverified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sslStatus">{t('websiteAdmin.domains.fields.sslStatus')}</Label>
              <Select
                value={form.watch('sslStatus') || ''}
                onValueChange={(value) => form.setValue('sslStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.domains.placeholders.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('websiteAdmin.common.notSet')}</SelectItem>
                  <SelectItem value="active">{t('websiteAdmin.statuses.active')}</SelectItem>
                  <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                  <SelectItem value="expired">{t('websiteAdmin.statuses.expired')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDomain(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateDomain.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.domains.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.domains.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteDomain.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

