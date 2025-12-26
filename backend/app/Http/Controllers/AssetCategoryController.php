<?php

namespace App\Http\Controllers;

use App\Models\AssetCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssetCategoryController extends Controller
{
    /**
     * Display a listing of asset categories
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('asset_categories.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // Allow if permission doesn't exist yet (during migration/seeding)
            Log::info("Permission check for asset_categories.read: " . $e->getMessage() . " - Allowing access during migration");
        }

        $query = AssetCategory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Filter by organization_id if provided
        // Client-provided organization_id is ignored; organization is derived from profile.

        $categories = $query->orderBy('display_order')->orderBy('name')->get();

        return response()->json($categories);
    }

    /**
     * Display the specified asset category
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('asset_categories.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::info("Permission check for asset_categories.read: " . $e->getMessage() . " - Allowing access during migration");
        }

        $category = AssetCategory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        return response()->json($category);
    }

    /**
     * Store a newly created asset category
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $request->validate([
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
            if (!$user->hasPermissionTo('asset_categories.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::info("Permission check for asset_categories.create: " . $e->getMessage() . " - Allowing access during migration");
        }

        $organizationId = $profile->organization_id;

        // Validate code uniqueness if provided
        if ($request->has('code') && $request->code) {
            $existing = AssetCategory::where('code', $request->code)
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Category code already exists'], 422);
            }
        }

        $category = AssetCategory::create([
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
            'name' => $request->name,
            'code' => $request->code ?? null,
            'description' => $request->description ?? null,
            'is_active' => $request->is_active ?? true,
            'display_order' => $request->display_order ?? 0,
        ]);

        return response()->json($category, 201);
    }

    /**
     * Update the specified asset category
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $category = AssetCategory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('asset_categories.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::info("Permission check for asset_categories.update: " . $e->getMessage() . " - Allowing access during migration");
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
            $existing = AssetCategory::where('code', $request->code)
                ->where('organization_id', $category->organization_id)
                ->where('school_id', $currentSchoolId)
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
     * Remove the specified asset category (soft delete)
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $category = AssetCategory::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$category) {
            return response()->json(['error' => 'Category not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('asset_categories.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::info("Permission check for asset_categories.delete: " . $e->getMessage() . " - Allowing access during migration");
        }

        // Check if any assets are using this category
        $assetsCount = DB::table('assets')
            ->where('category_id', $id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->count();

        // If assets are using this category, set their category_id to null before deletion
        if ($assetsCount > 0) {
            DB::table('assets')
                ->where('category_id', $id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->update(['category_id' => null]);
        }

        // Soft delete using SoftDeletes trait
        $category->delete();

        return response()->noContent();
    }
}
