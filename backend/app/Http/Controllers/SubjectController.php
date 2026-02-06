<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubjectController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
    /**
     * Display a listing of subjects
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = Subject::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

        // Support pagination if page and per_page parameters are provided
        if ($request->has('page') || $request->has('per_page')) {
            $perPage = $request->input('per_page', 25);
            // Validate per_page is one of allowed values
            $allowedPerPage = [10, 25, 50, 100];
            if (!in_array((int)$perPage, $allowedPerPage)) {
                $perPage = 25; // Default to 25 if invalid
            }
            
            $subjects = $query->orderBy('name', 'asc')->paginate((int)$perPage);
            
            // Return paginated response in Laravel's standard format
            return response()->json($subjects);
        }

        // Return all results if no pagination requested (backward compatibility)
        $subjects = $query->orderBy('name', 'asc')->get();

        return response()->json($subjects);
    }

    /**
     * Store a newly created subject
     */
    public function store(StoreSubjectRequest $request)
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();
        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $subject = Subject::create([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
        ]);

        // Log subject creation
        try {
            $this->activityLogService->logCreate(
                subject: $subject,
                description: "Created subject: {$subject->name}",
                properties: [
                    'subject_id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log subject creation: ' . $e->getMessage());
        }

        return response()->json($subject, 201);
    }

    /**
     * Display the specified subject
     */
    public function show(Request $request, string $id)
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $subject = Subject::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Org access enforced by query.

        return response()->json($subject);
    }

    /**
     * Update the specified subject
     */
    public function update(UpdateSubjectRequest $request, string $id)
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $subject = Subject::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        $validated = $request->validated();

        // Prevent organization_id changes (all users)
        if (isset($validated['organization_id'])) {
            unset($validated['organization_id']);
        }
        if (isset($validated['school_id'])) {
            unset($validated['school_id']);
        }

        // Capture old values before update
        $oldValues = $subject->only(['name', 'code', 'description', 'is_active']);

        // Update only provided fields
        if (isset($validated['name'])) {
            $subject->name = trim($validated['name']);
        }
        if (isset($validated['code'])) {
            $subject->code = strtoupper(trim($validated['code']));
        }
        if (isset($validated['description'])) {
            $subject->description = $validated['description'];
        }
        if (isset($validated['is_active'])) {
            $subject->is_active = $validated['is_active'];
        }
        // organization_id cannot be changed

        $subject->save();

        // Log subject update
        try {
            $this->activityLogService->logUpdate(
                subject: $subject,
                description: "Updated subject: {$subject->name}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $subject->only(['name', 'code', 'description', 'is_active']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log subject update: ' . $e->getMessage());
        }

        return response()->json($subject);
    }

    /**
     * Remove the specified subject (soft delete)
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = request()->get('current_school_id');
        $subject = Subject::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Capture data before deletion
        $subjectData = $subject->toArray();
        $subjectName = $subject->name;

        $subject->delete();

        // Log subject deletion
        try {
            $this->activityLogService->logDelete(
                subject: $subject,
                description: "Deleted subject: {$subjectName}",
                properties: ['deleted_subject' => $subjectData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log subject deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}



