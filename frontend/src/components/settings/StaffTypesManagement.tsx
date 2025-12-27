import { useState, useMemo } from 'react';
import { useStaffTypes, useCreateStaffType, useUpdateStaffType, useDeleteStaffType } from '@/hooks/useStaff';
import type { StaffType } from '@/types/domain/staff';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import type { ReportColumn } from '@/lib/reporting/serverReportTypes';

const staffTypeSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
    display_order: z.number().int().min(0).default(0),
    is_active: z.boolean().default(true),
});

type StaffTypeFormData = z.infer<typeof staffTypeSchema>;

export function StaffTypesManagement() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('staff_types.create');
    const hasUpdatePermission = useHasPermission('staff_types.update');
    const hasDeletePermission = useHasPermission('staff_types.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStaffType, setSelectedStaffType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const organizationId = profile?.organization_id;
    const { data: staffTypes, isLoading } = useStaffTypes(organizationId);
    const createStaffType = useCreateStaffType();
    const updateStaffType = useUpdateStaffType();
    const deleteStaffType = useDeleteStaffType();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<StaffTypeFormData>({
        resolver: zodResolver(staffTypeSchema),
        defaultValues: {
            is_active: true,
            display_order: 0,
        },
    });

    const isActiveValue = watch('is_active');

    const filteredStaffTypes = useMemo(() => {
        if (!staffTypes) return [];
        const query = (searchQuery || '').toLowerCase();
        return staffTypes.filter((type) =>
            type.name?.toLowerCase().includes(query) ||
            type.code?.toLowerCase().includes(query) ||
            (type.description && type.description.toLowerCase().includes(query))
        );
    }, [staffTypes, searchQuery]);

    const handleOpenDialog = (staffTypeId?: string) => {
        if (staffTypeId) {
            const type = staffTypes?.find((t) => t.id === staffTypeId);
            if (type) {
                reset({
                    name: type.name,
                    code: type.code,
                    description: type.description || '',
                    display_order: type.displayOrder,
                    is_active: type.isActive,
                });
                setSelectedStaffType(staffTypeId);
            }
        } else {
            reset({
                name: '',
                code: '',
                description: '',
                display_order: 0,
                is_active: true,
            });
            setSelectedStaffType(null);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedStaffType(null);
        reset({
            name: '',
            code: '',
            description: '',
            display_order: 0,
            is_active: true,
        });
    };

    const onSubmit = (data: StaffTypeFormData) => {
        if (selectedStaffType) {
            // Convert form data to domain model
            updateStaffType.mutate(
                {
                    id: selectedStaffType,
                    name: data.name,
                    code: data.code,
                    description: data.description || null,
                    displayOrder: data.display_order,
                    isActive: data.is_active,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        } else {
            // Convert form data to domain model
            createStaffType.mutate({
                name: data.name,
                code: data.code,
                description: data.description || null,
                displayOrder: data.display_order,
                organizationId: profile?.organization_id || null,
            }, {
                onSuccess: () => {
                    handleCloseDialog();
                },
            });
        }
    };

    const handleDeleteClick = (staffTypeId: string) => {
        setSelectedStaffType(staffTypeId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedStaffType) {
            deleteStaffType.mutate(selectedStaffType, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedStaffType(null);
                },
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center">{t('common.loading')}</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                {t('academic.staffTypes.management')}
                            </CardTitle>
                            <CardDescription>
                                {t('academic.staffTypes.title')}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {filteredStaffTypes && filteredStaffTypes.length > 0 && (
                                <ReportExportButtons
                                    data={filteredStaffTypes}
                                    columns={[
                                        { key: 'name', label: t('academic.staffTypes.name') },
                                        { key: 'code', label: t('academic.staffTypes.code') },
                                        { key: 'description', label: t('academic.staffTypes.description') },
                                        { key: 'displayOrder', label: t('academic.staffTypes.displayOrder') },
                                        { key: 'isActive', label: t('academic.staffTypes.isActive') },
                                    ]}
                                    reportKey="staff_types"
                                    title={t('academic.staffTypes.management') || 'Staff Types Report'}
                                    transformData={(data) => data.map((type) => ({
                                        name: type.name || '',
                                        code: type.code || '',
                                        description: type.description || '',
                                        displayOrder: type.displayOrder || 0,
                                        isActive: type.isActive ? t('academic.staffTypes.active') : t('academic.staffTypes.inactive'),
                                    }))}
                                    buildFiltersSummary={() => {
                                        const filters: string[] = [];
                                        if (searchQuery) filters.push(`Search: ${searchQuery}`);
                                        return filters.length > 0 ? filters.join(' | ') : '';
                                    }}
                                    schoolId={profile?.default_school_id}
                                    templateType="staff_types"
                                    disabled={!filteredStaffTypes || filteredStaffTypes.length === 0}
                                />
                            )}
                            {hasCreatePermission && (
                                <Button onClick={() => handleOpenDialog()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('academic.staffTypes.addStaffType')}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('academic.staffTypes.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('academic.staffTypes.name')}</TableHead>
                                    <TableHead>{t('academic.staffTypes.code')}</TableHead>
                                    <TableHead>{t('academic.staffTypes.description')}</TableHead>
                                    <TableHead>{t('academic.staffTypes.displayOrder')}</TableHead>
                                    <TableHead>{t('academic.staffTypes.isActive')}</TableHead>
                                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaffTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            {searchQuery
                                                ? t('academic.staffTypes.noStaffTypesFound')
                                                : t('academic.staffTypes.noStaffTypesMessage')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredStaffTypes.map((type) => (
                                        <TableRow key={type.id}>
                                            <TableCell className="font-medium">{type.name}</TableCell>
                                            <TableCell>
                                                <code className="px-2 py-1 bg-muted rounded text-sm">{type.code}</code>
                                            </TableCell>
                                            <TableCell className="max-w-md truncate">
                                                {type.description || '-'}
                                            </TableCell>
                                            <TableCell>{type.displayOrder}</TableCell>
                                            <TableCell>
                                                <Badge variant={type.isActive ? 'default' : 'secondary'}>
                                                    {type.isActive ? t('academic.staffTypes.active') : t('academic.staffTypes.inactive')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {hasUpdatePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenDialog(type.id)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(type.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    )}
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedStaffType
                                    ? t('academic.staffTypes.editStaffType')
                                    : t('academic.staffTypes.addStaffType')}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedStaffType
                                    ? t('academic.staffTypes.updateStaffType')
                                    : t('academic.staffTypes.createStaffType')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('academic.staffTypes.name')} *
                                </Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder={t('academic.staffTypes.name')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="code">
                                    {t('academic.staffTypes.code')} *
                                </Label>
                                <Input
                                    id="code"
                                    {...register('code')}
                                    placeholder={t('academic.staffTypes.code')}
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive">{errors.code.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('academic.staffTypes.description')}
                                </Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder={t('academic.staffTypes.description')}
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="display_order">
                                    {t('academic.staffTypes.displayOrder')}
                                </Label>
                                <Input
                                    id="display_order"
                                    type="number"
                                    {...register('display_order', { valueAsNumber: true })}
                                    placeholder="0"
                                    min="0"
                                />
                                {errors.display_order && (
                                    <p className="text-sm text-destructive">{errors.display_order.message}</p>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={isActiveValue}
                                    onCheckedChange={(checked) => setValue('is_active', checked)}
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">
                                    {t('academic.staffTypes.isActive')}
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">
                                {t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('academic.staffTypes.deleteConfirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
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

