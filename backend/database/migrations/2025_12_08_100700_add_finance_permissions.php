<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Finance permissions for the MVP
     * 
     * Permissions:
     * - finance_accounts: read, create, update, delete
     * - finance_income: read, create, update, delete
     * - finance_expense: read, create, update, delete
     * - finance_projects: read, create, update, delete
     * - finance_donors: read, create, update, delete
     * - finance_reports: read
     */
    public function up(): void
    {
        $financePermissions = [
            // Finance Accounts (cash locations)
            ['name' => 'finance_accounts.read', 'resource' => 'finance_accounts', 'action' => 'read', 'description' => 'View finance accounts'],
            ['name' => 'finance_accounts.create', 'resource' => 'finance_accounts', 'action' => 'create', 'description' => 'Create finance accounts'],
            ['name' => 'finance_accounts.update', 'resource' => 'finance_accounts', 'action' => 'update', 'description' => 'Update finance accounts'],
            ['name' => 'finance_accounts.delete', 'resource' => 'finance_accounts', 'action' => 'delete', 'description' => 'Delete finance accounts'],

            // Income (entries + categories)
            ['name' => 'finance_income.read', 'resource' => 'finance_income', 'action' => 'read', 'description' => 'View income entries and categories'],
            ['name' => 'finance_income.create', 'resource' => 'finance_income', 'action' => 'create', 'description' => 'Create income entries and categories'],
            ['name' => 'finance_income.update', 'resource' => 'finance_income', 'action' => 'update', 'description' => 'Update income entries and categories'],
            ['name' => 'finance_income.delete', 'resource' => 'finance_income', 'action' => 'delete', 'description' => 'Delete income entries and categories'],

            // Expenses (entries + categories)
            ['name' => 'finance_expense.read', 'resource' => 'finance_expense', 'action' => 'read', 'description' => 'View expense entries and categories'],
            ['name' => 'finance_expense.create', 'resource' => 'finance_expense', 'action' => 'create', 'description' => 'Create expense entries and categories'],
            ['name' => 'finance_expense.update', 'resource' => 'finance_expense', 'action' => 'update', 'description' => 'Update expense entries and categories'],
            ['name' => 'finance_expense.delete', 'resource' => 'finance_expense', 'action' => 'delete', 'description' => 'Delete expense entries and categories'],

            // Projects/Funds
            ['name' => 'finance_projects.read', 'resource' => 'finance_projects', 'action' => 'read', 'description' => 'View finance projects'],
            ['name' => 'finance_projects.create', 'resource' => 'finance_projects', 'action' => 'create', 'description' => 'Create finance projects'],
            ['name' => 'finance_projects.update', 'resource' => 'finance_projects', 'action' => 'update', 'description' => 'Update finance projects'],
            ['name' => 'finance_projects.delete', 'resource' => 'finance_projects', 'action' => 'delete', 'description' => 'Delete finance projects'],

            // Donors
            ['name' => 'finance_donors.read', 'resource' => 'finance_donors', 'action' => 'read', 'description' => 'View donors'],
            ['name' => 'finance_donors.create', 'resource' => 'finance_donors', 'action' => 'create', 'description' => 'Create donors'],
            ['name' => 'finance_donors.update', 'resource' => 'finance_donors', 'action' => 'update', 'description' => 'Update donors'],
            ['name' => 'finance_donors.delete', 'resource' => 'finance_donors', 'action' => 'delete', 'description' => 'Delete donors'],

            // Reports
            ['name' => 'finance_reports.read', 'resource' => 'finance_reports', 'action' => 'read', 'description' => 'View finance reports and dashboard'],
        ];

        $now = now();

        // Insert global permissions (organization_id = NULL)
        foreach ($financePermissions as $permission) {
            // Check if permission exists before inserting
            $exists = DB::table('permissions')
                ->where('name', $permission['name'])
                ->whereNull('organization_id')
                ->exists();

            if (!$exists) {
                DB::table('permissions')->insert([
                    'id' => \Illuminate\Support\Str::uuid(),
                    'name' => $permission['name'],
                    'resource' => $permission['resource'],
                    'action' => $permission['action'],
                    'description' => $permission['description'],
                    'guard_name' => 'web',
                    'organization_id' => null, // Global permission
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        // Assign all finance permissions to admin role for each organization
        $organizations = DB::table('organizations')->get();
        
        foreach ($organizations as $org) {
            // Get the admin role for this organization
            $adminRole = DB::table('roles')
                ->where('name', 'admin')
                ->where('organization_id', $org->id)
                ->first();

            if (!$adminRole) {
                continue;
            }

            // Get all finance permissions
            $permissions = DB::table('permissions')
                ->whereNull('organization_id')
                ->where('resource', 'LIKE', 'finance_%')
                ->get();

            foreach ($permissions as $permission) {
                // Check if role already has this permission
                $exists = DB::table('role_has_permissions')
                    ->where('role_id', $adminRole->id)
                    ->where('permission_id', $permission->id)
                    ->exists();

                if (!$exists) {
                    DB::table('role_has_permissions')->insert([
                        'role_id' => $adminRole->id,
                        'permission_id' => $permission->id,
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove finance permissions from role_has_permissions
        $permissionIds = DB::table('permissions')
            ->whereNull('organization_id')
            ->where('resource', 'LIKE', 'finance_%')
            ->pluck('id');

        DB::table('role_has_permissions')
            ->whereIn('permission_id', $permissionIds)
            ->delete();

        // Remove finance permissions
        DB::table('permissions')
            ->where('resource', 'LIKE', 'finance_%')
            ->delete();
    }
};
