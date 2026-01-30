<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteEvent;
use App\Models\WebsitePage;
use App\Models\WebsitePost;
use App\Models\WebsiteAnnouncement;
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
use Illuminate\Support\Str;

class PublicWebsiteController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {
    }

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

            $posts = $posts->map(function ($post) {
                $post->seo_image_url = $this->resolvePublicUrl($post->seo_image_path);
                return $post;
            });
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

        return Cache::remember("public-posts:{$organizationId}:{$schoolId}:" . request('page', 1), now()->addMinutes(10), function () use ($schoolId) {
            $posts = WebsitePost::where('school_id', $schoolId)
                ->where('status', 'published')
                ->whereNull('deleted_at')
                ->orderBy('published_at', 'desc')
                ->paginate(9);

            $posts->getCollection()->transform(function ($post) {
                $post->seo_image_url = $this->resolvePublicUrl($post->seo_image_path);
                return $post;
            });

            return $posts;
        });
    }

    public function post(Request $request, string $slug)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-post:{$organizationId}:{$schoolId}:{$slug}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $slug) {
            $query = WebsitePost::where('school_id', $schoolId)
                ->where('status', 'published')
                ->whereNull('deleted_at');

            // Match by slug; only match by id when the parameter is a valid UUID
            if (Str::isUuid($slug)) {
                $query->where(function ($q) use ($slug) {
                    $q->where('slug', $slug)->orWhere('id', $slug);
                });
            } else {
                $query->where('slug', $slug);
            }

            $post = $query->firstOrFail();

            $post->seo_image_url = $this->resolvePublicUrl($post->seo_image_path);

            return response()->json($post);
        });
    }

    public function announcements(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $page = $request->query('page', 1);

        $cacheKey = "public-announcements:{$organizationId}:{$schoolId}:{$page}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $now = now();

            return WebsiteAnnouncement::where('school_id', $schoolId)
                ->where('status', 'published')
                ->whereNull('deleted_at')
                ->where(function ($query) use ($now) {
                    $query->whereNull('published_at')
                        ->orWhere('published_at', '<=', $now);
                })
                ->where(function ($query) use ($now) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>=', $now);
                })
                ->orderBy('is_pinned', 'desc')
                ->orderBy('published_at', 'desc')
                ->paginate(9);
        });
    }

    public function announcement(Request $request, string $id)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-announcement:{$organizationId}:{$schoolId}:{$id}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $id) {
            $now = now();

            $announcement = WebsiteAnnouncement::where('school_id', $schoolId)
                ->where('status', 'published')
                ->whereNull('deleted_at')
                ->where('id', $id)
                ->where(function ($query) use ($now) {
                    $query->whereNull('published_at')
                        ->orWhere('published_at', '<=', $now);
                })
                ->where(function ($query) use ($now) {
                    $query->whereNull('expires_at')
                        ->orWhere('expires_at', '>=', $now);
                })
                ->firstOrFail();

            return response()->json($announcement);
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
                ->get(); // Keeping events as list for now or pagination if preferred? Plan said paginated posts/media. 

            return response()->json($events);
        });
    }

    public function media(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');
        $categorySlug = $request->query('category');
        $page = $request->query('page', 1);

        // Separate cache key for categories vs items to keep it clean
        if ($request->has('get_categories')) {
            return Cache::remember("public-media-categories:{$organizationId}:{$schoolId}", now()->addMinutes(10), function () use ($schoolId) {
                $categories = \App\Models\WebsiteMediaCategory::where('school_id', $schoolId)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->get();

                return $categories->map(function ($category) {
                    $category->cover_image_url = $this->resolvePublicUrl($category->cover_image_path);
                    return $category;
                });
            });
        }

        $cacheKey = "public-media:{$organizationId}:{$schoolId}:{$categorySlug}:{$page}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId, $categorySlug) {
            $query = \App\Models\WebsiteMedia::where('school_id', $schoolId);

            if ($categorySlug) {
                // Determine if we want to show items related to *specifically* this category
                // or just filter. 
                $category = \App\Models\WebsiteMediaCategory::where('school_id', $schoolId)
                    ->where('slug', $categorySlug)
                    ->first();

                if ($category) {
                    $query->where('category_id', $category->id);
                }
            }

            $media = $query->orderBy('created_at', 'desc')->paginate(12);

            $media->getCollection()->transform(function ($item) {
                $item->file_url = $this->resolvePublicUrl($item->file_path);
                return $item;
            });

            return $media;
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
                $booksQuery->where(function ($q) use ($query) {
                    $q->where('title', 'like', "%{$query}%")
                        ->orWhere('author', 'like', "%{$query}%")
                        ->orWhere('description', 'like', "%{$query}%");
                });
            }

            if ($category) {
                $booksQuery->where('category', $category);
            }

            $books = $booksQuery->orderBy('sort_order')
                ->orderBy('created_at', 'desc')
                ->get();

            return $books->map(function ($book) {
                $book->cover_image_url = $this->resolvePublicUrl($book->cover_image_path);
                $book->file_url = $this->resolvePublicUrl($book->file_path);
                return $book;
            });
        });
    }

    /**
     * Get a single published book by id (for public book detail page).
     */
    public function libraryBook(Request $request, string $id)
    {
        $schoolId = $request->attributes->get('school_id');

        $book = WebsitePublicBook::where('school_id', $schoolId)
            ->where('status', 'published')
            ->where('id', $id)
            ->first();

        if (!$book) {
            return response()->json(['error' => 'Book not found'], 404);
        }

        $book->cover_image_url = $this->resolvePublicUrl($book->cover_image_path);
        $book->file_url = $this->resolvePublicUrl($book->file_path);

        return response()->json($book);
    }

    /**
     * Stream a published book's PDF file (no auth; for public library).
     * Query: disposition=attachment to force download, otherwise inline (view in browser).
     */
    public function libraryBookFile(Request $request, string $id)
    {
        $schoolId = $request->attributes->get('school_id');
        $disposition = $request->query('disposition', 'inline'); // inline | attachment

        $book = WebsitePublicBook::where('school_id', $schoolId)
            ->where('status', 'published')
            ->where('id', $id)
            ->first();

        if (!$book || !$book->file_path) {
            return response()->json(['error' => 'Book or file not found'], 404);
        }

        $path = $book->file_path;
        if (!$this->fileStorageService->fileExists($path, 'public')) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $file = $this->fileStorageService->getFile($path, 'public');
        if ($file === null) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $mimeType = $this->fileStorageService->getMimeType($path, 'public')
            ?? $this->fileStorageService->getMimeTypeFromExtension($path)
            ?? 'application/pdf';
        $filename = basename($path);
        if (!str_ends_with(strtolower($filename), '.pdf')) {
            $filename .= '.pdf';
        }

        $contentDisposition = $disposition === 'attachment'
            ? 'attachment; filename="' . addslashes($filename) . '"'
            : 'inline; filename="' . addslashes($filename) . '"';

        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', $contentDisposition)
            ->header('Cache-Control', 'public, max-age=86400');
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
            $course->cover_image_url = $this->resolvePublicUrl($course->cover_image_path);
            return $course;
        });

        // Ensure we return a proper JSON response
        return response()->json($coursesWithUrls);
    }

    public function course(Request $request, string $id)
    {
        $schoolId = $request->attributes->get('school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context not found'], 404);
        }

        $course = WebsiteCourse::where('school_id', $schoolId)
            ->where('id', $id)
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->first();

        if (!$course) {
            return response()->json(['error' => 'Course not found'], 404);
        }

        $course->cover_image_url = $this->resolvePublicUrl($course->cover_image_path);
        return response()->json($course);
    }

    public function scholars(Request $request)
    {
        $schoolId = $request->attributes->get('school_id');
        $organizationId = $request->attributes->get('organization_id');

        $cacheKey = "public-scholars:{$organizationId}:{$schoolId}";

        return Cache::remember($cacheKey, now()->addMinutes(10), function () use ($schoolId) {
            $scholars = WebsiteScholar::where('school_id', $schoolId)
                ->where('status', 'published')
                ->orderBy('sort_order')
                ->get();

            return $scholars->map(function ($scholar) {
                $scholar->photo_url = $this->resolvePublicUrl($scholar->photo_path);
                return $scholar;
            });
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

            $graduates = $query->orderBy('graduation_year', 'desc')
                ->orderBy('sort_order')
                ->get();

            return $graduates->map(function ($graduate) {
                $graduate->photo_url = $this->resolvePublicUrl($graduate->photo_path);
                return $graduate;
            });
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
        $inbox->status = 'new';
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
            ->whereNull('deleted_at')
            ->get(['slug', 'updated_at']);

        $announcements = WebsiteAnnouncement::where('school_id', $schoolId)
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->get(['id', 'updated_at']);

        $urls = collect($pages)->map(fn($page) => [
            'loc' => "{$host}/public-site/pages/{$page->slug}",
            'lastmod' => optional($page->updated_at)->toDateString(),
        ])->merge(collect($posts)->map(fn($post) => [
            'loc' => "{$host}/public-site/articles/{$post->slug}",
            'lastmod' => optional($post->updated_at)->toDateString(),
        ]))->merge(collect($announcements)->map(fn($announcement) => [
            'loc' => "{$host}/public-site/announcements/{$announcement->id}",
            'lastmod' => optional($announcement->updated_at)->toDateString(),
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
        $content = "User-agent: *\nAllow: /\nSitemap: {$host}/api/public/website/sitemap.xml\n";

        return response($content, 200)->header('Content-Type', 'text/plain');
    }

    /**
     * Resolve storage path to a URL for public website responses.
     * Returns relative URLs (/storage/...) so the frontend (HTTPS) does not trigger mixed content
     * when the API base URL is HTTP (e.g. dev proxy from https://localhost:5173 to http://localhost:8000).
     */
    private function resolvePublicUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return '/storage/' . ltrim($path, '/');
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
        $fileSize = (int) ($school->getAttribute($sizeField) ?: strlen($binary));
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
            ->header('Content-Length', (string) $fileSize)
            ->header('Content-Disposition', 'inline; filename="' . addslashes($filename) . '"')
            ->header('ETag', $etag)
            ->header('Cache-Control', $cacheControl);
    }

    /**
     * Serve scholar photo for public website (no auth).
     * School context from request attributes or query.
     */
    public function scholarPhoto(Request $request, string $id)
    {
        $schoolId = $request->attributes->get('school_id') ?? $request->query('school_id');
        if (!$schoolId) {
            return response()->json(['error' => 'School context required'], 400);
        }

        $scholar = WebsiteScholar::where('school_id', $schoolId)
            ->where('id', $id)
            ->where('status', 'published')
            ->whereNull('deleted_at')
            ->first();

        if (!$scholar || !$scholar->photo_path) {
            abort(404);
        }

        $disk = $this->fileStorageService->getPublicDisk();
        if (!$this->fileStorageService->fileExists($scholar->photo_path, $disk)) {
            abort(404);
        }

        $file = $this->fileStorageService->getFile($scholar->photo_path, $disk);
        if (!$file || empty($file)) {
            abort(404);
        }

        $mimeType = $this->fileStorageService->getMimeTypeFromExtension($scholar->photo_path);
        return response($file, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', 'inline; filename="scholar-' . $id . '"')
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
