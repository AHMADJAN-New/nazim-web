<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssetRequest;
use App\Http\Requests\UpdateAssetRequest;
use App\Models\Asset;
use App\Models\AssetHistory;
use App\Models\AssetMaintenanceRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::index - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        $orgId = $profile->organization_id;

        $query = Asset::with([
            'building',
            'room',
            'school',
            'category',
            'activeAssignment',
            'assignments' => function ($q) {
                $q->orderByDesc('assigned_on');
            },
            'maintenanceRecords' => function ($q) {
                $q->orderByDesc('performed_on');
            },
        ])
            ->withCount(['maintenanceRecords as maintenance_events_count'])
            ->withSum('maintenanceRecords as maintenance_cost_total', 'cost')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at');

        if (!empty($schoolIds)) {
            $query->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')
                    ->orWhereIn('school_id', $schoolIds);
            });
        }

        if ($request->filled('status')) {
            $statuses = is_array($request->status) ? $request->status : [$request->status];
            $query->whereIn('status', $statuses);
        }

        if ($request->filled('school_id') && in_array($request->school_id, $schoolIds, true)) {
            $query->where('school_id', $request->school_id);
        }

        if ($request->filled('building_id')) {
            $query->where('building_id', $request->building_id);
        }

        if ($request->filled('room_id')) {
            $query->where('room_id', $request->room_id);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(asset_tag) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(serial_number) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(category) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int) $perPage, $allowedPerPage, true)) {
                $perPage = 25;
            }

            $assets = $query->orderBy('name')->paginate((int) $perPage);
            return response()->json($assets);
        }

        $assets = $query->orderBy('name')->get();
        return response()->json($assets);
    }

    public function store(StoreAssetRequest $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::store - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.create',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();
        $data['organization_id'] = $profile->organization_id;

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        if (!empty($schoolIds) && isset($data['school_id']) && $data['school_id'] && !in_array($data['school_id'], $schoolIds, true)) {
            return response()->json(['error' => 'School not accessible for this user'], 403);
        }

        if (!$this->validateLocation($data, $profile->organization_id)) {
            return response()->json(['error' => 'Invalid building or room for organization'], 422);
        }

        $assetTagExists = DB::table('assets')
            ->where('asset_tag', $data['asset_tag'])
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->exists();

        if ($assetTagExists) {
            return response()->json(['error' => 'Asset tag must be unique per organization'], 422);
        }

        $asset = Asset::create($data);

        self::recordHistory($asset->id, $profile->organization_id, 'created', 'Asset created', [
            'created_by' => $user->id,
        ]);

        return response()->json($asset->load(['building', 'room', 'school', 'category', 'activeAssignment']), 201);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::show - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $schoolIds = $this->getAccessibleSchoolIds($profile);

        $asset = Asset::with([
            'building',
            'room',
            'school',
            'category',
            'activeAssignment',
            'assignments' => function ($query) {
                $query->orderByDesc('assigned_on');
            },
            'maintenanceRecords' => function ($query) {
                $query->orderByDesc('performed_on');
            },
            'history' => function ($query) {
                $query->orderByDesc('created_at');
            },
        ])
            ->where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (!empty($schoolIds) && $asset->school_id && !in_array($asset->school_id, $schoolIds, true)) {
            return response()->json(['error' => 'This asset is not accessible'], 403);
        }

        return response()->json($asset);
    }

    public function update(UpdateAssetRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::update - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $schoolIds = $this->getAccessibleSchoolIds($profile);
        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        if (!empty($schoolIds) && $asset->school_id && !in_array($asset->school_id, $schoolIds, true)) {
            return response()->json(['error' => 'This asset is not accessible'], 403);
        }

        $data = $request->validated();

        if (isset($data['asset_tag']) && $data['asset_tag']) {
            $assetTagExists = DB::table('assets')
                ->where('asset_tag', $data['asset_tag'])
                ->where('organization_id', $profile->organization_id)
                ->where('id', '!=', $asset->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($assetTagExists) {
                return response()->json(['error' => 'Asset tag must be unique per organization'], 422);
            }
        }

        if (!$this->validateLocation($data, $profile->organization_id)) {
            return response()->json(['error' => 'Invalid building or room for organization'], 422);
        }

        $original = $asset->getOriginal();
        $asset->fill($data);
        $asset->save();

        $changes = array_keys($asset->getChanges());
        if (!empty($changes)) {
            self::recordHistory($asset->id, $profile->organization_id, 'updated', 'Asset updated', [
                'changed_fields' => $changes,
                'updated_by' => $user->id,
                'before' => array_intersect_key($original, array_flip($changes)),
                'after' => $asset->only($changes),
            ]);
        }

        return response()->json($asset->load(['building', 'room', 'school', 'category', 'activeAssignment']));
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::destroy - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.delete',
                'error' => $e->getMessage(),
            ]);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $asset->delete();

        self::recordHistory($asset->id, $profile->organization_id, 'deleted', 'Asset archived', [
            'deleted_by' => $user->id,
        ]);

        return response()->json(['message' => 'Asset deleted']);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetController::stats - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $orgId = $profile->organization_id;
        $schoolIds = $this->getAccessibleSchoolIds($profile);

        $baseQuery = Asset::where('organization_id', $orgId);
        if (!empty($schoolIds)) {
            $baseQuery->where(function ($q) use ($schoolIds) {
                $q->whereNull('school_id')
                    ->orWhereIn('school_id', $schoolIds);
            });
        }

        $statusCounts = (clone $baseQuery)
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $assetIds = (clone $baseQuery)->pluck('id');
        $totalValue = (float) ((clone $baseQuery)->sum('purchase_price') ?? 0);

        $maintenanceCost = 0;
        if ($assetIds->isNotEmpty()) {
            $maintenanceCost = (float) AssetMaintenanceRecord::where('organization_id', $orgId)
                ->whereIn('asset_id', $assetIds)
                ->sum('cost');
        }

        return response()->json([
            'status_counts' => $statusCounts,
            'total_purchase_value' => $totalValue,
            'maintenance_cost_total' => $maintenanceCost,
            'asset_count' => (clone $baseQuery)->count(),
        ]);
    }

    public function history(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $id)
            ->first();

        if (!$asset) {
            return response()->json(['error' => 'Asset not found'], 404);
        }

        $history = AssetHistory::where('asset_id', $asset->id)
            ->where('organization_id', $profile->organization_id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($history);
    }

    private function validateLocation(array $data, string $organizationId): bool
    {
        if (!empty($data['building_id'])) {
            $buildingSchoolId = DB::table('buildings')
                ->where('id', $data['building_id'])
                ->whereNull('deleted_at')
                ->value('school_id');

            if (!$buildingSchoolId) {
                return false;
            }

            $belongsToOrg = DB::table('school_branding')
                ->where('id', $buildingSchoolId)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();

            if (!$belongsToOrg) {
                return false;
            }

            if (!empty($data['school_id']) && $data['school_id'] !== $buildingSchoolId) {
                return false;
            }
        }

        if (!empty($data['room_id'])) {
            $roomRecord = DB::table('rooms')->where('id', $data['room_id'])->whereNull('deleted_at')->first();
            if (!$roomRecord) {
                return false;
            }

            if (!empty($data['building_id']) && $roomRecord->building_id !== $data['building_id']) {
                return false;
            }

            $roomSchoolId = $roomRecord->school_id;
            $belongsToOrg = DB::table('school_branding')
                ->where('id', $roomSchoolId)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();

            if (!$belongsToOrg) {
                return false;
            }

            if (!empty($data['school_id']) && $data['school_id'] !== $roomSchoolId) {
                return false;
            }
        }

        if (!empty($data['school_id'])) {
            $schoolExists = DB::table('school_branding')
                ->where('id', $data['school_id'])
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->exists();

            if (!$schoolExists) {
                return false;
            }
        }

        return true;
    }

    public static function recordHistory(string $assetId, string $organizationId, string $eventType, string $description, array $metadata = []): void
    {
        try {
            AssetHistory::create([
                'asset_id' => $assetId,
                'organization_id' => $organizationId,
                'event_type' => $eventType,
                'description' => $description,
                'metadata' => $metadata,
            ]);
        } catch (\Exception $e) {
            \Log::warning('Failed to record asset history', [
                'asset_id' => $assetId,
                'organization_id' => $organizationId,
                'event_type' => $eventType,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
