/**
 * Donors Page - Manage donors
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
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
import {
    useDonors,
    useCreateDonor,
    useUpdateDonor,
    useDeleteDonor,
    type Donor,
    type DonorFormData,
} from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { Plus, Pencil, Trash2, Users, Search, Phone, Mail } from 'lucide-react';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { formatCurrency } from '@/lib/utils';

export default function Donors() {
    const { t } = useLanguage();
    const { data: donors, isLoading } = useDonors();
    const createDonor = useCreateDonor();
    const updateDonor = useUpdateDonor();
    const deleteDonor = useDeleteDonor();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editDonor, setEditDonor] = useState<Donor | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

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
    };

    const handleCreate = async () => {
        await createDonor.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editDonor) return;
        await updateDonor.mutateAsync({ id: editDonor.id, ...formData });
        setEditDonor(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteDonor.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (donor: Donor) => {
        setEditDonor(donor);
        setFormData({
            name: donor.name,
            phone: donor.phone || '',
            email: donor.email || '',
            address: donor.address || '',
            type: donor.type,
            notes: donor.notes || '',
            isActive: donor.isActive,
        });
    };

    const filteredDonors = useMemo(() => {
        if (!donors) return [];
        return donors.filter((donor) => {
            return searchTerm === '' ||
                donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                donor.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                donor.email?.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [donors, searchTerm]);

    const totalDonated = useMemo(() => {
        return filteredDonors.reduce((sum, donor) => sum + donor.totalDonated, 0);
    }, [filteredDonors]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const renderDonorForm = (onSubmit: () => void, loading: boolean) => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="space-y-4"
        >
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">{t('common.name') || 'Name'} *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('finance.donorNamePlaceholder') || 'Full name...'}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">{t('common.type') || 'Type'}</Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value: 'individual' | 'organization') => setFormData({ ...formData, type: value })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="individual">{t('finance.individual') || 'Individual'}</SelectItem>
                            <SelectItem value="organization">{t('finance.organization') || 'Organization'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">{t('common.phone') || 'Phone'}</Label>
                    <Input
                        id="phone"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder={t('finance.phonePlaceholder') || '+1234567890'}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">{t('common.email') || 'Email'}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder={t('finance.emailPlaceholder') || 'email@example.com'}
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="address">{t('common.address') || 'Address'}</Label>
                <Textarea
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('finance.addressPlaceholder') || 'Full address...'}
                    rows={3}
                    className="resize-y"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">{t('common.notes') || 'Notes'}</Label>
                <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('finance.notesPlaceholder') || 'Additional notes...'}
                    rows={3}
                    className="resize-y"
                />
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('common.active') || 'Active'}</Label>
            </div>
            <DialogFooter>
                <Button type="submit" disabled={loading || !formData.name.trim()}>
                    {editDonor ? t('common.update') || 'Update' : t('common.create') || 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">
                        {t('finance.donors') || 'Donors'}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('finance.donorsDescription') || 'Manage your donors and track contributions'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ReportExportButtons
                        data={filteredDonors}
                        columns={[
                            { key: 'name', label: t('common.name'), align: 'left' },
                            { key: 'type', label: t('common.type'), align: 'left' },
                            { key: 'phone', label: t('common.phone'), align: 'left' },
                            { key: 'email', label: t('common.email'), align: 'left' },
                            { key: 'totalDonated', label: t('finance.totalDonated'), align: 'right' },
                            { key: 'isActive', label: t('common.status'), align: 'center' },
                        ]}
                        reportKey="finance_donors"
                        title={t('finance.donors') || 'Donors'}
                        transformData={(data) =>
                            data.map((donor) => ({
                                name: donor.name,
                                type: donor.type === 'individual' ? t('finance.individual') || 'Individual' : t('finance.organization') || 'Organization',
                                phone: donor.phone || '-',
                                email: donor.email || '-',
                                totalDonated: formatCurrency(donor.totalDonated),
                                isActive: donor.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive',
                            }))
                        }
                        buildFiltersSummary={() => searchTerm ? `${t('common.search')}: ${searchTerm}` : ''}
                        templateType="finance_donors"
                        disabled={isLoading || filteredDonors.length === 0}
                    />
                    <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('finance.addDonor') || 'Add Donor'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('finance.addDonor') || 'Add Donor'}</DialogTitle>
                            <DialogDescription>
                                {t('finance.addDonorDescription') || 'Add a new donor to your records'}
                            </DialogDescription>
                        </DialogHeader>
                        {renderDonorForm(handleCreate, createDonor.isPending)}
                    </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('finance.searchDonors') || 'Search donors...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Summary Card */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {t('finance.donorsSummary') || 'Donors Summary'}
                        </CardTitle>
                    </div>
                    <div className="flex gap-6 pt-2">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('finance.totalDonors') || 'Total Donors'}</p>
                            <p className="text-2xl font-bold">{filteredDonors.length}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t('finance.totalDonated') || 'Total Donated'}</p>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalDonated)}</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Donors Table */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('finance.allDonors') || 'All Donors'}</CardTitle>
                    <CardDescription>
                        {filteredDonors.length} {t('finance.donorsFound') || 'donors found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.name') || 'Name'}</TableHead>
                                <TableHead>{t('common.type') || 'Type'}</TableHead>
                                <TableHead>{t('common.contact') || 'Contact'}</TableHead>
                                <TableHead className="text-right">{t('finance.totalDonated') || 'Total Donated'}</TableHead>
                                <TableHead>{t('common.status') || 'Status'}</TableHead>
                                <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDonors.map((donor) => (
                                <TableRow key={donor.id}>
                                    <TableCell className="font-medium">{donor.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {donor.type === 'individual'
                                                ? t('finance.individual') || 'Individual'
                                                : t('finance.organization') || 'Organization'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {donor.phone && (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="h-3 w-3" />
                                                    {donor.phone}
                                                </div>
                                            )}
                                            {donor.email && (
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Mail className="h-3 w-3" />
                                                    {donor.email}
                                                </div>
                                            )}
                                            {!donor.phone && !donor.email && '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-green-600">
                                        {formatCurrency(donor.totalDonated)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={donor.isActive ? 'default' : 'secondary'}>
                                            {donor.isActive ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(donor)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(donor.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredDonors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noDonors') || 'No donors found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editDonor} onOpenChange={(open) => { if (!open) { setEditDonor(null); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editDonor') || 'Edit Donor'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editDonorDescription') || 'Update donor details'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderDonorForm(handleUpdate, updateDonor.isPending)}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteDonorWarning') || 'Are you sure you want to delete this donor? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {t('common.delete') || 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
