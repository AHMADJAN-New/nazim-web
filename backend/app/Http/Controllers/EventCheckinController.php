<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventGuest;
use App\Models\EventCheckin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EventCheckinController extends Controller
{
    /**
     * Process a check-in via QR token or guest code
     */
    public function checkin(Request $request, string $eventId)
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

        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        if ($event->status !== 'published') {
            return response()->json([
                'error' => 'Event is not active',
                'event_status' => $event->status,
            ], 400);
        }

        $validated = $request->validate([
            'qr_token' => 'required_without:guest_code|string',
            'guest_code' => 'required_without:qr_token|string',
            'arrived_increment' => 'integer|min:1|max:100',
            'device_id' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
            'override_limit' => 'boolean',
        ]);

        // Find guest by QR token or guest code
        $query = EventGuest::where('event_id', $eventId)
            ->whereNull('deleted_at');

        if (!empty($validated['qr_token'])) {
            $query->where('qr_token', $validated['qr_token']);
        } else {
            $query->where('guest_code', $validated['guest_code']);
        }

        $guest = $query->first();

        if (!$guest) {
            return response()->json([
                'success' => false,
                'error' => 'Guest not found',
                'code' => 'GUEST_NOT_FOUND',
            ], 404);
        }

        if ($guest->status === 'blocked') {
            return response()->json([
                'success' => false,
                'error' => 'Guest is blocked',
                'code' => 'GUEST_BLOCKED',
                'guest' => [
                    'id' => $guest->id,
                    'full_name' => $guest->full_name,
                    'status' => $guest->status,
                ],
            ], 400);
        }

        $arrivedIncrement = $validated['arrived_increment'] ?? 1;
        $overrideLimit = $validated['override_limit'] ?? false;

        // Check if increment would exceed invite count
        $newArrivedCount = $guest->arrived_count + $arrivedIncrement;
        if (!$overrideLimit && $newArrivedCount > $guest->invite_count) {
            return response()->json([
                'success' => false,
                'error' => 'Would exceed invite limit',
                'code' => 'EXCEEDS_LIMIT',
                'guest' => [
                    'id' => $guest->id,
                    'full_name' => $guest->full_name,
                    'invite_count' => $guest->invite_count,
                    'arrived_count' => $guest->arrived_count,
                    'remaining' => $guest->remaining_invites,
                    'photo_url' => $guest->photo_path ? Storage::url($guest->photo_path) : null,
                ],
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Atomic update with lock
            $updated = DB::table('event_guests')
                ->where('id', $guest->id)
                ->where('arrived_count', $guest->arrived_count) // Optimistic lock
                ->update([
                    'arrived_count' => $newArrivedCount,
                    'status' => 'checked_in',
                    'updated_at' => now(),
                ]);

            if (!$updated) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'error' => 'Concurrent update detected. Please retry.',
                    'code' => 'CONCURRENT_UPDATE',
                ], 409);
            }

            // Log the check-in
            EventCheckin::create([
                'event_id' => $eventId,
                'guest_id' => $guest->id,
                'scanned_at' => now(),
                'arrived_increment' => $arrivedIncrement,
                'device_id' => $validated['device_id'] ?? null,
                'user_id' => $user->id,
                'notes' => $validated['notes'] ?? null,
            ]);

            DB::commit();

            // Refresh guest data
            $guest->refresh();

            Log::info("Guest checked in", [
                'guest_id' => $guest->id,
                'event_id' => $eventId,
                'increment' => $arrivedIncrement,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Check-in successful',
                'guest' => [
                    'id' => $guest->id,
                    'guest_code' => $guest->guest_code,
                    'full_name' => $guest->full_name,
                    'guest_type' => $guest->guest_type,
                    'invite_count' => $guest->invite_count,
                    'arrived_count' => $guest->arrived_count,
                    'remaining' => $guest->remaining_invites,
                    'status' => $guest->status,
                    'photo_url' => $guest->photo_path ? Storage::url($guest->photo_path) : null,
                ],
                'checkin' => [
                    'arrived_increment' => $arrivedIncrement,
                    'scanned_at' => now()->toIso8601String(),
                ],
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Check-in failed: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Check-in failed',
                'code' => 'INTERNAL_ERROR',
            ], 500);
        }
    }

    /**
     * Get check-in history for an event
     */
    public function history(Request $request, string $eventId)
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

        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $query = EventCheckin::with(['guest:id,full_name,guest_code,photo_path', 'user:id,email'])
            ->where('event_id', $eventId);

        // Date filter
        if ($request->has('date') && $request->date) {
            $date = $request->date;
            $query->whereDate('scanned_at', $date);
        }

        // Pagination
        $perPage = $request->input('per_page', 50);
        $allowedPerPage = [25, 50, 100];
        if (!in_array((int)$perPage, $allowedPerPage)) {
            $perPage = 50;
        }

        $checkins = $query->orderBy('scanned_at', 'desc')
            ->paginate((int)$perPage);

        // Transform
        $checkins->getCollection()->transform(function ($checkin) {
            return [
                'id' => $checkin->id,
                'guest_id' => $checkin->guest_id,
                'guest_name' => $checkin->guest->full_name ?? null,
                'guest_code' => $checkin->guest->guest_code ?? null,
                'guest_photo_url' => $checkin->guest->photo_path
                    ? Storage::url($checkin->guest->photo_path)
                    : null,
                'arrived_increment' => $checkin->arrived_increment,
                'scanned_at' => $checkin->scanned_at,
                'device_id' => $checkin->device_id,
                'scanned_by' => $checkin->user->email ?? null,
                'notes' => $checkin->notes,
            ];
        });

        return response()->json($checkins);
    }

    /**
     * Lookup guest by QR token (for scanner preview)
     */
    public function lookupByToken(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'qr_token' => 'required_without:guest_code|string',
            'guest_code' => 'required_without:qr_token|string',
        ]);

        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $query = EventGuest::where('event_id', $eventId)
            ->whereNull('deleted_at');

        if (!empty($validated['qr_token'])) {
            $query->where('qr_token', $validated['qr_token']);
        } else {
            $query->where('guest_code', $validated['guest_code']);
        }

        $guest = $query->first();

        if (!$guest) {
            return response()->json([
                'found' => false,
                'error' => 'Guest not found',
            ], 404);
        }

        return response()->json([
            'found' => true,
            'guest' => [
                'id' => $guest->id,
                'guest_code' => $guest->guest_code,
                'full_name' => $guest->full_name,
                'guest_type' => $guest->guest_type,
                'invite_count' => $guest->invite_count,
                'arrived_count' => $guest->arrived_count,
                'remaining' => $guest->remaining_invites,
                'status' => $guest->status,
                'photo_url' => $guest->photo_path ? Storage::url($guest->photo_path) : null,
            ],
        ]);
    }

    /**
     * Undo last check-in for a guest
     */
    public function undoCheckin(Request $request, string $eventId, string $checkinId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $checkin = EventCheckin::where('id', $checkinId)
            ->where('event_id', $eventId)
            ->first();

        if (!$checkin) {
            return response()->json(['error' => 'Check-in not found'], 404);
        }

        // Verify event belongs to org
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        try {
            DB::beginTransaction();

            // Decrement arrived count
            DB::table('event_guests')
                ->where('id', $checkin->guest_id)
                ->decrement('arrived_count', $checkin->arrived_increment);

            // Update status if no arrivals left
            $guest = EventGuest::find($checkin->guest_id);
            if ($guest && $guest->arrived_count <= 0) {
                $guest->update(['status' => 'invited', 'arrived_count' => 0]);
            }

            // Delete the check-in record
            $checkin->delete();

            DB::commit();

            Log::info("Check-in undone", [
                'checkin_id' => $checkinId,
                'guest_id' => $checkin->guest_id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Check-in undone successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to undo check-in: " . $e->getMessage());
            return response()->json(['error' => 'Failed to undo check-in'], 500);
        }
    }
}
