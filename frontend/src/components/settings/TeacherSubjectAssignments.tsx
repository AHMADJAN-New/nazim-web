import { useOrganizations } from '@/hooks/useOrganizations';
import { useQueryClient } from '@tanstack/react-query';
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
import { useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
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
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
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
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useScheduleSlots } from '@/hooks/useScheduleSlots';
import { useSchools } from '@/hooks/useSchools';
import { useStaff, type Staff } from '@/hooks/useStaff';
import { useClassSubjectsForMultipleClasses } from '@/hooks/useSubjects';
import { useTeacherSubjectAssignments, useCreateTeacherSubjectAssignment, useUpdateTeacherSubjectAssignment, useDeleteTeacherSubjectAssignment, type TeacherSubjectAssignment } from '@/hooks/useTeacherSubjectAssignments';

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
    const queryClient = useQueryClient();
    const assignmentsResult = useTeacherSubjectAssignments(
        profile?.organization_id,
        teacherFilter !== 'all' ? teacherFilter : undefined,
        academicYearFilter !== 'all' ? academicYearFilter : undefined
    );
    const assignments = 'data' in assignmentsResult ? assignmentsResult.data : assignmentsResult.assignments;
    const isLoading = assignmentsResult.isLoading;
    const refetchAssignments = async () => {
        await queryClient.invalidateQueries({ queryKey: ['teacher-subject-assignments'] });
        await queryClient.refetchQueries({ queryKey: ['teacher-subject-assignments'] });
    };
    const createAssignment = useCreateTeacherSubjectAssignment();
    const updateAssignment = useUpdateTeacherSubjectAssignment();
    const deleteAssignment = useDeleteTeacherSubjectAssignment();

    // Filter staff to get active teachers
    // Note: teacher_subject_assignments.teacher_id now references staff.id (not profiles.id)
    // This allows staff to be assigned even without a profile/account
    // useStaff hook already filters out deleted staff, so we don't need to check deleted_at
    const teacherStaff = useMemo((): Staff[] => {
        if (!staff) {
            console.log('TeacherSubjectAssignments: No staff data available');
            return [];
        }
        console.log('TeacherSubjectAssignments: Staff data:', staff.length, 'records');
        // Show all active staff - they can be assigned even without profile_id
        const activeStaff = staff.filter(s => s.status === 'active') as Staff[];
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

    // Fetch subjects from class_subjects table (Step 2) for the selected class academic years
    // This gets subjects that are already assigned to the specific class academic year instances
    const { data: allClassSubjectsData } = useClassSubjectsForMultipleClasses(
        selectedClassIds,
        profile?.organization_id
    );

    // Create a map of class_academic_year_id -> subjects (from class_subjects)
    const allClassSubjects: Record<string, any[]> = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (!allClassSubjectsData || selectedClassIds.length === 0) return map;

        // Group subjects by class_academic_year_id
        allClassSubjectsData.forEach((cs) => {
            const classAcademicYearId = cs.classAcademicYearId;
            if (!map[classAcademicYearId]) {
                map[classAcademicYearId] = [];
            }
            map[classAcademicYearId].push({
                id: cs.id,
                subject_id: cs.subjectId,
                class_academic_year_id: classAcademicYearId,
                subject: cs.subject,
                is_required: cs.isRequired,
                credits: cs.credits,
                hours_per_week: cs.hoursPerWeek,
                notes: cs.notes,
            });
        });

        return map;
    }, [allClassSubjectsData, selectedClassIds]);

    // Filter schedule slots by school if selected
    const filteredSlots = useMemo(() => {
        if (!scheduleSlots) return [];
        if (!selectedSchoolId || selectedSchoolId === 'all') return scheduleSlots;
        return scheduleSlots.filter(slot => 
            slot.schoolId === null || slot.schoolId === selectedSchoolId
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
                .map((id: string) => {
                    const slot = slotsMap.get(id);
                    if (!slot) return null;
                    // Convert domain ScheduleSlot to API format expected by TeacherSubjectAssignment
                    return {
                        id: slot.id,
                        name: slot.name,
                        code: slot.code,
                        start_time: slot.startTime,
                        end_time: slot.endTime,
                    };
                })
                .filter(Boolean) as Array<{
                    id: string;
                    name: string;
                    code: string;
                    start_time: string;
                    end_time: string;
                }>,
        })) as TeacherSubjectAssignment[];
    }, [assignments, scheduleSlots]);

    // Create a map of academic_year_id -> academic year name for quick lookup
    const academicYearMap = useMemo(() => {
        const map = new Map<string, string>();
        if (academicYears) {
            academicYears.forEach(year => {
                map.set(year.id, year.name);
            });
        }
        return map;
    }, [academicYears]);

    // Filter assignments by search query
    const filteredAssignments = useMemo(() => {
        if (!enrichedAssignments) return [];
        let filtered = enrichedAssignments;

        if (searchQuery) {
            const query = (searchQuery || '').toLowerCase();
            filtered = filtered.filter(assignment => {
                const teacherFullName = assignment.teacher ? [
                    assignment.teacher.first_name,
                    assignment.teacher.father_name,
                    assignment.teacher.grandfather_name
                ].filter(Boolean).join(' ') : '';
                return teacherFullName?.toLowerCase().includes(query) ||
                    assignment.teacher?.employee_id?.toLowerCase().includes(query) ||
                    assignment.subject?.name?.toLowerCase().includes(query) ||
                    assignment.subject?.code?.toLowerCase().includes(query) ||
                    assignment.class_academic_year?.class?.name?.toLowerCase().includes(query) ||
                    assignment.class_academic_year?.class?.code?.toLowerCase().includes(query);
            });
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
            toast.error(t('teacherSubjectAssignments.pleaseSelectTeacher'));
            return;
        }
        if (!selectedAcademicYearId) {
            toast.error(t('teacherSubjectAssignments.pleaseSelectAcademicYear'));
            return;
        }
        if (selectedClassIds.length === 0) {
            toast.error(t('teacherSubjectAssignments.pleaseSelectAtLeastOneClass'));
            return;
        }
        if (selectedSlotIds.length === 0) {
            toast.error(t('teacherSubjectAssignments.pleaseSelectAtLeastOneScheduleSlot'));
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
            toast.error(t('teacherSubjectAssignments.pleaseCompleteStep1'));
            return;
        }

        // Use user's organization
        let organizationId = profile?.organization_id;
        
        // If school is selected, get organizationId from school
        if (!organizationId && selectedSchoolId && selectedSchoolId !== 'all') {
            const selectedSchool = schools?.find(s => s.id === selectedSchoolId);
            if (selectedSchool?.organizationId) {
                organizationId = selectedSchool.organizationId;
            }
        }
        
        // If still no organizationId, try to get it from the first selected class_academic_year
        if (!organizationId && selectedClassIds.length > 0) {
            const firstClass = filteredClasses.find(c => c.id === selectedClassIds[0]);
            if (firstClass?.organizationId) {
                organizationId = firstClass.organizationId;
            }
        }
        
        if (!organizationId) {
            toast.error(t('teacherSubjectAssignments.organizationIdRequired'));
            return;
        }

        if (isEditDialogOpen && editingAssignment) {
            // Update single assignment
            if (selectedClassIds.length === 0 || selectedSlotIds.length === 0) {
                toast.error(t('teacherSubjectAssignments.pleaseSelectAtLeastOneClassAndSlot'));
                return;
            }

            const classId = selectedClassIds[0];
            const subjectIds = selectedSubjectIds[classId] || [];
            if (subjectIds.length === 0) {
                toast.error(t('teacherSubjectAssignments.pleaseSelectAtLeastOneSubject'));
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
                // Mutation already invalidates queries, but refetch to ensure UI updates
                await queryClient.refetchQueries({ queryKey: ['teacher-subject-assignments'] });
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
                toast.error(t('teacherSubjectAssignments.pleaseSelectAtLeastOneSubjectToAssign'));
                return;
            }

            try {
                // Create all assignments
                for (const assignment of assignmentsToCreate) {
                    await createAssignment.mutateAsync(assignment);
                }
                setIsCreateDialogOpen(false);
                resetForm();
                // Mutations already invalidate queries, but refetch to ensure UI updates
                await queryClient.refetchQueries({ queryKey: ['teacher-subject-assignments'] });
            } catch (error) {
                // Error is handled by mutation
            }
        }
    };

    const handleDelete = async () => {
        if (!deletingAssignment) return;
        try {
            await deleteAssignment.mutateAsync(deletingAssignment.id);
            // Mutation already invalidates queries, but refetch to ensure UI updates
            await queryClient.refetchQueries({ queryKey: ['teacher-subject-assignments'] });
            setDeletingAssignment(null);
        } catch (error) {
            // Error is handled by mutation
        }
    };

    if (!hasReadPermission) {
        return (
            <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
                <Card>
                    <CardContent className="p-6">
                        <div className="text-center text-muted-foreground">{t('teacherSubjectAssignments.noPermission')}</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('teacherSubjectAssignments.title') || 'Teacher Subject Assignments'}
                description={t('teacherSubjectAssignments.subtitle') || 'Assign teachers to subjects for specific classes'}
                icon={<BookOpen className="h-5 w-5" />}
                primaryAction={hasCreatePermission ? {
                    label: t('teacherSubjectAssignments.createAssignment') || 'Create Assignment',
                    onClick: handleCreateClick,
                    icon: <Plus className="h-4 w-4" />,
                } : undefined}
            />
            <Card>
                <CardHeader>
                    <CardTitle>{t('teacherSubjectAssignments.title')}</CardTitle>
                    <CardDescription className="hidden md:block">{t('teacherSubjectAssignments.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filters */}
                    <FilterPanel
                        title={t('common.filters') || 'Filters'}
                        defaultOpenDesktop={true}
                        defaultOpenMobile={false}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label>{t('common.search') || 'Search'}</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('teacherSubjectAssignments.searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>{t('teacherSubjectAssignments.filterByTeacher')}</Label>
                                <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('teacherSubjectAssignments.filterByTeacher')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('teacherSubjectAssignments.allTeachers')}</SelectItem>
                                        {teacherStaff.length === 0 ? (
                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                {t('teacherSubjectAssignments.noActiveStaff')}
                                            </div>
                                        ) : (
                                            teacherStaff.map((staffMember) => (
                                                <SelectItem 
                                                    key={staffMember.id} 
                                                    value={staffMember.id}
                                                >
                                                    {staffMember.employeeId} - {staffMember.fullName || `${staffMember.firstName} ${staffMember.fatherName}`}
                                                    {staffMember.staffTypeRelation && ` (${staffMember.staffTypeRelation.name})`}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>{t('teacherSubjectAssignments.filterByAcademicYear')}</Label>
                                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={t('teacherSubjectAssignments.filterByAcademicYear')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('teacherSubjectAssignments.allAcademicYears')}</SelectItem>
                                        {academicYears?.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {(searchQuery || teacherFilter !== 'all' || academicYearFilter !== 'all') && (
                            <div className="mt-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setTeacherFilter('all');
                                        setAcademicYearFilter('all');
                                    }}
                                >
                                    <X className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('teacherSubjectAssignments.clear')}</span>
                                </Button>
                            </div>
                        )}
                        {filteredAssignments && filteredAssignments.length > 0 && (
                            <ReportExportButtons
                                data={filteredAssignments}
                                columns={[
                                    { key: 'teacher', label: t('teacherSubjectAssignments.teacher') },
                                    { key: 'academicYear', label: t('teacherSubjectAssignments.academicYear') },
                                    { key: 'class', label: t('teacherSubjectAssignments.class') },
                                    { key: 'subject', label: t('teacherSubjectAssignments.subject') },
                                    { key: 'scheduleSlots', label: t('teacherSubjectAssignments.scheduleSlots') },
                                    { key: 'status', label: t('teacherSubjectAssignments.status') },
                                ]}
                                reportKey="teacher_assignments"
                                title={t('teacherSubjectAssignments.title') || 'Teacher Assignments Report'}
                                transformData={(data) => data.map((assignment) => {
                                    const teacherFullName = assignment.teacher ? [
                                        assignment.teacher.first_name,
                                        assignment.teacher.father_name,
                                        assignment.teacher.grandfather_name
                                    ].filter(Boolean).join(' ') : '';
                                    const teacherDisplay = assignment.teacher?.employee_id && teacherFullName
                                        ? `${assignment.teacher.employee_id} - ${teacherFullName}`
                                        : teacherFullName || t('teacherSubjectAssignments.unknown');
                                    const academicYearName = assignment.academic_year_id 
                                        ? (academicYearMap.get(assignment.academic_year_id) || 
                                           assignment.academic_year?.name || 
                                           t('teacherSubjectAssignments.unknownYear'))
                                        : (assignment.academic_year?.name || t('teacherSubjectAssignments.unknownYear'));
                                    const className = assignment.class_academic_year?.class?.name || assignment.class_academic_year?.class?.code || t('teacherSubjectAssignments.unknownClass');
                                    const classDisplay = assignment.class_academic_year?.section_name 
                                        ? `${className} - ${assignment.class_academic_year.section_name}`
                                        : className;
                                    const scheduleSlotsDisplay = assignment.schedule_slots && assignment.schedule_slots.length > 0
                                        ? assignment.schedule_slots.map(slot => `${slot.name} (${slot.start_time}-${slot.end_time})`).join(', ')
                                        : '-';
                                    return {
                                        teacher: teacherDisplay,
                                        academicYear: academicYearName,
                                        class: classDisplay,
                                        subject: assignment.subject?.name || assignment.subject?.code || t('teacherSubjectAssignments.unknown'),
                                        scheduleSlots: scheduleSlotsDisplay,
                                        status: assignment.is_active ? t('common.active') : t('common.inactive'),
                                    };
                                })}
                                buildFiltersSummary={() => {
                                    const filters: string[] = [];
                                    if (searchQuery) filters.push(`Search: ${searchQuery}`);
                                    if (teacherFilter !== 'all') {
                                        const teacher = teacherStaff.find(t => t.id === teacherFilter);
                                        if (teacher) filters.push(`Teacher: ${teacher.employeeId} - ${teacher.fullName || `${teacher.firstName} ${teacher.fatherName}`}`);
                                    }
                                    if (academicYearFilter !== 'all') {
                                        const year = academicYears?.find(y => y.id === academicYearFilter);
                                        if (year) filters.push(`Academic Year: ${year.name}`);
                                    }
                                    return filters.length > 0 ? filters.join(' | ') : '';
                                }}
                                schoolId={profile?.default_school_id}
                                templateType="teacher_assignments"
                                disabled={!filteredAssignments || filteredAssignments.length === 0}
                            />
                        )}
                    </FilterPanel>
                </CardContent>
            </Card>

            {/* Assignments Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6">
                            <LoadingSpinner text={t('teacherSubjectAssignments.loadingAssignments')} />
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                            {searchQuery || teacherFilter !== 'all' || academicYearFilter !== 'all'
                                ? t('teacherSubjectAssignments.noAssignmentsFound')
                                : t('teacherSubjectAssignments.noAssignmentsAvailable')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('teacherSubjectAssignments.teacher')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.academicYear')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.class')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.subject')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.scheduleSlots')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.status')}</TableHead>
                                                <TableHead>{t('teacherSubjectAssignments.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                    {filteredAssignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell>
                                                {(() => {
                                                    const teacherFullName = assignment.teacher ? [
                                                        assignment.teacher.first_name,
                                                        assignment.teacher.father_name,
                                                        assignment.teacher.grandfather_name
                                                    ].filter(Boolean).join(' ') : '';
                                                    return assignment.teacher?.employee_id && teacherFullName
                                                        ? `${assignment.teacher.employee_id} - ${teacherFullName}`
                                                        : teacherFullName || t('teacherSubjectAssignments.unknown');
                                                })()}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.academic_year_id 
                                                    ? (academicYearMap.get(assignment.academic_year_id) || 
                                                       assignment.academic_year?.name || 
                                                       t('teacherSubjectAssignments.unknownYear'))
                                                    : (assignment.academic_year?.name || t('teacherSubjectAssignments.unknownYear'))}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.class_academic_year?.class?.name || assignment.class_academic_year?.class?.code || t('teacherSubjectAssignments.unknownClass')}
                                                {assignment.class_academic_year?.section_name && ` - ${assignment.class_academic_year.section_name}`}
                                            </TableCell>
                                            <TableCell>
                                                {assignment.subject?.name || assignment.subject?.code || t('teacherSubjectAssignments.unknown')}
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
                                                    {assignment.is_active ? t('teacherSubjectAssignments.active') : t('teacherSubjectAssignments.inactive')}
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
                                                                    <AlertDialogTitle>{t('teacherSubjectAssignments.deleteAssignment')}</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        {t('teacherSubjectAssignments.deleteConfirm')}
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setDeletingAssignment(null)}>{t('teacherSubjectAssignments.cancel')}</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                                                                        {t('teacherSubjectAssignments.delete')}
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
                            </div>
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
                <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('teacherSubjectAssignments.createDialogTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('teacherSubjectAssignments.subtitle')}
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
                                                {t('teacherSubjectAssignments.teacherAndClasses')}
                                            </CardTitle>
                                            <CardDescription>{t('teacherSubjectAssignments.teacherAndClassesDescription')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.teacherRequired')}</Label>
                                                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('teacherSubjectAssignments.selectTeacher')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {staffLoading ? (
                                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                    {t('teacherSubjectAssignments.loadingStaff')}
                                                                </div>
                                                            ) : staffError ? (
                                                                <div className="px-2 py-1.5 text-sm text-destructive">
                                                                    {t('teacherSubjectAssignments.errorLoadingStaff').replace('{error}', staffError.message || 'Unknown error')}
                                                                </div>
                                                            ) : teacherStaff.length === 0 ? (
                                                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                    {staff && staff.length > 0 
                                                                        ? t('teacherSubjectAssignments.noActiveStaffMessage').replace('{count}', staff.filter(s => s.status === 'active').length.toString())
                                                                        : t('teacherSubjectAssignments.noStaffData')}
                                                                </div>
                                                            ) : (
                                                                teacherStaff.map((staffMember) => (
                                                                    <SelectItem 
                                                                        key={staffMember.id} 
                                                                        value={staffMember.id}
                                                                    >
                                                                        {staffMember.employeeId} - {staffMember.fullName || `${staffMember.firstName} ${staffMember.fatherName}`}
                                                                        {staffMember.staffTypeRelation && ` (${staffMember.staffTypeRelation.name})`}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.academicYearRequired')}</Label>
                                                    <Select value={selectedAcademicYearId} onValueChange={setSelectedAcademicYearId}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('teacherSubjectAssignments.selectAcademicYear')} />
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
                                                        <Label>{t('teacherSubjectAssignments.schoolOptional')}</Label>
                                                        <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t('teacherSubjectAssignments.allSchools')} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">{t('teacherSubjectAssignments.allSchools')}</SelectItem>
                                                                {schools.map((school) => (
                                                                    <SelectItem key={school.id} value={school.id}>
                                                                        {school.schoolName}
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
                                                        <Label>{t('teacherSubjectAssignments.classesRequired')}</Label>
                                                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                            {filteredClasses.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">{t('teacherSubjectAssignments.noClassesFound')}</p>
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
                                                                                {cay.sectionName && ` - ${cay.sectionName}`}
                                                                            </Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>{t('teacherSubjectAssignments.scheduleSlotsRequired')}</Label>
                                                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                            {filteredSlots.length === 0 ? (
                                                                <p className="text-sm text-muted-foreground">{t('teacherSubjectAssignments.noScheduleSlotsFound')}</p>
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
                                                                                {slot.name} ({slot.code}) - {slot.startTime} to {slot.endTime}
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
                                                {t('teacherSubjectAssignments.selectSubjects')}
                                            </CardTitle>
                                            <CardDescription>{t('teacherSubjectAssignments.selectSubjectsDescription')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {selectedClassIds.map((classId) => {
                                                const cay = filteredClasses.find(c => c.id === classId);
                                                const subjects = allClassSubjects[classId] || [];
                                                const selectedSubjects = selectedSubjectIds[classId] || [];

                                                return (
                                                    <div key={classId} className="border rounded-md p-4 space-y-3">
                                                        <div className="font-semibold">
                                                            {cay?.class?.name || cay?.class?.code || t('teacherSubjectAssignments.unknownClass')}
                                                            {cay?.sectionName && ` - ${cay.sectionName}`}
                                                        </div>
                                                        {subjects.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">{t('teacherSubjectAssignments.noSubjectsFound')}</p>
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
                                                                            {cs.subject?.name || cs.subject?.code || t('teacherSubjectAssignments.unknownSubject')}
                                                                        </Label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            <div className="space-y-2">
                                                <Label htmlFor="notes">{t('teacherSubjectAssignments.notesOptional')}</Label>
                                                <Textarea
                                                    id="notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    rows={3}
                                                    placeholder={t('teacherSubjectAssignments.notesPlaceholder')}
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
                                    {t('teacherSubjectAssignments.previous')}
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
                                {t('teacherSubjectAssignments.cancel')}
                            </Button>
                            {currentStep < 2 ? (
                                <Button type="button" onClick={handleStep1Next}>
                                    {t('teacherSubjectAssignments.next')}
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit}
                                    disabled={createAssignment.isPending || Object.values(selectedSubjectIds).flat().length === 0}
                                >
                                    {createAssignment.isPending ? t('teacherSubjectAssignments.creating') : t('teacherSubjectAssignments.createAssignments')}
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
                <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('teacherSubjectAssignments.editDialogTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('teacherSubjectAssignments.updateAssignmentDetails')}
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
                                                {t('teacherSubjectAssignments.teacherAndClasses')}
                                            </CardTitle>
                                            <CardDescription>{t('teacherSubjectAssignments.assignmentDetailsReadOnly')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.teacher')}</Label>
                                                    <Input 
                                                        value={
                                                            (() => {
                                                                const teacherFullName = editingAssignment.teacher ? [
                                                                    editingAssignment.teacher.first_name,
                                                                    editingAssignment.teacher.father_name,
                                                                    editingAssignment.teacher.grandfather_name
                                                                ].filter(Boolean).join(' ') : '';
                                                                return editingAssignment.teacher?.employee_id && teacherFullName
                                                                    ? `${editingAssignment.teacher.employee_id} - ${teacherFullName}`
                                                                    : teacherFullName || t('teacherSubjectAssignments.unknown');
                                                            })()
                                                        } 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.academicYear')}</Label>
                                                    <Input 
                                                        value={
                                                            editingAssignment.academic_year_id 
                                                                ? (academicYearMap.get(editingAssignment.academic_year_id) || 
                                                                   editingAssignment.academic_year?.name || 
                                                                   t('teacherSubjectAssignments.unknownYear'))
                                                                : (editingAssignment.academic_year?.name || t('teacherSubjectAssignments.unknownYear'))
                                                        } 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.class')}</Label>
                                                    <Input 
                                                        value={`${editingAssignment.class_academic_year?.class?.name || t('teacherSubjectAssignments.unknownClass')}${editingAssignment.class_academic_year?.section_name ? ` - ${editingAssignment.class_academic_year.section_name}` : ''}`} 
                                                        disabled 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('teacherSubjectAssignments.subject')}</Label>
                                                    <Input value={editingAssignment.subject?.name || t('teacherSubjectAssignments.unknown')} disabled />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('teacherSubjectAssignments.scheduleSlotsRequired')}</Label>
                                                <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                                    {filteredSlots.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground">{t('teacherSubjectAssignments.noScheduleSlotsFound')}</p>
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
                                                                        {slot.name} ({slot.code}) - {slot.startTime} to {slot.endTime}
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
                                                {t('teacherSubjectAssignments.notesOptional')}
                                            </CardTitle>
                                            <CardDescription>{t('teacherSubjectAssignments.updateAssignmentDetails')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-notes">{t('teacherSubjectAssignments.notesOptional')}</Label>
                                                <Textarea
                                                    id="edit-notes"
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    rows={5}
                                                    placeholder={t('teacherSubjectAssignments.notesPlaceholder')}
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
                                    {t('teacherSubjectAssignments.previous')}
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
                                {t('teacherSubjectAssignments.cancel')}
                            </Button>
                            {currentStep < 2 ? (
                                <Button type="button" onClick={() => setCurrentStep(2)}>
                                    {t('teacherSubjectAssignments.next')}
                                    <ChevronRight className="h-4 w-4 ml-2" />
                                </Button>
                            ) : (
                                <Button 
                                    type="button" 
                                    onClick={handleSubmit}
                                    disabled={updateAssignment.isPending || selectedSlotIds.length === 0}
                                >
                                    {updateAssignment.isPending ? t('teacherSubjectAssignments.updating') : t('teacherSubjectAssignments.updateAssignment')}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
