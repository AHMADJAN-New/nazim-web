<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteMedia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteMediaController extends Controller
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

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($media);
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
            'type' => 'required|string|max:30',
            'file_path' => 'required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media = WebsiteMedia::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($media, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'type' => 'sometimes|required|string|max:30',
            'file_path' => 'sometimes|required|string',
            'file_name' => 'nullable|string|max:255',
            'alt_text' => 'nullable|string|max:255',
            'metadata' => 'array|nullable',
        ]);

        $media->fill($data);
        $media->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($media);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $media = WebsiteMedia::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $media->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
    }
}
