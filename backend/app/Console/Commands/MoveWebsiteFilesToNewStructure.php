<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Move existing website files from flat website/images and website/documents
 * to the new structured layout: library/covers, library/pdfs, media/categories, etc.
 * Run once per environment after deploying the new storage structure.
 */
class MoveWebsiteFilesToNewStructure extends Command
{
    protected $signature = 'website:move-files-to-new-structure
                            {--dry-run : Show what would be moved without moving files or updating DB}';

    protected $description = 'Move website files from website/images and website/documents to new folder structure';

    private const DISK = 'public';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        if ($dryRun) {
            $this->info('DRY RUN - No files will be moved and no DB updates will be made.');
            $this->newLine();
        }

        $migrated = 0;
        $skipped = 0;
        $errors = 0;

        // Books: cover_image_path -> library/covers, file_path -> library/pdfs
        foreach (DB::table('website_public_books')->whereNull('deleted_at')->get() as $row) {
            if ($row->cover_image_path && $this->isLegacyWebsitePath($row->cover_image_path, 'images')) {
                $newPath = $this->replaceLegacySegment($row->cover_image_path, 'website/images', 'website/library/covers');
                $result = $this->moveAndUpdate($row->cover_image_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_public_books')->where('id', $row->id)->update(['cover_image_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
            if ($row->file_path && $this->isLegacyWebsitePath($row->file_path, 'documents')) {
                $newPath = $this->replaceLegacySegment($row->file_path, 'website/documents', 'website/library/pdfs');
                $result = $this->moveAndUpdate($row->file_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_public_books')->where('id', $row->id)->update(['file_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
        }

        // Media: file_path -> media/items (no category in old paths)
        foreach (DB::table('website_media')->whereNull('deleted_at')->get() as $row) {
            if ($row->file_path && $this->isLegacyWebsitePath($row->file_path, 'images')) {
                $newPath = $this->replaceLegacySegment($row->file_path, 'website/images', 'website/media/items');
                $result = $this->moveAndUpdate($row->file_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_media')->where('id', $row->id)->update(['file_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
        }

        // Media categories: cover_image_path -> media/categories/{id}
        foreach (DB::table('website_media_categories')->whereNull('deleted_at')->get() as $row) {
            if ($row->cover_image_path && $this->isLegacyWebsitePath($row->cover_image_path, 'images')) {
                $newPath = $this->replaceLegacySegment($row->cover_image_path, 'website/images', 'website/media/categories/' . $row->id);
                $result = $this->moveAndUpdate($row->cover_image_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_media_categories')->where('id', $row->id)->update(['cover_image_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
        }

        // Courses: cover_image_path -> courses/{id}
        foreach (DB::table('website_courses')->whereNull('deleted_at')->get() as $row) {
            if ($row->cover_image_path && $this->isLegacyWebsitePath($row->cover_image_path, 'images')) {
                $newPath = $this->replaceLegacySegment($row->cover_image_path, 'website/images', 'website/courses/' . $row->id);
                $result = $this->moveAndUpdate($row->cover_image_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_courses')->where('id', $row->id)->update(['cover_image_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
        }

        // Pages: seo_image_path -> pages/{id}
        foreach (DB::table('website_pages')->whereNull('deleted_at')->get() as $row) {
            if ($row->seo_image_path && $this->isLegacyWebsitePath($row->seo_image_path, 'images')) {
                $newPath = $this->replaceLegacySegment($row->seo_image_path, 'website/images', 'website/pages/' . $row->id);
                $result = $this->moveAndUpdate($row->seo_image_path, $newPath, $dryRun);
                if ($result === 'migrated') {
                    DB::table('website_pages')->where('id', $row->id)->update(['seo_image_path' => $newPath]);
                    $migrated++;
                } elseif ($result === 'skipped') {
                    $skipped++;
                } else {
                    $errors++;
                }
            }
        }

        $this->newLine();
        $this->info('Summary:');
        $this->table(['Metric', 'Count'], [
            ['Migrated', $migrated],
            ['Skipped', $skipped],
            ['Errors', $errors],
        ]);

        if ($dryRun) {
            $this->warn('Dry run complete. Run without --dry-run to perform the migration.');
        }

        return 0;
    }

    private function isLegacyWebsitePath(string $path, string $segment): bool
    {
        return str_contains($path, '/website/' . $segment . '/');
    }

    private function replaceLegacySegment(string $path, string $old, string $new): string
    {
        return str_replace($old, $new, $path);
    }

    /**
     * @return 'migrated'|'skipped'|'error'
     */
    private function moveAndUpdate(string $oldPath, string $newPath, bool $dryRun): string
    {
        if ($oldPath === $newPath) {
            return 'skipped';
        }

        if (!Storage::disk(self::DISK)->exists($oldPath)) {
            if (!$dryRun) {
                $this->warn("File not found: {$oldPath}");
            }
            return 'skipped';
        }

        if ($dryRun) {
            return 'migrated';
        }

        $dir = dirname($newPath);
        if (!Storage::disk(self::DISK)->exists($dir)) {
            Storage::disk(self::DISK)->makeDirectory($dir);
        }
        $contents = Storage::disk(self::DISK)->get($oldPath);
        Storage::disk(self::DISK)->put($newPath, $contents);
        Storage::disk(self::DISK)->delete($oldPath);

        return 'migrated';
    }
}
