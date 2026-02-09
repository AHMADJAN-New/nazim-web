<?php

namespace App\Http\Controllers;

use App\Models\SchoolAdmissionRules;
use App\Models\SchoolBranding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SchoolAdmissionRulesController extends Controller
{
    /**
     * Display admission rules for a specific school
     */
    public function show(string $schoolId)
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

        // Check permission: school_branding.read
        try {
            if (!$this->userHasPermission($user, 'school_branding.read', $profile->organization_id)) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify school exists and belongs to user's organization
        $school = SchoolBranding::whereNull('deleted_at')->find($schoolId);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Get admission rules for this school
        $rules = SchoolAdmissionRules::where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$rules) {
            return response()->json(['error' => 'Admission rules not found'], 404);
        }

        $labels = $rules->labels ?? [];
        $mergedLabels = array_merge(SchoolAdmissionRules::defaultLabels(), $labels);

        return response()->json([
            'commitment_items' => $rules->commitment_items ?? [],
            'guarantee_text' => $rules->guarantee_text ?? '',
            'labels' => $mergedLabels,
        ]);
    }

    /**
     * Update admission rules for a specific school
     */
    public function update(Request $request, string $schoolId)
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

        // Check permission: school_branding.update
        try {
            if (!$user->hasPermissionTo('school_branding.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for school_branding.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify school exists and belongs to user's organization
        $school = SchoolBranding::whereNull('deleted_at')->find($schoolId);

        if (!$school) {
            return response()->json(['error' => 'School not found'], 404);
        }

        if ($school->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'School not found'], 404);
        }

        // Validate request
        $validated = $request->validate([
            'commitment_items' => 'required|array',
            'commitment_items.*' => 'required|string|max:1000',
            'guarantee_text' => 'required|string|max:2000',
            'labels' => 'nullable|array',
            'labels.*' => 'nullable|string|max:500',
        ]);

        $updateData = [
            'commitment_items' => $validated['commitment_items'],
            'guarantee_text' => $validated['guarantee_text'],
        ];
        if (array_key_exists('labels', $validated) && $validated['labels'] !== null) {
            $updateData['labels'] = $validated['labels'];
        }

        // Find or create admission rules for this school
        $rules = SchoolAdmissionRules::where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$rules) {
            $updateData['organization_id'] = $school->organization_id;
            $updateData['school_id'] = $schoolId;
            if (empty($updateData['labels'])) {
                $updateData['labels'] = SchoolAdmissionRules::defaultLabels();
            }
            $rules = SchoolAdmissionRules::create($updateData);
        } else {
            $rules->update($updateData);
        }

        $labels = $rules->labels ?? [];
        $mergedLabels = array_merge(SchoolAdmissionRules::defaultLabels(), $labels);

        return response()->json([
            'commitment_items' => $rules->commitment_items,
            'guarantee_text' => $rules->guarantee_text,
            'labels' => $mergedLabels,
        ]);
    }
}
