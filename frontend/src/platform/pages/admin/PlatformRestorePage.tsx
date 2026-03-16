/**
 * Platform Restore Page
 * Restore from existing backup or upload and restore
 */

import {
  AlertTriangle,
  Database,
  RefreshCw,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

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

export default function PlatformRestorePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const [restoringBackupFilename, setRestoringBackupFilename] = useState<string | null>(null);
  const [restoreType, setRestoreType] = useState<'database' | 'all'>('all');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadRestoreType, setUploadRestoreType] = useState<'database' | 'all'>('all');

  const { data: backups = [], isLoading: isBackupsLoading } = useQuery({
    queryKey: ['platform-backups'],
    queryFn: async () => {
      try {
        return await platformApi.backups.list();
      } catch {
        return [];
      }
    },
    enabled: hasAdminPermission && !permissionsLoading,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const restoreBackup = useMutation({
    mutationFn: async ({ filename, restoreType }: { filename: string; restoreType: 'database' | 'all' }) =>
      platformApi.backups.restore(filename, restoreType),
    onSuccess: () => {
      showToast.success('Restore completed successfully');
      setRestoringBackupFilename(null);
      setRestoreType('all');
      void queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Restore failed');
    },
  });

  const uploadAndRestore = useMutation({
    mutationFn: async ({ file, restoreType }: { file: File; restoreType: 'database' | 'all' }) =>
      platformApi.backups.uploadAndRestore(file, restoreType),
    onSuccess: () => {
      showToast.success('Restore completed successfully');
      setUploadedFile(null);
      void queryClient.invalidateQueries({ queryKey: ['platform-backups'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Restore failed');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadedFile(file || null);
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
        title="Restore from Backup"
        description="Restore your database and storage from a previous backup"
        icon={<RotateCcw className="h-5 w-5" />}
      />

      <div className="rounded-lg border p-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Warning: Data Loss Risk
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Restoring a backup will replace all current data in your database and storage.
              This action cannot be undone. Please ensure you have a recent backup before proceeding.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Restore from Existing Backup
          </CardTitle>
          <CardDescription>
            Select a backup from the list below to restore. Create backups from the{' '}
            <Link to="/platform/backups" className="underline hover:no-underline">
              Backups
            </Link>{' '}
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isBackupsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : !backups || backups.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No backups available</p>
              <p className="text-sm mt-1">
                <Link to="/platform/backups" className="underline hover:no-underline">
                  Create a backup first
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.filename}>
                      <TableCell className="font-medium font-mono text-sm">
                        {backup.filename}
                      </TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(new Date(backup.created_at))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setRestoringBackupFilename(backup.filename)}
                          disabled={restoreBackup.isPending}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload and Restore Backup
          </CardTitle>
          <CardDescription>
            Upload a backup file (.zip) to restore from an external source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-restore-type">{t('platform.restoreType.label')}</Label>
            <Select
              value={uploadRestoreType}
              onValueChange={(v: 'database' | 'all') => setUploadRestoreType(v)}
            >
              <SelectTrigger id="upload-restore-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('platform.restoreType.databaseAndFiles')}</SelectItem>
                <SelectItem value="database">{t('platform.restoreType.databaseOnly')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {uploadRestoreType === 'all'
                ? t('platform.restoreType.databaseAndFilesDescription')
                : t('platform.restoreType.databaseOnlyDescription')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              disabled={uploadAndRestore.isPending}
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (uploadedFile) {
                  uploadAndRestore.mutate({ file: uploadedFile, restoreType: uploadRestoreType });
                } else {
                  showToast.error('Please select a backup file first');
                }
              }}
              disabled={!uploadedFile || uploadAndRestore.isPending}
              className="flex-shrink-0"
            >
              {uploadAndRestore.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload & Restore
                </>
              )}
            </Button>
          </div>
          {uploadedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!restoringBackupFilename}
        onOpenChange={(open) => {
          if (!open) {
            setRestoringBackupFilename(null);
            setRestoreType('all');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Restore Backup - Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restore-type">{t('platform.restoreType.label')}</Label>
                <Select
                  value={restoreType}
                  onValueChange={(v: 'database' | 'all') => setRestoreType(v)}
                >
                  <SelectTrigger id="restore-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('platform.restoreType.databaseAndFiles')}</SelectItem>
                    <SelectItem value="database">{t('platform.restoreType.databaseOnly')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {restoreType === 'all'
                    ? t('platform.restoreType.databaseAndFilesDescription')
                    : t('platform.restoreType.databaseOnlyDescription')}
                </p>
              </div>
              <p className="font-semibold text-foreground">
                Are you sure you want to restore this backup?
              </p>
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                This action is irreversible and cannot be undone!
              </p>
              {restoringBackupFilename && (
                <p className="text-sm">
                  Backup: <span className="font-mono">{restoringBackupFilename}</span>
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                restoringBackupFilename &&
                restoreBackup.mutate({ filename: restoringBackupFilename, restoreType })
              }
              disabled={restoreBackup.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {restoreBackup.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
