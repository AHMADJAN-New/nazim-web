<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteEvent;
use App\Models\WebsitePage;
use App\Models\WebsitePost;
use App\Models\WebsiteSetting;
use App\Models\WebsiteMenuLink;
use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicWebsiteController extends Controller
{
    public function site(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $locale = $request->query('locale', 'en');

        $cacheKey = "public-site:{$organizationId}:{$schoolId}:{$locale}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $settings = WebsiteSetting::where('school_id', $schoolId)->first();
            $school = SchoolBranding::where('id', $schoolId)->first();
            $menu = WebsiteMenuLink::where('school_id', $schoolId)
                ->where('is_visible', true)
                ->orderBy('sort_order')
                ->get();
            $home = WebsitePage::where('school_id', $schoolId)
                ->where('slug', 'home')
                ->first();
            $posts = WebsitePost::where('school_id', $schoolId)
                ->where('status', 'published')
                ->orderBy('published_at', 'desc')
                ->limit(5)
                ->get();
            $events = WebsiteEvent::where('school_id', $schoolId)
                ->where('is_public', true)
                ->orderBy('starts_at', 'asc')
                ->limit(5)
                ->get();

            return response()->json([
                'settings' => $settings,
                'school' => $school,
                'menu' => $menu,
                'home' => $home,
                'posts' => $posts,
                'events' => $events,
            ]);
        });
    }

    public function page(Request $request, string $slug)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-page:{$organizationId}:{$schoolId}:{$slug}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $slug) {
            $page = WebsitePage::where('school_id', $schoolId)
                ->where('slug', $slug)
                ->where('status', 'published')
                ->firstOrFail();

            return response()->json($page);
        });
    }

    public function posts(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-posts:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $posts = WebsitePost::where('school_id', $schoolId)
                ->where('status', 'published')
                ->orderBy('published_at', 'desc')
                ->get();

            return response()->json($posts);
        });
    }

    public function events(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-events:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $events = WebsiteEvent::where('school_id', $schoolId)
                ->where('is_public', true)
                ->orderBy('starts_at', 'asc')
                ->get();

            return response()->json($events);
        });
    }

    public function sitemap(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $host = $request->getSchemeAndHttpHost();

        $pages = WebsitePage::where('school_id', $schoolId)
            ->where('status', 'published')
            ->get(['slug', 'updated_at']);

        $posts = WebsitePost::where('school_id', $schoolId)
            ->where('status', 'published')
            ->get(['slug', 'updated_at']);

        $urls = collect($pages)->map(fn ($page) => [
            'loc' => "{$host}/pages/{$page->slug}",
            'lastmod' => optional($page->updated_at)->toDateString(),
        ])->merge(collect($posts)->map(fn ($post) => [
            'loc' => "{$host}/announcements/{$post->slug}",
            'lastmod' => optional($post->updated_at)->toDateString(),
        ]));

        $xmlEntries = $urls->map(function ($url) {
            $lastmod = $url['lastmod'] ? "<lastmod>{$url['lastmod']}</lastmod>" : '';
            return "<url><loc>{$url['loc']}</loc>{$lastmod}</url>";
        })->implode('');

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            . '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            . $xmlEntries
            . '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }

    public function robots(Request $request)
    {
        $host = $request->getSchemeAndHttpHost();
        $content = "User-agent: *\nAllow: /\nSitemap: {$host}/sitemap.xml\n";

        return response($content, 200)->header('Content-Type', 'text/plain');
    }
}
