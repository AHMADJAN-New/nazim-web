<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class OrganizationHelper
{
    /**
     * Get the default "ناظم" organization ID
     * Uses cache to avoid repeated database queries
     */
    public static function getDefaultOrganizationId(): ?string
    {
        return Cache::remember('default_organization_id', 3600, function () {
            $org = DB::table('organizations')
                ->where(function($query) {
                    $query->where('name', 'ناظم')
                          ->orWhere('slug', 'nazim');
                })
                ->whereNull('deleted_at')
                ->first();
            
            return $org ? $org->id : null;
        });
    }

    /**
     * Clear the cached organization ID (call when organization is created/updated)
     */
    public static function clearCache(): void
    {
        Cache::forget('default_organization_id');
    }
}

