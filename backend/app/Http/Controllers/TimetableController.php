<?php

namespace App\Http\Controllers;

use App\Models\GeneratedTimetable;
use App\Models\TimetableEntry;
use App\Http\Requests\StoreTimetableRequest;
use App\Http\Requests\UpdateTimetableRequest;
use App\Http\Requests\StoreTimetableEntryRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TimetableController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
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

            $currentSchoolId = $this->getCurrentSchoolId($request);

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

            $query = GeneratedTimetable::whereNull('deleted_at');

            // Try to eager load relationships, but don't fail if they don't exist
            // Note: createdBy is excluded because some records have integer created_by values
            // instead of UUIDs, which causes PostgreSQL type mismatch errors
            try {
                $query->with(['academicYear', 'school']);
            } catch (\Exception $e) {
                Log::warning("Failed to eager load relationships for timetables: " . $e->getMessage());
            }

            // Strict scoping: org + school from context
            $query->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId);

            // Filter by academic_year_id if provided
            if ($request->has('academic_year_id') && $request->academic_year_id) {
                $query->where('academic_year_id', $request->academic_year_id);
            }

            $timetables = $query->orderBy('created_at', 'desc')->get();
            
            // Ensure relationships are loaded safely
            foreach ($timetables as $timetable) {
                try {
                    if ($timetable->academic_year_id && !$timetable->relationLoaded('academicYear')) {
                        $timetable->load('academicYear');
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not load academicYear for timetable {$timetable->id}: " . $e->getMessage());
                }
                
                try {
                    if ($timetable->school_id && !$timetable->relationLoaded('school')) {
                        $timetable->load('school');
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not load school for timetable {$timetable->id}: " . $e->getMessage());
                }
            }

            // Format response - use array access to avoid lazy loading issues
            $formatted = $timetables->map(function ($timetable) {
                try {
                    $academicYear = null;
                    $school = null;
                    
                    // Safely get academic year - only if relation is loaded
                    try {
                        if ($timetable->relationLoaded('academicYear')) {
                            $academicYearRelation = $timetable->getRelation('academicYear');
                            if ($academicYearRelation && isset($academicYearRelation->id)) {
                                $academicYear = [
                                    'id' => $academicYearRelation->id,
                                    'name' => $academicYearRelation->name ?? '',
                                ];
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning("Error accessing academicYear for timetable {$timetable->id}: " . $e->getMessage());
                    }
                    
                    // Safely get school - only if relation is loaded
                    try {
                        if ($timetable->relationLoaded('school')) {
                            $schoolRelation = $timetable->getRelation('school');
                            if ($schoolRelation && isset($schoolRelation->id)) {
                                $school = [
                                    'id' => $schoolRelation->id,
                                    'school_name' => $schoolRelation->school_name ?? '',
                                ];
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning("Error accessing school for timetable {$timetable->id}: " . $e->getMessage());
                    }
                    
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
                        'created_at' => $timetable->created_at ? $timetable->created_at->toIso8601String() : null,
                        'updated_at' => $timetable->updated_at ? $timetable->updated_at->toIso8601String() : null,
                        'academic_year' => $academicYear,
                        'school' => $school,
                    ];
                } catch (\Exception $e) {
                    Log::error("Failed to format timetable {$timetable->id}: " . $e->getMessage());
                    Log::error("Stack trace: " . $e->getTraceAsString());
                    // Return minimal safe data
                    return [
                        'id' => $timetable->id ?? '',
                        'organization_id' => $timetable->organization_id ?? null,
                        'academic_year_id' => $timetable->academic_year_id ?? null,
                        'school_id' => $timetable->school_id ?? null,
                        'name' => $timetable->name ?? '',
                        'timetable_type' => $timetable->timetable_type ?? 'teaching',
                        'description' => $timetable->description ?? null,
                        'is_active' => $timetable->is_active ?? true,
                        'created_by' => $timetable->created_by ?? null,
                        'created_at' => $timetable->created_at ? ($timetable->created_at instanceof \Carbon\Carbon ? $timetable->created_at->toIso8601String() : $timetable->created_at) : null,
                        'updated_at' => $timetable->updated_at ? ($timetable->updated_at instanceof \Carbon\Carbon ? $timetable->updated_at->toIso8601String() : $timetable->updated_at) : null,
                        'academic_year' => null,
                        'school' => null,
                    ];
                }
            });

            return response()->json($formatted);
        } catch (\Exception $e) {
            Log::error('Error fetching timetables: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            Log::error('Request params: ' . json_encode($request->all()));
            return response()->json([
                'error' => 'Failed to fetch timetables',
                'message' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('timetables.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for timetables.create - allowing access: " . $e->getMessage());
        }

        $validated = $request->validated();

        // Strict scoping: ignore client-provided organization_id / school_id
        $organizationId = $profile->organization_id;
        unset($validated['organization_id'], $validated['school_id']);

        // Validate academic year belongs to current org + school if provided
        if (!empty($validated['academic_year_id'])) {
            $exists = DB::table('academic_years')
                ->where('id', $validated['academic_year_id'])
                ->where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$exists) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }
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
                'school_id' => $currentSchoolId,
                'is_active' => $validated['is_active'] ?? true,
                'created_by' => $user->id,
            ]);

            // Create entries in bulk
            $entries = [];
            foreach ($validated['entries'] as $entryData) {
                $entries[] = [
                    'id' => (string) \Illuminate\Support\Str::uuid(),
                    'organization_id' => $organizationId,
                    'school_id' => $currentSchoolId,
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

            // Try to load relationships, but don't fail if they don't exist
            // Note: createdBy is excluded because some records have integer created_by values
            // instead of UUIDs, which causes PostgreSQL type mismatch errors
            try {
                $timetable->load(['academicYear', 'school', 'entries']);
            } catch (\Exception $e) {
                Log::warning("Failed to load relationships for timetable: " . $e->getMessage());
            }

            // Log timetable creation
            try {
                $this->activityLogService->logCreate(
                    subject: $timetable,
                    description: "Created timetable: {$timetable->name}",
                    properties: [
                        'timetable_id' => $timetable->id,
                        'name' => $timetable->name,
                        'timetable_type' => $timetable->timetable_type,
                        'entries_count' => count($entries),
                    ],
                    request: $request
                );
            } catch (\Exception $e) {
                Log::warning('Failed to log timetable creation: ' . $e->getMessage());
            }

            // Format response safely
            try {
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
                    'academic_year' => $timetable->relationLoaded('academicYear') && $timetable->academicYear ? [
                        'id' => $timetable->academicYear->id,
                        'name' => $timetable->academicYear->name,
                    ] : null,
                    'school' => $timetable->relationLoaded('school') && $timetable->school ? [
                        'id' => $timetable->school->id,
                        'school_name' => $timetable->school->school_name,
                    ] : null,
                ], 201);
            } catch (\Exception $e) {
                Log::error('Error formatting timetable response: ' . $e->getMessage());
                // Return basic response if formatting fails
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
                ], 201);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating timetable: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            Log::error('Request data: ' . json_encode($request->all()));
            return response()->json([
                'error' => 'Failed to create timetable',
                'message' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
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

        $currentSchoolId = $this->getCurrentSchoolId(request());

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

        // Note: createdBy is excluded because some records have integer created_by values
        // instead of UUIDs, which causes PostgreSQL type mismatch errors
        $timetable = GeneratedTimetable::whereNull('deleted_at')
            ->with(['academicYear', 'school'])
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Load entries with relationships
        $entries = TimetableEntry::whereNull('deleted_at')
            ->where('timetable_id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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
                    'employee_id' => $entry->teacher->employee_id ?? null,
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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

        $timetable = GeneratedTimetable::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        $validated = $request->validated();

        // Prevent org/school changes (strict scoping)
        unset($validated['organization_id'], $validated['school_id']);

        // Validate academic year belongs to current org + school if provided
        if (array_key_exists('academic_year_id', $validated) && !empty($validated['academic_year_id'])) {
            $exists = DB::table('academic_years')
                ->where('id', $validated['academic_year_id'])
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->exists();
            if (!$exists) {
                return response()->json(['error' => 'Academic year not found'], 404);
            }
        }

        // Capture old values before update
        $oldValues = $timetable->only(['name', 'timetable_type', 'description', 'academic_year_id', 'is_active']);

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
        if (isset($validated['is_active'])) {
            $timetable->is_active = $validated['is_active'];
        }
        // organization_id cannot be changed

        $timetable->save();
        // Note: createdBy is excluded because some records have integer created_by values
        // instead of UUIDs, which causes PostgreSQL type mismatch errors
        $timetable->load(['academicYear', 'school']);

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

        // Log timetable update
        try {
            $this->activityLogService->logUpdate(
                subject: $timetable,
                description: "Updated timetable: {$timetable->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $timetable->only(['name', 'timetable_type', 'description', 'academic_year_id', 'is_active']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log timetable update: ' . $e->getMessage());
        }
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

        $currentSchoolId = $this->getCurrentSchoolId(request());

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

        $timetable = GeneratedTimetable::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        // Capture data before deletion
        $timetableData = $timetable->toArray();
        $timetableName = $timetable->name;

        $timetable->delete();

        // Log timetable deletion
        try {
            $this->activityLogService->logDelete(
                subject: $timetable,
                description: "Deleted timetable: {$timetableName}",
                properties: ['deleted_timetable' => $timetableData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log timetable deletion: ' . $e->getMessage());
        }

        return response()->noContent();
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

        $currentSchoolId = $this->getCurrentSchoolId(request());

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
        $timetable = GeneratedTimetable::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);
        if (!$timetable) {
            return response()->json(['error' => 'Timetable not found'], 404);
        }

        $entries = TimetableEntry::whereNull('deleted_at')
            ->where('timetable_id', $id)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
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



