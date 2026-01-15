<?php

namespace App\Http\Controllers;

use App\Models\HelpCenterArticle;
use App\Models\HelpCenterCategory;
use App\Models\HelpCenterArticleView;
use App\Models\HelpCenterArticleVote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class HelpCenterArticleController extends Controller
{
    /**
     * Get user's organization context and permission checks
     * Works for both authenticated routes (middleware sets user) and public routes (manual auth)
     */
    private function getUserContext(Request $request)
    {
        $user = $request->user();
        
        // For public routes, manually authenticate if token is present
        // This allows public routes to work for both authenticated and unauthenticated users
        if (!$user) {
            try {
                // Check if Authorization header is present
                $token = $request->bearerToken();
                if ($token) {
                    // Use Sanctum guard to manually authenticate
                    $user = \Laravel\Sanctum\PersonalAccessToken::findToken($token)?->tokenable;
                }
            } catch (\Exception $e) {
                // Token invalid or user not found - continue as unauthenticated
                Log::debug('Failed to authenticate user from token in public route: ' . $e->getMessage());
            }
        }
        
        $profile = null;
        $organizationId = null;
        $hasStaffPermission = false;

        if ($user) {
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            if ($profile) {
                $organizationId = $profile->organization_id;
                
                // Check if user has staff permission
                try {
                    $hasStaffPermission = $user->hasPermissionTo('help_center.read_staff');
                } catch (\Exception $e) {
                    $hasStaffPermission = false;
                }
            }
        }

        return [
            'user' => $user,
            'profile' => $profile,
            'organization_id' => $organizationId,
            'has_staff_permission' => $hasStaffPermission,
        ];
    }

    /**
     * Get user's language preference from request
     * Priority: 1. Query parameter 'lang' 2. Accept-Language header 3. Default 'en'
     */
    private function getUserLanguage(Request $request): string
    {
        $supportedLanguages = ['en', 'ps', 'fa', 'ar'];
        
        // Check query parameter first
        $lang = $request->input('lang');
        if ($lang && in_array($lang, $supportedLanguages)) {
            return $lang;
        }

        // Check Accept-Language header
        $acceptLanguage = $request->header('Accept-Language');
        if ($acceptLanguage) {
            // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ps;q=0.8")
            $languages = explode(',', $acceptLanguage);
            foreach ($languages as $langHeader) {
                // Extract language code (e.g., "en-US" -> "en")
                $langCode = strtolower(trim(explode(';', $langHeader)[0]));
                $langCode = explode('-', $langCode)[0]; // Get base language code
                
                if (in_array($langCode, $supportedLanguages)) {
                    return $langCode;
                }
            }
        }

        // Default to English
        return 'en';
    }

    /**
     * Apply language filter to query
     * Filters articles by the user's preferred language
     */
    private function applyLanguageFilter($query, string $preferredLanguage): void
    {
        $supportedLanguages = ['en', 'ps', 'fa', 'ar'];
        
        // Validate language
        if (!in_array($preferredLanguage, $supportedLanguages)) {
            $preferredLanguage = 'en';
        }

        // Filter by preferred language
        $query->where('language', $preferredLanguage);
    }

    /**
     * Load relations safely (avoid invalid UUID relation lookups)
     */
    private function loadSafeArticleRelations(HelpCenterArticle $article): void
    {
        // Load category (only if not soft-deleted)
        if ($article->category_id) {
            try {
                $category = HelpCenterCategory::whereNull('deleted_at')
                    ->find($article->category_id);
                $article->setRelation('category', $category);
            } catch (\Exception $e) {
                Log::warning('Failed to load category for article ' . $article->id . ': ' . $e->getMessage());
                $article->setRelation('category', null);
            }
        } else {
            $article->setRelation('category', null);
        }

        // Load author only if valid UUID
        if ($article->author_id && Str::isUuid($article->author_id)) {
            try {
                $author = DB::table('profiles')->where('id', $article->author_id)->first();
                if ($author) {
                    // Convert stdClass to a simple object for JSON serialization
                    $article->setRelation('author', (object) [
                        'id' => $author->id,
                        'full_name' => $author->full_name ?? null,
                        'email' => $author->email ?? null,
                    ]);
                } else {
                    $article->setRelation('author', null);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load author for article ' . $article->id . ': ' . $e->getMessage());
                $article->setRelation('author', null);
            }
        } else {
            $article->setRelation('author', null);
        }

        // Load creator only if valid UUID
        if ($article->created_by && Str::isUuid($article->created_by)) {
            try {
                $creator = DB::table('profiles')->where('id', $article->created_by)->first();
                if ($creator) {
                    $article->setRelation('creator', (object) [
                        'id' => $creator->id,
                        'full_name' => $creator->full_name ?? null,
                        'email' => $creator->email ?? null,
                    ]);
                } else {
                    $article->setRelation('creator', null);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load creator for article ' . $article->id . ': ' . $e->getMessage());
                $article->setRelation('creator', null);
            }
        } else {
            $article->setRelation('creator', null);
        }

        // Load updater only if valid UUID
        if ($article->updated_by && Str::isUuid($article->updated_by)) {
            try {
                $updater = DB::table('profiles')->where('id', $article->updated_by)->first();
                if ($updater) {
                    $article->setRelation('updater', (object) [
                        'id' => $updater->id,
                        'full_name' => $updater->full_name ?? null,
                        'email' => $updater->email ?? null,
                    ]);
                } else {
                    $article->setRelation('updater', null);
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load updater for article ' . $article->id . ': ' . $e->getMessage());
                $article->setRelation('updater', null);
            }
        } else {
            $article->setRelation('updater', null);
        }

        // Load related articles
        try {
            $article->setAttribute('related_articles', $article->relatedArticles());
        } catch (\Exception $e) {
            Log::warning('Failed to load related articles for article ' . $article->id . ': ' . $e->getMessage());
            $article->setAttribute('related_articles', collect([]));
        }
    }

    /**
     * Check if user can see drafts
     */
    private function canSeeDrafts($user)
    {
        if (!$user) return false;
        
        try {
            return $user->hasPermissionTo('help_center.read') || 
                   $user->hasPermissionTo('help_center.create') ||
                   $user->hasPermissionTo('help_center.update');
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Apply permission-based filtering to article query
     * Filters articles by context_key matching user permissions
     */
    /**
     * Extract route paths from a route string, excluding UUIDs and generating variations
     * 
     * @param string $route Route path (e.g., "/exams/217dd9a5-6b4f-4a40-a7bc-cffcb3fd0d0d/timetable")
     * @return array Array of path variations to try (e.g., ["exams/timetable", "exams/timetables", "exams"])
     */
    private function extractRoutePaths($route): array
    {
        $routeSegment = trim($route, '/');
        $parts = explode('/', $routeSegment);
        $pathSegments = [];
        
        // Filter out UUID segments
        foreach ($parts as $part) {
            // Check if part is a UUID (format: 8-4-4-4-12 hex characters)
            if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $part)) {
                $pathSegments[] = $part;
            }
        }
        
        if (empty($pathSegments)) {
            return [];
        }
        
        $paths = [];
        $fullPath = implode('/', $pathSegments);
        
        // Add full path first (most specific)
        $paths[] = $fullPath;
        
        // Add singular/plural variations for last segment
        $lastSegment = end($pathSegments);
        if (strlen($lastSegment) > 0) {
            if (str_ends_with($lastSegment, 's')) {
                // If ends with 's', try singular version
                $singularPath = substr($fullPath, 0, -1);
                if ($singularPath !== $fullPath) {
                    $paths[] = $singularPath;
                }
            } else {
                // If doesn't end with 's', try plural version
                $pluralPath = $fullPath . 's';
                $paths[] = $pluralPath;
            }
        }
        
        // Add parent path if multi-segment (e.g., "library" from "library/books")
        if (count($pathSegments) > 1) {
            $paths[] = $pathSegments[0];
        }
        
        // Remove duplicates while preserving order
        return array_values(array_unique($paths));
    }

    private function applyPermissionFilter($query, $user, $organizationId = null)
    {
        // All articles are global now - permissions are also global
        // No need to set organization context for permission checks
        
        if ($user) {
            // Get user permissions (global permissions)
            try {
                // Set organization context if user has one (for permission checks)
                if ($organizationId) {
                    setPermissionsTeamId($organizationId);
                }
                
                $userPermissions = $user->getAllPermissions()->pluck('name')->toArray();
                
                // Check if user has admin or organization_admin role (for onboarding article)
                $hasAdminRole = false;
                $hasOrgAdminRole = false;
                try {
                    $hasAdminRole = $user->hasRole('admin');
                    $hasOrgAdminRole = $user->hasRole('organization_admin');
                } catch (\Exception $e) {
                    // Role check failed, continue without role-based access
                }
                
                // Filter articles by permissions
                $query->where(function ($q) use ($userPermissions, $hasAdminRole, $hasOrgAdminRole) {
                    // Articles with no context_key are visible to all authenticated users
                    $q->whereNull('context_key')
                      ->orWhere('context_key', '');
                    
                    // Articles with context_key require matching permission
                    if (!empty($userPermissions)) {
                        $q->orWhereIn('context_key', $userPermissions);
                    }
                    
                    // Special case: Onboarding article for admin/organization_admin roles
                    if ($hasAdminRole || $hasOrgAdminRole) {
                        $q->orWhere('context_key', 'onboarding.read');
                    }
                });
            } catch (\Exception $e) {
                Log::warning("Permission-based article filtering failed: " . $e->getMessage());
                // If permission check fails, only show articles with no context_key
                $query->where(function ($q) {
                    $q->whereNull('context_key')
                      ->orWhere('context_key', '');
                });
            }
        } else {
            // For unauthenticated users, only show articles with no context_key
            $query->where(function ($q) {
                $q->whereNull('context_key')
                  ->orWhere('context_key', '');
            });
        }
        
        return $query;
    }

    /**
     * Display a listing of help center articles
     */
    public function index(Request $request)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            // Check permission (if authenticated)
            if ($user) {
                try {
                    if (!$user->hasPermissionTo('help_center.read')) {
                        return response()->json(['error' => 'This action is unauthorized'], 403);
                    }
                } catch (\Exception $e) {
                    Log::warning("Permission check failed for help_center.read: " . $e->getMessage());
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            }

            // Get user's language preference first (before building query)
            $userLanguage = $this->getUserLanguage($request);

            // Optimize query: filter by language and organization_id first (uses composite index)
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global articles
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->with(['category:id,name,slug', 'author:id,full_name,email']); // Select only needed columns

            // Note: Eager loading is optimized to only load needed columns

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Apply permission-based filtering (articles filtered by context_key matching user permissions)
            $this->applyPermissionFilter($query, $user, $organizationId);

            // Filter by status
            $status = $request->input('status');
            if ($status) {
                if ($status === 'published') {
                    $query->published();
                } elseif ($status === 'draft') {
                    if ($this->canSeeDrafts($user)) {
                        $query->draft();
                    } else {
                        return response()->json(['error' => 'Unauthorized to view drafts'], 403);
                    }
                } elseif ($status === 'archived') {
                    if ($this->canSeeDrafts($user)) {
                        $query->archived();
                    } else {
                        return response()->json(['error' => 'Unauthorized to view archived'], 403);
                    }
                }
            } else {
                // Default: only published for non-admin users
                if (!$this->canSeeDrafts($user)) {
                    $query->published();
                }
            }

            // Filter by category
            if ($request->has('category_id')) {
                $categoryId = $request->category_id;
                
                // Check if we should include children (default: true for parent categories)
                $includeChildren = filter_var($request->input('include_children', true), FILTER_VALIDATE_BOOLEAN);
                
                if ($includeChildren) {
                    // Recursively get all descendant category IDs (parent + all descendants)
                    $categoryIds = HelpCenterCategory::descendantIds($categoryId);
                    $query->whereIn('category_id', $categoryIds);
                } else {
                    // Only the selected category
                    $query->where('category_id', $categoryId);
                }
            }

            // Filter by category slug
            if ($request->has('category_slug')) {
                $category = HelpCenterCategory::where('slug', $request->category_slug)
                    ->whereNull('organization_id') // Only global categories
                    ->first();
                if ($category) {
                    $query->where('category_id', $category->id);
                } else {
                    return response()->json(['error' => 'Category not found'], 404);
                }
            }

            // Filter by tag
            if ($request->has('tag')) {
                $query->whereJsonContains('tags', $request->tag);
            }

            // Filter by featured
            if ($request->has('is_featured')) {
                $query->where('is_featured', filter_var($request->is_featured, FILTER_VALIDATE_BOOLEAN));
            }

            // Filter by pinned
            if ($request->has('is_pinned')) {
                $query->where('is_pinned', filter_var($request->is_pinned, FILTER_VALIDATE_BOOLEAN));
            }

            // Search with ranking
            $searchTerm = $request->input('search');
            if (!empty($searchTerm)) {
                $query->search($searchTerm);
            }

            // Ordering
            $orderBy = $request->input('order_by', 'recent');
            $orderDir = $request->input('order_dir', 'desc');
            if ($orderBy === 'views') {
                $query->orderBy('view_count', $orderDir);
            } elseif ($orderBy === 'recent') {
                $query->orderBy('published_at', 'desc');
            } elseif ($orderBy === 'relevance' && !empty($searchTerm)) {
                // Already ordered by search ranking
            } else {
                $query->orderBy('is_pinned', 'desc')
                    ->orderBy('order', 'asc')
                    ->orderBy('published_at', 'desc');
            }

            // Pagination
            if ($request->has('page') || $request->has('per_page')) {
                $perPage = min((int)($request->input('per_page', 25)), 100);
                $articles = $query->paginate($perPage);
                
                // Add search snippets if searching
                if (!empty($searchTerm)) {
                    $articles->getCollection()->transform(function ($article) use ($searchTerm) {
                        $article->search_snippet = $article->getSearchSnippet($searchTerm);
                        return $article;
                    });
                }
                
                return response()->json($articles);
            }

            // Limit results if no pagination
            $limit = min((int)($request->input('limit', 50)), 100);
            $articles = $query->limit($limit)->get();
            
            // Add search snippets if searching
            if (!empty($searchTerm)) {
                $articles = $articles->map(function ($article) use ($searchTerm) {
                    $article->search_snippet = $article->getSearchSnippet($searchTerm);
                    return $article;
                });
            }

            return response()->json($articles);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch articles'], 500);
        }
    }

    /**
     * Get article by slug
     */
    public function showBySlug(Request $request, string $categorySlug, string $articleSlug)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            // Find category
            // For unauthenticated users, allow any category (public articles can be in any category)
            // For authenticated users, filter by organization
            $categoryQuery = HelpCenterCategory::where('slug', $categorySlug)
                ->whereNull('deleted_at');
            
            // Only global categories (organization_id = NULL)
            $categoryQuery->whereNull('organization_id');
            // For unauthenticated users, don't filter by organization (allow all categories)
            
            $category = $categoryQuery->first();

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Get user's language preference
            $userLanguage = $this->getUserLanguage($request);

            // Find article (don't eager load relations - we'll load them safely later)
            // Try preferred language first, fallback to English if not found
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('slug', $articleSlug)
                ->where('category_id', $category->id)
                ->where(function ($q) use ($userLanguage) {
                    // First, try to get article in user's preferred language
                    $q->where('language', $userLanguage);
                    // Fallback to English if preferred language not available
                    if ($userLanguage !== 'en') {
                        $q->orWhere('language', 'en');
                    }
                })
                ->orderByRaw("CASE WHEN language = ? THEN 0 ELSE 1 END", [$userLanguage]);

            // For unauthenticated users, only show published public articles with no context_key
            // These should be accessible regardless of organization
            if (!$user) {
                $query->where('visibility', 'public')
                      ->where(function ($q) {
                          $q->whereNull('context_key')
                            ->orWhere('context_key', '');
                      })
                      ->published();
                // Public articles can be global (organization_id = NULL) or from any organization
                // Don't filter by organization for public articles
            } else {
                // Only global articles (organization_id = NULL)
                $query->whereNull('organization_id');

                // Apply visibility filter
                $query->visibleTo($user, $hasStaffPermission);

                // Apply permission-based filtering
                $this->applyPermissionFilter($query, $user, $organizationId);

                // Check if user can see drafts
                if (!$this->canSeeDrafts($user)) {
                    $query->published();
                }
            }

            // Get the first article (preferred language first due to ordering)
            $article = $query->first();

            if (!$article) {
                // Log why article wasn't found for debugging
                if (!$user) {
                    Log::debug('Public article not found', [
                        'category_slug' => $categorySlug,
                        'article_slug' => $articleSlug,
                        'category_id' => $category->id ?? null,
                        'language' => $userLanguage,
                        'reason' => 'Article may not be public, published, or has context_key',
                    ]);
                }
                return response()->json(['error' => 'Article not found'], 404);
            }

            // Load relations safely (handles invalid UUIDs and soft-deleted categories)
            $this->loadSafeArticleRelations($article);

            // Increment view count with throttling (safely handle null profile and session)
            try {
                $sessionId = null;
                if ($request->hasSession()) {
                    try {
                        $sessionId = $request->session()->getId();
                    } catch (\Exception $e) {
                        // Session not available, continue without session tracking
                        Log::debug('Session not available for view count tracking in showBySlug: ' . $e->getMessage());
                    }
                }
                $userId = $profile ? ($profile->id ?? null) : null;
                $article->incrementViewCount($userId, $sessionId);
                $article->refresh();
            } catch (\Exception $e) {
                // Log but don't fail the request if view count increment fails
                Log::warning('Failed to increment view count for article ' . $article->id . ' in showBySlug: ' . $e->getMessage());
            }

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::showBySlug error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch article'], 500);
        }
    }

    /**
     * Get category by slug with articles (canonical route)
     */
    public function showCategoryBySlug(Request $request, string $categorySlug)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            // Find category
            $category = HelpCenterCategory::where('slug', $categorySlug)
                ->whereNull('organization_id') // Only global categories
                ->with(['children', 'parent'])
                ->first();

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Get user's language preference
            $userLanguage = $this->getUserLanguage($request);

            // Optimize query: filter by language, category, and organization_id first (uses composite index)
            $articlesQuery = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global articles
                ->where('category_id', $category->id)
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->with(['author:id,full_name,email']); // Select only needed columns

            // Apply visibility filter
            $articlesQuery->visibleTo($user, $hasStaffPermission);

            // Apply permission-based filtering
            $this->applyPermissionFilter($articlesQuery, $user, $organizationId);

            // Filter by status
            if (!$this->canSeeDrafts($user)) {
                $articlesQuery->published();
            }

            $articles = $articlesQuery->orderBy('is_pinned', 'desc')
                ->orderBy('order', 'asc')
                ->orderBy('published_at', 'desc')
                ->get();

            return response()->json([
                'category' => $category,
                'articles' => $articles,
            ]);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::showCategoryBySlug error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch category'], 500);
        }
    }

    /**
     * Display the specified article (by ID - for admin CRUD)
     * Redirects to canonical slug URL if accessed via ID
     */
    public function show(string $id)
    {
        try {
            // Validate that $id is a valid UUID (prevent route conflicts with string routes like "context")
            if (!Str::isUuid($id)) {
                return response()->json([
                    'error' => 'Invalid article ID format',
                    'message' => 'Article ID must be a valid UUID',
                ], 400);
            }

            $context = $this->getUserContext(request());
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            // Build query without eager loading relations that might have invalid UUIDs
            // We'll load them safely later using loadSafeArticleRelations
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id'); // Only global articles

            // For unauthenticated users, only show published public articles with no context_key
            if (!$user) {
                $query->where('visibility', 'public')
                      ->where(function ($q) {
                          $q->whereNull('context_key')
                            ->orWhere('context_key', '');
                      })
                      ->published();
            } else {

                // Apply visibility filter
                $query->visibleTo($user, $hasStaffPermission);

                // Apply permission-based filtering
                $this->applyPermissionFilter($query, $user, $organizationId);

                // Check permission for authenticated users
                try {
                    if (!$user->hasPermissionTo('help_center.read')) {
                        // Even without permission, allow access to public articles with no context_key
                        $query->where(function ($q) {
                            $q->where('visibility', 'public')
                              ->where(function ($subQ) {
                                  $subQ->whereNull('context_key')
                                       ->orWhere('context_key', '');
                              });
                        });
                    }
                } catch (\Exception $e) {
                    Log::warning("Permission check failed for help_center.read: " . $e->getMessage());
                    // On permission check failure, only allow public articles with no context_key
                    $query->where(function ($q) {
                        $q->where('visibility', 'public')
                          ->where(function ($subQ) {
                              $subQ->whereNull('context_key')
                                   ->orWhere('context_key', '');
                          });
                    });
                }

                // Admins can see drafts
                if ($this->canSeeDrafts($user)) {
                    // Show all statuses
                } else {
                    $query->published();
                }
            }

            $article = $query->find($id);

            if (!$article) {
                // Check if article exists but doesn't meet access criteria
                $rawArticle = HelpCenterArticle::whereNull('deleted_at')->find($id);
                if ($rawArticle) {
                    $issues = [];
                    
                    // All articles are global now - no organization checks needed
                    if ($rawArticle->organization_id) {
                        $issues[] = "article should be global (organization_id should be NULL)";
                    }
                    
                    // Check visibility
                    if (!$user) {
                        if ($rawArticle->visibility !== 'public') {
                            $issues[] = "visibility is '{$rawArticle->visibility}' (needs 'public' for unauthenticated users)";
                        }
                    } else {
                        if ($rawArticle->visibility === 'staff_only' && !$hasStaffPermission) {
                            $issues[] = "visibility is 'staff_only' but user doesn't have staff permission";
                        }
                    }
                    
                    // Check status
                    if (!$user || !$this->canSeeDrafts($user)) {
                        if ($rawArticle->status !== 'published') {
                            $issues[] = "status is '{$rawArticle->status}' (needs 'published')";
                        }
                        if ($rawArticle->published_at && $rawArticle->published_at->isFuture()) {
                            $issues[] = "published_at is in the future";
                        }
                    }
                    
                    // Check context_key (for users without permission or unauthenticated)
                    if (!$user) {
                        if (!empty($rawArticle->context_key)) {
                            $issues[] = "context_key is set to '{$rawArticle->context_key}' (needs to be NULL or empty for public access)";
                        }
                    } else {
                        try {
                            $hasPermission = $user->hasPermissionTo('help_center.read');
                            if (!$hasPermission && !empty($rawArticle->context_key)) {
                                $issues[] = "context_key is set to '{$rawArticle->context_key}' and user doesn't have help_center.read permission";
                            }
                        } catch (\Exception $e) {
                            // Permission check failed, treat as no permission
                            if (!empty($rawArticle->context_key)) {
                                $issues[] = "context_key is set to '{$rawArticle->context_key}' and permission check failed";
                            }
                        }
                    }
                    
                    Log::debug('Article blocked', [
                        'article_id' => $id,
                        'user_id' => $user?->id,
                        'organization_id' => $organizationId,
                        'issues' => $issues,
                        'article_data' => [
                            'organization_id' => $rawArticle->organization_id,
                            'visibility' => $rawArticle->visibility,
                            'status' => $rawArticle->status,
                            'context_key' => $rawArticle->context_key,
                            'published_at' => $rawArticle->published_at?->toIso8601String(),
                        ],
                    ]);
                    
                    // For unauthenticated users, return 403 with details
                    // For authenticated users, return 404 (don't leak information about article existence)
                    if (!$user) {
                        return response()->json([
                            'error' => 'Article not accessible',
                            'message' => 'This article is not publicly accessible. ' . implode(', ', $issues),
                            'issues' => $issues,
                        ], 403);
                    }
                }
                
                Log::debug('Article not found by ID', [
                    'article_id' => $id,
                    'user_id' => $user?->id,
                ]);
                
                return response()->json(['error' => 'Article not found'], 404);
            }

            // Load relations safely (handles invalid UUIDs)
            $this->loadSafeArticleRelations($article);

            // Canonical URL redirect: If accessed via ID, redirect to slug URL
            // Check if request wants JSON (API call) or HTML (browser navigation)
            if (request()->wantsJson() || request()->expectsJson()) {
                // For API calls, include canonical URL in response
                if ($article->category && $article->category->slug && $article->slug) {
                    $article->canonical_url = "/help-center/s/{$article->category->slug}/{$article->slug}";
                }
            } else {
                // For browser requests, redirect to canonical slug URL
                if ($article->category && $article->category->slug && $article->slug) {
                    return redirect("/help-center/s/{$article->category->slug}/{$article->slug}", 301);
                }
            }

            // Increment view count with throttling (safely handle null profile and session)
            try {
                $sessionId = null;
                if (request()->hasSession()) {
                    try {
                        $sessionId = request()->session()->getId();
                    } catch (\Exception $e) {
                        // Session not available, continue without session tracking
                        Log::debug('Session not available for view count tracking: ' . $e->getMessage());
                    }
                }
                $userId = $profile ? ($profile->id ?? null) : null;
                $article->incrementViewCount($userId, $sessionId);
                $article->refresh();
            } catch (\Exception $e) {
                // Log but don't fail the request if view count increment fails
                Log::warning('Failed to increment view count for article ' . $id . ': ' . $e->getMessage());
            }

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'article_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to fetch article'], 500);
        }
    }

    /**
     * Store a newly created article
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.create: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'category_id' => 'required|uuid|exists:help_center_categories,id',
                'title' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'excerpt' => 'nullable|string',
                'content' => 'required|string',
                'content_type' => 'nullable|in:markdown,html',
                'featured_image_url' => 'nullable|url',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:public,org_users,staff_only',
                'is_featured' => 'nullable|boolean',
                'is_pinned' => 'nullable|boolean',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'order' => 'nullable|integer|min:0',
                'related_article_ids' => 'nullable|array',
                'related_article_ids.*' => 'uuid|exists:help_center_articles,id',
                // organization_id removed - all articles are global now
            ]);

            // Validate category is global
            $category = HelpCenterCategory::where('id', $validated['category_id'])
                ->whereNull('organization_id') // Only global categories
                ->whereNull('deleted_at')
                ->first();
            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Validate related articles are global
            if (!empty($validated['related_article_ids'])) {
                $relatedCount = HelpCenterArticle::whereIn('id', $validated['related_article_ids'])
                    ->whereNull('organization_id') // Only global articles
                    ->whereNull('deleted_at')
                    ->count();
                if ($relatedCount !== count($validated['related_article_ids'])) {
                    return response()->json(['error' => 'Some related articles not found'], 404);
                }
            }

            $article = HelpCenterArticle::create([
                'organization_id' => null, // All articles are global
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'slug' => $validated['slug'] ?? null,
                'excerpt' => $validated['excerpt'] ?? null,
                'content' => $validated['content'],
                'content_type' => $validated['content_type'] ?? 'markdown',
                'featured_image_url' => $validated['featured_image_url'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'visibility' => $validated['visibility'] ?? 'org_users',
                'is_featured' => $validated['is_featured'] ?? false,
                'is_pinned' => $validated['is_pinned'] ?? false,
                'meta_title' => $validated['meta_title'] ?? null,
                'meta_description' => $validated['meta_description'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'order' => $validated['order'] ?? 0,
                'author_id' => $profile->id,
                'created_by' => $profile->id,
                'updated_by' => $profile->id,
                'related_article_ids' => $validated['related_article_ids'] ?? [],
            ]);

            $this->loadSafeArticleRelations($article);

            return response()->json($article, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to create article'], 500);
        }
    }

    /**
     * Update the specified article
     */
    public function update(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $validated = $request->validate([
                'category_id' => 'sometimes|required|uuid|exists:help_center_categories,id',
                'title' => 'sometimes|required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'excerpt' => 'nullable|string',
                'content' => 'sometimes|required|string',
                'content_type' => 'nullable|in:markdown,html',
                'language' => 'nullable|in:en,ps,fa,ar',
                'featured_image_url' => 'nullable|url',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:public,org_users,staff_only',
                'is_featured' => 'nullable|boolean',
                'is_pinned' => 'nullable|boolean',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'order' => 'nullable|integer|min:0',
                'related_article_ids' => 'nullable|array',
                'related_article_ids.*' => 'uuid|exists:help_center_articles,id',
            ]);

            // Validate category is global
            if (!empty($validated['category_id']) && $validated['category_id'] !== $article->category_id) {
                $category = HelpCenterCategory::where('id', $validated['category_id'])
                    ->whereNull('organization_id') // Only global categories
                    ->whereNull('deleted_at')
                    ->first();
                if (!$category) {
                    return response()->json(['error' => 'Category not found'], 404);
                }
            }

            // Validate related articles are global
            if (!empty($validated['related_article_ids'])) {
                $relatedCount = HelpCenterArticle::whereIn('id', $validated['related_article_ids'])
                    ->whereNull('organization_id') // Only global articles
                    ->whereNull('deleted_at')
                    ->count();
                if ($relatedCount !== count($validated['related_article_ids'])) {
                    return response()->json(['error' => 'Some related articles not found'], 404);
                }
            }

            // Ensure organization_id is not updated (always NULL for global articles)
            unset($validated['organization_id']);

            // Update updated_by
            $validated['updated_by'] = $profile->id;

            $article->update($validated);
            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update article'], 500);
        }
    }

    /**
     * Remove the specified article (soft delete)
     */
    public function destroy(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.delete: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $article->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::destroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete article'], 500);
        }
    }

    /**
     * Publish an article
     */
    public function publish(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $article->publish();
            $article->update(['updated_by' => $profile->id]);
            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::publish error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to publish article'], 500);
        }
    }

    /**
     * Unpublish an article (back to draft)
     */
    public function unpublish(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $article->unpublish();
            $article->update(['updated_by' => $profile->id]);
            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::unpublish error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to unpublish article'], 500);
        }
    }

    /**
     * Archive an article
     */
    public function archive(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $article->archive();
            $article->update(['updated_by' => $profile->id]);
            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::archive error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to archive article'], 500);
        }
    }

    /**
     * Mark article as helpful
     */
    public function markHelpful(string $id)
    {
        try {
            $user = request()->user();
            $profile = null;
            $sessionId = null;
            $userId = null;

            if ($user) {
                $profile = DB::table('profiles')->where('id', $user->id)->first();
                $userId = $profile ? ($profile->id ?? null) : null;
            }

            // Safely get session ID (API routes may not have sessions)
            try {
                if (request()->hasSession()) {
                    $sessionId = request()->session()->getId();
                }
            } catch (\Exception $e) {
                // Session not available, continue without session tracking
                Log::debug('Session not available for markHelpful: ' . $e->getMessage());
            }

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('status', 'published');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            // Apply visibility filter
            $hasStaffPermission = false;
            if ($user) {
                try {
                    $hasStaffPermission = $user->hasPermissionTo('help_center.read_staff');
                } catch (\Exception $e) {
                    $hasStaffPermission = false;
                }
            }
            $query->visibleTo($user, $hasStaffPermission);

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $result = $article->markHelpful($userId, $sessionId);
            $article->refresh();

            if (!$result) {
                return response()->json(['error' => 'Already voted'], 409);
            }

            return response()->json([
                'helpful_count' => $article->helpful_count,
                'not_helpful_count' => $article->not_helpful_count,
            ]);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::markHelpful error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'article_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to mark article as helpful'], 500);
        }
    }

    /**
     * Mark article as not helpful
     */
    public function markNotHelpful(string $id)
    {
        try {
            $user = request()->user();
            $profile = null;
            $sessionId = null;
            $userId = null;

            if ($user) {
                $profile = DB::table('profiles')->where('id', $user->id)->first();
                $userId = $profile ? ($profile->id ?? null) : null;
            }

            // Safely get session ID (API routes may not have sessions)
            try {
                if (request()->hasSession()) {
                    $sessionId = request()->session()->getId();
                }
            } catch (\Exception $e) {
                // Session not available, continue without session tracking
                Log::debug('Session not available for markNotHelpful: ' . $e->getMessage());
            }

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('status', 'published');

            // Only global articles (organization_id = NULL)
            $query->whereNull('organization_id');

            // Apply visibility filter
            $hasStaffPermission = false;
            if ($user) {
                try {
                    $hasStaffPermission = $user->hasPermissionTo('help_center.read_staff');
                } catch (\Exception $e) {
                    $hasStaffPermission = false;
                }
            }
            $query->visibleTo($user, $hasStaffPermission);

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $result = $article->markNotHelpful($userId, $sessionId);
            $article->refresh();

            if (!$result) {
                return response()->json(['error' => 'Already voted'], 409);
            }

            return response()->json([
                'helpful_count' => $article->helpful_count,
                'not_helpful_count' => $article->not_helpful_count,
            ]);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::markNotHelpful error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'article_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to mark article as not helpful'], 500);
        }
    }

    /**
     * Get featured articles
     */
    public function featured(Request $request)
    {
        try {
            // Validate limit parameter
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:20',
            ]);

            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            $limit = min((int)($validated['limit'] ?? 5), 20);
            
            // Get user's language preference
            $userLanguage = $this->getUserLanguage($request);
            
            // Optimize query: filter by language, organization, and status first (uses composite index)
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global articles
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->published()
                ->featured()
                ->with(['category:id,name,slug']); // Select only needed columns

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Apply permission-based filtering
            $this->applyPermissionFilter($query, $user, $organizationId);

            // Check permission for authenticated users
            if ($user) {
                try {
                    if (!$user->hasPermissionTo('help_center.read')) {
                        // Even without permission, allow access to public articles with no context_key
                        $query->where(function ($q) {
                            $q->where('visibility', 'public')
                              ->where(function ($subQ) {
                                  $subQ->whereNull('context_key')
                                       ->orWhere('context_key', '');
                              });
                        });
                    }
                } catch (\Exception $e) {
                    Log::warning("Permission check failed for help_center.read: " . $e->getMessage());
                    // On permission check failure, only allow public articles with no context_key
                    $query->where(function ($q) {
                        $q->where('visibility', 'public')
                          ->where(function ($subQ) {
                              $subQ->whereNull('context_key')
                                   ->orWhere('context_key', '');
                          });
                    });
                }
            }

            $articles = $query->orderBy('order')
                ->orderBy('published_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json($articles);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 400);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::featured error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch featured articles'], 500);
        }
    }

    /**
     * Get popular articles (by view count)
     */
    public function popular(Request $request)
    {
        try {
            // Validate limit parameter
            $validated = $request->validate([
                'limit' => 'nullable|integer|min:1|max:20',
            ]);

            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            $limit = min((int)($validated['limit'] ?? 10), 20);
            
            // Get user's language preference
            $userLanguage = $this->getUserLanguage($request);
            
            // Optimize query: filter by language, organization, and status first (uses composite index)
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global articles
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->published()
                ->with(['category:id,name,slug']); // Select only needed columns

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Apply permission-based filtering
            $this->applyPermissionFilter($query, $user, $organizationId);

            // Check permission for authenticated users
            if ($user) {
                try {
                    if (!$user->hasPermissionTo('help_center.read')) {
                        // Even without permission, allow access to public articles with no context_key
                        $query->where(function ($q) {
                            $q->where('visibility', 'public')
                              ->where(function ($subQ) {
                                  $subQ->whereNull('context_key')
                                       ->orWhere('context_key', '');
                              });
                        });
                    }
                } catch (\Exception $e) {
                    Log::warning("Permission check failed for help_center.read: " . $e->getMessage());
                    // On permission check failure, only allow public articles with no context_key
                    $query->where(function ($q) {
                        $q->where('visibility', 'public')
                          ->where(function ($subQ) {
                              $subQ->whereNull('context_key')
                                   ->orWhere('context_key', '');
                          });
                    });
                }
            }

            $articles = $query->orderBy('view_count', 'desc')
                ->limit($limit)
                ->get();

            return response()->json($articles);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 400);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::popular error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to fetch popular articles'], 500);
        }
    }

    /**
     * Get article by context (for contextual help)
     */
    public function getByContext(Request $request)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            $validated = $request->validate([
                'route' => 'nullable|string|max:500',
                'context' => 'nullable|string|max:100',
            ]);

            $route = $validated['route'] ?? $request->input('route');
            $contextKey = $validated['context'] ?? $request->input('context');

            if (!$route && !$contextKey) {
                return response()->json(['error' => 'Either route or context parameter is required'], 400);
            }

            // Get user's language preference
            $userLanguage = $this->getUserLanguage($request);
            
            // Optimize query: filter by language, organization, and status first (uses composite index)
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global articles
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->where('status', 'published')
                ->with(['category:id,name,slug']); // Select only needed columns

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Apply permission-based filtering
            $this->applyPermissionFilter($query, $user, $organizationId);

            // Try to match by context_key first (exact match)
            if ($contextKey) {
                $contextMatch = (clone $query)
                    ->where('context_key', $contextKey)
                    ->orderBy('is_featured', 'desc')
                    ->orderBy('view_count', 'desc')
                    ->first();

                if ($contextMatch) {
                    return response()->json([
                        'article' => $contextMatch,
                        'match_type' => 'context_key',
                    ]);
                }
            }

            // Try to match by route_pattern (wildcard matching)
            if ($route) {
                $routeMatches = (clone $query)
                    ->whereNotNull('route_pattern')
                    ->get()
                    ->filter(function ($article) use ($route) {
                        $pattern = $article->route_pattern;
                        // Convert route pattern to regex
                        // Example: "/attendance/*" -> "/attendance/.*"
                        $regex = str_replace(['*', '/'], ['.*', '\/'], $pattern);
                        return preg_match("/^{$regex}$/", $route);
                    })
                    ->sortByDesc('is_featured')
                    ->sortByDesc('view_count')
                    ->first();

                if ($routeMatches) {
                    return response()->json([
                        'article' => $routeMatches,
                        'match_type' => 'route_pattern',
                    ]);
                }
            }

            // Fallback: Try to match by category/article slugs
            if ($route) {
                // Extract route paths (excluding UUIDs, with plural/singular variations)
                $routePaths = $this->extractRoutePaths($route);
                
                // Try each path variation in order of specificity
                foreach ($routePaths as $path) {
                    if (empty($path)) {
                        continue;
                    }
                    
                    // Try to find article with matching slug in category with matching slug (global only)
                    $slugMatch = (clone $query)
                        ->whereHas('category', function ($q) use ($path) {
                            $q->where('slug', $path)
                              ->whereNull('organization_id') // Only global categories
                              ->whereNull('deleted_at');
                        })
                        ->where('slug', $path)
                        ->orderBy('is_featured', 'desc')
                        ->orderBy('view_count', 'desc')
                        ->first();
                    
                    if ($slugMatch) {
                        return response()->json([
                            'article' => $slugMatch,
                            'match_type' => 'slug_fallback',
                        ]);
                    }

                    // If no category+slug match, try slug-only (supports "path/to/page" -> "path-to-page")
                    $normalizedSlug = str_replace('/', '-', $path);
                    $slugOnlyMatch = (clone $query)
                        ->where('slug', $normalizedSlug)
                        ->orderBy('is_featured', 'desc')
                        ->orderBy('view_count', 'desc')
                        ->first();

                    if ($slugOnlyMatch) {
                        return response()->json([
                            'article' => $slugOnlyMatch,
                            'match_type' => 'slug_fallback',
                        ]);
                    }
                    
                    // If no exact match, try category slug only (any article in that category, global only)
                    $categorySlugMatch = (clone $query)
                        ->whereHas('category', function ($q) use ($path) {
                            $q->where('slug', $path)
                              ->whereNull('organization_id') // Only global categories
                              ->whereNull('deleted_at');
                        })
                        ->orderBy('is_featured', 'desc')
                        ->orderBy('view_count', 'desc')
                        ->first();
                    
                    if ($categorySlugMatch) {
                        return response()->json([
                            'article' => $categorySlugMatch,
                            'match_type' => 'category_slug_fallback',
                        ]);
                    }
                }
            }

            // Fallback: Try to find category-level help
            if ($contextKey) {
                // Extract category from context_key (e.g., "students.create" -> "students")
                $categoryKey = explode('.', $contextKey)[0] ?? null;
                if ($categoryKey) {
                    $categoryMatch = (clone $query)
                        ->where('context_key', 'LIKE', "{$categoryKey}.%")
                        ->orWhere('context_key', $categoryKey)
                        ->orderBy('is_featured', 'desc')
                        ->orderBy('view_count', 'desc')
                        ->first();

                    if ($categoryMatch) {
                        return response()->json([
                            'article' => $categoryMatch,
                            'match_type' => 'category_fallback',
                        ]);
                    }
                }
            }

            // No match found
            return response()->json([
                'article' => null,
                'match_type' => 'none',
                'message' => 'No contextual help article found',
            ]);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::getByContext error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch contextual help'], 500);
        }
    }

    /**
     * Platform admin: List all articles (no organization filter)
     */
    public function platformIndex(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            // Check permission (platform admin only)
            try {
                if (!$user->hasPermissionTo('subscription.admin')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            // Get user's language preference (platform admin can see all languages, but filter for consistency)
            $userLanguage = $this->getUserLanguage($request);
            
            // Filter out articles with invalid author_id values that cause UUID type errors
            // Some articles may have author_id = 0 (integer) which can't be compared to UUID in profiles table
            // Optimize query: filter by language early (uses composite index)
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('language', $userLanguage) // Filter by language early (uses index)
                ->where(function ($q) {
                    // Include articles with NULL author_id
                    $q->whereNull('author_id')
                      // OR articles with valid UUID author_id (not '0' or zero UUID)
                      ->orWhere(function ($subQ) {
                          $subQ->whereNotNull('author_id')
                               ->whereRaw("author_id::text != '0'")
                               ->whereRaw("author_id::text != '00000000-0000-0000-0000-000000000000'")
                               ->whereRaw("author_id::text ~* ?", ['^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$']);
                      });
                })
                ->with(['category' => function ($q) {
                    $q->whereNull('deleted_at')->select('id', 'name', 'slug');
                }])
                ->with(['author:id,full_name,email']); // Select only needed columns

            // Search filter
            if ($request->has('search') && !empty($request->search)) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'ILIKE', "%{$search}%")
                      ->orWhere('excerpt', 'ILIKE', "%{$search}%")
                      ->orWhere('content', 'ILIKE', "%{$search}%");
                });
            }

            // Status filter
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Visibility filter
            if ($request->has('visibility')) {
                $query->where('visibility', $request->visibility);
            }

            // Category filter
            if ($request->has('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            // Tag filter
            if ($request->has('tag')) {
                $query->whereJsonContains('tags', $request->tag);
            }

            // Order by - validate order_by column to prevent SQL injection
            $allowedOrderColumns = ['created_at', 'updated_at', 'title', 'view_count', 'order', 'status'];
            $orderBy = $request->get('order_by', 'created_at');
            if (!in_array($orderBy, $allowedOrderColumns)) {
                $orderBy = 'created_at';
            }
            $orderDir = strtolower($request->get('order_dir', 'desc'));
            if (!in_array($orderDir, ['asc', 'desc'])) {
                $orderDir = 'desc';
            }
            $query->orderBy($orderBy, $orderDir);

            $articles = $query->get();

            return response()->json($articles);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::platformIndex error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch articles'], 500);
        }
    }

    /**
     * Platform admin: Create a new article
     */
    public function platformStore(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            // Check permission
            try {
                if (!$user->hasPermissionTo('subscription.admin')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $validated = $request->validate([
                'category_id' => 'required|uuid|exists:help_center_categories,id',
                'title' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'excerpt' => 'nullable|string',
                'content' => 'required|string',
                'content_type' => 'nullable|in:markdown,html',
                'language' => 'nullable|in:en,ps,fa,ar',
                'featured_image_url' => 'nullable|url',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:public,org_users,staff_only',
                'is_featured' => 'nullable|boolean',
                'is_pinned' => 'nullable|boolean',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'order' => 'nullable|integer|min:0',
                'related_article_ids' => 'nullable|array',
                'related_article_ids.*' => 'uuid|exists:help_center_articles,id',
                'organization_id' => 'nullable|uuid|exists:organizations,id',
            ]);

            // Validate category exists
            $category = HelpCenterCategory::find($validated['category_id']);
            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Allow null organization_id for global articles
            $orgId = $request->input('organization_id');
            
            // Determine status and is_published
            $status = $validated['status'] ?? 'draft';
            $isPublished = $status === 'published';
            
            // Set published_at if status is published
            $publishedAt = null;
            if ($status === 'published') {
                $publishedAt = now();
            }

            $article = HelpCenterArticle::create([
                'organization_id' => $orgId,
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'slug' => $validated['slug'] ?? null,
                'excerpt' => $validated['excerpt'] ?? null,
                'content' => $validated['content'],
                'content_type' => $validated['content_type'] ?? 'html',
                'language' => $validated['language'] ?? 'en',
                'featured_image_url' => $validated['featured_image_url'] ?? null,
                'status' => $status,
                'is_published' => $isPublished,
                'visibility' => $validated['visibility'] ?? 'public',
                'is_featured' => $validated['is_featured'] ?? false,
                'is_pinned' => $validated['is_pinned'] ?? false,
                'meta_title' => $validated['meta_title'] ?? null,
                'meta_description' => $validated['meta_description'] ?? null,
                'tags' => $validated['tags'] ?? [],
                'order' => $validated['order'] ?? 0,
                'related_article_ids' => $validated['related_article_ids'] ?? [],
                'author_id' => $user->id,
                'created_by' => $user->id,
                'published_at' => $publishedAt,
            ]);

            $this->loadSafeArticleRelations($article);

            return response()->json($article, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::platformStore error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);
            return response()->json([
                'error' => 'Failed to create article',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Platform admin: Update an article
     */
    public function platformUpdate(Request $request, string $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            // Check permission
            try {
                if (!$user->hasPermissionTo('subscription.admin')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $article = HelpCenterArticle::whereNull('deleted_at')->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $validated = $request->validate([
                'category_id' => 'sometimes|required|uuid|exists:help_center_categories,id',
                'title' => 'sometimes|required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'excerpt' => 'nullable|string',
                'content' => 'sometimes|required|string',
                'content_type' => 'nullable|in:markdown,html',
                'language' => 'nullable|in:en,ps,fa,ar',
                'featured_image_url' => 'nullable|url',
                'status' => 'nullable|in:draft,published,archived',
                'visibility' => 'nullable|in:public,org_users,staff_only',
                'is_featured' => 'nullable|boolean',
                'is_pinned' => 'nullable|boolean',
                'meta_title' => 'nullable|string|max:255',
                'meta_description' => 'nullable|string',
                'tags' => 'nullable|array',
                'tags.*' => 'string|max:50',
                'order' => 'nullable|integer|min:0',
                'related_article_ids' => 'nullable|array',
                'related_article_ids.*' => 'uuid|exists:help_center_articles,id',
                // organization_id removed - all articles are global now
            ]);

            // Validate category if changed
            if (isset($validated['category_id'])) {
                $category = HelpCenterCategory::find($validated['category_id']);
                if (!$category) {
                    return response()->json(['error' => 'Category not found'], 404);
                }
            }

            // Update article
            $article->update($validated);

            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::platformUpdate error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update article'], 500);
        }
    }

    /**
     * Platform admin: Delete an article
     */
    public function platformDestroy(string $id)
    {
        try {
            $user = request()->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);

            // Check permission
            try {
                if (!$user->hasPermissionTo('subscription.admin')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $article = HelpCenterArticle::whereNull('deleted_at')->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            $article->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::platformDestroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete article'], 500);
        }
    }
}
