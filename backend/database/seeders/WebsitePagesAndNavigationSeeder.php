<?php

namespace Database\Seeders;

use App\Models\WebsiteMenuLink;
use App\Models\WebsitePage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebsitePagesAndNavigationSeeder extends Seeder
{
    /**
     * Seed website pages and navigation for a specific school
     *
     * @param string $organizationId
     * @param string $schoolId
     * @param string $language Language code (en, ps, fa, ar) - default: 'en'
     * @return void
     */
    public function seedForSchool(string $organizationId, string $schoolId, string $language = 'en'): void
    {
        Log::info("Starting website pages and navigation seeding", [
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'language' => $language,
        ]);

        try {
            $this->seedPages($organizationId, $schoolId, $language);
            $this->seedNavigation($organizationId, $schoolId, $language);

            Log::info("Successfully completed website pages and navigation seeding", [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'language' => $language,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to seed website pages and navigation', [
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'language' => $language,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Seed all required static pages
     *
     * @param string $organizationId
     * @param string $schoolId
     * @param string $language
     * @return void
     */
    protected function seedPages(string $organizationId, string $schoolId, string $language = 'en'): void
    {
        // CRITICAL: Delete any existing static pages for feature pages
        // Feature pages have their own routes and components, so static pages would conflict
        $featurePageSlugs = ['library', 'programs', 'scholars', 'alumni', 'donate', 'fatwas', 'ask_fatwa'];
        $deletedCount = WebsitePage::where('school_id', $schoolId)
            ->whereIn('slug', $featurePageSlugs)
            ->delete();

        if ($deletedCount > 0) {
            Log::info("Deleted {$deletedCount} conflicting feature page static entries for school {$schoolId}");
        }

        $pages = $this->getPagesData($language);
        $createdCount = 0;
        $updatedCount = 0;

        foreach ($pages as $pageData) {
            $existing = WebsitePage::where('school_id', $schoolId)
                ->where('slug', $pageData['slug'])
                ->first();

            $page = WebsitePage::updateOrCreate(
                [
                    'school_id' => $schoolId,
                    'slug' => $pageData['slug'],
                ],
                [
                    'organization_id' => $organizationId,
                    'title' => $pageData['title'],
                    'content_json' => $pageData['content_json'],
                    'seo_title' => $pageData['seo_title'] ?? null,
                    'seo_description' => $pageData['seo_description'] ?? null,
                    'status' => $pageData['status'] ?? 'published',
                    'published_at' => now(),
                    'created_by' => null,
                    'updated_by' => null,
                ]
            );

            if ($existing) {
                $updatedCount++;
                Log::debug("Updated website page: {$pageData['slug']} for school: {$schoolId}");
            } else {
                $createdCount++;
                Log::debug("Created website page: {$pageData['slug']} for school: {$schoolId}");
            }
        }

        Log::info("Website pages seeding completed for school {$schoolId}", [
            'created' => $createdCount,
            'updated' => $updatedCount,
            'total' => count($pages),
            'language' => $language,
        ]);

        if ($this->command) {
            $this->command->info("  ✓ Website pages: {$createdCount} created, {$updatedCount} updated");
        }
    }

    /**
     * Seed navigation menu links with proper hierarchy
     *
     * @param string $organizationId
     * @param string $schoolId
     * @param string $language
     * @return void
     */
    protected function seedNavigation(string $organizationId, string $schoolId, string $language = 'en'): void
    {
        $menuItems = $this->getNavigationData($language);
        $createdCount = 0;
        $updatedCount = 0;
        $skippedCount = 0;
        $deletedCount = 0;

        // CRITICAL: Delete all existing menu links for this school to prevent duplicates
        // This ensures we start fresh with the new language
        $deletedCount = WebsiteMenuLink::where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->delete();
        
        if ($deletedCount > 0) {
            Log::info("Deleted {$deletedCount} existing menu links for school {$schoolId} before seeding in language: {$language}");
        }

        // First, create parent items (those without parent_id)
        $parentMap = [];
        foreach ($menuItems as $item) {
            if (empty($item['parent_id'])) {
                // Match on URL + parent_id instead of label to prevent duplicates across languages
                $menuLink = WebsiteMenuLink::updateOrCreate(
                    [
                        'school_id' => $schoolId,
                        'url' => $item['url'],
                        'parent_id' => null,
                    ],
                    [
                        'organization_id' => $organizationId,
                        'label' => $item['label'],
                        'sort_order' => $item['sort_order'] ?? 0,
                        'is_visible' => $item['is_visible'] ?? true,
                    ]
                );
                $parentMap[$item['key']] = $menuLink->id;

                if ($menuLink->wasRecentlyCreated) {
                    $createdCount++;
                    Log::debug("Created menu link: {$item['label']} for school: {$schoolId}");
                } else {
                    $updatedCount++;
                    Log::debug("Updated menu link: {$item['label']} for school: {$schoolId}");
                }
            }
        }

        // Then, create child items (those with parent_id)
        foreach ($menuItems as $item) {
            if (!empty($item['parent_id'])) {
                if (!isset($parentMap[$item['parent_id']])) {
                    $skippedCount++;
                    Log::warning("Parent menu link '{$item['parent_id']}' not found for child '{$item['label']}'. Skipping.");
                    continue;
                }

                // Match on URL + parent_id instead of label to prevent duplicates across languages
                $menuLink = WebsiteMenuLink::updateOrCreate(
                    [
                        'school_id' => $schoolId,
                        'url' => $item['url'],
                        'parent_id' => $parentMap[$item['parent_id']],
                    ],
                    [
                        'organization_id' => $organizationId,
                        'label' => $item['label'],
                        'sort_order' => $item['sort_order'] ?? 0,
                        'is_visible' => $item['is_visible'] ?? true,
                    ]
                );

                if ($menuLink->wasRecentlyCreated) {
                    $createdCount++;
                    Log::debug("Created child menu link: {$item['label']} for school: {$schoolId}");
                } else {
                    $updatedCount++;
                    Log::debug("Updated child menu link: {$item['label']} for school: {$schoolId}");
                }
            }
        }

        Log::info("Website navigation seeding completed for school {$schoolId}", [
            'deleted' => $deletedCount,
            'created' => $createdCount,
            'updated' => $updatedCount,
            'skipped' => $skippedCount,
            'total' => count($menuItems),
            'language' => $language,
        ]);

        if ($this->command) {
            $summary = "  ✓ Navigation menu: {$deletedCount} deleted, {$createdCount} created, {$updatedCount} updated";
            if ($skippedCount > 0) {
                $summary .= ", {$skippedCount} skipped";
            }
            $this->command->info($summary);
        }
    }

    /**
     * Get pages data based on language
     *
     * @param string $language
     * @return array
     */
    protected function getPagesData(string $language = 'en'): array
    {
        $translations = $this->getPageTranslations($language);

        return [
            [
                'slug' => 'home',
                'title' => $translations['home']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['home']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['home']['description']],
                ]),
                'seo_title' => $translations['home']['seo_title'],
                'seo_description' => $translations['home']['seo_description'],
                'status' => 'published',
            ],
            [
                'slug' => 'about',
                'title' => $translations['about']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['about']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['about']['description']],
                ]),
                'seo_title' => $translations['about']['seo_title'],
                'seo_description' => $translations['about']['seo_description'],
                'status' => 'published',
            ],
            [
                'slug' => 'academics',
                'title' => $translations['academics']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['academics']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['academics']['description']],
                ]),
                'seo_title' => $translations['academics']['seo_title'],
                'seo_description' => $translations['academics']['seo_description'],
                'status' => 'published',
            ],
            [
                'slug' => 'admissions',
                'title' => $translations['admissions']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['admissions']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['admissions']['description']],
                ]),
                'seo_title' => $translations['admissions']['seo_title'],
                'seo_description' => $translations['admissions']['seo_description'],
                'status' => 'published',
            ],
            [
                'slug' => 'contact',
                'title' => $translations['contact']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['contact']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['contact']['description']],
                ]),
                'seo_title' => $translations['contact']['seo_title'],
                'seo_description' => $translations['contact']['seo_description'],
                'status' => 'published',
            ],
            // NOTE: library, programs, scholars, alumni, and donate are FEATURE PAGES
            // They have their own routes and components, so they should NOT be created as static WebsitePage entries
            // They are handled by: PublicLibraryPage, PublicCoursesPage, PublicScholarsPage, PublicGraduatesPage, PublicDonationsPage
            [
                'slug' => 'ask-fatwa',
                'title' => $translations['ask_fatwa']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['ask_fatwa']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['ask_fatwa']['description']],
                ]),
                'seo_title' => $translations['ask_fatwa']['seo_title'],
                'seo_description' => $translations['ask_fatwa']['seo_description'],
                'status' => 'published',
            ],
            [
                'slug' => 'results',
                'title' => $translations['results']['title'],
                'content_json' => $this->createTipTapContent([
                    ['type' => 'heading', 'level' => 1, 'text' => $translations['results']['heading']],
                    ['type' => 'paragraph', 'text' => $translations['results']['description']],
                ]),
                'seo_title' => $translations['results']['seo_title'],
                'seo_description' => $translations['results']['seo_description'],
                'status' => 'published',
            ],
        ];
    }

    /**
     * Get navigation menu data based on language
     *
     * @param string $language
     * @return array
     */
    protected function getNavigationData(string $language = 'en'): array
    {
        $translations = $this->getMenuTranslations($language);

        return [
            // Parent items
            [
                'key' => 'home',
                'label' => $translations['home'],
                'url' => '/public-site',
                'parent_id' => null,
                'sort_order' => 0,
                'is_visible' => true,
            ],
            [
                'key' => 'about',
                'label' => $translations['about'],
                'url' => '/public-site/about',
                'parent_id' => null,
                'sort_order' => 1,
                'is_visible' => true,
            ],
            [
                'key' => 'programs',
                'label' => $translations['programs'],
                'url' => '/public-site/programs',
                'parent_id' => null,
                'sort_order' => 2,
                'is_visible' => true,
            ],
            [
                'key' => 'resources',
                'label' => $translations['resources'],
                'url' => '#',
                'parent_id' => null,
                'sort_order' => 3,
                'is_visible' => true,
            ],
            [
                'key' => 'scholars',
                'label' => $translations['scholars'],
                'url' => '/public-site/scholars',
                'parent_id' => null,
                'sort_order' => 4,
                'is_visible' => true,
            ],
            [
                'key' => 'staff',
                'label' => $translations['staff'],
                'url' => '/public-site/staff',
                'parent_id' => null,
                'sort_order' => 5,
                'is_visible' => true,
            ],
            [
                'key' => 'articles',
                'label' => $translations['articles'],
                'url' => '/public-site/articles',
                'parent_id' => null,
                'sort_order' => 6,
                'is_visible' => true,
            ],
            [
                'key' => 'gallery',
                'label' => $translations['gallery'],
                'url' => '/public-site/gallery',
                'parent_id' => null,
                'sort_order' => 7,
                'is_visible' => true,
            ],
            [
                'key' => 'announcements',
                'label' => $translations['announcements'],
                'url' => '/public-site/announcements',
                'parent_id' => null,
                'sort_order' => 8,
                'is_visible' => true,
            ],
            [
                'key' => 'results',
                'label' => $translations['results'],
                'url' => '/public-site/results',
                'parent_id' => null,
                'sort_order' => 9,
                'is_visible' => true,
            ],
            [
                'key' => 'contact',
                'label' => $translations['contact'],
                'url' => '/public-site/contact',
                'parent_id' => null,
                'sort_order' => 10,
                'is_visible' => true,
            ],
            [
                'key' => 'donate',
                'label' => $translations['donate'],
                'url' => '/public-site/donate',
                'parent_id' => null,
                'sort_order' => 11,
                'is_visible' => true,
            ],
            // Child items (under Resources)
            [
                'key' => 'library',
                'label' => $translations['library'],
                'url' => '/public-site/library',
                'parent_id' => 'resources',
                'sort_order' => 0,
                'is_visible' => true,
            ],
            [
                'key' => 'scholars',
                'label' => $translations['scholars'],
                'url' => '/public-site/scholars',
                'parent_id' => 'resources',
                'sort_order' => 1,
                'is_visible' => true,
            ],
            [
                'key' => 'staff',
                'label' => $translations['staff'] ?? ($language === 'ps' ? 'کارمندان' : 'Staff'),
                'url' => '/public-site/staff',
                'parent_id' => 'resources',
                'sort_order' => 5,
                'is_visible' => true,
            ],
            [
                'key' => 'alumni',
                'label' => $translations['alumni'],
                'url' => '/public-site/alumni',
                'parent_id' => 'resources',
                'sort_order' => 2,
                'is_visible' => true,
            ],
            [
                'key' => 'fatwas',
                'label' => $translations['fatwas'],
                'url' => '/public-site/fatwas',
                'parent_id' => 'resources',
                'sort_order' => 3,
                'is_visible' => true,
            ],
            [
                'key' => 'ask_fatwa',
                'label' => $translations['ask_fatwa'] ?? ($language === 'ps' ? 'پوښتنه وکړئ' : 'Ask Question'),
                'url' => '/public-site/fatwas/ask',
                'parent_id' => 'resources',
                'sort_order' => 4,
                'is_visible' => true,
            ],
        ];
    }

    /**
     * Get page translations based on language
     *
     * @param string $language
     * @return array
     */
    protected function getPageTranslations(string $language = 'en'): array
    {
        $translations = [
            'en' => [
                'home' => [
                    'title' => 'Home',
                    'heading' => 'Welcome',
                    'description' => 'Welcome to our Islamic educational institution. We are dedicated to providing comprehensive Islamic education that integrates traditional religious studies with modern academic excellence.',
                    'seo_title' => 'Home - Islamic Educational Institution',
                    'seo_description' => 'Welcome to our Islamic educational institution',
                ],
                'about' => [
                    'title' => 'About Us',
                    'heading' => 'About Us',
                    'description' => 'Learn about our mission, vision, and values. We are committed to nurturing future leaders who are firmly grounded in their faith while being fully prepared to contribute positively to society.',
                    'seo_title' => 'About Us - Islamic Educational Institution',
                    'seo_description' => 'Learn about our mission, vision, and values',
                ],
                'academics' => [
                    'title' => 'Academics',
                    'heading' => 'Academic Programs',
                    'description' => 'Explore our academic programs and curriculum. Our program combines traditional Islamic sciences with contemporary subjects, providing students with a well-rounded education.',
                    'seo_title' => 'Academics - Academic Programs',
                    'seo_description' => 'Explore our academic programs and curriculum',
                ],
                'admissions' => [
                    'title' => 'Admissions',
                    'heading' => 'Admission Process',
                    'description' => 'Information about our admissions process. We welcome students from all backgrounds who are sincere in their pursuit of Islamic knowledge.',
                    'seo_title' => 'Admissions - Admission Process',
                    'seo_description' => 'Information about our admissions process',
                ],
                'contact' => [
                    'title' => 'Contact Us',
                    'heading' => 'Get in Touch',
                    'description' => 'We\'d love to hear from you. Whether you have questions about our programs, want to schedule a visit, or simply want to learn more about our institution, please don\'t hesitate to reach out.',
                    'seo_title' => 'Contact Us - Get in Touch',
                    'seo_description' => 'Get in touch with us',
                ],
                'library' => [
                    'title' => 'Library',
                    'heading' => 'Library',
                    'description' => 'Browse our collection of Islamic books and resources. Our library offers a wide range of scholarly works, reference materials, and educational resources.',
                    'seo_title' => 'Library - Islamic Books and Resources',
                    'seo_description' => 'Browse our collection of Islamic books and resources',
                ],
                'programs' => [
                    'title' => 'Programs',
                    'heading' => 'Our Programs',
                    'description' => 'Discover our educational programs and courses. We offer comprehensive programs designed to provide students with both religious and academic knowledge.',
                    'seo_title' => 'Programs - Educational Programs',
                    'seo_description' => 'Discover our educational programs and courses',
                ],
                'scholars' => [
                    'title' => 'Scholars',
                    'heading' => 'Our Scholars',
                    'description' => 'Meet our distinguished scholars and faculty members. Our scholars are experts in their fields and dedicated to providing quality education.',
                    'seo_title' => 'Scholars - Our Faculty',
                    'seo_description' => 'Meet our distinguished scholars and faculty members',
                ],
                'alumni' => [
                    'title' => 'Alumni',
                    'heading' => 'Our Graduates',
                    'description' => 'Learn about our alumni and their achievements. Our graduates have gone on to make significant contributions in various fields.',
                    'seo_title' => 'Alumni - Our Graduates',
                    'seo_description' => 'Learn about our alumni and their achievements',
                ],
                'donate' => [
                    'title' => 'Donate',
                    'heading' => 'Support Our Mission',
                    'description' => 'Your support helps us continue our mission of providing quality Islamic education. Every contribution makes a difference in the lives of our students.',
                    'seo_title' => 'Donate - Support Our Mission',
                    'seo_description' => 'Support our mission of providing quality Islamic education',
                ],
                'ask_fatwa' => [
                    'title' => 'Ask Fatwa',
                    'heading' => 'Ask a Question',
                    'description' => 'Submit your Islamic questions to our scholars. Our qualified scholars provide reliable Islamic rulings based on authentic sources.',
                    'seo_title' => 'Ask Fatwa - Submit Your Question',
                    'seo_description' => 'Submit your Islamic questions to our scholars',
                ],
                'results' => [
                    'title' => 'Exam Results',
                    'heading' => 'Exam Results',
                    'description' => 'View and search for exam results. Enter your exam details to access your results.',
                    'seo_title' => 'Exam Results - View Your Results',
                    'seo_description' => 'View and search for exam results',
                ],
            ],
            'ps' => [
                'home' => [
                    'title' => 'کور',
                    'heading' => 'هرڅه',
                    'description' => 'زموږ د اسلامي تعلیمي مرکز ته هرڅه. موږ د دودیزو دیني زده کړو سره د عصري تعلیمي بریالیتوبونو ترکیب کولو لپاره ژمن یو.',
                    'seo_title' => 'کور - د اسلامي تعلیماتو مرکز',
                    'seo_description' => 'زموږ د اسلامي تعلیمي مرکز ته هرڅه',
                ],
                'about' => [
                    'title' => 'زموږ په اړه',
                    'heading' => 'زموږ په اړه',
                    'description' => 'زموږ موخه، لید او ارزښتونه وپیژنئ. موږ د راتلونکو رهبرانو د روزنې لپاره ژمن یو چې د دیني پوهې سره سم د ټولنې د پرمختګ لپاره کار وکړي.',
                    'seo_title' => 'زموږ په اړه - د اسلامي تعلیماتو مرکز',
                    'seo_description' => 'زموږ موخه، لید او ارزښتونه وپیژنئ',
                ],
                'academics' => [
                    'title' => 'تعلیمات',
                    'heading' => 'د تعلیماتو پروګرامونه',
                    'description' => 'زموږ د تعلیماتو پروګرامونه او نصاب وپیژنئ. زموږ پروګرام د دودیزو اسلامي علومو سره د عصري موضوعاتو ترکیب کوي.',
                    'seo_title' => 'تعلیمات - د تعلیماتو پروګرامونه',
                    'seo_description' => 'زموږ د تعلیماتو پروګرامونه او نصاب وپیژنئ',
                ],
                'admissions' => [
                    'title' => 'شمولیت',
                    'heading' => 'د ننوتلو پروسه',
                    'description' => 'د زده کړیالو د ننوتلو پروسه او شرطونه. موږ د هغو زده کړیالو ته هرکلی وایو چې د اسلامي پوهې د لټون کې صمیم دي.',
                    'seo_title' => 'شمولیت - د ننوتلو پروسه',
                    'seo_description' => 'د زده کړیالو د ننوتلو پروسه او شرطونه',
                ],
                'contact' => [
                    'title' => 'اړیکه',
                    'heading' => 'زموږ سره اړیکه ونیسئ',
                    'description' => 'موږ خوښ یو چې له تاسو سره اړیکه ونیسو. که تاسو زموږ د پروګرامونو په اړه پوښتنې لرئ، د لیدو د وخت ټاکل غواړئ، یا یوازې زموږ د مرکز په اړه نور معلومات غواړئ.',
                    'seo_title' => 'اړیکه - زموږ سره اړیکه ونیسئ',
                    'seo_description' => 'زموږ سره د اړیکو معلومات',
                ],
                'library' => [
                    'title' => 'کتابتون',
                    'heading' => 'کتابتون',
                    'description' => 'زموږ د اسلامي کتابونو او سرچینو مجموعه وپیژنئ. زموږ کتابتون د علمي کارونو، سرچینو او تعلیمي موادو پراخه مجموعه برابروي.',
                    'seo_title' => 'کتابتون - د اسلامي کتابونو مجموعه',
                    'seo_description' => 'زموږ د اسلامي کتابونو او سرچینو مجموعه وپیژنئ',
                ],
                'programs' => [
                    'title' => 'پروګرامونه',
                    'heading' => 'زموږ پروګرامونه',
                    'description' => 'زموږ د تعلیمي پروګرامونو او کورسونو پیژندنه. موږ د دواړو دیني او تعلیمي پوهې د برابروونکو بشپړو پروګرامونو وړاندیز کوو.',
                    'seo_title' => 'پروګرامونه - د تعلیمي پروګرامونه',
                    'seo_description' => 'زموږ د تعلیمي پروګرامونو او کورسونو پیژندنه',
                ],
                'scholars' => [
                    'title' => 'علما',
                    'heading' => 'زموږ علما',
                    'description' => 'زموږ د نامتو علما او د پوهنتون د غړو پیژندنه. زموږ علما د خپلو برخو کې متخصصین دي او د کیفیت لرونکو تعلیماتو د ورکړې لپاره ژمن دي.',
                    'seo_title' => 'علما - زموږ د پوهنتون غړي',
                    'seo_description' => 'زموږ د نامتو علما او د پوهنتون د غړو پیژندنه',
                ],
                'alumni' => [
                    'title' => 'فارغ التحصیلان',
                    'heading' => 'زموږ فارغ التحصیلان',
                    'description' => 'زموږ د فارغ التحصیلانو او د هغوی د بریالیتوبونو پیژندنه. زموږ فارغ التحصیلان د مختلفو برخو کې مهمه ونډه اخیستې.',
                    'seo_title' => 'فارغ التحصیلان - زموږ فارغ التحصیلان',
                    'seo_description' => 'زموږ د فارغ التحصیلانو او د هغوی د بریالیتوبونو پیژندنه',
                ],
                'donate' => [
                    'title' => 'مرسته',
                    'heading' => 'زموږ موخه ملاتړ وکړئ',
                    'description' => 'ستاسو ملاتړ زموږ د کیفیت لرونکو اسلامي تعلیماتو د ورکړې موخه دوام ورکوي. هر مرسته زموږ د زده کړیالو په ژوندونو کې توپیر راولي.',
                    'seo_title' => 'مرسته - زموږ موخه ملاتړ وکړئ',
                    'seo_description' => 'زموږ د کیفیت لرونکو اسلامي تعلیماتو د ورکړې موخه ملاتړ وکړئ',
                ],
                'ask_fatwa' => [
                    'title' => 'پوښتنه وکړئ',
                    'heading' => 'پوښتنه وکړئ',
                    'description' => 'خپلې اسلامي پوښتنې زموږ علما ته وړاندې کړئ. زموږ وړ علما د معتبرو سرچینو پر بنسټ د اعتمادي اسلامي احکامو وړاندې کوي.',
                    'seo_title' => 'پوښتنه وکړئ - خپله پوښتنه وړاندې کړئ',
                    'seo_description' => 'خپلې اسلامي پوښتنې زموږ علما ته وړاندې کړئ',
                ],
                'results' => [
                    'title' => 'د ازموینې پایلې',
                    'heading' => 'د ازموینې پایلې',
                    'description' => 'د ازموینې پایلې وګورئ او پلټل. د خپلو ازموینې تفصیلات وړاندې کړئ ترڅو خپلو پایلو ته لاسرسی ومومئ.',
                    'seo_title' => 'د ازموینې پایلې - خپلې پایلې وګورئ',
                    'seo_description' => 'د ازموینې پایلې وګورئ او پلټل',
                ],
            ],
        ];

        // Default to English if language not found
        if (!isset($translations[$language])) {
            $language = 'en';
        }

        return $translations[$language];
    }

    /**
     * Get menu translations based on language
     *
     * @param string $language
     * @return array
     */
    protected function getMenuTranslations(string $language = 'en'): array
    {
        $translations = [
            'en' => [
                'home' => 'Home',
                'about' => 'About',
                'programs' => 'Programs',
                'resources' => 'Resources',
                'announcements' => 'Announcements',
                'articles' => 'Articles & Blog',
                'gallery' => 'Gallery',
                'staff' => 'Staff',
                'news' => 'News',
                'results' => 'Results',
                'contact' => 'Contact',
                'donate' => 'Donate',
                'library' => 'Library',
                'scholars' => 'Scholars',
                'alumni' => 'Alumni',
                'fatwas' => 'Fatwas',
                'ask_fatwa' => 'Ask Question',
            ],
            'ps' => [
                'home' => 'کور',
                'about' => 'زموږ په اړه',
                'programs' => 'پروګرامونه',
                'resources' => 'سرچینې',
                'announcements' => 'اعلانات',
                'articles' => 'مقالې او بلاګ',
                'gallery' => 'ګالري',
                'staff' => 'کارمندان',
                'news' => 'خبرونه',
                'results' => 'پایلې',
                'contact' => 'اړیکه',
                'donate' => 'مرسته',
                'library' => 'کتابتون',
                'scholars' => 'علما',
                'alumni' => 'فارغ التحصیلان',
                'fatwas' => 'فتاوي',
                'ask_fatwa' => 'پوښتنه وکړئ',
            ],
            'fa' => [
                'home' => 'خانه',
                'about' => 'درباره ما',
                'programs' => 'برنامه‌ها',
                'resources' => 'منابع',
                'announcements' => 'اعلانات',
                'articles' => 'مقالات و وبلاگ',
                'gallery' => 'گالری',
                'staff' => 'کارکنان',
                'news' => 'اخبار',
                'results' => 'نتایج',
                'contact' => 'تماس',
                'donate' => 'اهدای',
                'library' => 'کتابخانه',
                'scholars' => 'علما',
                'alumni' => 'فارغ التحصیلان',
                'fatwas' => 'فتوا',
                'ask_fatwa' => 'سوال بپرسید',
            ],
            'ar' => [
                'home' => 'الرئيسية',
                'about' => 'من نحن',
                'programs' => 'البرامج',
                'resources' => 'الموارد',
                'announcements' => 'الإعلانات',
                'articles' => 'المقالات والمدونة',
                'gallery' => 'المعرض',
                'staff' => 'الموظفون',
                'news' => 'الأخبار',
                'results' => 'النتائج',
                'contact' => 'اتصل بنا',
                'donate' => 'تبرع',
                'library' => 'المكتبة',
                'scholars' => 'العلماء',
                'alumni' => 'الخريجون',
                'fatwas' => 'الفتاوى',
                'ask_fatwa' => 'اطرح سؤالاً',
            ],
        ];

        // Default to English if language not found
        if (!isset($translations[$language])) {
            $language = 'en';
        }

        return $translations[$language];
    }

    /**
     * Create TipTap JSON content structure
     *
     * @param array $blocks Array of content blocks with type, level (for headings), and text
     * @return array
     */
    protected function createTipTapContent(array $blocks): array
    {
        $content = [];

        foreach ($blocks as $block) {
            switch ($block['type']) {
                case 'heading':
                    $content[] = [
                        'type' => 'heading',
                        'attrs' => ['level' => $block['level'] ?? 1],
                        'content' => [['type' => 'text', 'text' => $block['text'] ?? '']],
                    ];
                    break;
                case 'paragraph':
                    $content[] = [
                        'type' => 'paragraph',
                        'content' => [['type' => 'text', 'text' => $block['text'] ?? '']],
                    ];
                    break;
            }
        }

        return [
            'type' => 'doc',
            'content' => $content,
        ];
    }
}

