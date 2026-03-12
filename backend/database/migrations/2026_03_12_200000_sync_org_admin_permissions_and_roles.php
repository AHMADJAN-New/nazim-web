<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Incremental permission + role sync for Organization Admin feature.
 *
 * Adds:
 *  - HR permissions to PermissionSeeder (already done in seeder, ensures DB has them)
 *  - Read-only school permissions for org-level roles (organization_hr_admin, etc.)
 *  - Users management permissions for org-level roles
 *  - Missing roles per org (organization_hr_admin, hr_officer, payroll_officer, principal, etc.)
 *  - Role→permission mappings for all roles from PermissionSeeder
 *
 * CRITICAL: This migration is Enterprise-safe. It adds permissions/roles to ALL organizations,
 * but the frontend only shows the org-admin area for Enterprise plans. Non-Enterprise users
 * are completely unaffected in their daily workflow — the extra roles simply sit unused.
 *
 * Safe for production:
 *  - Idempotent (existence checks)
 *  - Never removes anything
 *  - Never touches model_has_roles or model_has_permissions
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

        // 1. Ensure global permissions
        $globalCreated = 0;
        foreach ($permissionDefs as $resource => $actions) {
            foreach ($actions as $action) {
                $name = "{$resource}.{$action}";
                $exists = DB::table($permissionsTable)
                    ->where('name', $name)->where('guard_name', 'web')->whereNull('organization_id')
                    ->exists();
                if (!$exists) {
                    DB::table($permissionsTable)->insert([
                        'name' => $name, 'guard_name' => 'web', 'organization_id' => null,
                        'resource' => $resource, 'action' => $action,
                        'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    $globalCreated++;
                }
            }
        }
        Log::info("[sync-org-admin-perms] Global permissions created: {$globalCreated}");

        // 2. Per org: permissions, roles, mappings
        foreach ($organizations as $org) {
            $orgPermCreated = 0; $roleCreated = 0; $rolePermCreated = 0;

            foreach ($permissionDefs as $resource => $actions) {
                foreach ($actions as $action) {
                    $name = "{$resource}.{$action}";
                    if ($name === 'subscription.admin') continue;

                    $exists = DB::table($permissionsTable)
                        ->where('name', $name)->where('guard_name', 'web')->where('organization_id', $org->id)
                        ->exists();
                    if (!$exists) {
                        DB::table($permissionsTable)->insert([
                            'name' => $name, 'guard_name' => 'web', 'organization_id' => $org->id,
                            'resource' => $resource, 'action' => $action,
                            'description' => ucfirst($action) . ' ' . str_replace('_', ' ', $resource),
                            'created_at' => now(), 'updated_at' => now(),
                        ]);
                        $orgPermCreated++;
                    }
                }
            }

            foreach ($roleDefs as $roleName => $_) {
                $exists = DB::table($rolesTable)
                    ->where('name', $roleName)->where('guard_name', 'web')->where('organization_id', $org->id)
                    ->exists();
                if (!$exists) {
                    DB::table($rolesTable)->insert([
                        'name' => $roleName, 'guard_name' => 'web', 'organization_id' => $org->id,
                        'description' => $roleDescriptions[$roleName] ?? ucfirst(str_replace('_', ' ', $roleName)),
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    $roleCreated++;
                }
            }

            $orgPerms = DB::table($permissionsTable)
                ->where('organization_id', $org->id)->where('guard_name', 'web')
                ->get()->keyBy('name');

            foreach ($roleDefs as $roleName => $permList) {
                $role = DB::table($rolesTable)
                    ->where('name', $roleName)->where('organization_id', $org->id)->where('guard_name', 'web')
                    ->first();
                if (!$role) continue;

                $targetPermIds = [];
                if ($permList === '*') {
                    $targetPermIds = $orgPerms->filter(fn ($p) => !in_array($p->name, $excludedForAdmin))->pluck('id')->toArray();
                } else {
                    foreach ($permList as $pName) {
                        if (in_array($pName, $excludedForAdmin)) continue;
                        $perm = $orgPerms->get($pName);
                        if ($perm) $targetPermIds[] = $perm->id;
                    }
                }

                foreach ($targetPermIds as $permId) {
                    $exists = DB::table($rolePermsTable)
                        ->where('permission_id', $permId)->where('role_id', $role->id)->where('organization_id', $org->id)
                        ->exists();
                    if (!$exists) {
                        DB::table($rolePermsTable)->insert([
                            'permission_id' => $permId, 'role_id' => $role->id, 'organization_id' => $org->id,
                        ]);
                        $rolePermCreated++;
                    }
                }
            }

            Log::info("[sync-org-admin-perms] Org '{$org->name}': perms +{$orgPermCreated}, roles +{$roleCreated}, role_perms +{$rolePermCreated}");
        }

        if (function_exists('app')) {
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }
        Log::info('[sync-org-admin-perms] Migration complete.');
    }

    public function down(): void
    {
        // Intentionally empty – additive only.
    }
};
