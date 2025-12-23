<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EventController extends Controller
{
    /**
     * Display a listing of events
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for events.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check if user is event-specific (locked to one event)
        $isEventUser = $profile->is_event_user ?? false;
        $userEventId = $profile->event_id ?? null;
        
        $query = Event::with(['eventType:id,name', 'school:id,school_name'])
            ->whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id);
        
        // If user is event-specific, only show their assigned event
        if ($isEventUser && $userEventId) {
            $query->where('id', $userEventId);
        }

        // Filter by school_id
        if ($request->has('school_id') && $request->school_id) {
            $query->where('school_id', $request->school_id);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by event_type_id
        if ($request->has('event_type_id') && $request->event_type_id) {
            $query->where('event_type_id', $request->event_type_id);
        }

        // Search by title
        if ($request->has('search') && $request->search) {
            $query->where('title', 'ilike', '%' . $request->search . '%');
        }

        // Date range filter
        if ($request->has('start_date') && $request->start_date) {
            $query->where('starts_at', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->where('starts_at', '<=', $request->end_date);
        }

        // Add aggregate guest counts
        $query->withCount([
            'guests as total_invited' => function ($q) {
                $q->select(DB::raw('COALESCE(SUM(invite_count), 0)'));
            },
            'guests as total_arrived' => function ($q) {
                $q->select(DB::raw('COALESCE(SUM(arrived_count), 0)'));
            },
            'guests as guest_count',
        ]);

        // Pagination
        $perPage = $request->input('per_page', 25);
        $allowedPerPage = [10, 25, 50, 100];
        if (!in_array((int)$perPage, $allowedPerPage)) {
            $perPage = 25;
        }

        $events = $query->orderBy('starts_at', 'desc')
            ->paginate((int)$perPage);

        return response()->json($events);
    }

    /**
     * Store a newly created event
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for events.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'school_id' => 'required|uuid|exists:school_branding,id',
            'event_type_id' => 'nullable|uuid|exists:event_types,id',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'venue' => 'nullable|string|max:255',
            'capacity' => 'nullable|integer|min:0',
            'status' => 'in:draft,published,completed,cancelled',
        ]);

        try {
            $event = Event::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $validated['school_id'],
                'event_type_id' => $validated['event_type_id'] ?? null,
                'title' => $validated['title'],
                'starts_at' => $validated['starts_at'],
                'ends_at' => $validated['ends_at'] ?? null,
                'venue' => $validated['venue'] ?? null,
                'capacity' => $validated['capacity'] ?? null,
                'status' => $validated['status'] ?? 'draft',
                'created_by' => $user->id,
            ]);

            Log::info("Event created", ['id' => $event->id, 'title' => $event->title]);

            return response()->json($event->load(['eventType', 'school']), 201);
        } catch (\Exception $e) {
            Log::error("Failed to create event: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create event'], 500);
        }
    }

    /**
     * Display the specified event
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $event = Event::with(['eventType.fields' => function($q) {
                $q->where('is_enabled', true)->orderBy('sort_order');
            }, 'eventType.fieldGroups', 'school', 'creator:id,email'])
            ->withCount([
                'guests as total_invited' => function ($q) {
                    $q->select(DB::raw('COALESCE(SUM(invite_count), 0)'));
                },
                'guests as total_arrived' => function ($q) {
                    $q->select(DB::raw('COALESCE(SUM(arrived_count), 0)'));
                },
                'guests as guest_count',
            ])
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        return response()->json($event);
    }

    /**
     * Update the specified event
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $event = Event::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:200',
            'school_id' => 'sometimes|required|uuid|exists:school_branding,id',
            'event_type_id' => 'nullable|uuid|exists:event_types,id',
            'starts_at' => 'sometimes|required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'venue' => 'nullable|string|max:255',
            'capacity' => 'nullable|integer|min:0',
            'status' => 'in:draft,published,completed,cancelled',
        ]);

        try {
            $oldStatus = $event->status;
            $event->update($validated);
            
            // Auto-block event-specific users when event is completed
            if ($oldStatus !== 'completed' && $validated['status'] === 'completed') {
                DB::table('profiles')
                    ->where('event_id', $event->id)
                    ->where('is_event_user', true)
                    ->update([
                        'is_active' => false,
                        'updated_at' => now(),
                    ]);
                Log::info("Event-specific users auto-blocked", [
                    'event_id' => $event->id,
                    'users_blocked' => DB::table('profiles')
                        ->where('event_id', $event->id)
                        ->where('is_event_user', true)
                        ->count()
                ]);
            }
            
            Log::info("Event updated", ['id' => $event->id]);
            return response()->json($event->load(['eventType', 'school']));
        } catch (\Exception $e) {
            Log::error("Failed to update event: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update event'], 500);
        }
    }

    /**
     * Remove the specified event
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $event = Event::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        try {
            $event->delete();
            Log::info("Event deleted", ['id' => $id]);
            return response()->json(['message' => 'Event deleted successfully']);
        } catch (\Exception $e) {
            Log::error("Failed to delete event: " . $e->getMessage());
            return response()->json(['error' => 'Failed to delete event'], 500);
        }
    }

    /**
     * Get event stats for dashboard
     */
    public function stats(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $event = Event::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $stats = DB::table('event_guests')
            ->where('event_id', $id)
            ->whereNull('deleted_at')
            ->select([
                DB::raw('COUNT(*) as guest_count'),
                DB::raw('SUM(invite_count) as total_invited'),
                DB::raw('SUM(arrived_count) as total_arrived'),
                DB::raw("COUNT(*) FILTER (WHERE status = 'invited') as invited_count"),
                DB::raw("COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in_count"),
                DB::raw("COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count"),
            ])
            ->first();

        $byType = DB::table('event_guests')
            ->where('event_id', $id)
            ->whereNull('deleted_at')
            ->select([
                'guest_type',
                DB::raw('COUNT(*) as count'),
                DB::raw('SUM(invite_count) as invited'),
                DB::raw('SUM(arrived_count) as arrived'),
            ])
            ->groupBy('guest_type')
            ->get();

        return response()->json([
            'totals' => $stats,
            'by_type' => $byType,
            'capacity' => $event->capacity,
            'remaining_capacity' => $event->capacity
                ? max(0, $event->capacity - ($stats->total_arrived ?? 0))
                : null,
        ]);
    }
}
