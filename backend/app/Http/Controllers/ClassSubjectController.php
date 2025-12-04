<?php

namespace App\Http\Controllers;

use App\Models\ClassSubject;
use App\Models\ClassAcademicYear;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassSubjectController extends Controller
{
    /**
     * Display a listing of class subjects
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

        // Load relationships - use array syntax for 'class' since it's a reserved keyword
        $query = ClassSubject::with([
            'subject', 
            'classAcademicYear' => function($q) {
                $q->with(['class', 'academicYear']);
            },
            'teacher', 
            'room'
        ])
            ->whereNull('deleted_at');

        // Filter by class_academic_year_id
        if ($request->has('class_academic_year_id') && $request->class_academic_year_id) {
            $query->where('class_academic_year_id', $request->class_academic_year_id);
        }

        // Filter by subject_id
        if ($request->has('subject_id') && $request->subject_id) {
            $query->where('subject_id', $request->subject_id);
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
            $classSubjects = $query->orderBy('created_at', 'desc')->get();
            
            // Manually load nested relationships if needed
            $classSubjects->load([
                'classAcademicYear.class',
                'classAcademicYear.academicYear'
            ]);
            
            return response()->json($classSubjects);
        } catch (\Exception $e) {
            Log::error('Error fetching class subjects: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json(['error' => 'Failed to fetch class subjects', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created class subject
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
            'class_academic_year_id' => 'required|uuid|exists:class_academic_years,id',
            'subject_id' => 'required|uuid|exists:subjects,id',
            'teacher_id' => 'nullable|uuid|exists:profiles,id',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
            'is_required' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        // Get class academic year to determine organization
        $classAcademicYear = ClassAcademicYear::find($validated['class_academic_year_id']);
        if (!$classAcademicYear) {
            return response()->json(['error' => 'Class academic year not found'], 404);
        }

        $organizationId = $classAcademicYear->organization_id ?? $profile->organization_id;

        // Validate organization access
        if ($organizationId !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot assign subject to class from different organization'], 403);
        }

        // Check for duplicate
        $existing = ClassSubject::where('class_academic_year_id', $validated['class_academic_year_id'])
            ->where('subject_id', $validated['subject_id'])
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'This subject is already assigned to this class'], 422);
        }

        // Convert empty strings to NULL for nullable UUID fields
        $teacherId = !empty($validated['teacher_id']) ? $validated['teacher_id'] : null;
        $roomId = !empty($validated['room_id']) ? $validated['room_id'] : null;

        $classSubject = ClassSubject::create([
            'class_academic_year_id' => $validated['class_academic_year_id'],
            'subject_id' => $validated['subject_id'],
            'organization_id' => $organizationId,
            'teacher_id' => $teacherId,
            'room_id' => $roomId,
            'credits' => $validated['credits'] ?? null,
            'hours_per_week' => $validated['hours_per_week'] ?? null,
            'is_required' => $validated['is_required'] ?? true,
            'notes' => $validated['notes'] ?? null,
        ]);

        $classSubject->load([
            'subject', 
            'classAcademicYear' => function($q) {
                $q->with(['class', 'academicYear']);
            },
            'teacher', 
            'room'
        ]);

        return response()->json($classSubject, 201);
    }

    /**
     * Display the specified class subject
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

        $classSubject = ClassSubject::with([
            'subject', 
            'classAcademicYear' => function($q) {
                $q->with(['class', 'academicYear']);
            },
            'teacher', 
            'room'
        ])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$classSubject) {
            return response()->json(['error' => 'Class subject not found'], 404);
        }

        // Check organization access
        if ($classSubject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Access denied to this class subject'], 403);
        }

        return response()->json($classSubject);
    }

    /**
     * Update the specified class subject
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

        $classSubject = ClassSubject::whereNull('deleted_at')->find($id);

        if (!$classSubject) {
            return response()->json(['error' => 'Class subject not found'], 404);
        }

        // Check organization access
        if ($classSubject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot update class subject from different organization'], 403);
        }

        $validated = $request->validate([
            'teacher_id' => 'nullable|uuid|exists:profiles,id',
            'room_id' => 'nullable|uuid|exists:rooms,id',
            'credits' => 'nullable|integer|min:0',
            'hours_per_week' => 'nullable|integer|min:0|max:40',
            'is_required' => 'boolean',
            'notes' => 'nullable|string|max:500',
        ]);

        // Convert empty strings to NULL
        if (isset($validated['teacher_id']) && $validated['teacher_id'] === '') {
            $validated['teacher_id'] = null;
        }
        if (isset($validated['room_id']) && $validated['room_id'] === '') {
            $validated['room_id'] = null;
        }

        $classSubject->update($validated);

        $classSubject->load([
            'subject', 
            'classAcademicYear' => function($q) {
                $q->with(['class', 'academicYear']);
            },
            'teacher', 
            'room'
        ]);

        return response()->json($classSubject);
    }

    /**
     * Remove the specified class subject
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

        $classSubject = ClassSubject::whereNull('deleted_at')->find($id);

        if (!$classSubject) {
            return response()->json(['error' => 'Class subject not found'], 404);
        }

        // Check organization access
        if ($classSubject->organization_id !== $profile->organization_id) {
            return response()->json(['error' => 'Cannot delete class subject from different organization'], 403);
        }

        $classSubject->delete();

        return response()->json(['message' => 'Class subject removed successfully']);
    }
}
