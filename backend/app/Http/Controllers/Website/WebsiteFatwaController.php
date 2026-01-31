<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteFatwa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsiteFatwaController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $page = (int) $request->query('page', 1);
        $perPage = (int) $request->query('per_page', 25);
        if ($perPage < 1) {
            $perPage = 1;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        $fatwas = WebsiteFatwa::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json($fatwas);
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
            'category_id' => 'nullable|string',
            'slug' => 'required|string|max:200',
            'title' => 'required|string|max:255',
            'question_text' => 'nullable|string',
            'answer_text' => 'nullable|string',
            'references_json' => 'array|nullable',
            'status' => 'required|string|max:30',
            'published_at' => 'nullable|date',
            'is_featured' => 'boolean',
        ]);

        $fatwa = WebsiteFatwa::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]));

        return response()->json($fatwa, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $fatwa = WebsiteFatwa::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'category_id' => 'nullable|string',
            'slug' => 'sometimes|required|string|max:200',
            'title' => 'sometimes|required|string|max:255',
            'question_text' => 'nullable|string',
            'answer_text' => 'nullable|string',
            'references_json' => 'array|nullable',
            'status' => 'sometimes|required|string|max:30',
            'published_at' => 'nullable|date',
            'is_featured' => 'boolean',
        ]);

        $fatwa->fill($data);
        $fatwa->updated_by = $user->id;
        $fatwa->save();

        return response()->json($fatwa);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $fatwa = WebsiteFatwa::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $fatwa->delete();

        return response()->json(['status' => 'deleted']);
    }
}
