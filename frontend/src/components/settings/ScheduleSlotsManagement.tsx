import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, Clock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';

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
import { Button } from '@/components/ui/button';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useScheduleSlots, useCreateScheduleSlot, useUpdateScheduleSlot, useDeleteScheduleSlot, type ScheduleSlot } from '@/hooks/useScheduleSlots';
import { useSchools } from '@/hooks/useSchools';


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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/hooks/useLanguage';
import { FilterPanel } from '@/components/layout/FilterPanel';

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
            const query = (searchQuery || '').toLowerCase();
            const matchesSearch =
                slot.name?.toLowerCase().includes(query) ||
                slot.code?.toLowerCase().includes(query);

            // Filter by school if selected
            let matchesSchool = true;
            if (selectedSchoolId) {
                if (selectedSchoolId === 'none') {
                    // "Organization-wide Only" - show only slots with null school_id
                    matchesSchool = slot.schoolId === null;
                } else if (selectedSchoolId !== 'all') {
                    // Specific school - show slots for that school OR organization-wide (null school_id)
                    matchesSchool = slot.schoolId === null || slot.schoolId === selectedSchoolId;
                }
                // "All Schools" (selectedSchoolId === 'all') - show all slots, no filter needed
            }

            return matchesSearch && matchesSchool;
        });
    }, [slots, searchQuery, selectedSchoolId]);

    const openDialog = (slot?: ScheduleSlot) => {
        // Convert time format from H:i:s to HH:MM for form display
        const convertTimeForForm = (time: string): string => {
            if (!time) return '08:00';
            // If in H:i:s format, extract HH:MM
            if (time.length >= 5) {
                return time.substring(0, 5);
            }
            return time;
        };

        if (slot) {
            setEditingSlot(slot);
            form.reset({
                name: slot.name,
                code: slot.code,
                start_time: convertTimeForForm(slot.startTime),
                end_time: convertTimeForForm(slot.endTime),
                days_of_week: slot.daysOfWeek || [],
                default_duration_minutes: slot.defaultDurationMinutes || 45,
                academic_year_id: slot.academicYearId || null,
                school_id: slot.schoolId || null,
                sort_order: slot.sortOrder,
                is_active: slot.isActive,
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
            // Convert time format from HH:MM to H:i:s (add seconds)
            const convertTimeFormat = (time: string): string => {
                if (!time) return '';
                // If already in H:i:s format, return as is
                if (time.length === 8 && time.includes(':')) {
                    return time;
                }
                // If in HH:MM format, add :00 seconds
                if (time.length === 5 && time.includes(':')) {
                    return `${time}:00`;
                }
                return time;
            };

            if (editingSlot) {
                await updateSlot.mutateAsync({
                    id: editingSlot.id,
                    name: values.name,
                    code: values.code,
                    startTime: convertTimeFormat(values.start_time),
                    endTime: convertTimeFormat(values.end_time),
                    daysOfWeek: values.days_of_week || [],
                    defaultDurationMinutes: values.default_duration_minutes || 45,
                    academicYearId: values.academic_year_id || null,
                    schoolId: values.school_id || null,
                    sortOrder: values.sort_order || 1,
                    isActive: values.is_active ?? true,
                    description: values.description || null,
                    organizationId: profile?.organization_id || undefined,
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
                    startTime: convertTimeFormat(values.start_time),
                    endTime: convertTimeFormat(values.end_time),
                    daysOfWeek: values.days_of_week || [],
                    defaultDurationMinutes: values.default_duration_minutes || 45,
                    academicYearId: values.academic_year_id || null,
                    schoolId: values.school_id || null,
                    sortOrder: values.sort_order || 1,
                    isActive: values.is_active ?? true,
                    description: values.description || null,
                    organizationId: profile?.organization_id || undefined,
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
        // Convert H:i:s to HH:MM for display
        const formatTime = (time: string) => time.length >= 5 ? time.substring(0, 5) : time;
        return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (${slot.defaultDurationMinutes || 45} min)`;
    };

    // Get badge color for academic year based on its ID (stable hash-based)
    const academicYearColorMap = useMemo(() => {
        if (!academicYears || academicYears.length === 0) return new Map<string, string>();

        // Create a map of academic year IDs to colors for consistency
        const colorMap = new Map<string, string>();
        const colorClasses = [
            'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
            'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
            'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
            'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
            'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
            'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
            'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
            'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
            'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
            'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
        ];

        // Assign colors to academic years based on their sorted order (stable)
        const sortedYears = [...academicYears].sort((a, b) => a.name.localeCompare(b.name));
        sortedYears.forEach((year, index) => {
            colorMap.set(year.id, colorClasses[index % colorClasses.length]);
        });

        return colorMap;
    }, [academicYears]);

    const getAcademicYearBadgeColor = (academicYearId: string | null | undefined): string => {
        if (!academicYearId) return '';
        return academicYearColorMap.get(academicYearId) || '';
    };

    // Get badge color for day of week (consistent color per day)
    const getDayBadgeColor = (day: string): string => {
        const dayColorMap: Record<string, string> = {
            monday: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
            tuesday: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
            wednesday: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
            thursday: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
            friday: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
            saturday: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
            sunday: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
        };
        return dayColorMap[day.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    };

    const formatDays = (days: string[]) => {
        if (!days || days.length === 0) return t('academic.scheduleSlots.anyDay') || 'Any Day';
        if (days.length === 7) return t('academic.scheduleSlots.allDays') || 'All Days';
        return days.map(day => t(`academic.timetable.days.${day}`)).join(', ');
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('academic.scheduleSlots.title') || 'Schedule Slots'}
                description={t('academic.scheduleSlots.management') || 'Manage time slots for class schedules'}
                icon={<Clock className="h-5 w-5" />}
                primaryAction={hasCreatePermission ? {
                    label: t('academic.scheduleSlots.addSlot') || 'Add Slot',
                    onClick: () => openDialog(),
                    icon: <Plus className="h-4 w-4" />,
                } : undefined}
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t('academic.scheduleSlots.title')}</CardTitle>
                    <CardDescription className="hidden md:block">{t('academic.scheduleSlots.management')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <FilterPanel
                        title={t('common.filters') || 'Filters'}
                        defaultOpenDesktop={true}
                        defaultOpenMobile={false}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {academicYears && academicYears.length > 0 && (
                                <div>
                                    <Label>{t('academic.scheduleSlots.selectAcademicYear')}</Label>
                                    <Select
                                        value={selectedAcademicYearId || 'all'}
                                        onValueChange={(value) => setSelectedAcademicYearId(value === 'all' ? undefined : value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t('academic.scheduleSlots.selectAcademicYear')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('common.allAcademicYears')}</SelectItem>
                                            {academicYears.map((year) => (
                                                <SelectItem key={year.id} value={year.id}>
                                                    {year.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {schools && schools.length > 0 && (
                                <div>
                                    <Label>{t('academic.scheduleSlots.school')}</Label>
                                    <Select
                                        value={selectedSchoolId || 'all'}
                                        onValueChange={(value) => setSelectedSchoolId(value === 'all' ? undefined : value)}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder={t('academic.scheduleSlots.school')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('academic.scheduleSlots.allSchools')}</SelectItem>
                                            <SelectItem value="none">{t('academic.scheduleSlots.organizationWide') || 'Organization-wide Only'}</SelectItem>
                                            {schools.map((school) => (
                                                <SelectItem key={school.id} value={school.id}>
                                                    {school.schoolName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div>
                                <Label>{t('common.search') || 'Search'}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('academic.scheduleSlots.searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </FilterPanel>
                </CardContent>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
                    ) : filteredSlots.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery ? t('academic.scheduleSlots.noSlotsFound') : t('academic.scheduleSlots.noSlotsMessage')}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto -mx-4 md:mx-0">
                                <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                    <div className="rounded-md border">
                                        <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('academic.scheduleSlots.code')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.name')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.timeRange') || 'Time Range'}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.duration')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.days')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.academicYear')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.school')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.sortOrder')}</TableHead>
                                            <TableHead>{t('academic.scheduleSlots.isActive')}</TableHead>
                                            <TableHead className="text-right">{t('common.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSlots.map((slot) => (
                                            <TableRow key={slot.id}>
                                                <TableCell className="font-mono">{slot.code}</TableCell>
                                                <TableCell className="font-medium">{slot.name}</TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const formatTime = (time: string) => time.length >= 5 ? time.substring(0, 5) : time;
                                                        return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
                                                    })()}
                                                </TableCell>
                                                <TableCell>{slot.defaultDurationMinutes || 45} min</TableCell>
                                                <TableCell>
                                                    {slot.daysOfWeek && slot.daysOfWeek.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {slot.daysOfWeek.map((day) => (
                                                                <Badge 
                                                                    key={day} 
                                                                    variant="outline" 
                                                                    className={`text-xs ${getDayBadgeColor(day)}`}
                                                                >
                                                                    {t(`academic.timetable.days.${day}`)}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t('common.all')}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {slot.academicYear ? (
                                                        <Badge 
                                                            variant="outline" 
                                                            className={getAcademicYearBadgeColor(slot.academicYear.id)}
                                                        >
                                                            {slot.academicYear.name}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline">{t('academic.scheduleSlots.global')}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {slot.school ? (
                                                        <Badge variant="outline" className="text-xs">{slot.school.schoolName}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">{t('academic.scheduleSlots.organizationWide') || 'Organization-wide'}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{slot.sortOrder}</TableCell>
                                                <TableCell>
                                                    <Badge variant={slot.isActive ? 'default' : 'secondary'}>
                                                        {slot.isActive ? t('academic.scheduleSlots.active') : t('academic.scheduleSlots.inactive')}
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
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeletingSlot(slot)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                                <AlertDialog open={deletingSlot?.id === slot.id} onOpenChange={(open) => {
                                                                    if (!open) {
                                                                        setDeletingSlot(null);
                                                                    }
                                                                }}>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>{t('academic.scheduleSlots.deleteSlot')}</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                {t('academic.scheduleSlots.deleteConfirm')} "{slot.name}"
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel onClick={() => setDeletingSlot(null)}>{t('common.cancel')}</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                                                {t('common.delete')}
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                        </Table>
                                    </div>
                                </div>
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
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeletingSlot(slot)}
                                                                >
                                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                                </Button>
                                                                <AlertDialog open={deletingSlot?.id === slot.id} onOpenChange={(open) => {
                                                                    if (!open) {
                                                                        setDeletingSlot(null);
                                                                    }
                                                                }}>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>{t('academic.scheduleSlots.deleteSlot')}</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                {t('academic.scheduleSlots.deleteConfirm')} "{slot.name}"
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel onClick={() => setDeletingSlot(null)}>{t('common.cancel')}</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                                                {t('common.delete')}
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Time:</span>
                                                        <div className="font-medium">
                                                            {(() => {
                                                                const formatTime = (time: string) => time.length >= 5 ? time.substring(0, 5) : time;
                                                                return `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Duration:</span>
                                                        <div className="font-medium">{slot.defaultDurationMinutes || 45} min</div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Days:</span>
                                                        <div>
                                                            {slot.daysOfWeek && slot.daysOfWeek.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {slot.daysOfWeek.map((day) => (
                                                                        <Badge 
                                                                            key={day} 
                                                                            variant="outline" 
                                                                            className={`text-xs ${getDayBadgeColor(day)}`}
                                                                        >
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
                                                        <span className="text-muted-foreground">{t('common.statusLabel')}</span>
                                                        <div className="mt-1">
                                                            <Badge variant={slot.isActive ? 'default' : 'secondary'}>
                                                                {slot.isActive ? t('academic.scheduleSlots.active') : t('academic.scheduleSlots.inactive')}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Academic Year:</span>
                                                        <div className="mt-1">
                                                            {slot.academicYear ? (
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={`text-xs ${getAcademicYearBadgeColor(slot.academicYear.id)}`}
                                                                >
                                                                    {slot.academicYear.name}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">Global</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">School:</span>
                                                        <div className="mt-1">
                                                            {slot.school ? (
                                                                <Badge variant="outline" className="text-xs">{slot.school.schoolName}</Badge>
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
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>{editingSlot ? t('academic.scheduleSlots.editSlot') : t('academic.scheduleSlots.addSlot')}</DialogTitle>
                        <DialogDescription>
                            {editingSlot ? t('academic.scheduleSlots.updateSlot') || 'Update the schedule slot details' : t('academic.scheduleSlots.createSlot') || 'Create a new time range for scheduling'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">{t('academic.scheduleSlots.code')} *</Label>
                                <Input
                                    id="code"
                                    {...form.register('code')}
                                    placeholder={t('academic.scheduleSlots.code')}
                                />
                                {form.formState.errors.code && (
                                    <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('academic.scheduleSlots.name')} *</Label>
                                <Input
                                    id="name"
                                    {...form.register('name')}
                                    placeholder={t('academic.scheduleSlots.name')}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="default_duration_minutes">{t('academic.scheduleSlots.duration')} *</Label>
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
                                <Label htmlFor="start_time">{t('academic.scheduleSlots.startTime')} *</Label>
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
                                <Label htmlFor="end_time">{t('academic.scheduleSlots.endTime')} *</Label>
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
                                                    <SelectValue placeholder={t('common.selectSchool')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('academic.scheduleSlots.allSchools')}</SelectItem>
                                                    {schools.map((school) => (
                                                        <SelectItem key={school.id} value={school.id}>
                                                            {school.schoolName}
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
                                <Label htmlFor="sort_order">{t('academic.scheduleSlots.sortOrder')} *</Label>
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
                                            <Label htmlFor="is_active">{t('academic.scheduleSlots.isActive')}</Label>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('academic.scheduleSlots.description')}</Label>
                            <Textarea
                                id="description"
                                {...form.register('description')}
                                placeholder={t('academic.scheduleSlots.description')}
                                rows={3}
                            />
                            {form.formState.errors.description && (
                                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={createSlot.isPending || updateSlot.isPending}>
                                {editingSlot ? t('common.save') : t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

