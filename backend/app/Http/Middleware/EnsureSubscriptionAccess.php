<?php

namespace App\Http\Middleware;

use App\Services\Subscription\FeatureGateService;
use App\Services\Subscription\SubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionAccess
{
    public function __construct(
        private SubscriptionService $subscriptionService,
        private FeatureGateService $featureGateService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $accessLevel = 'read'): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $organizationId = $profile->organization_id;

        // Check subscription exists
        $subscription = $this->subscriptionService->getCurrentSubscription($organizationId);

        if (!$subscription) {
            return response()->json([
                'error' => 'No active subscription found',
                'code' => 'NO_SUBSCRIPTION',
                'upgrade_required' => true,
            ], 402);
        }

        // Check access level
        if ($accessLevel === 'write' && !$this->featureGateService->canWrite($organizationId)) {
            $status = $this->featureGateService->getSubscriptionStatus($organizationId);
            
            return response()->json([
                'error' => 'Your subscription does not allow write access. ' . $status['message'],
                'code' => 'WRITE_ACCESS_DENIED',
                'subscription_status' => $status['status'],
                'access_level' => $status['access_level'],
                'upgrade_required' => true,
            ], 402);
        }

        if ($accessLevel === 'read' && !$this->featureGateService->canRead($organizationId)) {
            $status = $this->featureGateService->getSubscriptionStatus($organizationId);
            
            return response()->json([
                'error' => 'Your subscription has expired. ' . $status['message'],
                'code' => 'READ_ACCESS_DENIED',
                'subscription_status' => $status['status'],
                'access_level' => $status['access_level'],
                'upgrade_required' => true,
            ], 402);
        }

        // Add subscription info to request for controllers to use
        $request->merge([
            'subscription' => $subscription,
            'subscription_status' => $this->featureGateService->getSubscriptionStatus($organizationId),
        ]);

        return $next($request);
    }
}
