<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\WebsiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PlatformWebsiteSettingsController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function upsert(Request $request, string $organizationId, string $schoolId)
    {
        // Platform admins use global permissions (no organization team context).
        setPermissionsTeamId(null);

        $organization = Organization::whereNull('deleted_at')->findOrFail($organizationId);

        $school = SchoolBranding::where('organization_id', $organization->id)
            ->where('id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            return response()->json(['error' => 'School not found for organization'], 422);
        }

        $data = $request->validate([
            'school_slug' => [
                'required',
                'string',
                'max:80',
                // Lowercase + hyphenated slug (subdomain-safe)
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
            ],
            'is_public' => 'required|boolean',
            'default_language' => 'nullable|string|max:10',
            'enabled_languages' => 'nullable|array',
            'enabled_languages.*' => 'string|max:10',
            'theme' => 'nullable|array',
        ]);

        $data['school_slug'] = strtolower($data['school_slug']);

        // Enforce global uniqueness across all schools (matches DB unique constraint).
        $slugInUse = WebsiteSetting::where('school_slug', $data['school_slug'])
            ->where('school_id', '!=', $schoolId)
            ->whereNull('deleted_at')
            ->exists();

        if ($slugInUse) {
            return response()->json([
                'error' => 'School slug is already in use',
                'field' => 'school_slug',
            ], 422);
        }

        $setting = WebsiteSetting::updateOrCreate(
            [
                'organization_id' => $organization->id,
                'school_id' => $schoolId,
            ],
            $data
        );

        $this->clearPublicCaches($organization->id, $schoolId);

        return response()->json($setting);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
    }
}

