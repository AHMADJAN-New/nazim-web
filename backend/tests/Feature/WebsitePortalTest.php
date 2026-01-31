<?php

namespace Tests\Feature;

use App\Models\OrganizationSubscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use App\Models\WebsiteEvent;
use App\Models\WebsiteMenuLink;
use App\Models\WebsitePage;
use App\Models\WebsitePost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class WebsitePortalTest extends TestCase
{
    use RefreshDatabase;

    private function seedWebsiteAccess(string $slug = 'alhuda'): array
    {
        config(['website.base_domain' => 'nazim.cloud']);

        $organizationId = (string) Str::uuid();
        DB::table('organizations')->insert([
            'id' => $organizationId,
            'name' => 'Al Huda Org',
            'slug' => 'al-huda-org',
            'settings' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $schoolId = (string) Str::uuid();
        DB::table('school_branding')->insert([
            'id' => $schoolId,
            'organization_id' => $organizationId,
            'school_name' => 'Al Huda School',
            'school_name_arabic' => null,
            'school_name_pashto' => null,
            'school_address' => null,
            'school_phone' => null,
            'school_email' => null,
            'school_website' => null,
            'logo_path' => null,
            'header_image_path' => null,
            'footer_text' => null,
            'primary_color' => '#0b0b56',
            'secondary_color' => '#0056b3',
            'accent_color' => '#ff6b35',
            'font_family' => 'Bahij Nassim',
            'report_font_size' => '12px',
            'primary_logo_binary' => null,
            'primary_logo_mime_type' => null,
            'primary_logo_filename' => null,
            'primary_logo_size' => null,
            'secondary_logo_binary' => null,
            'secondary_logo_mime_type' => null,
            'secondary_logo_filename' => null,
            'secondary_logo_size' => null,
            'ministry_logo_binary' => null,
            'ministry_logo_mime_type' => null,
            'ministry_logo_filename' => null,
            'ministry_logo_size' => null,
            'primary_logo_usage' => 'reports',
            'secondary_logo_usage' => 'certificates',
            'ministry_logo_usage' => 'official_documents',
            'header_text' => null,
            'table_alternating_colors' => true,
            'show_page_numbers' => true,
            'show_generation_date' => true,
            'report_logo_selection' => 'primary,secondary',
            'calendar_preference' => 'jalali',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('website_settings')->insert([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'school_slug' => $slug,
            'default_language' => 'en',
            'enabled_languages' => json_encode(['en', 'ar']),
            'theme' => json_encode(['primary_color' => '#0b0b56']),
            'is_public' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $plan = SubscriptionPlan::create([
            'id' => (string) Str::uuid(),
            'name' => 'Complete',
            'slug' => 'complete',
            'price_yearly_afn' => 0,
            'price_yearly_usd' => 0,
            'is_active' => true,
            'is_default' => false,
            'is_custom' => false,
            'trial_days' => 0,
            'grace_period_days' => 14,
            'readonly_period_days' => 60,
            'max_schools' => 1,
            'per_school_price_afn' => 0,
            'per_school_price_usd' => 0,
            'sort_order' => 1,
        ]);

        DB::table('plan_features')->insert([
            'id' => (string) Str::uuid(),
            'plan_id' => $plan->id,
            'feature_key' => 'public_website',
            'is_enabled' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        OrganizationSubscription::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
        ]);

        return [$organizationId, $schoolId];
    }

    public function test_public_sitemap_and_robots_are_available(): void
    {
        [$organizationId, $schoolId] = $this->seedWebsiteAccess('alhuda');

        WebsitePage::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'home',
            'title' => 'Home',
            'status' => 'published',
            'content_json' => [],
        ]);

        WebsitePost::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'welcome',
            'title' => 'Welcome',
            'status' => 'published',
            'content_json' => [],
        ]);

        $sitemap = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/sitemap.xml');

        $sitemap->assertOk();
        $sitemap->assertSee('<urlset', false);
        $sitemap->assertSee('/pages/home');
        $sitemap->assertSee('/announcements/welcome');

        $robots = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/robots.txt');

        $robots->assertOk();
        $robots->assertSee('Sitemap: http://alhuda.nazim.cloud/sitemap.xml');
    }

    public function test_public_site_endpoint_returns_public_payload(): void
    {
        [$organizationId, $schoolId] = $this->seedWebsiteAccess('alhuda');

        WebsiteMenuLink::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'label' => 'About',
            'url' => '/pages/about',
            'sort_order' => 1,
            'is_visible' => true,
        ]);

        WebsiteMenuLink::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'label' => 'Hidden',
            'url' => '/pages/hidden',
            'sort_order' => 2,
            'is_visible' => false,
        ]);

        WebsitePage::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'home',
            'title' => 'Home',
            'status' => 'published',
            'content_json' => [],
        ]);

        WebsitePost::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'welcome',
            'title' => 'Welcome',
            'status' => 'published',
            'content_json' => [],
            'published_at' => now(),
        ]);

        WebsiteEvent::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'title' => 'Orientation',
            'location' => 'Main Hall',
            'starts_at' => now()->addDays(2),
            'ends_at' => now()->addDays(2)->addHours(2),
            'is_public' => true,
            'summary' => 'Open house event.',
            'content_json' => [],
        ]);

        $response = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/site');

        $response->assertOk();
        $response->assertJsonPath('settings.school_slug', 'alhuda');
        $response->assertJsonPath('school.school_name', 'Al Huda School');
        $response->assertJsonCount(1, 'menu');
        $response->assertJsonPath('menu.0.label', 'About');
        $response->assertJsonPath('home.slug', 'home');
        $response->assertJsonPath('posts.0.slug', 'welcome');
        $response->assertJsonPath('events.0.title', 'Orientation');
    }

    public function test_public_pages_posts_and_events_endpoints_filter_content(): void
    {
        [$organizationId, $schoolId] = $this->seedWebsiteAccess('alhuda');

        WebsitePage::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'about',
            'title' => 'About',
            'status' => 'published',
            'content_json' => [],
        ]);

        WebsitePage::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'draft',
            'title' => 'Draft',
            'status' => 'draft',
            'content_json' => [],
        ]);

        WebsitePost::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'news',
            'title' => 'News',
            'status' => 'published',
            'content_json' => [],
            'published_at' => now(),
        ]);

        WebsitePost::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'draft-news',
            'title' => 'Draft News',
            'status' => 'draft',
            'content_json' => [],
        ]);

        WebsiteEvent::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'title' => 'Public Event',
            'location' => 'Courtyard',
            'starts_at' => now()->addDays(1),
            'ends_at' => now()->addDays(1)->addHour(),
            'is_public' => true,
            'summary' => 'Open to everyone.',
            'content_json' => [],
        ]);

        WebsiteEvent::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'title' => 'Private Event',
            'location' => 'Staff Room',
            'starts_at' => now()->addDays(3),
            'ends_at' => now()->addDays(3)->addHour(),
            'is_public' => false,
            'summary' => 'Staff only.',
            'content_json' => [],
        ]);

        $pageResponse = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/pages/about');
        $pageResponse->assertOk();
        $pageResponse->assertJsonPath('slug', 'about');

        $draftResponse = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/pages/draft');
        $draftResponse->assertNotFound();

        $postsResponse = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/posts');
        $postsResponse->assertOk();
        $postsResponse->assertJsonCount(1);
        $postsResponse->assertJsonPath('0.slug', 'news');

        $eventsResponse = $this->withHeader('Host', 'alhuda.nazim.cloud')
            ->get('/api/public/website/events');
        $eventsResponse->assertOk();
        $eventsResponse->assertJsonCount(1);
        $eventsResponse->assertJsonPath('0.title', 'Public Event');
    }

    public function test_page_updates_invalidate_public_cache(): void
    {
        [$organizationId, $schoolId] = $this->seedWebsiteAccess('alhuda');

        $user = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'admin@alhuda.test',
            'encrypted_password' => bcrypt('password'),
        ]);

        DB::table('profiles')->insert([
            'id' => $user->id,
            'organization_id' => $organizationId,
            'default_school_id' => $schoolId,
            'role' => 'admin',
            'full_name' => 'Admin',
            'email' => 'admin@alhuda.test',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $page = WebsitePage::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'home',
            'title' => 'Home',
            'status' => 'draft',
            'content_json' => [],
        ]);

        Cache::put("public-site:{$organizationId}:{$schoolId}:en", ['cached' => true]);
        Cache::put("public-page:{$organizationId}:{$schoolId}:home", ['cached' => true]);

        $response = $this->actingAs($user)
            ->putJson("/api/website/pages/{$page->id}", [
                'title' => 'Updated',
                'status' => 'published',
            ]);

        $response->assertOk();
        $this->assertNull(Cache::get("public-site:{$organizationId}:{$schoolId}:en"));
        $this->assertNull(Cache::get("public-page:{$organizationId}:{$schoolId}:home"));
    }

    public function test_post_updates_invalidate_public_caches(): void
    {
        [$organizationId, $schoolId] = $this->seedWebsiteAccess('alhuda');

        $user = User::create([
            'id' => (string) Str::uuid(),
            'email' => 'admin@alhuda.test',
            'encrypted_password' => bcrypt('password'),
        ]);

        DB::table('profiles')->insert([
            'id' => $user->id,
            'organization_id' => $organizationId,
            'default_school_id' => $schoolId,
            'role' => 'admin',
            'full_name' => 'Admin',
            'email' => 'admin@alhuda.test',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $post = WebsitePost::create([
            'id' => (string) Str::uuid(),
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'slug' => 'welcome',
            'title' => 'Welcome',
            'status' => 'draft',
            'content_json' => [],
        ]);

        Cache::put("public-site:{$organizationId}:{$schoolId}:en", ['cached' => true]);
        Cache::put("public-posts:{$organizationId}:{$schoolId}", ['cached' => true]);
        Cache::put("public-page:{$organizationId}:{$schoolId}:welcome", ['cached' => true]);

        $response = $this->actingAs($user)
            ->putJson("/api/website/posts/{$post->id}", [
                'title' => 'Updated',
                'status' => 'published',
            ]);

        $response->assertOk();
        $this->assertNull(Cache::get("public-site:{$organizationId}:{$schoolId}:en"));
        $this->assertNull(Cache::get("public-posts:{$organizationId}:{$schoolId}"));
        $this->assertNull(Cache::get("public-page:{$organizationId}:{$schoolId}:welcome"));
    }
}
