import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, BookOpen, Copy, X, GraduationCap } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
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
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears, useClasses } from '@/hooks/useClasses';
import { useSubjects, useClassSubjects, useSubjectHistory, useCreateSubject, useUpdateSubject, useDeleteSubject, useAssignSubjectToClass, useUpdateClassSubject, useRemoveSubjectFromClass, useBulkAssignSubjects, useCopySubjectsBetweenYears, useClassSubjectTemplates, useAssignSubjectToClassTemplate, useRemoveSubjectFromClassTemplate, useBulkAssignSubjectsToClassTemplate } from '@/hooks/useSubjects';
import type { Subject } from '@/types/domain/subject';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useRooms } from '@/hooks/useRooms';
import { useUsers } from '@/hooks/useUsers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useDataTable } from '@/hooks/use-data-table';
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
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';


const subjectSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
    is_active: z.boolean().default(true),
});

const assignSubjectToClassSchema = z.object({
    class_id: z.string().uuid('Invalid class'),
    subject_id: z.string().uuid('Invalid subject'),
});

const bulkAssignToClassSchema = z.object({
    class_id: z.string().uuid('Invalid class'),
    subject_ids: z.array(z.string().uuid()).min(1, 'Select at least one subject'),
});

const assignSubjectSchema = z.object({
    class_academic_year_id: z.string().uuid('Invalid class instance'),
    subject_id: z.string().uuid('Invalid subject'),
    room_id: z.string().uuid().optional().nullable(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

const bulkAssignSchema = z.object({
    class_academic_year_id: z.string().uuid('Invalid class instance'),
    subject_ids: z.array(z.string().uuid()).min(1, 'Select at least one subject'),
    default_room_id: z.string().uuid().optional().nullable(),
});

const copySubjectsSchema = z.object({
    from_class_academic_year_id: z.string().uuid('Invalid class instance'),
    to_class_academic_year_id: z.string().uuid('Invalid class instance'),
    copy_assignments: z.boolean().default(false),
});

type SubjectFormData = z.infer<typeof subjectSchema>;
type AssignSubjectToClassFormData = z.infer<typeof assignSubjectToClassSchema>;
type BulkAssignToClassFormData = z.infer<typeof bulkAssignToClassSchema>;
type AssignSubjectFormData = z.infer<typeof assignSubjectSchema>;
type BulkAssignFormData = z.infer<typeof bulkAssignSchema>;
type CopySubjectsFormData = z.infer<typeof copySubjectsSchema>;

export function SubjectsManagement() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('subjects.create');
    const hasUpdatePermission = useHasPermission('subjects.update');
    const hasDeletePermission = useHasPermission('subjects.delete');
    const hasAssignPermission = useHasPermission('subjects.assign');
    const hasCopyPermission = useHasPermission('subjects.copy');

    const [activeTab, setActiveTab] = useState('subjects');
    const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
    const [isAssignToClassDialogOpen, setIsAssignToClassDialogOpen] = useState(false);
    const [isBulkAssignToClassDialogOpen, setIsBulkAssignToClassDialogOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedClassSubject, setSelectedClassSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();
    const [selectedClassAcademicYearId, setSelectedClassAcademicYearId] = useState<string>('');
    const [copyFromClassYearId, setCopyFromClassYearId] = useState<string | undefined>();

    // Data hooks - use user's organization
    const { data: academicYears } = useAcademicYears(profile?.organization_id);
    const { data: currentAcademicYear } = useCurrentAcademicYear(profile?.organization_id);
    const { data: classes } = useClasses(profile?.organization_id);
    const { data: classAcademicYears } = useClassAcademicYears(selectedAcademicYearId, profile?.organization_id);
    // Use paginated version of the hook
    const { 
        subjects, 
        isLoading: subjectsLoading,
        pagination,
        page,
        pageSize,
        setPage,
        setPageSize,
    } = useSubjects(profile?.organization_id, true);
    
    // For Step 1, use selectedClassId directly. For Step 2, get classId from selectedClassAcademicYearId
    const classIdForTemplates = useMemo(() => {
        // In Step 1 (Class Subjects tab), use selectedClassId
        if (activeTab === 'classSubjects' && selectedClassId) {
            return selectedClassId;
        }
        // In Step 2, get classId from selectedClassAcademicYearId
        if (selectedClassAcademicYearId && selectedClassAcademicYearId !== '' && classAcademicYears) {
            const selectedClassAcademicYear = classAcademicYears.find(cay => cay.id === selectedClassAcademicYearId);
            return selectedClassAcademicYear?.classId;
        }
        return undefined;
    }, [activeTab, selectedClassId, selectedClassAcademicYearId, classAcademicYears]);
    
    const { data: classSubjectTemplates, isLoading: classSubjectTemplatesLoading } = useClassSubjectTemplates(classIdForTemplates, profile?.organization_id);
    const { data: classSubjects, isLoading: classSubjectsLoading } = useClassSubjects(
        selectedClassAcademicYearId || undefined, 
        profile?.organization_id
    );
    const { data: rooms } = useRooms(undefined, profile?.organization_id);
    const { data: teachers } = useUsers({
        organization_id: profile?.organization_id || undefined,
        role: 'teacher'
    });

    const createSubject = useCreateSubject();
    const updateSubject = useUpdateSubject();
    const deleteSubject = useDeleteSubject();
    const assignSubjectToClass = useAssignSubjectToClassTemplate();
    const bulkAssignSubjectsToClass = useBulkAssignSubjectsToClassTemplate();
    const removeSubjectFromClass = useRemoveSubjectFromClassTemplate();
    const assignSubject = useAssignSubjectToClass();
    const bulkAssignSubjects = useBulkAssignSubjects();
    const updateClassSubject = useUpdateClassSubject();
    const removeSubject = useRemoveSubjectFromClass();
    const copySubjects = useCopySubjectsBetweenYears();

    // Set default academic year to current year
    useEffect(() => {
        if (currentAcademicYear && !selectedAcademicYearId) {
            setSelectedAcademicYearId(currentAcademicYear.id);
        }
    }, [currentAcademicYear, selectedAcademicYearId]);

    // Set default class when academic year changes
    useEffect(() => {
        if (classAcademicYears && classAcademicYears.length > 0 && !selectedClassAcademicYearId) {
            setSelectedClassAcademicYearId(classAcademicYears[0].id);
        }
    }, [classAcademicYears, selectedClassAcademicYearId]);

    const {
        register: registerSubject,
        handleSubmit: handleSubmitSubject,
        reset: resetSubject,
        setValue: setValueSubject,
        watch: watchSubject,
        control: controlSubject,
        formState: { errors: subjectErrors },
    } = useForm<SubjectFormData>({
        resolver: zodResolver(subjectSchema),
        defaultValues: {
            is_active: true,
        },
    });

    const {
        register: registerAssignToClass,
        handleSubmit: handleSubmitAssignToClass,
        reset: resetAssignToClass,
        setValue: setValueAssignToClass,
        control: controlAssignToClass,
        watch: watchAssignToClass,
        formState: { errors: assignToClassErrors },
    } = useForm<AssignSubjectToClassFormData>({
        resolver: zodResolver(assignSubjectToClassSchema),
    });

    const {
        register: registerBulkToClass,
        handleSubmit: handleSubmitBulkToClass,
        reset: resetBulkToClass,
        setValue: setValueBulkToClass,
        control: controlBulkToClass,
        watch: watchBulkToClass,
        formState: { errors: bulkToClassErrors },
    } = useForm<BulkAssignToClassFormData>({
        resolver: zodResolver(bulkAssignToClassSchema),
        defaultValues: {
            subject_ids: [],
        },
    });

    const {
        register: registerAssign,
        handleSubmit: handleSubmitAssign,
        reset: resetAssign,
        control: controlAssign,
        watch: watchAssign,
        formState: { errors: assignErrors },
    } = useForm<AssignSubjectFormData>({
        resolver: zodResolver(assignSubjectSchema),
    });

    const {
        register: registerBulk,
        handleSubmit: handleSubmitBulk,
        reset: resetBulk,
        control: controlBulk,
        watch: watchBulk,
        setValue: setValueBulk,
        formState: { errors: bulkErrors },
    } = useForm<BulkAssignFormData>({
        resolver: zodResolver(bulkAssignSchema),
    });

    const {
        register: registerCopy,
        handleSubmit: handleSubmitCopy,
        reset: resetCopy,
        control: controlCopy,
        watch: watchCopy,
        formState: { errors: copyErrors },
    } = useForm<CopySubjectsFormData>({
        resolver: zodResolver(copySubjectsSchema),
        defaultValues: {
            copy_assignments: false,
        },
    });

    // Client-side filtering for search
    const filteredSubjects = useMemo(() => {
        if (!subjects) return [];
        let filtered = subjects;

        // Search filter
        if (searchQuery) {
            const query = (searchQuery || '').toLowerCase();
            filtered = filtered.filter(s =>
                s.name?.toLowerCase().includes(query) ||
                s.code?.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [subjects, searchQuery]);

    // Define columns for DataTable
    const columns: ColumnDef<Subject>[] = [
        {
            accessorKey: 'code',
            header: t('academic.subjects.code'),
            cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
        },
        {
            accessorKey: 'name',
            header: t('academic.subjects.name'),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'description',
            header: t('academic.subjects.description'),
            cell: ({ row }) => (
                <span className="max-w-xs truncate">
                    {row.original.description || '-'}
                </span>
            ),
        },
        {
            accessorKey: 'isActive',
            header: t('academic.subjects.isActive'),
            cell: ({ row }) => {
                const isActive = row.original.isActive ?? row.original.is_active ?? true;
                return (
                    <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? t('academic.subjects.active') : t('academic.subjects.inactive')}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">{t('events.actions')}</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-end space-x-2">
                    {hasUpdatePermission && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenSubjectDialog(row.original)}
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                    {hasDeletePermission && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(row.original.id)}
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    // Use DataTable hook for pagination integration
    const { table } = useDataTable({
        data: filteredSubjects,
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

    const filteredTeachers = useMemo(() => {
        if (!teachers) return [];
        return teachers.filter(u => u.role === 'teacher' && u.isActive);
    }, [teachers]);

    const handleOpenSubjectDialog = (subject?: Subject) => {
        if (subject) {
            setSelectedSubject(subject.id);
            setValueSubject('name', subject.name);
            setValueSubject('code', subject.code);
            setValueSubject('description', subject.description || '');
            setValueSubject('is_active', subject.isActive);
        } else {
            setSelectedSubject(null);
            resetSubject();
        }
        setIsSubjectDialogOpen(true);
    };

    const handleCloseSubjectDialog = () => {
        setIsSubjectDialogOpen(false);
        setSelectedSubject(null);
        resetSubject();
    };

    const onSubmitSubject = async (data: SubjectFormData) => {
        try {
            if (selectedSubject) {
                await updateSubject.mutateAsync({
                    id: selectedSubject,
                    name: data.name,
                    code: data.code,
                    description: data.description,
                    isActive: data.is_active
                });
            } else {
                await createSubject.mutateAsync({
                    name: data.name,
                    code: data.code,
                    description: data.description,
                    isActive: data.is_active
                });
            }
            handleCloseSubjectDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleDeleteClick = (subjectId: string) => {
        setSelectedSubject(subjectId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (selectedSubject) {
            try {
                await deleteSubject.mutateAsync(selectedSubject);
                setIsDeleteDialogOpen(false);
                setSelectedSubject(null);
            } catch (error) {
                // Error handled by hook
            }
        }
    };

    const handleOpenAssignToClassDialog = () => {
        resetAssignToClass();
        if (selectedClassId) {
            setValueAssignToClass('class_id', selectedClassId);
        }
        setIsAssignToClassDialogOpen(true);
    };

    const handleCloseAssignToClassDialog = () => {
        setIsAssignToClassDialogOpen(false);
        resetAssignToClass();
    };

    const onSubmitAssignToClass = async (data: AssignSubjectToClassFormData) => {
        try {
            if (!data.class_id || !data.subject_id) {
                throw new Error('Class and subject are required');
            }
            await assignSubjectToClass.mutateAsync({
                classId: data.class_id,
                subjectId: data.subject_id
            });
            handleCloseAssignToClassDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleOpenBulkAssignToClassDialog = () => {
        resetBulkToClass();
        if (selectedClassId) {
            setValueBulkToClass('class_id', selectedClassId);
        }
        setIsBulkAssignToClassDialogOpen(true);
    };

    const handleCloseBulkAssignToClassDialog = () => {
        setIsBulkAssignToClassDialogOpen(false);
        resetBulkToClass();
    };

    const onSubmitBulkAssignToClass = async (data: BulkAssignToClassFormData) => {
        try {
            const subjectIds = Array.isArray(data.subject_ids) ? data.subject_ids : [];
            if (!data.class_id || subjectIds.length === 0) {
                throw new Error('Class and at least one subject are required');
            }
            await bulkAssignSubjectsToClass.mutateAsync({
                classId: data.class_id,
                subjectIds: subjectIds
            });
            handleCloseBulkAssignToClassDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleOpenAssignDialog = () => {
        resetAssign();
        setIsAssignDialogOpen(true);
    };

    const handleCloseAssignDialog = () => {
        setIsAssignDialogOpen(false);
        resetAssign();
    };

    const onSubmitAssign = async (data: AssignSubjectFormData) => {
        try {
            if (!data.class_academic_year_id || !data.subject_id) {
                throw new Error('Class and subject are required');
            }
            await assignSubject.mutateAsync({
                class_academic_year_id: data.class_academic_year_id,
                subject_id: data.subject_id,
                room_id: data.room_id, // Optional - will use class's room if not provided
                notes: data.notes
            });
            handleCloseAssignDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleOpenBulkAssignDialog = () => {
        resetBulk();
        setIsBulkAssignDialogOpen(true);
    };

    const handleCloseBulkAssignDialog = () => {
        setIsBulkAssignDialogOpen(false);
        resetBulk();
    };

    const onSubmitBulkAssign = async (data: BulkAssignFormData) => {
        try {
            const subjectIds = Array.isArray(data.subject_ids) ? data.subject_ids : [];
            if (!data.class_academic_year_id || subjectIds.length === 0) {
                throw new Error('Class and at least one subject are required');
            }
            await bulkAssignSubjects.mutateAsync({
                class_academic_year_id: data.class_academic_year_id,
                subject_ids: subjectIds,
                default_room_id: data.default_room_id
            });
            handleCloseBulkAssignDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleOpenCopyDialog = () => {
        resetCopy();
        setCopyFromClassYearId(selectedClassAcademicYearId);
        setIsCopyDialogOpen(true);
    };

    const handleCloseCopyDialog = () => {
        setIsCopyDialogOpen(false);
        resetCopy();
    };

    const onSubmitCopy = async (data: CopySubjectsFormData) => {
        try {
            if (!data.from_class_academic_year_id || !data.to_class_academic_year_id) {
                throw new Error('Source and destination classes are required');
            }
            await copySubjects.mutateAsync({
                from_class_academic_year_id: data.from_class_academic_year_id,
                to_class_academic_year_id: data.to_class_academic_year_id,
                copy_assignments: data.copy_assignments
            });
            handleCloseCopyDialog();
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleRemoveClick = (classSubjectId: string) => {
        setSelectedClassSubject(classSubjectId);
        setIsRemoveDialogOpen(true);
    };

    const handleRemoveConfirm = async () => {
        if (selectedClassSubject) {
            try {
                await removeSubject.mutateAsync(selectedClassSubject);
                setIsRemoveDialogOpen(false);
                setSelectedClassSubject(null);
            } catch (error) {
                // Error handled by hook
            }
        }
    };

    const handleEditClassSubject = (classSubject: any) => {
        setSelectedClassSubject(classSubject.id);
        setValueSubject('name', classSubject.subject?.name || '');
        // Note: We'll need a separate form for editing class subjects
        // For now, we'll use the assign dialog with pre-filled data
    };

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" data-tour="subjects-page">
            <PageHeader
                title={t('academic.subjects.title') || 'Subjects Management'}
                description={t('academic.subjects.management') || 'Manage subjects and subject assignments'}
                icon={<BookOpen className="h-5 w-5" />}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="flex w-full gap-1 h-auto flex-shrink-0 overflow-x-auto pb-1" data-tour="subjects-tabs">
                    <TabsTrigger value="subjects" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{t('academic.subjects.baseSubjects')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="classSubjects" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0" data-tour="tab-classSubjects">
                        <GraduationCap className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{t('academic.subjects.classSubjects')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Subjects Tab */}
                <TabsContent value="subjects" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>{t('academic.subjects.baseSubjects')}</CardTitle>
                                    <CardDescription className="hidden md:block">
                                        {t('academic.subjects.management')}
                                    </CardDescription>
                                </div>
                                {hasCreatePermission && (
                                    <Button onClick={() => handleOpenSubjectDialog()} className="flex-shrink-0" data-tour="subjects-create-button">
                                        <Plus className="h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">{t('academic.subjects.addSubject')}</span>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FilterPanel
                                title={t('events.filters') || 'Filters'}
                                defaultOpenDesktop={true}
                                defaultOpenMobile={false}
                            >
                                <div>
                                    <Label>{t('events.search') || 'Search'}</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('academic.subjects.searchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </FilterPanel>

                            {subjectsLoading ? (
                                <div className="text-center py-8">{t('common.loading')}</div>
                            ) : filteredSubjects.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">{t('academic.subjects.noSubjectsFound')}</p>
                                    <p className="text-sm">{t('academic.subjects.noSubjectsMessage')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto -mx-4 md:mx-0">
                                        <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                            <div className="rounded-md border">
                                                <Table>
                                            <TableHeader>
                                                {table.getHeaderGroups().map((headerGroup) => (
                                                    <TableRow key={headerGroup.id}>
                                                        {headerGroup.headers.map((header) => (
                                                            <TableHead key={header.id}>
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
                                                            {t('academic.subjects.noSubjectsFound')}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    table.getRowModel().rows.map((row) => (
                                                        <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                                                            {row.getVisibleCells().map((cell) => (
                                                                <TableCell key={cell.id}>
                                                                    {cell.column.columnDef.cell
                                                                        ? cell.column.columnDef.cell({ row })
                                                                        : null}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pagination */}
                                    <DataTablePagination
                                        table={table}
                                        paginationMeta={pagination ?? null}
                                        onPageChange={setPage}
                                        onPageSizeChange={setPageSize}
                                        showPageSizeSelector={true}
                                        showTotalCount={true}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Class Subjects Tab */}
                <TabsContent value="classSubjects" className="space-y-4">
                    {/* Step 1: Assign Subjects to Classes */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-xl mb-2">{t('academic.subjects.step1Title')}</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed">
                                        {t('academic.subjects.step1Description')}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
                                    {classSubjectTemplates && classSubjectTemplates.length > 0 && selectedClassId && (
                                        <ReportExportButtons
                                            data={classSubjectTemplates}
                                            columns={[
                                                { key: 'code', label: t('academic.subjects.code') },
                                                { key: 'name', label: t('academic.subjects.name') },
                                            ]}
                                            reportKey="classes_subjects"
                                            title={`${t('academic.subjects.classSubjects') || 'Classes Subjects'} - ${classes?.find(c => c.id === selectedClassId)?.name || ''}`}
                                            transformData={(data) => data.map((template) => ({
                                                code: template.subject?.code || '',
                                                name: template.subject?.name || '',
                                            }))}
                                            buildFiltersSummary={() => {
                                                const className = classes?.find(c => c.id === selectedClassId)?.name || '';
                                                return className ? `Class: ${className}` : '';
                                            }}
                                            schoolId={profile?.default_school_id}
                                            templateType="classes_subjects"
                                            disabled={!classSubjectTemplates || classSubjectTemplates.length === 0}
                                        />
                                    )}
                                    {hasAssignPermission && selectedClassId && (
                                        <>
                                            <Button variant="outline" onClick={handleOpenBulkAssignToClassDialog} className="flex-shrink-0 whitespace-nowrap h-9">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.bulkAssign')}</span>
                                            </Button>
                                            <Button onClick={handleOpenAssignToClassDialog} className="flex-shrink-0 whitespace-nowrap h-9">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.assignSubject')}</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6 space-y-3">
                                <div>
                                    <Label className="mb-2 block text-base font-semibold">{t('events.selectClass')}</Label>
                                    <Select
                                        value={selectedClassId || undefined}
                                        onValueChange={(value) => {
                                            setSelectedClassId(value);
                                        }}
                                    >
                                        <SelectTrigger className="w-full sm:w-[300px] h-10">
                                            <SelectValue placeholder={t('events.selectClass')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes?.filter(c => c.isActive).map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name} ({cls.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {t('academic.subjects.step1SelectClassMessage')}
                                </p>
                            </div>

                            {!selectedClassId ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <GraduationCap className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                    <p className="text-base font-medium mb-2">{t('academic.subjects.step1SelectClassMessage')}</p>
                                    <p className="text-sm">Select a class above to view and manage its subjects</p>
                                </div>
                            ) : classSubjectTemplatesLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                    <p className="text-muted-foreground">{t('common.loading')}</p>
                                </div>
                            ) : !classSubjectTemplates || classSubjectTemplates.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <BookOpen className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-2">{t('academic.subjects.noSubjectsAssigned')}</p>
                                    <p className="text-sm mb-4">{t('academic.subjects.step1NoSubjectsMessage')}</p>
                                    {hasAssignPermission && (
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" onClick={handleOpenBulkAssignToClassDialog} size="sm">
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('academic.subjects.bulkAssign')}
                                            </Button>
                                            <Button onClick={handleOpenAssignToClassDialog} size="sm">
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('academic.subjects.assignSubject')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {(() => {
                                        // Filter templates for the selected class
                                        const filteredTemplates = classSubjectTemplates?.filter(
                                            template => template.classId === selectedClassId
                                        ) || [];
                                        
                                        if (filteredTemplates.length === 0) {
                                            return (
                                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                                    <BookOpen className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                                    <p className="text-lg font-medium mb-2">{t('academic.subjects.noSubjectsAssigned')}</p>
                                                    <p className="text-sm mb-4">{t('academic.subjects.step1NoSubjectsMessage')}</p>
                                                    {hasAssignPermission && (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Button variant="outline" onClick={handleOpenBulkAssignToClassDialog} size="sm">
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                {t('academic.subjects.bulkAssign')}
                                                            </Button>
                                                            <Button onClick={handleOpenAssignToClassDialog} size="sm">
                                                                <Plus className="h-4 w-4 mr-2" />
                                                                {t('academic.subjects.assignSubject')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        
                                        return (
                                            <>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-muted-foreground">
                                                            {t('academic.subjects.subjectsAssignedCount').replace('{count}', filteredTemplates.length.toString())}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border bg-card">
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent">
                                                                        <TableHead className="font-semibold">{t('academic.subjects.code')}</TableHead>
                                                                        <TableHead className="font-semibold">{t('academic.subjects.name')}</TableHead>
                                                                        <TableHead className="text-right w-[100px] font-semibold">{t('events.actions')}</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {filteredTemplates.map((template, index) => (
                                                                        <TableRow key={template.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                                                                            <TableCell className="font-mono text-sm">{template.subject?.code || '-'}</TableCell>
                                                                            <TableCell className="font-medium">{template.subject?.name || '-'}</TableCell>
                                                                            <TableCell>
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    {hasDeletePermission && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => {
                                                                                                setSelectedClassSubject(template.id);
                                                                                                setIsRemoveDialogOpen(true);
                                                                                            }}
                                                                                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                                                                                            title={t('events.delete')}
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                                        </Button>
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
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Step 2: Customize Subjects per Academic Year */}
                    <Card data-tour="subjects-step2-academic-year">
                        <CardHeader className="pb-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="flex-1">
                                    <CardTitle className="text-xl mb-2">{t('academic.subjects.step2Title')}</CardTitle>
                                    <CardDescription className="text-sm leading-relaxed">
                                        {t('academic.subjects.step2Description')}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
                                    {classSubjects && classSubjects.length > 0 && selectedClassAcademicYearId && selectedClassAcademicYearId !== '' && (
                                        <ReportExportButtons
                                            data={classSubjects}
                                            columns={[
                                                { key: 'code', label: t('academic.subjects.code') },
                                                { key: 'name', label: t('academic.subjects.name') },
                                                { key: 'teacher', label: t('academic.subjects.teacher') },
                                                { key: 'room', label: t('academic.subjects.room') },
                                                { key: 'weeklyHours', label: t('academic.subjects.weeklyHours') },
                                            ]}
                                            reportKey="class_subject_academic_year"
                                            title={`${t('academic.subjects.classSubjects') || 'Class Subjects'} - ${classAcademicYears?.find(cay => cay.id === selectedClassAcademicYearId)?.class?.name || ''} ${classAcademicYears?.find(cay => cay.id === selectedClassAcademicYearId)?.sectionName ? `- ${classAcademicYears.find(cay => cay.id === selectedClassAcademicYearId)?.sectionName}` : ''}`}
                                            transformData={(data) => data.map((cs) => ({
                                                code: cs.subject?.code || '',
                                                name: cs.subject?.name || '',
                                                teacher: cs.teacher?.fullName || '-',
                                                room: cs.room?.roomNumber || '-',
                                                weeklyHours: cs.hoursPerWeek || '-',
                                            }))}
                                            buildFiltersSummary={() => {
                                                const cay = classAcademicYears?.find(cay => cay.id === selectedClassAcademicYearId);
                                                const academicYear = academicYears?.find(y => y.id === selectedAcademicYearId);
                                                const parts: string[] = [];
                                                if (cay?.class?.name) parts.push(`Class: ${cay.class.name}`);
                                                if (cay?.sectionName) parts.push(`Section: ${cay.sectionName}`);
                                                if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                                                return parts.join(' | ');
                                            }}
                                            schoolId={profile?.default_school_id}
                                            templateType="class_subject_academic_year"
                                            disabled={!classSubjects || classSubjects.length === 0}
                                        />
                                    )}
                                    {hasAssignPermission && selectedClassAcademicYearId && selectedClassAcademicYearId !== '' && (
                                        <>
                                            <Button variant="outline" onClick={handleOpenBulkAssignDialog} disabled={!subjects || subjects.length === 0} className="flex-shrink-0 whitespace-nowrap h-9">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.bulkAssignSubjects')}</span>
                                            </Button>
                                            <Button onClick={handleOpenAssignDialog} disabled={!subjects || subjects.length === 0} className="flex-shrink-0 whitespace-nowrap h-9">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.assignToClass')}</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">{t('academic.subjects.selectAcademicYear')}</Label>
                                        <Select
                                            value={selectedAcademicYearId || undefined}
                                            onValueChange={(value) => {
                                                setSelectedAcademicYearId(value);
                                                setSelectedClassAcademicYearId('');
                                            }}
                                        >
                                            <SelectTrigger className="w-full h-10">
                                                <SelectValue placeholder={t('academic.subjects.selectAcademicYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name} {year.isCurrent && `(${t('academic.academicYears.current')})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedAcademicYearId && (
                                        <div className="space-y-2">
                                            <Label className="text-base font-semibold">{t('academic.subjects.selectClass')}</Label>
                                            <Select
                                                value={selectedClassAcademicYearId || ''}
                                                onValueChange={(value) => setSelectedClassAcademicYearId(value || '')}
                                            >
                                                <SelectTrigger className="w-full h-10">
                                                    <SelectValue placeholder={t('academic.subjects.selectClass')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classAcademicYears && classAcademicYears.length > 0 ? (
                                                        classAcademicYears.map((cay) => (
                                                            <SelectItem key={cay.id} value={cay.id}>
                                                                {cay.class?.name} {cay.sectionName ? `- ${cay.sectionName}` : ''}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                            {t('academic.subjects.noClassesForYear')}
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                                {selectedClassAcademicYearId && selectedClassAcademicYearId !== '' && hasCopyPermission && (
                                    <div>
                                        <Button variant="outline" onClick={handleOpenCopyDialog} className="w-full sm:w-auto h-9">
                                            <Copy className="h-4 w-4 sm:mr-2" />
                                            <span>{t('academic.subjects.copyBetweenYears')}</span>
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {!selectedClassAcademicYearId || selectedClassAcademicYearId === '' ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <BookOpen className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                    <p className="text-base font-medium mb-2">{t('academic.subjects.step2SelectMessage')}</p>
                                    <p className="text-sm">{t('academic.subjects.step2SelectDescription')}</p>
                                </div>
                            ) : classSubjectsLoading ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                                    <p className="text-muted-foreground">{t('common.loading')}</p>
                                </div>
                            ) : !classSubjects || classSubjects.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                                    <BookOpen className="mx-auto h-16 w-16 mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-2">{t('academic.subjects.noSubjectsAssigned')}</p>
                                    <p className="text-sm mb-4">Subjects assigned to the class in Step 1 will appear here. You can customize teacher, room, and hours per academic year.</p>
                                    {hasAssignPermission && (
                                        <div className="flex items-center justify-center gap-2">
                                            <Button variant="outline" onClick={handleOpenBulkAssignDialog} size="sm" disabled={!subjects || subjects.length === 0}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('academic.subjects.bulkAssignSubjects')}
                                            </Button>
                                            <Button onClick={handleOpenAssignDialog} size="sm" disabled={!subjects || subjects.length === 0}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                {t('academic.subjects.assignSubject')}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            {t('academic.subjects.subjectsAssignedCountStep2').replace('{count}', classSubjects.length.toString())}
                                        </p>
                                    </div>
                                    <div className="rounded-lg border bg-card">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="font-semibold">{t('academic.subjects.code')}</TableHead>
                                                        <TableHead className="font-semibold">{t('academic.subjects.name')}</TableHead>
                                                        <TableHead className="font-semibold">{t('academic.subjects.teacher')}</TableHead>
                                                        <TableHead className="font-semibold">{t('academic.subjects.room')}</TableHead>
                                                        <TableHead className="font-semibold">{t('academic.subjects.weeklyHours')}</TableHead>
                                                        <TableHead className="text-right w-[100px] font-semibold">{t('events.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {classSubjects.map((cs, index) => (
                                                        <TableRow key={cs.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                                                            <TableCell className="font-mono text-sm">{cs.subject?.code || '-'}</TableCell>
                                                            <TableCell className="font-medium">{cs.subject?.name || '-'}</TableCell>
                                                            <TableCell>{cs.teacher?.fullName || '-'}</TableCell>
                                                            <TableCell>{cs.room?.roomNumber || '-'}</TableCell>
                                                            <TableCell>{cs.hoursPerWeek || '-'}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {hasUpdatePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleEditClassSubject(cs)}
                                                                            className="h-8 w-8 p-0 hover:bg-primary/10"
                                                                            title={t('academic.subjects.editSubject')}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    {hasDeletePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveClick(cs.id)}
                                                                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                                                                            title={t('events.delete')}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
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
                </TabsContent>
            </Tabs>

            {/* Create/Edit Subject Dialog */}
            <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedSubject ? t('academic.subjects.editSubject') : t('academic.subjects.addSubject')}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedSubject ? t('academic.subjects.updateSubjectDialogDescription') : t('academic.subjects.createSubjectDialogDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitSubject(onSubmitSubject)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('academic.subjects.name')} *</Label>
                                <Input
                                    id="name"
                                    {...registerSubject('name')}
                                    placeholder={t('events.example') + ' Mathematics'}
                                />
                                {subjectErrors.name && (
                                    <p className="text-sm text-destructive">{subjectErrors.name.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="code">{t('academic.subjects.code')} *</Label>
                                <Input
                                    id="code"
                                    {...registerSubject('code')}
                                    placeholder="MATH"
                                />
                                {subjectErrors.code && (
                                    <p className="text-sm text-destructive">{subjectErrors.code.message}</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="is_active">{t('academic.subjects.isActive')}</Label>
                            <div className="flex items-center space-x-2">
                                <Controller
                                    name="is_active"
                                    control={controlSubject}
                                    render={({ field }) => (
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <Label>{watchSubject('is_active') ? t('academic.subjects.active') : t('academic.subjects.inactive')}</Label>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('academic.subjects.description')}</Label>
                            <Textarea
                                id="description"
                                {...registerSubject('description')}
                                placeholder={t('academic.subjects.description')}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseSubjectDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={createSubject.isPending || updateSubject.isPending}>
                                {t('events.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Subject Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('academic.subjects.assignToClass')}</DialogTitle>
                        <DialogDescription>
                            Assign a subject to the selected class
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAssign(onSubmitAssign)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject_id">{t('academic.subjects.selectSubject')} *</Label>
                            <Controller
                                name="subject_id"
                                control={controlAssign}
                                render={({ field }) => {
                                    // Get class_id from selectedClassAcademicYearId
                                    const selectedClassAcademicYear = classAcademicYears?.find(cay => cay.id === selectedClassAcademicYearId);
                                    const classIdForStep2 = selectedClassAcademicYear?.classId;
                                    
                                    // Get subjects assigned to this class in Step 1 (from class-subject-templates)
                                    const classTemplateSubjectIds = classSubjectTemplates
                                        ?.filter(template => template.classId === classIdForStep2)
                                        .map(template => template.subjectId) || [];
                                    
                                    // Filter out already assigned subjects (from class-subjects)
                                    const assignedSubjectIds = classSubjects?.map(cs => cs.subjectId) || [];
                                    
                                    // Only show subjects that:
                                    // 1. Are active
                                    // 2. Are assigned to the class in Step 1 (class-subject-templates)
                                    // 3. Are not already assigned to this class instance (class-subjects)
                                    const availableSubjects = subjects?.filter(s => 
                                        s.isActive && 
                                        classTemplateSubjectIds.includes(s.id) &&
                                        !assignedSubjectIds.includes(s.id)
                                    ) || [];
                                    
                                    // Debug logging
                                    if (import.meta.env.DEV) {
                                        console.log('Subjects for dropdown (Step 2):', {
                                            classIdForStep2,
                                            classTemplateSubjectIds: classTemplateSubjectIds.length,
                                            assignedSubjectIds: assignedSubjectIds.length,
                                            availableSubjects: availableSubjects.length
                                        });
                                    }
                                    
                                    return (
                                        <Select value={field.value || undefined} onValueChange={field.onChange} disabled={subjectsLoading || !subjects || subjects.length === 0 || !classIdForStep2}>
                                            <SelectTrigger>
                                                <SelectValue                                                 placeholder={
                                                    !classIdForStep2
                                                        ? t('academic.subjects.selectClassFirst')
                                                        : subjectsLoading 
                                                        ? t('academic.subjects.loadingSubjects')
                                                        : !subjects || subjects.length === 0
                                                        ? t('academic.subjects.noSubjectsAvailable')
                                                        : classTemplateSubjectIds.length === 0
                                                        ? t('academic.subjects.noSubjectsInStep1')
                                                        : availableSubjects.length === 0 
                                                        ? t('academic.subjects.allSubjectsAssigned')
                                                        : t('academic.subjects.selectSubject')
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {!classIdForStep2 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        {t('academic.subjects.selectClassFirstMessage')}
                                                    </div>
                                                ) : subjectsLoading ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        {t('academic.subjects.loadingSubjects')}
                                                    </div>
                                                ) : !subjects || subjects.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        {t('academic.subjects.noSubjectsAvailable')}
                                                    </div>
                                                ) : classTemplateSubjectIds.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        {t('academic.subjects.noSubjectsInStep1Message')}
                                                    </div>
                                                ) : availableSubjects.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        {t('academic.subjects.allSubjectsAssigned')}
                                                    </div>
                                                ) : (
                                                    availableSubjects.map((subject) => (
                                                        <SelectItem key={subject.id} value={subject.id}>
                                                            {subject.code} - {subject.name}
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    );
                                }}
                            />
                            {assignErrors.subject_id && (
                                <p className="text-sm text-destructive">{assignErrors.subject_id.message}</p>
                            )}
                            {subjectsLoading && (
                                <p className="text-xs text-muted-foreground">{t('academic.subjects.loadingSubjects')}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="room_id">{t('academic.subjects.room')} (Optional)</Label>
                            <Controller
                                name="room_id"
                                control={controlAssign}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.leaveEmptyForClassRoom')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('academic.subjects.useClassRoom')}</SelectItem>
                                            {rooms?.map((room) => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.roomNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <p className="text-xs text-muted-foreground">{t('academic.subjects.leaveEmptyForClassRoom')}</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('academic.subjects.notes')}</Label>
                            <Textarea
                                id="notes"
                                {...registerAssign('notes')}
                                placeholder={t('academic.subjects.optionalNotes')}
                                rows={3}
                            />
                        </div>
                        <input type="hidden" {...registerAssign('class_academic_year_id')} value={selectedClassAcademicYearId || ''} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseAssignDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={assignSubject.isPending}>
                                {t('events.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Assign Subjects Dialog */}
            <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('academic.subjects.bulkAssignSubjects')}</DialogTitle>
                        <DialogDescription>
                            Assign multiple subjects to the selected class at once
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitBulk(onSubmitBulkAssign)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('academic.subjects.selectSubjects')} *</Label>
                            {subjectsLoading ? (
                                <div className="border rounded-md p-4 text-center text-muted-foreground">
                                    {t('academic.subjects.loadingSubjects')}
                                </div>
                            ) : (
                                <>
                                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                        {(() => {
                                            // Get class_id from selectedClassAcademicYearId
                                            const selectedClassAcademicYear = classAcademicYears?.find(cay => cay.id === selectedClassAcademicYearId);
                                            const classIdForStep2 = selectedClassAcademicYear?.classId;
                                            
                                            // Get subjects assigned to this class in Step 1 (from class-subject-templates)
                                            const classTemplateSubjectIds = classSubjectTemplates
                                                ?.filter(template => template.classId === classIdForStep2)
                                                .map(template => template.subjectId) || [];
                                            
                                            // Filter out already assigned subjects (from class-subjects)
                                            const assignedSubjectIds = classSubjects?.map(cs => cs.subjectId) || [];
                                            
                                            // Only show subjects that:
                                            // 1. Are active
                                            // 2. Are assigned to the class in Step 1 (class-subject-templates)
                                            // 3. Are not already assigned to this class instance (class-subjects)
                                            const availableSubjects = subjects?.filter(s => 
                                                s.isActive && 
                                                classTemplateSubjectIds.includes(s.id) &&
                                                !assignedSubjectIds.includes(s.id)
                                            ) || [];
                                            
                                            if (!classIdForStep2) {
                                                return (
                                                    <div className="text-center py-4 text-muted-foreground">
                                                        {t('academic.subjects.selectClassFirstMessage')}
                                                    </div>
                                                );
                                            }
                                            
                                            if (classTemplateSubjectIds.length === 0) {
                                                return (
                                                    <div className="text-center py-4 text-muted-foreground">
                                                        {t('academic.subjects.noSubjectsInStep1Message')}
                                                    </div>
                                                );
                                            }
                                            
                                            if (availableSubjects.length === 0) {
                                                return (
                                                    <div className="text-center py-4 text-muted-foreground">
                                                        {subjects && subjects.length > 0 
                                                            ? t('academic.subjects.allSubjectsAssigned')
                                                            : t('academic.subjects.noSubjectsAvailable')}
                                                    </div>
                                                );
                                            }
                                            
                                            return availableSubjects.map((subject) => {
                                                const selectedSubjects = watchBulk('subject_ids') || [];
                                                const isSelected = selectedSubjects.includes(subject.id);
                                                return (
                                                    <div key={subject.id} className="flex items-center space-x-2 py-2">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const current = watchBulk('subject_ids') || [];
                                                                if (checked) {
                                                                    setValueBulk('subject_ids', [...current, subject.id]);
                                                                } else {
                                                                    setValueBulk('subject_ids', current.filter(id => id !== subject.id));
                                                                }
                                                            }}
                                                        />
                                                        <Label className="cursor-pointer flex-1">
                                                            {subject.code} - {subject.name}
                                                        </Label>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    {bulkErrors.subject_ids && (
                                        <p className="text-sm text-destructive">{bulkErrors.subject_ids.message}</p>
                                    )}
                                    {classSubjects && classSubjects.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {classSubjects.length} subject{classSubjects.length !== 1 ? 's' : ''} already assigned. Only unassigned subjects are shown.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="default_room_id">{t('academic.subjects.room')} (Optional)</Label>
                            <Controller
                                name="default_room_id"
                                control={controlBulk}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={(value) => field.onChange(value === 'none' ? null : value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.leaveEmptyForClassRoom')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">{t('academic.subjects.useClassRoom')}</SelectItem>
                                            {rooms?.map((room) => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.roomNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <p className="text-xs text-muted-foreground">{t('academic.subjects.leaveEmptyForClassRoom')}</p>
                        </div>
                        <input type="hidden" {...registerBulk('class_academic_year_id')} value={selectedClassAcademicYearId || ''} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseBulkAssignDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={bulkAssignSubjects.isPending}>
                                {t('academic.subjects.assignSubjects')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Subject to Class Template Dialog */}
            <Dialog open={isAssignToClassDialogOpen} onOpenChange={setIsAssignToClassDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('academic.subjects.assignSubject')}</DialogTitle>
                        <DialogDescription>
                            {t('academic.subjects.assignToClassTemplateDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAssignToClass(onSubmitAssignToClass)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="class_id_template">Class *</Label>
                            <Controller
                                name="class_id"
                                control={controlAssignToClass}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('events.selectClass')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes?.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name} ({cls.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {assignToClassErrors.class_id && (
                                <p className="text-sm text-destructive">{assignToClassErrors.class_id.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subject_id_template">{t('academic.subjects.selectSubject')} *</Label>
                            <Controller
                                name="subject_id"
                                control={controlAssignToClass}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.selectSubject')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {subjects?.filter(s => s.isActive).map((subject) => (
                                                <SelectItem key={subject.id} value={subject.id}>
                                                    {subject.code} - {subject.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {assignToClassErrors.subject_id && (
                                <p className="text-sm text-destructive">{assignToClassErrors.subject_id.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseAssignToClassDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={assignSubjectToClass.isPending}>
                                {t('events.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Assign Subjects to Class Template Dialog */}
            <Dialog open={isBulkAssignToClassDialogOpen} onOpenChange={setIsBulkAssignToClassDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('academic.subjects.bulkAssignSubjects')}</DialogTitle>
                        <DialogDescription>
                            {t('academic.subjects.bulkAssignToClassTemplateDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitBulkToClass(onSubmitBulkAssignToClass)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('search.class')} *</Label>
                            <Controller
                                name="class_id"
                                control={controlBulkToClass}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.selectClass')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes?.map((cls) => (
                                                <SelectItem key={cls.id} value={cls.id}>
                                                    {cls.name} ({cls.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {bulkToClassErrors.class_id && (
                                <p className="text-sm text-destructive">{bulkToClassErrors.class_id.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('academic.subjects.selectSubjects')} *</Label>
                            {subjectsLoading ? (
                                <div className="border rounded-md p-8 text-center text-muted-foreground">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                                    <p className="text-sm">{t('academic.subjects.loadingSubjects')}</p>
                                </div>
                            ) : !subjects || subjects.length === 0 ? (
                                <div className="border rounded-md p-8 text-center text-muted-foreground">
                                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                    <p className="text-sm">{t('academic.subjects.noSubjectsAvailable')}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                        {subjects?.filter(s => s.isActive).length === 0 ? (
                                            <div className="text-center py-4 text-muted-foreground text-sm">
                                                {t('academic.subjects.noActiveSubjects')}
                                            </div>
                                        ) : (
                                            subjects?.filter(s => s.isActive).map((subject) => {
                                                const selectedSubjects = watchBulkToClass('subject_ids') || [];
                                                const isSelected = selectedSubjects.includes(subject.id);
                                                return (
                                                    <div key={subject.id} className="flex items-center space-x-2 py-2 hover:bg-muted/50 rounded px-2">
                                                        <Checkbox
                                                            id={`subject-template-${subject.id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                const current = selectedSubjects;
                                                                if (checked) {
                                                                    setValueBulkToClass('subject_ids', [...current, subject.id]);
                                                                } else {
                                                                    setValueBulkToClass('subject_ids', current.filter(id => id !== subject.id));
                                                                }
                                                            }}
                                                        />
                                                        <Label
                                                            htmlFor={`subject-template-${subject.id}`}
                                                            className="cursor-pointer flex-1 font-normal"
                                                        >
                                                            <span className="font-mono text-sm">{subject.code}</span> - {subject.name}
                                                        </Label>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {watchBulkToClass('subject_ids') && watchBulkToClass('subject_ids').length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {watchBulkToClass('subject_ids').length} {watchBulkToClass('subject_ids').length === 1 ? 'subject' : 'subjects'} selected
                                        </p>
                                    )}
                                    {bulkToClassErrors.subject_ids && (
                                        <p className="text-sm text-destructive">{bulkToClassErrors.subject_ids.message}</p>
                                    )}
                                </>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseBulkAssignToClassDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={bulkAssignSubjectsToClass.isPending || !watchBulkToClass('subject_ids') || watchBulkToClass('subject_ids').length === 0}
                            >
                                {bulkAssignSubjectsToClass.isPending ? (
                                    <>
                                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        {t('common.loading')}
                                    </>
                                ) : (
                                    <>
                                        {t('academic.subjects.assignSubjects')} 
                                        {watchBulkToClass('subject_ids') && watchBulkToClass('subject_ids').length > 0 && ` (${watchBulkToClass('subject_ids').length})`}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Copy Subjects Dialog */}
            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('academic.subjects.copyBetweenYears')}</DialogTitle>
                        <DialogDescription>
                            {t('academic.subjects.copySubjectsDialogDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitCopy(onSubmitCopy)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="from_class_academic_year_id">{t('academic.subjects.fromYear')} *</Label>
                            <Controller
                                name="from_class_academic_year_id"
                                control={controlCopy}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.fromYear')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classAcademicYears?.map((cay) => (
                                                <SelectItem key={cay.id} value={cay.id}>
                                                    {cay.class?.name} {cay.sectionName ? `- ${cay.sectionName}` : ''} ({cay.academicYear?.name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {copyErrors.from_class_academic_year_id && (
                                <p className="text-sm text-destructive">{copyErrors.from_class_academic_year_id.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="to_class_academic_year_id">{t('academic.subjects.toYear')} *</Label>
                            <Controller
                                name="to_class_academic_year_id"
                                control={controlCopy}
                                render={({ field }) => (
                                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('academic.subjects.toYear')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classAcademicYears?.map((cay) => (
                                                <SelectItem key={cay.id} value={cay.id}>
                                                    {cay.class?.name} {cay.sectionName ? `- ${cay.sectionName}` : ''} ({cay.academicYear?.name})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {copyErrors.to_class_academic_year_id && (
                                <p className="text-sm text-destructive">{copyErrors.to_class_academic_year_id.message}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Controller
                                name="copy_assignments"
                                control={controlCopy}
                                render={({ field }) => (
                                    <Checkbox
                                        id="copy_assignments"
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                            <Label htmlFor="copy_assignments" className="cursor-pointer">
                                {t('academic.subjects.copyAssignments')}
                            </Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseCopyDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={copySubjects.isPending}>
                                {t('academic.subjects.copyBetweenYears')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Subject Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('academic.subjects.deleteConfirm')}
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

            {/* Remove Subject Assignment Confirmation Dialog */}
            <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('academic.subjects.removeConfirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('events.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

