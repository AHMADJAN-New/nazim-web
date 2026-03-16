<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Comprehensive permission + role sync migration.
 *
 * Reads the canonical definition from PermissionSeeder and ensures every
 * permission, role, and role→permission mapping exists for every organization.
 *
 * Safe for production:
 *  - Idempotent (ON CONFLICT DO NOTHING / existence checks)
 *  - Never removes permissions, roles, or user assignments
 *  - Never modifies model_has_roles (user→role assignments are untouched)
 *  - Never modifies model_has_permissions (direct user overrides are untouched)
 *  - Only ADDS missing rows
 */
return new class extends Migration
{
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable       = config('permission.table_names.roles', 'roles');
        $rolePermsTable   = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $permissionDefs   = \Database\Seeders\PermissionSeeder::getPermissions();
        $roleDefs         = \Database\Seeders\PermissionSeeder::getRolePermissions();
        $superAdminOnly   = \Database\Seeders\PermissionSeeder::getSuperAdminOnlyPermissions();
        $excludedAdmin    = \Database\Seeders\PermissionSeeder::getExcludedAdminPermissions();
        $excludedForAdmin = array_merge($superAdminOnly, $excludedAdmin);

        $organizations = DB::table('organizations')->whereNull('deleted_at')->get();

        // -- 1. Ensure global permissions exist (organization_id = NULL) --------
        $globalCreated = 0;
        foreach ($permissionDefs as $resource => $actions) {
            foreach ($actions as $action) {
                $name = "{$resource}.{$action}";
                $exists = DB::table($permissionsTable)
                    ->where('name', $name)->where('guard_name', 'web')->whereNull('organization_id')
                    ->exists();

                if (!$exists) {
                    DB::table($permissionsTable)->insert([
                        'name'            => $name,
                        'guard_name'      => 'web',
                        'organization_id' => null,
                        'resource'        => $resource,
                        'action'          => $action,
                        'description'     => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ]);
                    $globalCreated++;
                }
            }
        }
        Log::info("[sync-perms] Global permissions created: {$globalCreated}");

        // -- 2. Per organization: permissions, roles, role→perm mappings --------
        $roleDescriptions = [
            'admin'                 => 'Administrator with full access to all features',
            'organization_admin'    => 'Organization administrator with full access to all features',
            'staff'                 => 'Staff member with limited access for operational tasks',
            'teacher'               => 'Teacher with access to academic content and student information',
            'exam_controller'       => 'Exam controller with full exam management access',
            'accountant'            => 'Accountant with full finance, fees, and currency access',
            'hostel_manager'        => 'Hostel manager for room assignments and reports',
            'librarian'             => 'Librarian with library and document management access',
            'website_admin'         => 'Website admin with full control over public site content',
            'website_editor'        => 'Website editor with content publishing access',
            'website_media'         => 'Website media manager for uploads and galleries',
            'organization_hr_admin' => 'Organization HR admin with full HR access',
            'hr_officer'            => 'HR officer for staff and assignments management',
            'payroll_officer'       => 'Payroll officer for payroll processing',
            'principal'             => 'School principal with read access to HR data',
        ];

        foreach ($organizations as $org) {
            $orgPermCreated  = 0;
            $roleCreated     = 0;
            $rolePermCreated = 0;

            // 2a. Ensure org-specific permissions
            foreach ($permissionDefs as $resource => $actions) {
                foreach ($actions as $action) {
                    $name = "{$resource}.{$action}";

                    if ($name === 'subscription.admin') {
                        continue;
                    }

                    $exists = DB::table($permissionsTable)
                        ->where('name', $name)->where('guard_name', 'web')->where('organization_id', $org->id)
                        ->exists();

                    if (!$exists) {
                        DB::table($permissionsTable)->insert([
                            'name'            => $name,
                            'guard_name'      => 'web',
                            'organization_id' => $org->id,
                            'resource'        => $resource,
                            'action'          => $action,
                            'description'     => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                            'created_at'      => now(),
                            'updated_at'      => now(),
                        ]);
                        $orgPermCreated++;
                    }
                }
            }

            // 2b. Ensure roles exist
            foreach ($roleDefs as $roleName => $_) {
                $exists = DB::table($rolesTable)
                    ->where('name', $roleName)->where('guard_name', 'web')->where('organization_id', $org->id)
                    ->exists();

                if (!$exists) {
                    DB::table($rolesTable)->insert([
                        'name'            => $roleName,
                        'guard_name'      => 'web',
                        'organization_id' => $org->id,
                        'description'     => $roleDescriptions[$roleName] ?? ucfirst(str_replace('_', ' ', $roleName)),
                        'created_at'      => now(),
                        'updated_at'      => now(),
                    ]);
                    $roleCreated++;
                }
            }

            // 2c. Ensure role→permission mappings
            $orgPerms = DB::table($permissionsTable)
                ->where('organization_id', $org->id)->where('guard_name', 'web')
                ->get()->keyBy('name');

            foreach ($roleDefs as $roleName => $permList) {
                $role = DB::table($rolesTable)
                    ->where('name', $roleName)->where('organization_id', $org->id)->where('guard_name', 'web')
                    ->first();

                if (!$role) {
                    continue;
                }

                $targetPerms = [];
                if ($permList === '*') {
                    $targetPerms = $orgPerms->filter(fn ($p) => !in_array($p->name, $excludedForAdmin))->pluck('id')->toArray();
                } else {
                    foreach ($permList as $pName) {
                        if (in_array($pName, $excludedForAdmin)) {
                            continue;
                        }
                        $perm = $orgPerms->get($pName);
                        if ($perm) {
                            $targetPerms[] = $perm->id;
                        }
                    }
                }

                foreach ($targetPerms as $permId) {
                    $exists = DB::table($rolePermsTable)
                        ->where('permission_id', $permId)->where('role_id', $role->id)->where('organization_id', $org->id)
                        ->exists();

                    if (!$exists) {
                        DB::table($rolePermsTable)->insert([
                            'permission_id'   => $permId,
                            'role_id'         => $role->id,
                            'organization_id' => $org->id,
                        ]);
                        $rolePermCreated++;
                    }
                }
            }

            Log::info("[sync-perms] Org '{$org->name}': perms +{$orgPermCreated}, roles +{$roleCreated}, role_perms +{$rolePermCreated}");
        }

        // -- 3. Clear Spatie permission cache -----------------------------------
        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }

        Log::info('[sync-perms] Migration complete. Permission cache cleared.');
    }

    public function down(): void
    {
        // Intentionally empty – this is an additive-only migration.
    }
};
