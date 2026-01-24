<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteFatwaCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsiteFatwaCategoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $categories = WebsiteFatwaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
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
            'name' => 'required|string|max:200',
            'slug' => 'required|string|max:200',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $category = WebsiteFatwaCategory::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
        ]));

        return response()->json($category, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $category = WebsiteFatwaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'slug' => 'sometimes|required|string|max:200',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $category->fill($data);
        $category->save();

        return response()->json($category);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $category = WebsiteFatwaCategory::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $category->delete();

        return response()->json(['status' => 'deleted']);
    }
}
