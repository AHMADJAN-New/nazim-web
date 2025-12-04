<?php

namespace App\Http\Controllers;

use App\Models\ClassSubjectTemplate;
use App\Models\ClassModel;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassSubjectTemplateController extends Controller
{
    /**
     * Display a listing of class subject templates
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

        // Check permission
        try {
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $orgIds = [$profile->organization_id];

        // Load relationships
        $query = ClassSubjectTemplate::with(['subject', 'class'])
            ->whereNull('deleted_at');

        // Filter by class_id
        if ($request->has('class_id') && $request->class_id) {
            $query->where('class_id', $request->class_id);
        }

        // Filter by organization
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        } else {
            // If no organization_id provided, filter by user's organization
            $query->where('organization_id', $profile->organization_id);
        }

        try {
            $templates = $query->orderBy('created_at', 'desc')->get();
            return response()->json($templates);
        } catch (\Exception $e) {
            Log::error('Error fetching class subject templates: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json(['error' => 'Failed to fetch class subject templates', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created class subject template
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

        // Check permission
        try {
            if (!$user->hasPermissionTo('subjects.assign')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.assign: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $validated = $request->validate([
            'class_id' => 'required|uuid|exists:classes,id',
            'subject_id' => 'required|uuid|exists:subjects,id',
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'is_required' => 'boolean',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
        ]);

        // Get class to determine organization
        /** @var ClassModel|null $class */
        $class = ClassModel::find($validated['class_id']);
        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        $organizationId = $validated['organization_id'] ?? $class->organization_id ?? $profile->organization_id;

        // Validate organization access
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign subject to class from different organization'], 403);
        }

        // Check for duplicate
        $existing = ClassSubjectTemplate::where('class_id', $validated['class_id'])
            ->where('subject_id', $validated['subject_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'This subject is already assigned to this class'], 422);
        }

        $template = ClassSubjectTemplate::create([
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'],
            'organization_id' => $organizationId,
            'is_required' => $validated['is_required'] ?? true,
            'credits' => $validated['credits'] ?? null,
            'hours_per_week' => $validated['hours_per_week'] ?? null,
        ]);

        $template->load(['subject', 'class']);

        return response()->json($template, 201);
    }

    /**
     * Display the specified class subject template
     */
    public function show(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('subjects.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ClassSubjectTemplate::with(['subject', 'class'])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
        }

        // Check organization access
        if ($template->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Access denied to this class subject template'], 403);
        }

        return response()->json($template);
    }

    /**
     * Update the specified class subject template
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

        // Check permission
        try {
            if (!$user->hasPermissionTo('subjects.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ClassSubjectTemplate::whereNull('deleted_at')->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
        }

        // Check organization access
        if ($template->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update class subject template from different organization'], 403);
        }

        $validated = $request->validate([
            'is_required' => 'boolean',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
        ]);

        $template->update($validated);

        $template->load(['subject', 'class']);

        return response()->json($template);
    }

    /**
     * Remove the specified class subject template
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission
        try {
            if (!$user->hasPermissionTo('subjects.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subjects.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $template = ClassSubjectTemplate::whereNull('deleted_at')->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
        }

        // Check organization access
        if ($template->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete class subject template from different organization'], 403);
        }

        $template->delete();

        return response()->json(['message' => 'Class subject template removed successfully']);
    }
}
