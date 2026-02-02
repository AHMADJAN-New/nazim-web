<?php

namespace App\Http\Middleware;

use App\Models\SchoolBranding;
use App\Services\Subscription\FeatureGateService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePublicWebsiteFeature
{
    public function __construct(
        private FeatureGateService $featureGateService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        // Allow bypass in local/development for easier testing
        if (app()->environment('local', 'development', 'testing')) {
            return $next($request);
        }

        $organizationId = $request->attributes->get('organization_id');
        $schoolId = $request->attributes->get('school_id');

        if (! is_string($organizationId) || $organizationId === '') {
            return response()->json(['error' => 'Organization context is required.'], 400);
        }

        $access = $this->featureGateService->getFeatureAccessStatus($organizationId, 'public_website');
        $hasAccess = $access['allowed'] ?? $access['has_access'] ?? false;

        if (! $hasAccess) {
            $schoolName = null;
            if (is_string($schoolId) && $schoolId !== '') {
                $school = SchoolBranding::where('id', $schoolId)->first();
                $schoolName = $school?->school_name;
            }
            $host = $request->getHost();

            return response()->json([
                'error' => 'Plan upgrade required for public website access.',
                'feature_key' => 'public_website',
                'upgrade_required' => true,
                'required_plan' => $access['required_plan'] ?? null,
                'school_name' => $schoolName,
                'domain' => $host,
            ], 402);
        }

        return $next($request);
    }
}
