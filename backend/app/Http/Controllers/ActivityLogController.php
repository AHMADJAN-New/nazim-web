<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ActivityLogController extends Controller
{
    /**
     * Get activity logs for the organization with filtering and pagination
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('activity_logs.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for activity_logs.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Build query with org/school scoping
        $query = Activity::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Apply filters
        // Date range filter
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Log name filter
        if ($request->has('log_name') && $request->log_name) {
            $query->where('log_name', $request->log_name);
        }

        // Event type filter
        if ($request->has('event') && $request->event) {
            $query->where('event', $request->event);
        }

        // Subject type filter
        if ($request->has('subject_type') && $request->subject_type) {
            $query->where('subject_type', $request->subject_type);
        }

        // Causer (user) filter
        if ($request->has('causer_id') && $request->causer_id) {
            $query->where('causer_id', $request->causer_id);
        }

        // Search in description
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'ilike', "%{$search}%")
                  ->orWhere('route', 'ilike', "%{$search}%");
            });
        }

        // Order by most recent
        $query->orderBy('created_at', 'desc');

        // Pagination
        $perPage = $request->get('per_page', 25);
        $perPage = min(max($perPage, 10), 100); // Between 10-100

        $logs = $query->paginate($perPage);

        // Get causer names for all logs
        $causerIds = $logs->pluck('causer_id')->filter()->unique()->values();
        $causerNames = [];
        if ($causerIds->isNotEmpty()) {
            $causerNames = DB::table('profiles')
                ->whereIn('id', $causerIds)
                ->pluck('full_name', 'id')
                ->toArray();
        }

        // Transform data to include causer name
        $transformedItems = $logs->getCollection()->map(function ($log) use ($causerNames) {
            $logArray = $log->toArray();
            $logArray['causer_name'] = $causerNames[$log->causer_id] ?? null;
            return $logArray;
        });

        return response()->json([
            'data' => $transformedItems,
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Get available log names for filter dropdown
     */
    public function logNames(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('activity_logs.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $logNames = Activity::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNotNull('log_name')
            ->distinct()
            ->pluck('log_name')
            ->sort()
            ->values();

        return response()->json(['data' => $logNames]);
    }

    /**
     * Get available event types for filter dropdown
     */
    public function eventTypes(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('activity_logs.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventTypes = Activity::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNotNull('event')
            ->distinct()
            ->pluck('event')
            ->sort()
            ->values();

        return response()->json(['data' => $eventTypes]);
    }

    /**
     * Get statistics for the activity logs
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('activity_logs.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $baseQuery = Activity::where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Today's activity count
        $todayCount = (clone $baseQuery)
            ->whereDate('created_at', today())
            ->count();

        // This week's activity count
        $weekCount = (clone $baseQuery)
            ->where('created_at', '>=', now()->startOfWeek())
            ->count();

        // Unique users today
        $uniqueUsersToday = (clone $baseQuery)
            ->whereDate('created_at', today())
            ->whereNotNull('causer_id')
            ->distinct('causer_id')
            ->count('causer_id');

        // Most common event types
        $topEvents = (clone $baseQuery)
            ->whereNotNull('event')
            ->select('event', DB::raw('count(*) as count'))
            ->groupBy('event')
            ->orderByDesc('count')
            ->limit(5)
            ->get();

        return response()->json([
            'today_count' => $todayCount,
            'week_count' => $weekCount,
            'unique_users_today' => $uniqueUsersToday,
            'top_events' => $topEvents,
        ]);
    }
}
