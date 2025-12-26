<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EventUserController extends Controller
{
    /**
     * List event-specific users for an event
     */
    public function index(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        // Get event-specific users
        $eventUsers = DB::table('profiles')
            ->where('event_id', $eventId)
            ->where('is_event_user', true)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->select([
                'id',
                'email',
                'full_name',
                'phone',
                'is_active',
                'created_at',
                'updated_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($eventUsers);
    }

    /**
     * Create an event-specific user
     */
    public function store(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'email' => 'required|email|max:255|unique:users,email',
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'password' => 'required|string|min:8',
            'permissions' => 'required|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        try {
            DB::beginTransaction();

            // Create user
            $userId = (string) Str::uuid();
            DB::table('users')->insert([
                'id' => $userId,
                'email' => $validated['email'],
                'encrypted_password' => Hash::make($validated['password']),
                'email_confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create profile as event-specific user
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $validated['email'],
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'event_id' => $eventId,
                'is_event_user' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Assign permissions
            $permissionIds = DB::table('permissions')
                ->whereIn('name', $validated['permissions'])
                ->where(function($q) use ($profile) {
                    $q->whereNull('organization_id')
                      ->orWhere('organization_id', $profile->organization_id);
                })
                ->pluck('id');

            $tableNames = config('permission.table_names');
            $columnNames = config('permission.column_names');
            $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
            $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

            foreach ($permissionIds as $permissionId) {
                DB::table($modelHasPermissionsTable)->insert([
                    'permission_id' => $permissionId,
                    $modelMorphKey => $userId,
                    'model_type' => User::class,
                    'organization_id' => $profile->organization_id,
                ]);
            }

            DB::commit();

            Log::info("Event-specific user created", [
                'event_id' => $eventId,
                'user_id' => $userId,
                'email' => $validated['email'],
            ]);

            return response()->json([
                'id' => $userId,
                'email' => $validated['email'],
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'is_active' => true,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to create event user: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create event user'], 500);
        }
    }

    /**
     * Update an event-specific user
     */
    public function update(Request $request, string $eventId, string $userId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('events.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify event user belongs to this event
        $eventUser = DB::table('profiles')
            ->where('id', $userId)
            ->where('event_id', $eventId)
            ->where('is_event_user', true)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->first();

        if (!$eventUser) {
            return response()->json(['error' => 'Event user not found'], 404);
        }

        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'password' => 'sometimes|nullable|string|min:8',
            'is_active' => 'sometimes|boolean',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        try {
            $updates = [];
            if (isset($validated['full_name'])) {
                $updates['full_name'] = $validated['full_name'];
            }
            if (isset($validated['phone'])) {
                $updates['phone'] = $validated['phone'];
            }
            if (isset($validated['is_active'])) {
                $updates['is_active'] = $validated['is_active'];
            }
            $updates['updated_at'] = now();

            DB::table('profiles')
                ->where('id', $userId)
                ->update($updates);

            // Update password if provided and not empty
            if (isset($validated['password']) && !empty(trim($validated['password']))) {
                DB::table('users')
                    ->where('id', $userId)
                    ->update([
                        'encrypted_password' => Hash::make($validated['password']),
                        'updated_at' => now(),
                    ]);
            }

            // Update permissions if provided
            if (isset($validated['permissions'])) {
                $tableNames = config('permission.table_names');
                $columnNames = config('permission.column_names');
                $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
                $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

                // Remove existing permissions for this user
                DB::table($modelHasPermissionsTable)
                    ->where($modelMorphKey, $userId)
                    ->where('model_type', User::class)
                    ->where('organization_id', $profile->organization_id)
                    ->delete();

                // Assign new permissions
                $permissionIds = DB::table('permissions')
                    ->whereIn('name', $validated['permissions'])
                    ->where(function($q) use ($profile) {
                        $q->whereNull('organization_id')
                          ->orWhere('organization_id', $profile->organization_id);
                    })
                    ->pluck('id');

                foreach ($permissionIds as $permissionId) {
                    DB::table($modelHasPermissionsTable)->insert([
                        'permission_id' => $permissionId,
                        $modelMorphKey => $userId,
                        'model_type' => User::class,
                        'organization_id' => $profile->organization_id,
                    ]);
                }
            }

            Log::info("Event user updated", [
                'event_id' => $eventId,
                'user_id' => $userId,
            ]);

            return response()->json(['message' => 'Event user updated successfully']);
        } catch (\Exception $e) {
            Log::error("Failed to update event user: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update event user'], 500);
        }
    }

    /**
     * Delete (deactivate) an event-specific user
     */
    public function destroy(Request $request, string $eventId, string $userId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        try {
            if (!$user->hasPermissionTo('events.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Verify event user belongs to this event
        $eventUser = DB::table('profiles')
            ->where('id', $userId)
            ->where('event_id', $eventId)
            ->where('is_event_user', true)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->first();

        if (!$eventUser) {
            return response()->json(['error' => 'Event user not found'], 404);
        }

        try {
            // Deactivate the user (soft delete by setting is_active = false)
            DB::table('profiles')
                ->where('id', $userId)
                ->update([
                    'is_active' => false,
                    'updated_at' => now(),
                ]);

            Log::info("Event user deactivated", [
                'event_id' => $eventId,
                'user_id' => $userId,
            ]);

            return response()->noContent();
        } catch (\Exception $e) {
            Log::error("Failed to deactivate event user: " . $e->getMessage());
            return response()->json(['error' => 'Failed to deactivate event user'], 500);
        }
    }
}
