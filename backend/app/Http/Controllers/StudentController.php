<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Http\Requests\StoreStudentRequest;
use App\Http\Requests\UpdateStudentRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    /**
     * Get accessible organization IDs for the current user (all users restricted to their own organization)
     */
    private function getAccessibleOrgIds($profile): array
    {
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }

        return [];
    }

    /**
     * Display a listing of students
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

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('students.read')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.read'
            ], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([]);
        }

        $query = Student::with(['organization', 'school'])
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Apply filters
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        if ($request->has('school_id') && $request->school_id) {
            $query->where('school_id', $request->school_id);
        }

        if ($request->has('student_status') && $request->student_status) {
            $query->where('student_status', $request->student_status);
        }

        if ($request->has('gender') && $request->gender) {
            $query->where('gender', $request->gender);
        }

        if ($request->has('is_orphan') && $request->is_orphan !== null) {
            $query->where('is_orphan', filter_var($request->is_orphan, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('admission_fee_status') && $request->admission_fee_status) {
            $query->where('admission_fee_status', $request->admission_fee_status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('father_name', 'ilike', "%{$search}%")
                  ->orWhere('admission_no', 'ilike', "%{$search}%")
                  ->orWhere('guardian_name', 'ilike', "%{$search}%")
                  ->orWhere('guardian_phone', 'ilike', "%{$search}%");
            });
        }

        $students = $query->orderBy('created_at', 'desc')->get();

        return response()->json($students);
    }

    /**
     * Display the specified student
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

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('students.read')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.read'
            ], 403);
        }

        $student = Student::with(['organization', 'school'])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        return response()->json($student);
    }

    /**
     * Store a newly created student
     */
    public function store(StoreStudentRequest $request)
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

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('students.create')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.create'
            ], 403);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        // Determine organization_id
        $organizationId = $request->organization_id ?? $profile->organization_id;
        if (!$organizationId) {
            return response()->json(['error' => 'Organization ID is required'], 422);
        }

        // Validate organization access
        if (!in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create student for this organization'], 403);
        }

        $validated = $request->validated();
        $validated['organization_id'] = $organizationId;

        // Set defaults
        $validated['is_orphan'] = $validated['is_orphan'] ?? false;
        $validated['admission_fee_status'] = $validated['admission_fee_status'] ?? 'pending';
        $validated['student_status'] = $validated['student_status'] ?? 'active';

        $student = Student::create($validated);

        $student->load(['organization', 'school']);

        return response()->json($student, 201);
    }

    /**
     * Update the specified student
     */
    public function update(UpdateStudentRequest $request, string $id)
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

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('students.update')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.update'
            ], 403);
        }

        $student = Student::whereNull('deleted_at')->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update student from different organization'], 403);
        }

        $validated = $request->validated();

        // Remove organization_id from update data to prevent changes
        unset($validated['organization_id']);

        $student->update($validated);
        $student->load(['organization', 'school']);

        return response()->json($student);
    }

    /**
     * Remove the specified student (soft delete)
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

        // Check permission - context already set by middleware
        if (!$user->hasPermissionTo('students.delete')) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'students.delete'
            ], 403);
        }

        $student = Student::whereNull('deleted_at')->find($id);

        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (!in_array($student->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete student from different organization'], 403);
        }

        $student->delete();

        return response()->json(['message' => 'Student deleted successfully']);
    }

    /**
     * Get student statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([
                'total' => 0,
                'male' => 0,
                'female' => 0,
                'orphans' => 0,
                'feePending' => 0,
            ]);
        }

        $query = Student::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Apply organization filter if provided
        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([
                    'total' => 0,
                    'male' => 0,
                    'female' => 0,
                    'orphans' => 0,
                    'feePending' => 0,
                ]);
            }
        }

        $total = (clone $query)->count();
        $male = (clone $query)->where('gender', 'male')->count();
        $female = (clone $query)->where('gender', 'female')->count();
        $orphans = (clone $query)->where('is_orphan', true)->count();
        $feePending = (clone $query)->where('admission_fee_status', '!=', 'paid')->count();

        return response()->json([
            'total' => $total,
            'male' => $male,
            'female' => $female,
            'orphans' => $orphans,
            'feePending' => $feePending,
        ]);
    }

    /**
     * Upload student picture
     */
    public function uploadPicture(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $student = Student::whereNull('deleted_at')->find($id);

            if (!$student) {
                return response()->json(['error' => 'Student not found'], 404);
            }

            $orgIds = $this->getAccessibleOrgIds($profile);

            if (!in_array($student->organization_id, $orgIds)) {
                return response()->json(['error' => 'Cannot update student from different organization'], 403);
            }

            // Validate the file
            $validated = $request->validate([
                'file' => 'required|file|max:5120|mimes:jpeg,jpg,png,gif,webp',
            ]);

            $file = $request->file('file');
            if (!$file) {
                return response()->json(['error' => 'No file provided'], 422);
            }

            $extension = $file->getClientOriginalExtension();
            $timestamp = time();
            $filename = "{$timestamp}_{$id}.{$extension}";
            $path = "{$student->organization_id}/students/{$id}/pictures/{$filename}";

            // Delete old picture if exists
            if ($student->picture_path && Storage::disk('local')->exists($student->picture_path)) {
                Storage::disk('local')->delete($student->picture_path);
            }

            // Store new picture
            Storage::disk('local')->put($path, file_get_contents($file));

            // Update student record
            $student->update(['picture_path' => $path]);

            return response()->json([
                'message' => 'Picture uploaded successfully',
                'picture_path' => $path,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('Picture upload validation failed', [
                'errors' => $e->errors(),
                'student_id' => $id,
            ]);
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error uploading student picture: ' . $e->getMessage(), [
                'student_id' => $id,
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['error' => 'Failed to upload picture: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get student picture
     */
    public function getPicture(Request $request, string $id)
    {
        try {
            $user = $request->user();
            if (!$user) {
                abort(401, 'Unauthorized');
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                abort(404, 'Profile not found');
            }

            $student = Student::whereNull('deleted_at')->find($id);

            if (!$student) {
                abort(404, 'Student not found');
            }

            $orgIds = $this->getAccessibleOrgIds($profile);

            if (!in_array($student->organization_id, $orgIds)) {
                abort(403, 'Cannot access student from different organization');
            }

            // If no picture_path, return 404
            if (!$student->picture_path) {
                abort(404, 'Picture not found');
            }

            // Check if file exists
            if (!Storage::disk('local')->exists($student->picture_path)) {
                abort(404, 'Picture file not found');
            }

            $file = Storage::disk('local')->get($student->picture_path);
            $mimeType = Storage::disk('local')->mimeType($student->picture_path) ?? 'image/jpeg';

            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . basename($student->picture_path) . '"')
                ->header('Cache-Control', 'public, max-age=3600');
        } catch (\Exception $e) {
            Log::error('Error getting student picture: ' . $e->getMessage());
            abort(404, 'Picture not found');
        }
    }

    /**
     * Get distinct values for autocomplete
     */
    public function autocomplete(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $orgIds = $this->getAccessibleOrgIds($profile);

        if (empty($orgIds)) {
            return response()->json([
                'names' => [],
                'fatherNames' => [],
                'grandfatherNames' => [],
                'origDistricts' => [],
                'currDistricts' => [],
                'origVillages' => [],
                'currVillages' => [],
                'guardianNames' => [],
                'zaminNames' => [],
            ]);
        }

        $query = Student::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds);

        // Get distinct values for each field
        $names = (clone $query)->whereNotNull('full_name')->where('full_name', '!=', '')->distinct()->pluck('full_name')->sort()->values()->toArray();
        $fatherNames = (clone $query)->whereNotNull('father_name')->where('father_name', '!=', '')->distinct()->pluck('father_name')->sort()->values()->toArray();
        $grandfatherNames = (clone $query)->whereNotNull('grandfather_name')->where('grandfather_name', '!=', '')->distinct()->pluck('grandfather_name')->sort()->values()->toArray();
        $origDistricts = (clone $query)->whereNotNull('orig_district')->where('orig_district', '!=', '')->distinct()->pluck('orig_district')->sort()->values()->toArray();
        $currDistricts = (clone $query)->whereNotNull('curr_district')->where('curr_district', '!=', '')->distinct()->pluck('curr_district')->sort()->values()->toArray();
        $origVillages = (clone $query)->whereNotNull('orig_village')->where('orig_village', '!=', '')->distinct()->pluck('orig_village')->sort()->values()->toArray();
        $currVillages = (clone $query)->whereNotNull('curr_village')->where('curr_village', '!=', '')->distinct()->pluck('curr_village')->sort()->values()->toArray();
        $guardianNames = (clone $query)->whereNotNull('guardian_name')->where('guardian_name', '!=', '')->distinct()->pluck('guardian_name')->sort()->values()->toArray();
        $zaminNames = (clone $query)->whereNotNull('zamin_name')->where('zamin_name', '!=', '')->distinct()->pluck('zamin_name')->sort()->values()->toArray();

        return response()->json([
            'names' => $names,
            'fatherNames' => $fatherNames,
            'grandfatherNames' => $grandfatherNames,
            'origDistricts' => $origDistricts,
            'currDistricts' => $currDistricts,
            'origVillages' => $origVillages,
            'currVillages' => $currVillages,
            'guardianNames' => $guardianNames,
            'zaminNames' => $zaminNames,
        ]);
    }

    /**
     * Check for duplicate students
     */
    public function checkDuplicates(Request $request)
    {
        try {
            $user = $request->user();
            if (!$user) {
                Log::warning('[StudentController::checkDuplicates] User not authenticated');
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                Log::warning('[StudentController::checkDuplicates] Profile not found for user', ['user_id' => $user->id]);
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $orgIds = $this->getAccessibleOrgIds($profile);

            if (empty($orgIds)) {
                Log::info('[StudentController::checkDuplicates] No accessible organizations for user', ['user_id' => $user->id]);
                return response()->json([]);
            }

            $request->validate([
                'full_name' => 'required|string',
                'father_name' => 'required|string',
                'tazkira_number' => 'nullable|string',
                'card_number' => 'nullable|string',
                'admission_no' => 'nullable|string',
            ]);

            $results = [];

            // Ensure orgIds is an array and not empty before querying
            if (!is_array($orgIds) || empty($orgIds)) {
                Log::warning('[StudentController::checkDuplicates] Invalid organization IDs', ['orgIds' => $orgIds]);
                return response()->json([]);
            }

            $baseQuery = Student::whereNull('deleted_at')
                ->whereIn('organization_id', $orgIds)
                ->select('id', 'full_name', 'father_name', 'tazkira_number', 'guardian_tazkira', 'card_number', 'admission_no', 'orig_province', 'admission_year', 'created_at');

            // Exact: name + father_name
            $exactMatches = (clone $baseQuery)
                ->where('full_name', $request->full_name)
                ->where('father_name', $request->father_name)
                ->get();
            foreach ($exactMatches as $match) {
                $results[] = [
                    'id' => $match->id,
                    'full_name' => $match->full_name ?? null,
                    'father_name' => $match->father_name ?? null,
                    'tazkira_number' => $match->tazkira_number ?? null,
                    'card_number' => $match->card_number ?? null,
                    'admission_no' => $match->admission_no ?? null,
                    'orig_province' => $match->orig_province ?? null,
                    'admission_year' => $match->admission_year ?? null,
                    'created_at' => $match->created_at,
                    'match_reason' => 'Exact name and father name match',
                ];
            }

            // Tazkira number match
            if ($request->tazkira_number) {
                $tazkiraMatches = (clone $baseQuery)
                    ->where(function($q) use ($request) {
                        $q->where('tazkira_number', $request->tazkira_number)
                          ->orWhere('guardian_tazkira', $request->tazkira_number);
                    })
                    ->get();
                foreach ($tazkiraMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->tazkira_number ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Tazkira number matches',
                    ];
                }
            }

            // Card number match
            if ($request->card_number) {
                $cardMatches = (clone $baseQuery)
                    ->where('card_number', $request->card_number)
                    ->get();
                foreach ($cardMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->tazkira_number ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Card number matches',
                    ];
                }
            }

            // Admission number match
            if ($request->admission_no) {
                $admissionMatches = (clone $baseQuery)
                    ->where('admission_no', $request->admission_no)
                    ->get();
                foreach ($admissionMatches as $match) {
                    $results[] = [
                        'id' => $match->id,
                        'full_name' => $match->full_name ?? null,
                        'father_name' => $match->father_name ?? null,
                        'tazkira_number' => $match->tazkira_number ?? null,
                        'card_number' => $match->card_number ?? null,
                        'admission_no' => $match->admission_no ?? null,
                        'orig_province' => $match->orig_province ?? null,
                        'admission_year' => $match->admission_year ?? null,
                        'created_at' => $match->created_at,
                        'match_reason' => 'Admission number matches',
                    ];
                }
            }

            // Partial: name LIKE and father_name LIKE
            $partialMatches = (clone $baseQuery)
                ->where('full_name', 'ilike', "%{$request->full_name}%")
                ->where('father_name', 'ilike', "%{$request->father_name}%")
                ->get();
            foreach ($partialMatches as $match) {
                $results[] = [
                    'id' => $match->id,
                    'full_name' => $match->full_name ?? null,
                    'father_name' => $match->father_name ?? null,
                    'tazkira_number' => $match->tazkira_number ?? null,
                    'card_number' => $match->card_number ?? null,
                    'admission_no' => $match->admission_no ?? null,
                    'orig_province' => $match->orig_province ?? null,
                    'admission_year' => $match->admission_year ?? null,
                    'created_at' => $match->created_at,
                    'match_reason' => 'Partial name and father name match',
                ];
            }

            // Deduplicate by id + reason
            $seen = [];
            $unique = [];
            foreach ($results as $rec) {
                try {
                    $key = "{$rec['id']}:{$rec['match_reason']}";
                    if (!in_array($key, $seen)) {
                        $seen[] = $key;
                        $unique[] = $rec;
                    }
                } catch (\Exception $e) {
                    Log::warning('[StudentController::checkDuplicates] Error processing result', [
                        'result' => $rec,
                        'error' => $e->getMessage()
                    ]);
                    // Continue processing other results
                }
            }

            return response()->json(array_slice($unique, 0, 25));
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::warning('[StudentController::checkDuplicates] Validation error', ['errors' => $e->errors()]);
            throw $e;
        } catch (\Exception $e) {
            Log::error('[StudentController::checkDuplicates] Unexpected error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all()
            ]);
            return response()->json([
                'error' => 'An error occurred while checking for duplicate students',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }
}



