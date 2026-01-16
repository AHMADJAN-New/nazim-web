<?php

namespace Database\Seeders;

use App\Models\HelpCenterArticle;
use App\Models\HelpCenterCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class HelpCenterArticleSeeder extends Seeder
{
    /**
     * Supported languages (must match folder structure)
     */
    protected array $languages = ['en', 'ps', 'fa', 'ar'];

    public function run(): void
    {
        $this->command->info('Seeding help center articles from MD files (global, per-file)...');

        $baseDir = resource_path('help-center/articles');
        if (!File::isDirectory($baseDir)) {
            $this->command->warn("Base directory not found: {$baseDir}");
            return;
        }

        // Soft-delete ALL existing global help center articles.
        // This prevents stale route-based articles from showing up in "All Articles".
        $now = now();
        HelpCenterArticle::whereNull('organization_id')
            ->whereNull('deleted_at')
            ->update(['deleted_at' => $now, 'updated_at' => $now]);

        $created = 0;
        $restored = 0;
        $skipped = 0;
        $missingCategory = 0;

        $folderPaths = File::directories($baseDir);
        foreach ($folderPaths as $folderPath) {
            $folderSlug = basename($folderPath);

            $category = HelpCenterCategory::whereNull('organization_id')
                ->whereNull('deleted_at')
                ->where('slug', $folderSlug)
                ->first();

            if (!$category) {
                $this->command->warn("  ⚠ Missing category for folder '{$folderSlug}' - run HelpCenterCategorySeeder first.");
                $missingCategory++;
                continue;
            }

            foreach ($this->languages as $lang) {
                $langDir = $folderPath . DIRECTORY_SEPARATOR . $lang;
                if (!File::isDirectory($langDir)) {
                    continue;
                }

                $files = File::files($langDir);
                foreach ($files as $file) {
                    if (strtolower($file->getExtension()) !== 'md') continue;

                    $articleSlug = pathinfo($file->getFilename(), PATHINFO_FILENAME);
                    $content = File::get($file->getPathname());

                    [$title, $excerpt] = $this->extractTitleAndExcerpt($articleSlug, $content);

                    $existing = HelpCenterArticle::withTrashed()
                        ->whereNull('organization_id')
                        ->where('category_id', $category->id)
                        ->where('slug', $articleSlug)
                        ->where('language', $lang)
                        ->first();

                    $payload = [
                        'organization_id' => null,
                        'category_id' => $category->id,
                        'title' => $title,
                        'slug' => $articleSlug,
                        'excerpt' => $excerpt,
                        'content' => $content,
                        'content_type' => 'markdown',
                        'language' => $lang,
                        'is_published' => true,
                        'status' => 'published',
                        'is_featured' => false,
                        'is_pinned' => false,
                        'visibility' => 'org_users',
                        'order' => 0,
                        'tags' => [],
                        'view_count' => 0,
                        'helpful_count' => 0,
                        'not_helpful_count' => 0,
                        'published_at' => $now,
                    ];

                    if ($existing) {
                        if ($existing->deleted_at) {
                            $existing->restore();
                            $restored++;
                        } else {
                            $skipped++;
                        }
                        $existing->fill($payload);
                        $existing->save();
                        continue;
                    }

                    HelpCenterArticle::create($payload);
                    $created++;
                }
            }
        }

        $this->command->info("✅ Help center articles seeded successfully!");
        $this->command->info("   Created: {$created}");
        $this->command->info("   Restored/Updated: {$restored}");
        $this->command->info("   Skipped (already active): {$skipped}");
        if ($missingCategory > 0) {
            $this->command->warn("   Missing categories: {$missingCategory}");
        }
    }

    private function extractTitleAndExcerpt(string $slug, string $mdContent): array
    {
        $lines = preg_split('/\R/u', $mdContent) ?: [];

        $title = Str::of(str_replace('-', ' ', $slug))->title()->toString();
        $excerpt = null;

        // Title: first markdown heading "# ..."
        foreach ($lines as $line) {
            $trim = trim($line);
            if ($trim === '') continue;
            if (str_starts_with($trim, '# ')) {
                $title = trim(substr($trim, 2));
            }
            break;
        }

        // Excerpt: first non-empty line after title (skip headings)
        $seenFirst = false;
        foreach ($lines as $line) {
            $trim = trim($line);
            if ($trim === '') continue;

            if (!$seenFirst) {
                $seenFirst = true;
                // Skip the first line (title) if it is a heading
                continue;
            }

            if (str_starts_with($trim, '#')) continue;
            $excerpt = Str::limit($trim, 180);
            break;
        }

        return [$title, $excerpt];
    }
}


