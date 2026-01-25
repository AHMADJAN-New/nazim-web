<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteGraduate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class WebsiteGraduatesController extends Controller
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

        // 1. Fetch manual graduates (CMS)
        $manualGraduates = WebsiteGraduate::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('status', 'published') // Only published manual ones
            ->get()
            ->map(function ($grad) {
                $grad->source = 'manual';
                return $grad;
            });

        // 2. Fetch automated graduates (Certificates)
        // Only valid (non-revoked) certificates that are linked to a batch
        $automatedGraduates = \App\Models\IssuedCertificate::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->whereNull('revoked_at')
            ->whereNotNull('batch_id')
            ->with(['student', 'batch.class'])
            ->get()
            ->map(function ($cert) {
                // Ensure we have student and batch info
                if (!$cert->student || !$cert->batch) return null;
                
                // Map to WebsiteGraduate structure
                // Note: We create a stdClass or array, but frontend expects objects similar to WebsiteGraduate model
                // so we can instantiate the model but not save it.
                $grad = new WebsiteGraduate();
                $grad->id = 'cert_' . $cert->id; // Unique ID prefix
                $grad->organization_id = $cert->organization_id;
                $grad->school_id = $cert->school_id;
                
                // Name from Student
                $grad->name = $cert->student->full_name;
                
                // Year from Graduation Batch Date
                $grad->graduation_year = $cert->batch->graduation_date ? $cert->batch->graduation_date->year : null;
                
                // Program from Class Name (e.g. "Hifz Class")
                $grad->program = $cert->batch->class ? $cert->batch->class->name : null;
                
                // Photo from Student
                $grad->photo_path = $cert->student->picture_path;
                
                // Bio is empty for automated
                $grad->bio = null;
                
                // Automated ones are not featured by default
                $grad->is_featured = false;
                $grad->sort_order = 0;
                $grad->status = 'published';
                $grad->source = 'automated';
                
                return $grad;
            })
            ->filter(); // Remove nulls

        // 3. Merge and Sort
        $allGraduates = $manualGraduates->concat($automatedGraduates)
            ->sortBy([
                ['graduation_year', 'desc'],
                ['name', 'asc'],
            ])
            ->values();

        return response()->json($allGraduates);
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
            'graduation_year' => 'nullable|integer|min:1900|max:2100',
            'program' => 'nullable|string|max:200',
            'photo_path' => 'nullable|string',
            'bio' => 'nullable|string',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $graduate = WebsiteGraduate::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
            'created_by' => $user->id,
        ]));

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($graduate, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $graduate = WebsiteGraduate::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:200',
            'graduation_year' => 'nullable|integer|min:1900|max:2100',
            'program' => 'nullable|string|max:200',
            'photo_path' => 'nullable|string',
            'bio' => 'nullable|string',
            'is_featured' => 'boolean',
            'sort_order' => 'integer',
            'status' => 'in:draft,published',
        ]);

        $graduate->fill(array_merge($data, ['updated_by' => $user->id]));
        $graduate->save();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json($graduate);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $graduate = WebsiteGraduate::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $graduate->delete();

        $this->clearPublicCaches($profile->organization_id, $schoolId);

        return response()->json(['status' => 'deleted']);
    }

    private function clearPublicCaches(string $organizationId, string $schoolId): void
    {
        foreach (self::PUBLIC_LANGUAGES as $lang) {
            Cache::forget("public-site:{$organizationId}:{$schoolId}:{$lang}");
        }
        Cache::forget("public-graduates:{$organizationId}:{$schoolId}");
    }
}
