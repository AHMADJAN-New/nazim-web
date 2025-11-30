import { useState, useMemo } from 'react';
import { useScheduleSlots, useCreateScheduleSlot, useUpdateScheduleSlot, useDeleteScheduleSlot, type ScheduleSlot } from '@/hooks/useScheduleSlots';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useSchools } from '@/hooks/useSchools';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const scheduleSlotSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
    start_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    end_time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    days_of_week: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).default([]),
    default_duration_minutes: z.number().int().min(1).max(480).default(45),
    academic_year_id: z.string().uuid().optional().nullable(),
    school_id: z.string().uuid().optional().nullable(),
    sort_order: z.number().int().min(1).default(1),
    is_active: z.boolean().default(true),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
}).refine((data) => data.end_time > data.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
});

type ScheduleSlotFormData = z.infer<typeof scheduleSlotSchema>;

const DAYS = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
] as const;

export function ScheduleSlotsManagement() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const isSuperAdmin = useIsSuperAdmin();
    const hasCreatePermission = useHasPermission('schedule_slots.create');
    const hasUpdatePermission = useHasPermission('schedule_slots.update');
    const hasDeletePermission = useHasPermission('schedule_slots.delete');

    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>(undefined);
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
    const [deletingSlot, setDeletingSlot] = useState<ScheduleSlot | null>(null);

    const { data: academicYears } = useAcademicYears(profile?.organization_id);
    const { data: schools } = useSchools(profile?.organization_id);
    const { data: slots, isLoading, refetch: refetchSlots } = useScheduleSlots(profile?.organization_id, selectedAcademicYearId);
    const createSlot = useCreateScheduleSlot();
    const updateSlot = useUpdateScheduleSlot();
    const deleteSlot = useDeleteScheduleSlot();

    const form = useForm<ScheduleSlotFormData & { academic_year_id?: string | null; school_id?: string | null }>({
        resolver: zodResolver(scheduleSlotSchema),
        defaultValues: {
            name: '',
            code: '',
            start_time: '08:00',
            end_time: '08:45', // Default 45 minutes
            days_of_week: [],
            default_duration_minutes: 45,
            academic_year_id: null, // Global by default
            school_id: null, // Organization-wide by default
            sort_order: 1,
            is_active: true,
            description: null,
        },
    });

    const filteredSlots = useMemo(() => {
        if (!slots) return [];
        return slots.filter((slot) => {
            const matchesSearch =
                slot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                slot.code.toLowerCase().includes(searchQuery.toLowerCase());

            // Filter by school if selected
            let matchesSchool = true;
            if (selectedSchoolId) {
                if (selectedSchoolId === 'none') {
                    // "Organization-wide Only" - show only slots with null school_id
                    matchesSchool = slot.school_id === null;
                } else if (selectedSchoolId !== 'all') {
                    // Specific school - show slots for that school OR organization-wide (null school_id)
                    matchesSchool = slot.school_id === null || slot.school_id === selectedSchoolId;
                }
                // "All Schools" (selectedSchoolId === 'all') - show all slots, no filter needed
            }

            return matchesSearch && matchesSchool;
        });
    }, [slots, searchQuery, selectedSchoolId]);

    const openDialog = (slot?: ScheduleSlot) => {
        if (slot) {
            setEditingSlot(slot);
            form.reset({
                name: slot.name,
                code: slot.code,
                start_time: slot.start_time,
                end_time: slot.end_time,
                days_of_week: slot.days_of_week || [],
                default_duration_minutes: slot.default_duration_minutes || 45,
                academic_year_id: slot.academic_year_id || null,
                school_id: slot.school_id || null,
                sort_order: slot.sort_order,
                is_active: slot.is_active,
                description: slot.description,
            });
        } else {
            setEditingSlot(null);
            form.reset({
                name: '',
                code: '',
                start_time: '08:00',
                end_time: '08:45',
                days_of_week: [],
                default_duration_minutes: 45,
                academic_year_id: null, // Global by default
                school_id: null, // Organization-wide by default
                sort_order: (slots?.length ?? 0) + 1,
                is_active: true,
                description: null,
            });
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingSlot(null);
        form.reset();
    };

    const onSubmit = form.handleSubmit(async (values) => {
        try {
            if (editingSlot) {
                await updateSlot.mutateAsync({
                    id: editingSlot.id,
                    ...values,
                    academic_year_id: values.academic_year_id || null,
                    school_id: values.school_id || null,
                });
            } else {
                // Ensure all required fields are present
                if (!values.name || !values.code || !values.start_time || !values.end_time) {
                    toast.error('Please fill in all required fields');
                    return;
                }
                await createSlot.mutateAsync({
                    name: values.name,
                    code: values.code,
                    start_time: values.start_time,
                    end_time: values.end_time,
                    days_of_week: values.days_of_week || [],
                    default_duration_minutes: values.default_duration_minutes || 45,
                    academic_year_id: values.academic_year_id || null,
                    school_id: values.school_id || null,
                    sort_order: values.sort_order || 1,
                    is_active: values.is_active ?? true,
                    description: values.description || null,
                    organization_id: profile?.organization_id || undefined,
                });
            }
            // Refetch slots to ensure the new slot appears
            await refetchSlots();
            closeDialog();
        } catch (error) {
            // Error is handled by the mutation
        }
    });

    const handleDelete = async () => {
        if (!deletingSlot) return;
        
        try {
            await deleteSlot.mutateAsync(deletingSlot.id);
            // Refetch slots to update the list
            await refetchSlots();
            setDeletingSlot(null);
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    const formatTimeRange = (slot: ScheduleSlot) => {
        return `${slot.start_time} - ${slot.end_time} (${slot.default_duration_minutes || 45} min)`;
    };

    const formatDays = (days: string[]) => {
        if (!days || days.length === 0) return 'Any Day';
        if (days.length === 7) return 'All Days';
        return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
    };

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        {t('academic.scheduleSlots.title')}
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">{t('academic.scheduleSlots.management')}</p>
                </div>
                {hasCreatePermission && (
                    <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('academic.scheduleSlots.addSlot')}
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle>Schedule Slots</CardTitle>
                            <CardDescription>Time ranges available for scheduling</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full">
                            {academicYears && academicYears.length > 0 && (
                                <Select
                                    value={selectedAcademicYearId || 'all'}
                                    onValueChange={(value) => setSelectedAcademicYearId(value === 'all' ? undefined : value)}
                                >
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue placeholder={t('academic.scheduleSlots.selectAcademicYear')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Academic Years</SelectItem>
                                        {academicYears.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {schools && schools.length > 0 && (
                                <Select
                                    value={selectedSchoolId || 'all'}
                                    onValueChange={(value) => setSelectedSchoolId(value === 'all' ? undefined : value)}
                                >
                                    <SelectTrigger className="w-full sm:w-48">
                                        <SelectValue placeholder="Filter by school" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Schools</SelectItem>
                                        <SelectItem value="none">Organization-wide Only</SelectItem>
                                        {schools.map((school) => (
                                            <SelectItem key={school.id} value={school.id}>
                                                {school.school_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search slots..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 w-full"
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : filteredSlots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? 'No slots found matching your search' : 'No schedule slots found'}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Code</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Time Range</TableHead>
                                            <TableHead>Duration</TableHead>
                                            <TableHead>Days</TableHead>
                                            <TableHead>Academic Year</TableHead>
                                            <TableHead>School</TableHead>
                                            <TableHead>Sort Order</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSlots.map((slot) => (
                                            <TableRow key={slot.id}>
                                                <TableCell className="font-mono">{slot.code}</TableCell>
                                                <TableCell className="font-medium">{slot.name}</TableCell>
                                                <TableCell>{slot.start_time} - {slot.end_time}</TableCell>
                                                <TableCell>{slot.default_duration_minutes || 45} min</TableCell>
                                                <TableCell>
                                                    {slot.days_of_week && slot.days_of_week.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {slot.days_of_week.map((day) => (
                                                                <Badge key={day} variant="outline" className="text-xs">
                                                                    {t(`academic.timetable.days.${day}`)}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t('common.all')}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {slot.academic_year ? (
                                                        <Badge variant="secondary">{slot.academic_year.name}</Badge>
                                                    ) : (
                                                        <Badge variant="outline">Global</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {slot.school ? (
                                                        <Badge variant="outline" className="text-xs">{slot.school.school_name}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">Organization-wide</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{slot.sort_order}</TableCell>
                                                <TableCell>
                                                    <Badge variant={slot.is_active ? 'default' : 'secondary'}>
                                                        {slot.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openDialog(slot)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <AlertDialog open={deletingSlot?.id === slot.id} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setDeletingSlot(null);
                                                                }
                                                            }}>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setDeletingSlot(slot)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Schedule Slot</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete "{slot.name}"? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel onClick={() => setDeletingSlot(null)}>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {filteredSlots.map((slot) => (
                                    <Card key={slot.id}>
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="font-mono text-sm text-muted-foreground">{slot.code}</div>
                                                        <div className="font-semibold text-lg">{slot.name}</div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openDialog(slot)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <AlertDialog open={deletingSlot?.id === slot.id} onOpenChange={(open) => {
                                                                if (!open) {
                                                                    setDeletingSlot(null);
                                                                }
                                                            }}>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setDeletingSlot(slot)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete Schedule Slot</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Are you sure you want to delete "{slot.name}"? This action cannot be undone.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel onClick={() => setDeletingSlot(null)}>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                                            Delete
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Time:</span>
                                                        <div className="font-medium">{slot.start_time} - {slot.end_time}</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Duration:</span>
                                                        <div className="font-medium">{slot.default_duration_minutes || 45} min</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Days:</span>
                                                        <div>
                                                            {slot.days_of_week && slot.days_of_week.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {slot.days_of_week.map((day) => (
                                                                        <Badge key={day} variant="outline" className="text-xs">
                                                                            {t(`academic.timetable.days.${day}`)}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">{t('common.all')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Status:</span>
                                                        <div className="mt-1">
                                                            <Badge variant={slot.is_active ? 'default' : 'secondary'}>
                                                                {slot.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Academic Year:</span>
                                                        <div className="mt-1">
                                                            {slot.academic_year ? (
                                                                <Badge variant="secondary" className="text-xs">{slot.academic_year.name}</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">Global</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">School:</span>
                                                        <div className="mt-1">
                                                            {slot.school ? (
                                                                <Badge variant="outline" className="text-xs">{slot.school.school_name}</Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs">Organization-wide</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
                    <DialogHeader>
                        <DialogTitle>{editingSlot ? t('academic.scheduleSlots.editSlot') : t('academic.scheduleSlots.addSlot')}</DialogTitle>
                        <DialogDescription>
                            {editingSlot ? 'Update the schedule slot details' : 'Create a new time range for scheduling'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Code *</Label>
                                <Input
                                    id="code"
                                    {...form.register('code')}
                                    placeholder="SLOT-001"
                                />
                                {form.formState.errors.code && (
                                    <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    {...form.register('name')}
                                    placeholder="Morning Slot"
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_duration_minutes">Duration (minutes) *</Label>
                                <Input
                                    id="default_duration_minutes"
                                    type="number"
                                    min="1"
                                    max="480"
                                    {...form.register('default_duration_minutes', { valueAsNumber: true })}
                                />
                                {form.formState.errors.default_duration_minutes && (
                                    <p className="text-sm text-destructive">{form.formState.errors.default_duration_minutes.message}</p>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time *</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    {...form.register('start_time')}
                                />
                                {form.formState.errors.start_time && (
                                    <p className="text-sm text-destructive">{form.formState.errors.start_time.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time *</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    {...form.register('end_time')}
                                />
                                {form.formState.errors.end_time && (
                                    <p className="text-sm text-destructive">{form.formState.errors.end_time.message}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('academic.timetable.days.title') || t('academic.scheduleSlots.days')}</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 p-4 border rounded-md">
                                <Controller
                                    name="days_of_week"
                                    control={form.control}
                                    render={({ field }) => (
                                        <>
                                            {DAYS.map((day) => {
                                                const isChecked = field.value?.includes(day);
                                                return (
                                                    <div key={day} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`day-${day}`}
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => {
                                                                const currentDays = field.value || [];
                                                                if (checked) {
                                                                    field.onChange([...currentDays, day]);
                                                                } else {
                                                                    field.onChange(currentDays.filter(d => d !== day));
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`day-${day}`}
                                                            className="text-sm font-normal cursor-pointer"
                                                        >
                                                            {t(`academic.timetable.days.${day}`)}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">{t('academic.scheduleSlots.selectDaysHint')}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="academic_year_id">{t('academic.scheduleSlots.academicYear')}</Label>
                                <Controller
                                    name="academic_year_id"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || 'global'}
                                            onValueChange={(value) => field.onChange(value === 'global' ? null : value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.scheduleSlots.selectAcademicYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="global">{t('academic.scheduleSlots.global')}</SelectItem>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                <p className="text-xs text-muted-foreground">{t('academic.scheduleSlots.academicYearHint')}</p>
                            </div>
                            {schools && schools.length > 1 && (
                                <div className="space-y-2">
                                    <Label htmlFor="school_id">{t('academic.scheduleSlots.school')}</Label>
                                    <Controller
                                        name="school_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select
                                                value={field.value || 'all'}
                                                onValueChange={(value) => field.onChange(value === 'all' ? null : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select school" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('academic.scheduleSlots.allSchools')}</SelectItem>
                                                    {schools.map((school) => (
                                                        <SelectItem key={school.id} value={school.id}>
                                                            {school.school_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground">{t('academic.scheduleSlots.schoolHint')}</p>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Sort Order *</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    min="1"
                                    {...form.register('sort_order', { valueAsNumber: true })}
                                />
                                {form.formState.errors.sort_order && (
                                    <p className="text-sm text-destructive">{form.formState.errors.sort_order.message}</p>
                                )}
                            </div>
                            <div className="space-y-2 flex items-center">
                                <Controller
                                    name="is_active"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is_active"
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                            <Label htmlFor="is_active">Active</Label>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                {...form.register('description')}
                                placeholder="Optional description"
                                rows={3}
                            />
                            {form.formState.errors.description && (
                                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createSlot.isPending || updateSlot.isPending}>
                                {editingSlot ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

