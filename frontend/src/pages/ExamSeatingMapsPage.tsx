import {
  ArrowLeft,
  Copy,
  Grid3X3,
  LayoutGrid,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { FilterPanel } from '@/components/layout/FilterPanel';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useCreateExamSeatingMap,
  useDeleteExamSeatingMap,
  useDuplicateExamSeatingMap,
  useExamSeatingMaps,
} from '@/hooks/useExamSeating';
import { useExam, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useRooms } from '@/hooks/useRooms';
import type { ExamSeatingMap } from '@/types/domain/examSeating';

const STATUS_VARIANTS: Record<ExamSeatingMap['status'], 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  generated: 'default',
  applied: 'default',
  finalized: 'outline',
};

export function ExamSeatingMapsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);
  const examId = examIdFromParams || selectedExamId || undefined;

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamSeatingMap | null>(null);
  const [formName, setFormName] = useState('');
  const [formRows, setFormRows] = useState('10');
  const [formColumns, setFormColumns] = useState('8');
  const [formStartSeat, setFormStartSeat] = useState('1');
  const [formRoomId, setFormRoomId] = useState<string>('none');

  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: maps = [], isLoading: mapsLoading, refetch } = useExamSeatingMaps(examId);
  const { data: rooms = [] } = useRooms(profile?.default_school_id, organizationId);

  const createMutation = useCreateExamSeatingMap();
  const deleteMutation = useDeleteExamSeatingMap();
  const duplicateMutation = useDuplicateExamSeatingMap();

  const hasReadPermission = useHasPermission('exam_seating_maps.read');
  const hasCreatePermission = useHasPermission('exam_seating_maps.create');
  const hasDeletePermission = useHasPermission('exam_seating_maps.delete');
  const hasUpdatePermission = useHasPermission('exam_seating_maps.update');

  useEffect(() => {
    if (examIdFromParams) {
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  const resetCreateForm = () => {
    setFormName('');
    setFormRows('10');
    setFormColumns('8');
    setFormStartSeat('1');
    setFormRoomId('none');
  };

  const handleCreate = async () => {
    if (!examId || !formName.trim()) return;
    const created = await createMutation.mutateAsync({
      examId,
      data: {
        name: formName.trim(),
        rows: Number(formRows),
        columns: Number(formColumns),
        startSeatNumber: Number(formStartSeat) || 1,
        roomId: formRoomId === 'none' ? null : formRoomId,
      },
    });
    setShowCreateDialog(false);
    resetCreateForm();
    navigate(`/exams/${examId}/seating-maps/${created.id}`);
  };

  const handleDelete = async () => {
    if (!examId || !deleteTarget) return;
    await deleteMutation.mutateAsync({ examId, mapId: deleteTarget.id });
    setDeleteTarget(null);
  };

  const handleDuplicate = async (map: ExamSeatingMap) => {
    if (!examId) return;
    const duplicated = await duplicateMutation.mutateAsync({ examId, mapId: map.id });
    navigate(`/exams/${examId}/seating-maps/${duplicated.id}`);
  };

  const isLoading = examsLoading || examLoading || mapsLoading;

  const breadcrumbs = useMemo(() => {
    const items = [
      { label: t('exams.title') || 'Exams', href: '/exams' },
      { label: t('exams.seatingMaps.title') || 'Seating Maps' },
    ];
    if (exam?.name) {
      items.splice(1, 0, { label: exam.name });
    }
    return items;
  }, [exam?.name, t]);

  if (!hasReadPermission) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {t('common.noPermission') || 'You do not have permission to view this page.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('exams.seatingMaps.title') || 'Exam Seating Maps'}
        description={t('exams.seatingMaps.description') || 'Create and manage seating maps for exam halls'}
        icon={<LayoutGrid className="h-5 w-5" />}
        breadcrumbs={breadcrumbs}
        primaryAction={
          hasCreatePermission && examId
            ? {
                label: t('exams.seatingMaps.createMap') || 'Create Map',
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setShowCreateDialog(true),
              }
            : undefined
        }
        secondaryActions={[
          {
            label: t('common.refresh') || 'Refresh',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: () => void refetch(),
            variant: 'outline',
          },
        ]}
      />

      {!examIdFromParams && (
        <FilterPanel title={t('exams.selectExam') || 'Select Exam'}>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('exams.exam') || 'Exam'}</Label>
              <Select value={examId || ''} onValueChange={setSelectedExamId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(allExams ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </FilterPanel>
      )}

      {examIdFromParams && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 w-fit"
          onClick={() => navigate('/exams/seating-maps')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">{t('common.back') || 'Back'}</span>
        </Button>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !examId ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('exams.noExamsAvailable') || 'No exams available'}
            </div>
          ) : maps.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('exams.seatingMaps.noMaps') || 'No seating maps yet. Create your first map to get started.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('exams.seatingMaps.mapName') || 'Map Name'}</TableHead>
                    <TableHead>{t('exams.room') || 'Room'}</TableHead>
                    <TableHead>{t('exams.seatingMaps.dimensions') || 'Dimensions'}</TableHead>
                    <TableHead>{t('exams.seatingMaps.startSeat') || 'Start Seat'}</TableHead>
                    <TableHead>{t('common.status') || 'Status'}</TableHead>
                    <TableHead>{t('exams.seatingMaps.solverStatus') || 'Solver'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maps.map((map) => (
                    <TableRow key={map.id}>
                      <TableCell className="font-medium">{map.name}</TableCell>
                      <TableCell>{map.room?.name || '—'}</TableCell>
                      <TableCell>
                        {map.rows} × {map.columns}
                      </TableCell>
                      <TableCell>{map.startSeatNumber}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[map.status]}>
                          {t(`exams.seatingMaps.status.${map.status}`) || map.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`exams.seatingMaps.solver.${map.solverStatus}`) || map.solverStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-shrink-0"
                            aria-label={t('exams.seatingMaps.openEditor') || 'Open editor'}
                            onClick={() => navigate(`/exams/${examId}/seating-maps/${map.id}`)}
                          >
                            <Grid3X3 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-2">
                              {t('exams.seatingMaps.openEditor') || 'Open'}
                            </span>
                          </Button>
                          {hasUpdatePermission && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                              aria-label={t('exams.seatingMaps.duplicate') || 'Duplicate'}
                              onClick={() => void handleDuplicate(map)}
                              disabled={duplicateMutation.isPending}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">
                                {t('exams.seatingMaps.duplicate') || 'Duplicate'}
                              </span>
                            </Button>
                          )}
                          {hasDeletePermission && map.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0 text-destructive"
                              aria-label={t('common.delete') || 'Delete'}
                              onClick={() => setDeleteTarget(map)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">{t('common.delete') || 'Delete'}</span>
                            </Button>
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

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('exams.seatingMaps.createMap') || 'Create Seating Map'}</DialogTitle>
            <DialogDescription>
              {t('exams.seatingMaps.createDescription') || 'Define the hall layout for this exam.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="map-name">{t('exams.seatingMaps.mapName') || 'Map Name'}</Label>
              <Input
                id="map-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('exams.seatingMaps.mapNamePlaceholder') || 'Hall A'}
              />
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="map-rows">{t('exams.seatingMaps.rows') || 'Rows'}</Label>
                <Input
                  id="map-rows"
                  type="number"
                  min={1}
                  value={formRows}
                  onChange={(e) => setFormRows(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="map-columns">{t('exams.seatingMaps.columns') || 'Columns'}</Label>
                <Input
                  id="map-columns"
                  type="number"
                  min={1}
                  value={formColumns}
                  onChange={(e) => setFormColumns(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="map-start-seat">{t('exams.seatingMaps.startSeat') || 'Start Seat Number'}</Label>
                <Input
                  id="map-start-seat"
                  type="number"
                  min={1}
                  value={formStartSeat}
                  onChange={(e) => setFormStartSeat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('exams.room') || 'Room'}</Label>
                <Select value={formRoomId} onValueChange={setFormRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('exams.seatingMaps.selectRoom') || 'Select room'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none') || 'None'}</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!formName.trim() || createMutation.isPending}
            >
              {t('common.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exams.seatingMaps.deleteTitle') || 'Delete seating map?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.seatingMaps.deleteDescription') || 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExamSeatingMapsPage;
