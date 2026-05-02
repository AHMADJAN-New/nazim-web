import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAttendanceRoundNames, useCreateAttendanceRoundName, useDeleteAttendanceRoundName, useUpdateAttendanceRoundName } from '@/hooks/useAttendanceRoundNames';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  orderIndex: z.coerce.number().int().min(1).max(99),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

export function AttendanceRoundNamesManagement() {
  const { t } = useLanguage();
  const canCreate = useHasPermission('attendance_sessions.create');
  const canUpdate = useHasPermission('attendance_sessions.update');
  const canDelete = useHasPermission('attendance_sessions.delete');

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: rounds = [], isLoading } = useAttendanceRoundNames(false);
  const createRound = useCreateAttendanceRoundName();
  const updateRound = useUpdateAttendanceRoundName();
  const deleteRound = useDeleteAttendanceRoundName();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', orderIndex: 1, isActive: true },
  });

  const isActive = watch('isActive');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rounds;
    return rounds.filter((r) => r.name.toLowerCase().includes(q) || String(r.order_index).includes(q));
  }, [rounds, search]);

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', orderIndex: 1, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (id: string) => {
    const round = rounds.find((r) => r.id === id);
    if (!round) return;
    setEditingId(id);
    reset({ name: round.name, orderIndex: round.order_index, isActive: round.is_active });
    setDialogOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editingId) {
      updateRound.mutate(
        { id: editingId, name: data.name, order_index: data.orderIndex, is_active: data.isActive },
        { onSuccess: () => setDialogOpen(false) }
      );
      return;
    }
    createRound.mutate(
      { name: data.name, order_index: data.orderIndex, is_active: data.isActive },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 hidden sm:inline-flex" />
                {t('attendanceRoundNames.title')}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('attendanceRoundNames.subtitle')}
              </CardDescription>
            </div>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('attendanceRoundNames.add')}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('attendanceRoundNames.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('attendanceRoundNames.name')}</TableHead>
                  <TableHead>{t('attendanceRoundNames.order')}</TableHead>
                  <TableHead>{t('attendanceRoundNames.active')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">{t('attendanceRoundNames.empty')}</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((round) => (
                    <TableRow key={round.id}>
                      <TableCell className="font-medium">{round.name}</TableCell>
                      <TableCell>{round.order_index}</TableCell>
                      <TableCell>
                        <Badge variant={round.is_active ? 'default' : 'secondary'}>
                          {round.is_active ? t('events.active') : t('events.inactive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(round.id)} aria-label={t('common.edit')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteId(round.id)} aria-label={t('events.delete')}>
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{editingId ? t('attendanceRoundNames.edit') : t('attendanceRoundNames.add')}</DialogTitle>
              <DialogDescription>{t('attendanceRoundNames.dialogDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('attendanceRoundNames.name')}</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderIndex">{t('attendanceRoundNames.order')}</Label>
                <Input id="orderIndex" type="number" min={1} max={99} {...register('orderIndex')} />
                {errors.orderIndex && <p className="text-sm text-destructive">{errors.orderIndex.message}</p>}
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="isActive">{t('attendanceRoundNames.active')}</Label>
                <Switch id="isActive" checked={isActive} onCheckedChange={(checked) => setValue('isActive', checked)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createRound.isPending || updateRound.isPending}>
                {editingId ? t('common.update') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('attendanceRoundNames.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('attendanceRoundNames.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteId) return;
                deleteRound.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
              }}
            >
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

