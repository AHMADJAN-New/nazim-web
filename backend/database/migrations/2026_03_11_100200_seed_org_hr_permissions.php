<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permissionsTable = config('permission.table_names.permissions', 'permissions');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $roleHasPermissionsTable = config('permission.table_names.role_has_permissions', 'role_has_permissions');

        $permissionRows = [
            ['name' => 'hr_staff.read', 'resource' => 'hr_staff', 'action' => 'read'],
            ['name' => 'hr_staff.create', 'resource' => 'hr_staff', 'action' => 'create'],
            ['name' => 'hr_staff.update', 'resource' => 'hr_staff', 'action' => 'update'],
            ['name' => 'hr_staff.delete', 'resource' => 'hr_staff', 'action' => 'delete'],
            ['name' => 'hr_assignments.read', 'resource' => 'hr_assignments', 'action' => 'read'],
            ['name' => 'hr_assignments.create', 'resource' => 'hr_assignments', 'action' => 'create'],
            ['name' => 'hr_assignments.update', 'resource' => 'hr_assignments', 'action' => 'update'],
            ['name' => 'hr_assignments.approve', 'resource' => 'hr_assignments', 'action' => 'approve'],
            ['name' => 'hr_payroll.read', 'resource' => 'hr_payroll', 'action' => 'read'],
            ['name' => 'hr_payroll.create', 'resource' => 'hr_payroll', 'action' => 'create'],
            ['name' => 'hr_payroll.run', 'resource' => 'hr_payroll', 'action' => 'run'],
            ['name' => 'hr_payroll.approve', 'resource' => 'hr_payroll', 'action' => 'approve'],
            ['name' => 'hr_payroll.export', 'resource' => 'hr_payroll', 'action' => 'export'],
            ['name' => 'hr_reports.read', 'resource' => 'hr_reports', 'action' => 'read'],
            ['name' => 'hr_reports.export', 'resource' => 'hr_reports', 'action' => 'export'],
        ];

        $permissionIds = [];
        foreach ($permissionRows as $permission) {
            $existing = DB::table($permissionsTable)
                ->where('name', $permission['name'])
                ->whereNull('organization_id')
                ->where('guard_name', 'web')
                ->first();

            if (!$existing) {
                $id = DB::table($permissionsTable)->insertGetId([
                    'name' => $permission['name'],
                    'guard_name' => 'web',
                    'organization_id' => null,
                    'resource' => $permission['resource'],
                    'action' => $permission['action'],
                    'description' => 'Organization HR permission: '.$permission['name'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $permissionIds[$permission['name']] = $id;
            } else {
                $permissionIds[$permission['name']] = $existing->id;
            }
        }

        $roleMatrix = [
            'organization_hr_admin' => array_keys($permissionIds),
            'hr_officer' => ['hr_staff.read', 'hr_staff.create', 'hr_staff.update', 'hr_assignments.read', 'hr_assignments.create', 'hr_assignments.update', 'hr_reports.read'],
            'payroll_officer' => ['hr_staff.read', 'hr_payroll.read', 'hr_payroll.create', 'hr_payroll.run', 'hr_payroll.approve', 'hr_payroll.export', 'hr_reports.read', 'hr_reports.export'],
            'principal' => ['hr_staff.read', 'hr_assignments.read'],
        ];

        $organizations = DB::table('organizations')->pluck('id');

        foreach ($organizations as $organizationId) {
            foreach ($roleMatrix as $roleName => $permissionNames) {
                $role = DB::table($rolesTable)
                    ->where('name', $roleName)
                    ->where('organization_id', $organizationId)
                    ->first();

                if (!$role) {
                    $roleId = DB::table($rolesTable)->insertGetId([
                        'name' => $roleName,
                        'guard_name' => 'web',
                        'organization_id' => $organizationId,
                        'description' => 'Auto-seeded org HR role',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                } else {
                    $roleId = $role->id;
                }

                foreach ($permissionNames as $permissionName) {
                    $permissionId = $permissionIds[$permissionName] ?? null;
                    if (!$permissionId) {
                        continue;
                    }

                    $exists = DB::table($roleHasPermissionsTable)
                        ->where('permission_id', $permissionId)
                        ->where('role_id', $roleId)
                        ->where('organization_id', $organizationId)
                        ->exists();

                    if (!$exists) {
                        DB::table($roleHasPermissionsTable)->insert([
                            'permission_id' => $permissionId,
                            'role_id' => $roleId,
                            'organization_id' => $organizationId,
                        ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        // no-op for safety (permission data may be in active use)
    }
};
