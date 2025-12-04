import { useState, useEffect, useMemo } from 'react';
import { useBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding, type Building } from '@/hooks/useBuildings';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useSchools, useSchool } from '@/hooks/useSchools';
import { useReportTemplates } from '@/hooks/useReportTemplates';
import { exportReport, type ReportDefinition } from '@/lib/reporting';
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
import { Plus, Pencil, Trash2, Search, Building2, FileDown, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const buildingSchema = z.object({
  building_name: z.string().min(1, 'Building name is required').max(100, 'Building name must be 100 characters or less'),
  school_id: z.string().min(1, 'School is required'),
});

type BuildingFormData = z.infer<typeof buildingSchema>;

// Building report row type with resolved names
interface BuildingReportRow {
  building_name: string;
  school_name: string;
  organization_name?: string;
  created_at: string;
}

// Building report definition
const buildingReportDefinition: ReportDefinition<BuildingReportRow> = {
  id: 'buildings',
  title: 'Buildings Report',
  fileName: 'buildings_report',
  pageSize: 'A4',
  orientation: 'portrait',
  columns: [
    {
      key: 'building_name',
      label: 'Building Name',
      width: 30,
      pdfWidth: '*',
      align: 'left',
    },
    {
      key: 'school_name',
      label: 'School Name',
      width: 25,
      pdfWidth: '*',
      align: 'left',
    },
    {
      key: 'organization_name',
      label: 'Organization',
      width: 25,
      pdfWidth: '*',
      align: 'left',
    },
    {
      key: 'created_at',
      label: 'Created At',
      width: 20,
      pdfWidth: 'auto',
      align: 'left',
    },
  ],
  tableStyle: {
    headerFillColor: '#00004d',
    headerTextColor: '#ffffff',
    alternateRowColor: '#f9fafb',
    useAlternateRowColors: true,
  },
};

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
  const { data: buildings, isLoading } = useBuildings();
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

  const { data: school } = useSchool(effectiveSchoolId || '');
  const { data: templates } = useReportTemplates(effectiveSchoolId);

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

  const filteredBuildings = buildings?.filter((building) =>
    building.buildingName?.toLowerCase().includes((searchQuery || '').toLowerCase())
  ) || [];

  // Find default template for buildings
  const defaultTemplate = useMemo(() => {
    if (!templates) return null;
    return templates.find(
      (t) => t.is_default && t.template_type === 'buildings' && t.is_active
    ) || templates.find((t) => t.template_type === 'buildings' && t.is_active) || null;
  }, [templates]);

  // Transform buildings data for export
  const transformBuildingsForExport = (buildingsToTransform: Building[]): BuildingReportRow[] => {
    return buildingsToTransform.map((building) => {
      const buildingSchool = schools?.find((s) => s.id === building.schoolId);

      return {
        building_name: building.buildingName,
        school_name: buildingSchool?.schoolName || 'Unknown School',
        created_at: building.createdAt.toLocaleDateString(),
      };
    });
  };

  // Build filters summary string
  const buildFiltersSummary = (): string => {
    const parts: string[] = [];

    if (searchQuery) {
      parts.push(`Search: ${searchQuery}`);
    }

    if (selectedSchoolId && schools && schools.length > 1) {
      const school = schools.find((s) => s.id === selectedSchoolId);
      if (school) {
        parts.push(`School: ${school.schoolName}`);
      }
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  };

  // Export handlers
  const handleExportPdf = async () => {
    if (!school) {
      toast.error('Please configure school branding first to export reports.');
      return;
    }

    if (!filteredBuildings || filteredBuildings.length === 0) {
      toast.error('No buildings to export.');
      return;
    }

    try {
      const reportData = transformBuildingsForExport(filteredBuildings);
      const filtersSummary = buildFiltersSummary();

      await exportReport({
        format: 'pdf',
        definition: buildingReportDefinition,
        rows: reportData,
        school,
        template: defaultTemplate,
        filtersSummary,
      });

      toast.success('PDF export started');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    if (!school) {
      toast.error('Please configure school branding first to export reports.');
      return;
    }

    if (!filteredBuildings || filteredBuildings.length === 0) {
      toast.error('No buildings to export.');
      return;
    }

    try {
      const reportData = transformBuildingsForExport(filteredBuildings);
      const filtersSummary = buildFiltersSummary();

      await exportReport({
        format: 'excel',
        definition: buildingReportDefinition,
        rows: reportData,
        school,
        template: defaultTemplate,
        filtersSummary,
      });

      toast.success('Excel export started');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export Excel');
    }
  };

  const handleOpenDialog = (buildingId?: string) => {
    if (buildingId) {
      const building = buildings?.find((b) => b.id === buildingId);
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
      toast.error('Please select a school');
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
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading buildings...</div>
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
                <Building2 className="h-5 w-5" />
                Buildings Management
              </CardTitle>
              <CardDescription>Manage building names and information</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={!filteredBuildings || filteredBuildings.length === 0 || !school}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                disabled={!filteredBuildings || filteredBuildings.length === 0 || !school}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              {hasCreatePermission && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Building
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Building Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Rooms</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBuildings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      {searchQuery ? 'No buildings found matching your search' : 'No buildings found. Add your first building.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBuildings.map((building) => {
                    return (
                      <TableRow key={building.id}>
                        <TableCell className="font-medium">{building.buildingName}</TableCell>
                        <TableCell>
                          {building.school?.schoolName || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{building.roomsCount ?? 0}</span>
                          <span className="text-muted-foreground text-sm ml-1">
                            {building.roomsCount === 1 ? 'room' : 'rooms'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {building.createdAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {hasUpdatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(building.id)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(building.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedBuilding ? 'Edit Building' : 'Add New Building'}
              </DialogTitle>
              <DialogDescription>
                {selectedBuilding
                  ? 'Update the building information below.'
                  : 'Enter the building name to add a new building.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {filteredSchools.length > 1 ? (
                <div className="grid gap-2">
                  <Label htmlFor="school_id">School</Label>
                  <Select
                    value={selectedSchoolId || ''}
                    onValueChange={(value) => setValue('school_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
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
                  <Label htmlFor="school_id">School</Label>
                  <Input
                    id="school_id"
                    value={filteredSchools[0].schoolName}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="school_id">School *</Label>
                  <Select
                    value={selectedSchoolId || ''}
                    onValueChange={(value) => setValue('school_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
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
                <Label htmlFor="building_name">Building Name</Label>
                <Input
                  id="building_name"
                  {...register('building_name')}
                  placeholder="Enter building name"
                />
                {errors.building_name && (
                  <p className="text-sm text-destructive">{errors.building_name.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBuilding.isPending || updateBuilding.isPending}>
                {selectedBuilding ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the building
              {selectedBuilding &&
                buildings?.find((b) => b.id === selectedBuilding) &&
                ` "${buildings.find((b) => b.id === selectedBuilding)?.buildingName}"`}
              . If this building has rooms assigned, the deletion will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

