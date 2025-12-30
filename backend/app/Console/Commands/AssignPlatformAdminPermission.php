<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AssignPlatformAdminPermission extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'platform:assign-admin {email : The email of the user to assign platform admin permission}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign subscription.admin permission to a user (for platform admin access)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        // Find user
        $user = DB::table('users')->where('email', $email)->first();

        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }

        $this->info("Found user: {$email} (ID: {$user->id})");

        // Step 1: Ensure subscription.admin permission exists
        $permission = $this->ensurePlatformAdminPermission();

        // Step 2: Assign permission to user
        $this->assignPlatformAdminPermission($user->id, $permission->id);

        $this->info('');
        $this->info("✅ Successfully assigned subscription.admin permission to {$email}");
        $this->info('   User can now access platform admin at: /platform/login');
        $this->info('');

        return 0;
    }

    /**
     * Ensure subscription.admin permission exists (global, organization_id = NULL)
     */
    protected function ensurePlatformAdminPermission(): object
    {
        $permission = DB::table('permissions')
            ->where('name', 'subscription.admin')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->first();

        if ($permission) {
            $this->info('  ✓ subscription.admin permission already exists');
            return (object) [
                'id' => $permission->id,
                'name' => $permission->name,
            ];
        }

        // Create the global subscription.admin permission
        $permissionId = (string) Str::uuid();
        DB::table('permissions')->insert([
            'id' => $permissionId,
            'name' => 'subscription.admin',
            'guard_name' => 'web',
            'organization_id' => null, // CRITICAL: NULL = Global permission
            'resource' => 'subscription',
            'action' => 'admin',
            'description' => 'Platform administration access - manage all organizations, subscriptions, plans, and more',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->info('  ✓ Created subscription.admin permission (global)');

        return (object) [
            'id' => $permissionId,
            'name' => 'subscription.admin',
        ];
    }

    /**
     * Assign subscription.admin permission directly to user (global permission)
     */
    protected function assignPlatformAdminPermission(string $userId, string $permissionId): void
    {
        // Special UUID for "platform" organization (all zeros) - represents global permissions
        $platformOrgId = '00000000-0000-0000-0000-000000000000';

        // Check if permission is already assigned
        $existing = DB::table('model_has_permissions')
            ->where('permission_id', $permissionId)
            ->where('model_type', 'App\\Models\\User')
            ->where('model_id', $userId)
            ->where('organization_id', $platformOrgId)
            ->first();

        if ($existing) {
            $this->info('  ✓ subscription.admin permission already assigned to user');
            return;
        }

        // Check if platform organization exists, create if not
        $platformOrg = DB::table('organizations')
            ->where('id', $platformOrgId)
            ->first();

        if (!$platformOrg) {
            // Create platform organization (special system organization for global permissions)
            DB::table('organizations')->insert([
                'id' => $platformOrgId,
                'name' => 'Platform (Global Permissions)',
                'slug' => 'platform-global',
                'settings' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->info('  ✓ Created platform organization for global permissions');
        }

        // Assign permission using platform organization UUID
        DB::table('model_has_permissions')->insert([
            'permission_id' => $permissionId,
            'model_type' => 'App\\Models\\User',
            'model_id' => $userId,
            'organization_id' => $platformOrgId, // Use platform org UUID (represents global)
        ]);

        $this->info('  ✓ Assigned subscription.admin permission to user');
    }
}

