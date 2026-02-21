<?php

namespace App\Http\Controllers;

use App\Models\LoginAttempt;
use App\Services\LoginAttemptService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LoginAuditController extends Controller
{
    private const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000000';

    public function __construct(
        private LoginAttemptService $loginAttemptService
    ) {}

    /**
     * Ensure platform admin permission. All methods require subscription.admin.
     */
    private function enforcePlatformAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(401, 'Unauthenticated');
        }
        // CRITICAL: Global platform permissions are stored under the platform org UUID team context.
        $platformOrgId = '00000000-0000-0000-0000-000000000000';
        setPermissionsTeamId($platformOrgId);

        try {
            if (! $user->hasPermissionTo('subscription.admin')) {
                abort(403, 'This action is unauthorized');
            }
        } catch (\Throwable $e) {
            \Log::warning('Login audit permission check failed: '.$e->getMessage());
            abort(403, 'This action is unauthorized');
        }
    }

    /**
     * Paginated list of login attempts with filters.
     */
    public function index(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $query = LoginAttempt::query()->orderByDesc('attempted_at');

        if ($request->filled('start_date')) {
            $start = Carbon::parse($request->input('start_date'))->startOfDay();
            $query->where('attempted_at', '>=', $start);
        }
        if ($request->filled('end_date')) {
            $end = Carbon::parse($request->input('end_date'))->endOfDay();
            $query->where('attempted_at', '<=', $end);
        }
        $successParam = $request->input('success');
        if ($successParam !== null && $successParam !== '') {
            $success = filter_var($successParam, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($success !== null) {
                $query->where('success', $success);
            }
        }
        if ($request->filled('email')) {
            $query->where('email', 'ilike', '%'.$request->input('email').'%');
        }
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->input('organization_id'));
        }
        if ($request->filled('ip_address')) {
            $query->where('ip_address', 'ilike', '%'.$request->input('ip_address').'%');
        }
        if ($request->filled('login_context')) {
            $query->where('login_context', $request->input('login_context'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $perPage = min((int) $request->input('per_page', 25), 500);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * All attempts for a user (by user_id), paginated.
     */
    public function showByUser(Request $request, string $userId)
    {
        $this->enforcePlatformAdmin($request);

        $query = LoginAttempt::where('user_id', $userId)->orderByDesc('attempted_at');

        $this->applyDateFilters($query, $request);
        $perPage = min((int) $request->input('per_page', 25), 500);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * All attempts for an organization, paginated.
     */
    public function showByOrganization(Request $request, string $organizationId)
    {
        $this->enforcePlatformAdmin($request);

        $query = LoginAttempt::where('organization_id', $organizationId)->orderByDesc('attempted_at');

        $this->applyDateFilters($query, $request);
        $successParam = $request->input('success');
        if ($successParam !== null && $successParam !== '') {
            $success = filter_var($successParam, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($success !== null) {
                $query->where('success', $success);
            }
        }
        $perPage = min((int) $request->input('per_page', 25), 500);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Brute-force indicators: IPs and emails with many failures in last hour.
     */
    public function alerts(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $windowMinutes = config('login.alert_window_minutes', 60);
        $since = Carbon::now()->subMinutes($windowMinutes);
        $ipThreshold = config('login.alert_ip_failure_threshold', 10);
        $emailThreshold = config('login.alert_email_failure_threshold', 5);

        $ipAlerts = LoginAttempt::selectRaw('ip_address, COUNT(*) as failure_count, MAX(attempted_at) as last_attempt_at')
            ->where('success', false)
            ->where('attempted_at', '>=', $since)
            ->groupBy('ip_address')
            ->havingRaw('COUNT(*) >= ?', [$ipThreshold])
            ->orderByDesc('failure_count')
            ->get()
            ->map(fn ($r) => [
                'ip_address' => $r->ip_address,
                'failure_count' => (int) $r->failure_count,
                'last_attempt_at' => $r->last_attempt_at,
                'type' => 'ip',
            ]);

        $emailAlerts = LoginAttempt::selectRaw('email, COUNT(*) as failure_count, MAX(attempted_at) as last_attempt_at')
            ->where('success', false)
            ->where('attempted_at', '>=', $since)
            ->whereNotIn('failure_reason', ['account_locked'])
            ->groupBy('email')
            ->havingRaw('COUNT(*) >= ?', [$emailThreshold])
            ->orderByDesc('failure_count')
            ->get()
            ->map(fn ($r) => [
                'email' => $r->email,
                'failure_count' => (int) $r->failure_count,
                'last_attempt_at' => $r->last_attempt_at,
                'type' => 'email',
            ]);

        return response()->json([
            'ip_alerts' => $ipAlerts,
            'email_alerts' => $emailAlerts,
        ]);
    }

    /**
     * List currently locked accounts.
     */
    public function lockedAccounts(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $locked = $this->loginAttemptService->getLockedAccounts();

        return response()->json(['data' => $locked]);
    }

    /**
     * Unlock an account by email.
     */
    public function unlockAccount(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $email = strtolower(trim($validated['email']));
        $user = $request->user();

        $this->loginAttemptService->clearLockout(
            $email,
            'admin_unlocked',
            $user ? $user->id : null
        );

        return response()->json([
            'message' => 'Account unlocked successfully',
            'email' => $email,
        ], 200);
    }

    /**
     * Export login attempts as CSV with same filters as index.
     */
    public function export(Request $request): StreamedResponse
    {
        $this->enforcePlatformAdmin($request);

        $query = LoginAttempt::query()->orderByDesc('attempted_at');

        if ($request->filled('start_date')) {
            $start = Carbon::parse($request->input('start_date'))->startOfDay();
            $query->where('attempted_at', '>=', $start);
        }
        if ($request->filled('end_date')) {
            $end = Carbon::parse($request->input('end_date'))->endOfDay();
            $query->where('attempted_at', '<=', $end);
        }
        $successParam = $request->input('success');
        if ($successParam !== null && $successParam !== '') {
            $success = filter_var($successParam, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($success !== null) {
                $query->where('success', $success);
            }
        }
        if ($request->filled('email')) {
            $query->where('email', 'ilike', '%'.$request->input('email').'%');
        }
        if ($request->filled('organization_id')) {
            $query->where('organization_id', $request->input('organization_id'));
        }
        if ($request->filled('ip_address')) {
            $query->where('ip_address', 'ilike', '%'.$request->input('ip_address').'%');
        }
        if ($request->filled('login_context')) {
            $query->where('login_context', $request->input('login_context'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="login_audit_'.date('Y-m-d_His').'.csv"',
        ];

        return new StreamedResponse(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($handle, [
                'attempted_at', 'email', 'user_id', 'success', 'failure_reason',
                'organization_id', 'school_id', 'ip_address', 'login_context',
                'consecutive_failures', 'was_locked',
            ]);
            $query->chunk(500, function ($attempts) use ($handle) {
                foreach ($attempts as $a) {
                    fputcsv($handle, [
                        $a->attempted_at?->toIso8601String(),
                        $a->email,
                        $a->user_id,
                        $a->success ? '1' : '0',
                        $a->failure_reason ?? '',
                        $a->organization_id ?? '',
                        $a->school_id ?? '',
                        $a->ip_address ?? '',
                        $a->login_context ?? '',
                        (string) $a->consecutive_failures,
                        $a->was_locked ? '1' : '0',
                    ]);
                }
            });
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Get IP geolocation info for login audit detail panel.
     * Uses ip-api.com (free tier, 45 req/min). Results cached 24h per IP.
     */
    public function ipInfo(Request $request)
    {
        $this->enforcePlatformAdmin($request);

        $ip = $request->input('ip');
        if (! is_string($ip) || trim($ip) === '') {
            return response()->json(['error' => 'IP address required'], 400);
        }

        $ip = trim($ip);

        // Skip lookup for private/local IPs
        if (preg_match('/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|::1|fe80:)/i', $ip)) {
            return response()->json([
                'ip' => $ip,
                'city' => null,
                'region' => null,
                'country' => 'Private/Local',
                'countryCode' => null,
                'isp' => null,
                'org' => null,
                'timezone' => null,
                'lat' => null,
                'lon' => null,
                'private' => true,
            ]);
        }

        $cacheKey = 'login_audit_ip_'.md5($ip);
        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return response()->json($cached);
        }

        try {
            $response = Http::timeout(5)->get("http://ip-api.com/json/{$ip}", [
                'fields' => 'status,country,countryCode,region,regionName,city,zip,lat,lon,isp,org,timezone,query',
            ]);

            if (! $response->successful()) {
                return response()->json(['ip' => $ip, 'error' => 'Lookup failed'], 502);
            }

            $data = $response->json();
            if (($data['status'] ?? '') === 'fail') {
                return response()->json([
                    'ip' => $ip,
                    'city' => null,
                    'region' => null,
                    'country' => null,
                    'countryCode' => null,
                    'isp' => null,
                    'org' => null,
                    'timezone' => null,
                    'lat' => null,
                    'lon' => null,
                    'private' => false,
                ]);
            }

            $result = [
                'ip' => $data['query'] ?? $ip,
                'city' => $data['city'] ?? null,
                'region' => $data['regionName'] ?? $data['region'] ?? null,
                'country' => $data['country'] ?? null,
                'countryCode' => $data['countryCode'] ?? null,
                'isp' => $data['isp'] ?? null,
                'org' => $data['org'] ?? null,
                'timezone' => $data['timezone'] ?? null,
                'lat' => $data['lat'] ?? null,
                'lon' => $data['lon'] ?? null,
                'private' => false,
            ];

            Cache::put($cacheKey, $result, now()->addHours(24));

            return response()->json($result);
        } catch (\Throwable $e) {
            \Log::warning('Login audit IP lookup failed: '.$e->getMessage(), ['ip' => $ip]);

            return response()->json([
                'ip' => $ip,
                'error' => 'Lookup failed',
                'city' => null,
                'region' => null,
                'country' => null,
                'countryCode' => null,
                'isp' => null,
                'org' => null,
                'timezone' => null,
                'lat' => null,
                'lon' => null,
                'private' => false,
            ], 502);
        }
    }

    private function applyDateFilters($query, Request $request): void
    {
        if ($request->filled('start_date')) {
            $start = Carbon::parse($request->input('start_date'))->startOfDay();
            $query->where('attempted_at', '>=', $start);
        }
        if ($request->filled('end_date')) {
            $end = Carbon::parse($request->input('end_date'))->endOfDay();
            $query->where('attempted_at', '<=', $end);
        }
    }
}
