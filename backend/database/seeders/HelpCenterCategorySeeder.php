<?php

namespace Database\Seeders;

use App\Models\HelpCenterCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class HelpCenterCategorySeeder extends Seeder
{
    /**
     * Seed the help_center_categories table.
     *
     * Creates ONLY folder-level global help center categories (organization_id = NULL),
     * based on: backend/resources/help-center/articles/{folder}/{lang}/*.md
     *
     * This enforces the intended UX:
     * - Sidebar categories are few (e.g., Finance)
     * - Each category contains many articles (one per MD file)
     */
    public function run(): void
    {
        $this->command->info('Seeding help center categories from folder structure (global)...');
        $this->syncFolderCategories();
        $this->command->info('✅ Help center categories seeded successfully!');
    }

    protected function syncFolderCategories(): void
    {
        $baseDir = resource_path('help-center/articles');
        if (!File::isDirectory($baseDir)) {
            $this->command->warn("Help center articles base directory not found: {$baseDir}");
            return;
        }

        $folderMeta = $this->folderMeta();
        $folderPaths = File::directories($baseDir);
        $folderSlugs = array_values(array_map(static fn ($p) => basename($p), $folderPaths));
        sort($folderSlugs);

        $allowed = $folderSlugs;

        $created = 0;
        $updated = 0;

        foreach ($folderSlugs as $slug) {
            $meta = $folderMeta[$slug] ?? [
                'name' => $this->humanizeFolderName($slug),
                'description' => null,
                'icon' => null,
                'color' => null,
                'order' => 1000,
            ];

            $existing = HelpCenterCategory::withTrashed()
                ->whereNull('organization_id')
                ->where('slug', $slug)
                ->first();

            if ($existing) {
                if ($existing->deleted_at) {
                    $existing->restore();
                }

                $existing->fill([
                    'name' => $meta['name'],
                    'description' => $meta['description'],
                    'icon' => $meta['icon'],
                    'color' => $meta['color'],
                    'order' => $meta['order'],
                    'is_active' => true,
                    'parent_id' => null,
                ]);
                $existing->save();
                $updated++;
            } else {
                HelpCenterCategory::create([
                    'organization_id' => null,
                    'name' => $meta['name'],
                    'slug' => $slug,
                    'description' => $meta['description'],
                    'icon' => $meta['icon'],
                    'color' => $meta['color'],
                    'order' => $meta['order'],
                    'is_active' => true,
                    'parent_id' => null,
                    'article_count' => 0,
                ]);
                $created++;
            }
        }

        // Soft-delete old route-based categories and any nested categories.
        $now = now();
        HelpCenterCategory::whereNull('organization_id')
            ->whereNull('deleted_at')
            ->where(function ($q) use ($allowed) {
                $q->whereNotIn('slug', $allowed)->orWhereNotNull('parent_id');
            })
            ->update(['deleted_at' => $now, 'updated_at' => $now]);

        $this->command->info("  ✓ Folder categories: Created {$created}, Updated {$updated}, Allowed " . count($allowed));
    }

    /**
     * Folder metadata for UI ordering/icon/color.
     * Note: icon is stored as a string (lucide icon name) for the frontend to interpret.
     */
    protected function folderMeta(): array
    {
        return [
            'general' => ['name' => 'General', 'description' => 'General help articles', 'icon' => 'help-circle', 'color' => 'gray', 'order' => 1],
            'students' => ['name' => 'Students', 'description' => 'Student module help articles', 'icon' => 'users', 'color' => 'blue', 'order' => 10],
            'staff' => ['name' => 'Staff', 'description' => 'Staff module help articles', 'icon' => 'briefcase', 'color' => 'purple', 'order' => 20],
            'attendance' => ['name' => 'Attendance', 'description' => 'Attendance module help articles', 'icon' => 'user-check', 'color' => 'orange', 'order' => 30],
            'finance' => ['name' => 'Finance', 'description' => 'Finance module help articles', 'icon' => 'dollar-sign', 'color' => 'green', 'order' => 40],
            'academic' => ['name' => 'Academic', 'description' => 'Academic module help articles', 'icon' => 'graduation-cap', 'color' => 'indigo', 'order' => 50],
            'exams' => ['name' => 'Exams', 'description' => 'Exams module help articles', 'icon' => 'file-text', 'color' => 'red', 'order' => 60],
            'library' => ['name' => 'Library', 'description' => 'Library module help articles', 'icon' => 'book-open', 'color' => 'amber', 'order' => 70],
            'hostel' => ['name' => 'Hostel', 'description' => 'Hostel module help articles', 'icon' => 'building', 'color' => 'slate', 'order' => 80],
            'dms' => ['name' => 'DMS', 'description' => 'Document management help articles', 'icon' => 'folder', 'color' => 'slate', 'order' => 90],
            'events' => ['name' => 'Events', 'description' => 'Events module help articles', 'icon' => 'calendar', 'color' => 'pink', 'order' => 100],
            'assets' => ['name' => 'Assets', 'description' => 'Assets module help articles', 'icon' => 'package', 'color' => 'zinc', 'order' => 110],
            'subscription' => ['name' => 'Subscription', 'description' => 'Subscription help articles', 'icon' => 'badge-check', 'color' => 'cyan', 'order' => 120],
            'settings' => ['name' => 'Settings', 'description' => 'Settings help articles', 'icon' => 'settings', 'color' => 'gray', 'order' => 130],
            'reports' => ['name' => 'Reports', 'description' => 'Reporting help articles', 'icon' => 'file-bar-chart', 'color' => 'gray', 'order' => 140],
            'courses' => ['name' => 'Courses', 'description' => 'Courses help articles', 'icon' => 'layers', 'color' => 'gray', 'order' => 150],
            'graduation' => ['name' => 'Graduation', 'description' => 'Graduation help articles', 'icon' => 'graduation-cap', 'color' => 'gray', 'order' => 160],
            'certificates' => ['name' => 'Certificates', 'description' => 'Certificates help articles', 'icon' => 'award', 'color' => 'gray', 'order' => 170],
            'id-cards' => ['name' => 'ID Cards', 'description' => 'ID cards help articles', 'icon' => 'id-card', 'color' => 'gray', 'order' => 180],
            'leave' => ['name' => 'Leave', 'description' => 'Leave help articles', 'icon' => 'calendar-x', 'color' => 'gray', 'order' => 190],
            'admin' => ['name' => 'Admin', 'description' => 'Admin help articles', 'icon' => 'shield', 'color' => 'gray', 'order' => 200],
        ];
    }

    protected function humanizeFolderName(string $slug): string
    {
        $name = Str::of(str_replace('-', ' ', $slug))->title()->toString();
        return str_replace(['Dms', 'Id Cards'], ['DMS', 'ID Cards'], $name);
    }
}


