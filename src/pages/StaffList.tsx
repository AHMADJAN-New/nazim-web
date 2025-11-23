import { useState, useMemo } from 'react';
import { useStaff, useDeleteStaff, useStaffStats, useCreateStaff, useUpdateStaff, useStaffTypes, type Staff, type StaffInsert } from '@/hooks/useStaff';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSchools } from '@/hooks/useSchools';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Search, Plus, Pencil, Trash2, Eye, Users, Filter, X, ChevronRight, ChevronLeft, User, MapPin, GraduationCap, Briefcase, FileText, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { StaffProfile } from '@/components/staff/StaffProfile';
import { LoadingSpinner } from '@/components/ui/loading';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
    const isSuperAdmin = useIsSuperAdmin();
    const hasCreatePermission = useHasPermission('staff.create');
    const hasUpdatePermission = useHasPermission('staff.update');
    const hasDeletePermission = useHasPermission('staff.delete');
    const hasReadPermission = useHasPermission('staff.read');

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [schoolFilter, setSchoolFilter] = useState<string>('all');
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(profile?.organization_id);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [viewingProfile, setViewingProfile] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, label: 'Basic Information', icon: User, description: 'Core employee identification and status information' },
        { id: 2, label: 'Personal Details', icon: User, description: 'Personal information and identification' },
        { id: 3, label: 'Contact & Location', icon: MapPin, description: 'Contact information and addresses' },
        { id: 4, label: 'Education', icon: GraduationCap, description: 'Educational background and qualifications' },
        { id: 5, label: 'Employment', icon: Briefcase, description: 'Employment details and position information' },
    ];

    const { data: organizations } = useOrganizations();
    // Pass undefined when "all" is selected to fetch from all accessible organizations
    const orgIdForQuery = selectedOrganizationId === 'all' ? undefined : selectedOrganizationId;
    const { data: schools } = useSchools(orgIdForQuery);
    const { data: staffTypes } = useStaffTypes(orgIdForQuery);
    const { data: staff, isLoading, refetch: refetchStaff } = useStaff(orgIdForQuery);
    const { data: stats } = useStaffStats(orgIdForQuery);
    const deleteStaff = useDeleteStaff();
    const createStaff = useCreateStaff();
    const updateStaff = useUpdateStaff();

    const {
        register,
        handleSubmit,
        control,
        reset,
        trigger,
        formState: { errors },
    } = useForm<StaffFormData>({
        resolver: zodResolver(staffSchema),
        defaultValues: {
            status: 'active',
        },
    });

    const filteredStaff = useMemo(() => {
        if (!staff) return [];

        return staff.filter((s) => {
            const matchesSearch =
                s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone_number?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
            const matchesType = typeFilter === 'all' || s.staff_type_id === typeFilter;
            const matchesSchool = schoolFilter === 'all' || s.school_id === schoolFilter;

            return matchesSearch && matchesStatus && matchesType && matchesSchool;
        });
    }, [staff, searchQuery, statusFilter, typeFilter, schoolFilter]);

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
        if (!staffMember.picture_url) return null;
        const schoolPath = staffMember.school_id ? `${staffMember.school_id}/` : '';
        const path = `${staffMember.organization_id}/${schoolPath}${staffMember.id}/picture/${staffMember.picture_url}`;
        const { data } = supabase.storage.from('staff-files').getPublicUrl(path);
        return data.publicUrl;
    };

    if (!hasReadPermission) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">You don't have permission to view staff</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewingProfile) {
        return (
            <StaffProfile
                staffId={viewingProfile}
                onClose={() => setViewingProfile(null)}
            />
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Staff Management
                            </CardTitle>
                            <CardDescription>
                                Manage and view all staff members
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
                            {hasCreatePermission && (
                                <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Staff
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Stats */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                    <div className="text-sm text-muted-foreground">Total Staff</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                                    <div className="text-sm text-muted-foreground">Active</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-orange-600">{stats.on_leave}</div>
                                    <div className="text-sm text-muted-foreground">On Leave</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-blue-600">{stats.by_type.teacher}</div>
                                    <div className="text-sm text-muted-foreground">Teachers</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="text-2xl font-bold text-purple-600">{stats.by_type.admin}</div>
                                    <div className="text-sm text-muted-foreground">Admins</div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, ID, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                                <SelectItem value="terminated">Terminated</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {staffTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {schools && schools.length > 0 && (
                            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="School" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Schools</SelectItem>
                                    {schools.map((school) => (
                                        <SelectItem key={school.id} value={school.id}>
                                            {school.school_name}
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
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Staff Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6">
                            <LoadingSpinner text="Loading staff..." />
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || schoolFilter !== 'all'
                                ? 'No staff members found matching your filters'
                                : 'No staff members available'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Photo</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Employee ID</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>School</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStaff.map((staffMember) => {
                                        const pictureUrl = getPictureUrl(staffMember);
                                        return (
                                            <TableRow key={staffMember.id}>
                                                <TableCell>
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                        {pictureUrl ? (
                                                            <img src={pictureUrl} alt={staffMember.full_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Users className="w-6 h-6 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{staffMember.full_name}</TableCell>
                                                <TableCell>
                                                    <code className="px-2 py-1 bg-muted rounded text-sm">{staffMember.employee_id}</code>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{staffMember.staff_type?.name || 'Unknown'}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusBadgeVariant(staffMember.status)}>
                                                        {staffMember.status.replace('_', ' ').toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {staffMember.school ? (
                                                        <span className="text-sm">{staffMember.school.school_name}</span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {staffMember.email && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                {staffMember.email}
                                                            </div>
                                                        )}
                                                        {staffMember.phone_number && (
                                                            <div className="text-xs text-muted-foreground">
                                                                {staffMember.phone_number}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setViewingProfile(staffMember.id)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingStaff(staffMember);
                                                                    setIsEditDialogOpen(true);
                                                                    setCurrentStep(1);
                                                                    reset({
                                                                        employee_id: staffMember.employee_id,
                                                                        staff_type_id: staffMember.staff_type_id,
                                                                        school_id: staffMember.school_id || null,
                                                                        first_name: staffMember.first_name,
                                                                        father_name: staffMember.father_name,
                                                                        grandfather_name: staffMember.grandfather_name || null,
                                                                        tazkira_number: staffMember.tazkira_number || null,
                                                                        birth_year: staffMember.birth_year || null,
                                                                        birth_date: staffMember.birth_date || null,
                                                                        phone_number: staffMember.phone_number || null,
                                                                        email: staffMember.email || null,
                                                                        home_address: staffMember.home_address || null,
                                                                        origin_province: staffMember.origin_province || null,
                                                                        origin_district: staffMember.origin_district || null,
                                                                        origin_village: staffMember.origin_village || null,
                                                                        current_province: staffMember.current_province || null,
                                                                        current_district: staffMember.current_district || null,
                                                                        current_village: staffMember.current_village || null,
                                                                        religious_education: staffMember.religious_education || null,
                                                                        religious_university: staffMember.religious_university || null,
                                                                        religious_graduation_year: staffMember.religious_graduation_year || null,
                                                                        religious_department: staffMember.religious_department || null,
                                                                        modern_education: staffMember.modern_education || null,
                                                                        modern_school_university: staffMember.modern_school_university || null,
                                                                        modern_graduation_year: staffMember.modern_graduation_year || null,
                                                                        modern_department: staffMember.modern_department || null,
                                                                        teaching_section: staffMember.teaching_section || null,
                                                                        position: staffMember.position || null,
                                                                        duty: staffMember.duty || null,
                                                                        salary: staffMember.salary || null,
                                                                        status: staffMember.status,
                                                                        notes: staffMember.notes || null,
                                                                    });
                                                                }}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(staffMember.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Staff Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                    reset();
                    setCurrentStep(1);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit(async (data) => {
                        // Validation is handled by react-hook-form, but double-check required fields
                        if (!data.staff_type_id || data.staff_type_id === 'none') {
                            toast.error('Please select a staff type');
                            setCurrentStep(1); // Go back to step 1 to show the error
                            return;
                        }

                        // Ensure school_id is null if it's 'none' or empty string
                        const schoolId = data.school_id && data.school_id !== 'none' && data.school_id !== ''
                            ? data.school_id
                            : null;

                        // Get organization_id: from selected school, selected organization, or profile
                        let organizationId = selectedOrganizationId || profile?.organization_id;

                        // If school is selected, get organization_id from school
                        if (schoolId && !organizationId) {
                            const selectedSchool = schools?.find(s => s.id === schoolId);
                            if (selectedSchool) {
                                organizationId = selectedSchool.organization_id;
                            }
                        }

                        if (!organizationId) {
                            toast.error('Organization ID is required. Please select a school or organization.');
                            return;
                        }

                        const staffData: StaffInsert = {
                            employee_id: data.employee_id,
                            staff_type_id: data.staff_type_id,
                            first_name: data.first_name,
                            father_name: data.father_name,
                            organization_id: organizationId,
                            school_id: schoolId,
                            email: data.email || null,
                            grandfather_name: data.grandfather_name || null,
                            tazkira_number: data.tazkira_number || null,
                            birth_year: data.birth_year || null,
                            birth_date: data.birth_date || null,
                            phone_number: data.phone_number || null,
                            home_address: data.home_address || null,
                            origin_province: data.origin_province || null,
                            origin_district: data.origin_district || null,
                            origin_village: data.origin_village || null,
                            current_province: data.current_province || null,
                            current_district: data.current_district || null,
                            current_village: data.current_village || null,
                            religious_education: data.religious_education || null,
                            religious_university: data.religious_university || null,
                            religious_graduation_year: data.religious_graduation_year || null,
                            religious_department: data.religious_department || null,
                            modern_education: data.modern_education || null,
                            modern_school_university: data.modern_school_university || null,
                            modern_graduation_year: data.modern_graduation_year || null,
                            modern_department: data.modern_department || null,
                            teaching_section: data.teaching_section || null,
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
                                // Force refetch to show the new staff member immediately
                                // This ensures it appears even when "all" organizations filter is active
                                refetchStaff();
                            },
                        });
                    })}>
                        <DialogHeader>
                            <DialogTitle>Create Employee</DialogTitle>
                            <DialogDescription>
                                Fill in the employee information step by step. All required fields are marked with an asterisk (*).
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
                                                    Basic Information
                                                </CardTitle>
                                                <CardDescription>Core employee identification and status information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="employee_id">Employee Code *</Label>
                                                        <Input id="employee_id" {...register('employee_id')} placeholder="e.g., EMP-001" />
                                                        <p className="text-xs text-muted-foreground">Unique identifier for the employee (e.g., EMP-001)</p>
                                                        {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="staff_type_id">Staff Type *</Label>
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
                                                            <Label htmlFor="school_id">School</Label>
                                                            <Controller
                                                                name="school_id"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                        <SelectTrigger><SelectValue placeholder="Select school (optional)" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">No school</SelectItem>
                                                                            {schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.school_name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="status">Employment Status *</Label>
                                                        <Controller
                                                            name="status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="active">Active</SelectItem>
                                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                                        <SelectItem value="on_leave">On Leave</SelectItem>
                                                                        <SelectItem value="terminated">Terminated</SelectItem>
                                                                        <SelectItem value="suspended">Suspended</SelectItem>
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
                                                        <Label htmlFor="first_name">First Name *</Label>
                                                        <Input id="first_name" {...register('first_name')} />
                                                        {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="father_name">Father Name *</Label>
                                                        <Input id="father_name" {...register('father_name')} />
                                                        {errors.father_name && <p className="text-sm text-destructive">{errors.father_name.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="grandfather_name">Grandfather Name</Label>
                                                        <Input id="grandfather_name" {...register('grandfather_name')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="tazkira_number">Civil ID / Tazkira Number</Label>
                                                        <Input id="tazkira_number" {...register('tazkira_number')} />
                                                        <p className="text-xs text-muted-foreground">National identification number (Tazkira)</p>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="birth_year">Birth Year</Label>
                                                        <Input id="birth_year" {...register('birth_year')} placeholder="e.g., 1990" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="birth_date">Date of Birth</Label>
                                                        <Input id="birth_date" type="date" {...register('birth_date')} />
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
                                                        <Label htmlFor="email">Email Address</Label>
                                                        <Input id="email" type="email" {...register('email')} />
                                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="phone_number">Phone Number</Label>
                                                        <Input id="phone_number" {...register('phone_number')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="home_address">Home Address</Label>
                                                        <Input id="home_address" {...register('home_address')} />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                                    <div>
                                                        <h4 className="font-medium mb-3">Origin Location</h4>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_province">Province</Label>
                                                                <Input id="origin_province" {...register('origin_province')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_district">District</Label>
                                                                <Input id="origin_district" {...register('origin_district')} />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="origin_village">Village</Label>
                                                                <Input id="origin_village" {...register('origin_village')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium mb-3">Current Location</h4>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="current_province">Province</Label>
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
                                                <CardDescription>Educational background and qualifications</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div>
                                                    <h4 className="font-medium mb-3">Religious Education</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_education">Education Level</Label>
                                                            <Input id="religious_education" {...register('religious_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_university">University/Institution</Label>
                                                            <Input id="religious_university" {...register('religious_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_graduation_year">Graduation Year</Label>
                                                            <Input id="religious_graduation_year" {...register('religious_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="religious_department">Department</Label>
                                                            <Input id="religious_department" {...register('religious_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-3">Modern Education</h4>
                                                    <div className="grid grid-cols-2 gap-4">
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
                                                <CardDescription>Employment details and position information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="position">Position</Label>
                                                        <Input id="position" {...register('position')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="teaching_section">Teaching Section</Label>
                                                        <Input id="teaching_section" {...register('teaching_section')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="duty">Duty</Label>
                                                        <Input id="duty" {...register('duty')} />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="salary">Salary</Label>
                                                        <Input id="salary" {...register('salary')} />
                                                    </div>
                                                    <div className="grid gap-2 col-span-2">
                                                        <Label htmlFor="notes">Notes</Label>
                                                        <Textarea id="notes" {...register('notes')} rows={3} placeholder="Additional notes about this staff member..." />
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
                                        Previous
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setIsCreateDialogOpen(false);
                                        reset();
                                        setCurrentStep(1);
                                    }}
                                >
                                    {t('common.cancel')}
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={createStaff.isPending}
                                    >
                                        {createStaff.isPending ? 'Creating...' : 'Create Staff'}
                                    </Button>
                                )}
                            </div>
                        </DialogFooter>
                    </form>
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
                    <form onSubmit={handleSubmit(async (data) => {
                        if (!editingStaff || !data.staff_type_id) {
                            toast.error('Please select a staff type');
                            return;
                        }

                        const staffData: Partial<StaffInsert> = {
                            employee_id: data.employee_id,
                            staff_type_id: data.staff_type_id,
                            first_name: data.first_name,
                            father_name: data.father_name,
                            email: data.email || null,
                            grandfather_name: data.grandfather_name || null,
                            tazkira_number: data.tazkira_number || null,
                            birth_year: data.birth_year || null,
                            birth_date: data.birth_date || null,
                            phone_number: data.phone_number || null,
                            home_address: data.home_address || null,
                            origin_province: data.origin_province || null,
                            origin_district: data.origin_district || null,
                            origin_village: data.origin_village || null,
                            current_province: data.current_province || null,
                            current_district: data.current_district || null,
                            current_village: data.current_village || null,
                            religious_education: data.religious_education || null,
                            religious_university: data.religious_university || null,
                            religious_graduation_year: data.religious_graduation_year || null,
                            religious_department: data.religious_department || null,
                            modern_education: data.modern_education || null,
                            modern_school_university: data.modern_school_university || null,
                            modern_graduation_year: data.modern_graduation_year || null,
                            modern_department: data.modern_department || null,
                            teaching_section: data.teaching_section || null,
                            position: data.position || null,
                            duty: data.duty || null,
                            salary: data.salary || null,
                            status: data.status || 'active',
                            notes: data.notes || null,
                        };

                        const schoolId = data.school_id && data.school_id !== 'none' && data.school_id !== '' ? data.school_id : null;
                        if (schoolId !== editingStaff.school_id) {
                            staffData.school_id = schoolId;
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
                            <DialogTitle>Edit Employee</DialogTitle>
                            <DialogDescription>
                                Update the employee information step by step. All required fields are marked with an asterisk (*).
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
                                                    Basic Information
                                                </CardTitle>
                                                <CardDescription>Core employee identification and status information</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_employee_id">Employee Code *</Label>
                                                        <Input id="edit_employee_id" {...register('employee_id')} placeholder="e.g., EMP-001" />
                                                        <p className="text-xs text-muted-foreground">Unique identifier for the employee (e.g., EMP-001)</p>
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
                                                            <Label htmlFor="edit_school_id">School</Label>
                                                            <Controller
                                                                name="school_id"
                                                                control={control}
                                                                render={({ field }) => (
                                                                    <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                                                        <SelectTrigger><SelectValue placeholder="Select school (optional)" /></SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="none">No school</SelectItem>
                                                                            {schools.map((school) => <SelectItem key={school.id} value={school.id}>{school.school_name}</SelectItem>)}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="edit_status">Employment Status *</Label>
                                                        <Controller
                                                            name="status"
                                                            control={control}
                                                            render={({ field }) => (
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="active">Active</SelectItem>
                                                                        <SelectItem value="inactive">Inactive</SelectItem>
                                                                        <SelectItem value="on_leave">On Leave</SelectItem>
                                                                        <SelectItem value="terminated">Terminated</SelectItem>
                                                                        <SelectItem value="suspended">Suspended</SelectItem>
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
                                                        <Input id="edit_birth_date" type="date" {...register('birth_date')} />
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
                                                    Education
                                                </CardTitle>
                                                <CardDescription>Educational background and qualifications</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div>
                                                    <h4 className="font-medium mb-3">Religious Education</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_education">Education Level</Label>
                                                            <Input id="edit_religious_education" {...register('religious_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_university">University/Institution</Label>
                                                            <Input id="edit_religious_university" {...register('religious_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_graduation_year">Graduation Year</Label>
                                                            <Input id="edit_religious_graduation_year" {...register('religious_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_religious_department">Department</Label>
                                                            <Input id="edit_religious_department" {...register('religious_department')} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t">
                                                    <h4 className="font-medium mb-3">Modern Education</h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_education">Education Level</Label>
                                                            <Input id="edit_modern_education" {...register('modern_education')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_school_university">School/University</Label>
                                                            <Input id="edit_modern_school_university" {...register('modern_school_university')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_graduation_year">Graduation Year</Label>
                                                            <Input id="edit_modern_graduation_year" {...register('modern_graduation_year')} />
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label htmlFor="edit_modern_department">Department</Label>
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
                                        Previous
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
                                    {t('common.cancel')}
                                </Button>
                                {currentStep < steps.length ? (
                                    <Button type="button" onClick={() => setCurrentStep(currentStep + 1)}>
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={updateStaff.isPending}>
                                        {updateStaff.isPending ? 'Updating...' : 'Update Staff'}
                                    </Button>
                                )}
                            </div>
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
                            Are you sure you want to delete this staff member? This action cannot be undone.
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

