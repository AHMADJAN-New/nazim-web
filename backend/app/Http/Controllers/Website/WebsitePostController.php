<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsitePost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsitePostController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $posts = WebsitePost::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($posts);
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
            'slug' => 'required|string|max:120',
            'title' => 'required|string|max:200',
            'status' => 'required|string|max:20',
            'excerpt' => 'nullable|string',
            'content_json' => 'array|nullable',
            'seo_title' => 'nullable|string|max:200',
            'seo_description' => 'nullable|string|max:400',
            'seo_image_path' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $post = WebsitePost::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        return response()->json($post, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $post = WebsitePost::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'slug' => 'sometimes|required|string|max:120',
            'title' => 'sometimes|required|string|max:200',
            'status' => 'sometimes|required|string|max:20',
            'excerpt' => 'nullable|string',
            'content_json' => 'array|nullable',
            'seo_title' => 'nullable|string|max:200',
            'seo_description' => 'nullable|string|max:400',
            'seo_image_path' => 'nullable|string',
            'published_at' => 'nullable|date',
        ]);

        $post->fill($data);
        $post->updated_by = $user->id;
        $post->save();

        return response()->json($post);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $post = WebsitePost::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $post->delete();

        return response()->json(['status' => 'deleted']);
    }
}
