<?php

namespace Database\Seeders;

use App\Models\LibraryBook;
use App\Models\LibraryCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class LibraryBookSeeder extends Seeder
{
    /**
     * Seed the library_books table.
     *
     * Creates Islamic books in Arabic for all categories in all organizations.
     * Each category gets at least 3 books.
     */
    public function run(): void
    {
        $this->command->info('Seeding library books...');

        // Get all active organizations
        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get();

        if ($organizations->isEmpty()) {
            $this->command->warn('No organizations found. Please run OrganizationSeeder or DatabaseSeeder first.');
            return;
        }

        // Define books for each category (by category code)
        $booksByCategory = [
            'quran' => [
                ['title' => 'المصحف الشريف', 'author' => 'طبعة مجمع الملك فهد', 'description' => 'مصحف كامل بطباعة فاخرة مع علامات التوقيف'],
                ['title' => 'القرآن الكريم برواية حفص', 'author' => 'طبعة دار المدينة', 'description' => 'قرآن كريم برواية حفص عن عاصم مع التجويد'],
                ['title' => 'المصحف المفسر', 'author' => 'دار المعرفة', 'description' => 'مصحف مع تفسير مختصر في الهامش'],
            ],
            'tafsir' => [
                ['title' => 'تفسير ابن كثير', 'author' => 'ابن كثير', 'description' => 'تفسير القرآن العظيم في ثمانية مجلدات'],
                ['title' => 'تفسير الجلالين', 'author' => 'جلال الدين المحلي والسيوطي', 'description' => 'تفسير مختصر وواضح للقرآن الكريم'],
                ['title' => 'تفسير الطبري', 'author' => 'ابن جرير الطبري', 'description' => 'جامع البيان في تأويل القرآن'],
            ],
            'hadith' => [
                ['title' => 'صحيح البخاري', 'author' => 'الإمام البخاري', 'description' => 'أصح كتاب بعد كتاب الله تعالى'],
                ['title' => 'صحيح مسلم', 'author' => 'الإمام مسلم', 'description' => 'ثاني أصح كتاب بعد صحيح البخاري'],
                ['title' => 'رياض الصالحين', 'author' => 'النووي', 'description' => 'مجموعة من الأحاديث الصحيحة في الأخلاق والآداب'],
            ],
            'fiqh' => [
                ['title' => 'المغني', 'author' => 'ابن قدامة', 'description' => 'كتاب في الفقه الحنبلي'],
                ['title' => 'بداية المجتهد', 'author' => 'ابن رشد', 'description' => 'كتاب في الفقه المقارن'],
                ['title' => 'الفقه الإسلامي وأدلته', 'author' => 'وهبة الزحيلي', 'description' => 'موسوعة فقهية شاملة'],
            ],
            'aqeedah' => [
                ['title' => 'العقيدة الطحاوية', 'author' => 'أبو جعفر الطحاوي', 'description' => 'شرح العقيدة السلفية'],
                ['title' => 'شرح العقيدة الواسطية', 'author' => 'ابن تيمية', 'description' => 'شرح شامل للعقيدة الإسلامية'],
                ['title' => 'كتاب التوحيد', 'author' => 'محمد بن عبد الوهاب', 'description' => 'كتاب في توحيد الله تعالى'],
            ],
            'seerah' => [
                ['title' => 'الرحيق المختوم', 'author' => 'صفي الرحمن المباركفوري', 'description' => 'سيرة النبي صلى الله عليه وسلم'],
                ['title' => 'السيرة النبوية', 'author' => 'ابن هشام', 'description' => 'سيرة النبي محمد صلى الله عليه وسلم'],
                ['title' => 'فقه السيرة', 'author' => 'محمد الغزالي', 'description' => 'دراسة في سيرة النبي صلى الله عليه وسلم'],
            ],
            'islamic-history' => [
                ['title' => 'تاريخ الخلفاء', 'author' => 'السيوطي', 'description' => 'تاريخ الخلفاء الراشدين والأمويين والعباسيين'],
                ['title' => 'تاريخ الإسلام', 'author' => 'الذهبي', 'description' => 'تاريخ الإسلام من البعثة إلى العصر الحديث'],
                ['title' => 'البداية والنهاية', 'author' => 'ابن كثير', 'description' => 'تاريخ شامل من بداية الخلق إلى نهاية الزمان'],
            ],
            'arabic-language' => [
                ['title' => 'النحو الوافي', 'author' => 'عباس حسن', 'description' => 'كتاب شامل في النحو العربي'],
                ['title' => 'مغني اللبيب', 'author' => 'ابن هشام', 'description' => 'كتاب في النحو والصرف'],
                ['title' => 'البلاغة الواضحة', 'author' => 'علي الجارم ومصطفى أمين', 'description' => 'كتاب في البلاغة العربية'],
            ],
            'islamic-education' => [
                ['title' => 'تربية الأولاد في الإسلام', 'author' => 'عبد الله ناصح علوان', 'description' => 'كتاب في تربية الأطفال في الإسلام'],
                ['title' => 'التربية الإسلامية', 'author' => 'محمد قطب', 'description' => 'منهج التربية الإسلامية'],
                ['title' => 'أصول التربية الإسلامية', 'author' => 'عبد الرحمن النحلاوي', 'description' => 'أساسيات التربية في الإسلام'],
            ],
            'dawah' => [
                ['title' => 'الدعوة إلى الله', 'author' => 'عبد العزيز بن باز', 'description' => 'أصول الدعوة إلى الله تعالى'],
                ['title' => 'فقه الدعوة', 'author' => 'عبد الكريم زيدان', 'description' => 'فقه الدعوة الإسلامية'],
                ['title' => 'منهج الدعوة في القرآن', 'author' => 'محمد قطب', 'description' => 'دراسة في منهج الدعوة من القرآن'],
            ],
            'ethics-manners' => [
                ['title' => 'الأخلاق الإسلامية', 'author' => 'عبد الرحمن الميداني', 'description' => 'كتاب في الأخلاق الإسلامية'],
                ['title' => 'آداب المسلم في اليوم والليلة', 'author' => 'سعيد بن علي القحطاني', 'description' => 'آداب المسلم في حياته اليومية'],
                ['title' => 'الأخلاق والسلوك', 'author' => 'محمد الغزالي', 'description' => 'كتاب في الأخلاق والسلوك الإسلامي'],
            ],
            'muslim-women' => [
                ['title' => 'المرأة في الإسلام', 'author' => 'عبد الحليم أبو شقة', 'description' => 'مكانة المرأة في الإسلام'],
                ['title' => 'حقوق المرأة في الإسلام', 'author' => 'محمد الغزالي', 'description' => 'حقوق المرأة في الشريعة الإسلامية'],
                ['title' => 'المرأة المسلمة', 'author' => 'عبد الله ناصح علوان', 'description' => 'كتاب شامل عن المرأة المسلمة'],
            ],
            'muslim-family' => [
                ['title' => 'الأسرة المسلمة', 'author' => 'عبد الله ناصح علوان', 'description' => 'كتاب في بناء الأسرة المسلمة'],
                ['title' => 'الزواج في الإسلام', 'author' => 'محمد الغزالي', 'description' => 'فقه الزواج في الإسلام'],
                ['title' => 'تربية الأولاد', 'author' => 'عبد الله ناصح علوان', 'description' => 'تربية الأولاد في الإسلام'],
            ],
            'children-books' => [
                ['title' => 'قصص الأنبياء للأطفال', 'author' => 'عبد الحميد جودة', 'description' => 'قصص الأنبياء مكتوبة للأطفال'],
                ['title' => 'سيرة النبي للأطفال', 'author' => 'محمد حسان', 'description' => 'سيرة النبي صلى الله عليه وسلم للأطفال'],
                ['title' => 'أخلاق المسلم الصغير', 'author' => 'عبد الله ناصح علوان', 'description' => 'كتاب في الأخلاق للأطفال'],
            ],
            'islamic-sciences' => [
                ['title' => 'أصول الفقه', 'author' => 'محمد أبو زهرة', 'description' => 'كتاب في أصول الفقه الإسلامي'],
                ['title' => 'علم مصطلح الحديث', 'author' => 'محمود الطحان', 'description' => 'مقدمة في علم مصطلح الحديث'],
                ['title' => 'أصول التفسير', 'author' => 'محمد الصابوني', 'description' => 'كتاب في أصول تفسير القرآن'],
            ],
            'fatwa' => [
                ['title' => 'فتاوى ابن باز', 'author' => 'عبد العزيز بن باز', 'description' => 'مجموعة فتاوى الشيخ ابن باز'],
                ['title' => 'فتاوى ابن عثيمين', 'author' => 'محمد بن عثيمين', 'description' => 'مجموعة فتاوى الشيخ ابن عثيمين'],
                ['title' => 'فتاوى الأزهر', 'author' => 'دار الإفتاء المصرية', 'description' => 'مجموعة فتاوى من الأزهر الشريف'],
            ],
            'sunnah' => [
                ['title' => 'بلوغ المرام', 'author' => 'ابن حجر العسقلاني', 'description' => 'مجموعة أحاديث في الأحكام'],
                ['title' => 'الأربعون النووية', 'author' => 'النووي', 'description' => 'أربعون حديثاً نبوياً شريفاً'],
                ['title' => 'رياض الصالحين', 'author' => 'النووي', 'description' => 'مجموعة أحاديث في الأخلاق والآداب'],
            ],
            'worship' => [
                ['title' => 'فقه الصلاة', 'author' => 'عبد العزيز بن باز', 'description' => 'كتاب في فقه الصلاة'],
                ['title' => 'فقه الصوم', 'author' => 'محمد بن عثيمين', 'description' => 'كتاب في فقه الصيام'],
                ['title' => 'فقه الزكاة', 'author' => 'يوسف القرضاوي', 'description' => 'كتاب في فقه الزكاة'],
            ],
            'transactions' => [
                ['title' => 'المعاملات المالية', 'author' => 'يوسف القرضاوي', 'description' => 'كتاب في المعاملات المالية الإسلامية'],
                ['title' => 'الاقتصاد الإسلامي', 'author' => 'محمد شوقي الفنجري', 'description' => 'مبادئ الاقتصاد الإسلامي'],
                ['title' => 'فقه المعاملات', 'author' => 'وهبة الزحيلي', 'description' => 'كتاب في فقه المعاملات الإسلامية'],
            ],
            'references-encyclopedias' => [
                ['title' => 'الموسوعة الفقهية', 'author' => 'وزارة الأوقاف الكويتية', 'description' => 'موسوعة شاملة في الفقه الإسلامي'],
                ['title' => 'المعجم المفهرس', 'author' => 'أحمد محمد شاكر', 'description' => 'معجم لألفاظ الحديث النبوي'],
                ['title' => 'موسوعة الحديث الشريف', 'author' => 'الجامعة الإسلامية', 'description' => 'موسوعة شاملة للأحاديث النبوية'],
            ],
        ];

        $totalCreated = 0;
        $totalSkipped = 0;

        // Create books for each organization
        foreach ($organizations as $organization) {
            $this->command->info("Creating books for organization: {$organization->name}");

            // Get all categories for this organization
            $categories = LibraryCategory::where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->where('is_active', true)
                ->get();

            if ($categories->isEmpty()) {
                $this->command->warn("  No categories found for {$organization->name}. Please run LibraryCategorySeeder first.");
                continue;
            }

            $orgCreated = 0;
            $orgSkipped = 0;

            // Check if category_id column exists
            $hasCategoryId = Schema::hasColumn('library_books', 'category_id');

            foreach ($categories as $category) {
                $categoryCode = $category->code;
                
                // Get books for this category
                $books = $booksByCategory[$categoryCode] ?? [];

                if (empty($books)) {
                    $this->command->warn("  No books defined for category: {$category->name} ({$categoryCode})");
                    continue;
                }

                $bookCounter = 1;
                foreach ($books as $bookData) {
                    // Check if book already exists for this organization and category
                    $query = LibraryBook::where('organization_id', $organization->id)
                        ->where('title', $bookData['title'])
                        ->whereNull('deleted_at');
                    
                    // Use category_id if column exists, otherwise use category name
                    if ($hasCategoryId) {
                        $query->where('category_id', $category->id);
                    } else {
                        $query->where('category', $category->name);
                    }
                    
                    $existing = $query->first();

                    if ($existing) {
                        $orgSkipped++;
                        $bookCounter++; // Increment counter even when skipping to avoid duplicate book numbers
                        continue;
                    }

                    // Generate ISBN if not provided
                    $isbn = $this->generateISBN();
                    
                    // Generate book number (unique globally - includes org prefix)
                    $orgPrefix = strtoupper(substr($organization->slug ?? substr($organization->id, 0, 3), 0, 3));
                    $categoryPrefix = strtoupper(substr($categoryCode, 0, 3));
                    
                    // Ensure book number is unique by checking if it exists
                    $bookNumber = null;
                    $attempts = 0;
                    do {
                        $bookNumber = 'BK-' . $orgPrefix . '-' . $categoryPrefix . '-' . str_pad((string)$bookCounter, 4, '0', STR_PAD_LEFT);
                        
                        // Check if this book number already exists
                        $numberExists = LibraryBook::where('book_number', $bookNumber)
                            ->whereNull('deleted_at')
                            ->exists();
                        
                        if ($numberExists) {
                            $bookCounter++;
                            $attempts++;
                        }
                    } while ($numberExists && $attempts < 100); // Safety limit to prevent infinite loop

                    // Create book
                    try {
                        // Generate and validate price
                        $price = $this->generatePrice();
                        // Ensure price is a proper numeric value (not string concatenation)
                        $price = (float) $price;
                        $price = round($price, 2);
                        // Ensure price is within valid range
                        if ($price < 0 || $price > 999999.99) {
                            $price = 0;
                        }
                        
                        $bookDataToCreate = [
                            'organization_id' => $organization->id,
                            'title' => $bookData['title'],
                            'author' => $bookData['author'] ?? null,
                            'isbn' => $isbn,
                            'book_number' => $bookNumber,
                            'category' => $category->name, // Keep for backward compatibility
                            'description' => $bookData['description'] ?? null,
                            'price' => $price,
                            'default_loan_days' => 30,
                        ];
                        
                        // Add category_id only if column exists
                        if ($hasCategoryId) {
                            $bookDataToCreate['category_id'] = $category->id;
                        }
                        
                        LibraryBook::create($bookDataToCreate);

                        $orgCreated++;
                        $bookCounter++;
                    } catch (\Exception $e) {
                        $this->command->error("  ✗ Failed to create book '{$bookData['title']}': {$e->getMessage()}");
                    }
                }
            }

            $totalCreated += $orgCreated;
            $totalSkipped += $orgSkipped;

            if ($orgCreated > 0) {
                $this->command->info("  → Created {$orgCreated} book(s) for {$organization->name}");
            }
            if ($orgSkipped > 0) {
                $this->command->info("  → Skipped {$orgSkipped} existing book(s) for {$organization->name}");
            }
        }

        $this->command->info("✅ Library books seeded successfully!");
        $this->command->info("   Total created: {$totalCreated}");
        $this->command->info("   Total skipped: {$totalSkipped}");
    }

    /**
     * Generate a random ISBN
     */
    protected function generateISBN(): string
    {
        // Generate a 13-digit ISBN
        $prefix = '978'; // Bookland prefix
        $group = '977'; // Arabic language group
        $publisher = str_pad((string)rand(100, 999), 3, '0', STR_PAD_LEFT);
        $title = str_pad((string)rand(10000, 99999), 5, '0', STR_PAD_LEFT);
        $check = rand(0, 9);
        
        return $prefix . $group . $publisher . $title . $check;
    }

    /**
     * Generate a random price between 50 and 500
     * Returns a properly formatted numeric value
     */
    protected function generatePrice(): float
    {
        // Generate random price between 50.00 and 500.00
        $price = round(rand(5000, 50000) / 100, 2);
        
        // Ensure it's a proper float, not a string
        $price = (float) $price;
        
        // Double-check rounding to prevent any precision issues
        return round($price, 2);
    }
}

