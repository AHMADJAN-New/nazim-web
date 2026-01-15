<?php

namespace App\Http\Controllers;

use App\Models\HelpCenterCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HelpCenterCategoryController extends Controller
{
    private function getUserLanguage(Request $request): string
    {
        $lang = $request->get('lang');
        if (!is_string($lang) || $lang === '') {
            $lang = 'en';
        }
        $lang = strtolower($lang);
        return in_array($lang, ['en', 'ps', 'fa', 'ar'], true) ? $lang : 'en';
    }

    /**
     * Display a listing of help center categories
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

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

            $userLanguage = $this->getUserLanguage($request);

            // Root categories only, but include recursive children.
            $categories = HelpCenterCategory::query()
                ->whereNull('deleted_at')
                ->whereNull('organization_id')
                ->active()
                ->when($request->has('parent_id'), function ($q) use ($request) {
                    if ($request->parent_id === 'null' || $request->parent_id === null) {
                        $q->whereNull('parent_id');
                    } else {
                        $q->where('parent_id', $request->parent_id);
                    }
                }, function ($q) {
                    $q->root();
                })
                ->with([
                    // unlimited nesting
                    'childrenRecursive',
                ])
                // direct counts for each node (language-aware; don't multiply by 4)
                ->withCount([
                    'publishedArticles as article_count' => function ($q) use ($userLanguage) {
                        $q->where('language', $userLanguage);
                    }
                ])
                ->orderBy('order')
                ->orderBy('name')
                ->get();

            // Optionally compute aggregated counts (parent includes descendants)
            $computeAggregate = function ($node) use (&$computeAggregate) {
                $sum = (int) ($node->article_count ?? 0);

                $children = $node->childrenRecursive ?? collect();
                foreach ($children as $child) {
                    $computeAggregate($child);
                    $sum += (int) ($child->article_count_aggregate ?? 0);
                }

                $node->setAttribute('article_count_aggregate', $sum);

                return $node;
            };

            foreach ($categories as $cat) {
                $computeAggregate($cat);
            }

            return response()->json($categories);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch categories'], 500);
        }
    }

    /**
     * Get category by slug
     */
    public function showBySlug(Request $request, string $slug)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            $organizationId = $profile->organization_id ?? null;

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

            $query = HelpCenterCategory::whereNull('deleted_at')
                ->where('slug', $slug)
                ->whereNull('organization_id') // Only global categories
                ->active();

            $category = $query->with(['parent', 'children', 'publishedArticles'])
                ->first();

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            return response()->json($category);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::showBySlug error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch category'], 500);
        }
    }

    /**
     * Store a newly created category
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
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'parent_id' => 'nullable|uuid|exists:help_center_categories,id',
                // organization_id removed - all categories are global now
            ]);

            // Validate parent is global
            if (!empty($validated['parent_id'])) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->whereNull('organization_id') // Only global categories
                    ->whereNull('deleted_at')
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
            }

            $category = HelpCenterCategory::create([
                'organization_id' => null, // All categories are global
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? null,
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? null,
                'color' => $validated['color'] ?? null,
                'order' => $validated['order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
                'parent_id' => $validated['parent_id'] ?? null,
            ]);

            return response()->json($category, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to create category'], 500);
        }
    }

    /**
     * Display the specified category (by ID - for admin CRUD)
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            $organizationId = $profile->organization_id ?? null;

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

            $query = HelpCenterCategory::whereNull('deleted_at')
                ->whereNull('organization_id') // Only global categories
                ->active();

            $category = $query->with(['parent', 'children', 'publishedArticles'])
                ->find($id);

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            return response()->json($category);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch category'], 500);
        }
    }

    /**
     * Update the specified category
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

            $query = HelpCenterCategory::whereNull('deleted_at')
                ->whereNull('organization_id'); // Only global categories

            $category = $query->find($id);

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'parent_id' => 'nullable|uuid|exists:help_center_categories,id',
            ]);

            // Validate parent is global
            if (!empty($validated['parent_id']) && $validated['parent_id'] !== $category->parent_id) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->whereNull('organization_id') // Only global categories
                    ->whereNull('deleted_at')
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
                // Prevent circular reference
                if ($validated['parent_id'] === $id) {
                    return response()->json(['error' => 'Category cannot be its own parent'], 422);
                }
            }

            // Ensure organization_id is not updated (always NULL for global categories)
            unset($validated['organization_id']);

            $category->update($validated);

            return response()->json($category);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update category'], 500);
        }
    }

    /**
     * Remove the specified category (soft delete)
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

            $query = HelpCenterCategory::whereNull('deleted_at')
                ->whereNull('organization_id'); // Only global categories

            $category = $query->find($id);

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Check if category has articles
            $hasArticles = $category->articles()->whereNull('deleted_at')->exists();
            if ($hasArticles) {
                return response()->json(['error' => 'This category has articles and cannot be deleted'], 409);
            }

            // Check if category has children
            $hasChildren = $category->children()->whereNull('deleted_at')->exists();
            if ($hasChildren) {
                return response()->json(['error' => 'This category has subcategories and cannot be deleted'], 409);
            }

            $category->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::destroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete category'], 500);
        }
    }

    /**
     * Platform admin: List all categories (no organization filter)
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

            $query = HelpCenterCategory::whereNull('deleted_at')
                ->whereNull('organization_id'); // Only global categories

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            } else {
                // Default: only active
                $query->active();
            }

            // Filter by parent (root categories if null)
            if ($request->has('parent_id')) {
                if ($request->parent_id === 'null' || $request->parent_id === null) {
                    $query->whereNull('parent_id');
                } else {
                    $query->where('parent_id', $request->parent_id);
                }
            } else {
                // Default: show root categories
                $query->root();
            }

            // Recursively load all nested children (supports multi-level nesting)
            $categories = $query->with(['children' => function ($q) {
                $q->where('is_active', true)
                  ->whereNull('organization_id') // Only global categories
                  ->orderBy('order')
                  ->with(['children' => function ($subQ) {
                      $subQ->where('is_active', true)
                           ->whereNull('organization_id')
                           ->orderBy('order');
                  }]);
            }])
            ->orderBy('order')
            ->orderBy('name')
            ->get();

            return response()->json($categories);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::platformIndex error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch categories'], 500);
        }
    }

    /**
     * Platform admin: Create a new category
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
                'name' => 'required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'parent_id' => 'nullable|uuid|exists:help_center_categories,id',
                // organization_id removed - all categories are global now
            ]);

            // Validate parent is global
            if (!empty($validated['parent_id'])) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->whereNull('organization_id') // Only global categories
                    ->whereNull('deleted_at')
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
            }

            $category = HelpCenterCategory::create([
                'organization_id' => null, // All categories are global
                'name' => $validated['name'],
                'slug' => $validated['slug'] ?? null,
                'description' => $validated['description'] ?? null,
                'icon' => $validated['icon'] ?? null,
                'color' => $validated['color'] ?? null,
                'order' => $validated['order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
                'parent_id' => $validated['parent_id'] ?? null,
            ]);

            return response()->json($category, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::platformStore error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to create category'], 500);
        }
    }

    /**
     * Platform admin: Update a category
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

            $category = HelpCenterCategory::whereNull('deleted_at')->find($id);

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'slug' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'icon' => 'nullable|string|max:100',
                'color' => 'nullable|string|max:50',
                'order' => 'nullable|integer|min:0',
                'is_active' => 'nullable|boolean',
                'parent_id' => 'nullable|uuid|exists:help_center_categories,id',
                // organization_id removed - all categories are global now
            ]);

            // Validate parent is global
            if (!empty($validated['parent_id']) && $validated['parent_id'] !== $category->parent_id) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->whereNull('organization_id') // Only global categories
                    ->whereNull('deleted_at')
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
                // Prevent circular reference
                if ($validated['parent_id'] === $id) {
                    return response()->json(['error' => 'Category cannot be its own parent'], 422);
                }
            }

            // Ensure organization_id is not updated (always NULL for global categories)
            unset($validated['organization_id']);

            $category->update($validated);

            return response()->json($category);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['error' => 'Validation failed', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::platformUpdate error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to update category'], 500);
        }
    }

    /**
     * Platform admin: Delete a category
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

            $category = HelpCenterCategory::whereNull('deleted_at')->find($id);

            if (!$category) {
                return response()->json(['error' => 'Category not found'], 404);
            }

            // Check if category has articles
            $hasArticles = $category->articles()->whereNull('deleted_at')->exists();
            if ($hasArticles) {
                return response()->json(['error' => 'This category has articles and cannot be deleted'], 409);
            }

            // Check if category has children
            $hasChildren = $category->children()->whereNull('deleted_at')->exists();
            if ($hasChildren) {
                return response()->json(['error' => 'This category has subcategories and cannot be deleted'], 409);
            }

            $category->delete();

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error('HelpCenterCategoryController::platformDestroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to delete category'], 500);
        }
    }
}
