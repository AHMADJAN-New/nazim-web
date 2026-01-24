<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteSettingsController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function show(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $setting = WebsiteSetting::firstOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $schoolId,
            ],
            [
                'school_slug' => 'school-' . substr($schoolId, 0, 8),
                'default_language' => 'en',
                'enabled_languages' => ['en', 'ar'],
                'theme' => [
                    'primary_color' => '#0b0b56',
                    'secondary_color' => '#0056b3',
                    'accent_color' => '#ff6b35',
                    'font_family' => 'Bahij Nassim',
                ],
                'is_public' => true,
            ]
        );

        return response()->json($setting);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $data = $request->validate([
            'school_slug' => 'required|string|max:80',
            'default_language' => 'required|string|max:10',
            'enabled_languages' => 'array',
            'enabled_languages.*' => 'string|max:10',
            'theme' => 'array|nullable',
            'is_public' => 'boolean',
        ]);

        $setting = WebsiteSetting::updateOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'school_id' => $schoolId,
            ],
            $data
        );

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($setting);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
    }
}
