<?php

namespace App\Http\Middleware;

use App\Services\Subscription\UsageTrackingService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnforceUsageLimit
{
    public function __construct(
        private UsageTrackingService $usageTrackingService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $resourceKey  The resource key to check limit for
     */
    public function handle(Request $request, Closure $next, string $resourceKey): Response
    {
        // Only check limits for create/store methods
        if (!in_array($request->method(), ['POST', 'PUT'])) {
            return $next($request);
        }

        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $organizationId = $profile->organization_id;

        // Check usage limit
        $check = $this->usageTrackingService->canCreate($organizationId, $resourceKey);

        if (!$check['allowed']) {
            return response()->json([
                'error' => $check['message'],
                'code' => 'LIMIT_REACHED',
                'resource_key' => $resourceKey,
                'current' => $check['current'],
                'limit' => $check['limit'],
                'upgrade_required' => true,
            ], 402);
        }

        // Add usage info to request for controllers to use
        $request->merge([
            'usage_check' => $check,
        ]);

        // If there's a warning, add it to response headers
        if ($check['warning']) {
            $response = $next($request);
            
            if ($response instanceof Response) {
                $response->headers->set('X-Usage-Warning', $check['message']);
                $response->headers->set('X-Usage-Current', (string) $check['current']);
                $response->headers->set('X-Usage-Limit', (string) $check['limit']);
                $response->headers->set('X-Usage-Percentage', (string) $check['percentage']);
            }
            
            return $response;
        }

        return $next($request);
    }
}
