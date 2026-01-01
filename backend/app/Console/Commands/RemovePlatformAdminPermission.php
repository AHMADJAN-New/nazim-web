<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RemovePlatformAdminPermission extends Command
{
    protected $signature = 'platform:remove-admin {email : The email of the user to remove platform admin permission from}';
    protected $description = 'Remove subscription.admin permission from a user';

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

        // Get the global subscription.admin permission
        $permission = DB::table('permissions')
            ->where('name', 'subscription.admin')
            ->whereNull('organization_id')
            ->where('guard_name', 'web')
            ->first();

        if (!$permission) {
            $this->warn('subscription.admin permission not found!');
            return 1;
        }

        // Remove permission from user
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        
        $deleted = DB::table('model_has_permissions')
            ->where('permission_id', $permission->id)
            ->where('model_type', 'App\\Models\\User')
            ->where('model_id', $user->id)
            ->where(function ($query) use ($platformOrgId) {
                $query->where('organization_id', $platformOrgId)
                      ->orWhereNull('organization_id');
            })
            ->delete();

        if ($deleted > 0) {
            $this->info("✅ Successfully removed subscription.admin permission from {$email}");
        } else {
            $this->warn("⚠️  User {$email} does not have subscription.admin permission");
        }

        return 0;
    }
}




