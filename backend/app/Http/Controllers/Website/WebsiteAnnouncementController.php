<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteAnnouncement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteAnnouncementController extends Controller
{
    private const PUBLIC_LANGUAGES = ['en', 'ps', 'fa', 'ar'];

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $announcements = WebsiteAnnouncement::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('published_at', 'desc')
            ->orderBy('is_pinned', 'desc')
            ->get();

        return response()->json($announcements);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $data = $request->validate([
            'title' => 'required|string|max:200',
            'content' => 'nullable|string',
            'status' => 'required|in:draft,scheduled,published,archived',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_pinned' => 'boolean',
        ]);

        $announcement = WebsiteAnnouncement::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId, $announcement->id);

        return response()->json($announcement, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $announcement = WebsiteAnnouncement::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'content' => 'nullable|string',
            'status' => 'sometimes|required|in:draft,scheduled,published,archived',
            'published_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_pinned' => 'boolean',
        ]);

        $announcement->fill($data);
        $announcement->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId, $announcement->id);

        return response()->json($announcement);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $announcement = WebsiteAnnouncement::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $announcement->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId, $announcement->id);

        return response()->noContent();
    }

    private function clearPublicCaches(string $organizationId, string $schoolId, ?string $announcementId = null): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-announcements:{$organizationId}:{$schoolId}");
        Cache::forget("public-announcements:{$organizationId}:{$schoolId}:1");
        if ($announcementId) {
            Cache::forget("public-announcement:{$organizationId}:{$schoolId}:{$announcementId}");
        }
    }
}
