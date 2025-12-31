<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $connection = 'pgsql';
    protected $table = 'users'; // Now in public schema
    protected $keyType = 'string';
    public $incrementing = false;
    protected $primaryKey = 'id';

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }
    
    /**
     * The guard name for Spatie permissions
     * This is CRITICAL for Sanctum authentication to work with permissions
     */
    protected $guard_name = 'web';

    /**
     * Get the name of the guard used by this model
     * Required for Spatie permissions to work correctly
     * Must return a Collection, not an array
     */
    public function getGuardNames()
    {
        return collect(['web']);
    }

    protected $fillable = [
        'id',
        'email',
        'encrypted_password',
    ];

    protected $hidden = [
        'encrypted_password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the profile associated with the user
     */
    public function profile()
    {
        return $this->hasOne(Profile::class, 'id', 'id');
    }

    /**
     * Override Spatie's hasPermissionTo() to work correctly with teams feature
     * 
     * CRITICAL: Spatie's hasPermissionTo() doesn't work correctly with teams feature,
     * so we override it to manually query permissions when team context is set.
     * This ensures all existing code continues to work without changes.
     * 
     * @param string|\Spatie\Permission\Contracts\Permission $permission
     * @param string|null $guardName
     * @return bool
     */
    public function hasPermissionTo($permission, $guardName = null): bool
    {
        // Get team context (organization_id) if set
        $teamId = getPermissionsTeamId();
        
        // Platform org UUID used for global permissions
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        
        // If no team context is set, fall back to Spatie's default behavior
        // This handles global permissions (like subscription.admin for platform admins)
        if ($teamId === null) {
            return parent::hasPermissionTo($permission, $guardName);
        }

        // For platform org UUID, check global permissions (organization_id = NULL)
        // Global permissions are stored with platform org UUID in model_has_permissions,
        // but the permission itself has organization_id = NULL
        $isGlobalPermission = ($teamId === $platformOrgId);

        // For organization-scoped permissions, use manual query
        $permissionName = is_string($permission) ? $permission : $permission->name;
        $guardName = $guardName ?? $this->getGuardNames()->first();

        if ($isGlobalPermission) {
            // Check global permissions (organization_id = NULL in permissions table)
            // But model_has_permissions may have platform org UUID or NULL
            $tableNames = config('permission.table_names');
            $columnNames = config('permission.column_names');
            $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
            $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

            // Check direct user permissions for global permissions
            $hasPermission = DB::table($modelHasPermissionsTable)
                ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
                ->where($modelMorphKey, $this->id)
                ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
                ->where(function ($query) use ($modelHasPermissionsTable, $platformOrgId) {
                    // Check for platform org UUID OR NULL in model_has_permissions
                    $query->where($modelHasPermissionsTable . '.organization_id', $platformOrgId)
                          ->orWhereNull($modelHasPermissionsTable . '.organization_id');
                })
                ->whereNull('permissions.organization_id') // CRITICAL: Global permissions have NULL organization_id
                ->where('permissions.name', $permissionName)
                ->where('permissions.guard_name', $guardName)
                ->exists();

            return $hasPermission;
        }

        // For organization-scoped permissions, use manual query
        // Get permissions via roles (bypasses model_has_permissions)
        // Flow: model_has_roles -> role_has_permissions -> permissions
        $hasPermission = DB::table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', function ($join) {
                $join->on('role_has_permissions.role_id', '=', 'model_has_roles.role_id')
                     ->where('model_has_roles.model_id', '=', $this->id)
                     ->where('model_has_roles.model_type', '=', 'App\\Models\\User');
            })
            ->where('model_has_roles.organization_id', $teamId)
            ->where('role_has_permissions.organization_id', $teamId)
            ->where('permissions.organization_id', $teamId)
            ->where('permissions.name', $permissionName)
            ->where('permissions.guard_name', $guardName)
            ->exists();

        // Also check direct user permissions (model_has_permissions)
        if (!$hasPermission) {
            $tableNames = config('permission.table_names');
            $columnNames = config('permission.column_names');
            $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
            $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

            $hasPermission = DB::table($modelHasPermissionsTable)
                ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
                ->where($modelMorphKey, $this->id)
                ->where($modelHasPermissionsTable . '.model_type', 'App\\Models\\User')
                ->where($modelHasPermissionsTable . '.organization_id', $teamId)
                ->where('permissions.organization_id', $teamId)
                ->where('permissions.name', $permissionName)
                ->where('permissions.guard_name', $guardName)
                ->exists();
        }

        return $hasPermission;
    }
}
