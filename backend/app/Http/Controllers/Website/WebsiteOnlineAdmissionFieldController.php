<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\OnlineAdmissionField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class WebsiteOnlineAdmissionFieldController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $fields = OnlineAdmissionField::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->orderBy('sort_order')
            ->get();

        return response()->json($fields);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $data = $request->validate([
            'key' => 'required|string|max:50',
            'label' => 'required|string|max:100',
            'field_type' => 'required|in:text,textarea,phone,number,select,multiselect,date,toggle,email,id_number,address,photo,file',
            'is_required' => 'boolean',
            'is_enabled' => 'boolean',
            'sort_order' => 'integer|min:0',
            'placeholder' => 'nullable|string|max:255',
            'help_text' => 'nullable|string|max:255',
            'validation_rules' => 'nullable|array',
            'options' => 'nullable|array',
        ]);

        $field = OnlineAdmissionField::create(array_merge($data, [
            'organization_id' => $profile->organization_id,
            'school_id' => $schoolId,
        ]));

        $this->clearPublicFieldCache($profile->organization_id, $schoolId);

        return response()->json($field, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $field = OnlineAdmissionField::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->findOrFail($id);

        $data = $request->validate([
            'key' => 'sometimes|required|string|max:50',
            'label' => 'sometimes|required|string|max:100',
            'field_type' => 'sometimes|required|in:text,textarea,phone,number,select,multiselect,date,toggle,email,id_number,address,photo,file',
            'is_required' => 'boolean',
            'is_enabled' => 'boolean',
            'sort_order' => 'integer|min:0',
            'placeholder' => 'nullable|string|max:255',
            'help_text' => 'nullable|string|max:255',
            'validation_rules' => 'nullable|array',
            'options' => 'nullable|array',
        ]);

        $field->fill($data);
        $field->save();

        $this->clearPublicFieldCache($profile->organization_id, $schoolId);

        return response()->json($field);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('website_settings.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for website_settings.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $field = OnlineAdmissionField::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->findOrFail($id);

        $field->delete();

        $this->clearPublicFieldCache($profile->organization_id, $schoolId);

        return response()->noContent();
    }

    private function clearPublicFieldCache(string $organizationId, string $schoolId): void
    {
        Cache::forget("public-admission-fields:{$organizationId}:{$schoolId}");
    }
}
