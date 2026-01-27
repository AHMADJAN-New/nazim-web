<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteEvent;
use App\Models\WebsitePage;
use App\Models\WebsitePost;
use App\Models\WebsiteSetting;
use App\Models\WebsiteMenuLink;
use App\Models\SchoolBranding;
use App\Models\WebsitePublicBook;
use App\Models\WebsiteScholar;
use App\Models\WebsiteCourse;
use App\Models\WebsiteGraduate;
use App\Models\WebsiteDonation;
use App\Models\WebsiteInbox;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicWebsiteController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}

    public function site(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $locale = $request->query('locale', 'en');

        $cacheKey = "public-site:{$organizationId}:{$schoolId}:{$locale}";

        return Cache::remember($cacheKey, now()->addSeconds(30), function () use ($schoolId) {
            $settings = WebsiteSetting::where('school_id', $schoolId)->first();
            $school = SchoolBranding::where('id', $schoolId)->first();
            $menu = WebsiteMenuLink::where('school_id', $schoolId)
                ->where('is_visible', true)
                ->whereNull('deleted_at')
                ->orderBy('sort_order')
                ->get();
            $home = WebsitePage::where('school_id', $schoolId)
                ->where('slug', 'home')
                ->where('status', 'published')
                ->whereNull('deleted_at')
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

    public function menus(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        
        $cacheKey = "public-menus:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $menus = WebsiteMenuLink::where('school_id', $schoolId)
                ->where('is_visible', true)
                ->orderBy('sort_order')
                ->get();
                
            return response()->json($menus);
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
                ->whereNull('deleted_at')
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

    public function library(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $query = $request->query('query');
        $category = $request->query('category');

        $cacheKey = "public-library:{$organizationId}:{$schoolId}:" . md5($query . $category);

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $query, $category) {
            $booksQuery = WebsitePublicBook::where('school_id', $schoolId)
                ->where('status', 'published');

            if ($query) {
                $booksQuery->where(function($q) use ($query) {
                    $q->where('title', 'like', "%{$query}%")
                      ->orWhere('author', 'like', "%{$query}%")
                      ->orWhere('description', 'like', "%{$query}%");
                });
            }

            if ($category) {
                $booksQuery->where('category', $category);
            }

            return $booksQuery->orderBy('sort_order')
                ->orderBy('created_at', 'desc')
                ->get();
        });
    }

    public function courses(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $category = $request->query('category');
        $level = $request->query('level');

        $cacheKey = "public-courses:{$organizationId}:{$schoolId}:" . md5(($category ?? '') . ($level ?? ''));

        $courses = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $category, $level) {
            $coursesQuery = WebsiteCourse::where('school_id', $schoolId)
                ->where('status', 'published')
                ->whereNull('deleted_at'); // CRITICAL: Exclude soft-deleted courses

            if ($category) {
                $coursesQuery->where('category', $category);
            }
            if ($level) {
                $coursesQuery->where('level', $level);
            }

            return $coursesQuery->orderBy('sort_order')
                ->orderBy('created_at', 'desc')
                ->get();
        });

        // Convert cover_image_path to URL for each course
        $coursesWithUrls = $courses->map(function ($course) {
            if ($course->cover_image_path) {
                $course->cover_image_url = $this->fileStorageService->getPublicUrl($course->cover_image_path);
            } else {
                $course->cover_image_url = null;
            }
            return $course;
        });

        // Ensure we return a proper JSON response
        return response()->json($coursesWithUrls);
    }

    public function scholars(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-scholars:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            return WebsiteScholar::where('school_id', $schoolId)
                ->where('status', 'published')
                ->orderBy('sort_order')
                ->get();
        });
    }

    public function graduates(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $year = $request->query('year');

        $cacheKey = "public-graduates:{$organizationId}:{$schoolId}:{$year}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $year) {
            $query = WebsiteGraduate::where('school_id', $schoolId)
                ->where('status', 'published');
            
            if ($year) {
                $query->where('graduation_year', $year);
            }

            return $query->orderBy('graduation_year', 'desc')
                ->orderBy('sort_order')
                ->get();
        });
    }

    public function donations(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-donations:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            return WebsiteDonation::where('school_id', $schoolId)
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get();
        });
    }

    public function contact(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');

        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $inbox = new WebsiteInbox();
        $inbox->school_id = $schoolId;
        $inbox->name = $validated['first_name'] . ' ' . $validated['last_name'];
        $inbox->email = $validated['email'];
        $inbox->phone = $validated['phone'];
        $inbox->subject = $validated['subject'];
        $inbox->message = $validated['message'];
        $inbox->type = 'contact';
        $inbox->status = 'unread';
        $inbox->save();

        return response()->json(['message' => 'Message sent successfully']);
    }

    public function sitemap(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $host = $request->getSchemeAndHttpHost();

        $pages = WebsitePage::where('school_id', $schoolId)
            ->where('status', 'published')
            ->whereNull('deleted_at')
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

    public function logo(Request $request, string $schoolId, string $type)
    {
        $school = SchoolBranding::whereNull('deleted_at')->find($schoolId);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Map logo types to database fields
        $logoMap = [
            'primary' => [
                'binary' => 'primary_logo_binary',
                'mime' => 'primary_logo_mime_type',
                'filename' => 'primary_logo_filename',
                'size' => 'primary_logo_size',
            ],
            'secondary' => [
                'binary' => 'secondary_logo_binary',
                'mime' => 'secondary_logo_mime_type',
                'filename' => 'secondary_logo_filename',
                'size' => 'secondary_logo_size',
            ],
            'ministry' => [
                'binary' => 'ministry_logo_binary',
                'mime' => 'ministry_logo_mime_type',
                'filename' => 'ministry_logo_filename',
                'size' => 'ministry_logo_size',
            ],
        ];

        if (!isset($logoMap[$type])) {
            return response()->json(['error' => 'Invalid logo type. Must be: primary, secondary, or ministry'], 400);
        }

        $binaryField = $logoMap[$type]['binary'];
        $mimeField = $logoMap[$type]['mime'];
        $filenameField = $logoMap[$type]['filename'];
        $sizeField = $logoMap[$type]['size'];

        // Get binary data directly from database (bypass hidden attribute)
        // Accessing the attribute directly on the model instance might still return null if it's hidden in toArray() but not here
        // However, standard Eloquent hidden attributes don't prevent direct access via $school->field or $school->getAttribute()
        $binary = $school->getAttribute($binaryField);

        if ($binary === null || $binary === '') {
            return response()->noContent(); // 204 No Content
        }

        // Ensure binary is a string (PostgreSQL BYTEA might return a resource)
        if (is_resource($binary)) {
            $binary = stream_get_contents($binary);
        }
        
        // Ensure binary is a string (handle any other edge cases)
        $binary = (string) $binary;

        $mimeType = $school->getAttribute($mimeField) ?: 'image/png';
        $filename = $school->getAttribute($filenameField) ?: "{$type}_logo";
        $fileSize = (int)($school->getAttribute($sizeField) ?: strlen($binary));
        $updatedAtTimestamp = $school->updated_at ? $school->updated_at->getTimestamp() : 0;

        // Generate ETag based on school ID, type, updated timestamp, size, filename, and mime type
        $etag = '"' . sha1($school->id . '|' . $type . '|' . $updatedAtTimestamp . '|' . $fileSize . '|' . $filename . '|' . $mimeType) . '"';
        
        // Cache for 7 days, allow stale-while-revalidate for 1 day
        $cacheControl = 'public, max-age=604800, stale-while-revalidate=86400';

        // Check If-None-Match header for 304 Not Modified
        if ($request->headers->get('If-None-Match') === $etag) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', $cacheControl);
        }

        // Return logo with proper headers
        return response($binary, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Length', (string)$fileSize)
            ->header('Content-Disposition', 'inline; filename="' . addslashes($filename) . '"')
            ->header('ETag', $etag)
            ->header('Cache-Control', $cacheControl);
    }
}
