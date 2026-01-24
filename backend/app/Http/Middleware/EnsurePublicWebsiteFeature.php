<?php

namespace App\Http\Middleware;

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
        $organizationId = $request->attributes->get('organization_id');

        if (!is_string($organizationId) || $organizationId === '') {
            return response()->json(['error' => 'Organization context is required.'], 400);
        }

        $access = $this->featureGateService->getFeatureAccessStatus($organizationId, 'public_website');

        if (!$access['has_access']) {
            return response()->json([
                'error' => 'Plan upgrade required for public website access.',
                'feature_key' => 'public_website',
                'upgrade_required' => true,
                'required_plan' => $access['required_plan'] ?? null,
            ], 402);
        }

        return $next($request);
    }
}
