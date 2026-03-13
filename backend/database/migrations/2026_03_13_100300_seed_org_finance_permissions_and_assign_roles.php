<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Ensure org-scoped org_finance permissions exist and are assigned to org roles.
     * Do not create or link org roles to global permission rows here.
     */
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $permissionRows = [
            'org_finance.read' => [
                'resource' => 'org_finance',
                'action' => 'read',
                'description' => 'Organization finance: read',
            ],
            'org_finance.create' => [
                'resource' => 'org_finance',
                'action' => 'create',
                'description' => 'Organization finance: create',
            ],
        ];

        $roleMatrix = [
            'admin' => ['org_finance.read', 'org_finance.create'],
            'organization_admin' => ['org_finance.read', 'org_finance.create'],
            'organization_hr_admin' => ['org_finance.read', 'org_finance.create'],
            'payroll_officer' => ['org_finance.read'],
        ];

        $roleDescriptions = [
            'admin' => 'Administrator with full access to all features',
            'organization_admin' => 'Organization administrator with full access to all features',
            'organization_hr_admin' => 'Organization HR admin with full HR access',
            'payroll_officer' => 'Payroll officer for payroll processing',
        ];

        $organizations = DB::table('organizations')
            ->whereNull('deleted_at')
            ->get(['id']);

        foreach ($organizations as $organization) {
            $organizationId = $organization->id;
            $permissionIds = [];

            foreach ($permissionRows as $permissionName => $permissionData) {
                $existing = DB::table($permissionsTable)
                    ->where('name', $permissionName)
                    ->where('organization_id', $organizationId)
                    ->where('guard_name', 'web')
                    ->first(['id']);

                if (! $existing) {
                    DB::table($permissionsTable)->insert([
                        'name' => $permissionName,
                        'guard_name' => 'web',
                        'organization_id' => $organizationId,
                        'resource' => $permissionData['resource'],
                        'action' => $permissionData['action'],
                        'description' => $permissionData['description'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $existing = DB::table($permissionsTable)
                        ->where('name', $permissionName)
                        ->where('organization_id', $organizationId)
                        ->where('guard_name', 'web')
                        ->first(['id']);
                }

                if ($existing) {
                    $permissionIds[$permissionName] = $existing->id;
                }
            }

            foreach ($roleMatrix as $roleName => $permissionNames) {
                $role = DB::table($rolesTable)
                    ->where('name', $roleName)
                    ->where('organization_id', $organizationId)
                    ->where('guard_name', 'web')
                    ->first(['id']);

                if (! $role) {
                    DB::table($rolesTable)->insert([
                        'name' => $roleName,
                        'guard_name' => 'web',
                        'organization_id' => $organizationId,
                        'description' => $roleDescriptions[$roleName] ?? ucfirst(str_replace('_', ' ', $roleName)),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $role = DB::table($rolesTable)
                        ->where('name', $roleName)
                        ->where('organization_id', $organizationId)
                        ->where('guard_name', 'web')
                        ->first(['id']);
                }

                if (! $role) {
                    continue;
                }

                foreach ($permissionNames as $permissionName) {
                    $permissionId = $permissionIds[$permissionName] ?? null;

                    if (! $permissionId) {
                        continue;
                    }

                    $exists = DB::table($roleHasPermissionsTable)
                        ->where('permission_id', $permissionId)
                        ->where('role_id', $role->id)
                        ->where('organization_id', $organizationId)
                        ->exists();

                    if (! $exists) {
                        DB::table($roleHasPermissionsTable)->insert([
                            'permission_id' => $permissionId,
                            'role_id' => $role->id,
                            'organization_id' => $organizationId,
                        ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // no-op for safety
    }
};
