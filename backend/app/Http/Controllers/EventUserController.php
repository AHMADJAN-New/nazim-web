<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Profile;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EventUserController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {
    }

    /**
     * List event-specific users for an event
     */
    public function index(Request $request, string $eventId)
    {
        try {
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
                Log::warning("Permission check failed for events.update: " . $e->getMessage());
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
            // Note: Event users are event-specific, not school-specific, so we don't filter by school_id
            $eventUsers = DB::table('profiles')
                ->where('event_id', $eventId)
                ->where('is_event_user', true)
                ->where('organization_id', $profile->organization_id)
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
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            // Re-throw HTTP exceptions (like abort()) so they return proper status codes
            throw $e;
        } catch (\Exception $e) {
            Log::error("Failed to list event users: " . $e->getMessage(), [
                'event_id' => $eventId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to retrieve event users'], 500);
        }
    }

    /**
     * Create an event-specific user
     */
    public function store(Request $request, string $eventId)
    {
        try {
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
                Log::warning("Permission check failed for events.update: " . $e->getMessage());
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

            if (!in_array('events.read', $validated['permissions'], true)) {
                $validated['permissions'][] = 'events.read';
            }

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
            // Note: Event users use default_school_id (not school_id) to track their school association
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $validated['email'],
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'organization_id' => $profile->organization_id,
                'default_school_id' => $currentSchoolId,
                'event_id' => $eventId,
                'is_event_user' => true,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Assign permissions
            $permissionIds = DB::connection('pgsql')
                ->table('permissions')
                ->whereIn('name', $validated['permissions'])
                ->where('organization_id', $profile->organization_id)
                ->pluck('id');

            if ($permissionIds->isEmpty()) {
                Log::warning("No permissions found for event user", [
                    'requested_permissions' => $validated['permissions'],
                    'organization_id' => $profile->organization_id,
                ]);
            }

            $tableNames = config('permission.table_names');
            $columnNames = config('permission.column_names');
            $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
            $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

            $assignedCount = 0;
            $skippedCount = 0;

            foreach ($permissionIds as $permissionId) {
                // Check if permission already exists (avoid duplicates and primary key conflicts)
                $exists = DB::connection('pgsql')
                    ->table($modelHasPermissionsTable)
                    ->where('permission_id', $permissionId)
                    ->where($modelMorphKey, $userId)
                    ->where('model_type', User::class)
                    ->where('organization_id', $profile->organization_id)
                    ->exists();

                if (!$exists) {
                    DB::connection('pgsql')
                        ->table($modelHasPermissionsTable)
                        ->insert([
                            'permission_id' => $permissionId,
                            $modelMorphKey => $userId,
                            'model_type' => User::class,
                            'organization_id' => $profile->organization_id,
                        ]);
                    $assignedCount++;
                } else {
                    $skippedCount++;
                }
            }

            // Clear permission cache
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

            // Verify permissions were actually saved
            $savedPermissions = DB::connection('pgsql')
                ->table($modelHasPermissionsTable)
                ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
                ->where($modelMorphKey, $userId)
                ->where($modelHasPermissionsTable . '.model_type', User::class)
                ->where($modelHasPermissionsTable . '.organization_id', $profile->organization_id)
                ->pluck('permissions.name')
                ->toArray();

            Log::info("Event user permissions assigned", [
                'user_id' => $userId,
                'assigned_count' => $assignedCount,
                'skipped_count' => $skippedCount,
                'total_permissions' => $permissionIds->count(),
                'saved_permissions' => $savedPermissions,
                'requested_permissions' => $validated['permissions'],
            ]);

            DB::commit();

            Log::info("Event-specific user created", [
                'event_id' => $eventId,
                'user_id' => $userId,
                'email' => $validated['email'],
            ]);

            // Log event user creation
            try {
                $eventTitle = $event->title ?? 'Unknown';
                $this->activityLogService->logCreate(
                    subject: (object)['id' => $userId, 'email' => $validated['email']],
                    description: "Created event-specific user {$validated['email']} for event {$eventTitle}",
                    properties: [
                        'user_id' => $userId,
                        'event_id' => $eventId,
                        'email' => $validated['email'],
                        'full_name' => $validated['full_name'],
                        'permissions_count' => count($validated['permissions']),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log event user creation: ' . $e->getMessage());
            }

            return response()->json([
                'id' => $userId,
                'email' => $validated['email'],
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'is_active' => true,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            // Re-throw HTTP exceptions (like abort()) so they return proper status codes
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to create event user: " . $e->getMessage(), [
                'event_id' => $eventId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to create event user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an event-specific user
     */
    public function update(Request $request, string $eventId, string $userId)
    {
        try {
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
                Log::warning("Permission check failed for events.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            // Verify event user belongs to this event
            // Note: Event users are event-specific, not school-specific, so we don't filter by school_id
            $eventUser = DB::table('profiles')
                ->where('id', $userId)
                ->where('event_id', $eventId)
                ->where('is_event_user', true)
                ->where('organization_id', $profile->organization_id)
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

            DB::beginTransaction();

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
                if (!in_array('events.read', $validated['permissions'], true)) {
                    $validated['permissions'][] = 'events.read';
                }

                $tableNames = config('permission.table_names');
                $columnNames = config('permission.column_names');
                $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
                $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

                // Remove existing permissions for this user (only for this organization)
                DB::connection('pgsql')
                    ->table($modelHasPermissionsTable)
                    ->where($modelMorphKey, $userId)
                    ->where('model_type', User::class)
                    ->where('organization_id', $profile->organization_id)
                    ->delete();

                // Assign new permissions
                $permissionIds = DB::connection('pgsql')
                    ->table('permissions')
                    ->whereIn('name', $validated['permissions'])
                    ->where('organization_id', $profile->organization_id)
                    ->pluck('id');

                if ($permissionIds->isEmpty()) {
                    Log::warning("No permissions found when updating event user", [
                        'requested_permissions' => $validated['permissions'],
                        'organization_id' => $profile->organization_id,
                        'user_id' => $userId,
                    ]);
                }

                $assignedCount = 0;
                foreach ($permissionIds as $permissionId) {
                    // Check if permission already exists (shouldn't happen after delete, but be safe)
                    $exists = DB::connection('pgsql')
                        ->table($modelHasPermissionsTable)
                        ->where('permission_id', $permissionId)
                        ->where($modelMorphKey, $userId)
                        ->where('model_type', User::class)
                        ->where('organization_id', $profile->organization_id)
                        ->exists();

                    if (!$exists) {
                        DB::connection('pgsql')
                            ->table($modelHasPermissionsTable)
                            ->insert([
                                'permission_id' => $permissionId,
                                $modelMorphKey => $userId,
                                'model_type' => User::class,
                                'organization_id' => $profile->organization_id,
                            ]);
                        $assignedCount++;
                    }
                }

                // Clear permission cache
                app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

                // Verify permissions were actually saved
                $savedPermissions = DB::connection('pgsql')
                    ->table($modelHasPermissionsTable)
                    ->join('permissions', $modelHasPermissionsTable . '.permission_id', '=', 'permissions.id')
                    ->where($modelMorphKey, $userId)
                    ->where($modelHasPermissionsTable . '.model_type', User::class)
                    ->where($modelHasPermissionsTable . '.organization_id', $profile->organization_id)
                    ->pluck('permissions.name')
                    ->toArray();

                Log::info("Event user permissions updated", [
                    'user_id' => $userId,
                    'assigned_count' => $assignedCount,
                    'total_permissions' => $permissionIds->count(),
                    'saved_permissions' => $savedPermissions,
                    'requested_permissions' => $validated['permissions'],
                ]);
            }

            DB::commit();

            Log::info("Event user updated", [
                'event_id' => $eventId,
                'user_id' => $userId,
            ]);

            // Log event user update
            try {
                $event = Event::find($eventId);
                $eventTitle = $event?->title ?? 'Unknown';
                $this->activityLogService->logUpdate(
                    subject: (object)['id' => $userId, 'email' => $eventUser->email],
                    description: "Updated event-specific user {$eventUser->email} for event {$eventTitle}",
                    properties: [
                        'user_id' => $userId,
                        'event_id' => $eventId,
                        'old_values' => [
                            'full_name' => $eventUser->full_name,
                            'phone' => $eventUser->phone,
                            'is_active' => $eventUser->is_active,
                        ],
                        'new_values' => [
                            'full_name' => $updates['full_name'] ?? $eventUser->full_name,
                            'phone' => $updates['phone'] ?? $eventUser->phone,
                            'is_active' => $updates['is_active'] ?? $eventUser->is_active,
                        ],
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log event user update: ' . $e->getMessage());
            }

            return response()->json(['message' => 'Event user updated successfully']);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Validation failed',
                'details' => $e->errors(),
            ], 422);
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            // Re-throw HTTP exceptions (like abort()) so they return proper status codes
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update event user: " . $e->getMessage(), [
                'event_id' => $eventId,
                'user_id' => $userId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to update event user: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete (deactivate) an event-specific user
     */
    public function destroy(Request $request, string $eventId, string $userId)
    {
        try {
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
                Log::warning("Permission check failed for events.update: " . $e->getMessage());
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }

            // Verify event user belongs to this event
            // Note: Event users are event-specific, not school-specific, so we don't filter by school_id
            $eventUser = DB::table('profiles')
                ->where('id', $userId)
                ->where('event_id', $eventId)
                ->where('is_event_user', true)
                ->where('organization_id', $profile->organization_id)
                ->first();

            if (!$eventUser) {
                return response()->json(['error' => 'Event user not found'], 404);
            }

            // Log event user deletion (deactivation)
            try {
                $event = Event::find($eventId);
                $eventTitle = $event?->title ?? 'Unknown';
                $this->activityLogService->logDelete(
                    subject: (object)['id' => $userId, 'email' => $eventUser->email],
                    description: "Deactivated event-specific user {$eventUser->email} for event {$eventTitle}",
                    properties: [
                        'user_id' => $userId,
                        'event_id' => $eventId,
                        'email' => $eventUser->email,
                        'full_name' => $eventUser->full_name,
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log event user deletion: ' . $e->getMessage());
            }

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
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            // Re-throw HTTP exceptions (like abort()) so they return proper status codes
            throw $e;
        } catch (\Exception $e) {
            Log::error("Failed to deactivate event user: " . $e->getMessage(), [
                'event_id' => $eventId,
                'user_id' => $userId,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to deactivate event user: ' . $e->getMessage()], 500);
        }
    }
}
