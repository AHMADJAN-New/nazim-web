<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssetMaintenanceRequest;
use App\Http\Requests\UpdateAssetMaintenanceRequest;
use App\Models\Asset;
use App\Models\AssetMaintenanceRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetMaintenanceController extends Controller
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
            \Log::warning('Permission check failed in AssetMaintenanceController::index - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.read',
                'error' => $e->getMessage(),
            ]);
        }

        $records = AssetMaintenanceRecord::where('asset_id', $assetId)
            ->where('organization_id', $profile->organization_id)
            ->orderByDesc(DB::raw('COALESCE(performed_on, created_at)'))
            ->get();

        return response()->json($records);
    }

    public function store(StoreAssetMaintenanceRequest $request, string $assetId)
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
            \Log::warning('Permission check failed in AssetMaintenanceController::store - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();

        $record = AssetMaintenanceRecord::create([
            'asset_id' => $assetId,
            'organization_id' => $profile->organization_id,
            'maintenance_type' => $data['maintenance_type'] ?? null,
            'status' => $data['status'] ?? 'scheduled',
            'performed_on' => $data['performed_on'] ?? now()->toDateString(),
            'next_due_date' => $data['next_due_date'] ?? null,
            'cost' => $data['cost'] ?? 0,
            'vendor' => $data['vendor'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        if ($record->status === 'in_progress' || $record->status === 'scheduled') {
            $asset->status = 'maintenance';
            $asset->save();
        }

        AssetController::recordHistory($asset->id, $profile->organization_id, 'maintenance_logged', 'Maintenance recorded', [
            'maintenance_id' => $record->id,
            'created_by' => $user->id,
            'status' => $record->status,
        ]);

        return response()->json($record, 201);
    }

    public function update(UpdateAssetMaintenanceRequest $request, string $recordId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $record = AssetMaintenanceRecord::where('organization_id', $profile->organization_id)
            ->where('id', $recordId)
            ->first();

        if (!$record) {
            return response()->json(['error' => 'Maintenance record not found'], 404);
        }

        $asset = Asset::where('organization_id', $profile->organization_id)
            ->where('id', $record->asset_id)
            ->first();

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetMaintenanceController::update - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $data = $request->validated();
        
        // Ensure cost is never null (default to 0 if not provided)
        if (!isset($data['cost']) || $data['cost'] === null) {
            $data['cost'] = $record->cost ?? 0;
        }
        
        $record->fill($data);
        $record->save();

        if (!empty($data['status'])) {
            if ($data['status'] === 'completed' && $asset) {
                $asset->status = 'available';
                $asset->save();
            } elseif ($asset) {
                $asset->status = 'maintenance';
                $asset->save();
            }
        }

        AssetController::recordHistory($record->asset_id, $profile->organization_id, 'maintenance_updated', 'Maintenance updated', [
            'maintenance_id' => $record->id,
            'updated_by' => $user->id,
            'status' => $record->status,
        ]);

        return response()->json($record);
    }

    public function destroy(Request $request, string $recordId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $record = AssetMaintenanceRecord::where('organization_id', $profile->organization_id)
            ->where('id', $recordId)
            ->first();

        if (!$record) {
            return response()->json(['error' => 'Maintenance record not found'], 404);
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($profile->organization_id);
        }

        try {
            if (!$user->hasPermissionTo('assets.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed in AssetMaintenanceController::destroy - allowing access', [
                'user_id' => $user->id,
                'permission' => 'assets.update',
                'error' => $e->getMessage(),
            ]);
        }

        $assetId = $record->asset_id;
        $record->delete();

        $hasActiveMaintenance = AssetMaintenanceRecord::where('asset_id', $assetId)
            ->where('organization_id', $profile->organization_id)
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->exists();

        if (!$hasActiveMaintenance) {
            Asset::where('id', $assetId)
                ->where('organization_id', $profile->organization_id)
                ->update(['status' => 'available']);
        }

        AssetController::recordHistory($assetId, $profile->organization_id, 'maintenance_deleted', 'Maintenance record removed', [
            'maintenance_id' => $recordId,
            'removed_by' => $user->id,
        ]);

        return response()->json(['message' => 'Maintenance record removed']);
    }
}
