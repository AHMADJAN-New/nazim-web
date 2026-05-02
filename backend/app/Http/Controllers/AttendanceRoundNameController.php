<?php

namespace App\Http\Controllers;

use App\Models\AttendanceRoundName;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceRoundNameController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('attendance_sessions.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.read: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $query = AttendanceRoundName::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        $roundNames = $query
            ->orderBy('order_index')
            ->orderBy('name')
            ->get();

        return response()->json($roundNames);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('attendance_sessions.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.create: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'order_index' => 'required|integer|min:1|max:99',
            'is_active' => 'nullable|boolean',
        ]);

        $name = trim($validated['name']);
        if ($name === '') {
            return response()->json(['error' => 'Round name cannot be empty'], 422);
        }

        $nameExists = AttendanceRoundName::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->exists();

        if ($nameExists) {
            return response()->json(['error' => 'Round name already exists for this school'], 422);
        }

        $roundName = AttendanceRoundName::create([
            'organization_id' => $profile->organization_id,
            'school_id' => $currentSchoolId,
            'name' => $name,
            'order_index' => (int) $validated['order_index'],
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
        ]);

        return response()->json($roundName, 201);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('attendance_sessions.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.update: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $roundName = AttendanceRoundName::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (! $roundName) {
            return response()->json(['error' => 'Attendance round name not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'order_index' => 'sometimes|required|integer|min:1|max:99',
            'is_active' => 'sometimes|boolean',
        ]);

        if (array_key_exists('name', $validated)) {
            $name = trim($validated['name']);
            if ($name === '') {
                return response()->json(['error' => 'Round name cannot be empty'], 422);
            }

            $nameExists = AttendanceRoundName::whereNull('deleted_at')
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->where('id', '!=', $roundName->id)
                ->exists();

            if ($nameExists) {
                return response()->json(['error' => 'Round name already exists for this school'], 422);
            }

            $validated['name'] = $name;
        }

        $roundName->update($validated);

        return response()->json($roundName);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (! $user->hasPermissionTo('attendance_sessions.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for attendance_sessions.delete: '.$e->getMessage());

            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $roundName = AttendanceRoundName::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (! $roundName) {
            return response()->json(['error' => 'Attendance round name not found'], 404);
        }

        $isInUse = DB::table('attendance_sessions')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('attendance_round_name_id', $roundName->id)
            ->whereNull('deleted_at')
            ->exists();

        if ($isInUse) {
            return response()->json(['error' => 'This round name is in use and cannot be deleted'], 409);
        }

        $roundName->delete();

        return response()->noContent();
    }
}

