<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        $query = Permission::query();

        // Super admin sees all, others see global + their org's permissions
        if ($profile->role !== 'super_admin' || $profile->organization_id !== null) {
            $query->where(function ($q) use ($profile) {
                $q->whereNull('organization_id')
                  ->orWhere('organization_id', $profile->organization_id);
            });
        }

        $permissions = $query->orderBy('name')->get();

        return response()->json($permissions);
    }

    /**
     * Get user permissions using Spatie
     */
    public function userPermissions(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['permissions' => []]);
        }

        // Super admin with no organization gets all global permissions
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $permissions = DB::table('permissions')
                ->whereNull('organization_id')
                ->where('guard_name', 'web')
                ->pluck('name')
                ->toArray();
            
            return response()->json([
                'permissions' => $permissions
            ]);
        }

        // Get all permissions for the user (via roles and direct permissions)
        // Spatie handles this automatically with organization context
        $permissions = $user->getAllPermissions();
        
        // Filter by organization if needed
        if ($profile->organization_id) {
            $permissions = $permissions->filter(function ($permission) use ($profile) {
                return $permission->organization_id === null || $permission->organization_id === $profile->organization_id;
            });
        }

        return response()->json([
            'permissions' => $permissions->pluck('name')->toArray()
        ]);
    }
}
