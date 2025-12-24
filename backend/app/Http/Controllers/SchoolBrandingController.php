<?php

namespace App\Http\Controllers;

use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SchoolBrandingController extends Controller
{
    /**
     * Display a listing of schools
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

        // Check permission: school_branding.read (all users)
        try {
            if (!$user->hasPermissionTo('school_branding.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Permission check failed for school_branding.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (empty($orgIds)) {
            return response()->json([]);
        }

        // Get accessible school IDs based on permission and default_school_id
        $schoolIds = $this->getAccessibleSchoolIds($profile);

        if (empty($schoolIds)) {
            return response()->json([]);
        }

        $query = SchoolBranding::whereNull('deleted_at')
            ->whereIn('id', $schoolIds);

        // Filter by organization_id if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        // Filter by is_active if provided
        if ($request->has('is_active') && $request->is_active !== null) {
            $query->where('is_active', $request->is_active);
        }

        $schools = $query->orderBy('created_at', 'desc')->get();

        return response()->json($schools);
    }

    /**
     * Display the specified school
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

        // Check permission: school_branding.read (all users)
        try {
            if (!$user->hasPermissionTo('school_branding.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Permission check failed for school_branding.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $school = SchoolBranding::whereNull('deleted_at')->find($id);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Check organization access (user's organization only)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'School not found'], 404);
        }

        return response()->json($school);
    }

    /**
     * Store a newly created school
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

        // Check permission: school_branding.create (all users)
        try {
            if (!$user->hasPermissionTo('school_branding.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Permission check failed for school_branding.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $request->validate([
            'organization_id' => 'required|uuid|exists:organizations,id',
            'school_name' => 'required|string|max:255',
            'school_name_arabic' => 'nullable|string|max:255',
            'school_name_pashto' => 'nullable|string|max:255',
            'school_address' => 'nullable|string',
            'school_phone' => 'nullable|string|max:50',
            'school_email' => 'nullable|email|max:100',
            'school_website' => 'nullable|url|max:200',
            'logo_path' => 'nullable|string',
            'header_image_path' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
            'accent_color' => 'nullable|string|max:7',
            'font_family' => 'nullable|string|max:100',
            'report_font_size' => 'nullable|string|max:10',
            'primary_logo_binary' => 'nullable|string', // Base64 encoded
            'primary_logo_mime_type' => 'nullable|string|max:100',
            'primary_logo_filename' => 'nullable|string|max:255',
            'primary_logo_size' => 'nullable|integer',
            'secondary_logo_binary' => 'nullable|string', // Base64 encoded
            'secondary_logo_mime_type' => 'nullable|string|max:100',
            'secondary_logo_filename' => 'nullable|string|max:255',
            'secondary_logo_size' => 'nullable|integer',
            'ministry_logo_binary' => 'nullable|string', // Base64 encoded
            'ministry_logo_mime_type' => 'nullable|string|max:100',
            'ministry_logo_filename' => 'nullable|string|max:255',
            'ministry_logo_size' => 'nullable|integer',
            'primary_logo_usage' => 'nullable|string|max:100',
            'secondary_logo_usage' => 'nullable|string|max:100',
            'ministry_logo_usage' => 'nullable|string|max:100',
            'header_text' => 'nullable|string',
            'table_alternating_colors' => 'nullable|boolean',
            'show_page_numbers' => 'nullable|boolean',
            'show_generation_date' => 'nullable|boolean',
            'report_logo_selection' => 'nullable|string|max:50',
            'calendar_preference' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Validate organization access
        if (!in_array($request->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot create school for a non-accessible organization'], 403);
        }

        // Convert base64 logo strings to binary for database storage
        $createData = [
            'organization_id' => $request->organization_id,
            'school_name' => $request->school_name,
            'school_name_arabic' => $request->school_name_arabic ?? null,
            'school_name_pashto' => $request->school_name_pashto ?? null,
            'school_address' => $request->school_address ?? null,
            'school_phone' => $request->school_phone ?? null,
            'school_email' => $request->school_email ?? null,
            'school_website' => $request->school_website ?? null,
            'logo_path' => $request->logo_path ?? null,
            'header_image_path' => $request->header_image_path ?? null,
            'footer_text' => $request->footer_text ?? null,
            'primary_color' => $request->primary_color ?? '#0b0b56',
            'secondary_color' => $request->secondary_color ?? '#0056b3',
            'accent_color' => $request->accent_color ?? '#ff6b35',
            'font_family' => $request->font_family ?? 'Bahij Nassim',
            'report_font_size' => $request->report_font_size ?? '12px',
            'primary_logo_mime_type' => $request->primary_logo_mime_type ?? null,
            'primary_logo_filename' => $request->primary_logo_filename ?? null,
            'primary_logo_size' => $request->primary_logo_size ?? null,
            'secondary_logo_mime_type' => $request->secondary_logo_mime_type ?? null,
            'secondary_logo_filename' => $request->secondary_logo_filename ?? null,
            'secondary_logo_size' => $request->secondary_logo_size ?? null,
            'ministry_logo_mime_type' => $request->ministry_logo_mime_type ?? null,
            'ministry_logo_filename' => $request->ministry_logo_filename ?? null,
            'ministry_logo_size' => $request->ministry_logo_size ?? null,
            'primary_logo_usage' => $request->primary_logo_usage ?? 'reports',
            'secondary_logo_usage' => $request->secondary_logo_usage ?? 'certificates',
            'ministry_logo_usage' => $request->ministry_logo_usage ?? 'official_documents',
            'header_text' => $request->header_text ?? null,
            'table_alternating_colors' => $request->table_alternating_colors ?? true,
            'show_page_numbers' => $request->show_page_numbers ?? true,
            'show_generation_date' => $request->show_generation_date ?? true,
            'report_logo_selection' => $request->report_logo_selection ?? 'primary,secondary',
            'show_primary_logo' => $request->show_primary_logo ?? true,
            'show_secondary_logo' => $request->show_secondary_logo ?? false,
            'show_ministry_logo' => $request->show_ministry_logo ?? false,
            'primary_logo_position' => $request->primary_logo_position ?? 'left',
            'secondary_logo_position' => $request->secondary_logo_position ?? null,
            'ministry_logo_position' => $request->ministry_logo_position ?? null,
            'calendar_preference' => $request->calendar_preference ?? 'jalali',
            'is_active' => $request->is_active ?? true,
        ];

        // Create school first without binary data
        $school = SchoolBranding::create($createData);

        // Handle binary logo data separately using DB::update() for PostgreSQL BYTEA
        $binaryUpdates = [];
        
        if ($request->has('primary_logo_binary') && $request->primary_logo_binary) {
            try {
                $primaryLogoBinary = base64_decode($request->primary_logo_binary, true);
                if ($primaryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for primary logo'], 400);
                }
                $binaryUpdates['primary_logo_binary'] = DB::raw("'\\x" . bin2hex($primaryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding primary logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode primary logo: ' . $e->getMessage()], 400);
            }
        }

        if ($request->has('secondary_logo_binary') && $request->secondary_logo_binary) {
            try {
                $secondaryLogoBinary = base64_decode($request->secondary_logo_binary, true);
                if ($secondaryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for secondary logo'], 400);
                }
                $binaryUpdates['secondary_logo_binary'] = DB::raw("'\\x" . bin2hex($secondaryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding secondary logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode secondary logo: ' . $e->getMessage()], 400);
            }
        }

        if ($request->has('ministry_logo_binary') && $request->ministry_logo_binary) {
            try {
                $ministryLogoBinary = base64_decode($request->ministry_logo_binary, true);
                if ($ministryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for ministry logo'], 400);
                }
                $binaryUpdates['ministry_logo_binary'] = DB::raw("'\\x" . bin2hex($ministryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding ministry logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode ministry logo: ' . $e->getMessage()], 400);
            }
        }

        // Update binary fields if any
        if (!empty($binaryUpdates)) {
            DB::table('school_branding')
                ->where('id', $school->id)
                ->update($binaryUpdates);
            
            // Refresh the model to get updated data
            $school->refresh();
            
            // Clear branding cache so reports use updated logos
            try {
                $brandingCache = app(\App\Services\Reports\BrandingCacheService::class);
                $brandingCache->clearBrandingCache($school->id);
            } catch (\Exception $e) {
                \Log::warning("Failed to clear branding cache: " . $e->getMessage());
            }
        }

        return response()->json($school, 201);
    }

    /**
     * Update the specified school
     */
    public function update(Request $request, string $id)
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

        // Check permission: school_branding.update (all users)
        try {
            if (!$user->hasPermissionTo('school_branding.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Permission check failed for school_branding.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $school = SchoolBranding::whereNull('deleted_at')->find($id);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Check organization access (user's organization only)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update school from different organization'], 403);
        }

        $request->validate([
            'school_name' => 'sometimes|string|max:255',
            'school_name_arabic' => 'nullable|string|max:255',
            'school_name_pashto' => 'nullable|string|max:255',
            'school_address' => 'nullable|string',
            'school_phone' => 'nullable|string|max:50',
            'school_email' => 'nullable|email|max:100',
            'school_website' => 'nullable|url|max:200',
            'logo_path' => 'nullable|string',
            'header_image_path' => 'nullable|string',
            'footer_text' => 'nullable|string',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
            'accent_color' => 'nullable|string|max:7',
            'font_family' => 'nullable|string|max:100',
            'report_font_size' => 'nullable|string|max:10',
            'primary_logo_binary' => 'nullable|string', // Base64 encoded
            'primary_logo_mime_type' => 'nullable|string|max:100',
            'primary_logo_filename' => 'nullable|string|max:255',
            'primary_logo_size' => 'nullable|integer',
            'secondary_logo_binary' => 'nullable|string', // Base64 encoded
            'secondary_logo_mime_type' => 'nullable|string|max:100',
            'secondary_logo_filename' => 'nullable|string|max:255',
            'secondary_logo_size' => 'nullable|integer',
            'ministry_logo_binary' => 'nullable|string', // Base64 encoded
            'ministry_logo_mime_type' => 'nullable|string|max:100',
            'ministry_logo_filename' => 'nullable|string|max:255',
            'ministry_logo_size' => 'nullable|integer',
            'primary_logo_usage' => 'nullable|string|max:100',
            'secondary_logo_usage' => 'nullable|string|max:100',
            'ministry_logo_usage' => 'nullable|string|max:100',
            'header_text' => 'nullable|string',
            'table_alternating_colors' => 'nullable|boolean',
            'show_page_numbers' => 'nullable|boolean',
            'show_generation_date' => 'nullable|boolean',
            'report_logo_selection' => 'nullable|string|max:50',
            'calendar_preference' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        // Prepare update data - only include fields that are present in the request
        // This prevents setting fields to null if they're not in the request
        $updateData = [];
        
        // Only update fields that are explicitly provided in the request
        $fieldsToUpdate = [
            'school_name',
            'school_name_arabic',
            'school_name_pashto',
            'school_address',
            'school_phone',
            'school_email',
            'school_website',
            'logo_path',
            'header_image_path',
            'footer_text',
            'primary_color',
            'secondary_color',
            'accent_color',
            'font_family',
            'report_font_size',
            'primary_logo_mime_type',
            'primary_logo_filename',
            'primary_logo_size',
            'secondary_logo_mime_type',
            'secondary_logo_filename',
            'secondary_logo_size',
            'ministry_logo_mime_type',
            'ministry_logo_filename',
            'ministry_logo_size',
            'primary_logo_usage',
            'secondary_logo_usage',
            'ministry_logo_usage',
            'header_text',
            'table_alternating_colors',
            'show_page_numbers',
            'show_generation_date',
            'report_logo_selection',
            'show_primary_logo',
            'show_secondary_logo',
            'show_ministry_logo',
            'primary_logo_position',
            'secondary_logo_position',
            'ministry_logo_position',
            'calendar_preference',
            'is_active',
        ];
        
        // Define nullable fields that can be set to null
        $nullableFields = [
            'school_name_arabic',
            'school_name_pashto',
            'school_address',
            'school_phone',
            'school_email',
            'school_website',
            'header_text',
            'secondary_logo_position',
            'ministry_logo_position',
            'logo_path',
            'header_image_path',
            'footer_text',
        ];
        
        foreach ($fieldsToUpdate as $field) {
            if ($request->has($field)) {
                $value = $request->input($field);
                
                // Special handling for color fields: convert empty strings to defaults
                if (in_array($field, ['primary_color', 'secondary_color', 'accent_color'])) {
                    if (empty($value) || trim($value) === '') {
                        // Use defaults for empty color values
                        $defaults = [
                            'primary_color' => '#0b0b56',
                            'secondary_color' => '#0056b3',
                            'accent_color' => '#ff6b35',
                        ];
                        $value = $defaults[$field];
                    }
                }
                
                // Include the value if:
                // 1. It's not null, OR
                // 2. It's a nullable field (can be explicitly set to null)
                if ($value !== null || in_array($field, $nullableFields)) {
                    $updateData[$field] = $value;
                }
            }
        }
        
        // Special handling for logo metadata: only update if new logo binary is being uploaded
        // This prevents clearing metadata when only other fields are updated
        if (!$request->has('primary_logo_binary') || !$request->primary_logo_binary) {
            // No new primary logo, so don't update its metadata
            unset($updateData['primary_logo_mime_type']);
            unset($updateData['primary_logo_filename']);
            unset($updateData['primary_logo_size']);
        }
        
        if (!$request->has('secondary_logo_binary') || !$request->secondary_logo_binary) {
            // No new secondary logo, so don't update its metadata
            unset($updateData['secondary_logo_mime_type']);
            unset($updateData['secondary_logo_filename']);
            unset($updateData['secondary_logo_size']);
        }
        
        if (!$request->has('ministry_logo_binary') || !$request->ministry_logo_binary) {
            // No new ministry logo, so don't update its metadata
            unset($updateData['ministry_logo_mime_type']);
            unset($updateData['ministry_logo_filename']);
            unset($updateData['ministry_logo_size']);
        }

        // Update non-binary fields first (only fields that were provided)
        if (!empty($updateData)) {
            $school->update($updateData);
        }

        // Handle binary logo data separately using DB::update() for PostgreSQL BYTEA
        $binaryUpdates = [];
        
        if ($request->has('primary_logo_binary') && $request->primary_logo_binary) {
            try {
                $primaryLogoBinary = base64_decode($request->primary_logo_binary, true);
                if ($primaryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for primary logo'], 400);
                }
                $binaryUpdates['primary_logo_binary'] = DB::raw("'\\x" . bin2hex($primaryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding primary logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode primary logo: ' . $e->getMessage()], 400);
            }
        }

        if ($request->has('secondary_logo_binary') && $request->secondary_logo_binary) {
            try {
                $secondaryLogoBinary = base64_decode($request->secondary_logo_binary, true);
                if ($secondaryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for secondary logo'], 400);
                }
                $binaryUpdates['secondary_logo_binary'] = DB::raw("'\\x" . bin2hex($secondaryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding secondary logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode secondary logo: ' . $e->getMessage()], 400);
            }
        }

        if ($request->has('ministry_logo_binary') && $request->ministry_logo_binary) {
            try {
                $ministryLogoBinary = base64_decode($request->ministry_logo_binary, true);
                if ($ministryLogoBinary === false) {
                    return response()->json(['error' => 'Invalid base64 encoding for ministry logo'], 400);
                }
                $binaryUpdates['ministry_logo_binary'] = DB::raw("'\\x" . bin2hex($ministryLogoBinary) . "'::bytea");
            } catch (\Exception $e) {
                \Log::error("Error decoding ministry logo: " . $e->getMessage());
                return response()->json(['error' => 'Failed to decode ministry logo: ' . $e->getMessage()], 400);
            }
        }

        // Update binary fields if any
        if (!empty($binaryUpdates)) {
            DB::table('school_branding')
                ->where('id', $school->id)
                ->update($binaryUpdates);
            
            // Refresh the model to get updated data
            $school->refresh();
            
            // Clear branding cache so reports use updated logos
            try {
                $brandingCache = app(\App\Services\Reports\BrandingCacheService::class);
                $brandingCache->clearBrandingCache($school->id);
            } catch (\Exception $e) {
                \Log::warning("Failed to clear branding cache: " . $e->getMessage());
            }
        }

        return response()->json($school);
    }

    /**
     * Remove the specified school (soft delete)
     */
    public function destroy(string $id)
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

        // Check permission: school_branding.delete (all users)
        try {
            if (!$user->hasPermissionTo('school_branding.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning("Permission check failed for school_branding.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $school = SchoolBranding::whereNull('deleted_at')->find($id);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Check organization access (user's organization only)
        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete school from different organization'], 403);
        }

        // Check if school is in use (e.g., by buildings, rooms, students, etc.)
        $inUse = DB::table('buildings')
            ->where('school_id', $id)
            ->whereNull('deleted_at')
            ->exists();

        if ($inUse) {
            return response()->json(['error' => 'This school is in use and cannot be deleted'], 409);
        }

        // Soft delete
        $school->delete();

        // CRITICAL: Return 204 No Content with NO body (not JSON)
        return response()->noContent();
    }
}



