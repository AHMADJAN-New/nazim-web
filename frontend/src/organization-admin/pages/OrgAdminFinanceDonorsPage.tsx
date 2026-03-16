/**
 * Org Admin Finance Donors - FilterPanel, Summary, Contact column, side panel (Sheet)
 * Design aligned with school finance Donors page.
 */

import { Plus, Pencil, Trash2, Users, Search, Phone, Mail, MapPin, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  useOrgFinanceDonors,
  useCreateOrgFinanceDonor,
  useUpdateOrgFinanceDonor,
  useDeleteOrgFinanceDonor,
} from '@/hooks/useOrgFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency } from '@/lib/utils';
import type { Donor, DonorFormData } from '@/types/domain/finance';

const DEFAULT_CURRENCY_CODE = 'USD';

export default function OrgAdminFinanceDonorsPage() {
  const { t, tUnsafe } = useLanguage();
  const { data: donors = [], isLoading } = useOrgFinanceDonors();
  const createDonor = useCreateOrgFinanceDonor();
  const updateDonor = useUpdateOrgFinanceDonor();
  const deleteDonor = useDeleteOrgFinanceDonor();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editDonor, setEditDonor] = useState<Donor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidePanelDonor, setSidePanelDonor] = useState<Donor | null>(null);

  const [formData, setFormData] = useState<DonorFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    type: 'individual',
    notes: '',
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      type: 'individual',
      notes: '',
      isActive: true,
    });
    setEditDonor(null);
  };

  const filteredDonors = useMemo(() => {
    if (!donors.length) return [];
    if (!searchTerm.trim()) return donors;
    const q = searchTerm.toLowerCase();
    return donors.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.phone ?? '').toLowerCase().includes(q) ||
        (d.email ?? '').toLowerCase().includes(q)
    );
  }, [donors, searchTerm]);

  const totalDonated = useMemo(
    () => filteredDonors.reduce((sum, d) => sum + (d.totalDonated ?? 0), 0),
    [filteredDonors]
  );

  const handleCreate = async () => {
    await createDonor.mutateAsync(formData);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editDonor) return;
    await updateDonor.mutateAsync({ id: editDonor.id, ...formData });
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteDonor.mutateAsync(deleteId);
    setDeleteId(null);
    setSidePanelDonor((prev) => (prev?.id === deleteId ? null : prev));
  };

  const openEdit = (donor: Donor) => {
    setEditDonor(donor);
    setFormData({
      name: donor.name,
      phone: donor.phone ?? '',
      email: donor.email ?? '',
      address: donor.address ?? '',
      type: donor.type ?? 'individual',
      notes: donor.notes ?? '',
      isActive: donor.isActive ?? true,
    });
    setSidePanelDonor(null);
  };

  const openSidePanel = (donor: Donor) => {
    setSidePanelDonor(donor);
  };

  const renderDonorForm = (onSubmit: () => void, loading: boolean) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('organizationAdmin.name')} *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('finance.donorNamePlaceholder')}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{t('organizationAdmin.type')}</Label>
          <Select
            value={formData.type}
            onValueChange={(v: 'individual' | 'organization') => setFormData({ ...formData, type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">{t('finance.individual')}</SelectItem>
              <SelectItem value="organization">{t('finance.organization')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('organizationAdmin.phone')}</Label>
          <Input
            value={formData.phone ?? ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder={t('finance.phonePlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('organizationAdmin.email')}</Label>
          <Input
            type="email"
            value={formData.email ?? ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('finance.emailPlaceholder')}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('organizationAdmin.address')}</Label>
        <Textarea
          value={formData.address ?? ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder={t('finance.addressPlaceholder')}
          rows={3}
          className="resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label>{t('organizationAdmin.notes')}</Label>
        <Textarea
          value={formData.notes ?? ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={t('finance.notesPlaceholder')}
          rows={3}
          className="resize-y"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.isActive ?? true}
          onCheckedChange={(c) => setFormData({ ...formData, isActive: c })}
        />
        <Label>{t('common.active')}</Label>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => (editDonor ? resetForm() : setIsCreateOpen(false))}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading || !formData.name.trim()}>
          {editDonor ? t('events.update') : t('events.create')}
        </Button>
      </DialogFooter>
    </form>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-7xl items-center justify-center overflow-x-hidden p-4 md:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={tUnsafe('organizationAdmin.financeDonors') ?? t('finance.donors')}
        description={tUnsafe('organizationAdmin.financeDonorsDesc') ?? t('finance.donorsDescription')}
        icon={<Users className="h-5 w-5" />}
        primaryAction={{
          label: t('finance.addDonor'),
          onClick: () => setIsCreateOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.addDonor')}</DialogTitle>
            <DialogDescription>{t('finance.addDonorDescription')}</DialogDescription>
          </DialogHeader>
          {renderDonorForm(handleCreate, createDonor.isPending)}
        </DialogContent>
      </Dialog>

      <FilterPanel title={t('events.filters')}>
        <div className="w-full md:max-w-sm">
          <Label className="mb-1 block text-xs text-muted-foreground">{t('events.search')}</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('finance.searchDonors')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('finance.donorsSummary')}
            </CardTitle>
          </div>
          <div className="flex gap-6 pt-2">
            <div>
              <p className="text-sm text-muted-foreground">{t('finance.totalDonors')}</p>
              <p className="text-2xl font-bold">{filteredDonors.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('finance.totalDonated')}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalDonated, DEFAULT_CURRENCY_CODE)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('finance.allDonors')}</CardTitle>
          <CardDescription>
            {filteredDonors.length} {t('finance.donorsFound')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organizationAdmin.name')}</TableHead>
                  <TableHead>{t('organizationAdmin.type')}</TableHead>
                  <TableHead>{t('events.contact')}</TableHead>
                  <TableHead className="text-right">{t('finance.totalDonated')}</TableHead>
                  <TableHead>{t('organizationAdmin.status')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t('organizationAdmin.noDonors')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDonors.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openSidePanel(d)}
                    >
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400"
                        >
                          {d.type === 'individual'
                            ? t('finance.individual')
                            : t('finance.organization')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {d.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {d.phone}
                            </div>
                          )}
                          {d.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              {d.email}
                            </div>
                          )}
                          {!d.phone && !d.email && '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(d.totalDonated ?? 0, DEFAULT_CURRENCY_CODE)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={d.isActive ? 'default' : 'secondary'}>
                          {d.isActive ? t('common.active') : t('common.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(d)}
                            aria-label={t('finance.editDonor')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(d.id)}
                            aria-label={t('common.delete')}
                            className="text-destructive hover:text-destructive"
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
        </CardContent>
      </Card>

      <Sheet open={!!sidePanelDonor} onOpenChange={(open) => !open && setSidePanelDonor(null)}>
        <SheetContent className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {sidePanelDonor?.name}
            </SheetTitle>
            <SheetDescription>
              {t('finance.donorsDescription')}
            </SheetDescription>
          </SheetHeader>
          {sidePanelDonor && (
            <div className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('organizationAdmin.type')}</p>
                <Badge
                  variant="outline"
                  className="w-fit bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400"
                >
                  {sidePanelDonor.type === 'individual'
                    ? t('finance.individual')
                    : t('finance.organization')}
                </Badge>
              </div>
              {(sidePanelDonor.phone || sidePanelDonor.email) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t('events.contact')}</p>
                  <div className="flex flex-col gap-2">
                    {sidePanelDonor.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {sidePanelDonor.phone}
                      </div>
                    )}
                    {sidePanelDonor.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${sidePanelDonor.email}`}
                          className="text-primary hover:underline"
                        >
                          {sidePanelDonor.email}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {sidePanelDonor.address && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {t('organizationAdmin.address')}
                  </p>
                  <p className="text-sm">{sidePanelDonor.address}</p>
                </div>
              )}
              {sidePanelDonor.notes && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    {t('organizationAdmin.notes')}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{sidePanelDonor.notes}</p>
                </div>
              )}
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">{t('finance.totalDonated')}</p>
                <p className="text-xl font-semibold text-green-600">
                  {formatCurrency(sidePanelDonor.totalDonated ?? 0, DEFAULT_CURRENCY_CODE)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('organizationAdmin.status')}</p>
                <Badge variant={sidePanelDonor.isActive ? 'default' : 'secondary'}>
                  {sidePanelDonor.isActive ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    openEdit(sidePanelDonor);
                    setSidePanelDonor(null);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('events.edit')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteId(sidePanelDonor.id);
                    setSidePanelDonor(null);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('events.delete')}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!editDonor} onOpenChange={(o) => { if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('finance.editDonor')}</DialogTitle>
            <DialogDescription>{t('finance.editDonorDescription')}</DialogDescription>
          </DialogHeader>
          {editDonor && renderDonorForm(handleUpdate, updateDonor.isPending)}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('finance.deleteDonorWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
