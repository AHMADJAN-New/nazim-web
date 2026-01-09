import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UsageLimitWarning, useCanCreate } from '@/components/subscription';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
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
import { Search, Plus, Pencil, Trash2, Eye, Users, Filter, X, ChevronRight, ChevronLeft, User, MapPin, GraduationCap, Briefcase, FileText, CheckCircle2 } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useLanguage } from '@/hooks/useLanguage';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { StaffProfile } from '@/components/staff/StaffProfile';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { useStaff, useDeleteStaff, useStaffStats, useCreateStaff, useUpdateStaff, useStaffTypes } from '@/hooks/useStaff';
import type { Staff } from '@/types/domain/staff';

const staffSchema = z.object({
    employee_id: z.string().min(1, 'Employee ID is required').max(50, 'Employee ID must be 50 characters or less'),
    staff_type_id: z.string().uuid('Staff type is required').refine((val) => val !== 'none' && val !== null, {
        message: 'Staff type is required',
    }),
    school_id: z.string().uuid().nullable().optional(),
    first_name: z.string().min(1, 'First name is required').max(100, 'First name must be 100 characters or less'),
    father_name: z.string().min(1, 'Father name is required').max(100, 'Father name must be 100 characters or less'),
    grandfather_name: z.string().max(100, 'Grandfather name must be 100 characters or less').optional().nullable(),
    tazkira_number: z.string().max(50, 'Tazkira number must be 50 characters or less').optional().nullable(),
    birth_year: z.string().max(10, 'Birth year must be 10 characters or less').optional().nullable(),
    birth_date: z.string().optional().nullable(),
    phone_number: z.string().max(20, 'Phone number must be 20 characters or less').optional().nullable(),
    email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
    home_address: z.string().max(255, 'Home address must be 255 characters or less').optional().nullable(),
    origin_province: z.string().max(50, 'Province must be 50 characters or less').optional().nullable(),
    origin_district: z.string().max(50, 'District must be 50 characters or less').optional().nullable(),
    origin_village: z.string().max(50, 'Village must be 50 characters or less').optional().nullable(),
    current_province: z.string().max(50, 'Province must be 50 characters or less').optional().nullable(),
    current_district: z.string().max(50, 'District must be 50 characters or less').optional().nullable(),
    current_village: z.string().max(50, 'Village must be 50 characters or less').optional().nullable(),
    // Education fields
    religious_education: z.string().max(255, 'Religious education must be 255 characters or less').optional().nullable(),
    religious_university: z.string().max(255, 'Religious university must be 255 characters or less').optional().nullable(),
    religious_graduation_year: z.string().max(10, 'Religious graduation year must be 10 characters or less').optional().nullable(),
    religious_department: z.string().max(255, 'Religious department must be 255 characters or less').optional().nullable(),
    modern_education: z.string().max(255, 'Modern education must be 255 characters or less').optional().nullable(),
    modern_school_university: z.string().max(255, 'Modern school/university must be 255 characters or less').optional().nullable(),
    modern_graduation_year: z.string().max(10, 'Modern graduation year must be 10 characters or less').optional().nullable(),
    modern_department: z.string().max(255, 'Modern department must be 255 characters or less').optional().nullable(),
    // Employment fields
    teaching_section: z.string().max(255, 'Teaching section must be 255 characters or less').optional().nullable(),
    position: z.string().max(255, 'Position must be 255 characters or less').optional().nullable(),
    duty: z.string().max(255, 'Duty must be 255 characters or less').optional().nullable(),
    salary: z.string().max(50, 'Salary must be 50 characters or less').optional().nullable(),
    status: z.enum(['active', 'inactive', 'on_leave', 'terminated', 'suspended']).default('active'),
    notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional().nullable(),
});

type StaffFormData = z.infer<typeof staffSchema>;

