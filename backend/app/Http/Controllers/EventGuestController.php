<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventGuest;
use App\Models\EventGuestFieldValue;
use App\Models\EventTypeField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class EventGuestController extends Controller
{
    /**
     * Display a listing of guests for an event (optimized for 10k+)
     */
    public function index(Request $request, string $eventId)
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

        // Verify event belongs to user's organization
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        // Lightweight query - only return essential fields for list view
        $query = EventGuest::select([
                'id', 'guest_code', 'guest_type', 'full_name', 'phone',
                'invite_count', 'arrived_count', 'status', 'photo_path', 'created_at'
            ])
            ->where('event_id', $eventId)
            ->whereNull('deleted_at');

        // Search by name, phone, or guest_code
        if ($request->has('q') && $request->q) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('guest_code', 'ilike', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by guest_type
        if ($request->has('guest_type') && $request->guest_type) {
            $query->where('guest_type', $request->guest_type);
        }

        // Pagination (required for 10k+ guests)
        $perPage = $request->input('per_page', 50);
        $allowedPerPage = [25, 50, 100, 200];
        if (!in_array((int)$perPage, $allowedPerPage)) {
            $perPage = 50;
        }

        $sortBy = $request->input('sort_by', 'full_name');
        $sortDir = $request->input('sort_dir', 'asc');
        $allowedSorts = ['full_name', 'guest_code', 'created_at', 'status', 'arrived_count'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'full_name';
        }

        $guests = $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc')
            ->paginate((int)$perPage);

        // Transform photo_path to URL
        $guests->getCollection()->transform(function ($guest) {
            $guest->photo_thumb_url = $guest->photo_path
                ? Storage::url($guest->photo_path)
                : null;
            unset($guest->photo_path);
            return $guest;
        });

        return response()->json($guests);
    }

    /**
     * Fast lookup endpoint for search (returns top 20)
     */
    public function lookup(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $search = $request->input('q', '');
        if (strlen($search) < 2) {
            return response()->json([]);
        }

        $guests = EventGuest::select([
                'id', 'guest_code', 'full_name', 'phone',
                'invite_count', 'arrived_count', 'status', 'photo_path'
            ])
            ->where('event_id', $eventId)
            ->whereNull('deleted_at')
            ->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('guest_code', 'ilike', "%{$search}%");
            })
            ->orderBy('full_name')
            ->limit(20)
            ->get();

        // Transform photo_path to URL
        $guests->transform(function ($guest) {
            $guest->photo_thumb_url = $guest->photo_path
                ? Storage::url($guest->photo_path)
                : null;
            unset($guest->photo_path);
            return $guest;
        });

        return response()->json($guests);
    }

    /**
     * Store a newly created guest
     */
    public function store(Request $request, string $eventId)
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

        $validated = $request->validate([
            'full_name' => 'required|string|max:200',
            'phone' => 'nullable|string|max:20',
            'guest_type' => 'required|in:student,parent,teacher,staff,vip,external',
            'invite_count' => 'integer|min:1|max:100',
            'status' => 'in:invited,checked_in,blocked',
            'field_values' => 'array',
            'field_values.*.field_id' => 'required|uuid|exists:event_type_fields,id',
            'field_values.*.value' => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            $guest = EventGuest::create([
                'event_id' => $eventId,
                'organization_id' => $profile->organization_id,
                'school_id' => $event->school_id,
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'guest_type' => $validated['guest_type'],
                'invite_count' => $validated['invite_count'] ?? 1,
                'status' => $validated['status'] ?? 'invited',
            ]);

            // Save dynamic field values
            if (!empty($validated['field_values'])) {
                foreach ($validated['field_values'] as $fieldValue) {
                    $value = $fieldValue['value'];
                    EventGuestFieldValue::create([
                        'guest_id' => $guest->id,
                        'field_id' => $fieldValue['field_id'],
                        'value_text' => is_array($value) ? null : $value,
                        'value_json' => is_array($value) ? $value : null,
                    ]);
                }
            }

            DB::commit();

            Log::info("Guest created", ['id' => $guest->id, 'event_id' => $eventId]);

            // Return guest with generated codes
            return response()->json([
                'id' => $guest->id,
                'guest_code' => $guest->guest_code,
                'qr_token' => $guest->qr_token,
                'full_name' => $guest->full_name,
                'phone' => $guest->phone,
                'guest_type' => $guest->guest_type,
                'invite_count' => $guest->invite_count,
                'status' => $guest->status,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to create guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create guest: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified guest with field values
     */
    public function show(Request $request, string $eventId, string $guestId)
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

        $guest = EventGuest::with(['fieldValues.field', 'checkins' => function($q) {
                $q->orderBy('scanned_at', 'desc')->limit(10);
            }, 'checkins.user:id,email'])
            ->where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        // Transform for response
        $guest->photo_url = $guest->photo_path
            ? Storage::url($guest->photo_path)
            : null;

        // Group field values by field group
        $fieldValues = $guest->fieldValues->map(function ($fv) {
            return [
                'field_id' => $fv->field_id,
                'field_key' => $fv->field->key ?? null,
                'field_label' => $fv->field->label ?? null,
                'field_type' => $fv->field->field_type ?? null,
                'field_group_id' => $fv->field->field_group_id ?? null,
                'value' => $fv->value_json ?? $fv->value_text,
            ];
        });

        return response()->json([
            'id' => $guest->id,
            'guest_code' => $guest->guest_code,
            'qr_token' => $guest->qr_token,
            'full_name' => $guest->full_name,
            'phone' => $guest->phone,
            'guest_type' => $guest->guest_type,
            'invite_count' => $guest->invite_count,
            'arrived_count' => $guest->arrived_count,
            'remaining_invites' => $guest->remaining_invites,
            'status' => $guest->status,
            'photo_url' => $guest->photo_url,
            'field_values' => $fieldValues,
            'checkins' => $guest->checkins,
            'created_at' => $guest->created_at,
            'updated_at' => $guest->updated_at,
        ]);
    }

    /**
     * Update the specified guest
     */
    public function update(Request $request, string $eventId, string $guestId)
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

        $guest = EventGuest::where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:200',
            'phone' => 'nullable|string|max:20',
            'guest_type' => 'sometimes|required|in:student,parent,teacher,staff,vip,external',
            'invite_count' => 'sometimes|integer|min:1|max:100',
            'status' => 'in:invited,checked_in,blocked',
            'field_values' => 'array',
            'field_values.*.field_id' => 'required|uuid|exists:event_type_fields,id',
            'field_values.*.value' => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            // Update core fields
            $guest->update([
                'full_name' => $validated['full_name'] ?? $guest->full_name,
                'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $guest->phone,
                'guest_type' => $validated['guest_type'] ?? $guest->guest_type,
                'invite_count' => $validated['invite_count'] ?? $guest->invite_count,
                'status' => $validated['status'] ?? $guest->status,
            ]);

            // Update dynamic field values
            if (isset($validated['field_values'])) {
                foreach ($validated['field_values'] as $fieldValue) {
                    $value = $fieldValue['value'];
                    EventGuestFieldValue::updateOrCreate(
                        [
                            'guest_id' => $guest->id,
                            'field_id' => $fieldValue['field_id'],
                        ],
                        [
                            'value_text' => is_array($value) ? null : $value,
                            'value_json' => is_array($value) ? $value : null,
                        ]
                    );
                }
            }

            DB::commit();

            Log::info("Guest updated", ['id' => $guest->id]);

            return response()->json($guest);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update guest'], 500);
        }
    }

    /**
     * Remove the specified guest
     */
    public function destroy(Request $request, string $eventId, string $guestId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $guest = EventGuest::where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        try {
            $guest->delete();
            Log::info("Guest deleted", ['id' => $guestId]);
            return response()->json(['message' => 'Guest deleted successfully']);
        } catch (\Exception $e) {
            Log::error("Failed to delete guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to delete guest'], 500);
        }
    }

    /**
     * Upload guest photo
     */
    public function uploadPhoto(Request $request, string $guestId)
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

        $guest = EventGuest::where('id', $guestId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120', // 5MB max
        ]);

        try {
            $file = $request->file('photo');
            $eventId = $guest->event_id;
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();

            // Store original
            $path = "events/{$eventId}/guests/{$filename}";
            Storage::disk('public')->put($path, file_get_contents($file));

            // Create thumbnail
            try {
                $manager = new ImageManager(new Driver());
                $image = $manager->read($file->getPathname());
                $image->cover(200, 200);

                $thumbPath = "events/{$eventId}/guests/thumbs/{$filename}";
                Storage::disk('public')->put($thumbPath, $image->toJpeg(80));
            } catch (\Exception $e) {
                Log::warning("Failed to create thumbnail: " . $e->getMessage());
                // Continue without thumbnail
            }

            // Delete old photo if exists
            if ($guest->photo_path) {
                Storage::disk('public')->delete($guest->photo_path);
                $oldThumb = str_replace('/guests/', '/guests/thumbs/', $guest->photo_path);
                Storage::disk('public')->delete($oldThumb);
            }

            $guest->update(['photo_path' => $path]);

            Log::info("Guest photo uploaded", ['guest_id' => $guestId]);

            return response()->json([
                'photo_url' => Storage::url($path),
                'photo_thumb_url' => isset($thumbPath) ? Storage::url($thumbPath) : Storage::url($path),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to upload photo: " . $e->getMessage());
            return response()->json(['error' => 'Failed to upload photo'], 500);
        }
    }

    /**
     * Bulk import guests (stub for CSV import)
     */
    public function import(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.create')) {
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

        // TODO: Implement CSV import
        return response()->json([
            'message' => 'Import endpoint ready. CSV import coming soon.',
            'supported_columns' => ['full_name', 'phone', 'guest_type', 'invite_count'],
        ]);
    }
}
