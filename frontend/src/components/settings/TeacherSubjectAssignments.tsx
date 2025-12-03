import { useState, useMemo } from 'react';
import { useTeacherSubjectAssignments, useCreateTeacherSubjectAssignment, useUpdateTeacherSubjectAssignment, useDeleteTeacherSubjectAssignment, type TeacherSubjectAssignment } from '@/hooks/useTeacherSubjectAssignments';
import { useProfile } from '@/hooks/useProfiles';
import { useStaff } from '@/hooks/useStaff';
import { useHasPermission } from '@/hooks/usePermissions';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useSchools } from '@/hooks/useSchools';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useScheduleSlots } from '@/hooks/useScheduleSlots';
import { useClassSubjectsForMultipleClasses } from '@/hooks/useSubjects';
import { useOrganizations } from '@/hooks/useOrganizations';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Clock, Trash2, Plus, Pencil, User, GraduationCap, CheckCircle2, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';

type Step = 1 | 2;

const steps = [
    { id: 1, label: 'Teacher & Classes', icon: User, description: 'Select teacher, academic year, classes, and schedule slots' },
    { id: 2, label: 'Select Subjects', icon: GraduationCap, description: 'Choose subjects for each class' },
];

export function TeacherSubjectAssignments() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('teacher_subject_assignments.create');
    const hasUpdatePermission = useHasPermission('teacher_subject_assignments.update');
    const hasDeletePermission = useHasPermission('teacher_subject_assignments.delete');
    const hasReadPermission = useHasPermission('teacher_subject_assignments.read');

    // Table filters
    const [searchQuery, setSearchQuery] = useState('');
    const [teacherFilter, setTeacherFilter] = useState<string>('all');
    const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');

    // Dialog state
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<TeacherSubjectAssignment | null>(null);
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [deletingAssignment, setDeletingAssignment] = useState<TeacherSubjectAssignment | null>(null);

    // Form state
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Record<string, string[]>>({});
    const [notes, setNotes] = useState<string>('');

    const { data: academicYears } = useAcademicYears(profile?.organization_id);
    const { data: schools } = useSchools(profile?.organization_id);
    const { data: staff, refetch: refetchStaff, isLoading: staffLoading, error: staffError } = useStaff(profile?.organization_id);
    
    // Debug logging
    if (staffError) {
        console.error('TeacherSubjectAssignments: Error loading staff:', staffError);
    }
    if (staffLoading) {
        console.log('TeacherSubjectAssignments: Loading staff data...');
    }
    const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId || undefined, profile?.organization_id);
    const { data: scheduleSlots } = useScheduleSlots(profile?.organization_id, selectedAcademicYearId || undefined);
    const { data: assignments, isLoading, refetch: refetchAssignments } = useTeacherSubjectAssignments(
        profile?.organization_id,
        teacherFilter !== 'all' ? teacherFilter : undefined,
        academicYearFilter !== 'all' ? academicYearFilter : undefined
    );
    const createAssignment = useCreateTeacherSubjectAssignment();
    const updateAssignment = useUpdateTeacherSubjectAssignment();
    const deleteAssignment = useDeleteTeacherSubjectAssignment();

    // Filter staff to get active teachers
    // Note: teacher_subject_assignments.teacher_id now references staff.id (not profiles.id)
    // This allows staff to be assigned even without a profile/account
    // useStaff hook already filters out deleted staff, so we don't need to check deleted_at
    const teacherStaff = useMemo(() => {
        if (!staff) {
            console.log('TeacherSubjectAssignments: No staff data available');
            return [];
        }
        console.log('TeacherSubjectAssignments: Staff data:', staff.length, 'records');
        // Show all active staff - they can be assigned even without profile_id
        const activeStaff = staff.filter(s => s.status === 'active');
        console.log('TeacherSubjectAssignments: Active staff:', activeStaff.length, 'records');
        return activeStaff;
    }, [staff]);

    // Filter classes by school if selected
    const filteredClasses = useMemo(() => {
        if (!classAcademicYears) return [];
        if (!selectedSchoolId || selectedSchoolId === 'all') return classAcademicYears;
        return classAcademicYears.filter(cay => {
            // Check if class belongs to selected school
            // This would need school_id in class_academic_years or classes table
            // For now, return all if school filtering is not available
            return true;
        });
    }, [classAcademicYears, selectedSchoolId]);

    // Fetch subjects for all selected classes at once
    const { data: allClassSubjectsData } = useClassSubjectsForMultipleClasses(
        selectedClassIds,
        profile?.organization_id
    );

    // Create a map of class_academic_year_id -> subjects
    const allClassSubjects: Record<string, any[]> = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (allClassSubjectsData) {
            allClassSubjectsData.forEach((cs) => {
                const classId = cs.class_academic_year_id;
                if (!map[classId]) {
                    map[classId] = [];
                }
                map[classId].push(cs);
            });
        }
        return map;
    }, [allClassSubjectsData]);

    // Filter schedule slots by school if selected
    const filteredSlots = useMemo(() => {
        if (!scheduleSlots) return [];
        if (!selectedSchoolId || selectedSchoolId === 'all') return scheduleSlots;
        return scheduleSlots.filter(slot => 
            slot.school_id === null || slot.school_id === selectedSchoolId
        );
    }, [scheduleSlots, selectedSchoolId]);

    // Enrich assignments with schedule slots from useScheduleSlots hook
    const enrichedAssignments = useMemo(() => {
        if (!assignments || !scheduleSlots) return assignments || [];
        
        // Create a map of schedule slot IDs to schedule slot objects
        const slotsMap = new Map(scheduleSlots.map(slot => [slot.id, slot]));
        
        // Enrich each assignment with schedule slots
        return assignments.map(assignment => ({
            ...assignment,
            schedule_slots: (assignment.schedule_slot_ids || [])
                .map((id: string) => slotsMap.get(id))
                .filter(Boolean),
        }));
    }, [assignments, scheduleSlots]);

    // Filter assignments by search query
    const filteredAssignments = useMemo(() => {
        if (!enrichedAssignments) return [];
        let filtered = enrichedAssignments;

        if (searchQuery) {
            const query = (searchQuery || '').toLowerCase();
            filtered = filtered.filter(assignment => 
                assignment.teacher?.full_name?.toLowerCase().includes(query) ||
                assignment.teacher?.employee_id?.toLowerCase().includes(query) ||
                assignment.subject?.name?.toLowerCase().includes(query) ||
                assignment.subject?.code?.toLowerCase().includes(query) ||
                assignment.class_academic_year?.class?.name?.toLowerCase().includes(query) ||
                assignment.class_academic_year?.class?.code?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [enrichedAssignments, searchQuery]);

    const resetForm = () => {
        setCurrentStep(1);
        setSelectedTeacherId('');
        setSelectedAcademicYearId('');
        setSelectedSchoolId('');
        setSelectedClassIds([]);
        setSelectedSlotIds([]);
        setSelectedSubjectIds({});
        setNotes('');
    };

    const handleCreateClick = () => {
        resetForm();
        // Refetch staff data to get latest teachers
        refetchStaff();
        refetchAssignments();
        setIsCreateDialogOpen(true);
    };

    const handleEditClick = (assignment: TeacherSubjectAssignment) => {
        resetForm();
        setEditingAssignment(assignment);
        setSelectedTeacherId(assignment.teacher_id);
        setSelectedAcademicYearId(assignment.academic_year_id || '');
        setSelectedSchoolId(assignment.school_id || '');
        setSelectedClassIds([assignment.class_academic_year_id]);
        setSelectedSlotIds(assignment.schedule_slot_ids || []);
        setSelectedSubjectIds({ [assignment.class_academic_year_id]: [assignment.subject_id] });
        setNotes(assignment.notes || '');
        setIsEditDialogOpen(true);
    };

    const handleStep1Next = () => {
        if (!selectedTeacherId) {
            toast.error('Please select a teacher');
            return;
        }
        if (!selectedAcademicYearId) {
            toast.error('Please select an academic year');
            return;
        }
        if (selectedClassIds.length === 0) {
            toast.error('Please select at least one class');
            return;
        }
        if (selectedSlotIds.length === 0) {
            toast.error('Please select at least one schedule slot');
            return;
        }
        setCurrentStep(2);
    };

    const handleSubjectToggle = (classId: string, subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const classSubjects = prev[classId] || [];
            if (classSubjects.includes(subjectId)) {
                return {
                    ...prev,
                    [classId]: classSubjects.filter(id => id !== subjectId),
                };
            } else {
                return {
                    ...prev,
                    [classId]: [...classSubjects, subjectId],
                };
            }
        });
    };

    const handleSubmit = async () => {
        if (!selectedTeacherId || !selectedAcademicYearId) {
            toast.error('Please complete step 1');
            return;
        }

        // Use user's organization
        let organizationId = profile?.organization_id;
        
        // If school is selected, get organization_id from school
        if (!organizationId && selectedSchoolId && selectedSchoolId !== 'all') {
            const selectedSchool = schools?.find(s => s.id === selectedSchoolId);
            if (selectedSchool?.organization_id) {
                organizationId = selectedSchool.organization_id;
            }
        }
        
        // If still no organization_id, try to get it from the first selected class_academic_year
        if (!organizationId && selectedClassIds.length > 0) {
            const firstClass = filteredClasses.find(c => c.id === selectedClassIds[0]);
            if (firstClass?.organization_id) {
                organizationId = firstClass.organization_id;
            }
        }
        
        if (!organizationId) {
            toast.error('Organization ID is required. Please select a school or ensure you are assigned to an organization.');
            return;
        }

        if (isEditDialogOpen && editingAssignment) {
            // Update single assignment
            if (selectedClassIds.length === 0 || selectedSlotIds.length === 0) {
                toast.error('Please select at least one class and schedule slot');
                return;
            }

            const classId = selectedClassIds[0];
            const subjectIds = selectedSubjectIds[classId] || [];
            if (subjectIds.length === 0) {
                toast.error('Please select at least one subject');
                return;
            }

            // For edit, we update the existing assignment
            // Note: The current structure allows one assignment per teacher-class-subject combination
            // So we update the existing one
            try {
                await updateAssignment.mutateAsync({
                    id: editingAssignment.id,
                    schedule_slot_ids: selectedSlotIds,
                    notes: notes || null,
                });
                setIsEditDialogOpen(false);
                resetForm();
                await refetchAssignments();
            } catch (error) {
                // Error is handled by mutation
            }
        } else {
            // Create assignments for each class-subject combination
            const assignmentsToCreate: Array<{
                teacher_id: string;
                class_academic_year_id: string;
                subject_id: string;
                schedule_slot_ids: string[];
                school_id: string | null;
                academic_year_id: string;
                organization_id: string;
                notes: string | null;
            }> = [];

            selectedClassIds.forEach(classId => {
                const subjectIds = selectedSubjectIds[classId] || [];
                subjectIds.forEach(subjectId => {
                    assignmentsToCreate.push({
                        teacher_id: selectedTeacherId,
                        class_academic_year_id: classId,
                        subject_id: subjectId,
                        schedule_slot_ids: selectedSlotIds,
                        school_id: selectedSchoolId && selectedSchoolId !== 'all' ? selectedSchoolId : null,
                        academic_year_id: selectedAcademicYearId,
                        organization_id: organizationId,
                        notes: notes || null,
                    });
                });
            });

            if (assignmentsToCreate.length === 0) {
                toast.error('Please select at least one subject to assign');
                return;
            }

            try {
                // Create all assignments
                for (const assignment of assignmentsToCreate) {
                    await createAssignment.mutateAsync(assignment);
                }
                setIsCreateDialogOpen(false);
                resetForm();
                await refetchAssignments();
            } catch (error) {
                // Error is handled by mutation
            }
        }
    };

    const handleDelete = async () => {
        if (!deletingAssignment) return;
        try {
            await deleteAssignment.mutateAsync(deletingAssignment.id);
            await refetchAssignments();
            setDeletingAssignment(null);
        } catch (error) {
            // Error is handled by mutation
        }
    };

    if (!hasReadPermission) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">You don't have permission to view teacher subject assignments</div>
                    </CardContent>
                </Card>
            </div>
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
                                <BookOpen className="h-5 w-5" />
                                Teacher Subject Assignments
                            </CardTitle>
                            <CardDescription>
                                Assign subjects to teachers for timetable generation
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasCreatePermission && (
                                <Button onClick={handleCreateClick}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Assignment
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by teacher, subject, or class..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by teacher" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teachers</SelectItem>
                                {teacherStaff.length === 0 ? (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                        No active staff with linked profiles found
                                    </div>
                                ) : (
                                    teacherStaff.map((staffMember) => (
                                        <SelectItem 
                                            key={staffMember.id} 
                                            value={staffMember.id}
                                        >
                                            {staffMember.employee_id} - {staffMember.full_name} 
                                            {staffMember.staff_type && ` (${staffMember.staff_type.name})`}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by academic year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Academic Years</SelectItem>
                                {academicYears?.map((year) => (
                                    <SelectItem key={year.id} value={year.id}>
                                        {year.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {(searchQuery || teacherFilter !== 'all' || academicYearFilter !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setTeacherFilter('all');
                                    setAcademicYearFilter('all');
                                }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Assignments Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6">
                            <LoadingSpinner text="Loading assignments..." />
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            {searchQuery || teacherFilter !== 'all' || academicYearFilter !== 'all'
                                ? 'No assignments found matching your filters'
                                : 'No assignments available'}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead>Academic Year</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Schedule Slots</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAssignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell>
                                                {assignment.teacher?.employee_id && assignment.teacher?.full_name 
                                                    ? `${assignment.teacher.employee_id} - ${assignment.teacher.full_name}`
                                                    : assignment.teacher?.full_name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.class_academic_year?.academic_year?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.class_academic_year?.class?.name || assignment.class_academic_year?.class?.code || 'Unknown'}
                                                {assignment.class_academic_year?.section_name && ` - ${assignment.class_academic_year.section_name}`}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.subject?.name || assignment.subject?.code || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {assignment.schedule_slots?.map((slot) => (
                                                        <Badge key={slot.id} variant="outline" className="text-xs">
                                                            {slot.code}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                                                    {assignment.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {hasUpdatePermission && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditClick(assignment)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {hasDeletePermission && (
                                                        <AlertDialog open={deletingAssignment?.id === assignment.id} onOpenChange={(open) => {
                                                            if (!open) {
                                                                setDeletingAssignment(null);
                                                            }
                                                        }}>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setDeletingAssignment(assignment)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Are you sure you want to delete this assignment? This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setDeletingAssignment(null)}>Cancel</AlertDialogCancel>
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
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (open) {
                    // Refetch data when dialog opens to get latest
                    refetchStaff();
                    refetchAssignments();
                } else {
                    resetForm();
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Teacher Subject Assignment</DialogTitle>
                        <DialogDescription>
                            Assign subjects to teachers for timetable generation
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
                                                    onClick={() => setCurrentStep(step.id as Step)}
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
                                                onClick={() => setCurrentStep(step.id as Step)}
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
                            {/* Step 1: Teacher & Classes */}
                            {currentStep === 1 && (
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="h-5 w-5" />
                                                Teacher & Classes
                                            </CardTitle>
                                            <CardDescription>Select teacher, academic year, classes, and schedule slots</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Teacher *</Label>
                                                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a teacher" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {staffLoading ? (
                                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                    Loading staff...
                                                                </div>
                                                            ) : staffError ? (
                                                                <div className="px-2 py-1.5 text-sm text-destructive">
                                                                    Error loading staff: {staffError.message || 'Unknown error'}
                                                                </div>
                                                            ) : teacherStaff.length === 0 ? (
                                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                    {staff && staff.length > 0 
                                                                        ? `No active staff with linked profiles found. Total active staff: ${staff.filter(s => s.status === 'active').length}`
                                                                        : 'No staff data available.'}
                                                                </div>
                                                            ) : (
                                                                teacherStaff.map((staffMember) => (
                                                                    <SelectItem 
                                                                        key={staffMember.id} 
                                                                        value={staffMember.id}
                                                                    >
                                                                        {staffMember.employee_id} - {staffMember.full_name} 
                                                                        {staffMember.staff_type && ` (${staffMember.staff_type.name})`}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Academic Year *</Label>
                                                    <Select value={selectedAcademicYearId} onValueChange={setSelectedAcademicYearId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select academic year" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {academicYears?.map((year) => (
                                                                <SelectItem key={year.id} value={year.id}>
                                                                    {year.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {schools && schools.length > 1 && (
                                                    <div className="space-y-2">
                                                        <Label>School (Optional)</Label>
                                                        <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="All schools" />
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
                                                    </div>
                                                )}
                                            </div>

                                            {selectedAcademicYearId && (
                                                <>
                                                    <div className="space-y-2">
                                                        <Label>Classes *</Label>
                                                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                            {filteredClasses.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">No classes found for selected academic year</p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {filteredClasses.map((cay) => (
                                                                        <div key={cay.id} className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`class-${cay.id}`}
                                                                                checked={selectedClassIds.includes(cay.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        setSelectedClassIds([...selectedClassIds, cay.id]);
                                                                                    } else {
                                                                                        setSelectedClassIds(selectedClassIds.filter(id => id !== cay.id));
                                                                                        // Remove subjects for this class
                                                                                        setSelectedSubjectIds(prev => {
                                                                                            const next = { ...prev };
                                                                                            delete next[cay.id];
                                                                                            return next;
                                                                                        });
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Label
                                                                                htmlFor={`class-${cay.id}`}
                                                                                className="text-sm font-normal cursor-pointer flex-1"
                                                                            >
                                                                                {cay.class?.name || cay.class?.code || 'Unknown Class'}
                                                                                {cay.section_name && ` - ${cay.section_name}`}
                                                                            </Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Schedule Slots *</Label>
                                                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                            {filteredSlots.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">No schedule slots found</p>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {filteredSlots.map((slot) => (
                                                                        <div key={slot.id} className="flex items-center space-x-2">
                                                                            <Checkbox
                                                                                id={`slot-${slot.id}`}
                                                                                checked={selectedSlotIds.includes(slot.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    if (checked) {
                                                                                        setSelectedSlotIds([...selectedSlotIds, slot.id]);
                                                                                    } else {
                                                                                        setSelectedSlotIds(selectedSlotIds.filter(id => id !== slot.id));
                                                                                    }
                                                                                }}
                                                                            />
                                                                            <Label
                                                                                htmlFor={`slot-${slot.id}`}
                                                                                className="text-sm font-normal cursor-pointer flex-1"
                                                                            >
                                                                                {slot.name} ({slot.code}) - {slot.start_time} to {slot.end_time}
                                                                            </Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Step 2: Select Subjects */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <GraduationCap className="h-5 w-5" />
                                                Select Subjects
                                            </CardTitle>
                                            <CardDescription>Choose which subjects the teacher will teach for each selected class</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {selectedClassIds.map((classId) => {
                                                const cay = filteredClasses.find(c => c.id === classId);
                                                const subjects = allClassSubjects[classId] || [];
                                                const selectedSubjects = selectedSubjectIds[classId] || [];

                                                return (
                                                    <div key={classId} className="border rounded-md p-4 space-y-3">
                                                        <div className="font-semibold">
                                                            {cay?.class?.name || cay?.class?.code || 'Unknown Class'}
                                                            {cay?.section_name && ` - ${cay.section_name}`}
                                                        </div>
                                                        {subjects.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">No subjects found for this class</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                {subjects.map((cs) => (
                                                                    <div key={cs.id} className="flex items-center space-x-2">
                                                                        <Checkbox
                                                                            id={`subject-${classId}-${cs.subject_id}`}
                                                                            checked={selectedSubjects.includes(cs.subject_id)}
                                                                            onCheckedChange={() => handleSubjectToggle(classId, cs.subject_id)}
                                                                        />
                                                                        <Label
                                                                            htmlFor={`subject-${classId}-${cs.subject_id}`}
                                                                            className="text-sm font-normal cursor-pointer flex-1"
                                                                        >
                                                                            {cs.subject?.name || cs.subject?.code || 'Unknown Subject'}
                                                                        </Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            <div className="space-y-2">
                                                <Label htmlFor="notes">Notes (Optional)</Label>
                                                <Textarea
                                                    id="notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    rows={3}
                                                    placeholder="Additional notes about this assignment..."
                                                />
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
                                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
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
                                    resetForm();
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            {currentStep < 2 ? (
                                <Button type="button" onClick={handleStep1Next}>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit}
                                    disabled={createAssignment.isPending || Object.values(selectedSubjectIds).flat().length === 0}
                                >
                                    {createAssignment.isPending ? 'Creating...' : 'Create Assignments'}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (open) {
                    // Refetch data when dialog opens to get latest
                    refetchStaff();
                    refetchAssignments();
                } else {
                    resetForm();
                    setEditingAssignment(null);
                }
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Teacher Subject Assignment</DialogTitle>
                        <DialogDescription>
                            Update the assignment details
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
                                                    onClick={() => setCurrentStep(step.id as Step)}
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
                                                onClick={() => setCurrentStep(step.id as Step)}
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
                            {/* Step 1: Teacher & Classes (Read-only for edit) */}
                            {currentStep === 1 && editingAssignment && (
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <User className="h-5 w-5" />
                                                Teacher & Classes
                                            </CardTitle>
                                            <CardDescription>Assignment details (read-only)</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Teacher</Label>
                                                    <Input 
                                                        value={
                                                            editingAssignment.teacher?.employee_id && editingAssignment.teacher?.full_name
                                                                ? `${editingAssignment.teacher.employee_id} - ${editingAssignment.teacher.full_name}`
                                                                : editingAssignment.teacher?.full_name || 'Unknown'
                                                        } 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Academic Year</Label>
                                                    <Input value={editingAssignment.class_academic_year?.academic_year?.name || 'Unknown'} disabled />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Class</Label>
                                                    <Input 
                                                        value={`${editingAssignment.class_academic_year?.class?.name || 'Unknown'}${editingAssignment.class_academic_year?.section_name ? ` - ${editingAssignment.class_academic_year.section_name}` : ''}`} 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Subject</Label>
                                                    <Input value={editingAssignment.subject?.name || 'Unknown'} disabled />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Schedule Slots *</Label>
                                                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                    {filteredSlots.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">No schedule slots found</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {filteredSlots.map((slot) => (
                                                                <div key={slot.id} className="flex items-center space-x-2">
                                                                    <Checkbox
                                                                        id={`edit-slot-${slot.id}`}
                                                                        checked={selectedSlotIds.includes(slot.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            if (checked) {
                                                                                setSelectedSlotIds([...selectedSlotIds, slot.id]);
                                                                            } else {
                                                                                setSelectedSlotIds(selectedSlotIds.filter(id => id !== slot.id));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Label
                                                                        htmlFor={`edit-slot-${slot.id}`}
                                                                        className="text-sm font-normal cursor-pointer flex-1"
                                                                    >
                                                                        {slot.name} ({slot.code}) - {slot.start_time} to {slot.end_time}
                                                                    </Label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* Step 2: Notes */}
                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <GraduationCap className="h-5 w-5" />
                                                Notes
                                            </CardTitle>
                                            <CardDescription>Update assignment notes</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-notes">Notes</Label>
                                                <Textarea
                                                    id="edit-notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    rows={5}
                                                    placeholder="Additional notes about this assignment..."
                                                />
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
                                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
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
                                    resetForm();
                                    setEditingAssignment(null);
                                }}
                            >
                                {t('common.cancel')}
                            </Button>
                            {currentStep < 2 ? (
                                <Button type="button" onClick={() => setCurrentStep(2)}>
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit}
                                    disabled={updateAssignment.isPending || selectedSlotIds.length === 0}
                                >
                                    {updateAssignment.isPending ? 'Updating...' : 'Update Assignment'}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
