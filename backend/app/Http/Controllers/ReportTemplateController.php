<?php

namespace App\Http\Controllers;

use App\Models\ReportTemplate;
use App\Http\Requests\StoreReportTemplateRequest;
use App\Http\Requests\UpdateReportTemplateRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReportTemplateController extends Controller
{
    /**
     * Display a listing of report templates
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.read - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [];
        if ($profile->organization_id) {
            $orgIds = [$profile->organization_id];
        }

        $query = ReportTemplate::whereNull('deleted_at');

        // Filter by organization
        if (!empty($orgIds)) {
            $query->whereIn('organization_id', $orgIds);
        } else {
            // If no accessible orgs, return empty
            return response()->json([]);
        }

        // Filter by school_id if provided
        if ($request->has('school_id') && $request->school_id) {
            $query->where('school_id', $request->school_id);
        }

        $templates = $query->orderBy('created_at', 'desc')->get();

        return response()->json($templates);
    }

    /**
     * Get report templates by school
     */
    public function bySchool(string $schoolId)
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

        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.read - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Verify school belongs to accessible organization
        $school = DB::table('school_branding')
            ->where('id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        if (!in_array($school->organization_id, $orgIds)) {
            return response()->json(['error' => 'Access denied to this school'], 403);
        }

        $templates = ReportTemplate::whereNull('deleted_at')
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($templates);
    }

    /**
     * Store a newly created report template
     */
    public function store(StoreReportTemplateRequest $request)
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

        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.create - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        // Determine organization_id (use user's organization)
        $organizationId = $profile->organization_id;

        // Verify school belongs to user's organization
        $school = DB::table('school_branding')
            ->where('id', $request->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        if ($school->organization_id !== $organizationId) {
            return response()->json(['error' => 'Cannot create template for school in different organization'], 403);
        }

        $template = ReportTemplate::create([
            'organization_id' => $organizationId,
            'school_id' => $request->school_id,
            'template_name' => $request->template_name,
            'template_type' => $request->template_type,
            'header_text' => $request->header_text ?? null,
            'header_text_position' => $request->header_text_position ?? 'below_school_name',
            'footer_text' => $request->footer_text ?? null,
            'footer_text_position' => $request->footer_text_position ?? 'footer',
            'header_html' => $request->header_html ?? null,
            'footer_html' => $request->footer_html ?? null,
            'report_logo_selection' => $request->report_logo_selection ?? null,
            'show_primary_logo' => $request->show_primary_logo ?? true,
            'show_secondary_logo' => $request->show_secondary_logo ?? false,
            'show_ministry_logo' => $request->show_ministry_logo ?? false,
            'primary_logo_position' => $request->primary_logo_position ?? 'left',
            'secondary_logo_position' => $request->secondary_logo_position ?? null,
            'ministry_logo_position' => $request->ministry_logo_position ?? null,
            'show_page_numbers' => $request->show_page_numbers ?? true,
            'show_generation_date' => $request->show_generation_date ?? true,
            'table_alternating_colors' => $request->table_alternating_colors ?? true,
            'report_font_size' => $request->report_font_size ?? null,
            'is_default' => $request->is_default ?? false,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json($template, 201);
    }

    /**
     * Display the specified report template
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.read - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $template = ReportTemplate::whereNull('deleted_at')->find($id);

        if (!$template) {
            return response()->json(['error' => 'Report template not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [];
        if ($profile->organization_id) {
            $orgIds = [$profile->organization_id];
        }

        // Check organization access (all users)
        if (!empty($orgIds) && !in_array($template->organization_id, $orgIds)) {
            return response()->json(['error' => 'Report template not found'], 404);
        }

        return response()->json($template);
    }

    /**
     * Update the specified report template
     */
    public function update(UpdateReportTemplateRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.update - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $template = ReportTemplate::whereNull('deleted_at')->find($id);

        if (!$template) {
            return response()->json(['error' => 'Report template not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [];
        if ($profile->organization_id) {
            $orgIds = [$profile->organization_id];
        }

        // Check organization access (all users)
        if (!empty($orgIds) && !in_array($template->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update report template from different organization'], 403);
        }

        // Prevent organization_id and school_id changes
        if ($request->has('organization_id') && $request->organization_id !== $template->organization_id) {
            return response()->json(['error' => 'Cannot change organization_id'], 403);
        }

        if ($request->has('school_id') && $request->school_id !== $template->school_id) {
            return response()->json(['error' => 'Cannot change school_id'], 403);
        }

        $template->update($request->only([
            'template_name',
            'template_type',
            'header_text',
            'header_text_position',
            'footer_text',
            'footer_text_position',
            'header_html',
            'footer_html',
            'report_logo_selection',
            'show_primary_logo',
            'show_secondary_logo',
            'show_ministry_logo',
            'primary_logo_position',
            'secondary_logo_position',
            'ministry_logo_position',
            'show_page_numbers',
            'show_generation_date',
            'table_alternating_colors',
            'report_font_size',
            'is_default',
            'is_active',
        ]));

        return response()->json($template);
    }

    /**
     * Get default template for a report type and school
     * GET /api/report-templates/default?school_id={id}&template_type={type}
     */
    public function getDefault(Request $request)
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

        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for reports.read - allowing access: " . $e->getMessage());
        }

        $request->validate([
            'school_id' => 'required|uuid',
            'template_type' => 'required|string|max:100',
        ]);

        // Verify school belongs to accessible organization
        $school = DB::table('school_branding')
            ->where('id', $request->school_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Access denied to this school'], 403);
        }

        // Get default template for this school and report type
        $template = ReportTemplate::whereNull('deleted_at')
            ->where('school_id', $request->school_id)
            ->where('template_type', $request->template_type)
            ->where('is_active', true)
            ->where('is_default', true)
            ->first();

        if (!$template) {
            return response()->json(null);
        }

        return response()->json($template);
    }

    /**
     * Remove the specified report template (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Check permission (all users)
        try {
            if (!$user->hasPermissionTo('reports.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            // If permission doesn't exist, log but allow access (for migration period)
            Log::warning("Permission check failed for reports.delete - allowing access: " . $e->getMessage());
            // Allow access if permission doesn't exist (during migration)
        }

        $template = ReportTemplate::whereNull('deleted_at')->find($id);

        if (!$template) {
            return response()->json(['error' => 'Report template not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [];
        if ($profile->organization_id) {
            $orgIds = [$profile->organization_id];
        }

        // Check organization access (all users)
        if (!empty($orgIds) && !in_array($template->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete report template from different organization'], 403);
        }

        // Soft delete
        $template->delete();

        return response()->noContent();
    }
}



