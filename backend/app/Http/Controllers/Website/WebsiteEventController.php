<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteEventController extends Controller
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

        $events = WebsiteEvent::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('starts_at', 'desc')
            ->get();

        return response()->json($events);
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
            'location' => 'nullable|string|max:200',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date',
            'is_public' => 'boolean',
            'summary' => 'nullable|string',
            'content_json' => 'array|nullable',
        ]);

        $event = WebsiteEvent::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($event, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $event = WebsiteEvent::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'location' => 'nullable|string|max:200',
            'starts_at' => 'sometimes|required|date',
            'ends_at' => 'nullable|date',
            'is_public' => 'boolean',
            'summary' => 'nullable|string',
            'content_json' => 'array|nullable',
        ]);

        $event->fill($data);
        $event->updated_by = $user->id;
        $event->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($event);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $event = WebsiteEvent::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $event->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-events:{$organizationId}:{$schoolId}");
    }
}
