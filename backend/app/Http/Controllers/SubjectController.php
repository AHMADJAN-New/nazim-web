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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('subjects.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subjects.read - allowing access: " . $e->getMessage());
            }
        }

        // Get accessible organization IDs
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('subjects.create')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subjects.create - allowing access: " . $e->getMessage());
            }
        }

        $validated = $request->validated();

        // Get organization_id - use provided or user's org
        $organizationId = $validated['organization_id'] ?? null;
        if ($organizationId === null) {
            if ($profile->role === 'super_admin' && $profile->organization_id === null) {
                $organizationId = null; // Global subject
            } else if ($profile->organization_id) {
                $organizationId = $profile->organization_id;
            } else {
                return response()->json(['error' => 'User must be assigned to an organization'], 400);
            }
        }

        // Validate organization access (unless super admin)
        if ($profile->role !== 'super_admin' && $organizationId !== $profile->organization_id && $organizationId !== null) {
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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('subjects.read')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subjects.read - allowing access: " . $e->getMessage());
            }
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
                return response()->json(['error' => 'Access denied to this subject'], 403);
            }
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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('subjects.update')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subjects.update - allowing access: " . $e->getMessage());
            }
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
                return response()->json(['error' => 'Cannot update subject from different organization'], 403);
            }
        }

        $validated = $request->validated();

        // Prevent organization_id changes (unless super admin)
        if (isset($validated['organization_id']) && $profile->role !== 'super_admin') {
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
        if (isset($validated['organization_id']) && $profile->role === 'super_admin') {
            $subject->organization_id = $validated['organization_id'];
        }

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

        // Check permission (allow super_admin to bypass)
        if ($profile->role !== 'super_admin') {
            try {
                if (!$user->hasPermissionTo('subjects.delete')) {
                    return response()->json(['error' => 'This action is unauthorized'], 403);
                }
            } catch (\Exception $e) {
                Log::warning("Permission check failed for subjects.delete - allowing access: " . $e->getMessage());
            }
        }

        $subject = Subject::whereNull('deleted_at')->find($id);

        if (!$subject) {
            return response()->json(['error' => 'Subject not found'], 404);
        }

        // Check organization access
        if ($profile->role !== 'super_admin') {
            if ($subject->organization_id !== $profile->organization_id && $subject->organization_id !== null) {
                return response()->json(['error' => 'Cannot delete subject from different organization'], 403);
            }
        }

        $subject->delete();

        return response()->json(['message' => 'Subject deleted successfully'], 200);
    }
}

