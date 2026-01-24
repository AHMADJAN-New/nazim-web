<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteFatwaQuestion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsiteFatwaQuestionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $questions = WebsiteFatwaQuestion::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('submitted_at', 'desc')
            ->get();

        return response()->json($questions);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $question = WebsiteFatwaQuestion::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        return response()->json($question);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $question = WebsiteFatwaQuestion::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'status' => 'sometimes|required|string|max:30',
            'assigned_to' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'answer_draft' => 'nullable|string',
        ]);

        $question->fill($data);
        $question->save();

        return response()->json($question);
    }
}
