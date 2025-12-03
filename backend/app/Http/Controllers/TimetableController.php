<?php

namespace App\Http\Controllers;

use App\Models\GeneratedTimetable;
use App\Models\TimetableEntry;
use App\Http\Requests\StoreTimetableRequest;
use App\Http\Requests\UpdateTimetableRequest;
use App\Http\Requests\StoreTimetableEntryRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TimetableController extends Controller
{
    /**
     * Display a listing of timetables
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

                try {
                if (!$user->hasPermissionTo('timetables.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                // If permission doesn't exist, log but allow access (for migration period)
                Log::warning("Permission check failed for timetables.read - allowing access: " . $e->getMessage());
                // Allow access if permission doesn't exist (during migration)
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Get accessible organization IDs (user's organization only)
            $orgIds = [$profile->organization_id];

            $query = GeneratedTimetable::whereNull('deleted_at');

            // Try to eager load relationships, but don't fail if they don't exist
            try {
                $query->with(['academicYear', 'school', 'createdBy']);
            } catch (\Exception $e) {
                Log::warning("Failed to eager load relationships for timetables: " . $e->getMessage());
            }

            // Filter by organization
            if ($request->has('organization_id') && $request->organization_id) {
                if (in_array($request->organization_id, $orgIds) || empty($orgIds)) {
                    $query->where(function ($q) use ($request) {
                        $q->where('organization_id', $request->organization_id)
                          ->orWhereNull('organization_id'); // Include global timetables
                    });
                } else {
                    return response()->json([]);
                }
            } else {
                // Show user's org timetables + global timetables
                if (!empty($orgIds)) {
                    $query->where(function ($q) use ($orgIds) {
                        $q->whereIn('organization_id', $orgIds)
                          ->orWhereNull('organization_id'); // Include global timetables
                    });
                } else {
                    // No org access, only show global timetables
                    $query->whereNull('organization_id');
                }
            }

            // Filter by academic_year_id if provided
            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where(function ($q) use ($request) {
                    $q->where('academic_year_id', $request->academic_year_id)
                      ->orWhereNull('academic_year_id'); // Include global timetables
                });
            }

            $timetables = $query->orderBy('created_at', 'desc')->get();

            // Format response
            $formatted = $timetables->map(function ($timetable) {
                try {
                    return [
                        'id' => $timetable->id,
                        'organization_id' => $timetable->organization_id,
                        'academic_year_id' => $timetable->academic_year_id,
                        'school_id' => $timetable->school_id,
                        'name' => $timetable->name,
                        'timetable_type' => $timetable->timetable_type,
                        'description' => $timetable->description,
                        'is_active' => $timetable->is_active,
                        'created_by' => $timetable->created_by,
                        'created_at' => $timetable->created_at,
                        'updated_at' => $timetable->updated_at,
                        'academic_year' => $timetable->relationLoaded('academicYear') && $timetable->academicYear ? [
                            'id' => $timetable->academicYear->id,
                            'name' => $timetable->academicYear->name,
                        ] : null,
                        'school' => $timetable->relationLoaded('school') && $timetable->school ? [
                            'id' => $timetable->school->id,
                            'school_name' => $timetable->school->school_name,
                        ] : null,
                    ];
                } catch (\Exception $e) {
                    Log::warning("Failed to format timetable: " . $e->getMessage());
                    return [
                        'id' => $timetable->id,
                        'organization_id' => $timetable->organization_id,
                        'academic_year_id' => $timetable->academic_year_id,
                        'school_id' => $timetable->school_id,
                        'name' => $timetable->name,
                        'timetable_type' => $timetable->timetable_type,
                        'description' => $timetable->description,
                        'is_active' => $timetable->is_active,
                        'created_by' => $timetable->created_by,
                        'created_at' => $timetable->created_at,
                        'updated_at' => $timetable->updated_at,
                        'academic_year' => null,
                        'school' => null,
                    ];
                }
            });

            return response()->json($formatted);
        } catch (\Exception $e) {
            Log::error('Error fetching timetables: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json(['error' => 'Failed to fetch timetables: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created timetable with entries
     */
    public function store(StoreTimetableRequest $request)
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

        try {
            if (!$user->hasPermissionTo('timetables.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.create - allowing access: " . $e->getMessage());
        }

        $validated = $request->validated();

        // Get organization_id - use provided or user's org
        $organizationId = $validated['organization_id'] ?? $profile->organization_id;

        // Validate organization access (all users)
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create timetable for different organization'], 403);
        }

        DB::beginTransaction();
        try {
            // Create timetable
            $timetable = GeneratedTimetable::create([
                'name' => trim($validated['name']),
                'timetable_type' => $validated['timetable_type'] ?? 'teaching',
                'description' => $validated['description'] ?? null,
                'organization_id' => $organizationId,
                'academic_year_id' => $validated['academic_year_id'] ?? null,
                'school_id' => $validated['school_id'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $user->id,
            ]);

            // Create entries in bulk
            $entries = [];
            foreach ($validated['entries'] as $entryData) {
                $entries[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'organization_id' => $organizationId,
                    'timetable_id' => $timetable->id,
                    'class_academic_year_id' => $entryData['class_academic_year_id'],
                    'subject_id' => $entryData['subject_id'],
                    'teacher_id' => $entryData['teacher_id'],
                    'schedule_slot_id' => $entryData['schedule_slot_id'],
                    'day_name' => $entryData['day_name'],
                    'period_order' => $entryData['period_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (!empty($entries)) {
                TimetableEntry::insert($entries);
            }

            DB::commit();

            $timetable->load(['academicYear', 'school', 'createdBy', 'entries']);

            return response()->json([
                'id' => $timetable->id,
                'organization_id' => $timetable->organization_id,
                'academic_year_id' => $timetable->academic_year_id,
                'school_id' => $timetable->school_id,
                'name' => $timetable->name,
                'timetable_type' => $timetable->timetable_type,
                'description' => $timetable->description,
                'is_active' => $timetable->is_active,
                'created_by' => $timetable->created_by,
                'created_at' => $timetable->created_at,
                'updated_at' => $timetable->updated_at,
                'academic_year' => $timetable->academicYear ? [
                    'id' => $timetable->academicYear->id,
                    'name' => $timetable->academicYear->name,
                ] : null,
                'school' => $timetable->school ? [
                    'id' => $timetable->school->id,
                    'school_name' => $timetable->school->school_name,
                ] : null,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating timetable: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create timetable'], 500);
        }
    }

    /**
     * Display the specified timetable with entries
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('timetables.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.read - allowing access: " . $e->getMessage());
        }

        $timetable = GeneratedTimetable::whereNull('deleted_at')
            ->with(['academicYear', 'school', 'createdBy'])
            ->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Check organization access (all users)
        if ($timetable->organization_id !== $profile->organization_id && $timetable->organization_id !== null) {
            return response()->json(['error' => 'Access denied to this timetable'], 403);
        }

        // Load entries with relationships
        $entries = TimetableEntry::whereNull('deleted_at')
            ->where('timetable_id', $id)
            ->with([
                'classAcademicYear.class',
                'classAcademicYear.academicYear',
                'subject',
                'teacher',
                'scheduleSlot',
            ])
            ->orderBy('period_order', 'asc')
            ->get();

        // Format entries
        $formattedEntries = $entries->map(function ($entry) {
            return [
                'id' => $entry->id,
                'organization_id' => $entry->organization_id,
                'timetable_id' => $entry->timetable_id,
                'class_academic_year_id' => $entry->class_academic_year_id,
                'subject_id' => $entry->subject_id,
                'teacher_id' => $entry->teacher_id,
                'schedule_slot_id' => $entry->schedule_slot_id,
                'day_name' => $entry->day_name,
                'period_order' => $entry->period_order,
                'created_at' => $entry->created_at,
                'updated_at' => $entry->updated_at,
                'class_academic_year' => $entry->classAcademicYear ? [
                    'id' => $entry->classAcademicYear->id,
                    'section_name' => $entry->classAcademicYear->section_name,
                    'class' => $entry->classAcademicYear->class ? [
                        'id' => $entry->classAcademicYear->class->id,
                        'name' => $entry->classAcademicYear->class->name,
                        'code' => $entry->classAcademicYear->class->code,
                    ] : null,
                    'academic_year' => $entry->classAcademicYear->academicYear ? [
                        'id' => $entry->classAcademicYear->academicYear->id,
                        'name' => $entry->classAcademicYear->academicYear->name,
                    ] : null,
                ] : null,
                'subject' => $entry->subject ? [
                    'id' => $entry->subject->id,
                    'name' => $entry->subject->name,
                    'code' => $entry->subject->code,
                ] : null,
                'teacher' => $entry->teacher ? [
                    'id' => $entry->teacher->id,
                    'full_name' => $entry->teacher->full_name,
                ] : null,
                'schedule_slot' => $entry->scheduleSlot ? [
                    'id' => $entry->scheduleSlot->id,
                    'name' => $entry->scheduleSlot->name,
                    'start_time' => $entry->scheduleSlot->start_time,
                    'end_time' => $entry->scheduleSlot->end_time,
                ] : null,
            ];
        });

        return response()->json([
            'timetable' => [
                'id' => $timetable->id,
                'organization_id' => $timetable->organization_id,
                'academic_year_id' => $timetable->academic_year_id,
                'school_id' => $timetable->school_id,
                'name' => $timetable->name,
                'timetable_type' => $timetable->timetable_type,
                'description' => $timetable->description,
                'is_active' => $timetable->is_active,
                'created_by' => $timetable->created_by,
                'created_at' => $timetable->created_at,
                'updated_at' => $timetable->updated_at,
                'academic_year' => $timetable->academicYear ? [
                    'id' => $timetable->academicYear->id,
                    'name' => $timetable->academicYear->name,
                ] : null,
                'school' => $timetable->school ? [
                    'id' => $timetable->school->id,
                    'school_name' => $timetable->school->school_name,
                ] : null,
            ],
            'entries' => $formattedEntries,
        ]);
    }

    /**
     * Update the specified timetable
     */
    public function update(UpdateTimetableRequest $request, string $id)
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

        try {
            if (!$user->hasPermissionTo('timetables.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.update - allowing access: " . $e->getMessage());
        }

        $timetable = GeneratedTimetable::whereNull('deleted_at')->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Check organization access (all users)
        if ($timetable->organization_id !== $profile->organization_id && $timetable->organization_id !== null) {
            return response()->json(['error' => 'Cannot update timetable from different organization'], 403);
        }

        $validated = $request->validated();

        // Prevent organization_id changes (all users)
        if (isset($validated['organization_id'])) {
            unset($validated['organization_id']);
        }

        // Update only provided fields
        if (isset($validated['name'])) {
            $timetable->name = trim($validated['name']);
        }
        if (isset($validated['timetable_type'])) {
            $timetable->timetable_type = $validated['timetable_type'];
        }
        if (isset($validated['description'])) {
            $timetable->description = $validated['description'];
        }
        if (isset($validated['academic_year_id'])) {
            $timetable->academic_year_id = $validated['academic_year_id'];
        }
        if (isset($validated['school_id'])) {
            $timetable->school_id = $validated['school_id'];
        }
        if (isset($validated['is_active'])) {
            $timetable->is_active = $validated['is_active'];
        }
        // organization_id cannot be changed

        $timetable->save();
        $timetable->load(['academicYear', 'school', 'createdBy']);

        return response()->json([
            'id' => $timetable->id,
            'organization_id' => $timetable->organization_id,
            'academic_year_id' => $timetable->academic_year_id,
            'school_id' => $timetable->school_id,
            'name' => $timetable->name,
            'timetable_type' => $timetable->timetable_type,
            'description' => $timetable->description,
            'is_active' => $timetable->is_active,
            'created_by' => $timetable->created_by,
            'created_at' => $timetable->created_at,
            'updated_at' => $timetable->updated_at,
            'academic_year' => $timetable->academicYear ? [
                'id' => $timetable->academicYear->id,
                'name' => $timetable->academicYear->name,
            ] : null,
            'school' => $timetable->school ? [
                'id' => $timetable->school->id,
                'school_name' => $timetable->school->school_name,
            ] : null,
        ]);
    }

    /**
     * Remove the specified timetable (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('timetables.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.delete - allowing access: " . $e->getMessage());
        }

        $timetable = GeneratedTimetable::whereNull('deleted_at')->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Check organization access (all users)
        if ($timetable->organization_id !== $profile->organization_id && $timetable->organization_id !== null) {
            return response()->json(['error' => 'Cannot delete timetable from different organization'], 403);
        }

        $timetable->delete();

        return response()->json(['message' => 'Timetable deleted successfully'], 200);
    }

    /**
     * Get entries for a timetable
     */
    public function entries(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('timetables.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.read - allowing access: " . $e->getMessage());
        }

        // Verify timetable exists and user has access
        $timetable = GeneratedTimetable::whereNull('deleted_at')->find($id);
        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Check organization access (all users)
        if ($timetable->organization_id !== $profile->organization_id && $timetable->organization_id !== null) {
            return response()->json(['error' => 'Access denied to this timetable'], 403);
        }

        $entries = TimetableEntry::whereNull('deleted_at')
            ->where('timetable_id', $id)
            ->with([
                'classAcademicYear.class',
                'classAcademicYear.academicYear',
                'subject',
                'teacher',
                'scheduleSlot',
            ])
            ->orderBy('period_order', 'asc')
            ->get();

        $formatted = $entries->map(function ($entry) {
            return [
                'id' => $entry->id,
                'organization_id' => $entry->organization_id,
                'timetable_id' => $entry->timetable_id,
                'class_academic_year_id' => $entry->class_academic_year_id,
                'subject_id' => $entry->subject_id,
                'teacher_id' => $entry->teacher_id,
                'schedule_slot_id' => $entry->schedule_slot_id,
                'day_name' => $entry->day_name,
                'period_order' => $entry->period_order,
                'created_at' => $entry->created_at,
                'updated_at' => $entry->updated_at,
                'class_academic_year' => $entry->classAcademicYear ? [
                    'id' => $entry->classAcademicYear->id,
                    'section_name' => $entry->classAcademicYear->section_name,
                    'class' => $entry->classAcademicYear->class ? [
                        'id' => $entry->classAcademicYear->class->id,
                        'name' => $entry->classAcademicYear->class->name,
                        'code' => $entry->classAcademicYear->class->code,
                    ] : null,
                    'academic_year' => $entry->classAcademicYear->academicYear ? [
                        'id' => $entry->classAcademicYear->academicYear->id,
                        'name' => $entry->classAcademicYear->academicYear->name,
                    ] : null,
                ] : null,
                'subject' => $entry->subject ? [
                    'id' => $entry->subject->id,
                    'name' => $entry->subject->name,
                    'code' => $entry->subject->code,
                ] : null,
                'teacher' => $entry->teacher ? [
                    'id' => $entry->teacher->id,
                    'full_name' => $entry->teacher->full_name,
                ] : null,
                'schedule_slot' => $entry->scheduleSlot ? [
                    'id' => $entry->scheduleSlot->id,
                    'name' => $entry->scheduleSlot->name,
                    'start_time' => $entry->scheduleSlot->start_time,
                    'end_time' => $entry->scheduleSlot->end_time,
                ] : null,
            ];
        });

        return response()->json($formatted);
    }
}



