import { useState, useMemo } from 'react';
import { useClasses, useClassAcademicYears, useClassHistory, useCreateClass, useUpdateClass, useDeleteClass, useAssignClassToYear, useUpdateClassYearInstance, useRemoveClassFromYear, useCopyClassesBetweenYears, useBulkAssignClassSections } from '@/hooks/useClasses';
import type { Class, ClassAcademicYear } from '@/types/domain/class';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useSchools } from '@/hooks/useSchools';
import { useRooms } from '@/hooks/useRooms';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, GraduationCap, Users, Copy, History, Calendar } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const classSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    code: z.string().min(1, 'Code is required').max(50, 'Code must be 50 characters or less'),
    grade_level: z.number().int().min(0).max(12).nullable().optional(),
    description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
    default_capacity: z.number().int().min(1).max(200).default(30),
    is_active: z.boolean().default(true),
});

const assignClassSchema = z.object({
    class_id: z.string().uuid('Invalid class'),
    academic_year_id: z.string().uuid('Invalid academic year'),
    section_name: z.string().max(50, 'Section name must be 50 characters or less').optional().nullable(),
    room_id: z.string().uuid().optional().nullable(),
    capacity: z.number().int().min(1).max(200).optional().nullable(),
    notes: z.string().max(500, 'Notes must be 500 characters or less').optional().nullable(),
});

const bulkSectionsSchema = z.object({
    class_id: z.string().uuid('Invalid class'),
    academic_year_id: z.string().uuid('Invalid academic year'),
    sections: z.string().min(1, 'Enter at least one section').refine(
        (val) => {
            const sections = val.split(',').map(s => s.trim()).filter(Boolean);
            return sections.length > 0 && sections.every(s => s.length <= 50);
        },
        { message: 'Invalid sections format. Use comma-separated values (e.g., A, B, C, D)' }
    ),
    default_room_id: z.string().uuid().optional().nullable(),
    default_capacity: z.number().int().min(1).max(200).optional().nullable(),
});

const copyClassesSchema = z.object({
    from_academic_year_id: z.string().uuid('Invalid academic year'),
    to_academic_year_id: z.string().uuid('Invalid academic year'),
    class_instance_ids: z.array(z.string().uuid()).min(1, 'Select at least one class'),
    copy_assignments: z.boolean().default(false),
});

type ClassFormData = z.infer<typeof classSchema>;
type AssignClassFormData = z.infer<typeof assignClassSchema>;
type BulkSectionsFormData = z.infer<typeof bulkSectionsSchema>;
type CopyClassesFormData = z.infer<typeof copyClassesSchema>;

