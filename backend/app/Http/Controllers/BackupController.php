<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;
use Symfony\Component\Process\Exception\ProcessFailedException;
use ZipArchive;
use Carbon\Carbon;

class BackupController extends Controller
{
    /**
     * Check if user has subscription admin permission
     */
    private function checkSubscriptionAdminPermission(Request $request): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            return $user->hasPermissionTo('subscription.admin');
        } catch (\Exception $e) {
            \Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Enforce subscription admin permission
     */
    private function enforceSubscriptionAdmin(Request $request): void
    {
        if (!$this->checkSubscriptionAdminPermission($request)) {
            abort(403, 'You do not have permission to access backup administration');
        }
    }

    /**
     * Create a full system backup (database + storage)
     */
    public function createBackup(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
            $backupDir = storage_path('app/backups/' . $timestamp);

            // Create backup directory
            if (!File::exists($backupDir)) {
                File::makeDirectory($backupDir, 0755, true);
            }

            // 1. Backup Database
            $dbBackupPath = $this->backupDatabase($backupDir);

            // 2. Backup Storage
            $storageBackupPath = $this->backupStorage($backupDir);

            // 3. Create ZIP archive
            $zipPath = storage_path('app/backups/nazim_backup_' . $timestamp . '.zip');
            $this->createZipArchive($backupDir, $zipPath);

            // 4. Clean up temporary directory
            File::deleteDirectory($backupDir);

            // 5. Get file info
            $fileSize = File::size($zipPath);
            $fileSizeMB = round($fileSize / 1024 / 1024, 2);

            return response()->json([
                'success' => true,
                'message' => 'Backup created successfully',
                'backup' => [
                    'filename' => basename($zipPath),
                    'path' => $zipPath,
                    'size' => $fileSizeMB . ' MB',
                    'timestamp' => $timestamp,
                    'created_at' => Carbon::now()->toDateTimeString(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::error('Backup creation failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Backup creation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download a backup file
     */
    public function downloadBackup(Request $request, string $filename)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $backupPath = storage_path('app/backups/' . $filename);

            if (!File::exists($backupPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Backup file not found',
                ], 404);
            }

            return response()->download($backupPath, $filename, [
                'Content-Type' => 'application/zip',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Exception $e) {
            \Log::error('Backup download failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Backup download failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * List all available backups
     */
    public function listBackups(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $backupsDir = storage_path('app/backups');

            if (!File::exists($backupsDir)) {
                File::makeDirectory($backupsDir, 0755, true);
            }

            $files = File::files($backupsDir);
            $backups = [];

            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'zip') {
                    $backups[] = [
                        'filename' => $file->getFilename(),
                        'size' => round($file->getSize() / 1024 / 1024, 2) . ' MB',
                        'created_at' => Carbon::createFromTimestamp($file->getMTime())->toDateTimeString(),
                        'path' => $file->getPathname(),
                    ];
                }
            }

            // Sort by creation time (newest first)
            usort($backups, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            return response()->json([
                'success' => true,
                'backups' => $backups,
            ]);
        } catch (\Exception $e) {
            \Log::error('List backups failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to list backups: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a backup file
     */
    public function deleteBackup(Request $request, string $filename)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $backupPath = storage_path('app/backups/' . $filename);

            if (!File::exists($backupPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Backup file not found',
                ], 404);
            }

            File::delete($backupPath);

            return response()->json([
                'success' => true,
                'message' => 'Backup deleted successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Backup deletion failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Backup deletion failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore from an existing backup file
     */
    public function restoreBackup(Request $request, string $filename)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $backupPath = storage_path('app/backups/' . $filename);

            if (!File::exists($backupPath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Backup file not found',
                ], 404);
            }

            $this->performRestore($backupPath);

            return response()->json([
                'success' => true,
                'message' => 'Backup restored successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Backup restore failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Backup restore failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload and restore a backup file
     */
    public function uploadAndRestore(Request $request)
    {
        $this->enforceSubscriptionAdmin($request);

        try {
            $request->validate([
                'backup_file' => 'required|file|mimes:zip|max:512000', // 500MB max
            ]);

            $file = $request->file('backup_file');
            $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
            $filename = 'uploaded_backup_' . $timestamp . '.zip';
            $backupPath = storage_path('app/backups/' . $filename);

            // Ensure backup directory exists
            if (!File::exists(storage_path('app/backups'))) {
                File::makeDirectory(storage_path('app/backups'), 0755, true);
            }

            // Move uploaded file to backups directory
            $file->move(storage_path('app/backups'), $filename);

            // Perform restore
            $this->performRestore($backupPath);

            return response()->json([
                'success' => true,
                'message' => 'Backup uploaded and restored successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Upload and restore failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Upload and restore failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Perform the actual restore operation
     */
    private function performRestore(string $backupPath): void
    {
        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        $extractDir = storage_path('app/restore_temp/' . $timestamp);

        try {
            // Create temporary extraction directory
            if (!File::exists($extractDir)) {
                File::makeDirectory($extractDir, 0755, true);
            }

            // Extract ZIP archive
            $zip = new ZipArchive();
            if ($zip->open($backupPath) !== true) {
                throw new \Exception('Failed to open backup archive');
            }

            $zip->extractTo($extractDir);
            $zip->close();

            // Restore database
            $dbFile = $extractDir . '/database.sql';
            if (File::exists($dbFile)) {
                $this->restoreDatabase($dbFile);
            } else {
                throw new \Exception('Database backup file not found in archive');
            }

            // Restore storage
            $storageDir = $extractDir . '/storage/app';
            if (File::exists($storageDir)) {
                $this->restoreStorage($storageDir);
            } else {
                \Log::warning('Storage backup not found in archive, skipping storage restore');
            }

            // Clean up temporary directory
            File::deleteDirectory($extractDir);

        } catch (\Exception $e) {
            // Clean up temporary directory on error
            if (File::exists($extractDir)) {
                File::deleteDirectory($extractDir);
            }
            throw $e;
        }
    }

    /**
     * Restore database from SQL file
     */
    private function restoreDatabase(string $sqlFile): void
    {
        $dbConnection = config('database.default');
        $dbConfig = config("database.connections.{$dbConnection}");

        $dbHost = $dbConfig['host'];
        $dbPort = $dbConfig['port'];
        $dbName = $dbConfig['database'];
        $dbUser = $dbConfig['username'];
        $dbPassword = $dbConfig['password'];

        // Use psql for PostgreSQL
        if ($dbConnection === 'pgsql') {
            $command = sprintf(
                'PGPASSWORD=%s psql -h %s -p %s -U %s -d %s -f %s',
                escapeshellarg($dbPassword),
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbName),
                escapeshellarg($sqlFile)
            );
        } elseif ($dbConnection === 'mysql') {
            // Use mysql for MySQL
            $command = sprintf(
                'mysql -h %s -P %s -u %s -p%s %s < %s',
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbPassword),
                escapeshellarg($dbName),
                escapeshellarg($sqlFile)
            );
        } else {
            throw new \Exception("Unsupported database connection: {$dbConnection}");
        }

        // Execute the command
        $process = Process::fromShellCommandline($command);
        $process->setTimeout(600); // 10 minutes timeout
        $process->run();

        if (!$process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }
    }

    /**
     * Restore storage directories
     */
    private function restoreStorage(string $backupStorageDir): void
    {
        $targetPath = storage_path('app');

        // Create backup of current storage before restoring
        $currentBackupDir = storage_path('app/pre_restore_backup_' . Carbon::now()->format('Y-m-d_H-i-s'));
        if (File::exists($targetPath)) {
            File::copyDirectory($targetPath, $currentBackupDir);
        }

        try {
            // Clear current storage (except backups and pre_restore_backup directories)
            if (File::exists($targetPath)) {
                $items = File::directories($targetPath);
                foreach ($items as $item) {
                    $basename = basename($item);
                    if ($basename !== 'backups' && !str_starts_with($basename, 'pre_restore_backup_')) {
                        File::deleteDirectory($item);
                    }
                }

                $files = File::files($targetPath);
                foreach ($files as $file) {
                    File::delete($file);
                }
            }

            // Restore from backup
            $items = array_merge(
                File::directories($backupStorageDir),
                File::files($backupStorageDir)
            );

            foreach ($items as $item) {
                $basename = basename($item);
                $destination = $targetPath . '/' . $basename;

                if (is_dir($item)) {
                    // Skip backups directory to avoid overwriting current backups
                    if ($basename === 'backups') {
                        continue;
                    }
                    File::copyDirectory($item, $destination);
                } else {
                    File::copy($item, $destination);
                }
            }
        } catch (\Exception $e) {
            // Restore from pre-restore backup on error
            \Log::error('Storage restore failed, attempting rollback: ' . $e->getMessage());

            if (File::exists($currentBackupDir)) {
                File::deleteDirectory($targetPath);
                File::copyDirectory($currentBackupDir, $targetPath);
            }

            throw $e;
        }
    }

    /**
     * Backup database using pg_dump
     */
    private function backupDatabase(string $backupDir): string
    {
        $dbConnection = config('database.default');
        $dbConfig = config("database.connections.{$dbConnection}");

        $dbHost = $dbConfig['host'];
        $dbPort = $dbConfig['port'];
        $dbName = $dbConfig['database'];
        $dbUser = $dbConfig['username'];
        $dbPassword = $dbConfig['password'];

        $backupFile = $backupDir . '/database.sql';

        // Use pg_dump for PostgreSQL
        if ($dbConnection === 'pgsql') {
            $command = sprintf(
                'PGPASSWORD=%s pg_dump -h %s -p %s -U %s -d %s -F p -f %s',
                escapeshellarg($dbPassword),
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbName),
                escapeshellarg($backupFile)
            );
        } elseif ($dbConnection === 'mysql') {
            // Use mysqldump for MySQL
            $command = sprintf(
                'mysqldump -h %s -P %s -u %s -p%s %s > %s',
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbPassword),
                escapeshellarg($dbName),
                escapeshellarg($backupFile)
            );
        } else {
            throw new \Exception("Unsupported database connection: {$dbConnection}");
        }

        // Execute the command
        $process = Process::fromShellCommandline($command);
        $process->setTimeout(300); // 5 minutes timeout
        $process->run();

        if (!$process->isSuccessful()) {
            throw new ProcessFailedException($process);
        }

        return $backupFile;
    }

    /**
     * Backup storage directories
     */
    private function backupStorage(string $backupDir): string
    {
        $storageBackupDir = $backupDir . '/storage';
        File::makeDirectory($storageBackupDir, 0755, true);

        // Copy storage/app directory
        $sourcePath = storage_path('app');
        $destPath = $storageBackupDir . '/app';

        if (File::exists($sourcePath)) {
            File::copyDirectory($sourcePath, $destPath);
        }

        return $storageBackupDir;
    }

    /**
     * Create ZIP archive from directory
     */
    private function createZipArchive(string $sourceDir, string $zipPath): void
    {
        $zip = new ZipArchive();

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \Exception('Failed to create ZIP archive');
        }

        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($sourceDir),
            \RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($sourceDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }

        $zip->close();
    }
}
