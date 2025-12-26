<?php

namespace App\Http\Controllers;

use App\Models\EventType;
use App\Models\EventTypeField;
use App\Models\EventTypeFieldGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class EventTypeController extends Controller
{
    /**
     * Display a listing of event types
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = EventType::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Filter by is_active
        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Search by name
        if ($request->has('search') && $request->search) {
            $query->where('name', 'ilike', '%' . $request->search . '%');
        }

        $eventTypes = $query->orderBy('name', 'asc')->get();

        return response()->json($eventTypes);
    }

    /**
     * Store a newly created event type
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        try {
            $eventType = EventType::create([
                'organization_id' => $profile->organization_id,
                'school_id' => $currentSchoolId,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            Log::info("Event type created", ['id' => $eventType->id, 'name' => $eventType->name]);

            return response()->json($eventType, 201);
        } catch (\Exception $e) {
            Log::error("Failed to create event type: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create event type'], 500);
        }
    }

    /**
     * Display the specified event type
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventType = EventType::with(['fieldGroups', 'fields'])
            ->where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$eventType) {
            return response()->json(['error' => 'Event type not found'], 404);
        }

        return response()->json($eventType);
    }

    /**
     * Update the specified event type
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventType = EventType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$eventType) {
            return response()->json(['error' => 'Event type not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        try {
            $eventType->update($validated);
            Log::info("Event type updated", ['id' => $eventType->id]);
            return response()->json($eventType);
        } catch (\Exception $e) {
            Log::error("Failed to update event type: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update event type'], 500);
        }
    }

    /**
     * Remove the specified event type
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventType = EventType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$eventType) {
            return response()->json(['error' => 'Event type not found'], 404);
        }

        try {
            $eventType->delete();
            Log::info("Event type deleted", ['id' => $id]);
            return response()->noContent();
        } catch (\Exception $e) {
            Log::error("Failed to delete event type: " . $e->getMessage());
            return response()->json(['error' => 'Failed to delete event type'], 500);
        }
    }

    /**
     * Get fields for an event type
     */
    public function getFields(Request $request, string $id)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventType = EventType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$eventType) {
            return response()->json(['error' => 'Event type not found'], 404);
        }

        $fieldGroups = EventTypeFieldGroup::where('event_type_id', $id)
            ->orderBy('sort_order')
            ->get();

        $fields = EventTypeField::where('event_type_id', $id)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'field_groups' => $fieldGroups,
            'fields' => $fields,
        ]);
    }

    /**
     * Bulk save fields for an event type (Form Designer)
     */
    public function saveFields(Request $request, string $id)
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $eventType = EventType::where('id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$eventType) {
            return response()->json(['error' => 'Event type not found'], 404);
        }

        $validated = $request->validate([
            'field_groups' => 'array',
            'field_groups.*.id' => 'nullable|uuid',
            'field_groups.*.title' => 'required|string|max:100',
            'field_groups.*.sort_order' => 'required|integer',
            'fields' => 'array',
            'fields.*.id' => 'nullable|uuid',
            'fields.*.field_group_id' => 'nullable|uuid',
            'fields.*.key' => 'required|string|max:50',
            'fields.*.label' => 'required|string|max:100',
            'fields.*.field_type' => 'required|in:text,textarea,phone,number,select,multiselect,date,toggle,email,id_number,address,photo,file',
            'fields.*.is_required' => 'boolean',
            'fields.*.is_enabled' => 'boolean',
            'fields.*.sort_order' => 'required|integer',
            'fields.*.placeholder' => 'nullable|string|max:255',
            'fields.*.help_text' => 'nullable|string|max:255',
            'fields.*.validation_rules' => 'nullable|array',
            'fields.*.options' => 'nullable|array',
        ]);

        try {
            DB::beginTransaction();

            // Get existing IDs
            $existingGroupIds = EventTypeFieldGroup::where('event_type_id', $id)->pluck('id')->toArray();
            $existingFieldIds = EventTypeField::where('event_type_id', $id)->pluck('id')->toArray();

            $newGroupIds = [];
            $groupIdMap = []; // Maps client-side temp IDs to real IDs

            // Process field groups
            foreach ($validated['field_groups'] ?? [] as $groupData) {
                if (!empty($groupData['id']) && in_array($groupData['id'], $existingGroupIds)) {
                    // Update existing group
                    EventTypeFieldGroup::where('id', $groupData['id'])->update([
                        'title' => $groupData['title'],
                        'sort_order' => $groupData['sort_order'],
                    ]);
                    $newGroupIds[] = $groupData['id'];
                    $groupIdMap[$groupData['id']] = $groupData['id'];
                } else {
                    // Create new group
                    $group = EventTypeFieldGroup::create([
                        'event_type_id' => $id,
                        'title' => $groupData['title'],
                        'sort_order' => $groupData['sort_order'],
                    ]);
                    $newGroupIds[] = $group->id;
                    if (!empty($groupData['id'])) {
                        $groupIdMap[$groupData['id']] = $group->id;
                    }
                }
            }

            // Delete removed groups
            $groupsToDelete = array_diff($existingGroupIds, $newGroupIds);
            if (!empty($groupsToDelete)) {
                EventTypeFieldGroup::whereIn('id', $groupsToDelete)->delete();
            }

            $newFieldIds = [];

            // Process fields
            foreach ($validated['fields'] ?? [] as $fieldData) {
                // Map field_group_id if it's a temp ID
                $fieldGroupId = $fieldData['field_group_id'] ?? null;
                if ($fieldGroupId && isset($groupIdMap[$fieldGroupId])) {
                    $fieldGroupId = $groupIdMap[$fieldGroupId];
                }

                $fieldRecord = [
                    'event_type_id' => $id,
                    'field_group_id' => $fieldGroupId,
                    'key' => $fieldData['key'],
                    'label' => $fieldData['label'],
                    'field_type' => $fieldData['field_type'],
                    'is_required' => $fieldData['is_required'] ?? false,
                    'is_enabled' => $fieldData['is_enabled'] ?? true,
                    'sort_order' => $fieldData['sort_order'],
                    'placeholder' => $fieldData['placeholder'] ?? null,
                    'help_text' => $fieldData['help_text'] ?? null,
                    'validation_rules' => $fieldData['validation_rules'] ?? null,
                    'options' => $fieldData['options'] ?? null,
                ];

                if (!empty($fieldData['id']) && in_array($fieldData['id'], $existingFieldIds)) {
                    // Update existing field
                    EventTypeField::where('id', $fieldData['id'])->update($fieldRecord);
                    $newFieldIds[] = $fieldData['id'];
                } else {
                    // Create new field
                    $field = EventTypeField::create($fieldRecord);
                    $newFieldIds[] = $field->id;
                }
            }

            // Delete removed fields
            $fieldsToDelete = array_diff($existingFieldIds, $newFieldIds);
            if (!empty($fieldsToDelete)) {
                EventTypeField::whereIn('id', $fieldsToDelete)->delete();
            }

            DB::commit();

            Log::info("Event type fields saved", ['event_type_id' => $id]);

            // Return updated data
            return $this->getFields($request, $id);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to save event type fields: " . $e->getMessage());
            return response()->json(['error' => 'Failed to save fields: ' . $e->getMessage()], 500);
        }
    }
}
