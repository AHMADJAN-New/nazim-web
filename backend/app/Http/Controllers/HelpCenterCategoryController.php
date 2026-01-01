<?php

namespace App\Http\Controllers;

use App\Models\HelpCenterCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HelpCenterCategoryController extends Controller
{
    /**
     * Display a listing of help center categories
     */
    public function index(Request $request)
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

            $query = HelpCenterCategory::whereNull('deleted_at');

            // Apply organization scope (include global + org categories)
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                // Public access: only global categories
                $query->whereNull('organization_id');
            }

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

            $categories = $query->with(['children' => function ($q) use ($organizationId) {
                $q->where('is_active', true);
                if ($organizationId) {
                    $q->forOrganization($organizationId);
                } else {
                    $q->whereNull('organization_id');
                }
                $q->orderBy('order');
            }])
            ->orderBy('order')
            ->orderBy('name')
            ->get();

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
                ->active();

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

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

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
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
            ]);

            // Determine organization_id (allow null for global categories)
            $orgId = $request->input('organization_id', $profile->organization_id);

            // Validate parent belongs to same organization or is global
            if (!empty($validated['parent_id'])) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
            }

            $category = HelpCenterCategory::create([
                'organization_id' => $orgId,
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
                ->active();

            // Apply organization scope
            if ($organizationId) {
                $query->forOrganization($organizationId);
            } else {
                $query->whereNull('organization_id');
            }

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

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
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

            $query = HelpCenterCategory::whereNull('deleted_at');

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            // Validate parent belongs to same organization or is global
            if (!empty($validated['parent_id']) && $validated['parent_id'] !== $category->parent_id) {
                $orgId = $category->organization_id ?? $profile->organization_id;
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
                // Prevent circular reference
                if ($validated['parent_id'] === $id) {
                    return response()->json(['error' => 'Category cannot be its own parent'], 422);
                }
            }

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

            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
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

            $query = HelpCenterCategory::whereNull('deleted_at');

            // Apply organization scope
            if ($profile->organization_id) {
                $query->forOrganization($profile->organization_id);
            } else {
                $query->whereNull('organization_id');
            }

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

            $query = HelpCenterCategory::whereNull('deleted_at');

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

            $categories = $query->with(['children' => function ($q) {
                $q->where('is_active', true)
                  ->orderBy('order');
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
                'organization_id' => 'nullable|uuid|exists:organizations,id',
            ]);

            // Allow null organization_id for global categories
            $orgId = $request->input('organization_id');

            // Validate parent belongs to same organization or is global
            if (!empty($validated['parent_id'])) {
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
            }

            $category = HelpCenterCategory::create([
                'organization_id' => $orgId,
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
                'organization_id' => 'nullable|uuid|exists:organizations,id',
            ]);

            // Validate parent belongs to same organization or is global
            if (!empty($validated['parent_id']) && $validated['parent_id'] !== $category->parent_id) {
                $orgId = $validated['organization_id'] ?? $category->organization_id;
                $parent = HelpCenterCategory::where('id', $validated['parent_id'])
                    ->where(function ($q) use ($orgId) {
                        if ($orgId) {
                            $q->where('organization_id', $orgId)
                                ->orWhereNull('organization_id');
                        } else {
                            $q->whereNull('organization_id');
                        }
                    })
                    ->first();
                if (!$parent) {
                    return response()->json(['error' => 'Parent category not found'], 404);
                }
                // Prevent circular reference
                if ($validated['parent_id'] === $id) {
                    return response()->json(['error' => 'Category cannot be its own parent'], 422);
                }
            }

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
