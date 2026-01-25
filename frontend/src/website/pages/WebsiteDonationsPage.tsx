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
                title="Donations"
                description="Manage donation funds and payment information"
                icon={<Heart className="h-5 w-5" />}
                primaryAction={{
                    label: 'New Fund',
                    onClick: () => { form.reset(); setIsCreateOpen(true); },
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            <FilterPanel title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Search</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search funds..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <div className="flex gap-2">
                            <Button variant={activeFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('all')}>All</Button>
                            <Button variant={activeFilter === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('active')}>Active</Button>
                            <Button variant={activeFilter === 'inactive' ? 'default' : 'outline'} size="sm" onClick={() => setActiveFilter('inactive')}>Inactive</Button>
                        </div>
                    </div>
                </div>
            </FilterPanel>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fund Name</TableHead>
                                <TableHead>Progress</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Raised</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDonations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No donation funds found</TableCell>
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
                                                <Badge variant={donation.is_active ? 'default' : 'secondary'}>{donation.is_active ? 'Active' : 'Inactive'}</Badge>
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
                        <DialogTitle>Add Donation Fund</DialogTitle>
                        <DialogDescription>Create a new donation fund</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Fund Name *</Label>
                            <Input {...form.register('title')} placeholder="e.g. Mosque Building Fund" />
                            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea {...form.register('description')} placeholder="Describe the purpose of this fund..." rows={3} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Target Amount ($)</Label>
                                <Input {...form.register('target_amount')} type="number" step="0.01" placeholder="10000" />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Amount ($)</Label>
                                <Input {...form.register('current_amount')} type="number" step="0.01" placeholder="0" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_active')} onCheckedChange={(c) => form.setValue('is_active', c)} />
                            <Label>Active (visible on website)</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createDonation.isPending}>Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editDonation} onOpenChange={(o) => !o && setEditDonation(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Donation Fund</DialogTitle>
                        <DialogDescription>Update fund details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Fund Name *</Label>
                            <Input {...form.register('title')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea {...form.register('description')} rows={3} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Target Amount ($)</Label>
                                <Input {...form.register('target_amount')} type="number" step="0.01" />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Amount ($)</Label>
                                <Input {...form.register('current_amount')} type="number" step="0.01" />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_active')} onCheckedChange={(c) => form.setValue('is_active', c)} />
                            <Label>Active (visible on website)</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditDonation(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateDonation.isPending}>Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Fund</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this donation fund?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteDonation.isPending}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