export function ClassesManagement() {
    const { t } = useLanguage();
    const { data: profile } = useProfile();
    const hasCreatePermission = useHasPermission('classes.create');
    const hasUpdatePermission = useHasPermission('classes.update');
    const hasDeletePermission = useHasPermission('classes.delete');
    const hasAssignPermission = useHasPermission('classes.assign');
    const hasCopyPermission = useHasPermission('classes.copy');

    const [activeTab, setActiveTab] = useState('base');
    const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [isBulkSectionsDialogOpen, setIsBulkSectionsDialogOpen] = useState(false);
    const [isCopyDialogOpen, setIsCopyDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedClassInstance, setSelectedClassInstance] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string | undefined>();
    const [viewingHistoryFor, setViewingHistoryFor] = useState<string | null>(null);
    const [copyFromYearId, setCopyFromYearId] = useState<string | undefined>();

    const organizationId = profile?.organization_id;
    const { data: schools } = useSchools();
    const { data: academicYears } = useAcademicYears(organizationId);
    const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);
    const { 
      classes, 
      isLoading: classesLoading, 
      pagination: classesPagination,
      page: classesPage,
      pageSize: classesPageSize,
      setPage: setClassesPage,
      setPageSize: setClassesPageSize,
    } = useClasses(organizationId, true);
    const { data: classAcademicYears, isLoading: yearClassesLoading } = useClassAcademicYears(selectedAcademicYearId, organizationId);
    const { data: classHistory } = useClassHistory(viewingHistoryFor || '');
    const { data: copySourceInstances } = useClassAcademicYears(copyFromYearId, organizationId);
    const { data: rooms } = useRooms(undefined, organizationId);

    const createClass = useCreateClass();
    const updateClass = useUpdateClass();
    const deleteClass = useDeleteClass();
    const assignClass = useAssignClassToYear();
    const bulkAssignSections = useBulkAssignClassSections();
    const updateClassInstance = useUpdateClassYearInstance();
    const removeClass = useRemoveClassFromYear();
    const copyClasses = useCopyClassesBetweenYears();

    // Set default academic year to current year
    useMemo(() => {
        if (currentAcademicYear && !selectedAcademicYearId) {
            setSelectedAcademicYearId(currentAcademicYear.id);
        }
    }, [currentAcademicYear, selectedAcademicYearId]);

    const {
        register: registerClass,
        handleSubmit: handleSubmitClass,
        reset: resetClass,
        setValue: setValueClass,
        watch: watchClass,
        formState: { errors: classErrors },
    } = useForm<ClassFormData>({
        resolver: zodResolver(classSchema),
        defaultValues: {
            default_capacity: 30,
            is_active: true,
        },
    });

    const {
        register: registerAssign,
        handleSubmit: handleSubmitAssign,
        reset: resetAssign,
        control: controlAssign,
        watch: watchAssign,
        formState: { errors: assignErrors },
    } = useForm<AssignClassFormData>({
        resolver: zodResolver(assignClassSchema),
    });

    const {
        register: registerBulkSections,
        handleSubmit: handleSubmitBulkSections,
        reset: resetBulkSections,
        control: controlBulkSections,
        watch: watchBulkSections,
        formState: { errors: bulkSectionsErrors },
    } = useForm<BulkSectionsFormData>({
        resolver: zodResolver(bulkSectionsSchema),
    });

    const {
        register: registerCopy,
        handleSubmit: handleSubmitCopy,
        reset: resetCopy,
        control: controlCopy,
        watch: watchCopy,
        formState: { errors: copyErrors },
    } = useForm<CopyClassesFormData>({
        resolver: zodResolver(copyClassesSchema),
        defaultValues: {
            copy_assignments: false,
        },
    });

    // Client-side filtering for search
    const filteredClasses = useMemo(() => {
        if (!classes) return [];
        const query = (searchQuery || '').toLowerCase();
        let filtered = classes.filter((cls) =>
            cls.name?.toLowerCase().includes(query) ||
            cls.code?.toLowerCase().includes(query) ||
            (cls.description && cls.description.toLowerCase().includes(query))
        );

        if (gradeLevelFilter !== 'all') {
            const level = parseInt(gradeLevelFilter);
            filtered = filtered.filter((cls) => cls.grade_level === level);
        }

        return filtered;
    }, [classes, searchQuery, gradeLevelFilter]);

    // Define columns for DataTable (base classes tab)
    const baseClassesColumns: ColumnDef<Class>[] = [
        {
            accessorKey: 'name',
            header: t('academic.classes.name'),
            cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
        },
        {
            accessorKey: 'code',
            header: t('academic.classes.code'),
            cell: ({ row }) => row.original.code,
        },
        {
            accessorKey: 'gradeLevel',
            header: t('academic.classes.gradeLevel'),
            cell: ({ row }) => row.original.gradeLevel !== null ? `Grade ${row.original.gradeLevel}` : '-',
        },
        {
            accessorKey: 'defaultCapacity',
            header: t('academic.classes.defaultCapacity'),
            cell: ({ row }) => row.original.default_capacity,
        },
        {
            accessorKey: 'isActive',
            header: t('academic.classes.isActive'),
            cell: ({ row }) => (
                <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
                    {row.original.isActive ? t('academic.classes.active') : t('academic.classes.inactive')}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-right">{t('students.actions')}</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingHistoryFor(row.original.id)}
                        title={t('academic.classes.viewHistory')}
                    >
                        <History className="h-4 w-4" />
                    </Button>
                    {hasUpdatePermission && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenClassDialog(row.original.id)}
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

    // Use DataTable hook for pagination integration (base classes)
    const { table: baseClassesTable } = useDataTable({
        data: filteredClasses,
        columns: baseClassesColumns,
        pageCount: classesPagination?.last_page,
        paginationMeta: classesPagination ?? null,
        initialState: {
            pagination: {
                pageIndex: classesPage - 1,
                pageSize: classesPageSize,
            },
        },
        onPaginationChange: (newPagination) => {
            setClassesPage(newPagination.pageIndex + 1);
            setClassesPageSize(newPagination.pageSize);
        },
    });

    const handleOpenClassDialog = (classId?: string) => {
        if (classId) {
            const cls = classes?.find((c) => c.id === classId);
            if (cls) {
                resetClass({
                    name: cls.name,
                    code: cls.code,
                    grade_level: cls.gradeLevel,
                    description: cls.description || '',
                    default_capacity: cls.default_capacity,
                    is_active: cls.isActive,
                });
                setSelectedClass(classId);
            }
        } else {
            resetClass({
                name: '',
                code: '',
                grade_level: null,
                description: '',
                default_capacity: 30,
                is_active: true,
            });
            setSelectedClass(null);
        }
        setIsClassDialogOpen(true);
    };

    const handleCloseClassDialog = () => {
        setIsClassDialogOpen(false);
        setSelectedClass(null);
        resetClass({
            name: '',
            code: '',
            grade_level: null,
            description: '',
            default_capacity: 30,
            is_active: true,
        });
    };

    const onSubmitClass = (data: ClassFormData) => {
        if (selectedClass) {
            // Convert form data to domain model
            const updateData: Partial<Class> & { id: string } = {
                id: selectedClass,
                name: data.name,
                code: data.code,
                defaultCapacity: data.default_capacity,
                isActive: data.is_active,
            };
            if (data.grade_level !== undefined) updateData.gradeLevel = data.grade_level;
            if (data.description !== undefined) updateData.description = data.description;
            // All users use their organization_id
            updateData.organizationId = profile?.organization_id || null;
            updateClass.mutate(updateData, {
                onSuccess: () => {
                    handleCloseClassDialog();
                },
            });
        } else {
            // Convert form data to domain model
            createClass.mutate({
                name: data.name,
                code: data.code,
                gradeLevel: data.grade_level,
                description: data.description,
                defaultCapacity: data.default_capacity,
                isActive: data.is_active,
                organizationId: profile?.organization_id || null,
            }, {
                onSuccess: () => {
                    handleCloseClassDialog();
                },
            });
        }
    };

    const handleOpenAssignDialog = (classId?: string) => {
        if (classId) {
            resetAssign({
                class_id: classId,
                academic_year_id: selectedAcademicYearId || '',
                section_name: null,
                room_id: null,
                capacity: null,
                notes: null,
            });
        } else {
            resetAssign({
                class_id: '',
                academic_year_id: selectedAcademicYearId || '',
                section_name: null,
                room_id: null,
                capacity: null,
                notes: null,
            });
        }
        setIsAssignDialogOpen(true);
    };

    const handleOpenBulkSectionsDialog = (classId?: string) => {
        resetBulkSections({
            class_id: classId || '',
            academic_year_id: selectedAcademicYearId || '',
            sections: '',
            default_room_id: null,
            default_capacity: null,
        });
        setIsBulkSectionsDialogOpen(true);
    };

    const handleCloseBulkSectionsDialog = () => {
        setIsBulkSectionsDialogOpen(false);
        resetBulkSections({
            class_id: '',
            academic_year_id: selectedAcademicYearId || '',
            sections: '',
            default_room_id: null,
            default_capacity: null,
        });
    };

    const onSubmitBulkSections = (data: BulkSectionsFormData) => {
        if (data.class_id && data.academic_year_id) {
            // Parse sections from comma-separated string
            const sections = data.sections
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);

            // Convert form data to domain model
            bulkAssignSections.mutate({
                classId: data.class_id,
                academicYearId: data.academic_year_id,
                sections,
                defaultRoomId: data.default_room_id,
                defaultCapacity: data.default_capacity,
            }, {
                onSuccess: () => {
                    handleCloseBulkSectionsDialog();
                },
            });
        }
    };

    const handleCloseAssignDialog = () => {
        setIsAssignDialogOpen(false);
        resetAssign({
            class_id: '',
            academic_year_id: selectedAcademicYearId || '',
            section_name: null,
            room_id: null,
            capacity: null,
            notes: null,
        });
    };

    const onSubmitAssign = (data: AssignClassFormData) => {
        if (data.class_id && data.academic_year_id) {
            // Convert form data to domain model
            assignClass.mutate({
                classId: data.class_id,
                academicYearId: data.academic_year_id,
                sectionName: data.section_name,
                roomId: data.room_id,
                capacity: data.capacity,
                notes: data.notes,
            }, {
                onSuccess: () => {
                    handleCloseAssignDialog();
                },
            });
        }
    };

    const handleOpenCopyDialog = () => {
        resetCopy({
            from_academic_year_id: selectedAcademicYearId || '',
            to_academic_year_id: '',
            class_instance_ids: [],
            copy_assignments: false,
        });
        setCopyFromYearId(selectedAcademicYearId);
        setIsCopyDialogOpen(true);
    };

    const handleCloseCopyDialog = () => {
        setIsCopyDialogOpen(false);
        setCopyFromYearId(undefined);
        resetCopy({
            from_academic_year_id: selectedAcademicYearId || '',
            to_academic_year_id: '',
            class_instance_ids: [],
            copy_assignments: false,
        });
    };

    const onSubmitCopy = (data: CopyClassesFormData) => {
        if (data.from_academic_year_id && data.to_academic_year_id && data.class_instance_ids.length > 0) {
            // Convert form data to domain model
            copyClasses.mutate({
                fromAcademicYearId: data.from_academic_year_id,
                toAcademicYearId: data.to_academic_year_id,
                classInstanceIds: data.class_instance_ids,
                copyAssignments: data.copy_assignments || false,
            }, {
                onSuccess: () => {
                    handleCloseCopyDialog();
                },
            });
        }
    };

    const handleDeleteClick = (classId: string) => {
        setSelectedClass(classId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedClass) {
            deleteClass.mutate(selectedClass, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedClass(null);
                },
            });
        }
    };

    const handleRemoveClick = (instanceId: string) => {
        setSelectedClassInstance(instanceId);
        setIsRemoveDialogOpen(true);
    };

    const handleRemoveConfirm = () => {
        if (selectedClassInstance) {
            removeClass.mutate(selectedClassInstance, {
                onSuccess: () => {
                    setIsRemoveDialogOpen(false);
                    setSelectedClassInstance(null);
                },
            });
        }
    };

    const handleEditInstance = (instance: ClassAcademicYear) => {
        resetAssign({
            class_id: instance.classId,
            academic_year_id: instance.academicYearId,
            section_name: instance.sectionName || null,
            room_id: instance.roomId || null,
            capacity: instance.capacity || null,
            notes: instance.notes || null,
        });
        setSelectedClassInstance(instance.id);
        setIsAssignDialogOpen(true);
    };

    const handleUpdateInstance = (data: AssignClassFormData) => {
        if (selectedClassInstance && data.class_id && data.academic_year_id) {
            const updateData: Partial<ClassAcademicYear> & { id: string } = {
                id: selectedClassInstance,
            };
            if (data.section_name !== undefined) updateData.section_name = data.section_name;
            if (data.room_id !== undefined) updateData.room_id = data.room_id;
            if (data.capacity !== undefined) updateData.capacity = data.capacity;
            if (data.notes !== undefined) updateData.notes = data.notes;
            updateClassInstance.mutate(updateData, {
                onSuccess: () => {
                    handleCloseAssignDialog();
                    setSelectedClassInstance(null);
                },
            });
        }
    };

    if (classesLoading) {
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
                                <GraduationCap className="h-5 w-5" />
                                {t('academic.classes.management')}
                            </CardTitle>
                            <CardDescription>
                                {t('academic.classes.title')}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="base">{t('academic.classes.baseClasses')}</TabsTrigger>
                            <TabsTrigger value="year">{t('academic.classes.yearClasses')}</TabsTrigger>
                            <TabsTrigger value="copy">{t('academic.classes.copyClasses')}</TabsTrigger>
                        </TabsList>

                        {/* Base Classes Tab */}
                        <TabsContent value="base" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={t('academic.classes.searchPlaceholder')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
                                        <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder={t('common.filterByGrade')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('common.all')} {t('academic.classes.gradeLevel')}</SelectItem>
                                            {Array.from({ length: 13 }, (_, i) => (
                                                <SelectItem key={i} value={i.toString()}>
                                                    {t('academic.classes.gradeLevel')} {i}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {hasCreatePermission && (
                                    <Button onClick={() => handleOpenClassDialog()}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        {t('academic.classes.addClass')}
                                    </Button>
                                )}
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        {baseClassesTable.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>
                                                        {header.isPlaceholder
                                                            ? null
                                                            : typeof header.column.columnDef.header === 'function'
                                                            ? header.column.columnDef.header({ column: header.column })
                                                            : header.column.columnDef.header}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {baseClassesTable.getRowModel().rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={baseClassesColumns.length} className="text-center text-muted-foreground">
                                                    {searchQuery
                                                        ? t('academic.classes.noClassesFound')
                                                        : t('academic.classes.noClassesMessage')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            baseClassesTable.getRowModel().rows.map((row) => (
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

                            {/* Pagination for base classes */}
                            <DataTablePagination
                                table={baseClassesTable}
                                paginationMeta={classesPagination ?? null}
                                onPageChange={setClassesPage}
                                onPageSizeChange={setClassesPageSize}
                                showPageSizeSelector={true}
                                showTotalCount={true}
                            />
                        </TabsContent>

                        {/* Academic Year Classes Tab */}
                        <TabsContent value="year" className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Select
                                    value={selectedAcademicYearId || ''}
                                    onValueChange={setSelectedAcademicYearId}
                                >
                                    <SelectTrigger className="w-[300px]">
                                        <SelectValue placeholder={t('academic.classes.selectAcademicYear')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears?.map((year) => (
                                            <SelectItem key={year.id} value={year.id}>
                                                {year.name} {year.is_current && `(${t('academic.academicYears.current')})`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                    {hasAssignPermission && (
                                        <Button
                                            onClick={() => handleOpenAssignDialog()}
                                            disabled={!selectedAcademicYearId}
                                            variant="outline"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {t('academic.classes.assignToYear')}
                                        </Button>
                                    )}
                                    {hasAssignPermission && (
                                        <Button
                                            onClick={() => handleOpenBulkSectionsDialog()}
                                            disabled={!selectedAcademicYearId}
                                        >
                                            <Users className="h-4 w-4 mr-2" />
                                            {t('academic.classes.bulkCreateSections')}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {selectedAcademicYearId ? (
                                yearClassesLoading ? (
                                    <div className="text-center py-8">{t('common.loading')}</div>
                                ) : (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('academic.classes.name')}</TableHead>
                                                    <TableHead>{t('academic.classes.section')}</TableHead>
                                                    <TableHead>{t('academic.classes.room')}</TableHead>
                                                    <TableHead>{t('academic.classes.capacity')}</TableHead>
                                                    <TableHead>{t('academic.classes.studentCount')}</TableHead>
                                                    <TableHead className="text-right">{t('students.actions')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {classAcademicYears && classAcademicYears.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                                                            {t('academic.classes.noClassesMessage')}
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    classAcademicYears?.map((instance) => (
                                                        <TableRow key={instance.id}>
                                                            <TableCell className="font-medium">
                                                                {instance.class?.name || 'Unknown'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {instance.sectionName ? (
                                                                    <Badge variant="outline">{instance.sectionName}</Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-sm">-</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>{instance.room?.roomNumber || '-'}</TableCell>
                                                            <TableCell>{instance.capacity || instance.class?.defaultCapacity || '-'}</TableCell>
                                                            <TableCell>{instance.currentStudentCount}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    {hasUpdatePermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleEditInstance(instance)}
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                    {hasAssignPermission && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleRemoveClick(instance.id)}
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
                                )
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    {t('academic.classes.selectAcademicYear')}
                                </div>
                            )}
                        </TabsContent>

                        {/* Copy Classes Tab */}
                        <TabsContent value="copy" className="space-y-4">
                            <div className="flex items-center justify-between">
                                {hasCopyPermission && (
                                    <Button
                                        onClick={handleOpenCopyDialog}
                                        disabled={!selectedAcademicYearId}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        {t('academic.classes.copyClasses')}
                                    </Button>
                                )}
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('academic.classes.copyBetweenYears')}</CardTitle>
                                    <CardDescription>
                                        Copy classes from one academic year to another
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Select an academic year in the "Classes by Academic Year" tab, then use the copy button to copy classes to another year.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Class History Dialog */}
            {viewingHistoryFor && (
                <Dialog open={!!viewingHistoryFor} onOpenChange={() => setViewingHistoryFor(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{t('academic.classes.history')}</DialogTitle>
                            <DialogDescription>
                                {t('academic.classes.viewHistory')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('academic.academicYears.name')}</TableHead>
                                        <TableHead>{t('academic.classes.section')}</TableHead>
                                        <TableHead>{t('academic.classes.teacher')}</TableHead>
                                        <TableHead>{t('academic.classes.room')}</TableHead>
                                        <TableHead>{t('academic.classes.studentCount')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classHistory && classHistory.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                No history found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        classHistory?.map((instance) => (
                                            <TableRow key={instance.id}>
                                                <TableCell>{instance.academic_year?.name || '-'}</TableCell>
                                                <TableCell>
                                                    {instance.sectionName ? (
                                                        <Badge variant="outline">{instance.sectionName}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{instance.teacher?.fullName || '-'}</TableCell>
                                                <TableCell>{instance.room?.roomNumber || '-'}</TableCell>
                                                <TableCell>{instance.currentStudentCount}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Create/Edit Class Dialog */}
            <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmitClass(onSubmitClass)}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedClass ? t('academic.classes.editClass') : t('academic.classes.addClass')}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedClass ? 'Update class information' : 'Create a new class definition'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('academic.classes.name')} *
                                </Label>
                                <Input
                                    id="name"
                                    {...registerClass('name')}
                                    placeholder={t('academic.classes.name')}
                                />
                                {classErrors.name && (
                                    <p className="text-sm text-destructive">{classErrors.name.message}</p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">
                                        {t('academic.classes.code')} *
                                    </Label>
                                    <Input
                                        id="code"
                                        {...registerClass('code')}
                                        placeholder={t('academic.classes.code')}
                                    />
                                    {classErrors.code && (
                                        <p className="text-sm text-destructive">{classErrors.code.message}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="grade_level">
                                        {t('academic.classes.gradeLevel')}
                                    </Label>
                                    <Input
                                        id="grade_level"
                                        type="number"
                                        min="0"
                                        max="12"
                                        {...registerClass('grade_level', { valueAsNumber: true })}
                                        placeholder={t('common.gradeExample')}
                                    />
                                    {classErrors.grade_level && (
                                        <p className="text-sm text-destructive">{classErrors.grade_level.message}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="description">
                                    {t('academic.classes.description')}
                                </Label>
                                <Textarea
                                    id="description"
                                    {...registerClass('description')}
                                    placeholder={t('academic.classes.description')}
                                    rows={3}
                                />
                                {classErrors.description && (
                                    <p className="text-sm text-destructive">{classErrors.description.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="default_capacity">
                                    {t('academic.classes.defaultCapacity')}
                                </Label>
                                <Input
                                    id="default_capacity"
                                    type="number"
                                    min="1"
                                    max="200"
                                    {...registerClass('default_capacity', { valueAsNumber: true })}
                                />
                                {classErrors.default_capacity && (
                                    <p className="text-sm text-destructive">{classErrors.default_capacity.message}</p>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={watchClass('is_active')}
                                    onCheckedChange={(checked) => setValueClass('is_active', checked)}
                                />
                                <Label htmlFor="is_active" className="cursor-pointer">
                                    {t('academic.classes.isActive')}
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseClassDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">
                                {t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Assign Class to Year Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmitAssign(selectedClassInstance ? (data) => {
                        if (data.class_id && data.academic_year_id) {
                            handleUpdateInstance(data as AssignClassFormData & { class_id: string; academic_year_id: string });
                        }
                    } : onSubmitAssign)}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedClassInstance ? t('academic.classes.editClass') : t('academic.classes.assignToYear')}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedClassInstance ? 'Update class instance' : 'Assign a class to an academic year'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="class_id">
                                    {t('academic.classes.selectClass')} *
                                </Label>
                                <Controller
                                    name="class_id"
                                    control={controlAssign}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={!!selectedClassInstance}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectClass')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes?.filter(c => c.isActive).map((cls) => (
                                                    <SelectItem key={cls.id} value={cls.id}>
                                                        {cls.name} ({cls.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {assignErrors.class_id && (
                                    <p className="text-sm text-destructive">{assignErrors.class_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="academic_year_id">
                                    {t('academic.classes.selectAcademicYear')} *
                                </Label>
                                <Controller
                                    name="academic_year_id"
                                    control={controlAssign}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectAcademicYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {assignErrors.academic_year_id && (
                                    <p className="text-sm text-destructive">{assignErrors.academic_year_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="section_name">
                                    {t('academic.classes.sectionName')}
                                </Label>
                                <Input
                                    id="section_name"
                                    {...registerAssign('section_name')}
                                    placeholder={t('common.sectionExample')}
                                />
                                {assignErrors.section_name && (
                                    <p className="text-sm text-destructive">{assignErrors.section_name.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="room_id">
                                    {t('academic.classes.selectRoom')}
                                </Label>
                                <Controller
                                    name="room_id"
                                    control={controlAssign}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || 'none'}
                                            onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectRoom')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('common.none')}</SelectItem>
                                                {rooms?.map((room) => (
                                                    <SelectItem key={room.id} value={room.id}>
                                                        {room.roomNumber} {room.building && `(${room.building.buildingName})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="capacity">
                                    {t('academic.classes.capacity')}
                                </Label>
                                <Input
                                    id="capacity"
                                    type="number"
                                    min="1"
                                    max="200"
                                    {...registerAssign('capacity', { valueAsNumber: true })}
                                    placeholder={t('common.overrideCapacity')}
                                />
                                {assignErrors.capacity && (
                                    <p className="text-sm text-destructive">{assignErrors.capacity.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="notes">
                                    {t('academic.classes.notes')}
                                </Label>
                                <Textarea
                                    id="notes"
                                    {...registerAssign('notes')}
                                    placeholder={t('academic.classes.notes')}
                                    rows={3}
                                />
                                {assignErrors.notes && (
                                    <p className="text-sm text-destructive">{assignErrors.notes.message}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseAssignDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit">
                                {t('common.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Bulk Create Sections Dialog */}
            <Dialog open={isBulkSectionsDialogOpen} onOpenChange={setIsBulkSectionsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <form onSubmit={handleSubmitBulkSections(onSubmitBulkSections)}>
                        <DialogHeader>
                            <DialogTitle>{t('academic.classes.bulkCreateSections')}</DialogTitle>
                            <DialogDescription>
                                Create multiple sections for a class in one go (e.g., A, B, C, D)
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="bulk_class_id">
                                    {t('academic.classes.selectClass')} *
                                </Label>
                                <Controller
                                    name="class_id"
                                    control={controlBulkSections}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectClass')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {classes?.filter(c => c.isActive).map((cls) => (
                                                    <SelectItem key={cls.id} value={cls.id}>
                                                        {cls.name} ({cls.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {bulkSectionsErrors.class_id && (
                                    <p className="text-sm text-destructive">{bulkSectionsErrors.class_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bulk_academic_year_id">
                                    {t('academic.classes.selectAcademicYear')} *
                                </Label>
                                <Controller
                                    name="academic_year_id"
                                    control={controlBulkSections}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectAcademicYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {bulkSectionsErrors.academic_year_id && (
                                    <p className="text-sm text-destructive">{bulkSectionsErrors.academic_year_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bulk_sections">
                                    {t('academic.classes.sectionsInput')} * ({t('common.example')}: A, B, C, D)
                                </Label>
                                <Input
                                    id="bulk_sections"
                                    {...registerBulkSections('sections')}
                                    placeholder={`${t('common.example')}: A, B, C, D`}
                                />
                                {bulkSectionsErrors.sections && (
                                    <p className="text-sm text-destructive">{bulkSectionsErrors.sections.message}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    {t('common.sectionsInputHint')}
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bulk_default_room_id">
                                    {t('academic.classes.defaultRoom')} (Optional)
                                </Label>
                                <Controller
                                    name="default_room_id"
                                    control={controlBulkSections}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || 'none'}
                                            onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.selectRoom')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">{t('common.none')}</SelectItem>
                                                {rooms?.map((room) => (
                                                    <SelectItem key={room.id} value={room.id}>
                                                        {room.roomNumber} {room.building && `(${room.building.buildingName})`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bulk_default_capacity">
                                    {t('academic.classes.defaultCapacity')} (Optional)
                                </Label>
                                <Input
                                    id="bulk_default_capacity"
                                    type="number"
                                    min="1"
                                    max="200"
                                    {...registerBulkSections('default_capacity', { valueAsNumber: true })}
                                    placeholder={t('common.overrideCapacityAll')}
                                />
                                {bulkSectionsErrors.default_capacity && (
                                    <p className="text-sm text-destructive">{bulkSectionsErrors.default_capacity.message}</p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseBulkSectionsDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={bulkAssignSections.isPending}>
                                {t('academic.classes.createSections')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Copy Classes Dialog */}
            <Dialog open={isCopyDialogOpen} onOpenChange={setIsCopyDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <form onSubmit={handleSubmitCopy(onSubmitCopy)}>
                        <DialogHeader>
                            <DialogTitle>{t('academic.classes.copyClasses')}</DialogTitle>
                            <DialogDescription>
                                Copy classes from one academic year to another
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="from_academic_year_id">
                                    {t('academic.classes.fromYear')} *
                                </Label>
                                <Controller
                                    name="from_academic_year_id"
                                    control={controlCopy}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                setCopyFromYearId(value);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.fromYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {copyErrors.from_academic_year_id && (
                                    <p className="text-sm text-destructive">{copyErrors.from_academic_year_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="to_academic_year_id">
                                    {t('academic.classes.toYear')} *
                                </Label>
                                <Controller
                                    name="to_academic_year_id"
                                    control={controlCopy}
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('academic.classes.toYear')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicYears?.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        {year.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {copyErrors.to_academic_year_id && (
                                    <p className="text-sm text-destructive">{copyErrors.to_academic_year_id.message}</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>{t('academic.classes.selectClasses')} *</Label>
                                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto">
                                    {copySourceInstances && copySourceInstances.length > 0 ? (
                                        <div className="space-y-2">
                                            <Controller
                                                name="class_instance_ids"
                                                control={controlCopy}
                                                render={({ field }) => (
                                                    <>
                                                        {copySourceInstances.map((instance) => (
                                                            <div key={instance.id} className="flex items-center space-x-2">
                                                                <Checkbox
                                                                    id={`class-${instance.id}`}
                                                                    checked={field.value.includes(instance.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        const current = field.value || [];
                                                                        if (checked) {
                                                                            field.onChange([...current, instance.id]);
                                                                        } else {
                                                                            field.onChange(current.filter(id => id !== instance.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <Label
                                                                    htmlFor={`class-${instance.id}`}
                                                                    className="cursor-pointer flex-1"
                                                                >
                                                                    {instance.class?.name || 'Unknown'}
                                                                    {instance.section_name && ` - ${instance.section_name}`}
                                                                </Label>
                                                            </div>
                                                        ))}
                                                    </>
                                                )}
                                            />
                                        </div>
                                    ) : watchCopy('from_academic_year_id') ? (
                                        <p className="text-sm text-muted-foreground">No classes found in selected year</p>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">Select a source academic year first</p>
                                    )}
                                </div>
                                {copyErrors.class_instance_ids && (
                                    <p className="text-sm text-destructive">{copyErrors.class_instance_ids.message}</p>
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
                                    {t('academic.classes.copyAssignments')}
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseCopyDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button type="submit" disabled={copyClasses.isPending}>
                                {t('academic.classes.copyClasses')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Class Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('academic.classes.deleteConfirm')}
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

            {/* Remove Class Instance Confirmation Dialog */}
            <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('academic.classes.removeConfirm')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveConfirm}
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

