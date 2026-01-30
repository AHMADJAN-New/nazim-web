import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Heart, Search, DollarSign, Building } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    useWebsiteDonations,
    useCreateWebsiteDonation,
    useUpdateWebsiteDonation,
    useDeleteWebsiteDonation,
    type WebsiteDonation,
} from '@/website/hooks/useWebsiteContent';
import { useLanguage } from '@/hooks/useLanguage';

const donationSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().optional().nullable(),
    target_amount: z.coerce.number().min(0).optional().nullable(),
    current_amount: z.coerce.number().min(0).default(0),
    is_active: z.boolean().default(true),
    sort_order: z.number().default(0),
});

type DonationFormData = z.infer<typeof donationSchema>;

export default function WebsiteDonationsPage() {
    const { t } = useLanguage();
    const { data: donations = [], isLoading } = useWebsiteDonations();
    const createDonation = useCreateWebsiteDonation();
    const updateDonation = useUpdateWebsiteDonation();
    const deleteDonation = useDeleteWebsiteDonation();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editDonation, setEditDonation] = useState<WebsiteDonation | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const form = useForm<DonationFormData>({
        resolver: zodResolver(donationSchema),
        defaultValues: {
            title: '', description: null, target_amount: null,
            current_amount: 0, is_active: true, sort_order: 0,
        },
    });

    const filteredDonations = useMemo(() => {
        return donations.filter((d) => {
            const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? d.is_active : !d.is_active);
            return matchesSearch && matchesActive;
        });
    }, [donations, searchQuery, activeFilter]);

    const handleCreate = async (data: DonationFormData) => {
        await createDonation.mutateAsync(data);
        setIsCreateOpen(false);
        form.reset();
    };

    const handleUpdate = async (data: DonationFormData) => {
        if (!editDonation) return;
        await updateDonation.mutateAsync({ id: editDonation.id, ...data });
        setEditDonation(null);
        form.reset();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteDonation.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (donation: WebsiteDonation) => {
        setEditDonation(donation);
        form.reset({
            title: donation.title, description: donation.description,
            target_amount: donation.target_amount, current_amount: donation.current_amount,
            is_active: donation.is_active, sort_order: donation.sort_order,
        });
    };

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('websiteAdmin.donations.title')}
                description={t('websiteAdmin.donations.description')}
                icon={<Heart className="h-5 w-5" />}
                primaryAction={{
                    label: t('websiteAdmin.donations.new'),
                    onClick: () => { form.reset(); setIsCreateOpen(true); },
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            <FilterPanel title={t('websiteAdmin.common.filters')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.search')}</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder={t('websiteAdmin.donations.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.status')}</Label>
                        <div className="flex gap-2">
                            <Button variant={activeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('all')}>{t('websiteAdmin.common.all')}</Button>
                            <Button variant={activeFilter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('active')}>{t('websiteAdmin.statuses.active')}</Button>
                            <Button variant={activeFilter === 'inactive' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('inactive')}>{t('websiteAdmin.statuses.inactive')}</Button>
                        </div>
                    </div>
                </div>
            </FilterPanel>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('websiteAdmin.donations.fields.fundName')}</TableHead>
                                <TableHead>{t('websiteAdmin.donations.fields.progress')}</TableHead>
                                <TableHead>{t('websiteAdmin.donations.fields.target')}</TableHead>
                                <TableHead>{t('websiteAdmin.donations.fields.raised')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDonations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('websiteAdmin.donations.noResults')}</TableCell>
                                </TableRow>
                            ) : (
                                filteredDonations.map((donation) => {
                                    const progress = donation.target_amount ? (donation.current_amount / donation.target_amount) * 100 : 0;
                                    return (
                                        <TableRow key={donation.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-muted-foreground" />
                                                    {donation.title}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {donation.target_amount ? (
                                                    <div className="w-32">
                                                        <Progress value={Math.min(progress, 100)} className="h-2" />
                                                        <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                                                    </div>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell><div className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{formatCurrency(donation.target_amount)}</div></TableCell>
                                            <TableCell><div className="flex items-center gap-1 text-green-600"><DollarSign className="h-4 w-4" />{formatCurrency(donation.current_amount)}</div></TableCell>
                                            <TableCell>
                                                <Badge variant={donation.is_active ? 'default' : 'secondary'}>
                                                    {donation.is_active ? t('websiteAdmin.statuses.active') : t('websiteAdmin.statuses.inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(donation)}><Pencil className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(donation.id)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.donations.createTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.donations.createDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.donations.fields.fundName')} *</Label>
                            <Input {...form.register('title')} placeholder={t('websiteAdmin.donations.placeholders.fundName')} />
                            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.common.description')}</Label>
                            <Textarea {...form.register('description')} placeholder={t('websiteAdmin.donations.placeholders.description')} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.donations.fields.target')}</Label>
                                <Input {...form.register('target_amount')} type="number" step="0.01" placeholder={t('websiteAdmin.donations.placeholders.target')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.donations.fields.raised')}</Label>
                                <Input {...form.register('current_amount')} type="number" step="0.01" placeholder={t('websiteAdmin.donations.placeholders.raised')} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_active')} onCheckedChange={(c) => form.setValue('is_active', c)} />
                            <Label>{t('websiteAdmin.donations.fields.active')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={createDonation.isPending}>{t('common.create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editDonation} onOpenChange={(o) => !o && setEditDonation(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.donations.editTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.donations.editDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.donations.fields.fundName')} *</Label>
                            <Input {...form.register('title')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.common.description')}</Label>
                            <Textarea {...form.register('description')} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.donations.fields.target')}</Label>
                                <Input {...form.register('target_amount')} type="number" step="0.01" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.donations.fields.raised')}</Label>
                                <Input {...form.register('current_amount')} type="number" step="0.01" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_active')} onCheckedChange={(c) => form.setValue('is_active', c)} />
                            <Label>{t('websiteAdmin.donations.fields.active')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDonation(null)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={updateDonation.isPending}>{t('common.update')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.donations.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('websiteAdmin.donations.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteDonation.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
