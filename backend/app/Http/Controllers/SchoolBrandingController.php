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

        // Check permission: branding.read (all users)
        if (!$user->hasPermissionTo('branding.read', $profile->organization_id)) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (empty($orgIds)) {
            return response()->json([]);
        }

        $query = SchoolBranding::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

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

        // Check permission: branding.read (all users)
        if (!$user->hasPermissionTo('branding.read', $profile->organization_id)) {
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

        // Check permission: branding.create (all users)
        if (!$user->hasPermissionTo('branding.create', $profile->organization_id)) {
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

        $school = SchoolBranding::create([
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
            'primary_logo_usage' => $request->primary_logo_usage ?? 'reports',
            'secondary_logo_usage' => $request->secondary_logo_usage ?? 'certificates',
            'ministry_logo_usage' => $request->ministry_logo_usage ?? 'official_documents',
            'header_text' => $request->header_text ?? null,
            'table_alternating_colors' => $request->table_alternating_colors ?? true,
            'show_page_numbers' => $request->show_page_numbers ?? true,
            'show_generation_date' => $request->show_generation_date ?? true,
            'report_logo_selection' => $request->report_logo_selection ?? 'primary,secondary',
            'calendar_preference' => $request->calendar_preference ?? 'jalali',
            'is_active' => $request->is_active ?? true,
        ]);

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

        // Check permission: branding.update (all users)
        if (!$user->hasPermissionTo('branding.update', $profile->organization_id)) {
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

        $school->update($request->only([
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
            'primary_logo_usage',
            'secondary_logo_usage',
            'ministry_logo_usage',
            'header_text',
            'table_alternating_colors',
            'show_page_numbers',
            'show_generation_date',
            'report_logo_selection',
            'calendar_preference',
            'is_active',
        ]));

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

        // Check permission: branding.delete (all users)
        if (!$user->hasPermissionTo('branding.delete', $profile->organization_id)) {
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

        // Soft delete
        $school->update(['deleted_at' => now()]);

        return response()->json(['message' => 'School deleted successfully']);
    }
}

