<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ListPlatformAdmins extends Command
{
    protected $signature = 'platform:list-admins';
    protected $description = 'List all users with subscription.admin permission';

    public function handle(): int
    {
        $this->info('Checking for users with subscription.admin permission...');
        $this->newLine();

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

        $this->info("Found permission: {$permission->id}");
        $this->newLine();

        // Get all users with this permission
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        
        $users = DB::table('model_has_permissions')
            ->join('users', 'model_has_permissions.model_id', '=', 'users.id')
            ->leftJoin('profiles', 'users.id', '=', 'profiles.id')
            ->where('model_has_permissions.permission_id', $permission->id)
            ->where('model_has_permissions.model_type', 'App\\Models\\User')
            ->where(function ($query) use ($platformOrgId) {
                $query->where('model_has_permissions.organization_id', $platformOrgId)
                      ->orWhereNull('model_has_permissions.organization_id');
            })
            ->select('users.id', 'users.email', 'profiles.full_name', 'model_has_permissions.organization_id')
            ->get();

        if ($users->isEmpty()) {
            $this->info('No users found with subscription.admin permission.');
            return 0;
        }

        $this->info("Found {$users->count()} user(s) with subscription.admin permission:");
        $this->newLine();

        $headers = ['ID', 'Email', 'Full Name', 'Organization ID'];
        $rows = [];

        foreach ($users as $user) {
            $rows[] = [
                $user->id,
                $user->email ?? 'N/A',
                $user->full_name ?? 'N/A',
                $user->organization_id ?? 'NULL (Global)',
            ];
        }

        $this->table($headers, $rows);

        return 0;
    }
}