export function StaffList() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('staff.create');
    
    // Check usage limits for staff
    const staffUsage = useCanCreate('staff');
    const hasUpdatePermission = useHasPermission('staff.update');
    const hasDeletePermission = useHasPermission('staff.delete');
    const hasReadPermission = useHasPermission('staff.read');
    const hasReportPermission = useHasPermission('staff_reports.read');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    // Initialize selectedOrganizationId - will be set from profile when it loads
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(undefined);
    
    // Automatically set selectedOrganizationId from profile when it loads
    useEffect(() => {
        if (profile?.organization_id && !selectedOrganizationId) {
            setSelectedOrganizationId(profile.organization_id);
        }
    }, [profile?.organization_id, selectedOrganizationId]);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [viewingProfile, setViewingProfile] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, label: t('events.basicInformation'), icon: User, description: t('staff.basicInformationDescription') },
        { id: 2, label: t('staff.personalDetails'), icon: User, description: t('staff.personalDetailsDescription') },
        { id: 3, label: t('staff.contactLocation'), icon: MapPin, description: t('staff.contactLocationDescription') },
        { id: 4, label: t('staff.education'), icon: GraduationCap, description: t('staff.educationDescription') },
        { id: 5, label: t('staff.employment'), icon: Briefcase, description: t('staff.employmentDescription') },
    ];

    const { data: organizations } = useOrganizations();
    // Pass undefined when "all" is selected to fetch from all accessible organizations
    const orgIdForQuery = selectedOrganizationId === 'all' ? undefined : selectedOrganizationId;
    const { data: schools } = useSchools(orgIdForQuery);
    const { data: staffTypes } = useStaffTypes(orgIdForQuery);
    // Use paginated version of the hook
    const { 
        data: staff, 
        isLoading, 
        refetch: refetchStaff,
        pagination,
        page,
        pageSize,
        setPage,
        setPageSize,
    } = useStaff(orgIdForQuery, true) as {
        data: Staff[];
        isLoading: boolean;
        refetch: () => void;
        pagination: any;
        page: number;
        pageSize: number;
        setPage: (page: number) => void;
        setPageSize: (pageSize: number) => void;
    };
    const { data: stats } = useStaffStats(orgIdForQuery);
    const deleteStaff = useDeleteStaff();
    const createStaff = useCreateStaff();
    const updateStaff = useUpdateStaff();

    const formMethods = useForm<StaffFormData>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            status: 'active',
        },
    });

    const {
        register,
        handleSubmit,
        control,
        reset,
        trigger,
        formState: { errors },
    } = formMethods;

    // Client-side filtering for search
    const filteredStaff = useMemo(() => {
        if (!staff || !Array.isArray(staff)) return [];

        return staff.filter((s) => {
            const query = (searchQuery || '').toLowerCase();
            const matchesSearch =
                s.fullName?.toLowerCase().includes(query) ||
                s.employeeId?.toLowerCase().includes(query) ||
                s.staffCode?.toLowerCase().includes(query) ||
                s.email?.toLowerCase().includes(query) ||
                s.phoneNumber?.toLowerCase().includes(query);

            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            const matchesType = typeFilter === 'all' || s.staffTypeId === typeFilter;
            const matchesSchool = schoolFilter === 'all' || s.schoolId === schoolFilter;

            return matchesSearch && matchesStatus && matchesType && matchesSchool;
        });
    }, [staff, searchQuery, statusFilter, typeFilter, schoolFilter]);

    // Helper function to get picture URL (defined later, removing duplicate)

    // Define columns for DataTable
    const columns: ColumnDef<Staff>[] = [
        {
            accessorKey: 'photo',
            header: t('staff.photo'),
            cell: ({ row }) => {
                const pictureUrl = row.original.pictureUrl 
                    ? (row.original.pictureUrl.startsWith('http') 
                        ? row.original.pictureUrl 
                        : `${import.meta.env.VITE_API_URL || ''}/storage/${row.original.pictureUrl}`)
                    : null;
                return (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {pictureUrl ? (
                            <img src={pictureUrl} alt={row.original.fullName} className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-6 h-6 text-muted-foreground" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'fullName',
            header: t('events.name'),
            cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span>,
        },
        {
            accessorKey: 'staffCode',
            header: t('staff.id'),
            cell: ({ row }) => (
                <div className="font-mono text-sm font-medium">
                    {row.original.staffCode || row.original.employeeId || '—'}
                </div>
            ),
        },
        {
            accessorKey: 'employeeId',
            header: t('search.employeeId'),
            cell: ({ row }) => row.original.employeeId,
        },
        {
            accessorKey: 'staffType',
            header: t('events.type'),
            cell: ({ row }) => {
                const type = staffTypes?.find(t => t.id === row.original.staffTypeId);
                return type ? <Badge variant="outline">{type.name}</Badge> : '-';
            },
        },
        {
            accessorKey: 'status',
            header: t('events.status'),
            cell: ({ row }) => {
                const statusColors: Record<string, string> = {
                    active: 'default',
                    inactive: 'secondary',
                    on_leave: 'outline',
                    terminated: 'destructive',
                    suspended: 'destructive',
                };
                return (
                    <Badge variant={statusColors[row.original.status] as any || 'secondary'}>
                        {row.original.status}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'school',
            header: t('staff.school'),
            cell: ({ row }) => {
                const school = schools?.find(s => s.id === row.original.schoolId);
                return school ? (school.schoolName || (school as any).school_name) : '-';
            },
        },
        {
            accessorKey: 'contact',
            header: t('events.contact'),
            cell: ({ row }) => (
                <div className="text-sm">
                    {row.original.email && <div>{row.original.email}</div>}
                    {row.original.phoneNumber && <div className="text-muted-foreground">{row.original.phoneNumber}</div>}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-right">{t('events.actions')}</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingProfile(row.original.id)}
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    {hasUpdatePermission && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setEditingStaff(row.original);
                                reset({
                                    employee_id: row.original.employeeId,
                                    staff_type_id: row.original.staffTypeId,
                                    school_id: row.original.schoolId || null,
                                    first_name: row.original.firstName,
                                    father_name: row.original.fatherName,
                                    grandfather_name: row.original.grandfatherName || null,
                                    tazkira_number: row.original.tazkiraNumber || null,
                                    birth_year: row.original.birthYear || null,
                                    birth_date: row.original.birthDate || null,
                                    phone_number: row.original.phoneNumber || null,
                                    email: row.original.email || null,
                                    home_address: row.original.homeAddress || null,
                                    origin_province: row.original.originLocation?.province || null,
                                    origin_district: row.original.originLocation?.district || null,
                                    origin_village: row.original.originLocation?.village || null,
                                    current_province: row.original.currentLocation?.province || null,
                                    current_district: row.original.currentLocation?.district || null,
                                    current_village: row.original.currentLocation?.village || null,
                                    religious_education: row.original.religiousEducation?.level || null,
                                    religious_university: row.original.religiousEducation?.institution || null,
                                    religious_graduation_year: row.original.religiousEducation?.graduationYear || null,
                                    religious_department: row.original.religiousEducation?.department || null,
                                    modern_education: row.original.modernEducation?.level || null,
                                    modern_school_university: row.original.modernEducation?.institution || null,
                                    modern_graduation_year: row.original.modernEducation?.graduationYear || null,
                                    modern_department: row.original.modernEducation?.department || null,
                                    teaching_section: row.original.teachingSection || null,
                                    position: row.original.position || null,
                                    duty: row.original.duty || null,
                                    salary: row.original.salary || null,
                                    status: row.original.status,
                                    notes: row.original.notes || null,
                                });
                                setIsEditDialogOpen(true);
                            }}
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                    )}
                    {hasDeletePermission && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(row.original.id)}
                        >
                            <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    // Use DataTable hook for pagination integration
    const { table } = useDataTable({
        data: filteredStaff,
        columns,
        pageCount: pagination?.last_page,
        paginationMeta: pagination ?? null,
        initialState: {
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        onPaginationChange: (newPagination) => {
            setPage(newPagination.pageIndex + 1);
            setPageSize(newPagination.pageSize);
        },
    });

    const handleDeleteClick = (staffId: string) => {
        setSelectedStaff(staffId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedStaff) {
            deleteStaff.mutate(selectedStaff, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedStaff(null);
                },
            });
        }
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'active':
                return 'default';
            case 'inactive':
                return 'secondary';
            case 'on_leave':
                return 'outline';
            case 'terminated':
                return 'destructive';
            case 'suspended':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const getPictureUrl = (staffMember: Staff) => {
        if (!staffMember.pictureUrl) return null;
        // Construct URL from Laravel API storage path
        // Laravel API returns full URLs or paths that can be accessed via /storage/ endpoint
        const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
        const schoolPath = staffMember.schoolId ? `${staffMember.schoolId}/` : '';
        const path = `${staffMember.organizationId}/${schoolPath}${staffMember.id}/picture/${staffMember.pictureUrl}`;
        // Laravel typically serves files from /storage/ path
        return `${baseUrl.replace('/api', '')}/storage/staff-files/${path}`;
    };

    if (!hasReadPermission) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">{t('staff.noPermissionToView')}</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // StaffProfile is now a Dialog, so it can be rendered alongside the list

    return (
        <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl w-full overflow-x-hidden min-w-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold">{t('students.management')}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        {t('hostel.subtitle')}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {hasReportPermission && (
                        <Button variant="outline" asChild className="w-full sm:w-auto">
                            <Link to="/reports/staff-registrations" className="flex items-center justify-center">
                                <FileText className="w-4 h-4 mr-2" />
                                <span className="text-xs sm:text-sm">{t('staff.registrationReport')}</span>
                            </Link>
                        </Button>
                    )}
                    {hasCreatePermission && (
                        <Button 
                            type="button" 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Ensure profile has organization_id
                                if (!profile?.organization_id) {
                                    toast.error(t('events.notAssignedToOrganization'));
                                    return;
                                }
                                if (import.meta.env.DEV) {
                                    console.log('Create staff button clicked');
                                }
                                setIsCreateDialogOpen(true);
                            }}
                            disabled={!profile?.organization_id}
                            className="w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="text-xs sm:text-sm">{t('staff.addStaff')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('staff.totalStaff')}</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">{t('staff.acrossSelected') || 'Across selected organization'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('events.active')}</CardTitle>
                            <Users className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                            <p className="text-xs text-muted-foreground">{t('staff.activeStaff') || 'Active staff members'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('staff.onLeave')}</CardTitle>
                            <Users className="h-4 w-4 text-orange-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.onLeave}</div>
                            <p className="text-xs text-muted-foreground">{t('staff.onLeaveStaff') || 'Staff on leave'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('staff.teachers')}</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{stats.byType.teacher}</div>
                            <p className="text-xs text-muted-foreground">{t('staff.teacherCount') || 'Teaching staff'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('staff.admins')}</CardTitle>
                            <Users className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">{stats.byType.admin}</div>
                            <p className="text-xs text-muted-foreground">{t('staff.adminCount') || 'Administrative staff'}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters and Table Card */}
            <Card>
                <CardHeader>
                    <CardTitle>{t('grades.list') || 'Staff List'}</CardTitle>
                    <CardDescription>{t('staff.listDescription') || 'Search, filter and manage staff members.'}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4">
                        <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px] sm:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t('assets.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-full min-w-0"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[150px] min-w-0">
                                <SelectValue placeholder={t('events.status')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('userManagement.allStatus')}</SelectItem>
                                <SelectItem value="active">{t('staff.statusActive')}</SelectItem>
                                <SelectItem value="inactive">{t('staff.statusInactive')}</SelectItem>
                                <SelectItem value="on_leave">{t('staff.statusOnLeave')}</SelectItem>
                                <SelectItem value="terminated">{t('staff.statusTerminated')}</SelectItem>
                                <SelectItem value="suspended">{t('staff.statusSuspended')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-[150px] min-w-0">
                                <SelectValue placeholder={t('events.type')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('staff.allTypes')}</SelectItem>
                                {staffTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {schools && schools.length > 0 && (
                            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                            <SelectTrigger className="w-full sm:w-[150px] min-w-0">
                                <SelectValue placeholder={t('staff.school')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('leave.allSchools')}</SelectItem>
                                    {schools.map((school) => (
                                        <SelectItem key={school.id} value={school.id}>
                                            {school.schoolName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || schoolFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                    setSchoolFilter('all');
                                }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                {t('events.clear')}
                            </Button>
                        )}
                    </div>

                    {/* Staff Table */}
                    {isLoading ? (
                        <div className="p-6">
                            <LoadingSpinner text={t('staff.loadingStaff')} />
                        </div>
                    ) : !staff || (Array.isArray(staff) && filteredStaff.length === 0) ? (
                        <div className="p-6 text-center text-muted-foreground">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || schoolFilter !== 'all'
                                ? t('staff.noStaffMembersFound')
                                : !staff || staff.length === 0
                                ? t('staff.noStaffMembersAvailable')
                                : t('staff.noStaffMembersFound')}
                        </div>
                    ) : (
                        <>
                            <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0">
                                <Table className="w-full">
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead 
                                                        key={header.id}
                                                        className={header.column.columnDef.meta?.className}
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : typeof header.column.columnDef.header === 'function'
                                                            ? header.column.columnDef.header({ column: header.column, header, table })
                                                            : header.column.columnDef.header}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                                                    {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || schoolFilter !== 'all'
                                                        ? t('staff.noStaffMembersFound')
                                                        : t('staff.noStaffMembersAvailable')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            table.getRowModel().rows.map((row) => (
                                                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                                    {row.getVisibleCells().map((cell) => (
                                                        <TableCell 
                                                            key={cell.id}
                                                            className={cell.column.columnDef.meta?.className}
                                                        >
                                                            {typeof cell.column.columnDef.cell === 'function'
                                                                ? cell.column.columnDef.cell(cell.getContext())
                                                                : cell.renderValue() as React.ReactNode}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="p-3 sm:p-4">
                                <DataTablePagination
                                    table={table}
                                    paginationMeta={pagination ?? null}
                                    onPageChange={setPage}
                                    onPageSizeChange={setPageSize}
                                    showPageSizeSelector={true}
                                    showTotalCount={true}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create Staff Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                console.log('Dialog open state changing:', open, 'Current state:', isCreateDialogOpen);
                setIsCreateDialogOpen(open);
                if (!open) {
                    reset();
                    setCurrentStep(1);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                    <FormProvider {...formMethods}>
                      <form onSubmit={handleSubmit(async (data) => {
                        // Wait for profile to load
                        if (!profile) {
                            toast.error(t('staff.pleaseWait'));
                            return;
                        }

                        // Validation is handled by react-hook-form, but double-check required fields
                        if (!data.staff_type_id || data.staff_type_id === 'none') {
                            toast.error(t('staff.pleaseSelectStaffType'));
                            setCurrentStep(1); // Go back to step 1 to show the error
                            return;
                        }

                        // Ensure school_id is null if it's 'none' or empty string
                        const schoolId = data.school_id && data.school_id !== 'none' && data.school_id !== ''
                            ? data.school_id
                            : null;

                        // Get organization_id: 
                        // All users use profile.organization_id (auto-assigned, cannot be changed)
                        let organizationId: string | undefined = profile?.organization_id;
                        
                        // If school is selected, get organization_id from school as fallback
                        if (!organizationId && schoolId) {
                            const selectedSchool = schools?.find(s => s.id === schoolId);
                            if (selectedSchool) {
                                organizationId = selectedSchool.organizationId;
                            }
                            
                            if (!organizationId) {
                                toast.error(t('events.pleaseSelectOrganization'));
                                return;
                            }
                        } else {
                            // Regular users: ALWAYS use profile's organization_id (auto-assigned on login)
                            // Ignore selectedOrganizationId for regular users - they can only use their own org
                            organizationId = profile?.organization_id;
                            
                            if (!organizationId) {
                                // This shouldn't happen - backend assigns org on login/register
                                toast.error(t('events.notAssignedToOrganization'));
                                console.error('Profile missing organization_id. Profile:', profile);
                                return;
                            }
                            
                            // If school is selected, validate it belongs to user's organization
                            if (schoolId) {
                                const selectedSchool = schools?.find(s => s.id === schoolId);
                                if (selectedSchool && selectedSchool.organizationId !== organizationId) {
                                    toast.error(t('staff.selectedSchoolNotBelong'));
                                    return;
                                }
                            }
                        }

                        // Convert form data (snake_case) to domain model (camelCase)
                        const staffData: Partial<Staff> = {
                            employeeId: data.employee_id,
                            staffTypeId: data.staff_type_id,
                            firstName: data.first_name,
                            fatherName: data.father_name,
                            organizationId,
                            schoolId,
                            email: data.email || null,
                            grandfatherName: data.grandfather_name || null,
                            tazkiraNumber: data.tazkira_number || null,
                            birthYear: data.birth_year || null,
                            birthDate: data.birth_date || null,
                            phoneNumber: data.phone_number || null,
                            homeAddress: data.home_address || null,
                            originLocation: {
                                province: data.origin_province || null,
                                district: data.origin_district || null,
                                village: data.origin_village || null,
                            },
                            currentLocation: {
                                province: data.current_province || null,
                                district: data.current_district || null,
                                village: data.current_village || null,
                            },
                            religiousEducation: {
                                level: data.religious_education || null,
                                institution: data.religious_university || null,
                                graduationYear: data.religious_graduation_year || null,
                                department: data.religious_department || null,
                            },
                            modernEducation: {
                                level: data.modern_education || null,
                                institution: data.modern_school_university || null,
                                graduationYear: data.modern_graduation_year || null,
                                department: data.modern_department || null,
                            },
                            teachingSection: data.teaching_section || null,
                            position: data.position || null,
                            duty: data.duty || null,
                            salary: data.salary || null,
                            status: data.status || 'active',
                            notes: data.notes || null,
                        };

                        createStaff.mutate(staffData, {
                            onSuccess: () => {
                                setIsCreateDialogOpen(false);
                                reset();
                                setCurrentStep(1);
                                // Force refetch to show the new staff member immediately
                                // This ensures it appears even when "all" organizations filter is active
                                refetchStaff();
                            },
                            onError: (error) => {
                                console.error('Error creating staff:', error);
                                toast.error(error.message || t('staff.failedToCreate'));
                            },
                        });
                    })}>
                        <DialogHeader>
                            <DialogTitle>{t('staff.createEmployee')}</DialogTitle>
                            <DialogDescription className="hidden md:block">
                                {t('staff.createEmployeeDescription')}
                            </DialogDescription>
                        </DialogHeader>

                        {/* Show usage limit warning when creating new staff */}
                        {(staffUsage.isWarning || !staffUsage.canCreate) && (
                            <UsageLimitWarning resourceKey="staff" compact />
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 py-4">
                            {/* Step Navigation - Vertical Sidebar (Desktop Only) */}
                            <div className="hidden md:block border-r pr-6">
                                <div className="flex flex-col">
                                    {steps.map((step, index) => {
                                        const StepIcon = step.icon;
                                        const isActive = currentStep === step.id;
                                        const isCompleted = currentStep > step.id;
                                        const isLast = index === steps.length - 1;
                                        return (
                                            <div key={step.id} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transition-colors ${isActive
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : isCompleted
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background border-muted-foreground text-muted-foreground'
                                                            }`}
                                                        onClick={() => setCurrentStep(step.id)}
                                                    >
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        ) : (
                                                            <StepIcon className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    {!isLast && (
                                                        <div
                                                            className={`w-0.5 h-12 mt-1 ${isCompleted ? 'bg-primary' : 'bg-muted'
                                                                }`}
                                                        />
                                                    )}
                                                </div>
                                                <div
                                                    className={`flex-1 pb-6 cursor-pointer ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                                        }`}
                                                    onClick={() => setCurrentStep(step.id)}
                                                >
                                                    <span className={`text-xs font-medium block ${isActive ? 'text-primary' : ''}`}>
                                                        {step.label}
                                                    </span>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step Indicator - Mobile Only */}
                            <div className="md:hidden mb-4">
                                <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        {(() => {
                                            const currentStepData = steps.find(s => s.id === currentStep);
                                            const currentStepIndex = steps.findIndex(s => s.id === currentStep);
                                            const StepIcon = currentStepData?.icon || User;
                                            return (
                                                <>
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                                                        <StepIcon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium">{currentStepData?.label || 'Step'}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Step {currentStepIndex + 1} of {steps.length}
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {steps.map((step) => {
                                            const isActive = currentStep === step.id;
                                            const isCompleted = currentStep > step.id;
                                            return (
                                                <div
                                                    key={step.id}
                                                    className={`w-2 h-2 rounded-full transition-colors ${
                                                        isActive
                                                            ? 'bg-primary'
                                                            : isCompleted
                                                                ? 'bg-primary/50'
                                                                : 'bg-muted'
                                                    }`}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="flex-1">
                                {/* Step 1: Basic Information */}
                                {currentStep === 1 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <User className="h-5 w-5" />
                                                    Basic Information
                                                </CardTitle>
                                                <CardDescription className="hidden md:block">Core employee identification and status information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="employee_id">{t('staff.employeeCode')} *</Label>
                                                        <Input id="employee_id" {...register('employee_id')} placeholder={t('staff.employeeCodePlaceholder')} />
                                                        <p className="text-xs text-muted-foreground">{t('staff.employeeCodeHelper')}</p>
                                                        {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="staff_type_id">{t('staff.staffType')} *</Label>
                                                        <Controller
                                                            name="staff_type_id"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                    <SelectTrigger><SelectValue placeholder={t('staff.selectStaffType')} /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">{t('staff.selectStaffTypePlaceholder')}</SelectItem>
                                                                        {staffTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                        {errors.staff_type_id && <p className="text-sm text-destructive">{errors.staff_type_id.message}</p>}
                                                    </div>
                                                    {schools && schools.length > 0 && (
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="school_id">{t('staff.school')}</Label>
                                                            <Controller
                                                                name="school_id"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                        <SelectTrigger><SelectValue placeholder={t('events.selectSchool')} /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">{t('staff.noSchool')}</SelectItem>
                                                                            {schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="status">{t('staff.employmentStatus')} *</Label>
                                                        <Controller
                                                            name="status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="active">{t('staff.statusActive')}</SelectItem>
                                                                        <SelectItem value="inactive">{t('staff.statusInactive')}</SelectItem>
                                                                        <SelectItem value="on_leave">{t('staff.statusOnLeave')}</SelectItem>
                                                                        <SelectItem value="terminated">{t('staff.statusTerminated')}</SelectItem>
                                                                        <SelectItem value="suspended">{t('staff.statusSuspended')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 2: Personal Details */}
                                {currentStep === 2 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <User className="h-5 w-5" />
                                                    Personal Details
                                                </CardTitle>
                                                <CardDescription className="hidden md:block">Personal information and identification</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="first_name">{t('events.firstName')} *</Label>
                                                        <Input id="first_name" {...register('first_name')} />
                                                        {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="father_name">{t('examReports.fatherName')} *</Label>
                                                        <Input id="father_name" {...register('father_name')} />
                                                        {errors.father_name && <p className="text-sm text-destructive">{errors.father_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="grandfather_name">{t('staff.grandfatherName')}</Label>
                                                        <Input id="grandfather_name" {...register('grandfather_name')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="tazkira_number">{t('staff.civilId')}</Label>
                                                        <Input id="tazkira_number" {...register('tazkira_number')} />
                                                        <p className="text-xs text-muted-foreground">{t('staff.civilIdHelper')}</p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="birth_year">{t('staff.birthYear')}</Label>
                                                        <Input id="birth_year" {...register('birth_year')} placeholder="e.g., 1990" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="birth_date">{t('staff.dateOfBirth')}</Label>
                                                        <CalendarFormField control={control} name="birth_date" label={t('staff.dateOfBirth')} />
                                                        <p className="text-xs text-muted-foreground">{t('staff.dateOfBirthHelper')}</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 3: Contact & Location */}
                                {currentStep === 3 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <MapPin className="h-5 w-5" />
                                                    Contact & Location
                                                </CardTitle>
                                                <CardDescription className="hidden md:block">Contact information and addresses</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="email">{t('events.email')}</Label>
                                                        <Input id="email" type="email" {...register('email')} />
                                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="phone_number">{t('staff.phoneNumber')}</Label>
                                                        <Input id="phone_number" {...register('phone_number')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="home_address">{t('staff.homeAddress')}</Label>
                                                        <Input id="home_address" {...register('home_address')} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                                    <div>
                                                        <h4 className="font-medium mb-3">{t('staff.originLocation')}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_province">{t('staff.province')}</Label>
                                                                <Input id="origin_province" {...register('origin_province')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_district">{t('staff.district')}</Label>
                                                                <Input id="origin_district" {...register('origin_district')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_village">{t('staff.village')}</Label>
                                                                <Input id="origin_village" {...register('origin_village')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium mb-3">{t('staff.currentLocation')}</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="current_province">{t('staff.province')}</Label>
                                                                <Input id="current_province" {...register('current_province')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="current_district">District</Label>
                                                                <Input id="current_district" {...register('current_district')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="current_village">Village</Label>
                                                                <Input id="current_village" {...register('current_village')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 4: Education */}
                                {currentStep === 4 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <GraduationCap className="h-5 w-5" />
                                                    Education
                                                </CardTitle>
                                                <CardDescription className="hidden md:block">Educational background and qualifications</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div>
                                                    <h4 className="font-medium mb-3">{t('staff.religiousEducationSection')}</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_education">{t('staff.educationLevel')}</Label>
                                                            <Input id="religious_education" {...register('religious_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_university">{t('staff.universityInstitution')}</Label>
                                                            <Input id="religious_university" {...register('religious_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_graduation_year">{t('staff.graduationYear')}</Label>
                                                            <Input id="religious_graduation_year" {...register('religious_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_department">{t('staff.department')}</Label>
                                                            <Input id="religious_department" {...register('religious_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-3">Modern Education</h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="modern_education">Education Level</Label>
                                                            <Input id="modern_education" {...register('modern_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="modern_school_university">School/University</Label>
                                                            <Input id="modern_school_university" {...register('modern_school_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="modern_graduation_year">Graduation Year</Label>
                                                            <Input id="modern_graduation_year" {...register('modern_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="modern_department">Department</Label>
                                                            <Input id="modern_department" {...register('modern_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 5: Employment */}
                                {currentStep === 5 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Briefcase className="h-5 w-5" />
                                                    Employment
                                                </CardTitle>
                                                <CardDescription className="hidden md:block">Employment details and position information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="position">{t('search.position')}</Label>
                                                        <Input id="position" {...register('position')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="teaching_section">{t('staff.teachingSection')}</Label>
                                                        <Input id="teaching_section" {...register('teaching_section')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="duty">{t('staff.duty')}</Label>
                                                        <Input id="duty" {...register('duty')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="salary">{t('staff.salary')}</Label>
                                                        <Input id="salary" {...register('salary')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="notes">{t('events.notes')}</Label>
                                                        <Textarea id="notes" {...register('notes')} rows={3} placeholder={t('staff.notesPlaceholder')} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="flex flex-col sm:flex-row justify-between gap-2">
                            <div className="flex gap-2 w-full sm:w-auto">
                                {currentStep > 1 && (
                                    <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)} className="flex-1 sm:flex-initial">
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        Previous
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreateDialogOpen(false);
                                        reset();
                                        setCurrentStep(1);
                                    }}
                                    className="flex-1 sm:flex-initial"
                                >
                                    {t('events.cancel')}
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="flex-1 sm:flex-initial">
                                        {t('events.next')}
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={createStaff.isPending || !staffUsage.canCreate}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        {createStaff.isPending ? t('events.creating') : t('staff.addStaff')}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                      </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>

            {/* Edit Staff Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                    setEditingStaff(null);
                    reset();
                    setCurrentStep(1);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <FormProvider {...formMethods}>
                      <form onSubmit={handleSubmit(async (data) => {
                        if (!editingStaff || !data.staff_type_id) {
                            toast.error(t('staff.pleaseSelectStaffType'));
                            return;
                        }

                        // Convert form data (snake_case) to domain model (camelCase)
                        const schoolId = data.school_id && data.school_id !== 'none' && data.school_id !== '' ? data.school_id : null;
                        const staffData: Partial<Staff> = {
                            employeeId: data.employee_id,
                            staffTypeId: data.staff_type_id,
                            firstName: data.first_name,
                            fatherName: data.father_name,
                            email: data.email || null,
                            grandfatherName: data.grandfather_name || null,
                            tazkiraNumber: data.tazkira_number || null,
                            birthYear: data.birth_year || null,
                            birthDate: data.birth_date || null,
                            phoneNumber: data.phone_number || null,
                            homeAddress: data.home_address || null,
                            originLocation: {
                                province: data.origin_province || null,
                                district: data.origin_district || null,
                                village: data.origin_village || null,
                            },
                            currentLocation: {
                                province: data.current_province || null,
                                district: data.current_district || null,
                                village: data.current_village || null,
                            },
                            religiousEducation: {
                                level: data.religious_education || null,
                                institution: data.religious_university || null,
                                graduationYear: data.religious_graduation_year || null,
                                department: data.religious_department || null,
                            },
                            modernEducation: {
                                level: data.modern_education || null,
                                institution: data.modern_school_university || null,
                                graduationYear: data.modern_graduation_year || null,
                                department: data.modern_department || null,
                            },
                            teachingSection: data.teaching_section || null,
                            position: data.position || null,
                            duty: data.duty || null,
                            salary: data.salary || null,
                            status: data.status || 'active',
                            notes: data.notes || null,
                        };

                        if (schoolId !== editingStaff.schoolId) {
                            staffData.schoolId = schoolId;
                        }

                        updateStaff.mutate(
                            { id: editingStaff.id, ...staffData },
                            {
                                onSuccess: () => {
                                    setIsEditDialogOpen(false);
                                    setEditingStaff(null);
                                    reset();
                                    setCurrentStep(1);
                                    refetchStaff();
                                },
                            }
                        );
                    })}>
                        <DialogHeader>
                            <DialogTitle>{t('staff.editEmployee')}</DialogTitle>
                            <DialogDescription>
                                {t('staff.editEmployeeDescription')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-[250px_1fr] gap-6 py-4">
                            {/* Step Navigation - Vertical Sidebar */}
                            <div className="border-r pr-6">
                                <div className="flex flex-col">
                                    {steps.map((step, index) => {
                                        const StepIcon = step.icon;
                                        const isActive = currentStep === step.id;
                                        const isCompleted = currentStep > step.id;
                                        const isLast = index === steps.length - 1;
                                        return (
                                            <div key={step.id} className="flex items-start gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div
                                                        className={`flex items-center justify-center w-8 h-8 rounded-full border-2 cursor-pointer transition-colors ${isActive
                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                            : isCompleted
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-background border-muted-foreground text-muted-foreground'
                                                            }`}
                                                        onClick={() => setCurrentStep(step.id)}
                                                    >
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        ) : (
                                                            <StepIcon className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                    {!isLast && (
                                                        <div
                                                            className={`w-0.5 h-12 mt-1 ${isCompleted ? 'bg-primary' : 'bg-muted'
                                                                }`}
                                                        />
                                                    )}
                                                </div>
                                                <div
                                                    className={`flex-1 pb-6 cursor-pointer ${isActive ? 'text-foreground' : 'text-muted-foreground'
                                                        }`}
                                                    onClick={() => setCurrentStep(step.id)}
                                                >
                                                    <span className={`text-xs font-medium block ${isActive ? 'text-primary' : ''}`}>
                                                        {step.label}
                                                    </span>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step Content */}
                            <div className="flex-1">
                                {/* Step 1: Basic Information */}
                                {currentStep === 1 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <User className="h-5 w-5" />
                                                    {t('events.basicInformation')}
                                                </CardTitle>
                                                <CardDescription>{t('staff.basicInformationDescription')}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_employee_id">{t('staff.employeeCode')} *</Label>
                                                        <Input id="edit_employee_id" {...register('employee_id')} placeholder={t('staff.employeeCodePlaceholder')} />
                                                        <p className="text-xs text-muted-foreground">{t('staff.employeeCodeHelper')}</p>
                                                        {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_staff_type_id">Staff Type *</Label>
                                                        <Controller
                                                            name="staff_type_id"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                    <SelectTrigger><SelectValue placeholder="Select staff type" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">Select a type</SelectItem>
                                                                        {staffTypes?.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                        {errors.staff_type_id && <p className="text-sm text-destructive">{errors.staff_type_id.message}</p>}
                                                    </div>
                                                    {schools && schools.length > 0 && (
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_school_id">{t('staff.school')}</Label>
                                                            <Controller
                                                                name="school_id"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                        <SelectTrigger><SelectValue placeholder={t('events.selectSchool')} /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">{t('staff.noSchool')}</SelectItem>
                                                                            {schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.schoolName}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_status">{t('staff.employmentStatus')} *</Label>
                                                        <Controller
                                                            name="status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="active">{t('staff.statusActive')}</SelectItem>
                                                                        <SelectItem value="inactive">{t('staff.statusInactive')}</SelectItem>
                                                                        <SelectItem value="on_leave">{t('staff.statusOnLeave')}</SelectItem>
                                                                        <SelectItem value="terminated">{t('staff.statusTerminated')}</SelectItem>
                                                                        <SelectItem value="suspended">{t('staff.statusSuspended')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 2: Personal Details */}
                                {currentStep === 2 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <User className="h-5 w-5" />
                                                    Personal Details
                                                </CardTitle>
                                                <CardDescription>Personal information and identification</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_first_name">First Name *</Label>
                                                        <Input id="edit_first_name" {...register('first_name')} />
                                                        {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_father_name">Father Name *</Label>
                                                        <Input id="edit_father_name" {...register('father_name')} />
                                                        {errors.father_name && <p className="text-sm text-destructive">{errors.father_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_grandfather_name">Grandfather Name</Label>
                                                        <Input id="edit_grandfather_name" {...register('grandfather_name')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_tazkira_number">Civil ID / Tazkira Number</Label>
                                                        <Input id="edit_tazkira_number" {...register('tazkira_number')} />
                                                        <p className="text-xs text-muted-foreground">National identification number (Tazkira)</p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_birth_year">Birth Year</Label>
                                                        <Input id="edit_birth_year" {...register('birth_year')} placeholder="e.g., 1990" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_birth_date">Date of Birth</Label>
                                                        <CalendarFormField control={control} name="birth_date" label="Date of Birth" />
                                                        <p className="text-xs text-muted-foreground">Employee must be at least 18 years old</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 3: Contact & Location */}
                                {currentStep === 3 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <MapPin className="h-5 w-5" />
                                                    Contact & Location
                                                </CardTitle>
                                                <CardDescription>Contact information and addresses</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_email">Email Address</Label>
                                                        <Input id="edit_email" type="email" {...register('email')} />
                                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_phone_number">Phone Number</Label>
                                                        <Input id="edit_phone_number" {...register('phone_number')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="edit_home_address">Home Address</Label>
                                                        <Input id="edit_home_address" {...register('home_address')} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                                    <div>
                                                        <h4 className="font-medium mb-3">Origin Location</h4>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_origin_province">Province</Label>
                                                                <Input id="edit_origin_province" {...register('origin_province')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_origin_district">District</Label>
                                                                <Input id="edit_origin_district" {...register('origin_district')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_origin_village">Village</Label>
                                                                <Input id="edit_origin_village" {...register('origin_village')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium mb-3">Current Location</h4>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_current_province">Province</Label>
                                                                <Input id="edit_current_province" {...register('current_province')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_current_district">District</Label>
                                                                <Input id="edit_current_district" {...register('current_district')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="edit_current_village">Village</Label>
                                                                <Input id="edit_current_village" {...register('current_village')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 4: Education */}
                                {currentStep === 4 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <GraduationCap className="h-5 w-5" />
                                                    {t('staff.education')}
                                                </CardTitle>
                                                <CardDescription>{t('staff.educationDescription')}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div>
                                                    <h4 className="font-medium mb-3">{t('staff.religiousEducationSection')}</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_education">{t('staff.educationLevel')}</Label>
                                                            <Input id="edit_religious_education" {...register('religious_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_university">{t('staff.universityInstitution')}</Label>
                                                            <Input id="edit_religious_university" {...register('religious_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_graduation_year">{t('staff.graduationYear')}</Label>
                                                            <Input id="edit_religious_graduation_year" {...register('religious_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_department">{t('staff.department')}</Label>
                                                            <Input id="edit_religious_department" {...register('religious_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-3">{t('staff.modernEducationSection')}</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_education">{t('staff.educationLevel')}</Label>
                                                            <Input id="edit_modern_education" {...register('modern_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_school_university">{t('staff.modernSchoolUniversity')}</Label>
                                                            <Input id="edit_modern_school_university" {...register('modern_school_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_graduation_year">{t('staff.graduationYear')}</Label>
                                                            <Input id="edit_modern_graduation_year" {...register('modern_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_department">{t('staff.department')}</Label>
                                                            <Input id="edit_modern_department" {...register('modern_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}

                                {/* Step 5: Employment */}
                                {currentStep === 5 && (
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Briefcase className="h-5 w-5" />
                                                    Employment
                                                </CardTitle>
                                                <CardDescription>Employment details and position information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_position">Position</Label>
                                                        <Input id="edit_position" {...register('position')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_teaching_section">Teaching Section</Label>
                                                        <Input id="edit_teaching_section" {...register('teaching_section')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_duty">Duty</Label>
                                                        <Input id="edit_duty" {...register('duty')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_salary">Salary</Label>
                                                        <Input id="edit_salary" {...register('salary')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="edit_notes">Notes</Label>
                                                        <Textarea id="edit_notes" {...register('notes')} rows={3} placeholder="Additional notes about this staff member..." />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter className="flex justify-between">
                            <div className="flex gap-2">
                                {currentStep > 1 && (
                                    <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                                        <ChevronLeft className="h-4 w-4 mr-2" />
                                        {t('events.previous')}
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingStaff(null);
                                        reset();
                                        setCurrentStep(1);
                                    }}
                                >
                                    {t('events.cancel')}
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                                        {t('events.next')}
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={updateStaff.isPending}>
                                        {updateStaff.isPending ? t('events.updating') : t('staff.updateStaff')}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                      </form>
                    </FormProvider>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('staff.deleteConfirmMessage')} {t('staff.deleteConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('events.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Staff Profile Dialog */}
            {viewingProfile && (
                <StaffProfile
                    staffId={viewingProfile}
                    onClose={() => setViewingProfile(null)}
                />
            )}
        </div>
    );
}

