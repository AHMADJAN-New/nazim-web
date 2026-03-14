<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

trait OrgFinanceScope
{
    /**
     * Get organization ID from authenticated user's profile.
     * Aborts with 403 if missing.
     */
    protected function getOrgIdFromProfile(Request $request): string
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            abort(404, 'Profile not found');
        }

        if (! $profile->organization_id) {
            abort(403, 'User must be assigned to an organization');
        }

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId((string) $profile->organization_id);
        }

        if ($user->hasRole('admin')) {
            abort(403, 'School admins cannot access organization-wide finance data.');
        }

        return $profile->organization_id;
    }

    /**
     * Require org_finance.read permission. Call in read actions.
     */
    protected function requireOrgFinanceRead(Request $request): void
    {
        $user = $request->user();
        try {
            if (! $user->hasPermissionTo('org_finance.read')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed for org_finance.read: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }

    /**
     * Require org_finance.create permission. Call in create/update/delete actions.
     */
    protected function requireOrgFinanceCreate(Request $request): void
    {
        $user = $request->user();
        try {
            if (! $user->hasPermissionTo('org_finance.create')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Exception $e) {
            \Log::warning('Permission check failed for org_finance.create: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }
}
