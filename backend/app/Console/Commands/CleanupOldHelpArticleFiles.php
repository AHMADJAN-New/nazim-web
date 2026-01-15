<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class CleanupOldHelpArticleFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'help:cleanup-old-files';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove old MD files that are directly in category folders (not in language subfolders)';

    /**
     * Supported language folders
     */
    protected $languageFolders = ['en', 'ps', 'fa', 'ar'];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Cleaning up old help article MD files...');

        $baseDir = resource_path('help-center/articles');
        $deleted = 0;
        $errors = 0;

        if (!File::isDirectory($baseDir)) {
            $this->error("Base directory not found: {$baseDir}");
            return 1;
        }

        // Get all category folders
        $categoryFolders = File::directories($baseDir);

        foreach ($categoryFolders as $categoryFolder) {
            $categoryName = basename($categoryFolder);
            
            // Get all files directly in the category folder
            $files = File::files($categoryFolder);
            
            foreach ($files as $file) {
                // Only delete .md files
                if ($file->getExtension() !== 'md') {
                    continue;
                }

                $fileName = $file->getFilename();
                $filePath = $file->getPathname();

                // Check if this file exists in any language subfolder
                $existsInLanguageFolder = false;
                foreach ($this->languageFolders as $lang) {
                    $langFilePath = $categoryFolder . '/' . $lang . '/' . $fileName;
                    if (File::exists($langFilePath)) {
                        $existsInLanguageFolder = true;
                        break;
                    }
                }

                // Delete the file if it exists in language folders (it's the old version)
                if ($existsInLanguageFolder) {
                    try {
                        File::delete($filePath);
                        $this->line("  ✓ Deleted: {$categoryName}/{$fileName}");
                        $deleted++;
                    } catch (\Exception $e) {
                        $this->error("  ✗ Failed to delete {$categoryName}/{$fileName}: {$e->getMessage()}");
                        $errors++;
                    }
                } else {
                    // File doesn't exist in language folders, might be orphaned
                    // Ask user or just delete it
                    $this->warn("  ⚠ Orphaned file (no language version found): {$categoryName}/{$fileName}");
                }
            }
        }

        $this->info("✅ Cleanup complete!");
        $this->info("   Deleted: {$deleted} files");
        if ($errors > 0) {
            $this->warn("   Errors: {$errors} files");
        }

        return 0;
    }
}
