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
    const [selectedClassAcademicYearId, setSelectedClassAcademicYearId] = useState<string | undefined>();
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
    
    // Get class_id from selectedClassAcademicYearId for Step 2, or use selectedClassId for Step 1
    const classIdForTemplates = useMemo(() => {
        if (selectedClassAcademicYearId && classAcademicYears) {
            const selectedClassAcademicYear = classAcademicYears.find(cay => cay.id === selectedClassAcademicYearId);
            return selectedClassAcademicYear?.classId || selectedClassId;
        }
        return selectedClassId;
    }, [selectedClassAcademicYearId, classAcademicYears, selectedClassId]);
    
    const { data: classSubjectTemplates, isLoading: classSubjectTemplatesLoading } = useClassSubjectTemplates(classIdForTemplates, profile?.organization_id);
    const { data: classSubjects, isLoading: classSubjectsLoading } = useClassSubjects(selectedClassAcademicYearId, profile?.organization_id);
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
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('academic.subjects.title') || 'Subjects Management'}
                description={t('academic.subjects.management') || 'Manage subjects and subject assignments'}
                icon={<BookOpen className="h-5 w-5" />}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="flex w-full gap-1 h-auto flex-shrink-0 overflow-x-auto pb-1">
                    <TabsTrigger value="subjects" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
                        <BookOpen className="h-4 w-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm">{t('academic.subjects.baseSubjects')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="classSubjects" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
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
                                    <Button onClick={() => handleOpenSubjectDialog()} className="flex-shrink-0">
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
                        <CardHeader>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Step 1: Assign Subjects to Classes</CardTitle>
                                    <CardDescription className="hidden md:block">
                                        First, assign subjects to classes. These subjects will appear in all academic years for the selected class.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
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
                                            <Button variant="outline" onClick={handleOpenBulkAssignToClassDialog} className="flex-shrink-0">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Bulk Assign</span>
                                            </Button>
                                            <Button onClick={handleOpenAssignToClassDialog} className="flex-shrink-0">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">Assign Subject</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <Label className="mb-2 block">{t('events.selectClass')}</Label>
                                <Select
                                    value={selectedClassId || undefined}
                                    onValueChange={(value) => {
                                        setSelectedClassId(value);
                                    }}
                                >
                                    <SelectTrigger className="w-full sm:w-[300px]">
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
                            </div>

                            {!selectedClassId ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Please select a class to view and manage its subjects</p>
                                </div>
                            ) : classSubjectTemplatesLoading ? (
                                <div className="text-center py-8">{t('common.loading')}</div>
                            ) : !classSubjectTemplates || classSubjectTemplates.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No subjects assigned to this class</p>
                                    <p className="text-sm">Assign subjects to this class to get started</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto -mx-4 md:mx-0">
                                    <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('academic.subjects.code')}</TableHead>
                                                        <TableHead>{t('academic.subjects.name')}</TableHead>
                                                        <TableHead className="text-right">{t('events.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {classSubjectTemplates.map((template) => (
                                                        <TableRow key={template.id}>
                                                            <TableCell className="font-mono">{template.subject?.code}</TableCell>
                                                            <TableCell className="font-medium">{template.subject?.name}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    {hasDeletePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedClassSubject(template.id);
                                                                                setIsRemoveDialogOpen(true);
                                                                            }}
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

                    {/* Step 2: Customize Subjects per Academic Year */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Step 2: Customize Subjects per Academic Year</CardTitle>
                                    <CardDescription className="hidden md:block">
                                        Customize teacher, room, and hours for subjects in specific academic years.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {classSubjects && classSubjects.length > 0 && selectedClassAcademicYearId && (
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
                                    {hasAssignPermission && selectedClassAcademicYearId && (
                                        <>
                                            <Button variant="outline" onClick={handleOpenBulkAssignDialog} disabled={!subjects || subjects.length === 0} className="flex-shrink-0">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.bulkAssignSubjects')}</span>
                                            </Button>
                                            <Button onClick={handleOpenAssignDialog} disabled={!subjects || subjects.length === 0} className="flex-shrink-0">
                                                <Plus className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.assignToClass')}</span>
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <FilterPanel
                                title={t('events.filters') || 'Filters'}
                                defaultOpenDesktop={true}
                                defaultOpenMobile={false}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label className="mb-2 block">{t('academic.subjects.selectAcademicYear')}</Label>
                                        <Select
                                            value={selectedAcademicYearId || undefined}
                                            onValueChange={(value) => {
                                                setSelectedAcademicYearId(value);
                                                setSelectedClassAcademicYearId(undefined);
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t('academic.subjects.selectAcademicYear')} />
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
                                    {selectedAcademicYearId && (
                                        <div>
                                            <Label className="mb-2 block">{t('academic.subjects.selectClass')}</Label>
                                            <Select
                                                value={selectedClassAcademicYearId || undefined}
                                                onValueChange={setSelectedClassAcademicYearId}
                                            >
                                                <SelectTrigger className="w-full">
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
                                                            No classes available for this year
                                                        </div>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    {selectedClassAcademicYearId && hasCopyPermission && (
                                        <div className="flex items-end">
                                            <Button variant="outline" onClick={handleOpenCopyDialog} className="w-full">
                                                <Copy className="h-4 w-4 sm:mr-2" />
                                                <span className="hidden sm:inline">{t('academic.subjects.copyBetweenYears')}</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </FilterPanel>

                            {!selectedClassAcademicYearId ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                    <p className="text-base font-medium mb-2">Select Academic Year and Class</p>
                                    <p className="text-sm">Choose an academic year and class instance above to view and manage year-specific subject assignments.</p>
                                </div>
                            ) : classSubjectsLoading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <p className="mt-2 text-muted-foreground">{t('common.loading')}</p>
                                </div>
                            ) : !classSubjects || classSubjects.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-30" />
                                    <p className="text-lg font-medium mb-2">{t('academic.subjects.noSubjectsAssigned')}</p>
                                    <p className="text-sm mb-4">Subjects assigned to the class will appear here. You can customize teacher, room, and hours per academic year.</p>
                                    {hasAssignPermission && (
                                        <Button onClick={handleOpenAssignDialog} variant="outline">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Assign Subject
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto -mx-4 md:mx-0">
                                    <div className="inline-block min-w-full align-middle px-4 md:px-0">
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('academic.subjects.code')}</TableHead>
                                                        <TableHead>{t('academic.subjects.name')}</TableHead>
                                                        <TableHead>{t('academic.subjects.teacher')}</TableHead>
                                                        <TableHead>{t('academic.subjects.room')}</TableHead>
                                                        <TableHead>{t('academic.subjects.weeklyHours')}</TableHead>
                                                        <TableHead className="text-right">{t('events.actions')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {classSubjects.map((cs) => (
                                                        <TableRow key={cs.id}>
                                                            <TableCell className="font-mono">{cs.subject?.code}</TableCell>
                                                            <TableCell className="font-medium">{cs.subject?.name}</TableCell>
                                                            <TableCell>{cs.teacher?.fullName || '-'}</TableCell>
                                                            <TableCell>{cs.room?.roomNumber || '-'}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    {hasUpdatePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleEditClassSubject(cs)}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    {hasDeletePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveClick(cs.id)}
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
                            {selectedSubject ? 'Update subject information' : 'Create a new subject'}
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
                                                <SelectValue placeholder={
                                                    !classIdForStep2
                                                        ? "Select a class first"
                                                        : subjectsLoading 
                                                        ? "Loading subjects..." 
                                                        : !subjects || subjects.length === 0
                                                        ? "No subjects available"
                                                        : classTemplateSubjectIds.length === 0
                                                        ? "No subjects assigned to this class in Step 1"
                                                        : availableSubjects.length === 0 
                                                        ? "All subjects assigned" 
                                                        : t('academic.subjects.selectSubject')
                                                } />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {!classIdForStep2 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        Please select a class first
                                                    </div>
                                                ) : subjectsLoading ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        Loading subjects...
                                                    </div>
                                                ) : !subjects || subjects.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        No subjects available. Please create subjects first.
                                                    </div>
                                                ) : classTemplateSubjectIds.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        No subjects assigned to this class in Step 1. Please assign subjects to the class first.
                                                    </div>
                                                ) : availableSubjects.length === 0 ? (
                                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                                        All subjects are already assigned to this class instance
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
                                <p className="text-xs text-muted-foreground">Loading subjects...</p>
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
                                            <SelectValue placeholder="Leave empty to use class room" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Use Class Room</SelectItem>
                                            {rooms?.map((room) => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.roomNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <p className="text-xs text-muted-foreground">If not specified, the class's room will be used automatically</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('academic.subjects.notes')}</Label>
                            <Textarea
                                id="notes"
                                {...registerAssign('notes')}
                                placeholder="Optional notes"
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
                                    Loading subjects...
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
                                                        Please select a class first
                                                    </div>
                                                );
                                            }
                                            
                                            if (classTemplateSubjectIds.length === 0) {
                                                return (
                                                    <div className="text-center py-4 text-muted-foreground">
                                                        No subjects assigned to this class in Step 1. Please assign subjects to the class first.
                                                    </div>
                                                );
                                            }
                                            
                                            if (availableSubjects.length === 0) {
                                                return (
                                                    <div className="text-center py-4 text-muted-foreground">
                                                        {subjects && subjects.length > 0 
                                                            ? 'All subjects are already assigned to this class instance'
                                                            : 'No active subjects available'}
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
                                            <SelectValue placeholder="Leave empty to use class room" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Use Class Room</SelectItem>
                                            {rooms?.map((room) => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.roomNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            <p className="text-xs text-muted-foreground">If not specified, the class's room will be used automatically</p>
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
                        <DialogTitle>Assign Subject to Class</DialogTitle>
                        <DialogDescription>
                            Assign a subject to the selected class. This will make the subject available in all academic years for this class.
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
                            Assign multiple subjects to the selected class at once. These subjects will be available in all academic years for this class.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitBulkToClass(onSubmitBulkAssignToClass)} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Class *</Label>
                            <Controller
                                name="class_id"
                                control={controlBulkToClass}
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
                            {bulkToClassErrors.class_id && (
                                <p className="text-sm text-destructive">{bulkToClassErrors.class_id.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>{t('academic.subjects.selectSubjects')} *</Label>
                            <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                                {subjects?.filter(s => s.isActive).map((subject) => {
                                    const selectedSubjects = watchBulkToClass('subject_ids') || [];
                                    const isSelected = selectedSubjects.includes(subject.id);
                                    return (
                                        <div key={subject.id} className="flex items-center space-x-2 py-2">
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
                                                className="cursor-pointer flex-1"
                                            >
                                                {subject.code} - {subject.name}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                            {bulkToClassErrors.subject_ids && (
                                <p className="text-sm text-destructive">{bulkToClassErrors.subject_ids.message}</p>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseBulkAssignToClassDialog}>
                                {t('events.cancel')}
                            </Button>
                            <Button type="submit" disabled={bulkAssignSubjectsToClass.isPending}>
                                {t('academic.subjects.assignSubjects')}
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
                            Copy subject assignments from one class to another
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

