import { useState, useMemo } from 'react';
import { useStaffTypes, useCreateStaffType, useUpdateStaffType, useDeleteStaffType, type StaffType } from '@/hooks/useStaff';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useOrganizations } from '@/hooks/useOrganizations';
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
    const isSuperAdmin = useIsSuperAdmin();
    const hasCreatePermission = useHasPermission('staff.types.create');
    const hasUpdatePermission = useHasPermission('staff.types.update');
    const hasDeletePermission = useHasPermission('staff.types.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedStaffType, setSelectedStaffType] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(profile?.organization_id);

    const { data: organizations } = useOrganizations();
    const { data: staffTypes, isLoading } = useStaffTypes(selectedOrganizationId);
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
        return staffTypes.filter((type) =>
            type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (type.description && type.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    display_order: type.display_order,
                    is_active: type.is_active,
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
            updateStaffType.mutate(
                {
                    id: selectedStaffType,
                    name: data.name,
                    code: data.code,
                    description: data.description || null,
                    display_order: data.display_order,
                    is_active: data.is_active,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        } else {
            createStaffType.mutate({
                name: data.name,
                code: data.code,
                description: data.description || null,
                display_order: data.display_order,
                organization_id: selectedOrganizationId || profile?.organization_id || null,
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
                                Staff Types Management
                            </CardTitle>
                            <CardDescription>
                                Manage staff role types and categories
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSuperAdmin && (
                                <Select
                                    value={selectedOrganizationId || 'all'}
                                    onValueChange={(value) => {
                                        setSelectedOrganizationId(value === 'all' ? undefined : value);
                                    }}
                                >
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Filter by organization" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Organizations</SelectItem>
                                        {organizations?.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <Button
                                onClick={() => handleOpenDialog()}
                                disabled={!hasCreatePermission}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Staff Type
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff types..."
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
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Order</TableHead>
                                    <TableHead>Status</TableHead>
                                    {isSuperAdmin && <TableHead>Type</TableHead>}
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaffTypes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground">
                                            {searchQuery
                                                ? 'No staff types found'
                                                : 'No staff types available'}
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
                                            <TableCell>{type.display_order}</TableCell>
                                            <TableCell>
                                                <Badge variant={type.is_active ? 'default' : 'secondary'}>
                                                    {type.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            {isSuperAdmin && (
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {type.organization_id === null
                                                            ? 'Global'
                                                            : 'Organization'}
                                                    </Badge>
                                                </TableCell>
                                            )}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenDialog(type.id)}
                                                        disabled={!hasUpdatePermission || (type.organization_id === null && !isSuperAdmin)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteClick(type.id)}
                                                        disabled={!hasDeletePermission || (type.organization_id === null && !isSuperAdmin)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
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

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedStaffType
                                    ? 'Edit Staff Type'
                                    : 'Add Staff Type'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedStaffType
                                    ? 'Update staff type information'
                                    : 'Create a new staff type'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {isSuperAdmin && !selectedStaffType && (
                                <div className="grid gap-2">
                                    <Label htmlFor="organization_id">Organization</Label>
                                    <Select
                                        value={selectedOrganizationId || 'global'}
                                        onValueChange={(value) => {
                                            setSelectedOrganizationId(value === 'global' ? undefined : value);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">Global (Available to all)</SelectItem>
                                            {organizations?.map((org) => (
                                                <SelectItem key={org.id} value={org.id}>
                                                    {org.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    Name *
                                </Label>
                                <Input
                                    id="name"
                                    {...register('name')}
                                    placeholder="e.g., Teacher"
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="code">
                                    Code *
                                </Label>
                                <Input
                                    id="code"
                                    {...register('code')}
                                    placeholder="e.g., teacher"
                                />
                                {errors.code && (
                                    <p className="text-sm text-destructive">{errors.code.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder="Optional description"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive">{errors.description.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="display_order">
                                    Display Order
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
                                    Active
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
                            Are you sure you want to delete this staff type? This action cannot be undone.
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

