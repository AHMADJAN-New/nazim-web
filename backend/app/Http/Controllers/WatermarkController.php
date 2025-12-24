<?php

namespace App\Http\Controllers;

use App\Models\BrandingWatermark;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WatermarkController extends Controller
{
    /**
     * Display a listing of watermarks for a branding
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

        // Check permission: school_branding.read (watermarks are part of branding)
        try {
            if (!$user->hasPermissionTo('school_branding.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'branding_id' => 'required|uuid|exists:school_branding,id',
        ]);

        $brandingId = $request->input('branding_id');

        // Verify branding belongs to user's organization
        $branding = DB::table('school_branding')
            ->where('id', $brandingId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$branding) {
            return response()->json(['error' => 'Branding not found'], 404);
        }

        // Get watermarks for this branding
        // Use toArray() which handles binary conversion automatically (like SchoolBranding)
        $watermarks = BrandingWatermark::where('branding_id', $brandingId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get()
            ->map(function ($watermark) {
                return $watermark->toArray();
            });

        return response()->json($watermarks);
    }

    /**
     * Store a newly created watermark
     */
    public function store(Request $request)
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

        // Check permission: school_branding.update (watermarks are part of branding)
        try {
            if (!$user->hasPermissionTo('school_branding.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'branding_id' => 'required|uuid|exists:school_branding,id',
            'report_key' => 'nullable|string|max:100',
            'wm_type' => 'required|in:text,image',
            'text' => 'nullable|string|max:500',
            'font_family' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'opacity' => 'nullable|numeric|min:0|max:1',
            'rotation_deg' => 'nullable|integer|min:-360|max:360',
            'scale' => 'nullable|numeric|min:0.1|max:5',
            'position' => 'nullable|in:center,top-left,top-right,bottom-left,bottom-right',
            'pos_x' => 'nullable|numeric|min:0|max:100',
            'pos_y' => 'nullable|numeric|min:0|max:100',
            'repeat_pattern' => 'nullable|in:none,repeat,repeat-x,repeat-y',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'image_binary' => 'nullable|string', // Base64 encoded
            'image_mime' => 'nullable|string|max:50',
        ]);

        $brandingId = $validated['branding_id'];

        // Verify branding belongs to user's organization
        $branding = DB::table('school_branding')
            ->where('id', $brandingId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$branding) {
            return response()->json(['error' => 'Branding not found'], 404);
        }

        // Handle image binary if provided
        $imageBinary = null;
        if ($validated['wm_type'] === 'image' && !empty($validated['image_binary'])) {
            $imageBinary = base64_decode($validated['image_binary'], true);
            if ($imageBinary === false) {
                return response()->json(['error' => 'Invalid base64 image data'], 400);
            }
        }

        // Create watermark
        $watermark = BrandingWatermark::create([
            'organization_id' => $profile->organization_id,
            'branding_id' => $brandingId,
            'report_key' => $validated['report_key'] ?? null,
            'wm_type' => $validated['wm_type'],
            'text' => $validated['text'] ?? null,
            'font_family' => $validated['font_family'] ?? null,
            'color' => $validated['color'] ?? '#000000',
            'opacity' => $validated['opacity'] ?? 0.08,
            'rotation_deg' => $validated['rotation_deg'] ?? 35,
            'scale' => $validated['scale'] ?? 1.0,
            'position' => $validated['position'] ?? 'center',
            'pos_x' => $validated['pos_x'] ?? 50.0,
            'pos_y' => $validated['pos_y'] ?? 50.0,
            'repeat_pattern' => $validated['repeat_pattern'] ?? 'none',
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'image_binary' => $imageBinary,
            'image_mime' => $validated['image_mime'] ?? null,
        ]);

        // Clear branding cache
        app(\App\Services\Reports\BrandingCacheService::class)->clearBrandingCache($brandingId);

        // Use toArray() which handles binary conversion automatically (like SchoolBranding)
        return response()->json($watermark->toArray(), 201);
    }

    /**
     * Display the specified watermark
     */
    public function show(string $id)
    {
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
            if (!$user->hasPermissionTo('school_branding.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $watermark = BrandingWatermark::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$watermark) {
            return response()->json(['error' => 'Watermark not found'], 404);
        }

        // Use toArray() which handles binary conversion automatically (like SchoolBranding)
        return response()->json($watermark->toArray());
    }

    /**
     * Update the specified watermark
     */
    public function update(Request $request, string $id)
    {
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
            if (!$user->hasPermissionTo('school_branding.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $watermark = BrandingWatermark::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$watermark) {
            return response()->json(['error' => 'Watermark not found'], 404);
        }

        $validated = $request->validate([
            'report_key' => 'nullable|string|max:100',
            'wm_type' => 'sometimes|in:text,image',
            'text' => 'nullable|string|max:500',
            'font_family' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'opacity' => 'nullable|numeric|min:0|max:1',
            'rotation_deg' => 'nullable|integer|min:-360|max:360',
            'scale' => 'nullable|numeric|min:0.1|max:5',
            'position' => 'nullable|in:center,top-left,top-right,bottom-left,bottom-right',
            'pos_x' => 'nullable|numeric|min:0|max:100',
            'pos_y' => 'nullable|numeric|min:0|max:100',
            'repeat_pattern' => 'nullable|in:none,repeat,repeat-x,repeat-y',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'image_binary' => 'nullable|string', // Base64 encoded
            'image_mime' => 'nullable|string|max:50',
        ]);

        // Handle image binary if provided
        if (isset($validated['image_binary']) && !empty($validated['image_binary'])) {
            $imageBinary = base64_decode($validated['image_binary'], true);
            if ($imageBinary === false) {
                return response()->json(['error' => 'Invalid base64 image data'], 400);
            }
            $validated['image_binary'] = $imageBinary;
        }

        // Update watermark
        try {
            $watermark->update($validated);
        } catch (\Exception $e) {
            Log::error("Failed to update watermark: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update watermark: ' . $e->getMessage()], 500);
        }

        // Clear branding cache
        app(\App\Services\Reports\BrandingCacheService::class)->clearBrandingCache($watermark->branding_id);

        // Reload watermark to get fresh data (without binary to avoid serialization issues)
        $watermark = BrandingWatermark::select([
            'id', 'organization_id', 'branding_id', 'report_key', 'wm_type',
            'text', 'font_family', 'color', 'opacity', 'rotation_deg', 'scale',
            'position', 'pos_x', 'pos_y', 'repeat_pattern', 'sort_order', 'is_active',
            'image_mime', 'created_at', 'updated_at', 'deleted_at'
        ])
        ->where('id', $id)
        ->first();
        
        if (!$watermark) {
            return response()->json(['error' => 'Watermark not found after update'], 404);
        }

        // Build response array manually
        $data = $watermark->toArray();
        
        // Get image data URI separately using DB query (like BrandingCacheService does for logos)
        if ($watermark->wm_type === 'image') {
            try {
                $imageData = DB::selectOne(
                    "SELECT 
                        CASE 
                            WHEN image_binary IS NULL THEN NULL 
                            ELSE encode(image_binary, 'base64') 
                        END as image_base64,
                        image_mime
                    FROM branding_watermarks 
                    WHERE id = ? AND deleted_at IS NULL",
                    [$id]
                );
                
                if ($imageData && !empty($imageData->image_base64)) {
                    $mime = $imageData->image_mime ?? 'image/png';
                    $data['image_data_uri'] = "data:{$mime};base64,{$imageData->image_base64}";
                }
            } catch (\Exception $e) {
                Log::warning("Failed to get image data URI for watermark {$id}: " . $e->getMessage());
            }
        }

        return response()->json($data);
    }

    /**
     * Remove the specified watermark (soft delete)
     */
    public function destroy(string $id)
    {
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
            if (!$user->hasPermissionTo('school_branding.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $watermark = BrandingWatermark::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$watermark) {
            return response()->json(['error' => 'Watermark not found'], 404);
        }

        $brandingId = $watermark->branding_id;

        // Soft delete
        $watermark->delete();

        // Clear branding cache
        app(\App\Services\Reports\BrandingCacheService::class)->clearBrandingCache($brandingId);

        return response()->noContent();
    }
}

