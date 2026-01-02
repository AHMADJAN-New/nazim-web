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
     */
    private function getUserContext(Request $request)
    {
        $user = $request->user();
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
     * Load relations safely (avoid invalid UUID relation lookups)
     */
    private function loadSafeArticleRelations(HelpCenterArticle $article): void
    {
        $relations = ['category'];

        if ($article->author_id && Str::isUuid($article->author_id)) {
            $relations[] = 'author';
        }
        if ($article->created_by && Str::isUuid($article->created_by)) {
            $relations[] = 'creator';
        }
        if ($article->updated_by && Str::isUuid($article->updated_by)) {
            $relations[] = 'updater';
        }

        $article->load($relations);
        $article->setAttribute('related_articles', $article->relatedArticles());
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

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->with(['category', 'author']);

            // Apply organization scope (include global + org articles)
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                // Public access: only global articles
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

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
                $query->where('category_id', $request->category_id);
            }

            // Filter by category slug
            if ($request->has('category_slug')) {
                $category = HelpCenterCategory::where('slug', $request->category_slug)
                    ->where(function ($q) use ($organizationId) {
                        if ($organizationId) {
                            $q->where('organization_id', $organizationId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
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
            $category = HelpCenterCategory::where('slug', $categorySlug)
                ->where(function ($q) use ($organizationId) {
                    if ($organizationId) {
                        $q->where('organization_id', $organizationId)
                            ->orWhereNull('organization_id');
                    } else {
                        $q->whereNull('organization_id');
                    }
                })
                ->first();

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Find article
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('slug', $articleSlug)
                ->where('category_id', $category->id)
                ->with(['category', 'author', 'creator', 'updater']);

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Check if user can see drafts
            if (!$this->canSeeDrafts($user)) {
                $query->published();
            }

            $article = $query->first();

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            // Increment view count with throttling
            $sessionId = $request->session()->getId() ?? null;
            $userId = $profile->id ?? null;
            $article->incrementViewCount($userId, $sessionId);
            $article->refresh();

            $this->loadSafeArticleRelations($article);

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
                ->where(function ($q) use ($organizationId) {
                    if ($organizationId) {
                        $q->where('organization_id', $organizationId)
                            ->orWhereNull('organization_id');
                    } else {
                        $q->whereNull('organization_id');
                    }
                })
                ->with(['children', 'parent'])
                ->first();

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Get articles in this category
            $articlesQuery = HelpCenterArticle::whereNull('deleted_at')
                ->where('category_id', $category->id)
                ->with(['author']);

            // Apply organization scope
            if ($organizationId) {
                $articlesQuery->forOrganization($organizationId);
            } else {
                $articlesQuery->whereNull('organization_id');
            }

            // Apply visibility filter
            $articlesQuery->visibleTo($user, $hasStaffPermission);

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
            $context = $this->getUserContext(request());
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            // Check permission
            try {
                if (!$user->hasPermissionTo('help_center.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for help_center.read: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->with(['category', 'author', 'creator', 'updater']);

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            // Admins can see drafts
            if ($this->canSeeDrafts($user)) {
                // Show all statuses
            } else {
                $query->published();
            }

            $article = $query->find($id);

            if (!$article) {
                return response()->json(['error' => 'Article not found'], 404);
            }

            // Load category if not already loaded
            if (!$article->relationLoaded('category')) {
                $article->load('category');
            }

            // Canonical URL redirect: If accessed via ID, redirect to slug URL
            // Check if request wants JSON (API call) or HTML (browser navigation)
            if (request()->wantsJson() || request()->expectsJson()) {
                // For API calls, include canonical URL in response
                if ($article->category) {
                    $article->canonical_url = "/help-center/s/{$article->category->slug}/{$article->slug}";
                }
            } else {
                // For browser requests, redirect to canonical slug URL
                if ($article->category) {
                    return redirect("/help-center/s/{$article->category->slug}/{$article->slug}", 301);
                }
            }

            // Increment view count with throttling
            $sessionId = request()->session()->getId() ?? null;
            $userId = $profile->id ?? null;
            $article->incrementViewCount($userId, $sessionId);
            $article->refresh();

            $this->loadSafeArticleRelations($article);

            return response()->json($article);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
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
                'organization_id' => 'nullable|uuid|exists:organizations,id', // Allow setting org or null for global
            ]);

            // Validate category belongs to same organization or is global
            $category = HelpCenterCategory::where('id', $validated['category_id'])
                ->where(function ($q) use ($profile) {
                    if ($profile->organization_id) {
                        $q->where('organization_id', $profile->organization_id)
                            ->orWhereNull('organization_id');
                    } else {
                        $q->whereNull('organization_id');
                    }
                })
                ->first();
            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Determine organization_id
            $orgId = $validated['organization_id'] ?? $profile->organization_id;

            // Validate related articles belong to same organization or are global
            if (!empty($validated['related_article_ids'])) {
                $relatedCount = HelpCenterArticle::whereIn('id', $validated['related_article_ids'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->count();
                if ($relatedCount !== count($validated['related_article_ids'])) {
                    return response()->json(['error' => 'Some related articles not found'], 404);
                }
            }

            $article = HelpCenterArticle::create([
                'organization_id' => $orgId,
                'category_id' => $validated['category_id'],
                'title' => $validated['title'],
                'slug' => $validated['slug'] ?? null,
                'excerpt' => $validated['excerpt'] ?? null,
                'content' => $validated['content'],
                'content_type' => $validated['content_type'] ?? 'markdown',
                'featured_image_url' => $validated['featured_image_url'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'visibility' => $validated['visibility'] ?? ($orgId ? 'org_users' : 'public'),
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

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            // Validate category belongs to same organization or is global
            if (!empty($validated['category_id']) && $validated['category_id'] !== $article->category_id) {
                $category = HelpCenterCategory::where('id', $validated['category_id'])
                    ->where(function ($q) use ($profile, $article) {
                        $orgId = $article->organization_id ?? $profile->organization_id;
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->first();
                if (!$category) {
                    return response()->json(['error' => 'Category not found'], 404);
                }
            }

            // Validate related articles
            if (!empty($validated['related_article_ids'])) {
                $orgId = $article->organization_id ?? $profile->organization_id;
                $relatedCount = HelpCenterArticle::whereIn('id', $validated['related_article_ids'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->count();
                if ($relatedCount !== count($validated['related_article_ids'])) {
                    return response()->json(['error' => 'Some related articles not found'], 404);
                }
            }

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

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            $sessionId = request()->session()->getId() ?? null;
            $userId = $profile->id ?? null;

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('status', 'published');

            // Apply organization scope
            if ($profile && $profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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
            Log::error('HelpCenterArticleController::markHelpful error: ' . $e->getMessage());
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
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            $sessionId = request()->session()->getId() ?? null;
            $userId = $profile->id ?? null;

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('status', 'published');

            // Apply organization scope
            if ($profile && $profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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
            Log::error('HelpCenterArticleController::markNotHelpful error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to mark article as not helpful'], 500);
        }
    }

    /**
     * Get featured articles
     */
    public function featured(Request $request)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            $limit = min((int)($request->input('limit', 5)), 20);
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->published()
                ->featured()
                ->with(['category']);

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            $articles = $query->orderBy('order')
                ->orderBy('published_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json($articles);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::featured error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to fetch featured articles'], 500);
        }
    }

    /**
     * Get popular articles (by view count)
     */
    public function popular(Request $request)
    {
        try {
            $context = $this->getUserContext($request);
            $user = $context['user'];
            $profile = $context['profile'];
            $organizationId = $context['organization_id'];
            $hasStaffPermission = $context['has_staff_permission'];

            $limit = min((int)($request->input('limit', 10)), 20);
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->published()
                ->with(['category']);

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

            $articles = $query->orderBy('view_count', 'desc')
                ->limit($limit)
                ->get();

            return response()->json($articles);
        } catch (\Exception $e) {
            Log::error('HelpCenterArticleController::popular error: ' . $e->getMessage());
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

            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where('status', 'published')
                ->with(['category']);

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

            // Apply visibility filter
            $query->visibleTo($user, $hasStaffPermission);

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

            // Filter out articles with invalid author_id values that cause UUID type errors
            // Some articles may have author_id = 0 (integer) which can't be compared to UUID in profiles table
            $query = HelpCenterArticle::whereNull('deleted_at')
                ->where(function ($q) {
                    // Include articles with NULL author_id
                    $q->whereNull('author_id')
                      // OR articles with valid UUID author_id (not '0' or zero UUID)
                      ->orWhere(function ($subQ) {
                          $subQ->whereNotNull('author_id')
                               ->whereRaw("author_id::text != '0'")
                               ->whereRaw("author_id::text != '00000000-0000-0000-0000-000000000000'");
                      });
                })
                ->with(['category' => function ($q) {
                    $q->whereNull('deleted_at');
                }])
                ->with(['author']);

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
