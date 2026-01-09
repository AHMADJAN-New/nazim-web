import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';

import { Plus, Pencil, Trash2, Search, Building2 } from 'lucide-react';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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


import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding, type Building } from '@/hooks/useBuildings';
import { useLanguage } from '@/hooks/useLanguage';

import { useForm } from 'react-hook-form';
import { useState, useEffect, useMemo } from 'react';
import * as z from 'zod';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import { showToast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/utils';

const buildingSchema = z.object({
  building_name: z.string().min(1, 'Building name is required').max(100, 'Building name must be 100 characters or less'),
  school_id: z.string().min(1, 'School is required'),
});

// Note: Schema validation messages are hardcoded as they're used before translations are available

type BuildingFormData = z.infer<typeof buildingSchema>;

// Building report row type - dates should be ISO strings for backend formatting
interface BuildingReportRow {
  building_name: string;
  school_name: string;
  organization_name?: string;
  rooms_count?: number;
  created_at: string; // ISO date string - backend will format based on user's calendar preference
}

export function BuildingsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('buildings.create');
  const hasUpdatePermission = useHasPermission('buildings.update');
  const hasDeletePermission = useHasPermission('buildings.delete');

  // State declarations must come before hooks that use them
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Use user's organization
  const { data: schools } = useSchools(profile?.organization_id);
  // Use paginated version of the hook
  const { 
    buildings, 
    isLoading, 
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useBuildings(undefined, profile?.organization_id, true);
  const createBuilding = useCreateBuilding();
  const updateBuilding = useUpdateBuilding();
  const deleteBuilding = useDeleteBuilding();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      school_id: profile?.default_school_id || '',
    },
  });

  const selectedSchoolId = watch('school_id');

  // Get school for export (use selected school or default school)
  const effectiveSchoolId = useMemo(() => {
    return selectedSchoolId || profile?.default_school_id || (schools && schools.length > 0 ? schools[0].id : undefined);
  }, [selectedSchoolId, profile?.default_school_id, schools]);


  // Auto-set school_id when schools load and user has default_school_id
  useEffect(() => {
    if (!selectedBuilding && schools && schools.length > 0) {
      if (profile?.default_school_id) {
        const defaultSchool = schools.find(s => s.id === profile.default_school_id);
        if (defaultSchool) {
          setValue('school_id', profile.default_school_id);
        } else if (schools.length === 1) {
          // If default school not found but only one school exists, use it
          setValue('school_id', schools[0].id);
        }
      } else if (schools.length === 1) {
        // If only one school exists, always set it
        setValue('school_id', schools[0].id);
      }
    }
  }, [profile?.default_school_id, schools, selectedBuilding, setValue]);

  // Schools are already filtered by useSchools hook based on selectedOrganizationId
  const filteredSchools = schools || [];

  // Ensure school_id is set when dialog opens and there's only one school
  useEffect(() => {
    if (isDialogOpen && !selectedBuilding && filteredSchools.length === 1) {
      const currentSchoolId = watch('school_id');
      if (!currentSchoolId || currentSchoolId !== filteredSchools[0].id) {
        setValue('school_id', filteredSchools[0].id, { shouldValidate: true });
      }
    }
  }, [isDialogOpen, selectedBuilding, filteredSchools, watch, setValue]);

  // Client-side filtering for search
  const filteredBuildings = (buildings as unknown as Building[] | undefined)?.filter((building: Building) => {
    if (!searchQuery) return true;
    return building.buildingName?.toLowerCase().includes((searchQuery || '').toLowerCase());
  }) || [];

  // Define columns for DataTable
  const columns: ColumnDef<Building>[] = [
    {
      accessorKey: 'buildingName',
      header: t('settings.buildings.buildingName'),
      cell: ({ row }) => <span className="font-medium">{row.original.buildingName}</span>,
    },
    {
      accessorKey: 'school',
      header: t('settings.buildings.school'),
      cell: ({ row }) => row.original.school?.schoolName || t('settings.buildings.na'),
    },
    {
      accessorKey: 'roomsCount',
      header: t('settings.buildings.rooms'),
      cell: ({ row }) => (
        <>
          <span className="font-medium">{row.original.roomsCount ?? 0}</span>
          <span className="text-muted-foreground text-sm ml-1">
            {row.original.roomsCount === 1 ? t('settings.buildings.room') : t('settings.buildings.rooms')}
          </span>
        </>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('settings.buildings.createdAt'),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('events.actions')}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {hasUpdatePermission && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(row.original.id)}
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
    data: filteredBuildings,
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


  // Transform buildings data for export - pass dates as ISO strings for backend formatting
  const transformBuildingsForExport = (buildingsToTransform: Building[]): BuildingReportRow[] => {
    return buildingsToTransform.map((building: Building) => {
      const buildingSchool = schools?.find((s) => s.id === building.schoolId);

      return {
        building_name: building.buildingName,
        school_name: buildingSchool?.schoolName || t('settings.buildings.unknownSchool'),
        organization_name: buildingSchool?.organization?.name,
        rooms_count: building.roomsCount ?? 0,
        // Pass date as ISO string - backend DateConversionService will format it based on user's calendar preference
        created_at: building.createdAt instanceof Date 
          ? building.createdAt.toISOString().slice(0, 10) 
          : building.createdAt,
      };
    });
  };

  // Build filters summary string
  const buildFiltersSummary = (): string => {
    const parts: string[] = [];

    if (searchQuery) {
      parts.push(`${t('events.search')}: ${searchQuery}`);
    }

    if (selectedSchoolId && schools && schools.length > 1) {
      const school = schools.find((s) => s.id === selectedSchoolId);
      if (school) {
        parts.push(`${t('settings.buildings.school')}: ${school.schoolName}`);
      }
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  };


  const handleOpenDialog = (buildingId?: string) => {
    if (buildingId) {
      const building = (buildings as unknown as Building[] | undefined)?.find((b: Building) => b.id === buildingId);
      if (building) {
        reset({
          building_name: building.buildingName,
          school_id: building.schoolId || '',
        });
        setSelectedBuilding(buildingId);
      }
    } else {
      // For new building, auto-set school from user's profile
      let defaultSchoolId = profile?.default_school_id || '';

      // If no default school but user has organization, get first school
      if (!defaultSchoolId && profile?.organization_id && schools && schools.length > 0) {
        defaultSchoolId = schools[0].id;
      }

      // If still no school_id and only one school exists, use it
      if (!defaultSchoolId && schools && schools.length === 1) {
        defaultSchoolId = schools[0].id;
      }

      reset({
        building_name: '',
        school_id: defaultSchoolId,
      });
      setSelectedBuilding(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedBuilding(null);

    // Reset to user's default school or first available school
    let defaultSchoolId = profile?.default_school_id || '';
    if (!defaultSchoolId && profile?.organization_id && schools && schools.length > 0) {
      defaultSchoolId = schools[0].id;
    }

    reset({
      building_name: '',
      school_id: defaultSchoolId,
    });
  };

  const onSubmit = (data: BuildingFormData) => {
    // Ensure school_id is set - if only one school exists, use it
    let schoolId = data.school_id;
    if (!schoolId && filteredSchools.length === 1) {
      schoolId = filteredSchools[0].id;
    }

    if (!schoolId) {
      showToast.error(t('settings.buildings.schoolRequired'));
      return;
    }

    if (selectedBuilding) {
      updateBuilding.mutate(
        { id: selectedBuilding, buildingName: data.building_name, schoolId: schoolId },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      // Ensure building_name is provided (zod schema validates it, but TypeScript needs explicit assertion)
      createBuilding.mutate({
        buildingName: data.building_name,
        schoolId: schoolId,
      }, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDeleteClick = (buildingId: string) => {
    setSelectedBuilding(buildingId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedBuilding) {
      deleteBuilding.mutate(selectedBuilding, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedBuilding(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">{t('settings.buildings.loadingBuildings')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('settings.buildings.management')}
        description={t('settings.buildings.title')}
        icon={<Building2 className="h-5 w-5" />}
        primaryAction={hasCreatePermission ? {
          label: t('settings.buildings.addBuilding'),
          onClick: () => handleOpenDialog(),
          icon: <Plus className="h-4 w-4" />,
        } : undefined}
        rightSlot={
          <ReportExportButtons
            data={filteredBuildings}
            columns={[
              { key: 'building_name', label: t('settings.buildings.reportBuildingName'), align: 'left' },
              { key: 'school_name', label: t('settings.buildings.reportSchoolName'), align: 'left' },
              { key: 'organization_name', label: t('settings.buildings.reportOrganization'), align: 'left' },
              { key: 'rooms_count', label: t('settings.buildings.reportRoomsCount') || 'Rooms', align: 'left' },
              { key: 'created_at', label: t('settings.buildings.reportCreatedAt'), align: 'left' },
            ]}
            reportKey="buildings"
            title={t('settings.buildings.reportTitle')}
            transformData={transformBuildingsForExport}
            buildFiltersSummary={buildFiltersSummary}
            schoolId={effectiveSchoolId}
            templateType="buildings"
            disabled={isLoading}
            errorNoSchool={t('settings.buildings.exportErrorNoSchool')}
            errorNoData={t('settings.buildings.exportErrorNoBuildings')}
            successPdf={t('settings.buildings.exportSuccessPdf')}
            successExcel={t('settings.buildings.exportSuccessExcel')}
            errorPdf={t('settings.buildings.exportErrorPdf')}
            errorExcel={t('settings.buildings.exportErrorExcel')}
          />
        }
        showDescriptionOnMobile={false}
        mobilePrimaryActionVariant="icon"
      />

      <FilterPanel 
        title={t('events.filters') || 'Search & Filter'}
        defaultOpenDesktop={true}
        defaultOpenMobile={false}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 min-w-0">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t('settings.buildings.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>{t('settings.buildings.management')}</CardTitle>
              <CardDescription className="hidden md:block">{t('settings.buildings.title')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                          ? header.column.columnDef.header({ column: header.column, header, table: table })
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
                      {searchQuery ? t('settings.buildings.noBuildingsFound') : t('settings.buildings.noBuildingsMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.column.columnDef.cell && typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell({ row, column: cell.column, cell, getValue: cell.getValue, renderValue: cell.renderValue, table: table })
                            : cell.column.columnDef.cell}
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
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[500px]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedBuilding ? t('settings.buildings.editBuilding') : t('settings.buildings.addBuilding')}
              </DialogTitle>
              <DialogDescription>
                {selectedBuilding
                  ? t('settings.buildings.update')
                  : t('settings.buildings.create')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 grid-cols-1">
              {filteredSchools.length > 1 ? (
                <div className="grid gap-2">
                  <Label htmlFor="school_id">{t('settings.buildings.school')}</Label>
                  <Select
                    value={selectedSchoolId || ''}
                    onValueChange={(value) => setValue('school_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings.buildings.selectSchool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.schoolName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.school_id && (
                    <p className="text-sm text-destructive">{errors.school_id.message}</p>
                  )}
                </div>
              ) : filteredSchools.length === 1 ? (
                <div className="grid gap-2">
                  <Label htmlFor="school_id">{t('settings.buildings.school')}</Label>
                  <Input
                    id="school_id"
                    value={filteredSchools[0].schoolName}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="school_id">{t('settings.buildings.school')} *</Label>
                  <Select
                    value={selectedSchoolId || ''}
                    onValueChange={(value) => setValue('school_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('settings.buildings.selectSchool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSchools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.schoolName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.school_id && (
                    <p className="text-sm text-destructive">{errors.school_id.message}</p>
                  )}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="building_name">{t('settings.buildings.buildingName')}</Label>
                <Input
                  id="building_name"
                  {...register('building_name')}
                  placeholder={t('settings.buildings.enterBuildingName')}
                />
                {errors.building_name && (
                  <p className="text-sm text-destructive">{errors.building_name.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('events.cancel')}
              </Button>
              <Button type="submit" disabled={createBuilding.isPending || updateBuilding.isPending}>
                {selectedBuilding ? t('settings.buildings.update') : t('settings.buildings.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.buildings.deleteConfirm')}
              {selectedBuilding &&
                buildings?.find((b) => b.id === selectedBuilding) &&
                ` "${(buildings as unknown as Building[] | undefined)?.find((b: Building) => b.id === selectedBuilding)?.buildingName}"`}
              {t('settings.buildings.deleteConfirmRooms') || '. If this building has rooms assigned, the deletion will fail.'}
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
    </div>
  );
}

