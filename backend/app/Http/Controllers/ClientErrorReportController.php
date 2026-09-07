<?php

namespace App\Http\Controllers;

use App\Models\ClientErrorReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class ClientErrorReportController extends Controller
{
    private const MAX_MESSAGE = 4000;

    private const MAX_STACK = 12000;

    private const MAX_NOTE = 2000;

    /**
     * Create an error report from the client ErrorBoundary (public + optional auth).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_error_id' => 'nullable|string|max:64',
            'message' => 'required|string|max:'.self::MAX_MESSAGE,
            'stack' => 'nullable|string|max:'.self::MAX_STACK,
            'component_stack' => 'nullable|string|max:'.self::MAX_STACK,
            'url' => 'nullable|string|max:2000',
            'level' => 'nullable|string|in:page,component,critical',
            'user_agent' => 'nullable|string|max:500',
        ]);

        $userId = null;
        $organizationId = null;
        $schoolId = null;

        // Optional Sanctum auth (public route; attach context when bearer token present)
        $user = $request->user('sanctum');
        if (! $user && $request->bearerToken()) {
            $accessToken = PersonalAccessToken::findToken($request->bearerToken());
            $user = $accessToken?->tokenable;
        }
        if ($user) {
            $userId = $user->id;
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            if ($profile) {
                $organizationId = $profile->organization_id ?? null;
                $schoolId = $profile->default_school_id ?? null;
            }
        }

        $report = ClientErrorReport::create([
            'client_error_id' => $validated['client_error_id'] ?? null,
            'message' => $validated['message'],
            'stack' => $validated['stack'] ?? null,
            'component_stack' => $validated['component_stack'] ?? null,
            'url' => $validated['url'] ?? null,
            'user_agent' => $validated['user_agent'] ?? $request->userAgent(),
            'level' => $validated['level'] ?? 'component',
            'user_id' => $userId,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'user_reported' => false,
            'status' => 'new',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'data' => [
                'id' => $report->id,
                'client_error_id' => $report->client_error_id,
            ],
        ], 201);
    }

    /**
     * Mark an existing report as user-reported with an optional note.
     */
    public function report(Request $request, string $id)
    {
        $validated = $request->validate([
            'user_note' => 'nullable|string|max:'.self::MAX_NOTE,
        ]);

        $report = ClientErrorReport::whereNull('deleted_at')->find($id);
        if (! $report) {
            return response()->json(['error' => 'Error report not found'], 404);
        }

        $report->user_reported = true;
        if (array_key_exists('user_note', $validated)) {
            $report->user_note = $validated['user_note'];
        }
        $report->save();

        return response()->json([
            'data' => [
                'id' => $report->id,
                'user_reported' => true,
            ],
        ]);
    }

    /**
     * Platform admin: list error reports.
     */
    public function index(Request $request)
    {
        if ($denied = $this->denyUnlessPlatformAdmin($request)) {
            return $denied;
        }

        $status = $request->query('status');
        $userReported = $request->query('user_reported');
        $organizationId = $request->query('organization_id');
        $search = $request->query('search');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $perPage = min((int) $request->query('per_page', 20), 100);
        $page = max((int) $request->query('page', 1), 1);

        $query = ClientErrorReport::query()->orderByDesc('created_at');

        if ($status && in_array($status, ['new', 'read', 'resolved', 'ignored'], true)) {
            $query->where('status', $status);
        }

        if ($userReported === 'true' || $userReported === '1') {
            $query->where('user_reported', true);
        } elseif ($userReported === 'false' || $userReported === '0') {
            $query->where('user_reported', false);
        }

        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        if ($search) {
            $term = '%'.$search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('message', 'ilike', $term)
                    ->orWhere('url', 'ilike', $term)
                    ->orWhere('client_error_id', 'ilike', $term)
                    ->orWhere('user_note', 'ilike', $term);
            });
        }

        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        $paginator = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $paginator->items(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
        ]);
    }

    /**
     * Platform admin: stats for badges/filters.
     */
    public function stats(Request $request)
    {
        if ($denied = $this->denyUnlessPlatformAdmin($request)) {
            return $denied;
        }

        $base = ClientErrorReport::query();

        return response()->json([
            'data' => [
                'total' => (clone $base)->count(),
                'new' => (clone $base)->where('status', 'new')->count(),
                'read' => (clone $base)->where('status', 'read')->count(),
                'resolved' => (clone $base)->where('status', 'resolved')->count(),
                'ignored' => (clone $base)->where('status', 'ignored')->count(),
                'user_reported' => (clone $base)->where('user_reported', true)->count(),
                'today' => (clone $base)->whereDate('created_at', now()->toDateString())->count(),
            ],
        ]);
    }

    /**
     * Platform admin: show one report.
     */
    public function show(Request $request, string $id)
    {
        if ($denied = $this->denyUnlessPlatformAdmin($request)) {
            return $denied;
        }

        $report = ClientErrorReport::find($id);
        if (! $report) {
            return response()->json(['error' => 'Error report not found'], 404);
        }

        return response()->json(['data' => $report]);
    }

    /**
     * Platform admin: update status / admin notes.
     */
    public function update(Request $request, string $id)
    {
        if ($denied = $this->denyUnlessPlatformAdmin($request)) {
            return $denied;
        }

        $validated = $request->validate([
            'status' => 'nullable|string|in:new,read,resolved,ignored',
            'admin_notes' => 'nullable|string|max:5000',
        ]);

        $report = ClientErrorReport::find($id);
        if (! $report) {
            return response()->json(['error' => 'Error report not found'], 404);
        }

        if (isset($validated['status'])) {
            $report->status = $validated['status'];
            if (in_array($validated['status'], ['read', 'resolved', 'ignored'], true)) {
                $report->reviewed_by = $request->user()->id;
                $report->reviewed_at = now();
            }
        }

        if (array_key_exists('admin_notes', $validated)) {
            $report->admin_notes = $validated['admin_notes'];
        }

        $report->save();

        return response()->json(['data' => $report]);
    }

    /**
     * Platform admin: soft-delete a report.
     */
    public function destroy(Request $request, string $id)
    {
        if ($denied = $this->denyUnlessPlatformAdmin($request)) {
            return $denied;
        }

        $report = ClientErrorReport::find($id);
        if (! $report) {
            return response()->json(['error' => 'Error report not found'], 404);
        }

        $report->delete();

        return response()->noContent();
    }

    private function denyUnlessPlatformAdmin(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        try {
            // Global platform permissions are stored with the platform org UUID team context
            // (same pattern as ContactMessageController / EnsurePlatformAdmin).
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (! $user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for subscription.admin in ClientErrorReportController: '.$e->getMessage());

            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        return null;
    }
}
