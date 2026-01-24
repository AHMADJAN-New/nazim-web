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
        title="Domains"
        description="Manage website domains"
        icon={<Globe className="h-5 w-5" />}
        primaryAction={{
          label: 'Add Domain',
          onClick: () => {
            form.reset();
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title="Filters">
        <div className="space-y-2">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domains..."
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
                <TableHead>Domain</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>SSL Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDomains.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No domains found
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
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>Add a new domain</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain *</Label>
              <Input id="domain" {...form.register('domain')} placeholder="example.com" />
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
              <Label htmlFor="isPrimary">Primary Domain</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verificationStatus">Verification Status</Label>
              <Select
                value={form.watch('verificationStatus') || ''}
                onValueChange={(value) => form.setValue('verificationStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not Set</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sslStatus">SSL Status</Label>
              <Select
                value={form.watch('sslStatus') || ''}
                onValueChange={(value) => form.setValue('sslStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not Set</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createDomain.isPending}>
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editDomain} onOpenChange={(open) => !open && setEditDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Domain</DialogTitle>
            <DialogDescription>Update domain details</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-domain">Domain *</Label>
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
              <Label htmlFor="edit-isPrimary">Primary Domain</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-verificationStatus">Verification Status</Label>
              <Select
                value={form.watch('verificationStatus') || ''}
                onValueChange={(value) => form.setValue('verificationStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not Set</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sslStatus">SSL Status</Label>
              <Select
                value={form.watch('sslStatus') || ''}
                onValueChange={(value) => form.setValue('sslStatus', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not Set</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDomain(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDomain.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this domain? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteDomain.isPending}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

