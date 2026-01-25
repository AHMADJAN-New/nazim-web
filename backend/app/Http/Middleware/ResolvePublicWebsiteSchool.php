<?php

namespace App\Http\Middleware;

use App\Models\WebsiteDomain;
use App\Models\WebsiteSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolvePublicWebsiteSchool
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = strtolower($request->getHost());
        $baseDomain = config('website.base_domain');

        $schoolSetting = WebsiteDomain::where('domain', $host)
            ->where('verification_status', 'verified')
            ->whereNull('deleted_at')
            ->first();

        if ($schoolSetting) {
            $request->attributes->set('school_id', $schoolSetting->school_id);
            $request->attributes->set('organization_id', $schoolSetting->organization_id);
            return $next($request);
        }

        if ($baseDomain && str_ends_with($host, $baseDomain)) {
            $slug = str_replace('.' . $baseDomain, '', $host);
            $slug = trim($slug);
            $setting = WebsiteSetting::where('school_slug', $slug)
                ->whereNull('deleted_at')
                ->first();

            if ($setting) {
                $request->attributes->set('school_id', $setting->school_id);
                $request->attributes->set('organization_id', $setting->organization_id);
                return $next($request);
            }
        }

        // Development fallback: allow school_id query parameter or use first available school
        if (app()->environment('local', 'development', 'testing')) {
            $schoolId = $request->query('school_id');
            
            if ($schoolId) {
                $setting = WebsiteSetting::where('school_id', $schoolId)
                    ->whereNull('deleted_at')
                    ->first();
            } else {
                // Fallback to first website-enabled school for development convenience
                $setting = WebsiteSetting::whereNull('deleted_at')->first();
            }
            
            if ($setting) {
                $request->attributes->set('school_id', $setting->school_id);
                $request->attributes->set('organization_id', $setting->organization_id);
                return $next($request);
            }
            
            // Ultimate fallback: use first SchoolBranding directly if no WebsiteSetting exists
            $school = \App\Models\SchoolBranding::first();
            if ($school) {
                $request->attributes->set('school_id', $school->id);
                $request->attributes->set('organization_id', $school->organization_id);
                return $next($request);
            }
        }

        return response()->json(['error' => 'School website not found.'], 404);
    }
}
