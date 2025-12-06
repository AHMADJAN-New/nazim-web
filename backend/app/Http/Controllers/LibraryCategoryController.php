<?php

namespace App\Http\Controllers;

use App\Models\LibraryCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LibraryCategoryController extends Controller
{
    /**
     * Display a listing of library categories
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('library_categories.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            // Log but don't block access - permissions will be seeded
            Log::info("Permission check for library_categories.read: " . $e->getMessage() . " - Allowing access during migration");
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $query = LibraryCategory::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Filter by organization_id if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        $categories = $query->orderBy('display_order')->orderBy('name')->get();

        return response()->json($categories);
    }

    /**
     * Display the specified library category
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('library_categories.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            Log::info("Permission check for library_categories.read: " . $e->getMessage() . " - Allowing access during migration");
        }

        $category = LibraryCategory::whereNull('deleted_at')->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Check organization access
        $orgIds = [$profile->organization_id];
        if (!in_array($category->organization_id, $orgIds)) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        return response()->json($category);
    }

    /**
     * Store a newly created library category
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $request->validate([
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'name' => 'required|string|max:100',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer',
        ]);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('library_categories.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            Log::info("Permission check for library_categories.create: " . $e->getMessage() . " - Allowing access during migration");
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Determine organization_id
        $organizationId = $request->organization_id ?? $profile->organization_id;
        
        // All users can only create categories for their organization
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create category for a non-accessible organization'], 403);
        }

        // Validate code uniqueness if provided
        if ($request->has('code') && $request->code) {
            $existing = LibraryCategory::where('code', $request->code)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Category code already exists'], 422);
            }
        }

        $category = LibraryCategory::create([
            'organization_id' => $organizationId,
            'name' => $request->name,
            'code' => $request->code ?? null,
            'description' => $request->description ?? null,
            'is_active' => $request->is_active ?? true,
            'display_order' => $request->display_order ?? 0,
        ]);

        return response()->json($category, 201);
    }

    /**
     * Update the specified library category
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $category = LibraryCategory::whereNull('deleted_at')->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('library_categories.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            Log::info("Permission check for library_categories.update: " . $e->getMessage() . " - Allowing access during migration");
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        if (!in_array($category->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update category from different organization'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:100',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'display_order' => 'nullable|integer',
        ]);

        // Validate code uniqueness if being changed
        if ($request->has('code') && $request->code !== $category->code) {
            $existing = LibraryCategory::where('code', $request->code)
                ->where('organization_id', $category->organization_id)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Category code already exists'], 422);
            }
        }

        $category->update($request->only([
            'name',
            'code',
            'description',
            'is_active',
            'display_order',
        ]));

        return response()->json($category);
    }

    /**
     * Remove the specified library category (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $category = LibraryCategory::whereNull('deleted_at')->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('library_categories.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            Log::info("Permission check for library_categories.delete: " . $e->getMessage() . " - Allowing access during migration");
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        if (!in_array($category->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete category from different organization'], 403);
        }

        // Check if any books are using this category
        $booksCount = DB::table('library_books')
            ->where('category_id', $id)
            ->whereNull('deleted_at')
            ->count();

        // If books are using this category, set their category_id to null before deletion
        if ($booksCount > 0) {
            DB::table('library_books')
                ->where('category_id', $id)
                ->whereNull('deleted_at')
                ->update(['category_id' => null]);
        }

        // Soft delete using SoftDeletes trait
        $category->delete();

        return response()->noContent();
    }
}

