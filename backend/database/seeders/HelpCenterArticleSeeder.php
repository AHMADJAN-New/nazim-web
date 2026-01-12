<?php

namespace Database\Seeders;

use App\Models\HelpCenterArticle;
use App\Models\HelpCenterCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HelpCenterArticleSeeder extends Seeder
{
    /**
     * Seed the help_center_articles table.
     *
     * Creates comprehensive Pashto help articles for all categories.
     */
    public function run(): void
    {
        $this->command->info('Seeding help center articles (Pashto)...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder or DatabaseSeeder first.');
            return;
        }

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach ($organizations as $organization) {
            $orgCreated = 0;
            $orgSkipped = 0;

            // Get categories for this organization
            $categories = HelpCenterCategory::where(function ($q) use ($organization) {
                $q->where('organization_id', $organization->id)
                    ->orWhereNull('organization_id');
            })
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->get()
                ->keyBy('slug');

            if ($categories->isEmpty()) {
                $this->command->warn("  No categories found for {$organization->name}. Skipping articles.");
                continue;
            }

            // Create articles for each category
            $articles = $this->getArticlesData();

            foreach ($articles as $articleData) {
                $categorySlug = $articleData['category_slug'];
                $category = $categories->get($categorySlug);

                if (!$category) {
                    continue; // Skip if category doesn't exist
                }

                // Check if article already exists
                $existing = HelpCenterArticle::where('organization_id', $organization->id)
                    ->where('category_id', $category->id)
                    ->where('slug', $articleData['slug'])
                    ->whereNull('deleted_at')
                    ->first();

                if ($existing) {
                    $orgSkipped++;
                    continue;
                }

                try {
                    HelpCenterArticle::create([
                        'organization_id' => $organization->id,
                        'category_id' => $category->id,
                        'title' => $articleData['title'],
                        'slug' => $articleData['slug'],
                        'excerpt' => $articleData['excerpt'],
                        'content' => $articleData['content'],
                        'content_type' => 'html',
                        'is_published' => true,
                        'status' => 'published',
                        'is_featured' => $articleData['is_featured'] ?? false,
                        'is_pinned' => $articleData['is_pinned'] ?? false,
                        'visibility' => $articleData['visibility'] ?? 'org_users',
                        'order' => $articleData['order'] ?? 0,
                        'tags' => $articleData['tags'] ?? [],
                        'view_count' => 0,
                        'helpful_count' => 0,
                        'not_helpful_count' => 0,
                        'published_at' => now(),
                    ]);

                    $orgCreated++;
                } catch (\Exception $e) {
                    $this->command->error("  Failed to create article '{$articleData['title']}' for {$organization->name}: {$e->getMessage()}");
                }
            }

            $totalCreated += $orgCreated;
            $totalSkipped += $orgSkipped;

            if ($orgCreated > 0 || $orgSkipped > 0) {
                $this->command->info("  {$organization->name}: Created {$orgCreated} articles, Skipped {$orgSkipped}");
            }
        }

        $this->command->info("Help center articles seeded successfully.");
        $this->command->info("   Total created: {$totalCreated}");
        $this->command->info("   Total skipped: {$totalSkipped}");
    }

    /**
     * Get all articles data in Pashto
     */
    protected function getArticlesData(): array
    {
        return [
            // ========== GETTING STARTED ==========
            [
                'category_slug' => 'getting-started',
                'slug' => 'nazim-system-introduction',
                'title' => 'د ناظیم سیسټم پېژندنه',
                'excerpt' => 'د ناظیم د ښوونځي د مدیریت سیسټم بنسټیز معلومات او د کار کولو لارښود',
                'content' => $this->getGettingStartedContent(),
                'is_featured' => true,
                'is_pinned' => true,
                'order' => 1,
                'tags' => ['پېژندنه', 'لارښود', 'بنسټیز'],
            ],
            [
                'category_slug' => 'getting-started',
                'slug' => 'first-login-guide',
                'title' => 'لومړی ننوتل او د حساب تنظیمات',
                'excerpt' => 'د ناظیم سیسټم ته د لومړي ځل لپاره ننوتل او د خپل حساب تنظیمات',
                'content' => $this->getFirstLoginContent(),
                'is_featured' => true,
                'order' => 2,
                'tags' => ['ننوتل', 'حساب', 'تنظیمات'],
            ],

            // ========== STUDENT MANAGEMENT ==========
            [
                'category_slug' => 'student-registration',
                'slug' => 'how-to-register-new-student',
                'title' => 'د نوی زده کوونکي د ثبتولو لارښود',
                'excerpt' => 'د نوی زده کوونکي د ثبتولو بشپړ لارښود او اړین معلومات',
                'content' => $this->getStudentRegistrationContent(),
                'is_featured' => true,
                'is_pinned' => true,
                'order' => 1,
                'tags' => ['زده کوونکی', 'ثبتول', 'لارښود'],
            ],
            [
                'category_slug' => 'student-registration',
                'slug' => 'student-required-documents',
                'title' => 'د زده کوونکي د ثبتولو لپاره اړین اسناد',
                'excerpt' => 'د زده کوونکي د ثبتولو لپاره اړین اسناد او د هغوی د چمتو کولو لارښود',
                'content' => $this->getStudentDocumentsContent(),
                'order' => 2,
                'tags' => ['اسناد', 'تذکره', 'عکس'],
            ],
            [
                'category_slug' => 'student-admissions',
                'slug' => 'how-to-admit-student-to-class',
                'title' => 'د زده کوونکي د صنف ته د شمولیت ورکولو لارښود',
                'excerpt' => 'د زده کوونکي د یوې ټاکلې صنف ته د شمولیت ورکولو بشپړ لارښود',
                'content' => $this->getStudentAdmissionContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['شمولیت', 'صنف', 'زده کوونکی'],
            ],
            [
                'category_slug' => 'student-admissions',
                'slug' => 'managing-student-admissions',
                'title' => 'د زده کوونکو د شمولیتونو مدیریت',
                'excerpt' => 'د زده کوونکو د شمولیتونو د مدیریت، بدلون او حذف کولو لارښود',
                'content' => $this->getManageAdmissionsContent(),
                'order' => 2,
                'tags' => ['شمولیت', 'مدیریت', 'بدلون'],
            ],
            [
                'category_slug' => 'student-profiles',
                'slug' => 'viewing-student-profile',
                'title' => 'د زده کوونکي د پروفایل کتلو لارښود',
                'excerpt' => 'د زده کوونکي د پروفایل کتلو او د هغه د معلوماتو لیدلو لارښود',
                'content' => $this->getViewStudentProfileContent(),
                'order' => 1,
                'tags' => ['پروفایل', 'معلومات', 'کتل'],
            ],
            [
                'category_slug' => 'student-profiles',
                'slug' => 'editing-student-information',
                'title' => 'د زده کوونکي د معلوماتو بدلون',
                'excerpt' => 'د زده کوونکي د معلوماتو بدلون، تازه کولو او د اسنادو اضافه کولو لارښود',
                'content' => $this->getEditStudentContent(),
                'order' => 2,
                'tags' => ['بدلون', 'تازه کول', 'معلومات'],
            ],

            // ========== ACADEMIC MANAGEMENT ==========
            [
                'category_slug' => 'academic-years',
                'slug' => 'creating-academic-year',
                'title' => 'د اکاډمیک کال د جوړولو لارښود',
                'excerpt' => 'د نوی اکاډمیک کال د جوړولو او تنظیماتو لارښود',
                'content' => $this->getCreateAcademicYearContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['اکاډمیک کال', 'جوړول', 'تنظیمات'],
            ],
            [
                'category_slug' => 'academic-years',
                'slug' => 'managing-academic-years',
                'title' => 'د اکاډمیک کلونو مدیریت',
                'excerpt' => 'د اکاډمیک کلونو د مدیریت، فعال/غیرفعال کولو او حذف کولو لارښود',
                'content' => $this->getManageAcademicYearsContent(),
                'order' => 2,
                'tags' => ['اکاډمیک کال', 'مدیریت', 'فعال'],
            ],
            [
                'category_slug' => 'classes',
                'slug' => 'creating-new-class',
                'title' => 'د نوی صنف د جوړولو لارښود',
                'excerpt' => 'د نوی صنف د جوړولو، نوم ورکولو او تنظیماتو لارښود',
                'content' => $this->getCreateClassContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['صنف', 'جوړول', 'تنظیمات'],
            ],
            [
                'category_slug' => 'classes',
                'slug' => 'assigning-classes-to-academic-year',
                'title' => 'د صنفونو د اکاډمیک کال ته د تخصیص کولو لارښود',
                'excerpt' => 'د صنفونو د اکاډمیک کال ته د تخصیص کولو او د زده کوونکو د اضافه کولو لارښود',
                'content' => $this->getAssignClassToYearContent(),
                'order' => 2,
                'tags' => ['صنف', 'اکاډمیک کال', 'تخصیص'],
            ],
            [
                'category_slug' => 'subjects',
                'slug' => 'creating-subject',
                'title' => 'د نوی مضمون د جوړولو لارښود',
                'excerpt' => 'د نوی مضمون د جوړولو، نوم ورکولو او تنظیماتو لارښود',
                'content' => $this->getCreateSubjectContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['مضمون', 'جوړول', 'تنظیمات'],
            ],
            [
                'category_slug' => 'subjects',
                'slug' => 'assigning-subjects-to-classes',
                'title' => 'د مضامینو د صنفونو ته د تخصیص کولو لارښود',
                'excerpt' => 'د مضامینو د صنفونو ته د تخصیص کولو دوه مرحلې لارښود',
                'content' => $this->getAssignSubjectsContent(),
                'order' => 2,
                'tags' => ['مضمون', 'صنف', 'تخصیص'],
            ],
            [
                'category_slug' => 'exams-assessments',
                'slug' => 'creating-exam',
                'title' => 'د ازموینې د جوړولو لارښود',
                'excerpt' => 'د نوی ازموینې د جوړولو، صنفونو او مضامینو د تخصیص کولو لارښود',
                'content' => $this->getCreateExamContent(),
                'is_featured' => true,
                'is_pinned' => true,
                'order' => 1,
                'tags' => ['ازموینه', 'جوړول', 'صنف'],
            ],
            [
                'category_slug' => 'exams-assessments',
                'slug' => 'managing-exam-classes-subjects',
                'title' => 'د ازموینې د صنفونو او مضامینو مدیریت',
                'excerpt' => 'د ازموینې د صنفونو او مضامینو د تخصیص کولو، نمراتو د تنظیماتو لارښود',
                'content' => $this->getManageExamClassesContent(),
                'order' => 2,
                'tags' => ['ازموینه', 'صنف', 'مضمون'],
            ],
            [
                'category_slug' => 'grades-results',
                'slug' => 'entering-student-grades',
                'title' => 'د زده کوونکو د نمراتو د داخلولو لارښود',
                'excerpt' => 'د زده کوونکو د ازموینې نمراتو د داخلولو او ذخیره کولو لارښود',
                'content' => $this->getEnterGradesContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['نمرات', 'داخلول', 'ازموینه'],
            ],
            [
                'category_slug' => 'grades-results',
                'slug' => 'viewing-exam-results',
                'title' => 'د ازموینې د پایلو کتلو لارښود',
                'excerpt' => 'د ازموینې د پایلو کتلو، د زده کوونکو د نمراتو د تجزیې لارښود',
                'content' => $this->getViewResultsContent(),
                'order' => 2,
                'tags' => ['پایلې', 'نمرات', 'کتل'],
            ],
            [
                'category_slug' => 'timetables',
                'slug' => 'creating-timetable',
                'title' => 'تقسیم اوقات  د جوړولو لارښود',
                'excerpt' => 'د صنف تقسیم اوقات  د جوړولو او د مضامینو د وختونو د تنظیماتو لارښود',
                'content' => $this->getCreateTimetableContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['وخت جدول', 'جوړول', 'صنف'],
            ],
            [
                'category_slug' => 'timetables',
                'slug' => 'managing-timetable-entries',
                'title' => 'تقسیم اوقات  د داخلونو مدیریت',
                'excerpt' => 'تقسیم اوقات  د داخلونو بدلون، حذف او تازه کولو لارښود',
                'content' => $this->getManageTimetableContent(),
                'order' => 2,
                'tags' => ['وخت جدول', 'مدیریت', 'بدلون'],
            ],

            // ========== STAFF MANAGEMENT ==========
            [
                'category_slug' => 'staff-registration',
                'slug' => 'registering-new-staff',
                'title' => 'د نوی کارکوونکي د ثبتولو لارښود',
                'excerpt' => 'د نوی کارکوونکي د ثبتولو او د هغه د معلوماتو د داخلولو لارښود',
                'content' => $this->getRegisterStaffContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['کارکوونکی', 'ثبتول', 'معلومات'],
            ],
            [
                'category_slug' => 'teacher-assignments',
                'slug' => 'assigning-teacher-to-class',
                'title' => 'د استاد د صنف ته د تخصیص کولو لارښود',
                'excerpt' => 'د استاد د یوې ټاکلې صنف ته د تخصیص کولو لارښود',
                'content' => $this->getAssignTeacherContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['استاد', 'صنف', 'تخصیص'],
            ],
            [
                'category_slug' => 'teacher-assignments',
                'slug' => 'assigning-teacher-to-subject',
                'title' => 'د استاد د مضمون ته د تخصیص کولو لارښود',
                'excerpt' => 'د استاد د یوې ټاکلې صنف او مضمون ته د تخصیص کولو لارښود',
                'content' => $this->getAssignTeacherSubjectContent(),
                'order' => 2,
                'tags' => ['استاد', 'مضمون', 'تخصیص'],
            ],

            // ========== ATTENDANCE ==========
            [
                'category_slug' => 'student-attendance',
                'slug' => 'taking-student-attendance',
                'title' => 'د زده کوونکو د حاضری د نیولو لارښود',
                'excerpt' => 'د زده کوونکو د حاضری د نیولو، حاضر/غیرحاضر د نښه کولو لارښود',
                'content' => $this->getTakeStudentAttendanceContent(),
                'is_featured' => true,
                'is_pinned' => true,
                'order' => 1,
                'tags' => ['حاضری', 'زده کوونکی', 'نیول'],
            ],
            [
                'category_slug' => 'attendance-reports',
                'slug' => 'viewing-attendance-reports',
                'title' => 'د حاضری د راپورونو کتلو لارښود',
                'excerpt' => 'د زده کوونکو د حاضری د راپورونو کتلو او د تجزیې لارښود',
                'content' => $this->getAttendanceReportsContent(),
                'order' => 1,
                'tags' => ['حاضری', 'راپور', 'کتل'],
            ],

            // ========== FINANCIAL MANAGEMENT ==========
            [
                'category_slug' => 'fee-management',
                'slug' => 'creating-fee-structure',
                'title' => 'د فیس د جوړښت د جوړولو لارښود',
                'excerpt' => 'د فیس د جوړښت د جوړولو، د فیسونو د تعریف کولو لارښود',
                'content' => $this->getCreateFeeStructureContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['فیس', 'جوړښت', 'جوړول'],
            ],
            [
                'category_slug' => 'payments',
                'slug' => 'recording-student-payment',
                'title' => 'د زده کوونکي د تادیې د ثبتولو لارښود',
                'excerpt' => 'د زده کوونکي د فیس تادیې د ثبتولو او د رسید د چاپولو لارښود',
                'content' => $this->getRecordPaymentContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['تادیه', 'فیس', 'ثبتول'],
            ],

            // ========== LIBRARY MANAGEMENT ==========
            [
                'category_slug' => 'book-management',
                'slug' => 'adding-library-book',
                'title' => 'د کتابتون کتاب د اضافه کولو لارښود',
                'excerpt' => 'د نوی کتاب د کتابتون ته د اضافه کولو او د هغه د معلوماتو د داخلولو لارښود',
                'content' => $this->getAddBookContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['کتاب', 'کتابتون', 'اضافه کول'],
            ],
            [
                'category_slug' => 'book-loans',
                'slug' => 'issuing-book-loan',
                'title' => 'د کتاب د اخیستلو د ثبتولو لارښود',
                'excerpt' => 'د زده کوونکي یا کارکوونکي ته د کتاب د اخیستلو د ثبتولو لارښود',
                'content' => $this->getIssueLoanContent(),
                'order' => 1,
                'tags' => ['کتاب', 'اخیستل', 'ثبتول'],
            ],

            // ========== EVENTS MANAGEMENT ==========
            [
                'category_slug' => 'creating-events',
                'slug' => 'how-to-create-event',
                'title' => 'د پیښې د جوړولو لارښود',
                'excerpt' => 'د نوی پیښې د جوړولو، د معلوماتو د داخلولو او د تنظیماتو لارښود',
                'content' => $this->getCreateEventContent(),
                'is_featured' => true,
                'order' => 1,
                'tags' => ['پیښه', 'جوړول', 'تنظیمات'],
            ],

            // ========== DOCUMENT MANAGEMENT ==========
            [
                'category_slug' => 'incoming-documents',
                'slug' => 'registering-incoming-document',
                'title' => 'د راتلونکي سند د ثبتولو لارښود',
                'excerpt' => 'د راتلونکي سند د ثبتولو، د معلوماتو د داخلولو لارښود',
                'content' => $this->getRegisterIncomingDocContent(),
                'order' => 1,
                'tags' => ['سند', 'راتلونکی', 'ثبتول'],
            ],
            [
                'category_slug' => 'outgoing-documents',
                'slug' => 'creating-outgoing-document',
                'title' => 'د وتلونکي سند د جوړولو لارښود',
                'excerpt' => 'د وتلونکي سند د جوړولو، د معلوماتو د داخلولو لارښود',
                'content' => $this->getCreateOutgoingDocContent(),
                'order' => 1,
                'tags' => ['سند', 'وتلونکی', 'جوړول'],
            ],

            // ========== SETTINGS ==========
            [
                'category_slug' => 'buildings-rooms',
                'slug' => 'managing-buildings-rooms',
                'title' => 'د ودانۍ او خونو د مدیریت لارښود',
                'excerpt' => 'د ودانۍ او خونو د اضافه کولو، بدلون او حذف کولو لارښود',
                'content' => $this->getManageBuildingsContent(),
                'order' => 1,
                'tags' => ['ودانۍ', 'خونې', 'مدیریت'],
            ],
        ];
    }

    // ========== CONTENT METHODS ==========

    protected function getGettingStartedContent(): string
    {
        return '<h2>د ناظیم سیسټم پېژندنه</h2>
        <p>ناظیم د ښوونځي د مدیریت یو بشپړ سیسټم دی چې د زده کوونکو، استادانو، مالیاتو، کتابتون او نورو برخو د مدیریت لپاره کارول کېږي.</p>
        <h3>د سیسټم اصلي برخې:</h3>
        <ul>
            <li><strong>زده کوونکو مدیریت:</strong> د زده کوونکو ثبتول، شمولیت، او معلومات</li>
            <li><strong>اکاډمیک مدیریت:</strong> صنفونه، مضامین، ازموینې، نمرات</li>
            <li><strong>کارکوونکو مدیریت:</strong> د استادانو او کارکوونکو ثبتول</li>
            <li><strong>حاضری:</strong> د زده کوونکو او کارکوونکو حاضری</li>
            <li><strong>مالیات:</strong> فیسونه، تادیې، مصارف</li>
            <li><strong>کتابتون:</strong> د کتابونو مدیریت</li>
            <li><strong>پیښې:</strong> د ښوونځي پیښو مدیریت</li>
        </ul>
        <h3>د کار پیل:</h3>
        <p>د سیسټم د کار کولو لپاره لومړی باید خپل حساب ته ننوځئ. د ننوتلو وروسته تاسو کولی شئ د خپلو دندو د ترسره کولو لپاره سیسټم وکاروئ.</p>';
    }

    protected function getFirstLoginContent(): string
    {
        return '<h2>لومړی ننوتل او د حساب تنظیمات</h2>
        <h3>د لومړي ځل لپاره ننوتل:</h3>
        <ol>
            <li>د خپل بریښنالیک او پټنوم کار واخلئ</li>
            <li>د "ننوتل" تڼۍ کلیک وکړئ</li>
            <li>که تاسو خپل پټنوم هیر کړی وي، د "پټنوم هیر شوی" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د حساب تنظیمات:</h3>
        <p>د ننوتلو وروسته تاسو کولی شئ:</p>
        <ul>
            <li>خپل نوم او بریښنالیک بدل کړئ</li>
            <li>خپل پټنوم بدل کړئ</li>
            <li>خپل عکس اضافه کړئ</li>
            <li>د ژبې او نورو تنظیماتو انتخاب وکړئ</li>
        </ul>';
    }

    protected function getStudentRegistrationContent(): string
    {
        return '<h2>د نوی زده کوونکي د ثبتولو لارښود</h2>
        <h3>لومړی مرحله: د زده کوونکي د معلوماتو داخلول</h3>
        <ol>
            <li>د "زده کوونکو" برخه ته لاړ شئ</li>
            <li>د "نوی زده کوونکی" تڼۍ کلیک وکړئ</li>
            <li>د زده کوونکي د شخصي معلوماتو داخلول:
                <ul>
                    <li>بشپړ نوم</li>
                    <li>د پلار نوم</li>
                    <li>د نیکه نوم</li>
                    <li>د مور نوم</li>
                    <li>جنس</li>
                    <li>د زیږون نیټه</li>
                    <li>د زیږون کال</li>
                </ul>
            </li>
            <li>د اړیکو معلومات:
                <ul>
                    <li>د کور پته</li>
                    <li>د اوسیدو سیمه (ولایت، ولسوالۍ، کلی)</li>
                    <li>د اصلي سیمه</li>
                    <li>د تلیفون شمیره</li>
                </ul>
            </li>
            <li>د سرپرست معلومات:
                <ul>
                    <li>د سرپرست نوم</li>
                    <li>د سرپرست اړیکه</li>
                    <li>د سرپرست تلیفون</li>
                    <li>د سرپرست تذکره شمیره</li>
                </ul>
            </li>
            <li>د زمين (ضامن) معلومات (که اړین وي)</li>
        </ol>
        <h3>دویمه مرحله: د اسنادو اضافه کول</h3>
        <p>د زده کوونکي د ثبتولو لپاره اړین اسناد:</p>
        <ul>
            <li>د زده کوونکي عکس</li>
            <li>د تذکره کاپي</li>
            <li>د سرپرست تذکره کاپي</li>
            <li>د پخواني ښوونځي د شهادت نامه (که شته)</li>
        </ul>
        <h3>دریمه مرحله: د ثبتولو پای ته رسول</h3>
        <p>د ټولو معلوماتو د داخلولو وروسته د "ذخیره کول" تڼۍ کلیک وکړئ. د ثبتولو وروسته تاسو کولی شئ زده کوونکی د صنف ته وګمارئ.</p>';
    }

    protected function getStudentDocumentsContent(): string
    {
        return '<h2>د زده کوونکي د ثبتولو لپاره اړین اسناد</h2>
        <h3>اړین اسناد:</h3>
        <ul>
            <li><strong>د زده کوونکي عکس:</strong> د پاسپورټ اندازه عکس (PNG یا JPG بڼه)</li>
            <li><strong>د تذکره کاپي:</strong> د زده کوونکي د تذکره د لومړی مخ کاپي</li>
            <li><strong>د سرپرست تذکره کاپي:</strong> د سرپرست د تذکره کاپي</li>
            <li><strong>د پخواني ښوونځي شهادت نامه:</strong> که زده کوونکی پخوا په بل ښوونځي کې زده کړې کړي وي</li>
        </ul>
        <h3>د اسنادو د اضافه کولو لارښود:</h3>
        <ol>
            <li>د "اسناد اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د سند ډول وټاکئ</li>
            <li>د فایل انتخاب وکړئ</li>
            <li>د "اضافه کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <p><strong>نوټ:</strong> ټول اسناد باید د PDF یا عکس بڼه ولري. د فایل اندازه باید له 5MB څخه لږه وي.</p>';
    }

    protected function getStudentAdmissionContent(): string
    {
        return '<h2>د زده کوونکي د صنف ته د شمولیت ورکولو لارښود</h2>
        <h3>لومړی مرحله: د زده کوونکي انتخاب</h3>
        <ol>
            <li>د "زده کوونکو" برخه ته لاړ شئ</li>
            <li>د هغه زده کوونکي نوم کلیک وکړئ چې تاسو یې د صنف ته وګماري</li>
            <li>د "شمولیت" برخه ته لاړ شئ</li>
        </ol>
        <h3>دویمه مرحله: د شمولیت معلومات</h3>
        <ol>
            <li>د اکاډمیک کال انتخاب وکړئ</li>
            <li>د صنف انتخاب وکړئ</li>
            <li>د شمولیت نیټه وټاکئ</li>
            <li>د شمولیت ډول (عادي یا بورس) وټاکئ</li>
            <li>که زده کوونکی د بورډینګ زده کوونکی وي، د "بورډینګ" چک باکس نښه کړئ</li>
            <li>د بورډینګ خونې انتخاب وکړئ (که بورډینګ وي)</li>
        </ol>
        <h3>دریمه مرحله: د فیس حالت</h3>
        <p>د فیس حالت وټاکئ:</p>
        <ul>
            <li><strong>تادیه شوی:</strong> که فیس تادیه شوی وي</li>
            <li><strong>نیمه تادیه:</strong> که یو برخه تادیه شوی وي</li>
            <li><strong>تادیه نشوی:</strong> که فیس تادیه نشوی وي</li>
        </ul>
        <h3>پای:</h3>
        <p>د "ذخیره کول" تڼۍ کلیک وکړئ. د شمولیت وروسته زده کوونکی د ټاکل شوي صنف غړی کېږي.</p>';
    }

    protected function getManageAdmissionsContent(): string
    {
        return '<h2>د زده کوونکو د شمولیتونو مدیریت</h2>
        <h3>د شمولیت کتلو لارښود:</h3>
        <ol>
            <li>د "زده کوونکو" برخه ته لاړ شئ</li>
            <li>د "شمولیتونه" برخه وټاکئ</li>
            <li>د اکاډمیک کال او صنف فیلټر وکاروئ</li>
        </ol>
        <h3>د شمولیت بدلون:</h3>
        <ol>
            <li>د هغه شمولیت نوم کلیک وکړئ چې تاسو یې بدلول غواړئ</li>
            <li>د "بدلول" تڼۍ کلیک وکړئ</li>
            <li>اړین بدلونونه وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د شمولیت حذف کول:</h3>
        <p><strong>احتیاط:</strong> د شمولیت حذف کول د زده کوونکي د ټولو اکاډمیک معلوماتو حذف کول دي. د دې کار ترسره کولو دمخه ډاډمن شئ.</p>
        <ol>
            <li>د هغه شمولیت نوم کلیک وکړئ</li>
            <li>د "حذف کول" تڼۍ کلیک وکړئ</li>
            <li>د تایید پیغام تایید وکړئ</li>
        </ol>';
    }

    protected function getViewStudentProfileContent(): string
    {
        return '<h2>د زده کوونکي د پروفایل کتلو لارښود</h2>
        <h3>د پروفایل ته د لاسرسي لار:</h3>
        <ol>
            <li>د "زده کوونکو" برخه ته لاړ شئ</li>
            <li>د هغه زده کوونکي نوم کلیک وکړئ چې تاسو یې پروفایل وګورئ</li>
        </ol>
        <h3>د پروفایل برخې:</h3>
        <ul>
            <li><strong>شخصي معلومات:</strong> نوم، د پلار نوم، د زیږون نیټه، جنس</li>
            <li><strong>اړیکو معلومات:</strong> پته، تلیفون، بریښنالیک</li>
            <li><strong>د سرپرست معلومات:</strong> د سرپرست نوم، اړیکه، تلیفون</li>
            <li><strong>اکاډمیک معلومات:</strong> د اوسني صنف، د شمولیت نیټه</li>
            <li><strong>د ازموینو نمرات:</strong> د ټولو ازموینو نمرات</li>
            <li><strong>حاضری:</strong> د حاضری راپور</li>
            <li><strong>فیسونه:</strong> د فیسونو او تادیو راپور</li>
            <li><strong>اسناد:</strong> د زده کوونکي ټول اسناد</li>
        </ul>';
    }

    protected function getEditStudentContent(): string
    {
        return '<h2>د زده کوونکي د معلوماتو بدلون</h2>
        <h3>د معلوماتو بدلون:</h3>
        <ol>
            <li>د زده کوونکي پروفایل ته لاړ شئ</li>
            <li>د "بدلول" تڼۍ کلیک وکړئ</li>
            <li>اړین بدلونونه وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د اسنادو اضافه کول:</h3>
        <ol>
            <li>د "اسناد" برخه ته لاړ شئ</li>
            <li>د "نوی سند اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د سند ډول وټاکئ</li>
            <li>د فایل انتخاب وکړئ</li>
            <li>د "اضافه کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د عکس بدلون:</h3>
        <ol>
            <li>د زده کوونکي د عکس پر سر کلیک وکړئ</li>
            <li>د نوی عکس انتخاب وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>';
    }

    protected function getCreateAcademicYearContent(): string
    {
        return '<h2>د اکاډمیک کال د جوړولو لارښود</h2>
        <h3>لومړی مرحله: د اکاډمیک کال معلومات</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "اکاډمیک کلونه" برخه وټاکئ</li>
            <li>د "نوی اکاډمیک کال" تڼۍ کلیک وکړئ</li>
            <li>د اکاډمیک کال معلومات داخل کړئ:
                <ul>
                    <li>د اکاډمیک کال نوم (د بیلګې په توګه: ۱۴۰۳-۱۴۰۴)</li>
                    <li>د پیل نیټه</li>
                    <li>د پای نیټه</li>
                    <li>د اکاډمیک کال حالت (فعال/غیرفعال)</li>
                </ul>
            </li>
        </ol>
        <h3>دویمه مرحله: د ذخیره کولو</h3>
        <p>د "ذخیره کول" تڼۍ کلیک وکړئ. د اکاډمیک کال د جوړولو وروسته تاسو کولی شئ صنفونه او مضامین تنظیم کړئ.</p>
        <h3>نوټ:</h3>
        <p>یوازې یو اکاډمیک کال کولی شي فعال وي. که تاسو نوی فعال اکاډمیک کال جوړ کړئ، پخوانی به په اوتوماتیک ډول غیرفعال شي.</p>';
    }

    protected function getManageAcademicYearsContent(): string
    {
        return '<h2>د اکاډمیک کلونو د مدیریت لارښود</h2>
        <h3>د اکاډمیک کال فعال/غیرفعال کول:</h3>
        <ol>
            <li>د "اکاډمیک کلونه" برخه ته لاړ شئ</li>
            <li>د هغه اکاډمیک کال نوم کلیک وکړئ</li>
            <li>د "بدلول" تڼۍ کلیک وکړئ</li>
            <li>د حالت بدلون وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د اکاډمیک کال حذف کول:</h3>
        <p><strong>احتیاط:</strong> د اکاډمیک کال حذف کول د هغه د ټولو معلوماتو حذف کول دي. د دې کار ترسره کولو دمخه ډاډمن شئ.</p>
        <ol>
            <li>د هغه اکاډمیک کال نوم کلیک وکړئ</li>
            <li>د "حذف کول" تڼۍ کلیک وکړئ</li>
            <li>د تایید پیغام تایید وکړئ</li>
        </ol>';
    }

    protected function getCreateClassContent(): string
    {
        return '<h2>د نوی صنف د جوړولو لارښود</h2>
        <h3>لومړی مرحله: د صنف معلومات</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "صنفونه" برخه وټاکئ</li>
            <li>د "نوی صنف" تڼۍ کلیک وکړئ</li>
            <li>د صنف معلومات داخل کړئ:
                <ul>
                    <li>د صنف نوم (د بیلګې په توګه: ۱۰م، ۱۱م، ۱۲م)</li>
                    <li>د صنف کوډ (د بیلګې په توګه: 10, 11, 12)</li>
                    <li>د صنف توضیحات</li>
                    <li>د صنف ظرفیت (د زده کوونکو شمیر)</li>
                </ul>
            </li>
        </ol>
        <h3>دویمه مرحله: د ذخیره کولو</h3>
        <p>د "ذخیره کول" تڼۍ کلیک وکړئ. د صنف د جوړولو وروسته تاسو کولی شئ هغه د اکاډمیک کال ته تخصیص کړئ.</p>';
    }

    protected function getAssignClassToYearContent(): string
    {
        return '<h2>د صنفونو د اکاډمیک کال ته د تخصیص کولو لارښود</h2>
        <h3>لومړی مرحله: د اکاډمیک کال انتخاب</h3>
        <ol>
            <li>د "اکاډمیک کلونه" برخه ته لاړ شئ</li>
            <li>د هغه اکاډمیک کال نوم کلیک وکړئ چې تاسو یې صنفونه وګماري</li>
            <li>د "صنفونه" برخه وټاکئ</li>
        </ol>
        <h3>دویمه مرحله: د صنف تخصیص</h3>
        <ol>
            <li>د "صنف اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د صنف انتخاب وکړئ</li>
            <li>د صنف د ظرفیت معلومات داخل کړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>دریمه مرحله: د زده کوونکو اضافه کول</h3>
        <p>د صنف د تخصیص وروسته تاسو کولی شئ زده کوونکي د صنف ته اضافه کړئ:</p>
        <ol>
            <li>د صنف نوم کلیک وکړئ</li>
            <li>د "زده کوونکي اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د زده کوونکو انتخاب وکړئ</li>
            <li>د "اضافه کول" تڼۍ کلیک وکړئ</li>
        </ol>';
    }

    protected function getCreateSubjectContent(): string
    {
        return '<h2>د نوی مضمون د جوړولو لارښود</h2>
        <h3>لومړی مرحله: د مضمون معلومات</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د "نوی مضمون" تڼۍ کلیک وکړئ</li>
            <li>د مضمون معلومات داخل کړئ:
                <ul>
                    <li>د مضمون نوم (د بیلګې په توګه: ریاضیات، فزیک، کیمیا)</li>
                    <li>د مضمون کوډ</li>
                    <li>د مضمون توضیحات</li>
                    <li>د مضمون ډول (اصلي، اختیاري)</li>
                </ul>
            </li>
        </ol>
        <h3>دویمه مرحله: د ذخیره کولو</h3>
        <p>د "ذخیره کول" تڼۍ کلیک وکړئ. د مضمون د جوړولو وروسته تاسو کولی شئ هغه د صنفونو ته تخصیص کړئ.</p>';
    }

    protected function getAssignSubjectsContent(): string
    {
        return '<h2>د مضامینو د صنفونو ته د تخصیص کولو لارښود</h2>
        <h3>لومړی مرحله: د مضامینو د ټیمپلیټونو جوړول</h3>
        <p>د مضامینو د صنفونو ته د تخصیص کولو لپاره لومړی باید د مضامینو ټیمپلیټونه جوړ کړئ:</p>
        <ol>
            <li>د "صنفونه" برخه ته لاړ شئ</li>
            <li>د هغه صنف نوم کلیک وکړئ چې تاسو یې مضامین وګماري</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د "مضمون اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د مضمون انتخاب وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>دویمه مرحله: د مضامینو د اکاډمیک کال ته تخصیص</h3>
        <p>د ټیمپلیټونو د جوړولو وروسته تاسو کولی شئ مضامین د اکاډمیک کال ته تخصیص کړئ:</p>
        <ol>
            <li>د "اکاډمیک کلونه" برخه ته لاړ شئ</li>
            <li>د هغه اکاډمیک کال نوم کلیک وکړئ</li>
            <li>د هغه صنف نوم کلیک وکړئ چې تاسو یې مضامین وګماري</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د "مضمون اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د مضمون انتخاب وکړئ</li>
            <li>د استاد انتخاب وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>';
    }

    protected function getCreateExamContent(): string
    {
        return '<h2>د ازموینې د جوړولو لارښود</h2>
        <h3>لومړی مرحله: د ازموینې بنسټیز معلومات</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "ازموینې" برخه وټاکئ</li>
            <li>د "نوی ازموینه" تڼۍ کلیک وکړئ</li>
            <li>د ازموینې معلومات داخل کړئ:
                <ul>
                    <li>د ازموینې نوم (د بیلګې په توګه: د لومړي فصل ازموینه)</li>
                    <li>د اکاډمیک کال انتخاب</li>
                    <li>د ازموینې ډول (د بیلګې په توګه: میانی، پای)</li>
                    <li>د ازموینې توضیحات</li>
                </ul>
            </li>
        </ol>
        <h3>دویمه مرحله: د صنفونو تخصیص</h3>
        <ol>
            <li>د "صنفونه" برخه وټاکئ</li>
            <li>د "صنف اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د صنف انتخاب وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>دریمه مرحله: د مضامینو تخصیص</h3>
        <ol>
            <li>د هغه صنف نوم کلیک وکړئ چې تاسو یې مضامین وګماري</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د "مضمون اضافه کول" تڼۍ کلیک وکړئ</li>
            <li>د مضمون انتخاب وکړئ</li>
            <li>د ټولو نمراتو شمیر داخل کړئ</li>
            <li>د پاس نمرات شمیر داخل کړئ</li>
            <li>د ازموینې نیټه او وخت وټاکئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>پای:</h3>
        <p>د ازموینې د جوړولو وروسته تاسو کولی شئ د زده کوونکو نمرات داخل کړئ.</p>';
    }

    protected function getManageExamClassesContent(): string
    {
        return '<h2>د ازموینې د صنفونو او مضامینو مدیریت</h2>
        <h3>د صنف حذف کول:</h3>
        <ol>
            <li>د ازموینې نوم کلیک وکړئ</li>
            <li>د "صنفونه" برخه وټاکئ</li>
            <li>د هغه صنف پر وړاندې د "حذف کول" تڼۍ کلیک وکړئ</li>
            <li>د تایید پیغام تایید وکړئ</li>
        </ol>
        <h3>د مضمون بدلون:</h3>
        <ol>
            <li>د هغه صنف نوم کلیک وکړئ</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د هغه مضمون نوم کلیک وکړئ</li>
            <li>د "بدلول" تڼۍ کلیک وکړئ</li>
            <li>اړین بدلونونه وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د مضمون حذف کول:</h3>
        <p><strong>احتیاط:</strong> د مضمون حذف کول د هغه د ټولو نمراتو حذف کول دي.</p>
        <ol>
            <li>د هغه مضمون نوم کلیک وکړئ</li>
            <li>د "حذف کول" تڼۍ کلیک وکړئ</li>
            <li>د تایید پیغام تایید وکړئ</li>
        </ol>';
    }

    protected function getEnterGradesContent(): string
    {
        return '<h2>د زده کوونکو د نمراتو د داخلولو لارښود</h2>
        <h3>لومړی مرحله: د ازموینې انتخاب</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "ازموینې" برخه وټاکئ</li>
            <li>د هغه ازموینې نوم کلیک وکړئ چې تاسو یې نمرات داخل کړئ</li>
        </ol>
        <h3>دویمه مرحله: د مضمون انتخاب</h3>
        <ol>
            <li>د "صنفونه" برخه وټاکئ</li>
            <li>د هغه صنف نوم کلیک وکړئ</li>
            <li>د "مضامین" برخه وټاکئ</li>
            <li>د هغه مضمون نوم کلیک وکړئ چې تاسو یې نمرات داخل کړئ</li>
        </ol>
        <h3>دریمه مرحله: د نمراتو داخلول</h3>
        <ol>
            <li>د "نمرات" برخه وټاکئ</li>
            <li>د هر زده کوونکي لپاره د نمراتو شمیر داخل کړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>د ډله ییزو نمراتو داخلول:</h3>
        <p>که تاسو غواړئ د ډیری زده کوونکو لپاره نمرات یوځل داخل کړئ:</p>
        <ol>
            <li>د "د Excel څخه وارد کول" تڼۍ کلیک وکړئ</li>
            <li>د Excel فایل چمتو کړئ</li>
            <li>د فایل انتخاب وکړئ</li>
            <li>د "وارد کول" تڼۍ کلیک وکړئ</li>
        </ol>';
    }

    protected function getViewResultsContent(): string
    {
        return '<h2>د ازموینې د پایلو کتلو لارښود</h2>
        <h3>د ازموینې پایلې کتل:</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "ازموینې" برخه وټاکئ</li>
            <li>د هغه ازموینې نوم کلیک وکړئ</li>
            <li>د "پایلې" برخه وټاکئ</li>
        </ol>
        <h3>د زده کوونکي د نمراتو کتل:</h3>
        <ol>
            <li>د "زده کوونکو" برخه ته لاړ شئ</li>
            <li>د هغه زده کوونکي نوم کلیک وکړئ</li>
            <li>د "ازموینې" برخه وټاکئ</li>
            <li>د هغه ازموینې نوم کلیک وکړئ چې تاسو یې پایلې وګورئ</li>
        </ol>
        <h3>د راپورونو چاپول:</h3>
        <p>تاسو کولی شئ د ازموینې د پایلو راپور چاپ کړئ:</p>
        <ol>
            <li>د ازموینې د پایلو برخه کې د "چاپول" تڼۍ کلیک وکړئ</li>
            <li>د راپور بڼه وټاکئ (PDF یا Excel)</li>
            <li>د "چاپول" تڼۍ کلیک وکړئ</li>
        </ol>';
    }

    protected function getCreateTimetableContent(): string
    {
        return '<h2>تقسیم اوقات  د جوړولو لارښود</h2>
        <h3>لومړی مرحله: تقسیم اوقات  بنسټیز معلومات</h3>
        <ol>
            <li>د "اکاډمیک مدیریت" برخه ته لاړ شئ</li>
            <li>د "وخت تقسیم اوقاتونه" برخه وټاکئ</li>
            <li>د "نوی وخت جدول" تڼۍ کلیک وکړئ</li>
            <li>تقسیم اوقات  معلومات داخل کړئ:
                <ul>
                    <li>تقسیم اوقات  نوم</li>
                    <li>د اکاډمیک کال انتخاب</li>
                    <li>د صنف انتخاب</li>
                </ul>
            </li>
        </ol>
        <h3>دویمه مرحله: د وختونو تنظیم</h3>
        <ol>
            <li>د "وختونه" برخه وټاکئ</li>
            <li>د هرې ورځې لپاره د وختونو تنظیم وکړئ</li>
            <li>د هر وخت لپاره د مضمون او استاد انتخاب وکړئ</li>
            <li>د "ذخیره کول" تڼۍ کلیک وکړئ</li>
        </ol>
        <h3>دریمه مرحله: د ذخیره کولو</h3>
        <p>د "ذخیره کول" تڼۍ کلیک وکړئ. تقسیم اوقات  د جوړولو وروسته تاسو کولی شئ هغه بدل کړئ یا چاپ کړئ.</p>';
    }

    protected function getManageTimetableContent(): string
    {
        return '<h2>O_ U^OrO? O?O_U^U, O_ O_O‌U215OrU,U^U+U^ U.O_UOOñUOO¦</h2>
        <h3>O_ O_O‌U215OrU, O"O_U,U^U+:</h3>
        <ol>
            <li>O_ U^OrO? O?O_U^U, U+U^U. UcU,UOUc U^UcU"OÝ</li>
            <li>O_ UØO§UØ O_O‌U215OrU, U+U^U. UcU,UOUc U^UcU"OÝ U+U? O¦O‌U215O3U^ UOU? O"O_U,U^U, O§U^O‌U215U"OÝ</li>
            <li>O_ "O"O_U,U^U," O¦U¬U? UcU,UOUc U^UcU"OÝ</li>
            <li>O‌U215U"UOU+ O"O_U,U^U+U^U+UØ U^UcU"OÝ</li>
            <li>O_ "OøOrUOOñUØ UcU^U," O¦U¬U? UcU,UOUc U^UcU"OÝ</li>
        </ol>
        <h3>O_ O_O‌U215OrU, O-OøU? UcU^U,:</h3>
        <ol>
            <li>O_ UØO§UØ O_O‌U215OrU, U+U^U. UcU,UOUc U^UcU"OÝ</li>
            <li>O_ "O-OøU? UcU^U," O¦U¬U? UcU,UOUc U^UcU"OÝ</li>
            <li>O_ O¦O‌U215UOUOO_ U_UOO§O‌U215U. O¦O‌U215UOUOO_ U^UcU"OÝ</li>
        </ol>
        <h3>O_ U^OrO? O?O_U^U, U+O‌U215U_U^U,:</h3>
        <ol>
            <li>?? ?????? ???? ? ?????? ?????? ?????.</li>
            <li>? ???? ??????? ?????? ?? ???? ?????? ?? ?? ??? ?????.</li>
            <li>? ???? ???? ????? ?? ???? ?????? ??????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ???? ??? ?? ???? ? ??????? ???????? ?? ?????.</li>
            <li>???? ?????????? ? ??? ?? ??? ????? ???.</li>
        </ul>';
    }

    protected function getRegisterStaffContent(): string
    {
        return '<h2>? ??? ????????? ?????</h2>
        <ol>
            <li>? ????????? ?? ???? ??? ? ??? ????????? ????? ??? ?????? ???.</li>
            <li>???? ???? ?? ? ????? ??????? ?????.</li>
            <li>????????? ????? ????? ?? ????? ?? ?????.</li>
            <li>??? ????? ??? ?? ??? ?????? ??? ?? ?? ???? ?? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ??? ????? ????? ?? ??? ??? ??????.</li>
            <li>? ??????? ?? ????????? ??????? ???? ???.</li>
        </ul>';
    }

    protected function getAssignTeacherContent(): string
    {
        return '<h2>? ?????? ????? ?? ????</h2>
        <ol>
            <li>? ????? ? ??????? ???? ???????.</li>
            <li>?????? ???? ?????? ??? ?? ?? ???? ??? ?????? ?????.</li>
            <li>?? ????? ?? ? ????? ? ??? ???? ?????.</li>
            <li>????? ??? ?? ? ????? ???? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ?????? ???? ??? ??????.</li>
            <li>????? ? ??????? ??? ??? ??? ?????.</li>
        </ul>';
    }

    protected function getAssignTeacherSubjectContent(): string
    {
        return '<h2>? ?????? ????? ?? ????</h2>
        <ol>
            <li>? ????? ?? ????? ? ??????? ???? ???????.</li>
            <li>?????? ???? ?????? ??? ?? ?????? ?????.</li>
            <li>?? ???? ?? ? ?????? ???? ???? ???.</li>
            <li>????? ??? ?? ??????? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ?????? ???????? ? ????? ??? ????? ???.</li>
            <li>????? ? ?????? ?? ????? ?? ????? ?????.</li>
        </ul>';
    }

    protected function getTakeStudentAttendanceContent(): string
    {
        return '<h2>? ?????????? ????? ??????</h2>
        <ol>
            <li>? ????? ? ????? ???? ???????.</li>
            <li>???? ?? ??? ?????.</li>
            <li>?? ?????????? ????? ???? ?? ?????? ??? ???.</li>
            <li>????? ??? ?? ????? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>????? ? ????? ?? ??? ??? ?????.</li>
            <li>? ????? ????? ????? ????? ?????.</li>
        </ul>';
    }

    protected function getAttendanceReportsContent(): string
    {
        return '<h2>? ????? ???????? ???</h2>
        <ol>
            <li>???????? ??????? ?? ????? ?????? ???.</li>
            <li>? ?????? ???? ?? ?????????? ?? ??? ???? ??????.</li>
            <li>????? ?? ????? ??????.</li>
            <li>?? ????? ?? ????? ???? ???.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>??????? ???????? ? ????? ????? ???? ??.</li>
            <li>? ???? ????? CSV ??? ??????.</li>
        </ul>';
    }

    protected function getCreateFeeStructureContent(): string
    {
        return '<h2>? ??? ????? ?????</h2>
        <ol>
            <li>? ??? ??????? ??????? ?? ??? ????? ????? ???.</li>
            <li>?????? ??????? ??? ?? ????? ?????.</li>
            <li>? ??? ????? ???? ?? ???? ????? ???.</li>
            <li>????? ??? ?? ??????? ??????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>?? ??? ?? ?????? ??? ?????.</li>
            <li>???? ? ??????? ????? ??? ?????? ?????.</li>
        </ul>';
    }

    protected function getRecordPaymentContent(): string
    {
        return '<h2>? ????? ?????</h2>
        <ol>
            <li>? ?????????? ? ??? ???? ???????.</li>
            <li>????? ????? ??? ?????? ???.</li>
            <li>????? ????? ????? ?? ????? ???? ?????.</li>
            <li>????? ??? ?? ?? ????? ?? ???? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>?? ??? ???? ???? ???? ?????.</li>
            <li>? ????? ????? ? ????? ????? ?????.</li>
        </ul>';
    }

    protected function getIssueLoanContent(): string
    {
        return '<h2>? ??? ?????</h2>
        <ol>
            <li>? ???? ?????? ???? ???????.</li>
            <li>??? ????????? ????? ?? ???? ?????.</li>
            <li>? ????? ????? ?? ???? ????? ???.</li>
            <li>????? ??? ?? ????? ?? ??? ???.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ??????? ???? ??????? ?????.</li>
            <li>???????? ? ???? ?????? ????? ??? ???.</li>
        </ul>';
    }

    protected function getAddBookContent(): string
    {
        return '<h2>??????? ?? ? ???? ????? ???</h2>
        <ol>
            <li>? ??????? ???? ???????.</li>
            <li>??? ???? ????? ??? ?????? ???.</li>
            <li>?????? ?????? ?? ISBN ?????.</li>
            <li>????? ??? ?? ?? ???? ?? ?? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ?????? ??????? ? ?????? ????? ISBN ??????.</li>
            <li>? ???? ??????? ????? ?????? ????? ???.</li>
        </ul>';
    }

    protected function getRegisterIncomingDocContent(): string
    {
        return '<h2>? ????? ?????? ?????</h2>
        <ol>
            <li>? ?????? ??? ???? ???????.</li>
            <li>???? ??? ????? ?????? ???.</li>
            <li>???????? ????? ?? ? ?????? ???? ???? ?????.</li>
            <li>??? ????? ??? ?? ????? ???.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ????? ????? ???? ?????? ??????.</li>
            <li>? ??? ???? ????? ?????? ??????.</li>
        </ul>';
    }

    protected function getCreateOutgoingDocContent(): string
    {
        return '<h2>? ????? ?????? ?????</h2>
        <ol>
            <li>? ?????? ??? ???? ???????.</li>
            <li>???? ??? ????? ?????? ???.</li>
            <li>?????? ??????? ????? ?? ? ????? ???? ?????.</li>
            <li>???? ????? ??? ?? ????? ???.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>?? ????? ?? ? ????? ???? ??????.</li>
            <li>?????? ?????? ??? ???? ?????.</li>
        </ul>';
    }

    protected function getCreateEventContent(): string
    {
        return '<h2>? ???? ?????</h2>
        <ol>
            <li>? ???? ?????? ???????.</li>
            <li>???? ????? ?????? ???.</li>
            <li>?????? ???? ?? ??? ?????.</li>
            <li>????? ??? ?? ??????? ??? ???.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ???? ????? ????? ?????? ????? ???.</li>
            <li>?? ????? ?? ????? ??????? ???.</li>
        </ul>';
    }

    protected function getManageBuildingsContent(): string
    {
        return '<h2>? ?????? ??????</h2>
        <ol>
            <li>? ?????? ???? ???????.</li>
            <li>? ????? ?????? ????? ?? ?? ???.</li>
            <li>???? ?? ???????? ?????.</li>
            <li>???????? ????? ??? ?? ??????? ?????.</li>
        </ol>
        <h3>????????:</h3>
        <ul>
            <li>? ???? ????? ???? ?????.</li>
            <li>?? ??? ? ????? ??????? ????.</li>
        </ul>';
    }
}
