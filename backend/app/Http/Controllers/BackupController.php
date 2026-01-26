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
            
            // CRITICAL: Use storage/app/backups for Docker compatibility
            // This ensures backups are stored within the storage volume where www-data has write permissions
            $backupBaseDir = storage_path('app/backups');
            
            // Ensure backup base directory exists with correct permissions
            if (!is_dir($backupBaseDir)) {
                try {
                    File::makeDirectory($backupBaseDir, 0775, true);
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($backupBaseDir, 'www-data');
                        @chgrp($backupBaseDir, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create backup base directory: ' . $e->getMessage());
                    throw new \Exception('Failed to create backup directory. Please ensure storage/app/backups is writable.');
                }
            }
            
            // Create timestamped backup directory
            $backupDir = $backupBaseDir . DIRECTORY_SEPARATOR . $timestamp;
            if (!File::exists($backupDir)) {
                try {
                    File::makeDirectory($backupDir, 0775, true);
                } catch (\Exception $e) {
                    \Log::error('Failed to create backup directory: ' . $e->getMessage());
                    throw new \Exception('Failed to create backup directory: ' . $e->getMessage());
                }
            }

            // 1. Backup Database
            $dbBackupPath = $this->backupDatabase($backupDir);

            // 2. Backup Storage
            $storageBackupPath = $this->backupStorage($backupDir);

            // 3. Create ZIP archive
            // Normalize ZIP path for Windows (use same base directory)
            $zipPath = $backupBaseDir . DIRECTORY_SEPARATOR . 'nazim_backup_' . $timestamp . '.zip';
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

            // Ensure backup directory exists with correct permissions
            if (!File::exists($backupsDir)) {
                try {
                    File::makeDirectory($backupsDir, 0775, true);
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($backupsDir, 'www-data');
                        @chgrp($backupsDir, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create backups directory in listBackups: ' . $e->getMessage());
                    // Don't throw - return empty list instead
                    return response()->json([
                        'success' => true,
                        'backups' => [],
                    ]);
                }
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

            // Get restore type from request (default: 'all' for backward compatibility)
            $restoreType = $request->input('restore_type', 'all');
            // Validate restore type - only allow 'database' or 'all'
            if (!in_array($restoreType, ['database', 'all'], true)) {
                $restoreType = 'all'; // Default to 'all' for invalid values
            }
            $restoreStorage = $restoreType !== 'database';

            $this->performRestore($backupPath, $restoreStorage);

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

            // Ensure backup directory exists with correct permissions
            $backupsDir = storage_path('app/backups');
            if (!File::exists($backupsDir)) {
                try {
                    File::makeDirectory($backupsDir, 0775, true);
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($backupsDir, 'www-data');
                        @chgrp($backupsDir, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create backups directory: ' . $e->getMessage());
                    throw new \Exception('Failed to create backups directory. Please ensure storage/app/backups is writable.');
                }
            }

            // Move uploaded file to backups directory
            $file->move(storage_path('app/backups'), $filename);

            // Get restore type from request (default: 'all' for backward compatibility)
            $restoreType = $request->input('restore_type', 'all');
            // Validate restore type - only allow 'database' or 'all'
            if (!in_array($restoreType, ['database', 'all'], true)) {
                $restoreType = 'all'; // Default to 'all' for invalid values
            }
            $restoreStorage = $restoreType !== 'database';

            // Perform restore
            $this->performRestore($backupPath, $restoreStorage);

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
    private function performRestore(string $backupPath, bool $restoreStorage = true): void
    {
        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        // IMPORTANT (Windows + storage restore):
        // Do NOT extract under storage/app because restoreStorage() clears storage/app,
        // which would delete the extracted files mid-restore.
        // Use storage/restore_temp (outside storage/app) to keep extraction stable.
        $extractDir = storage_path('restore_temp/' . $timestamp);

        try {
            // Ensure restore_temp base directory exists
            $restoreTempBase = storage_path('restore_temp');
            if (!File::exists($restoreTempBase)) {
                try {
                    File::makeDirectory($restoreTempBase, 0775, true);
                    // Ensure www-data owns the directory (important for Docker)
                    if (function_exists('chown') && function_exists('posix_geteuid') && posix_geteuid() === 0) {
                        @chown($restoreTempBase, 'www-data');
                        @chgrp($restoreTempBase, 'www-data');
                    }
                } catch (\Exception $e) {
                    \Log::error('Failed to create restore_temp base directory: ' . $e->getMessage());
                    throw new \Exception('Failed to create restore temporary directory. Please ensure storage/restore_temp is writable.');
                }
            }
            
            // Create temporary extraction directory
            if (!File::exists($extractDir)) {
                try {
                    File::makeDirectory($extractDir, 0775, true);
                } catch (\Exception $e) {
                    \Log::error('Failed to create extract directory: ' . $e->getMessage());
                    throw new \Exception('Failed to create extract directory: ' . $e->getMessage());
                }
            }

            // Extract ZIP archive
            $zip = new ZipArchive();
            if ($zip->open($backupPath) !== true) {
                throw new \Exception('Failed to open backup archive');
            }

            $zip->extractTo($extractDir);
            $zip->close();

            // Restore database - check for .sql file (preferred, most compatible), .tar file, .dump file, or custom format directory
            // Plain SQL format (.sql) is preferred for maximum compatibility across PostgreSQL versions
            // Normalize paths for cross-platform compatibility
            $dbFile = $extractDir . DIRECTORY_SEPARATOR . 'database.sql';
            $dbTarFile = $extractDir . DIRECTORY_SEPARATOR . 'database.tar';
            $dbDumpFile = $extractDir . DIRECTORY_SEPARATOR . 'database.dump';
            $dbDumpDir = $extractDir . DIRECTORY_SEPARATOR . 'database_dump'; // Custom format creates a directory
            
            // Normalize all paths
            $dbFile = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $dbFile);
            $dbTarFile = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $dbTarFile);
            $dbDumpFile = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $dbDumpFile);
            $dbDumpDir = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $dbDumpDir);
            
            \Log::info('Looking for database backup file', [
                'extract_dir' => $extractDir,
                'db_file_exists' => File::exists($dbFile),
                'db_tar_file_exists' => File::exists($dbTarFile),
                'db_dump_file_exists' => File::exists($dbDumpFile),
                'db_dump_dir_exists' => is_dir($dbDumpDir),
            ]);
            
            if (File::exists($dbFile)) {
                \Log::info('Found database.sql file, starting restore', [
                    'file_size' => File::size($dbFile),
                    'file_path' => $dbFile,
                ]);
                $this->restoreDatabase($dbFile);
                \Log::info('Database restore method completed');
            } elseif (File::exists($dbTarFile)) {
                // Validate file before restoring
                if (File::size($dbTarFile) === 0) {
                    throw new \Exception('Database backup file is empty: database.tar');
                }
                \Log::info('Found database.tar file, starting restore', [
                    'file_size' => File::size($dbTarFile),
                    'file_path' => $dbTarFile,
                ]);
                $this->restoreDatabase($dbTarFile);
                \Log::info('Database restore method completed');
            } elseif (File::exists($dbDumpFile)) {
                if (File::size($dbDumpFile) === 0) {
                    throw new \Exception('Database backup file is empty: database.dump');
                }
                \Log::info('Found database.dump file, starting restore', [
                    'file_size' => File::size($dbDumpFile),
                    'file_path' => $dbDumpFile,
                ]);
                $this->restoreDatabase($dbDumpFile);
                \Log::info('Database restore method completed');
            } elseif (is_dir($dbDumpDir)) {
                \Log::info('Found database_dump directory, starting restore', [
                    'dir_path' => $dbDumpDir,
                ]);
                $this->restoreDatabase($dbDumpDir);
                \Log::info('Database restore method completed');
            } else {
                // List what files were found for debugging
                $foundFiles = [];
                if (File::exists($extractDir)) {
                    try {
                        $files = File::allFiles($extractDir);
                        foreach ($files as $file) {
                            $foundFiles[] = $file->getRelativePathname();
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Failed to list files in extract directory: ' . $e->getMessage());
                    }
                }
                $foundFilesList = empty($foundFiles) ? 'none' : implode(', ', array_slice($foundFiles, 0, 10));
                if (count($foundFiles) > 10) {
                    $foundFilesList .= ' (and ' . (count($foundFiles) - 10) . ' more)';
                }
                throw new \Exception(
                    'Database backup file not found in archive. ' .
                    'Expected: database.sql, database.tar, database.dump, or database_dump directory. ' .
                    'Found files: ' . $foundFilesList
                );
            }

            // Restore storage - only if restoreStorage is true
            if ($restoreStorage) {
                $storageDir = null;
                
                // Try standard structure: storage/app
                $storageDir1 = $extractDir . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'app';
                $storageDir1 = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $storageDir1);
                
                // Try alternative structure: app (directly in extract dir)
                $storageDir2 = $extractDir . DIRECTORY_SEPARATOR . 'app';
                $storageDir2 = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $storageDir2);
                
                // Try another alternative: storage (if app is inside)
                $storageDir3 = $extractDir . DIRECTORY_SEPARATOR . 'storage';
                $storageDir3 = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $storageDir3);
                
                if (File::exists($storageDir1) && is_dir($storageDir1)) {
                    $storageDir = $storageDir1;
                } elseif (File::exists($storageDir2) && is_dir($storageDir2)) {
                    $storageDir = $storageDir2;
                } elseif (File::exists($storageDir3) && is_dir($storageDir3)) {
                    // Check if app directory exists inside storage
                    $appInsideStorage = $storageDir3 . DIRECTORY_SEPARATOR . 'app';
                    if (File::exists($appInsideStorage) && is_dir($appInsideStorage)) {
                        $storageDir = $appInsideStorage;
                    } else {
                        // Use storage directory directly if it contains files
                        $storageDir = $storageDir3;
                    }
                }
                
                if ($storageDir && File::exists($storageDir)) {
                    \Log::info('Found storage backup directory, starting restore', [
                        'storage_dir' => $storageDir,
                    ]);
                    $this->restoreStorage($storageDir);
                    \Log::info('Storage restore completed successfully');
                } else {
                    \Log::info('Storage backup not found in archive, skipping storage restore. This is normal if the backup only contains database.', [
                        'checked_dirs' => [
                            'storage/app' => $storageDir1,
                            'app' => $storageDir2,
                            'storage' => $storageDir3,
                        ],
                    ]);
                }
            } else {
                \Log::info('Storage restore skipped - database only restore requested.');
            }

            // Clean up temporary directory
            \Log::info('Cleaning up temporary restore directory', ['extract_dir' => $extractDir]);
            File::deleteDirectory($extractDir);
            \Log::info('Backup restore process completed successfully');

        } catch (\Exception $e) {
            // Clean up temporary directory on error
            if (File::exists($extractDir)) {
                File::deleteDirectory($extractDir);
            }
            throw $e;
        }
    }

    /**
     * Restore database from SQL file (plain format, preferred) or custom format dump (tar/dump)
     * Plain SQL format (.sql) is restored using psql for maximum compatibility
     * Custom formats (.tar, .dump) are restored using pg_restore
     */
    private function restoreDatabase(string $dbFile): void
    {
        // Normalize path for cross-platform compatibility
        $normalizedDbFile = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $dbFile);
        
        // Validate file exists and is readable
        if (!File::exists($normalizedDbFile)) {
            throw new \Exception("Database backup file not found: {$normalizedDbFile}");
        }
        
        if (!is_readable($normalizedDbFile)) {
            throw new \Exception("Database backup file is not readable: {$normalizedDbFile}");
        }
        
        // Check file size (if it's a file, not a directory)
        if (!is_dir($normalizedDbFile)) {
            $fileSize = File::size($normalizedDbFile);
            if ($fileSize === 0) {
                throw new \Exception("Database backup file is empty: {$normalizedDbFile}");
            }
            
            // Pre-process SQL file to fix common restore issues
            // This prevents "function already exists" and "role does not exist" errors during restore
            if (str_ends_with($normalizedDbFile, '.sql')) {
                try {
                    $originalFileSize = File::size($normalizedDbFile);
                    $sqlContent = File::get($normalizedDbFile);
                    
                    \Log::info('Starting SQL file preprocessing', [
                        'file_path' => $normalizedDbFile,
                        'file_size' => $originalFileSize,
                        'content_length' => strlen($sqlContent),
                    ]);
                    
                    // 1. Replace CREATE FUNCTION with CREATE OR REPLACE FUNCTION
                    // Use regex to match CREATE FUNCTION statements while preserving the function definition
                    // Pattern: CREATE FUNCTION (possibly with OR REPLACE already) -> ensure OR REPLACE is present
                    $sqlContent = preg_replace(
                        '/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/i',
                        'CREATE OR REPLACE FUNCTION ',
                        $sqlContent
                    );
                    
                    // 2. Remove ALTER ... OWNER TO statements (roles may not exist in target database)
                    // These statements cause "role does not exist" errors during restore
                    // Match multi-line ALTER statements that may span multiple lines
                    // Pattern: ALTER <object_type> <object_name> OWNER TO <role>;
                    
                    // Count original OWNER TO statements for logging (before removal)
                    preg_match_all('/ALTER\s+[A-Z_]+\s+[^;]*?OWNER\s+TO\s+[^;]+;/is', $sqlContent, $matches);
                    $originalOwnerToCount = count($matches[0] ?? []);
                    
                    // Remove ALTER FUNCTION ... OWNER TO ... (handles multi-line and function names with parentheses)
                    // Example: ALTER FUNCTION public.auto_set_staff_document_organization_id() OWNER TO nazim;
                    // Use [^;]+ to match everything up to semicolon (non-greedy with ?)
                    $sqlContent = preg_replace(
                        '/ALTER\s+FUNCTION\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER FUNCTION OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Remove ALTER TABLE ... OWNER TO ...
                    $sqlContent = preg_replace(
                        '/ALTER\s+TABLE\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER TABLE OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Remove ALTER SEQUENCE ... OWNER TO ...
                    $sqlContent = preg_replace(
                        '/ALTER\s+SEQUENCE\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER SEQUENCE OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Remove ALTER VIEW ... OWNER TO ...
                    $sqlContent = preg_replace(
                        '/ALTER\s+VIEW\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER VIEW OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Remove ALTER TYPE ... OWNER TO ...
                    $sqlContent = preg_replace(
                        '/ALTER\s+TYPE\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER TYPE OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Remove ALTER SCHEMA ... OWNER TO ...
                    $sqlContent = preg_replace(
                        '/ALTER\s+SCHEMA\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER SCHEMA OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Generic catch-all for any other ALTER ... OWNER TO statements
                    $sqlContent = preg_replace(
                        '/ALTER\s+[A-Z_]+\s+[^;]*?OWNER\s+TO\s+[^;]+;/is',
                        '-- Removed ALTER ... OWNER TO (role may not exist)',
                        $sqlContent
                    );
                    
                    // Count how many were actually removed (by counting comments)
                    $removedCount = substr_count($sqlContent, '-- Removed ALTER');
                    
                    // Write the processed SQL back to the file
                    File::put($normalizedDbFile, $sqlContent);
                    
                    \Log::info("Pre-processed SQL file", [
                        'replaced_create_function' => true,
                        'original_owner_to_statements' => $originalOwnerToCount,
                        'removed_owner_to_statements' => $removedCount,
                        'file_size_before' => $originalFileSize,
                        'file_size_after' => File::size($normalizedDbFile),
                    ]);
                } catch (\Exception $e) {
                    \Log::warning('Failed to pre-process SQL file (continuing anyway): ' . $e->getMessage());
                    // Don't throw - continue with restore even if preprocessing fails
                }
            }
        }
        
        $dbConnection = config('database.default');
        $dbConfig = config("database.connections.{$dbConnection}");

        $dbHost = $dbConfig['host'];
        $dbPort = $dbConfig['port'];
        $dbName = $dbConfig['database'];
        $dbUser = $dbConfig['username'];
        $dbPassword = $dbConfig['password'];

        // Initialize command variable for logging (will be set in all code paths)
        $command = null;
        $commandForLogging = null;
        $pgRestoreVersion = null; // For version mismatch error messages

        // Use psql for PostgreSQL plain SQL files (preferred, most compatible)
        // Use pg_restore for tar/custom format files (for backward compatibility with old backups)
        if ($dbConnection === 'pgsql') {
            // Check if it's a tar/custom format (tar file, .dump file, or directory)
            // Plain SQL files (.sql) are handled by psql for maximum compatibility
            $isCustomFormat = str_ends_with($normalizedDbFile, '.tar') || str_ends_with($normalizedDbFile, '.dump') || is_dir($normalizedDbFile);
            
            if ($isCustomFormat) {
                // Use pg_restore for custom format (.dump) files
                $pgRestorePath = $this->findPgRestorePath();
                
                if (!$pgRestorePath) {
                    $errorMessage = 'pg_restore executable not found. ';
                    if (PHP_OS_FAMILY === 'Windows') {
                        $errorMessage .= 'Please ensure PostgreSQL is installed and pg_restore.exe is available. ';
                        $errorMessage .= 'You can either: 1) Add PostgreSQL bin directory to your system PATH, ';
                        $errorMessage .= 'or 2) Install PostgreSQL if it is not already installed.';
                    } else {
                        $errorMessage .= 'Please install PostgreSQL client tools or add pg_restore to your system PATH.';
                    }
                    throw new \Exception($errorMessage);
                }
                
                // Get pg_restore version for better error messages
                $pgRestoreVersion = $this->getPgRestoreVersion($pgRestorePath);
                
                // Use pg_restore for custom format
                // Add verbose flag to get more detailed error information
                // Add --no-owner flag to ignore ownership issues (roles that don't exist in target database)
                // On Windows, use batch file approach (similar to pg_dump) for better error capture
                if (PHP_OS_FAMILY === 'Windows') {
                    // Create temporary batch file for better error capture on Windows
                    $tempDir = str_replace('/', '\\', sys_get_temp_dir());
                    $batchFile = $tempDir . '\\pg_restore_backup_' . uniqid() . '.bat';
                    
                    // Escape password for batch file
                    $escapedPassword = str_replace(['"', '%', '!', '^', '&'], ['""', '%%', '!!', '^^', '^&'], $dbPassword);
                    
                    // Normalize paths for Windows
                    $normalizedPgRestorePath = str_replace('/', '\\', $pgRestorePath);
                    $normalizedDbFile = str_replace('/', '\\', $normalizedDbFile);
                    
                    // Escape backslashes and quotes in paths for batch file
                    $escapedPgRestorePath = str_replace(['\\', '"'], ['\\\\', '\\"'], $normalizedPgRestorePath);
                    $escapedDbFile = str_replace(['\\', '"'], ['\\\\', '\\"'], $normalizedDbFile);
                    
                    // Create batch file that redirects stderr to stdout
                    // --no-owner: ignore ownership issues (don't try to set ownership to roles that don't exist)
                    $batchContent = sprintf(
                        "@echo off\nset PGPASSWORD=%s\n\"%s\" -h %s -p %s -U %s -d %s --clean --if-exists --no-owner -v \"%s\" 2>&1\n",
                        $escapedPassword,
                        $escapedPgRestorePath,
                        escapeshellarg($dbHost),
                        escapeshellarg($dbPort),
                        escapeshellarg($dbUser),
                        escapeshellarg($dbName),
                        $escapedDbFile
                    );
                    file_put_contents($batchFile, $batchContent);
                    
                    // Execute batch file
                    $normalizedBatchFile = str_replace('/', '\\', $batchFile);
                    $command = 'cmd /c "' . $normalizedBatchFile . '"';
                    $commandForLogging = sprintf(
                        '%s -h %s -p %s -U %s -d %s --clean --if-exists --no-owner -v %s',
                        $pgRestorePath,
                        $dbHost,
                        $dbPort,
                        $dbUser,
                        $dbName,
                        $normalizedDbFile
                    );
                    
                    $output = [];
                    $returnVar = 0;
                    exec($command . ' 2>&1', $output, $returnVar);
                    $combinedOutput = implode("\n", $output);
                    
                    // Clean up batch file
                    if (file_exists($batchFile)) {
                        @unlink($batchFile);
                    }
                    
                    // Create a mock Process object for compatibility
                    // The command has already been executed via exec(), so this is just a wrapper
                    $process = new class($returnVar, $combinedOutput) {
                        private $exitCode;
                        private $output;
                        private $errorOutput;
                        private $hasRun = false;
                        
                        public function __construct($exitCode, $output) {
                            $this->exitCode = $exitCode;
                            // On Windows with 2>&1, both stdout and stderr are in output
                            $this->output = $output;
                            $this->errorOutput = $output; // Same output for both on Windows
                        }
                        
                        public function run($callback = null) {
                            // Already executed via exec(), so this is a no-op
                            $this->hasRun = true;
                        }
                        
                        public function isSuccessful() {
                            return $this->exitCode === 0;
                        }
                        
                        public function getExitCode() {
                            return $this->exitCode;
                        }
                        
                        public function getOutput() {
                            return $this->output;
                        }
                        
                        public function getErrorOutput() {
                            return $this->errorOutput;
                        }
                        
                        public function setTimeout($timeout) {
                            return $this;
                        }
                        
                        public function setEnv(array $env) {
                            return $this;
                        }
                    };
                } else {
                    // On Unix-like systems, use Process constructor with command array
                    // --no-owner: ignore ownership issues (don't try to set ownership to roles that don't exist)
                    $commandArray = [
                        $pgRestorePath,
                        '-h', $dbHost,
                        '-p', $dbPort,
                        '-U', $dbUser,
                        '-d', $dbName,
                        '--clean',
                        '--if-exists',
                        '--no-owner',
                        '-v',
                        $normalizedDbFile
                    ];
                    
                    // Build command string for logging
                    $commandForLogging = implode(' ', array_map('escapeshellarg', $commandArray));
                    
                    $process = new Process($commandArray, null, ['PGPASSWORD' => $dbPassword]);
                    $process->setTimeout(600);
                }
            } else {
                // Use psql for plain SQL files
                $psqlPath = $this->findPsqlPath();
                
                if (!$psqlPath) {
                    $errorMessage = 'psql executable not found. ';
                    if (PHP_OS_FAMILY === 'Windows') {
                        $errorMessage .= 'Please ensure PostgreSQL is installed and psql.exe is available. ';
                        $errorMessage .= 'You can either: 1) Add PostgreSQL bin directory to your system PATH, ';
                        $errorMessage .= 'or 2) Install PostgreSQL if it is not already installed.';
                    } else {
                        $errorMessage .= 'Please install PostgreSQL client tools or add psql to your system PATH.';
                    }
                    throw new \Exception($errorMessage);
                }

                /**
                 * CRITICAL:
                 * Many user-provided / older backups may not include `--clean` drop statements.
                 * Restoring into a non-empty database will then fail with "relation already exists".
                 *
                 * We solve this by recreating the target database BEFORE applying the SQL file.
                 * This yields a clean restore target and avoids dependency-order issues from DROP TABLE.
                 */
                $this->recreatePostgresDatabaseForRestore(
                    psqlPath: $psqlPath,
                    dbHost: $dbHost,
                    dbPort: $dbPort,
                    dbUser: $dbUser,
                    dbPassword: $dbPassword,
                    targetDbName: $dbName
                );

                // NOTE (Windows): Symfony Process output capture is unreliable for psql in some setups.
                // We use the same batch-file + exec(2>&1) approach as pg_restore to reliably capture errors.
                // Also enable ON_ERROR_STOP so psql exits on the first SQL error with a clear message.
                if (PHP_OS_FAMILY === 'Windows') {
                    $tempDir = str_replace('/', '\\', sys_get_temp_dir());
                    $batchFile = $tempDir . '\\psql_restore_' . uniqid() . '.bat';

                    // Escape password for batch file (do NOT log the password)
                    $escapedPassword = str_replace(['"', '%', '!', '^', '&'], ['""', '%%', '!!', '^^', '^&'], $dbPassword);

                    // Normalize paths for Windows
                    $normalizedPsqlPath = str_replace('/', '\\', $psqlPath);
                    $normalizedDbFileWin = str_replace('/', '\\', $normalizedDbFile);

                    // Escape backslashes and quotes in paths for batch file
                    $escapedPsqlPath = str_replace(['\\', '"'], ['\\\\', '\\"'], $normalizedPsqlPath);
                    $escapedDbFile = str_replace(['\\', '"'], ['\\\\', '\\"'], $normalizedDbFileWin);

                    $batchContent = sprintf(
                        "@echo off\nset PGPASSWORD=%s\n\"%s\" -h %s -p %s -U %s -d %s --set ON_ERROR_STOP=on --echo-errors -f \"%s\" 2>&1\n",
                        $escapedPassword,
                        $escapedPsqlPath,
                        escapeshellarg($dbHost),
                        escapeshellarg($dbPort),
                        escapeshellarg($dbUser),
                        escapeshellarg($dbName),
                        $escapedDbFile
                    );
                    file_put_contents($batchFile, $batchContent);

                    $normalizedBatchFile = str_replace('/', '\\', $batchFile);
                    $command = 'cmd /c "' . $normalizedBatchFile . '"';
                    $commandForLogging = sprintf(
                        '"%s" -h "%s" -p "%s" -U "%s" -d "%s" --set ON_ERROR_STOP=on --echo-errors -f "%s"',
                        $normalizedPsqlPath,
                        $dbHost,
                        $dbPort,
                        $dbUser,
                        $dbName,
                        $normalizedDbFileWin
                    );

                    $output = [];
                    $returnVar = 0;
                    exec($command . ' 2>&1', $output, $returnVar);
                    $combinedOutput = implode("\n", $output);

                    if (file_exists($batchFile)) {
                        @unlink($batchFile);
                    }

                    // Create a mock Process object for compatibility with the shared error handling below
                    $process = new class($returnVar, $combinedOutput) {
                        private int $exitCode;
                        private string $output;
                        private string $errorOutput;

                        public function __construct(int $exitCode, string $output) {
                            $this->exitCode = $exitCode;
                            $this->output = $output;
                            // On Windows with 2>&1, both stdout and stderr are in output
                            $this->errorOutput = $output;
                        }

                        public function run($callback = null): void
                        {
                            // Already executed via exec(), so this is a no-op
                        }

                        public function isSuccessful(): bool
                        {
                            return $this->exitCode === 0;
                        }

                        public function getExitCode(): int
                        {
                            return $this->exitCode;
                        }

                        public function getOutput(): string
                        {
                            return $this->output;
                        }

                        public function getErrorOutput(): string
                        {
                            return $this->errorOutput;
                        }

                        public function setTimeout($timeout)
                        {
                            return $this;
                        }
                    };
                } else {
                    // Use environment variable via Process::setEnv() for cross-platform compatibility
                    $command = sprintf(
                        '%s -h %s -p %s -U %s -d %s --set ON_ERROR_STOP=on --echo-errors -f %s',
                        escapeshellarg($psqlPath),
                        escapeshellarg($dbHost),
                        escapeshellarg($dbPort),
                        escapeshellarg($dbUser),
                        escapeshellarg($dbName),
                        escapeshellarg($normalizedDbFile)
                    );
                    $commandForLogging = $command;

                    $process = Process::fromShellCommandline($command);
                    $process->setEnv(['PGPASSWORD' => $dbPassword]);
                }
            }
        } elseif ($dbConnection === 'mysql') {
            // Use mysql for MySQL
            // Note: MySQL password is passed via -p flag (no space between -p and password)
            $command = sprintf(
                'mysql -h %s -P %s -u %s -p%s %s < %s',
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbPassword),
                escapeshellarg($dbName),
                escapeshellarg($normalizedDbFile)
            );
            $commandForLogging = $command;
            
            $process = Process::fromShellCommandline($command);
        } else {
            throw new \Exception("Unsupported database connection: {$dbConnection}");
        }

        // Execute the command
        $process->setTimeout(600); // 10 minutes timeout
        
        \Log::info('Starting database restore', [
            'db_file' => $normalizedDbFile,
            'file_size' => File::exists($normalizedDbFile) && !is_dir($normalizedDbFile) ? File::size($normalizedDbFile) : 0,
            'db_name' => $dbName,
            'db_host' => $dbHost,
        ]);
        
        $process->run();
        
        $output = $process->getOutput();
        $errorOutput = $process->getErrorOutput();
        $exitCode = $process->getExitCode();

        if (!$process->isSuccessful()) {
            // Capture full error output
            $errorOutput = $process->getErrorOutput();
            $output = $process->getOutput();
            $exitCode = $process->getExitCode();
            
            // On Windows, stderr might be in stdout when using 2>&1
            // Combine error output and standard output
            $fullError = '';
            if ($errorOutput) {
                $fullError = trim($errorOutput);
            }
            if ($output) {
                $outputTrimmed = trim($output);
                if ($fullError && $outputTrimmed) {
                    $fullError = $fullError . "\n" . $outputTrimmed;
                } elseif ($outputTrimmed) {
                    $fullError = $outputTrimmed;
                }
            }
            
            // If we still don't have an error message, try to get it from the process
            if (empty($fullError)) {
                // Try to get any available output
                $fullError = 'Unknown error occurred';
                if ($errorOutput) {
                    $fullError = $errorOutput;
                } elseif ($output) {
                    $fullError = $output;
                }
            }
            
            // Log the full error for debugging
            \Log::error('Database restore command failed', [
                'command' => $commandForLogging ?? $command ?? 'N/A',
                'exit_code' => $exitCode,
                'error_output' => $errorOutput,
                'output' => $output,
                'db_file' => $normalizedDbFile,
                'file_exists' => File::exists($normalizedDbFile),
                'file_size' => File::exists($normalizedDbFile) && !is_dir($normalizedDbFile) ? File::size($normalizedDbFile) : 0,
                'is_directory' => is_dir($normalizedDbFile),
            ]);
            
            // Create detailed error message
            // Show the actual error first, then context
            $errorMessage = 'Database restore failed.';
            
            // Add the actual error message if available
            if ($fullError && trim($fullError) !== '') {
                $errorMessage .= "\n\nError details:\n" . $fullError;
            } else {
                $errorMessage .= "\n\nExit code: {$exitCode}";
                if ($errorOutput) {
                    $errorMessage .= "\nError output: " . $errorOutput;
                }
                if ($output) {
                    $errorMessage .= "\nOutput: " . $output;
                }
            }
            
            // Add context about the file (on a new line)
            $errorMessage .= "\n\nFile information:";
            if (File::exists($normalizedDbFile)) {
                if (!is_dir($normalizedDbFile)) {
                    $fileSize = File::size($normalizedDbFile);
                    $errorMessage .= " File exists, size: " . round($fileSize / 1024 / 1024, 2) . " MB";
                } else {
                    $errorMessage .= " Directory exists";
                }
            } else {
                $errorMessage .= " File not found: {$normalizedDbFile}";
            }
            
            // Add common error explanations
            if (str_contains($fullError, 'unsupported version') || (str_contains($fullError, 'version') && str_contains($fullError, 'in file header'))) {
                $errorMessage .= "\n\nThe backup file was created with a newer version of PostgreSQL.";
                // Extract version number from error message (e.g., "unsupported version (1.16)")
                if (preg_match('/version\s*\((\d+\.\d+)\)/', $fullError, $matches)) {
                    $backupFormatVersion = $matches[1];
                    $errorMessage .= " The backup uses format version {$backupFormatVersion}.";
                } elseif (preg_match('/version\s+(\d+\.\d+)/', $fullError, $matches)) {
                    $backupFormatVersion = $matches[1];
                    $errorMessage .= " The backup uses format version {$backupFormatVersion}.";
                }
                $errorMessage .= "\n\nFormat version 1.16 requires PostgreSQL 17.6+ or pg_restore 17.6+.";
                
                // Add detected pg_restore version if available
                if (isset($pgRestoreVersion) && $pgRestoreVersion) {
                    $errorMessage .= "\n\nDetected pg_restore version: {$pgRestoreVersion}";
                    // Try to extract version number
                    if (preg_match('/(\d+)\.(\d+)/', $pgRestoreVersion, $versionMatches)) {
                        $majorVersion = (int)$versionMatches[1];
                        $minorVersion = (int)$versionMatches[2];
                        if ($majorVersion < 17 || ($majorVersion === 17 && $minorVersion < 6)) {
                            $errorMessage .= " (This version is too old. You need PostgreSQL 17.6 or higher.)";
                        }
                    }
                }
                
                $errorMessage .= "\n\nSolutions:";
                $errorMessage .= "\n1. Upgrade your PostgreSQL client tools to version 17.6 or higher";
                $errorMessage .= "\n2. Or recreate the backup using an older pg_dump version that's compatible with your pg_restore";
                $errorMessage .= "\n3. Or use a PostgreSQL 17.6+ server for restoration";
                $errorMessage .= "\n4. Consider using plain SQL format (--format=plain) instead of tar format for better compatibility";
            } elseif (str_contains($fullError, 'password authentication failed') || str_contains($fullError, 'authentication failed')) {
                $errorMessage .= ' Please check your database credentials.';
            } elseif (str_contains($fullError, 'could not connect') || str_contains($fullError, 'connection refused')) {
                $errorMessage .= ' Please check your database connection settings (host, port).';
            } elseif (str_contains($fullError, 'role') && str_contains($fullError, 'does not exist')) {
                $errorMessage .= ' A database role referenced in the backup does not exist in the target database.';
                $errorMessage .= ' The SQL file has been pre-processed to remove OWNER TO statements, but some may remain.';
                $errorMessage .= ' Please ensure all required database roles exist, or restore with a user that has sufficient privileges.';
            } elseif (str_contains($fullError, 'does not exist') && str_contains($fullError, 'database') && !str_contains($fullError, 'role')) {
                $errorMessage .= ' The database does not exist. Please create it first.';
            } elseif (str_contains($fullError, 'permission denied') || str_contains($fullError, 'access denied')) {
                $errorMessage .= ' Database permission denied. Please check user permissions.';
            } elseif (str_contains($fullError, 'invalid format') || str_contains($fullError, 'unrecognized archive format')) {
                $errorMessage .= ' The backup file format is invalid or corrupted.';
            } elseif (str_contains($fullError, 'version mismatch') || str_contains($fullError, 'incompatible version')) {
                $errorMessage .= ' The backup file version is incompatible with your PostgreSQL version.';
            }
            
            throw new \Exception($errorMessage);
        }
        
        // Log successful restore
        \Log::info('Database restore completed successfully', [
            'db_file' => $normalizedDbFile,
            'db_name' => $dbName,
            'exit_code' => $exitCode,
            'output_length' => strlen($output),
            'error_output_length' => strlen($errorOutput),
        ]);
        
        // Verify restore by checking if we can query the database and count tables
        try {
            $tableCount = DB::select("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'");
            $tableCountValue = $tableCount[0]->count ?? 0;
            
            // Also check for some common tables to verify data was restored
            $commonTables = ['organizations', 'users', 'profiles', 'students', 'staff'];
            $existingTables = [];
            foreach ($commonTables as $table) {
                try {
                    $result = DB::select("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?", [$table]);
                    if (($result[0]->count ?? 0) > 0) {
                        // Also check if table has data
                        try {
                            $rowCount = DB::table($table)->count();
                            $existingTables[] = $table . " ({$rowCount} rows)";
                        } catch (\Exception $e) {
                            $existingTables[] = $table . " (exists)";
                        }
                    }
                } catch (\Exception $e) {
                    // Ignore individual table check errors
                }
            }
            
            \Log::info('Database restore verification', [
                'tables_in_public_schema' => $tableCountValue,
                'common_tables_found' => $existingTables,
                'verification_status' => $tableCountValue > 0 ? 'success' : 'warning_no_tables',
            ]);
        } catch (\Exception $e) {
            \Log::warning('Could not verify database restore (non-critical): ' . $e->getMessage());
        }
    }

    /**
     * Recreate the target PostgreSQL database before restoring a dump into it.
     *
     * Why:
     * - Some backups (especially older ones) may not include `--clean` / DROP statements.
     * - Even when drops exist, dependency order can cause failures.
     *
     * This method:
     * - disconnects Laravel DB connections,
     * - terminates existing sessions for the target DB,
     * - drops and recreates the DB,
     * - then the caller can restore into a clean database.
     */
    private function recreatePostgresDatabaseForRestore(
        string $psqlPath,
        string $dbHost,
        string $dbPort,
        string $dbUser,
        string $dbPassword,
        string $targetDbName
    ): void {
        // Close any active Laravel DB connections (otherwise DROP DATABASE may fail)
        try {
            DB::disconnect();
            DB::purge();
        } catch (\Exception $e) {
            // Non-fatal; continue
            \Log::warning('Failed to disconnect Laravel DB before recreate (continuing): ' . $e->getMessage());
        }

        $maintenanceDb = env('DB_MAINTENANCE_DATABASE', 'postgres');

        // NOTE: We purposely do NOT rely on `--clean` inside the dump file.
        // We recreate the database for a guaranteed clean restore target.
        //
        // IMPORTANT: `DROP DATABASE` CANNOT run inside a transaction block.
        // If we send multiple statements in a single `psql -c "<...; ...; ...>"`,
        // PostgreSQL treats it as one multi-statement query, which is executed inside
        // an implicit transaction block, and DROP DATABASE will fail.
        //
        // So we run THREE separate `psql -c` commands.
        $terminateSql = sprintf(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid();",
            $this->pgQuoteLiteral($targetDbName),
        );
        $dropSql = sprintf(
            "DROP DATABASE IF EXISTS %s;",
            $this->pgQuoteIdentifier($targetDbName)
        );
        $createSql = sprintf(
            "CREATE DATABASE %s WITH OWNER %s ENCODING 'UTF8';",
            $this->pgQuoteIdentifier($targetDbName),
            $this->pgQuoteIdentifier($dbUser)
        );

        \Log::info('Recreating PostgreSQL database before restore', [
            'db_host' => $dbHost,
            'db_port' => $dbPort,
            'db_user' => $dbUser,
            'target_db' => $targetDbName,
            'maintenance_db' => $maintenanceDb,
        ]);

        if (PHP_OS_FAMILY === 'Windows') {
            $tempDir = str_replace('/', '\\', sys_get_temp_dir());
            $batchFile = $tempDir . '\\psql_recreate_db_' . uniqid() . '.bat';

            $escapedPassword = str_replace(['"', '%', '!', '^', '&'], ['""', '%%', '!!', '^^', '^&'], $dbPassword);
            $normalizedPsqlPath = str_replace('/', '\\', $psqlPath);

            $terminateSqlOneLine = str_replace(["\r\n", "\n", "\r"], ' ', $terminateSql);
            $dropSqlOneLine = str_replace(["\r\n", "\n", "\r"], ' ', $dropSql);
            $createSqlOneLine = str_replace(["\r\n", "\n", "\r"], ' ', $createSql);

            // Escape for batch context (quotes inside the SQL must be doubled)
            $terminateSqlOneLine = str_replace('"', '""', $terminateSqlOneLine);
            $dropSqlOneLine = str_replace('"', '""', $dropSqlOneLine);
            $createSqlOneLine = str_replace('"', '""', $createSqlOneLine);

            $batchContent = sprintf(
                "@echo off\n".
                "set PGPASSWORD=%s\n".
                "\"%s\" -h %s -p %s -U %s -d %s --set ON_ERROR_STOP=on --echo-errors -v VERBOSITY=verbose -c \"%s\" 2>&1 || exit /b %%errorlevel%%\n".
                "\"%s\" -h %s -p %s -U %s -d %s --set ON_ERROR_STOP=on --echo-errors -v VERBOSITY=verbose -c \"%s\" 2>&1 || exit /b %%errorlevel%%\n".
                "\"%s\" -h %s -p %s -U %s -d %s --set ON_ERROR_STOP=on --echo-errors -v VERBOSITY=verbose -c \"%s\" 2>&1 || exit /b %%errorlevel%%\n",
                $escapedPassword,
                $normalizedPsqlPath,
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($maintenanceDb),
                $terminateSqlOneLine,
                $normalizedPsqlPath,
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($maintenanceDb),
                $dropSqlOneLine,
                $normalizedPsqlPath,
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($maintenanceDb),
                $createSqlOneLine
            );

            file_put_contents($batchFile, $batchContent);
            $command = 'cmd /c "' . str_replace('/', '\\', $batchFile) . '"';

            $output = [];
            $returnVar = 0;
            exec($command . ' 2>&1', $output, $returnVar);
            $combinedOutput = trim(implode("\n", $output));

            if (file_exists($batchFile)) {
                @unlink($batchFile);
            }

            if ($returnVar !== 0) {
                \Log::error('Failed to recreate PostgreSQL database (Windows)', [
                    'exit_code' => $returnVar,
                    'output' => $combinedOutput,
                ]);
                throw new \Exception(
                    "Failed to recreate PostgreSQL database before restore.\n\n" .
                    ($combinedOutput !== '' ? $combinedOutput : "Exit code: {$returnVar}")
                );
            }
        } else {
            $statements = [$terminateSql, $dropSql, $createSql];
            foreach ($statements as $statement) {
                $commandArray = [
                    $psqlPath,
                    '-h', $dbHost,
                    '-p', $dbPort,
                    '-U', $dbUser,
                    '-d', $maintenanceDb,
                    '--set', 'ON_ERROR_STOP=on',
                    '--echo-errors',
                    '-v', 'VERBOSITY=verbose',
                    '-c', $statement,
                ];

                $process = new Process($commandArray, null, ['PGPASSWORD' => $dbPassword]);
                $process->setTimeout(120);
                $process->run();

                if (!$process->isSuccessful()) {
                    $fullError = trim($process->getErrorOutput() ?: $process->getOutput() ?: '');
                    \Log::error('Failed to recreate PostgreSQL database (Unix)', [
                        'exit_code' => $process->getExitCode(),
                        'error' => $fullError,
                        'statement' => $statement,
                    ]);
                    throw new \Exception(
                        "Failed to recreate PostgreSQL database before restore.\n\n" .
                        ($fullError !== '' ? $fullError : 'Unknown error occurred')
                    );
                }
            }
        }
    }

    private function pgQuoteIdentifier(string $identifier): string
    {
        // Double-quote identifiers and escape any embedded quotes.
        return '"' . str_replace('"', '""', $identifier) . '"';
    }

    private function pgQuoteLiteral(string $literal): string
    {
        // Single-quote string literals and escape any embedded single quotes.
        return "'" . str_replace("'", "''", $literal) . "'";
    }

    /**
     * Restore storage directories
     */
    private function restoreStorage(string $backupStorageDir): void
    {
        // Normalize path for cross-platform compatibility
        $backupStorageDir = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $backupStorageDir);
        
        $targetPath = storage_path('app');

        // Create backup of current storage before restoring
        // Store outside storage/app to avoid infinite recursion
        $currentBackupDir = storage_path('pre_restore_backups/pre_restore_backup_' . Carbon::now()->format('Y-m-d_H-i-s'));
        
        // Ensure the parent directory exists
        $parentDir = storage_path('pre_restore_backups');
        if (!File::exists($parentDir)) {
            File::makeDirectory($parentDir, 0755, true);
        }
        
        // Copy only contents of storage/app, excluding problematic directories
        if (File::exists($targetPath)) {
            $items = array_merge(
                File::directories($targetPath),
                File::files($targetPath)
            );
            
            foreach ($items as $item) {
                $basename = basename($item);
                
                // Skip directories that should not be backed up
                if ($basename === 'backups' || strpos($basename, 'pre_restore_backup_') === 0) {
                    continue;
                }
                
                $destination = $currentBackupDir . DIRECTORY_SEPARATOR . $basename;
                
                if (is_dir($item)) {
                    File::copyDirectory($item, $destination);
                } else {
                    File::copy($item, $destination);
                }
            }
        }

        try {
            // Clear current storage (except backups directory)
            // Note: pre_restore_backup directories are now stored outside storage/app, so no need to exclude them
            // But keep the check for safety in case old backups exist
            if (File::exists($targetPath)) {
                $items = File::directories($targetPath);
                foreach ($items as $item) {
                    $basename = basename($item);
                    // Use strpos for PHP 7.x compatibility
                    if ($basename !== 'backups' && strpos($basename, 'pre_restore_backup_') !== 0) {
                        File::deleteDirectory($item);
                    }
                }

                $files = File::files($targetPath);
                foreach ($files as $file) {
                    File::delete($file);
                }
            }

            // Restore from backup
            // Validate that the backup storage directory exists and is readable
            if (!File::exists($backupStorageDir)) {
                \Log::warning("Backup storage directory does not exist: {$backupStorageDir}. Skipping storage restore.");
                return; // Storage restore is optional, don't throw error
            }
            
            if (!is_readable($backupStorageDir)) {
                \Log::warning("Backup storage directory is not readable: {$backupStorageDir}. Skipping storage restore.");
                return; // Storage restore is optional, don't throw error
            }
            
            if (!is_dir($backupStorageDir)) {
                \Log::warning("Backup storage path is not a directory: {$backupStorageDir}. Skipping storage restore.");
                return; // Storage restore is optional, don't throw error
            }
            
            // Get directories and files from backup
            $directories = [];
            $files = [];
            
            try {
                $directories = File::directories($backupStorageDir);
            } catch (\Exception $e) {
                \Log::warning("Failed to get directories from backup storage: " . $e->getMessage());
                // Continue with empty directories array
            }
            
            try {
                $files = File::files($backupStorageDir);
            } catch (\Exception $e) {
                \Log::warning("Failed to get files from backup storage: " . $e->getMessage());
                // Continue with empty files array
            }
            
            $items = array_merge($directories, $files);
            
            if (empty($items)) {
                \Log::warning("Backup storage directory is empty: {$backupStorageDir}");
                // Don't throw error, just log warning - empty storage backup is acceptable
                return;
            }

            foreach ($items as $item) {
                $basename = basename($item);
                $destination = $targetPath . DIRECTORY_SEPARATOR . $basename;

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
     * Find pg_dump executable path (Windows support)
     */
    private function findPgDumpPath(): ?string
    {
        $envPgDumpPath = env('PG_DUMP_PATH');
        if ($envPgDumpPath && file_exists($envPgDumpPath)) {
            return $envPgDumpPath;
        }

        // First, try to find pg_dump in PATH
        $pgDump = $this->findExecutableInPath('pg_dump');
        if ($pgDump) {
            return $pgDump;
        }

        // On Windows, check common PostgreSQL installation paths
        if (PHP_OS_FAMILY === 'Windows') {
            $commonPaths = [
                'C:\\Program Files\\PostgreSQL',
                'C:\\Program Files (x86)\\PostgreSQL',
            ];

            foreach ($commonPaths as $basePath) {
                if (is_dir($basePath)) {
                    // Look for PostgreSQL versions (e.g., 14, 15, 16, etc.)
                    $versions = glob($basePath . '\\*', GLOB_ONLYDIR);
                    foreach ($versions as $versionPath) {
                        $pgDumpPath = $versionPath . '\\bin\\pg_dump.exe';
                        if (file_exists($pgDumpPath)) {
                            return $pgDumpPath;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Find executable in system PATH
     */
    private function findExecutableInPath(string $executable): ?string
    {
        $pathEnv = getenv('PATH');
        if (!$pathEnv) {
            return null;
        }

        $paths = explode(PATH_SEPARATOR, $pathEnv);
        $extension = PHP_OS_FAMILY === 'Windows' ? '.exe' : '';

        foreach ($paths as $path) {
            $fullPath = $path . DIRECTORY_SEPARATOR . $executable . $extension;
            if (file_exists($fullPath) && is_executable($fullPath)) {
                return $fullPath;
            }
        }

        return null;
    }

    /**
     * Find psql executable path (Windows support)
     */
    private function findPsqlPath(): ?string
    {
        // First, try to find psql in PATH
        $psql = $this->findExecutableInPath('psql');
        if ($psql) {
            return $psql;
        }

        // On Windows, check common PostgreSQL installation paths
        if (PHP_OS_FAMILY === 'Windows') {
            $commonPaths = [
                'C:\\Program Files\\PostgreSQL',
                'C:\\Program Files (x86)\\PostgreSQL',
            ];

            foreach ($commonPaths as $basePath) {
                if (is_dir($basePath)) {
                    // Look for PostgreSQL versions (e.g., 14, 15, 16, etc.)
                    $versions = glob($basePath . '\\*', GLOB_ONLYDIR);
                    foreach ($versions as $versionPath) {
                        $psqlPath = $versionPath . '\\bin\\psql.exe';
                        if (file_exists($psqlPath)) {
                            return $psqlPath;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Find pg_restore executable path (Windows support)
     */
    private function findPgRestorePath(): ?string
    {
        // First, try to find pg_restore in PATH
        $pgRestore = $this->findExecutableInPath('pg_restore');
        if ($pgRestore) {
            return $pgRestore;
        }

        // On Windows, check common PostgreSQL installation paths
        if (PHP_OS_FAMILY === 'Windows') {
            $commonPaths = [
                'C:\\Program Files\\PostgreSQL',
                'C:\\Program Files (x86)\\PostgreSQL',
            ];

            foreach ($commonPaths as $basePath) {
                if (is_dir($basePath)) {
                    // Look for PostgreSQL versions (e.g., 14, 15, 16, etc.)
                    $versions = glob($basePath . '\\*', GLOB_ONLYDIR);
                    foreach ($versions as $versionPath) {
                        $pgRestorePath = $versionPath . '\\bin\\pg_restore.exe';
                        if (file_exists($pgRestorePath)) {
                            return $pgRestorePath;
                        }
                    }
                }
            }
        }

        return null;
    }


    /**
     * Get pg_dump version string
     */
    private function getPgDumpVersion(string $pgDumpPath): ?string
    {
        try {
            $process = Process::fromShellCommandline(sprintf('%s --version', escapeshellarg($pgDumpPath)));
            $process->setTimeout(10);
            $process->run();
            $output = trim($process->getOutput());
            return $output !== '' ? $output : null;
        } catch (\Exception $e) {
            \Log::warning('Failed to read pg_dump version: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Get pg_restore version string
     */
    private function getPgRestoreVersion(string $pgRestorePath): ?string
    {
        try {
            $process = Process::fromShellCommandline(sprintf('%s --version', escapeshellarg($pgRestorePath)));
            $process->setTimeout(10);
            $process->run();
            $output = trim($process->getOutput());
            return $output !== '' ? $output : null;
        } catch (\Exception $e) {
            \Log::warning('Failed to read pg_restore version: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Backup database using pg_dump
     */
    private function backupDatabase(string $backupDir): string
    {
        // Read database credentials directly from .env file
        $dbConnection = config('database.default');
        $dbConfig = config("database.connections.{$dbConnection}");

        // Use env() directly to ensure we get the actual .env values
        $dbHost = env('DB_HOST', $dbConfig['host'] ?? '127.0.0.1');
        $dbPort = env('DB_PORT', $dbConfig['port'] ?? '5432');
        $dbName = env('DB_DATABASE', $dbConfig['database'] ?? '');
        $dbUser = env('DB_USERNAME', $dbConfig['username'] ?? '');
        $dbPassword = env('DB_PASSWORD', $dbConfig['password'] ?? '');

        // Use plain SQL format for better compatibility across PostgreSQL versions
        // Plain SQL format works with any PostgreSQL version and doesn't have version compatibility issues
        $backupFile = $backupDir . DIRECTORY_SEPARATOR . 'database.sql';

        // Use pg_dump for PostgreSQL
        if ($dbConnection === 'pgsql') {
            // Find pg_dump executable
            $pgDumpPath = $this->findPgDumpPath();
            
            if (!$pgDumpPath) {
                $errorMessage = 'pg_dump executable not found. ';
                if (PHP_OS_FAMILY === 'Windows') {
                    $errorMessage .= 'Please ensure PostgreSQL is installed and pg_dump.exe is available. ';
                    $errorMessage .= 'You can either: 1) Add PostgreSQL bin directory to your system PATH, ';
                    $errorMessage .= 'or 2) Install PostgreSQL if it is not already installed.';
                } else {
                    $errorMessage .= 'Please install PostgreSQL client tools or add pg_dump to your system PATH.';
                }
                throw new \Exception($errorMessage);
            }

            $pgDumpVersion = $this->getPgDumpVersion($pgDumpPath);

            // On Windows, use a temporary batch file to ensure environment variables are set correctly
            // This bypasses Laravel Process issues with environment variables on Windows
            if (PHP_OS_FAMILY === 'Windows') {
                // Create temporary batch file
                // Normalize temp directory path for Windows
                $tempDir = str_replace('/', '\\', sys_get_temp_dir());
                $batchFile = $tempDir . '\\pg_dump_backup_' . uniqid() . '.bat';
                // Escape password for batch file (double quotes and special characters)
                $escapedPassword = str_replace(['"', '%', '!', '^', '&'], ['""', '%%', '!!', '^^', '^&'], $dbPassword);
                // Normalize backup file path for Windows (use backslashes, escape backslashes and quotes)
                $normalizedBackupFile = str_replace('/', '\\', $backupFile);
                $escapedBackupFile = str_replace(['\\', '"'], ['\\\\', '\\"'], $normalizedBackupFile);
                // Redirect stderr to stdout (2>&1) to capture all output
                // Note: Don't use escapeshellarg() for paths in batch files - it adds extra quotes
                // Use plain SQL format (-F p) for better compatibility across PostgreSQL versions
                // IMPORTANT: include --clean --if-exists so restores can be applied on non-empty DBs.
                // Also include --no-owner/--no-privileges to avoid role/permission issues on target systems.
                $batchContent = sprintf(
                    "@echo off\nset PGPASSWORD=%s\n\"%s\" -h %s -p %s -U %s -d %s --clean --if-exists --no-owner --no-privileges -F p -f \"%s\" 2>&1\n",
                    $escapedPassword,
                    $pgDumpPath,
                    escapeshellarg($dbHost),
                    escapeshellarg($dbPort),
                    escapeshellarg($dbUser),
                    escapeshellarg($dbName),
                    $escapedBackupFile
                );
                file_put_contents($batchFile, $batchContent);
                
                // Execute batch file using cmd /c to ensure proper execution on Windows
                // Normalize batch file path for Windows
                $normalizedBatchFile = str_replace('/', '\\', $batchFile);
                
                // Use exec() directly to bypass Laravel Process issues on Windows
                // This is more reliable for batch file execution on Windows
                $command = 'cmd /c "' . $normalizedBatchFile . '"';
                
                $output = [];
                $returnVar = 0;
                exec($command . ' 2>&1', $output, $returnVar);
                $combinedOutput = implode("\n", $output);
                
                // Create a mock Process object for compatibility with existing error handling code
                // We'll check the return code and output manually
                if ($returnVar !== 0) {
                    $errorOutput = $combinedOutput;
                    $output = '';
                } else {
                    $errorOutput = '';
                    $output = $combinedOutput;
                }
                
                // Create a Process-like object for compatibility
                // Since we already executed via exec(), this is just a wrapper for compatibility
                $process = new class($returnVar, $output, $errorOutput) {
                    private $exitCode;
                    private $output;
                    private $errorOutput;
                    private $hasRun = false;
                    
                    public function __construct($exitCode, $output, $errorOutput) {
                        $this->exitCode = $exitCode;
                        $this->output = $output;
                        $this->errorOutput = $errorOutput;
                    }
                    
                    public function run($callback = null) {
                        // Already executed via exec(), so this is a no-op
                        // But we can call the callback if provided for compatibility
                        if ($callback && is_callable($callback)) {
                            // Call callback with output if any
                            if (!empty($this->output)) {
                                $callback(1, $this->output); // 1 = stdout
                            }
                            if (!empty($this->errorOutput)) {
                                $callback(2, $this->errorOutput); // 2 = stderr
                            }
                        }
                        $this->hasRun = true;
                    }
                    
                    public function isSuccessful() {
                        return $this->exitCode === 0;
                    }
                    
                    public function getExitCode() {
                        return $this->exitCode;
                    }
                    
                    public function getOutput() {
                        return $this->output;
                    }
                    
                    public function getErrorOutput() {
                        return $this->errorOutput;
                    }
                };
            } else {
                // On Unix-like systems, use Process constructor with command array
                // Use plain SQL format (-F p) for better compatibility across PostgreSQL versions
                // IMPORTANT: include --clean --if-exists so restores can be applied on non-empty DBs.
                // Also include --no-owner/--no-privileges to avoid role/permission issues on target systems.
                $commandArray = [
                    $pgDumpPath,
                    '-h', $dbHost,
                    '-p', $dbPort,
                    '-U', $dbUser,
                    '-d', $dbName,
                    '--clean',
                    '--if-exists',
                    '--no-owner',
                    '--no-privileges',
                    '-F', 'p',  // Plain SQL format for maximum compatibility
                    '-f', $backupFile
                ];
                
                $process = new Process($commandArray, null, ['PGPASSWORD' => $dbPassword]);
                $process->setTimeout(300); // 5 minutes timeout
                $process->run();
            }

            // Clean up temporary batch file on Windows
            if (PHP_OS_FAMILY === 'Windows' && isset($batchFile) && file_exists($batchFile)) {
                @unlink($batchFile);
            }
        } elseif ($dbConnection === 'mysql') {
            // Find mysqldump executable
            $mysqldumpPath = $this->findExecutableInPath('mysqldump');
            
            if (!$mysqldumpPath) {
                $errorMessage = 'mysqldump executable not found. ';
                $errorMessage .= 'Please install MySQL client tools or add mysqldump to your system PATH.';
                throw new \Exception($errorMessage);
            }
            
            // Use mysqldump for MySQL
            // Note: MySQL password is passed via -p flag (no space between -p and password)
            $command = sprintf(
                '%s -h %s -P %s -u %s -p%s %s > %s',
                escapeshellarg($mysqldumpPath),
                escapeshellarg($dbHost),
                escapeshellarg($dbPort),
                escapeshellarg($dbUser),
                escapeshellarg($dbPassword),
                escapeshellarg($dbName),
                escapeshellarg($backupFile)
            );
            
            $process = Process::fromShellCommandline($command);
            $process->setTimeout(300); // 5 minutes timeout
            $process->run();
        } else {
            throw new \Exception("Unsupported database connection: {$dbConnection}");
        }

        // Check if command was successful
        if (!$process->isSuccessful()) {
            $errorOutput = $process->getErrorOutput();
            $output = $process->getOutput();
            
            
            // Combine both error output and standard output for full error message
            $fullError = trim($errorOutput);
            if ($output && !$fullError) {
                $fullError = trim($output);
            } elseif ($output && $fullError) {
                $fullError = trim($errorOutput) . "\n" . trim($output);
            }
            
            $errorMessage = 'Database backup command failed. ';
            if ($fullError) {
                $errorMessage .= 'Error: ' . $fullError;
            } else {
                $errorMessage .= 'Exit code: ' . $process->getExitCode();
            }
            
            // Add more context for common errors
            if (str_contains($errorOutput, 'password authentication failed')) {
                $errorMessage .= ' Please check your database credentials.';
            } elseif (str_contains($errorOutput, 'could not connect')) {
                $errorMessage .= ' Please check your database connection settings.';
            }
            
            throw new \Exception($errorMessage);
        }

        return $backupFile;
    }

    /**
     * Backup storage directories
     */
    private function backupStorage(string $backupDir): string
    {
        $storageBackupDir = $backupDir . DIRECTORY_SEPARATOR . 'storage';
        
        // Ensure backup directory exists
        if (!File::exists($storageBackupDir)) {
            try {
                File::makeDirectory($storageBackupDir, 0775, true);
            } catch (\Exception $e) {
                \Log::error('Failed to create storage backup directory: ' . $e->getMessage(), [
                    'path' => $storageBackupDir
                ]);
                throw new \Exception('Failed to create storage backup directory: ' . $e->getMessage());
            }
        }

        // Copy storage/app directory
        $sourcePath = storage_path('app');
        $destPath = $storageBackupDir . DIRECTORY_SEPARATOR . 'app';

        // Validate paths
        if (empty($sourcePath) || empty($destPath)) {
            throw new \Exception('Invalid source or destination path for storage backup');
        }

        // Ensure source exists
        if (!File::exists($sourcePath)) {
            \Log::warning('Storage source path does not exist: ' . $sourcePath);
            return $storageBackupDir;
        }

        // Ensure destination parent directory exists
        $destParent = dirname($destPath);
        if (!File::exists($destParent)) {
            try {
                File::makeDirectory($destParent, 0775, true);
            } catch (\Exception $e) {
                \Log::error('Failed to create destination parent directory: ' . $e->getMessage(), [
                    'path' => $destParent
                ]);
                throw new \Exception('Failed to create destination directory: ' . $e->getMessage());
            }
        }

        try {
            // Copy storage/app directory, excluding backups and restore_temp to avoid recursion
            // Use manual copy with filtering to exclude backup directories
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($sourcePath, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );

            foreach ($iterator as $item) {
                $sourceItem = $item->getPathname();
                $relativePath = substr($sourceItem, strlen($sourcePath) + 1);
                
                // Skip backups and restore_temp directories to avoid recursion
                if (strpos($relativePath, 'backups') === 0 || strpos($relativePath, 'restore_temp') === 0) {
                    continue;
                }
                
                $destItem = $destPath . DIRECTORY_SEPARATOR . $relativePath;
                
                if ($item->isDir()) {
                    if (!File::exists($destItem)) {
                        File::makeDirectory($destItem, 0775, true);
                    }
                } else {
                    // Copy file
                    $destDir = dirname($destItem);
                    if (!File::exists($destDir)) {
                        File::makeDirectory($destDir, 0775, true);
                    }
                    copy($sourceItem, $destItem);
                }
            }
        } catch (\Exception $e) {
            \Log::error('Failed to copy storage directory: ' . $e->getMessage(), [
                'source' => $sourcePath,
                'destination' => $destPath,
                'trace' => $e->getTraceAsString()
            ]);
            throw new \Exception('Failed to copy storage directory: ' . $e->getMessage());
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
