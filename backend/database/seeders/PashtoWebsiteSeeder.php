<?php

namespace Database\Seeders;

use App\Models\SchoolBranding;
use App\Models\WebsiteAnnouncement;
use App\Models\WebsiteCourse;
use App\Models\WebsiteDonation;
use App\Models\WebsiteDomain;
use App\Models\WebsiteEvent;
use App\Models\WebsiteFatwa;
use App\Models\WebsiteFatwaCategory;
use App\Models\WebsiteFatwaQuestion;
use App\Models\WebsiteFatwaTag;
use App\Models\WebsiteGraduate;
use App\Models\WebsiteMedia;
use App\Models\WebsiteMenuLink;
use App\Models\WebsitePage;
use App\Models\WebsitePost;
use App\Models\WebsitePublicBook;
use App\Models\WebsiteScholar;
use App\Models\WebsiteSetting;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PashtoWebsiteSeeder extends Seeder
{
    protected string $organizationId;
    protected string $schoolId;
    protected ?string $userId = null;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🌐 Starting Pashto Website Seeder...');
        $this->command->info('');

        // Get platform admin organization and school
        $result = $this->getPlatformAdminOrgAndSchool();
        if (!$result) {
            return;
        }

        $this->command->info('Seeding website tables with Pashto content...');
        $this->command->info('');

        try {
            // Seed in dependency order
            $this->seedWebsiteSettings();
            $this->seedFatwaCategories();
            $this->seedFatwaTags();
            $this->seedFatwas();
            $this->seedFatwaQuestions();
            $this->seedWebsitePages();
            $this->seedWebsitePosts();
            $this->seedWebsiteEvents();
            $this->seedScholars();
            $this->seedCourses();
            $this->seedPublicBooks();
            $this->seedGraduates();
            $this->seedDonations();
            $this->seedAnnouncements();
            // Menu links are now handled by WebsitePagesAndNavigationSeeder
            // Skipping menu link seeding to avoid conflicts
            // $this->seedMenuLinks();
            $this->seedMedia();
            $this->seedDomains();

            $this->command->info('');
            $this->command->info('✅ Pashto Website Seeder completed successfully!');
            $this->command->info('');
        } catch (\Exception $e) {
            $this->command->error('❌ Error seeding website data: ' . $e->getMessage());
            $this->command->error('Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Get platform admin organization and school
     */
    protected function getPlatformAdminOrgAndSchool(): bool
    {
        $platformAdminEmail = 'platform-admin@nazim.app';
        $platformUser = DB::table('users')
            ->where('email', $platformAdminEmail)
            ->first();

        if (!$platformUser) {
            $this->command->error("Platform admin user not found: {$platformAdminEmail}");
            $this->command->error("Please run PlatformAdminSeeder first.");
            return false;
        }

        $this->userId = $platformUser->id;

        $profile = DB::table('profiles')
            ->where('id', $platformUser->id)
            ->first();

        if (!$profile || !$profile->organization_id) {
            $this->command->error("Platform admin user does not have an organization assigned.");
            $this->command->error("Please run PlatformAdminSeeder first to create organization.");
            return false;
        }

        $this->organizationId = $profile->organization_id;
        $organization = DB::table('organizations')
            ->where('id', $this->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            $this->command->error("Organization not found: {$this->organizationId}");
            return false;
        }

        $this->command->info("Platform admin organization: {$organization->name} (ID: {$this->organizationId})");

        // Get or create school
        $school = DB::table('school_branding')
            ->where('organization_id', $this->organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            $this->command->info("Creating default school for organization...");
            $school = SchoolBranding::create([
                'organization_id' => $this->organizationId,
                'school_name' => 'Main School',
                'is_active' => true,
                'primary_color' => '#1e40af',
                'secondary_color' => '#64748b',
                'accent_color' => '#0ea5e9',
                'font_family' => 'Inter',
                'report_font_size' => 12,
                'table_alternating_colors' => true,
                'show_page_numbers' => true,
                'show_generation_date' => true,
                'calendar_preference' => 'gregorian',
            ]);
            $this->command->info("  ✓ Created school: {$school->school_name}");
        } else {
            $this->command->info("  ✓ School exists: {$school->school_name}");
        }

        $this->schoolId = $school->id;
        $this->command->info('');

        return true;
    }

    /**
     * Seed website settings
     */
    protected function seedWebsiteSettings(): void
    {
        $this->command->info('  [1/17] Seeding website_settings...');

        $school = DB::table('school_branding')->where('id', $this->schoolId)->first();
        $schoolSlug = Str::slug($school->school_name ?? 'main-school');

        WebsiteSetting::updateOrCreate(
            [
                'school_id' => $this->schoolId,
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'school_slug' => $schoolSlug,
                'default_language' => 'ps',
                'enabled_languages' => ['ps', 'fa', 'ar', 'en'],
                'theme' => [
                    'primary_color' => '#1e40af',
                    'secondary_color' => '#64748b',
                    'font_family' => 'Bahij Nazanin',
                ],
                'is_public' => true,
            ]
        );

        $this->command->info('    ✓ Website settings created');
    }

    /**
     * Seed fatwa categories
     */
    protected function seedFatwaCategories(): void
    {
        $this->command->info('  [2/17] Seeding website_fatwa_categories...');

        $categories = [
            [
                'name' => 'عبادات',
                'slug' => 'ibadat',
                'description' => 'د عباداتو اړوند احکام - لمونځ، روژه، زکات، حج',
                'sort_order' => 1,
            ],
            [
                'name' => 'کورنۍ مسائل',
                'slug' => 'family-matters',
                'description' => 'د کورنۍ اړوند مسائل - واده، طلاق، میراث',
                'sort_order' => 2,
            ],
            [
                'name' => 'سوداګري او مالي',
                'slug' => 'business-finance',
                'description' => 'د سوداګرۍ او مالي چارو اړوند احکام',
                'sort_order' => 3,
            ],
            [
                'name' => 'ورځني ژوند',
                'slug' => 'daily-life',
                'description' => 'د ورځني ژوند اړوند مسائل - خوراک، جامې، ټولنیز اړیکې',
                'sort_order' => 4,
            ],
            [
                'name' => 'طبي مسائل',
                'slug' => 'medical-issues',
                'description' => 'د طبي مسایلو اړوند احکام',
                'sort_order' => 5,
            ],
        ];

        foreach ($categories as $categoryData) {
            WebsiteFatwaCategory::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $categoryData['slug'],
                ],
                array_merge($categoryData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'is_active' => true,
                ])
            );
        }

        $this->command->info('    ✓ Fatwa categories created');
    }

    /**
     * Seed fatwa tags
     */
    protected function seedFatwaTags(): void
    {
        $this->command->info('  [3/17] Seeding website_fatwa_tags...');

        $tags = [
            ['name' => 'لمونځ', 'slug' => 'prayer'],
            ['name' => 'روژه', 'slug' => 'fasting'],
            ['name' => 'زکات', 'slug' => 'zakat'],
            ['name' => 'حج', 'slug' => 'hajj'],
            ['name' => 'واده', 'slug' => 'marriage'],
            ['name' => 'طلاق', 'slug' => 'divorce'],
            ['name' => 'میراث', 'slug' => 'inheritance'],
            ['name' => 'حلال', 'slug' => 'halal'],
            ['name' => 'حرام', 'slug' => 'haram'],
            ['name' => 'مکروه', 'slug' => 'makruh'],
        ];

        foreach ($tags as $tagData) {
            WebsiteFatwaTag::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $tagData['slug'],
                ],
                array_merge($tagData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                ])
            );
        }

        $this->command->info('    ✓ Fatwa tags created');
    }

    /**
     * Seed fatwas
     */
    protected function seedFatwas(): void
    {
        $this->command->info('  [4/17] Seeding website_fatwas...');

        $category = WebsiteFatwaCategory::where('school_id', $this->schoolId)
            ->where('slug', 'ibadat')
            ->first();

        if (!$category) {
            $this->command->warn('    ⚠ No fatwa category found, skipping fatwas');
            return;
        }

        $fatwas = [
            [
                'slug' => 'namaz-ka-waqt',
                'title' => 'د لمونځ وخت',
                'question_text' => 'د لمونځ وخت څه وخت دی؟',
                'answer_text' => 'د لمونځ وخت د لمر د خوځښت سره سم تعین کیږي. د فجر لمونځ د سهار له وخت څخه تر لمر ختل پورې، د ظهر لمونځ د لمر د مینځ ته رسیدو وخت، د عصر لمونځ د ماسپښین وخت، د مغرب لمونځ د لمر د غروب وخت، او د عشاء لمونځ د شپې وخت دی.',
                'status' => 'published',
                'is_featured' => true,
                'published_at' => now()->subDays(5),
            ],
            [
                'slug' => 'roza-ka-ahkam',
                'title' => 'د روژې احکام',
                'question_text' => 'د روژې پر مهال څه کول حرام دي؟',
                'answer_text' => 'د روژې پر مهال خوراک، څښاک، د جنسیت اړیکه، او هر هغه عمل چې د روژې باطل کوي، حرام دي. د روژې پر مهال باید د صبر او تقوی سره د ورځې تیرول وکړو.',
                'status' => 'published',
                'is_featured' => true,
                'published_at' => now()->subDays(3),
            ],
            [
                'slug' => 'zakat-ka-nisab',
                'title' => 'د زکات نصاب',
                'question_text' => 'د زکات نصاب څه دی؟',
                'answer_text' => 'د زکات نصاب د سرو زرو لپاره د 87.48 ګرامو سره مساوي دی. که چیرې د یو کس مال د نصاب څخه زیات وي او یو کال تیر شي، نو د هغه مال د 2.5% زکات اخیستل کېږي.',
                'status' => 'published',
                'is_featured' => false,
                'published_at' => now()->subDays(7),
            ],
        ];

        foreach ($fatwas as $fatwaData) {
            WebsiteFatwa::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $fatwaData['slug'],
                ],
                array_merge($fatwaData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'category_id' => $category->id,
                    'references_json' => [
                        ['source' => 'قرآن کریم', 'reference' => 'سورة البقرة، آیت 183'],
                        ['source' => 'صحیح بخاری', 'reference' => 'کتاب الصوم'],
                    ],
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Fatwas created');
    }

    /**
     * Seed fatwa questions
     */
    protected function seedFatwaQuestions(): void
    {
        $this->command->info('  [5/17] Seeding website_fatwa_questions...');

        $category = WebsiteFatwaCategory::where('school_id', $this->schoolId)
            ->where('slug', 'family-matters')
            ->first();

        if (!$category) {
            $this->command->warn('    ⚠ No fatwa category found, skipping questions');
            return;
        }

        $questions = [
            [
                'name' => 'احمد محمد',
                'email' => 'ahmad@example.com',
                'question_text' => 'د واده د عقد لپاره د شاهدانو شمیر څه دی؟',
                'is_anonymous' => false,
                'status' => 'new',
                'submitted_at' => now()->subDays(2),
            ],
            [
                'name' => null,
                'email' => 'anonymous@example.com',
                'question_text' => 'د طلاق د شرطونو اړوند معلومات غواړم',
                'is_anonymous' => true,
                'status' => 'in_progress',
                'submitted_at' => now()->subDays(1),
            ],
        ];

        foreach ($questions as $questionData) {
            WebsiteFatwaQuestion::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'email' => $questionData['email'],
                    'question_text' => $questionData['question_text'],
                ],
                array_merge($questionData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'category_id' => $category->id,
                ])
            );
        }

        $this->command->info('    ✓ Fatwa questions created');
    }

    /**
     * Seed website pages
     */
    protected function seedWebsitePages(): void
    {
        $this->command->info('  [6/17] Seeding website_pages...');

        $pages = [
            [
                'slug' => 'about',
                'title' => 'زموږ په اړه',
                'content_json' => $this->getAboutPageContent(),
                'seo_title' => 'زموږ په اړه - د اسلامي تعلیماتو مرکز',
                'seo_description' => 'زموږ موخه، لید او ارزښتونه وپیژنئ',
                'status' => 'published',
            ],
            [
                'slug' => 'academics',
                'title' => 'تعلیمات',
                'content_json' => $this->getAcademicsPageContent(),
                'seo_title' => 'تعلیمات - د اسلامي تعلیماتو پروګرامونه',
                'seo_description' => 'زموږ د تعلیماتو پروګرامونه او نصاب وپیژنئ',
                'status' => 'published',
            ],
            [
                'slug' => 'admissions',
                'title' => 'شمولیت',
                'content_json' => $this->getAdmissionsPageContent(),
                'seo_title' => 'شمولیت - د زده کړیالو د ننوتلو پروسه',
                'seo_description' => 'د زده کړیالو د ننوتلو پروسه او شرطونه',
                'status' => 'published',
            ],
            [
                'slug' => 'contact',
                'title' => 'اړیکه',
                'content_json' => $this->getContactPageContent(),
                'seo_title' => 'اړیکه - زموږ سره اړیکه ونیسئ',
                'seo_description' => 'زموږ سره د اړیکو معلومات',
                'status' => 'published',
            ],
            [
                'slug' => 'fatwas',
                'title' => 'فتاوي',
                'content_json' => $this->getFatwasPageContent(),
                'seo_title' => 'فتاوي - د اسلامي احکامو مرکز',
                'seo_description' => 'د اسلامي احکامو او فتاوو مجموعه',
                'status' => 'published',
            ],
        ];

        foreach ($pages as $pageData) {
            WebsitePage::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $pageData['slug'],
                ],
                array_merge($pageData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'published_at' => now()->subDays(10),
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Website pages created');
    }

    /**
     * Seed website posts
     */
    protected function seedWebsitePosts(): void
    {
        $this->command->info('  [7/17] Seeding website_posts...');

        $posts = [
            [
                'slug' => 'ramadan-mubarak-2024',
                'title' => 'د رمضان المبارک مبارکي',
                'excerpt' => 'د رمضان المبارک د میاشتې د پیل سره زموږ ټولو ته مبارکي وایو',
                'content_json' => $this->getPostContent('د رمضان المبارک د میاشتې د پیل سره زموږ ټولو ته مبارکي وایو. دغه میاشت د تقوی، عبادت او د خدای د رضا د لټون لپاره یوه غوره وخت دی.'),
                'seo_title' => 'د رمضان المبارک مبارکي',
                'seo_description' => 'د رمضان المبارک د میاشتې د پیل سره مبارکي',
                'status' => 'published',
                'published_at' => now()->subDays(15),
            ],
            [
                'slug' => 'graduation-ceremony-2024',
                'title' => 'د فارغ التحصیلانو مراسم',
                'excerpt' => 'د 2024 کال د فارغ التحصیلانو مراسم په بریالیتوب سره ترسره شول',
                'content_json' => $this->getPostContent('د 2024 کال د فارغ التحصیلانو مراسم په بریالیتوب سره ترسره شول. دغه مراسم د زده کړیالو د بریالیتوب د درنښت لپاره ترسره شول.'),
                'seo_title' => 'د فارغ التحصیلانو مراسم 2024',
                'seo_description' => 'د فارغ التحصیلانو د مراسمو راپور',
                'status' => 'published',
                'published_at' => now()->subDays(20),
            ],
            [
                'slug' => 'new-academic-year',
                'title' => 'د نوي تعلیمي کال پیل',
                'excerpt' => 'د نوي تعلیمي کال د پیل سره زموږ ټولو زده کړیالو ته مبارکي وایو',
                'content_json' => $this->getPostContent('د نوي تعلیمي کال د پیل سره زموږ ټولو زده کړیالو ته مبارکي وایو. موږ هیله لرو چې دغه کال د بریالیتوبونو لپاره یو غوره کال وي.'),
                'seo_title' => 'د نوي تعلیمي کال پیل',
                'seo_description' => 'د نوي تعلیمي کال د پیل اعلان',
                'status' => 'published',
                'published_at' => now()->subDays(30),
            ],
        ];

        foreach ($posts as $postData) {
            WebsitePost::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'slug' => $postData['slug'],
                ],
                array_merge($postData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Website posts created');
    }

    /**
     * Seed website events
     */
    protected function seedWebsiteEvents(): void
    {
        $this->command->info('  [8/17] Seeding website_events...');

        $events = [
            [
                'title' => 'د رمضان المبارک د میاشتې د پیل مراسم',
                'location' => 'د مرکزي جومات',
                'starts_at' => now()->addDays(30)->setTime(18, 0),
                'ends_at' => now()->addDays(30)->setTime(20, 0),
                'summary' => 'د رمضان المبارک د میاشتې د پیل سره د دعا او عبادت مراسم',
                'content_json' => $this->getEventContent('د رمضان المبارک د میاشتې د پیل سره د دعا او عبادت مراسم'),
                'is_public' => true,
            ],
            [
                'title' => 'د فارغ التحصیلانو مراسم',
                'location' => 'د تعلیمي مرکز',
                'starts_at' => now()->addDays(60)->setTime(14, 0),
                'ends_at' => now()->addDays(60)->setTime(17, 0),
                'summary' => 'د 2024 کال د فارغ التحصیلانو د درنښت مراسم',
                'content_json' => $this->getEventContent('د 2024 کال د فارغ التحصیلانو د درنښت مراسم'),
                'is_public' => true,
            ],
            [
                'title' => 'د علمي سیمینار',
                'location' => 'د کنفرانس سالون',
                'starts_at' => now()->addDays(45)->setTime(10, 0),
                'ends_at' => now()->addDays(45)->setTime(16, 0),
                'summary' => 'د اسلامي علومو په اړه د علمي سیمینار',
                'content_json' => $this->getEventContent('د اسلامي علومو په اړه د علمي سیمینار'),
                'is_public' => true,
            ],
        ];

        foreach ($events as $eventData) {
            WebsiteEvent::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'title' => $eventData['title'],
                    'starts_at' => $eventData['starts_at'],
                ],
                array_merge($eventData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                ])
            );
        }

        $this->command->info('    ✓ Website events created');
    }

    /**
     * Seed scholars
     */
    protected function seedScholars(): void
    {
        $this->command->info('  [9/17] Seeding website_scholars...');

        $scholars = [
            [
                'name' => 'مولوی محمد احمد',
                'title' => 'د فقه متخصص',
                'bio' => 'مولوی محمد احمد د فقه په برخه کې د پوهې یو متخصص دی. د هغه د علمي کارونو شمیر زیات دی او د اسلامي احکامو په برخه کې یې د پوهې لوړه درجه لري.',
                'specializations' => ['فقه', 'اصول فقه', 'حدیث'],
                'contact_email' => 'mohammad.ahmad@example.com',
                'sort_order' => 1,
                'is_featured' => true,
                'status' => 'published',
            ],
            [
                'name' => 'مولوی عبدالرحمن',
                'title' => 'د تفسیر متخصص',
                'bio' => 'مولوی عبدالرحمن د قرآن کریم د تفسیر په برخه کې د پوهې یو متخصص دی. د هغه د تفسیرونو شمیر زیات دی.',
                'specializations' => ['تفسیر', 'علوم القرآن', 'عربی ادبیات'],
                'contact_email' => 'abdulrahman@example.com',
                'sort_order' => 2,
                'is_featured' => true,
                'status' => 'published',
            ],
            [
                'name' => 'مولوی احمد شاه',
                'title' => 'د حدیث متخصص',
                'bio' => 'مولوی احمد شاه د حدیث په برخه کې د پوهې یو متخصص دی. د هغه د علمي کارونو شمیر زیات دی.',
                'specializations' => ['حدیث', 'علوم الحدیث', 'سیرت'],
                'contact_email' => 'ahmad.shah@example.com',
                'sort_order' => 3,
                'is_featured' => false,
                'status' => 'published',
            ],
        ];

        foreach ($scholars as $scholarData) {
            WebsiteScholar::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'name' => $scholarData['name'],
                ],
                array_merge($scholarData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Scholars created');
    }

    /**
     * Seed courses
     */
    protected function seedCourses(): void
    {
        $this->command->info('  [10/17] Seeding website_courses...');

        $courses = [
            [
                'title' => 'د قرآن کریم حفظ او تجوید',
                'category' => 'دیني علوم',
                'description' => 'د قرآن کریم د حفظ او تجوید د علمي کورس. دغه کورس د قرآن کریم د حفظ او د تجوید د قواعدو د زده کړې لپاره دی.',
                'duration' => '2 کاله',
                'level' => 'د پیل کچه',
                'instructor_name' => 'مولوی محمد احمد',
                'enrollment_cta' => 'اوس نوم لیکنه وکړئ',
                'is_featured' => true,
                'sort_order' => 1,
                'status' => 'published',
            ],
            [
                'title' => 'د فقه اساسات',
                'category' => 'دیني علوم',
                'description' => 'د فقه د اساساتو د علمي کورس. دغه کورس د اسلامي احکامو د زده کړې لپاره دی.',
                'duration' => '3 کاله',
                'level' => 'منځنی',
                'instructor_name' => 'مولوی عبدالرحمن',
                'enrollment_cta' => 'اوس نوم لیکنه وکړئ',
                'is_featured' => true,
                'sort_order' => 2,
                'status' => 'published',
            ],
            [
                'title' => 'د عربي ژبې کورس',
                'category' => 'ژبې',
                'description' => 'د عربي ژبې د زده کړې کورس. دغه کورس د عربي ژبې د قواعدو او ادبیاتو د زده کړې لپاره دی.',
                'duration' => '1 کال',
                'level' => 'د پیل کچه',
                'instructor_name' => 'مولوی احمد شاه',
                'enrollment_cta' => 'اوس نوم لیکنه وکړئ',
                'is_featured' => false,
                'sort_order' => 3,
                'status' => 'published',
            ],
        ];

        foreach ($courses as $courseData) {
            WebsiteCourse::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'title' => $courseData['title'],
                ],
                array_merge($courseData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Courses created');
    }

    /**
     * Seed public books
     */
    protected function seedPublicBooks(): void
    {
        $this->command->info('  [11/17] Seeding website_public_books...');

        $books = [
            [
                'title' => 'د فقه اساسات',
                'author' => 'مولوی محمد احمد',
                'category' => 'فقه',
                'description' => 'د فقه د اساساتو د علمي کتاب. دغه کتاب د اسلامي احکامو د زده کړې لپاره یو اساسي کتاب دی.',
                'is_featured' => true,
                'sort_order' => 1,
                'status' => 'published',
            ],
            [
                'title' => 'د حدیث علوم',
                'author' => 'مولوی احمد شاه',
                'category' => 'حدیث',
                'description' => 'د حدیث د علومو د علمي کتاب. دغه کتاب د حدیث د علومو د زده کړې لپاره یو اساسي کتاب دی.',
                'is_featured' => true,
                'sort_order' => 2,
                'status' => 'published',
            ],
            [
                'title' => 'د تفسیر اساسات',
                'author' => 'مولوی عبدالرحمن',
                'category' => 'تفسیر',
                'description' => 'د تفسیر د اساساتو د علمي کتاب. دغه کتاب د قرآن کریم د تفسیر د زده کړې لپاره یو اساسي کتاب دی.',
                'is_featured' => false,
                'sort_order' => 3,
                'status' => 'published',
            ],
        ];

        foreach ($books as $bookData) {
            WebsitePublicBook::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'title' => $bookData['title'],
                ],
                array_merge($bookData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'download_count' => 0,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Public books created');
    }

    /**
     * Seed graduates
     */
    protected function seedGraduates(): void
    {
        $this->command->info('  [12/17] Seeding website_graduates...');

        $graduates = [
            [
                'name' => 'احمد محمد',
                'graduation_year' => 2023,
                'program' => 'د فقه پروګرام',
                'bio' => 'احمد محمد د 2023 کال د فارغ التحصیلانو څخه دی. د هغه د علمي کارونو شمیر زیات دی.',
                'is_featured' => true,
                'sort_order' => 1,
                'status' => 'published',
            ],
            [
                'name' => 'محمد احمد',
                'graduation_year' => 2022,
                'program' => 'د تفسیر پروګرام',
                'bio' => 'محمد احمد د 2022 کال د فارغ التحصیلانو څخه دی. د هغه د علمي کارونو شمیر زیات دی.',
                'is_featured' => true,
                'sort_order' => 2,
                'status' => 'published',
            ],
            [
                'name' => 'عبدالرحمن',
                'graduation_year' => 2021,
                'program' => 'د حدیث پروګرام',
                'bio' => 'عبدالرحمن د 2021 کال د فارغ التحصیلانو څخه دی. د هغه د علمي کارونو شمیر زیات دی.',
                'is_featured' => false,
                'sort_order' => 3,
                'status' => 'published',
            ],
        ];

        foreach ($graduates as $graduateData) {
            WebsiteGraduate::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'name' => $graduateData['name'],
                    'graduation_year' => $graduateData['graduation_year'],
                ],
                array_merge($graduateData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Graduates created');
    }

    /**
     * Seed donations
     */
    protected function seedDonations(): void
    {
        $this->command->info('  [13/17] Seeding website_donations...');

        $donations = [
            [
                'title' => 'د زده کړیالو د بورس فند',
                'description' => 'د زده کړیالو د بورس فند د هغو زده کړیالو لپاره دی چې د مالي ستونزو سره مخ دي.',
                'target_amount' => 500000.00,
                'current_amount' => 125000.00,
                'bank_details' => [
                    'bank_name' => 'د افغانستان بانک',
                    'account_number' => '1234567890',
                ],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'title' => 'د تعلیمي مرکز د ودانیو فند',
                'description' => 'د تعلیمي مرکز د ودانیو د جوړولو لپاره فند',
                'target_amount' => 1000000.00,
                'current_amount' => 250000.00,
                'bank_details' => [
                    'bank_name' => 'د افغانستان بانک',
                    'account_number' => '0987654321',
                ],
                'is_active' => true,
                'sort_order' => 2,
            ],
        ];

        foreach ($donations as $donationData) {
            WebsiteDonation::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'title' => $donationData['title'],
                ],
                array_merge($donationData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                    'created_by' => $this->userId,
                ])
            );
        }

        $this->command->info('    ✓ Donations created');
    }

    /**
     * Seed announcements
     */
    protected function seedAnnouncements(): void
    {
        $this->command->info('  [14/17] Seeding website_announcements...');

        $announcements = [
            [
                'title' => 'د نوي تعلیمي کال د پیل اعلان',
                'content' => 'د نوي تعلیمي کال د پیل سره زموږ ټولو زده کړیالو ته مبارکي وایو. دغه کال د بریالیتوبونو لپاره یو غوره کال وي.',
                'status' => 'published',
                'published_at' => now()->subDays(5),
                'is_pinned' => true,
            ],
            [
                'title' => 'د رمضان المبارک د میاشتې د پیل اعلان',
                'content' => 'د رمضان المبارک د میاشتې د پیل سره زموږ ټولو ته مبارکي وایو. دغه میاشت د تقوی، عبادت او د خدای د رضا د لټون لپاره یوه غوره وخت دی.',
                'status' => 'published',
                'published_at' => now()->subDays(2),
                'is_pinned' => false,
            ],
            [
                'title' => 'د فارغ التحصیلانو د مراسمو اعلان',
                'content' => 'د 2024 کال د فارغ التحصیلانو د مراسمو اعلان. دغه مراسم د زده کړیالو د بریالیتوب د درنښت لپاره ترسره کیږي.',
                'status' => 'published',
                'published_at' => now()->subDays(10),
                'is_pinned' => false,
            ],
        ];

        foreach ($announcements as $announcementData) {
            WebsiteAnnouncement::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'title' => $announcementData['title'],
                ],
                array_merge($announcementData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                ])
            );
        }

        $this->command->info('    ✓ Announcements created');
    }

    /**
     * Seed menu links
     */
    protected function seedMenuLinks(): void
    {
        $this->command->info('  [15/17] Seeding website_menu_links...');

        // Get pages for menu links
        $aboutPage = WebsitePage::where('school_id', $this->schoolId)->where('slug', 'about')->first();
        $academicsPage = WebsitePage::where('school_id', $this->schoolId)->where('slug', 'academics')->first();
        $admissionsPage = WebsitePage::where('school_id', $this->schoolId)->where('slug', 'admissions')->first();
        $contactPage = WebsitePage::where('school_id', $this->schoolId)->where('slug', 'contact')->first();
        $fatwasPage = WebsitePage::where('school_id', $this->schoolId)->where('slug', 'fatwas')->first();

        $menuLinks = [
            [
                'label' => 'کور',
                'url' => '/',
                'sort_order' => 1,
                'is_visible' => true,
            ],
            [
                'label' => 'زموږ په اړه',
                'url' => $aboutPage ? "/page/{$aboutPage->slug}" : '/about',
                'sort_order' => 2,
                'is_visible' => true,
            ],
            [
                'label' => 'تعلیمات',
                'url' => $academicsPage ? "/page/{$academicsPage->slug}" : '/academics',
                'sort_order' => 3,
                'is_visible' => true,
            ],
            [
                'label' => 'شمولیت',
                'url' => $admissionsPage ? "/page/{$admissionsPage->slug}" : '/admissions',
                'sort_order' => 4,
                'is_visible' => true,
            ],
            [
                'label' => 'فتاوي',
                'url' => $fatwasPage ? "/page/{$fatwasPage->slug}" : '/fatwas',
                'sort_order' => 5,
                'is_visible' => true,
            ],
            [
                'label' => 'اړیکه',
                'url' => $contactPage ? "/page/{$contactPage->slug}" : '/contact',
                'sort_order' => 6,
                'is_visible' => true,
            ],
        ];

        foreach ($menuLinks as $linkData) {
            WebsiteMenuLink::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'label' => $linkData['label'],
                ],
                array_merge($linkData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                ])
            );
        }

        $this->command->info('    ✓ Menu links created');
    }

    /**
     * Seed media
     */
    protected function seedMedia(): void
    {
        $this->command->info('  [16/17] Seeding website_media...');

        $media = [
            [
                'type' => 'image',
                'file_path' => 'organizations/' . $this->organizationId . '/schools/' . $this->schoolId . '/media/logo.png',
                'file_name' => 'logo.png',
                'alt_text' => 'د تعلیمي مرکز لوګو',
                'metadata' => ['width' => 200, 'height' => 200, 'mime_type' => 'image/png'],
            ],
            [
                'type' => 'image',
                'file_path' => 'organizations/' . $this->organizationId . '/schools/' . $this->schoolId . '/media/banner.jpg',
                'file_name' => 'banner.jpg',
                'alt_text' => 'د تعلیمي مرکز بینر',
                'metadata' => ['width' => 1200, 'height' => 400, 'mime_type' => 'image/jpeg'],
            ],
        ];

        foreach ($media as $mediaData) {
            WebsiteMedia::updateOrCreate(
                [
                    'school_id' => $this->schoolId,
                    'file_path' => $mediaData['file_path'],
                ],
                array_merge($mediaData, [
                    'id' => (string) Str::uuid(),
                    'organization_id' => $this->organizationId,
                ])
            );
        }

        $this->command->info('    ✓ Media created');
    }

    /**
     * Seed domains
     */
    protected function seedDomains(): void
    {
        $this->command->info('  [17/17] Seeding website_domains...');

        $school = DB::table('school_branding')->where('id', $this->schoolId)->first();
        $schoolSlug = Str::slug($school->school_name ?? 'main-school');

        WebsiteDomain::updateOrCreate(
            [
                'school_id' => $this->schoolId,
                'domain' => $schoolSlug . '.nazim.app',
            ],
            [
                'id' => (string) Str::uuid(),
                'organization_id' => $this->organizationId,
                'is_primary' => true,
                'verification_status' => 'verified',
                'ssl_status' => 'active',
            ]
        );

        $this->command->info('    ✓ Domains created');
    }

    /**
     * Get About page content in TipTap format
     */
    protected function getAboutPageContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'زموږ موخه']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'زموږ موخه د اسلامي تعلیماتو د ورکړې او د نويو رهبرانو د روزنې ده. موږ هڅه کوو چې د راتلونکو رهبرانو روزنه وکړو چې د دیني پوهې سره سم د ټولنې د پرمختګ لپاره کار وکړي.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'زموږ لید']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'د اسلامي زده کړو یو مخکښ مرکز ته ودانیدل چې د نړۍ په کچه د پوهې، تقوی او د انسانیت د خدمت د ارزښتونو لپاره پیژندل شي.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'زموږ ارزښتونه']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'بریالیتوب'],
                                        ['type' => 'text', 'text' => ' - موږ د تعلیماتو په ټولو برخو کې د لوړو معیارونو لپاره هڅه کوو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'صمیمیت'],
                                        ['type' => 'text', 'text' => ' - موږ د صمیمیت او قوي اخلاقي اصولو ساتنه کوو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'مهرباني'],
                                        ['type' => 'text', 'text' => ' - موږ د زده کړیالو او د ټولنې د نورو غړو لپاره د مهربانۍ او پاملرنې روزنه کوو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'پوهه'],
                                        ['type' => 'text', 'text' => ' - موږ د پوهې د لټون د ژوندانه د سفر په توګه باور لرو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'خدمت'],
                                        ['type' => 'text', 'text' => ' - موږ د خپلې ټولنې او د هغې څخه دباندې د خدمت لپاره ژمن یو']
                                    ]
                                ]
                            ]
                        ],
                    ]
                ],
            ]
        ];
    }

    /**
     * Get Academics page content in TipTap format
     */
    protected function getAcademicsPageContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'زموږ نصاب']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'زموږ د تعلیماتو پروګرام د دودیزو اسلامي علومو سره د عصري موضوعاتو ترکیب کوي، چې د زده کړیالو لپاره د دواړو دیني او د نړۍ د بریالیتوبونو لپاره چمتو کولو یوه بشپړه زده کړه برابروي.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'دیني علوم']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'قرآن کریم او تجوید'],
                                        ['type' => 'text', 'text' => ' - د قرآن کریم د حفظ او د صحیح تلو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'د حدیث علوم'],
                                        ['type' => 'text', 'text' => ' - د حدیثونو د زده کړې او د هغوی د تطبیقاتو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'فقه'],
                                        ['type' => 'text', 'text' => ' - د اسلامي احکامو او د عملي احکامو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'عربي ژبه'],
                                        ['type' => 'text', 'text' => ' - د کلاسیک او عصري عربي ژبې زده کړې']
                                    ]
                                ]
                            ]
                        ],
                    ]
                ],
            ]
        ];
    }

    /**
     * Get Admissions page content in TipTap format
     */
    protected function getAdmissionsPageContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'د ننوتلو پروسه']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'موږ د هغو زده کړیالو ته هرکلی وایو چې د اسلامي پوهې د لټون کې صمیم دي. زموږ د ننوتلو پروسه د هغو زده کړیالو د پیژندلو لپاره چمتو شوې ده چې زموږ د تعلیمي چاپیریال کې وده وکړي.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'شرطونه']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [['type' => 'text', 'text' => 'د ننوتلو د فورمی بشپړول']]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [['type' => 'text', 'text' => 'د تیرو تعلیمي ریکارډونو']]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [['type' => 'text', 'text' => 'د سفارش لیک']]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [['type' => 'text', 'text' => 'د ننوتلو ارزونه (که اړین وي)']]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [['type' => 'text', 'text' => 'د ننوتلو کمیټې سره مرکه']]
                                ]
                            ]
                        ],
                    ]
                ],
            ]
        ];
    }

    /**
     * Get Contact page content in TipTap format
     */
    protected function getContactPageContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'زموږ سره اړیکه ونیسئ']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'موږ خوښ یو چې له تاسو سره اړیکه ونیسو. که تاسو زموږ د پروګرامونو په اړه پوښتنې لرئ، د لیدو د وخت ټاکل غواړئ، یا یوازې زموږ د مرکز په اړه نور معلومات غواړئ، مهرباني وکړئ د اړیکو لپاره مهرباني وکړئ.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'د اړیکو معلومات']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'پته:'],
                                        ['type' => 'text', 'text' => ' د اسلامي مرکز سړک، ښار، ولایت']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'تلیفون:'],
                                        ['type' => 'text', 'text' => ' +93 700 123 456']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'بریښنالیک:'],
                                        ['type' => 'text', 'text' => ' info@school.edu']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'د دفتر ساعات:'],
                                        ['type' => 'text', 'text' => ' د دو شنبې څخه د جمې تر پورې، د 8:00 بجو څخه تر 5:00 بجو پورې']
                                    ]
                                ]
                            ]
                        ],
                    ]
                ],
            ]
        ];
    }

    /**
     * Get Fatwas page content in TipTap format
     */
    protected function getFatwasPageContent(): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'د اسلامي احکامو او لارښوونو']]
                ],
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => 'زموږ علما د معتبرو سرچینو او دودیزو علمي کارونو پر بنسټ د اعتمادي اسلامي احکامو (فتاوو) وړاندې کوي. زموږ د فتاوو د ټولګې تیرل او یا خپله پوښتنه وړاندې کړئ.']]
                ],
                [
                    'type' => 'heading',
                    'attrs' => ['level' => 2],
                    'content' => [['type' => 'text', 'text' => 'کټګورۍ']]
                ],
                [
                    'type' => 'bulletList',
                    'content' => [
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'عبادات'],
                                        ['type' => 'text', 'text' => ' - لمونځ، روژه، زکات، حج']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'کورنۍ مسائل'],
                                        ['type' => 'text', 'text' => ' - واده، طلاق، میراث']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'سوداګري او مالي'],
                                        ['type' => 'text', 'text' => ' - د معاملاتو لپاره د اسلامي لارښوونو']
                                    ]
                                ]
                            ]
                        ],
                        [
                            'type' => 'listItem',
                            'content' => [
                                [
                                    'type' => 'paragraph',
                                    'content' => [
                                        ['type' => 'text', 'marks' => [['type' => 'bold']], 'text' => 'ورځني ژوند'],
                                        ['type' => 'text', 'text' => ' - خوراک، جامې، ټولنیز اړیکې']
                                    ]
                                ]
                            ]
                        ],
                    ]
                ],
            ]
        ];
    }

    /**
     * Get post content in TipTap format
     */
    protected function getPostContent(string $text): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => $text]]
                ],
            ]
        ];
    }

    /**
     * Get event content in TipTap format
     */
    protected function getEventContent(string $text): array
    {
        return [
            'type' => 'doc',
            'content' => [
                [
                    'type' => 'paragraph',
                    'content' => [['type' => 'text', 'text' => $text]]
                ],
            ]
        ];
    }
}

