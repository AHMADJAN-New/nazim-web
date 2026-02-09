<?php

namespace App\Http\Controllers;

use App\Models\ClassSubjectTemplate;
use App\Models\ClassModel;
use App\Models\Subject;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassSubjectTemplateController extends Controller
{
    public function __construct(
        private ActivityLogService $activityLogService
    ) {}
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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

        // Load relationships
        $query = ClassSubjectTemplate::with(['subject', 'class'])
            ->whereNull('deleted_at');

        // Filter by class_id
        if ($request->has('class_id') && $request->class_id) {
            $query->where('class_id', $request->class_id);
        }

        // Strict scoping: organization + school from context
        $query->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId);

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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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
            'is_required' => 'boolean',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
        ]);

        // Get class (must be in current org + school)
        /** @var ClassModel|null $class */
        $class = ClassModel::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($validated['class_id']);
        if (!$class) {
            return response()->json(['error' => 'Class not found'], 404);
        }

        $organizationId = $profile->organization_id;

        // Check for duplicate
        $existing = ClassSubjectTemplate::where('class_id', $validated['class_id'])
            ->where('subject_id', $validated['subject_id'])
            ->where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'This subject is already assigned to this class'], 422);
        }

        $template = ClassSubjectTemplate::create([
            'class_id' => $validated['class_id'],
            'subject_id' => $validated['subject_id'],
            'organization_id' => $organizationId,
            'school_id' => $currentSchoolId,
            'is_required' => $validated['is_required'] ?? true,
            'credits' => $validated['credits'] ?? null,
            'hours_per_week' => $validated['hours_per_week'] ?? null,
        ]);

        $template->load(['subject', 'class']);

        // Log class subject template creation
        try {
            $subjectName = $template->subject?->name ?? 'Unknown';
            $className = $template->class?->name ?? 'Unknown';
            $this->activityLogService->logCreate(
                subject: $template,
                description: "Created subject template: {$subjectName} for class {$className}",
                properties: [
                    'template_id' => $template->id,
                    'subject_id' => $template->subject_id,
                    'class_id' => $template->class_id,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class subject template creation: ' . $e->getMessage());
        }

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

        $currentSchoolId = $this->getCurrentSchoolId(request());

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
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
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

        $currentSchoolId = $this->getCurrentSchoolId($request);

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

        $template = ClassSubjectTemplate::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
        }

        $validated = $request->validate([
            'is_required' => 'boolean',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
        ]);

        // Capture old values before update
        $oldValues = $template->only(['is_required', 'credits', 'hours_per_week']);

        $template->update($validated);

        $template->load(['subject', 'class']);

        // Log class subject template update
        try {
            $subjectName = $template->subject?->name ?? 'Unknown';
            $className = $template->class?->name ?? 'Unknown';
            $this->activityLogService->logUpdate(
                subject: $template,
                description: "Updated subject template: {$subjectName} for class {$className}",
                properties: [
                    'old_values' => $oldValues,
                    'new_values' => $template->only(['is_required', 'credits', 'hours_per_week']),
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class subject template update: ' . $e->getMessage());
        }

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

        $currentSchoolId = $this->getCurrentSchoolId(request());

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

        $template = ClassSubjectTemplate::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$template) {
            return response()->json(['error' => 'Class subject template not found'], 404);
        }

        // Capture data before deletion
        $templateData = $template->toArray();
        $subjectName = $template->subject?->name ?? 'Unknown';
        $className = $template->class?->name ?? 'Unknown';

        $template->delete();

        // Log class subject template deletion
        try {
            $this->activityLogService->logDelete(
                subject: $template,
                description: "Deleted subject template: {$subjectName} from class {$className}",
                properties: ['deleted_template' => $templateData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log class subject template deletion: ' . $e->getMessage());
        }

        return response()->noContent();
    }
}
