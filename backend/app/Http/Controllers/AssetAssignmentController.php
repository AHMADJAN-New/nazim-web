<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssetAssignmentRequest;
use App\Http\Requests\UpdateAssetAssignmentRequest;
use App\Models\Asset;
use App\Models\AssetAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetAssignmentController extends Controller
{
    public function index(Request $request, string $assetId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $assetId)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetAssignmentController::index - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $assignments = AssetAssignment::where('asset_id', $assetId)
            ->where('organization_id', $profile->organization_id)
            ->orderByDesc('assigned_on')
            ->get();

        return response()->json($assignments);
    }

    public function store(StoreAssetAssignmentRequest $request, string $assetId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $assetId)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetAssignmentController::store - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();

        if (!$this->validateAssignee($data['assigned_to_type'], $data['assigned_to_id'], $profile->organization_id)) {
            return response()->json(['error' => 'Assignee is not valid for this organization'], 422);
        }

        $assignment = AssetAssignment::create([
            'asset_id' => $assetId,
            'organization_id' => $profile->organization_id,
            'assigned_to_type' => $data['assigned_to_type'],
            'assigned_to_id' => $data['assigned_to_id'] ?? null,
            'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
            'expected_return_date' => $data['expected_return_date'] ?? null,
            'status' => 'active',
            'notes' => $data['notes'] ?? null,
        ]);

        $asset->status = 'assigned';
        $asset->save();

        AssetController::recordHistory($asset->id, $profile->organization_id, 'assigned', 'Asset assigned', [
            'assigned_to_type' => $data['assigned_to_type'],
            'assigned_to_id' => $data['assigned_to_id'] ?? null,
            'assigned_by' => $user->id,
        ]);

        return response()->json($assignment->refresh(), 201);
    }

    public function update(UpdateAssetAssignmentRequest $request, string $assignmentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $assignment = AssetAssignment::where('organization_id', $profile->organization_id)
            ->where('id', $assignmentId)
            ->first();

        if (!$assignment) {
            return response()->json(['error' => 'Assignment not found'], 404);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $assignment->asset_id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetAssignmentController::update - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();
        $assignment->fill($data);

        if (!empty($data['status']) && $data['status'] === 'returned' && empty($assignment->returned_on)) {
            $assignment->returned_on = now()->toDateString();
        }

        $assignment->save();

        if (!empty($data['status'])) {
            $asset->status = $data['status'] === 'returned' ? 'available' : $asset->status;
            $asset->save();
        }

        AssetController::recordHistory($asset->id, $profile->organization_id, 'assignment_updated', 'Asset assignment updated', [
            'assignment_id' => $assignment->id,
            'updated_by' => $user->id,
            'status' => $assignment->status,
        ]);

        return response()->json($assignment);
    }

    public function destroy(Request $request, string $assignmentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $assignment = AssetAssignment::where('organization_id', $profile->organization_id)
            ->where('id', $assignmentId)
            ->first();

        if (!$assignment) {
            return response()->json(['error' => 'Assignment not found'], 404);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $assignment->asset_id)
            ->first();

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetAssignmentController::destroy - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $assignment->delete();

        $hasActiveAssignments = AssetAssignment::where('asset_id', $assignment->asset_id)
            ->where('organization_id', $profile->organization_id)
            ->where('status', 'active')
            ->exists();

        if (!$hasActiveAssignments && $asset) {
            $asset->status = 'available';
            $asset->save();
        }

        AssetController::recordHistory($assignment->asset_id, $profile->organization_id, 'assignment_deleted', 'Asset assignment removed', [
            'assignment_id' => $assignment->id,
            'removed_by' => $user->id,
        ]);

        return response()->json(['message' => 'Assignment removed']);
    }

    private function validateAssignee(string $type, ?string $id, string $organizationId): bool
    {
        if ($type === 'other') {
            return true;
        }

        if (!$id) {
            return false;
        }

        if ($type === 'staff') {
            return DB::table('staff')
                ->where('id', $id)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();
        }

        if ($type === 'student') {
            return DB::table('students')
                ->where('id', $id)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();
        }

        if ($type === 'room') {
            $room = DB::table('rooms')->where('id', $id)->whereNull('deleted_at')->first();
            if (!$room) {
                return false;
            }

            return DB::table('school_branding')
                ->where('id', $room->school_id)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();
        }

        return false;
    }
}
