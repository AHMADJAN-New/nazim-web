<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssetAssignmentRequest;
use App\Http\Requests\UpdateAssetAssignmentRequest;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetCopy;
use App\Services\Notifications\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssetAssignmentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {
    }
    public function index(Request $request, string $assetId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        $query = AssetAssignment::where('asset_id', $assetId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        if (Schema::hasTable('asset_copies') && Schema::hasColumn('asset_assignments', 'asset_copy_id')) {
            $query->with(['assetCopy']);
        }

        $assignments = $query->orderByDesc('assigned_on')->get();

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
            ->where('school_id', $this->getCurrentSchoolId($request))
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        if (!$this->validateAssignee($data['assigned_to_type'], $data['assigned_to_id'], $profile->organization_id, $currentSchoolId)) {
            return response()->json(['error' => 'Assignee is not valid for this organization'], 422);
        }

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasCopyIdColumn = Schema::hasColumn('asset_assignments', 'asset_copy_id');

        if ($hasCopiesTable && $hasCopyIdColumn) {
            // Find an available copy to assign
            $availableCopy = AssetCopy::where('asset_id', $assetId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->where('status', 'available')
                ->whereNull('deleted_at')
                ->first();

            if (!$availableCopy) {
                return response()->json(['error' => 'No available copies to assign'], 422);
            }

            $assignment = AssetAssignment::create([
                'asset_id' => $assetId,
                'asset_copy_id' => $availableCopy->id,
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'assigned_to_type' => $data['assigned_to_type'],
                'assigned_to_id' => $data['assigned_to_id'] ?? null,
                'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
            ]);

            // Update copy status to assigned
            $availableCopy->status = 'assigned';
            $availableCopy->save();

            // Automatically update asset status based on available copies
            AssetController::updateAssetStatus($asset, $profile->organization_id);
        } else {
            // Fallback: assign asset directly (old behavior)
            $assignment = AssetAssignment::create([
                'asset_id' => $assetId,
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'assigned_to_type' => $data['assigned_to_type'],
                'assigned_to_id' => $data['assigned_to_id'] ?? null,
                'assigned_on' => $data['assigned_on'] ?? now()->toDateString(),
                'expected_return_date' => $data['expected_return_date'] ?? null,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
            ]);

            $asset->status = 'assigned';
            $asset->save();
        }

        AssetController::recordHistory($asset->id, $profile->organization_id, 'assigned', 'Asset assigned', [
            'assigned_to_type' => $data['assigned_to_type'],
            'assigned_to_id' => $data['assigned_to_id'] ?? null,
            'assigned_by' => $user->id,
        ]);

        // Reload asset with updated copy counts
        $asset->refresh();
        if ($hasCopiesTable) {
            $asset->loadCount([
                'copies as total_copies_count',
                'copies as available_copies_count' => function ($q) {
                    $q->where('status', 'available')->whereNull('deleted_at');
                },
            ]);
        }

        return response()->json($assignment->refresh(), 201);
    }

    public function update(UpdateAssetAssignmentRequest $request, string $assignmentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $assignment = AssetAssignment::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->where('id', $assignmentId)
            ->first();

        if (!$assignment) {
            return response()->json(['error' => 'Assignment not found'], 404);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasCopyIdColumn = Schema::hasColumn('asset_assignments', 'asset_copy_id');
        $wasReturned = !empty($data['status']) && $data['status'] === 'returned' && $assignment->status !== 'returned';

        if ($wasReturned && empty($assignment->returned_on)) {
            $assignment->returned_on = now()->toDateString();
        }

        $assignment->save();

        // Update copy status if assignment is returned
        if ($wasReturned && $hasCopiesTable && $hasCopyIdColumn && $assignment->asset_copy_id) {
            $copy = AssetCopy::where('id', $assignment->asset_copy_id)
                ->where('organization_id', $profile->organization_id)
                ->first();

            if ($copy) {
                $copy->status = 'available';
                $copy->save();
            }
        }

        // Automatically update asset status when assignment status changes
        if (!empty($data['status'])) {
            AssetController::updateAssetStatus($asset, $profile->organization_id);
        }

        AssetController::recordHistory($asset->id, $profile->organization_id, 'assignment_updated', 'Asset assignment updated', [
            'assignment_id' => $assignment->id,
            'updated_by' => $user->id,
            'status' => $assignment->status,
        ]);

        // Notify about asset return
        if ($wasReturned) {
            try {
                $this->notificationService->notify(
                    'asset.returned',
                    $assignment,
                    $user,
                    [
                        'title' => '📦 Asset Returned',
                        'body' => "Asset '{$asset->name}' ({$asset->asset_tag}) has been returned.",
                        'url' => "/assets/{$asset->id}",
                    ]
                );
            } catch (\Exception $e) {
                \Log::warning('Failed to send asset return notification', [
                    'assignment_id' => $assignment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Reload asset with updated copy counts
        $asset->refresh();
        if ($hasCopiesTable) {
            $asset->loadCount([
                'copies as total_copies_count',
                'copies as available_copies_count' => function ($q) {
                    $q->where('status', 'available')->whereNull('deleted_at');
                },
            ]);
        }

        return response()->json($assignment);
    }

    public function destroy(Request $request, string $assignmentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $assignment = AssetAssignment::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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

        $hasCopiesTable = Schema::hasTable('asset_copies');
        $hasCopyIdColumn = Schema::hasColumn('asset_assignments', 'asset_copy_id');
        $copyId = $assignment->asset_copy_id;

        $assignment->delete();

        // Update copy status back to available if assignment is deleted
        if ($hasCopiesTable && $hasCopyIdColumn && $copyId) {
            $copy = AssetCopy::where('id', $copyId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->first();

            if ($copy) {
                $copy->status = 'available';
                $copy->save();
            }
        }

        // Automatically update asset status after assignment deletion
        if ($asset) {
            AssetController::updateAssetStatus($asset, $profile->organization_id);
        }

        AssetController::recordHistory($assignment->asset_id, $profile->organization_id, 'assignment_deleted', 'Asset assignment removed', [
            'assignment_id' => $assignment->id,
            'removed_by' => $user->id,
        ]);

        // Reload asset with updated copy counts
        if ($asset) {
            $asset->refresh();
            if ($hasCopiesTable) {
                $asset->loadCount([
                    'copies as total_copies_count',
                    'copies as available_copies_count' => function ($q) {
                        $q->where('status', 'available')->whereNull('deleted_at');
                    },
                ]);
            }
        }

        return response()->noContent();
    }

    private function validateAssignee(string $type, ?string $id, string $organizationId, string $currentSchoolId): bool
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
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
        }

        if ($type === 'student') {
            return DB::table('students')
                ->where('id', $id)
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
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
                ->where('id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
        }

        return false;
    }
}
