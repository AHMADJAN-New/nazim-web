<?php

namespace App\Http\Controllers;

use App\Models\Student;
use App\Models\StudentDisciplineRecord;
use App\Models\Profile;
use App\Http\Requests\StoreStudentDisciplineRecordRequest;
use App\Http\Requests\UpdateStudentDisciplineRecordRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudentDisciplineRecordController extends Controller
{
    /**
     * Get accessible organization IDs for the current user
     */
    private function getAccessibleOrgIds($profile): array
    {
        // All users are restricted to their own organization
        if ($profile->organization_id) {
            return [$profile->organization_id];
        }
        
        return [];
    }

    /**
     * Display a listing of discipline records for a student
     */
    public function index(Request $request, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_discipline_records.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        // Load records without eager loading to avoid UUID type mismatch errors
        $records = StudentDisciplineRecord::where('student_id', $studentId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->orderBy('incident_date', 'desc')
            ->get();

        // Manually load relationships, filtering out invalid UUIDs
        $createdByIds = $records->pluck('created_by')
            ->filter(function($id) {
                if (empty($id)) return false;
                // Validate UUID format - filter out integers and invalid UUIDs
                return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $id);
            })
            ->unique()
            ->values();

        $resolvedByIds = $records->pluck('resolved_by')
            ->filter(function($id) {
                if (empty($id)) return false;
                // Validate UUID format - filter out integers and invalid UUIDs
                return preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $id);
            })
            ->unique()
            ->values();

        // Load profiles for valid UUIDs only using Profile model
        $createdByProfiles = collect();
        $resolvedByProfiles = collect();

        if ($createdByIds->isNotEmpty()) {
            try {
                $createdByProfiles = Profile::whereIn('id', $createdByIds->toArray())
                    ->get()
                    ->keyBy('id');
            } catch (\Exception $e) {
                Log::warning('[StudentDisciplineRecordController] Error loading createdBy profiles', [
                    'error' => $e->getMessage(),
                    'ids' => $createdByIds->toArray(),
                ]);
            }
        }

        if ($resolvedByIds->isNotEmpty()) {
            try {
                $resolvedByProfiles = Profile::whereIn('id', $resolvedByIds->toArray())
                    ->get()
                    ->keyBy('id');
            } catch (\Exception $e) {
                Log::warning('[StudentDisciplineRecordController] Error loading resolvedBy profiles', [
                    'error' => $e->getMessage(),
                    'ids' => $resolvedByIds->toArray(),
                ]);
            }
        }

        // Attach relationships to records
        $records->each(function($record) use ($createdByProfiles, $resolvedByProfiles) {
            if ($record->created_by && $createdByProfiles->has($record->created_by)) {
                $record->setRelation('createdBy', $createdByProfiles[$record->created_by]);
            } else {
                $record->setRelation('createdBy', null);
            }

            if ($record->resolved_by && $resolvedByProfiles->has($record->resolved_by)) {
                $record->setRelation('resolvedBy', $resolvedByProfiles[$record->resolved_by]);
            } else {
                $record->setRelation('resolvedBy', null);
            }
        });

        return response()->json($records);
    }

    /**
     * Store a newly created discipline record for a student
     */
    public function store(StoreStudentDisciplineRecordRequest $request, string $studentId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_discipline_records.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check student exists and user has access
        $student = Student::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($studentId);
        if (!$student) {
            return response()->json(['error' => 'Student not found'], 404);
        }

        $validated = $request->validated();
        $validated['student_id'] = $studentId;
        $validated['organization_id'] = $profile->organization_id;
        $validated['school_id'] = $currentSchoolId;
        $validated['severity'] = $validated['severity'] ?? 'minor';
        $validated['resolved'] = $validated['resolved'] ?? false;
        $validated['created_by'] = (string) $user->id;

        $record = StudentDisciplineRecord::create($validated);
        
        // Manually load relationships to avoid UUID type mismatch
        if ($record->created_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->created_by)) {
            try {
                $createdBy = Profile::find($record->created_by);
                $record->setRelation('createdBy', $createdBy);
            } catch (\Exception $e) {
                $record->setRelation('createdBy', null);
            }
        } else {
            $record->setRelation('createdBy', null);
        }

        if ($record->resolved_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->resolved_by)) {
            try {
                $resolvedBy = Profile::find($record->resolved_by);
                $record->setRelation('resolvedBy', $resolvedBy);
            } catch (\Exception $e) {
                $record->setRelation('resolvedBy', null);
            }
        } else {
            $record->setRelation('resolvedBy', null);
        }

        return response()->json($record, 201);
    }

    /**
     * Update the specified discipline record
     */
    public function update(UpdateStudentDisciplineRecordRequest $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_discipline_records.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $record = StudentDisciplineRecord::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $validated = $request->validated();
        unset($validated['organization_id'], $validated['school_id'], $validated['student_id'], $validated['created_by']);

        $record->update($validated);
        
        // Manually load relationships to avoid UUID type mismatch
        if ($record->created_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->created_by)) {
            try {
                $createdBy = Profile::find($record->created_by);
                $record->setRelation('createdBy', $createdBy);
            } catch (\Exception $e) {
                $record->setRelation('createdBy', null);
            }
        } else {
            $record->setRelation('createdBy', null);
        }

        if ($record->resolved_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->resolved_by)) {
            try {
                $resolvedBy = Profile::find($record->resolved_by);
                $record->setRelation('resolvedBy', $resolvedBy);
            } catch (\Exception $e) {
                $record->setRelation('resolvedBy', null);
            }
        } else {
            $record->setRelation('resolvedBy', null);
        }

        return response()->json($record);
    }

    /**
     * Remove the specified discipline record (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('student_discipline_records.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for student_discipline_records.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId(request());

        $record = StudentDisciplineRecord::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $record->delete();

        return response()->noContent();
    }

    /**
     * Mark a discipline record as resolved
     */
    public function resolve(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', (string) $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $record = StudentDisciplineRecord::whereNull('deleted_at')
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$record) {
            return response()->json(['error' => 'Discipline record not found'], 404);
        }

        $record->update([
            'resolved' => true,
            'resolved_date' => now()->toDateString(),
            'resolved_by' => (string) $user->id,
        ]);

        // Manually load relationships to avoid UUID type mismatch
        if ($record->created_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->created_by)) {
            try {
                $createdBy = Profile::find($record->created_by);
                $record->setRelation('createdBy', $createdBy);
            } catch (\Exception $e) {
                $record->setRelation('createdBy', null);
            }
        } else {
            $record->setRelation('createdBy', null);
        }

        if ($record->resolved_by && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', (string) $record->resolved_by)) {
            try {
                $resolvedBy = Profile::find($record->resolved_by);
                $record->setRelation('resolvedBy', $resolvedBy);
            } catch (\Exception $e) {
                $record->setRelation('resolvedBy', null);
            }
        } else {
            $record->setRelation('resolvedBy', null);
        }

        return response()->json($record);
    }
}



