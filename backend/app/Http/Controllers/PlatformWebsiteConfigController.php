<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class PlatformWebsiteConfigController extends Controller
{
    public function show(Request $request)
    {
        // Platform admins use global permissions (no organization team context).
        setPermissionsTeamId(null);

        return response()->json([
            'base_domain' => (string) config('website.base_domain'),
        ]);
    }
}

