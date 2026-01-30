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
        // Prefer the original visitor host when behind a proxy / separate edge.
        // - X-Forwarded-Host is commonly set by Nginx/Cloudflare/ALB.
        // - X-Public-Website-Host is an optional client-provided fallback (only trusted after validation below).
        $rawHost = $request->header('x-forwarded-host')
            ?? $request->header('x-public-website-host')
            ?? $request->getHost();

        // x-forwarded-host can be a comma-separated list; take the first.
        $rawHost = trim(explode(',', (string) $rawHost)[0] ?? '');
        // Strip port if present (e.g. example.com:443)
        $rawHost = preg_replace('/:\d+$/', '', $rawHost) ?? $rawHost;

        $host = strtolower(trim((string) $rawHost));
        $baseDomain = strtolower(trim((string) config('website.base_domain')));

        $schoolSetting = WebsiteDomain::where('domain', $host)
            ->where('verification_status', 'verified')
            ->whereNull('deleted_at')
            ->first();

        if ($schoolSetting) {
            $request->attributes->set('school_id', $schoolSetting->school_id);
            $request->attributes->set('organization_id', $schoolSetting->organization_id);
            return $next($request);
        }

        // Subdomain routing: {school_slug}.{base_domain}
        // NOTE: Require a dot-prefix to avoid treating the bare base domain as a slug.
        if ($baseDomain !== '' && str_ends_with($host, '.' . $baseDomain)) {
            $slug = substr($host, 0, -strlen('.' . $baseDomain));
            $slug = trim((string) $slug);

            // Common convenience: ignore a leading www. on the subdomain portion
            if (str_starts_with($slug, 'www.')) {
                $slug = substr($slug, 4);
            }

            $setting = WebsiteSetting::where('school_slug', $slug)
                ->whereNull('deleted_at')
                ->first();

            if ($setting) {
                $request->attributes->set('school_id', $setting->school_id);
                $request->attributes->set('organization_id', $setting->organization_id);
                return $next($request);
            }
        }

        // Safe fallback: allow explicit school_id query parameter when host-based resolution fails.
        // This supports dev/testing and deployments where the public SPA and API are not served from the same origin.
        $schoolIdParam = $request->query('school_id');
        if (is_string($schoolIdParam) && $schoolIdParam !== '') {
            $setting = WebsiteSetting::where('school_id', $schoolIdParam)
                ->where('is_public', true)
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
            // Fallback to first website-enabled school for development convenience
            $setting = WebsiteSetting::whereNull('deleted_at')->first();

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
