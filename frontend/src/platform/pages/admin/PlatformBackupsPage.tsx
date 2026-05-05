/**
 * Platform Backups Page
 * Create, list, filter, download, and delete backups
 */

import {
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BACKUP_TYPE_PREFIX = {
  database: 'nazim_backup_db_',
  all: 'nazim_backup_',
} as const;
const BACKUP_TYPE_FILTER_ALL = 'all_types';

function inferBackupType(filename: string): 'database' | 'all' {
  return filename.startsWith(BACKUP_TYPE_PREFIX.database) ? 'database' : 'all';
}

export default function PlatformBackupsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const [backupTypeFilter, setBackupTypeFilter] = useState<string>(BACKUP_TYPE_FILTER_ALL);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [createBackupType, setCreateBackupType] = useState<'database' | 'all'>('all');
  const [deletingBackupFilename, setDeletingBackupFilename] = useState<string | null>(null);

  const { data: backups = [], isLoading: isBackupsLoading, error: backupsError } = useQuery({
    queryKey: ['platform-backups'],
    queryFn: async () => platformApi.backups.list(),
    enabled: hasAdminPermission && !permissionsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredBackups = useMemo(() => {
    return backups.filter((b) => {
      const type = inferBackupType(b.filename);
      if (backupTypeFilter === 'database' && type !== 'database') return false;
      if (backupTypeFilter === 'all' && type !== 'all') return false;
      const created = new Date(b.created_at);
      if (dateFrom && created < dateFrom) return false;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (created > endOfDay) return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q && !b.filename.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [backups, backupTypeFilter, dateFrom, dateTo, searchQuery]);

  const createBackup = useMutation({
    mutationFn: async (type: 'database' | 'all') => platformApi.backups.create(type),
    onSuccess: () => {
      showToast.success('Backup created successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to create backup');
    },
  });

  const deleteBackup = useMutation({
    mutationFn: async (filename: string) => platformApi.backups.delete(filename),
    onSuccess: () => {
      showToast.success('Backup deleted');
      setDeletingBackupFilename(null);
      void queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to delete backup');
    },
  });

  const handleDownloadBackup = async (filename: string) => {
    try {
      showToast.info('Preparing secure download link...');
      await platformApi.backups.download(filename);
      showToast.success('Backup download is starting now');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Backups"
        description="Create and manage database and storage backups"
        icon={<Database className="h-5 w-5" />}
      />

      <div className="space-y-6">
        <FilterPanel
          title="Filters"
          defaultOpenDesktop={true}
          defaultOpenMobile={false}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Backup Type</Label>
              <Select value={backupTypeFilter} onValueChange={setBackupTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BACKUP_TYPE_FILTER_ALL}>All types</SelectItem>
                  <SelectItem value="database">{t('platform.backupType.databaseOnly')}</SelectItem>
                  <SelectItem value="all">{t('platform.backupType.databaseAndFiles')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <CalendarDatePicker
                date={dateFrom}
                onDateChange={setDateFrom}
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <CalendarDatePicker
                date={dateTo}
                onDateChange={setDateTo}
                placeholder="Any"
              />
            </div>
            <div className="space-y-2">
              <Label>Search filename</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </FilterPanel>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Backup List</CardTitle>
                <CardDescription>
                  {filteredBackups.length} backup{filteredBackups.length !== 1 ? 's' : ''} shown
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="space-y-2">
                  <Label htmlFor="create-backup-type" className="text-xs text-muted-foreground">
                    {t('platform.backupType.label')}
                  </Label>
                  <Select
                    value={createBackupType}
                    onValueChange={(v: 'database' | 'all') => setCreateBackupType(v)}
                  >
                    <SelectTrigger id="create-backup-type" className="w-full sm:w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('platform.backupType.databaseAndFiles')}</SelectItem>
                      <SelectItem value="database">{t('platform.backupType.databaseOnly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createBackup.mutate(createBackupType)}
                  disabled={createBackup.isPending}
                  className="self-start sm:self-end"
                >
                  {createBackup.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <HardDrive className="mr-2 h-4 w-4" />
                      Create Backup
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isBackupsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : backupsError ? (
              <div className="py-12 text-center text-destructive">
                Error loading backups
                {backupsError instanceof Error && (
                  <p className="mt-1 text-sm text-muted-foreground">{backupsError.message}</p>
                )}
              </div>
            ) : filteredBackups.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  {backups.length === 0
                    ? 'No backups found. Create your first backup to get started.'
                    : 'No backups match the current filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBackups.map((backup) => (
                      <TableRow key={backup.filename}>
                        <TableCell className="font-medium font-mono text-sm">
                          {backup.filename}
                        </TableCell>
                        <TableCell>
                          {inferBackupType(backup.filename) === 'database'
                            ? t('platform.backupType.databaseOnly')
                            : t('platform.backupType.databaseAndFiles')}
                        </TableCell>
                        <TableCell>{backup.size}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(new Date(backup.created_at))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadBackup(backup.filename)}
                              title="Download backup"
                              aria-label="Download backup"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingBackupFilename(backup.filename)}
                              title="Delete backup"
                              aria-label="Delete backup"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>

      <AlertDialog
        open={!!deletingBackupFilename}
        onOpenChange={(open) => !open && setDeletingBackupFilename(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this backup file? This action cannot be undone.
              {deletingBackupFilename && (
                <span className="mt-2 block font-mono text-sm">{deletingBackupFilename}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingBackupFilename && deleteBackup.mutate(deletingBackupFilename)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBackup.isPending}
            >
              {deleteBackup.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
