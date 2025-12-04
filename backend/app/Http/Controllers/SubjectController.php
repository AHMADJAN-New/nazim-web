<?php

namespace App\Http\Controllers;

use App\Models\Subject;
use App\Http\Requests\StoreSubjectRequest;
use App\Http\Requests\UpdateSubjectRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubjectController extends Controller
{
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

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $query = Subject::whereNull('deleted_at');

        // Filter by organization (include global subjects where organization_id IS NULL)
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds) || empty($orgIds)) {
                $query->where(function ($q) use ($request) {
                    $q->where('organization_id', $request->organization_id)
                      ->orWhereNull('organization_id'); // Include global subjects
                });
            } else {
                return response()->json([]);
            }
        } else {
            // Show user's org subjects + global subjects
            if (!empty($orgIds)) {
                $query->where(function ($q) use ($orgIds) {
                    $q->whereIn('organization_id', $orgIds)
                      ->orWhereNull('organization_id'); // Include global subjects
                });
            } else {
                // No org access, only show global subjects
                $query->whereNull('organization_id');
            }
        }

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
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validated();

        // Get organization_id - use provided or user's org
        $organizationId = $validated['organization_id'] ?? $profile->organization_id;

        // Validate organization access (all users)
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot create subject for different organization'], 403);
        }

        $subject = Subject::create([
            'name' => trim($validated['name']),
            'code' => strtoupper(trim($validated['code'])),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'organization_id' => $organizationId,
        ]);

        return response()->json($subject, 201);
    }

    /**
     * Display the specified subject
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

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access (all users)
        if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
            return response()->json(['error' => 'Access denied to this subject'], 403);
        }

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
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access (all users)
        if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
            return response()->json(['error' => 'Cannot update subject from different organization'], 403);
        }

        $validated = $request->validated();

        // Prevent organization_id changes (all users)
        if (isset($validated['organization_id'])) {
            unset($validated['organization_id']);
        }

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
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access (all users)
        if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
            return response()->json(['error' => 'Cannot delete subject from different organization'], 403);
        }

        $subject->delete();

        return response()->json(['message' => 'Subject deleted successfully'], 200);
    }
}



