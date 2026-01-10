<?php

namespace App\Http\Middleware;

use App\Services\Subscription\FeatureGateService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureAccess
{
    public function __construct(
        private FeatureGateService $featureGateService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $featureKey  The feature key to check access for
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
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

        $access = $this->featureGateService->getFeatureAccessStatus($organizationId, $featureKey);

        if (!$access['allowed']) {
            return response()->json([
                'error' => "The '{$featureKey}' feature is not available on your current plan.",
                'code' => $access['reason'] === 'dependency_missing' ? 'FEATURE_DEPENDENCY_MISSING' : 'FEATURE_NOT_AVAILABLE',
                'feature_key' => $featureKey,
                'missing_dependencies' => $access['missing_dependencies'] ?? [],
                'required_plan' => $access['required_plan'] ?? null,
                'upgrade_required' => true,
                'available_addons' => $this->featureGateService->getAvailableAddons($organizationId),
            ], 402);
        }

        // If feature is read-only, block write operations
        if (($access['access_level'] ?? 'full') === 'readonly' && !in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'])) {
            return response()->json([
                'error' => "The '{$featureKey}' feature is locked in read-only mode. Please upgrade to edit.",
                'code' => 'FEATURE_READONLY',
                'feature_key' => $featureKey,
                'required_plan' => $access['required_plan'] ?? null,
                'upgrade_required' => true,
            ], 402);
        }

        return $next($request);
    }
}
