<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\StaffType;
use App\Models\StaffDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StaffController extends Controller
{
    /**
     * Display a listing of staff
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
            if (!$user->hasPermissionTo('staff.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        $query = Staff::with(['staffType', 'organization', 'school', 'profile'])
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

        if ($request->has('staff_type_id') && $request->staff_type_id) {
            $query->where('staff_type_id', $request->staff_type_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('father_name', 'ilike', "%{$search}%")
                  ->orWhere('grandfather_name', 'ilike', "%{$search}%")
                  ->orWhere('employee_id', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $staff = $query->orderBy('created_at', 'desc')->get();

        // Transform to include profile data
        $staff = $staff->map(function ($s) {
            $staffArray = $s->toArray();
            
            // Add profile if exists
            if ($s->profile_id && $s->profile) {
                $staffArray['profile'] = [
                    'id' => $s->profile->id,
                    'full_name' => $s->profile->full_name,
                    'email' => $s->profile->email,
                    'phone' => $s->profile->phone,
                    'avatar_url' => $s->profile->avatar_url,
                    'role' => $s->profile->role,
                ];
            }
            
            return $staffArray;
        });

        return response()->json($staff);
    }

    /**
     * Display the specified staff member
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
            if (!$user->hasPermissionTo('staff.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $staff = Staff::with(['staffType', 'organization', 'school', 'profile'])
            ->whereNull('deleted_at')
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        $staffArray = $staff->toArray();
        
        // Add profile if exists
        if ($staff->profile_id && $staff->profile) {
            $staffArray['profile'] = [
                'id' => $staff->profile->id,
                'full_name' => $staff->profile->full_name,
                'email' => $staff->profile->email,
                'phone' => $staff->profile->phone,
                'avatar_url' => $staff->profile->avatar_url,
                'role' => $staff->profile->role,
            ];
        }

        return response()->json($staffArray);
    }

    /**
     * Store a newly created staff member
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $request->validate([
            'profile_id' => 'nullable|uuid|exists:profiles,id',
            'organization_id' => 'required|uuid|exists:organizations,id',
            'employee_id' => 'required|string|max:50',
            'staff_type' => 'nullable|string|in:teacher,admin,accountant,librarian,hostel_manager,asset_manager,security,maintenance,other',
            'staff_type_id' => 'nullable|uuid|exists:staff_types,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'first_name' => 'required|string|max:100',
            'father_name' => 'required|string|max:100',
            'grandfather_name' => 'nullable|string|max:100',
            'tazkira_number' => 'nullable|string|max:50',
            'birth_year' => 'nullable|string|max:10',
            'birth_date' => 'nullable|date',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'home_address' => 'nullable|string|max:255',
            'origin_province' => 'nullable|string|max:50',
            'origin_district' => 'nullable|string|max:50',
            'origin_village' => 'nullable|string|max:50',
            'current_province' => 'nullable|string|max:50',
            'current_district' => 'nullable|string|max:50',
            'current_village' => 'nullable|string|max:50',
            'religious_education' => 'nullable|string|max:50',
            'religious_university' => 'nullable|string|max:100',
            'religious_graduation_year' => 'nullable|string|max:10',
            'religious_department' => 'nullable|string|max:100',
            'modern_education' => 'nullable|string|max:50',
            'modern_school_university' => 'nullable|string|max:100',
            'modern_graduation_year' => 'nullable|string|max:10',
            'modern_department' => 'nullable|string|max:100',
            'teaching_section' => 'nullable|string|max:50',
            'position' => 'nullable|string|max:50',
            'duty' => 'nullable|string|max:50',
            'salary' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,inactive,on_leave,terminated,suspended',
            'picture_url' => 'nullable|string',
            'document_urls' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Validate organization access
        if (!in_array($request->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot create staff for a non-accessible organization'], 403);
        }

        // Validate employee_id uniqueness within organization
        $existing = Staff::where('organization_id', $request->organization_id)
            ->where('employee_id', $request->employee_id)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Employee ID already exists in this organization'], 422);
        }

        // Validate profile_id uniqueness within organization if provided
        if ($request->profile_id) {
            $existingProfile = Staff::where('organization_id', $request->organization_id)
                ->where('profile_id', $request->profile_id)
                ->whereNull('deleted_at')
                ->first();

            if ($existingProfile) {
                return response()->json(['error' => 'Profile already assigned to a staff member in this organization'], 422);
            }
        }

        // Set default staff_type_id if not provided but staff_type is
        $staffTypeId = $request->staff_type_id;
        if (!$staffTypeId && $request->staff_type) {
            $staffType = StaffType::where('code', $request->staff_type)
                ->whereNull('organization_id')
                ->whereNull('deleted_at')
                ->first();
            if ($staffType) {
                $staffTypeId = $staffType->id;
            }
        }

        $staff = Staff::create([
            'profile_id' => $request->profile_id ?? null,
            'organization_id' => $request->organization_id,
            'employee_id' => $request->employee_id,
            'staff_type' => $request->staff_type ?? 'teacher',
            'staff_type_id' => $staffTypeId,
            'school_id' => $request->school_id ?? null,
            'first_name' => $request->first_name,
            'father_name' => $request->father_name,
            'grandfather_name' => $request->grandfather_name ?? null,
            'tazkira_number' => $request->tazkira_number ?? null,
            'birth_year' => $request->birth_year ?? null,
            'birth_date' => $request->birth_date ?? null,
            'phone_number' => $request->phone_number ?? null,
            'email' => $request->email ?? null,
            'home_address' => $request->home_address ?? null,
            'origin_province' => $request->origin_province ?? null,
            'origin_district' => $request->origin_district ?? null,
            'origin_village' => $request->origin_village ?? null,
            'current_province' => $request->current_province ?? null,
            'current_district' => $request->current_district ?? null,
            'current_village' => $request->current_village ?? null,
            'religious_education' => $request->religious_education ?? null,
            'religious_university' => $request->religious_university ?? null,
            'religious_graduation_year' => $request->religious_graduation_year ?? null,
            'religious_department' => $request->religious_department ?? null,
            'modern_education' => $request->modern_education ?? null,
            'modern_school_university' => $request->modern_school_university ?? null,
            'modern_graduation_year' => $request->modern_graduation_year ?? null,
            'modern_department' => $request->modern_department ?? null,
            'teaching_section' => $request->teaching_section ?? null,
            'position' => $request->position ?? null,
            'duty' => $request->duty ?? null,
            'salary' => $request->salary ?? null,
            'status' => $request->status ?? 'active',
            'picture_url' => $request->picture_url ?? null,
            'document_urls' => $request->document_urls ?? [],
            'notes' => $request->notes ?? null,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        $staff->load(['staffType', 'organization', 'school', 'profile']);

        $staffArray = $staff->toArray();
        if ($staff->profile) {
            $staffArray['profile'] = [
                'id' => $staff->profile->id,
                'full_name' => $staff->profile->full_name,
                'email' => $staff->profile->email,
                'phone' => $staff->profile->phone,
                'avatar_url' => $staff->profile->avatar_url,
                'role' => $staff->profile->role,
            ];
        }

        return response()->json($staffArray, 201);
    }

    /**
     * Update the specified staff member
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot update staff from different organization'], 403);
        }

        $request->validate([
            'profile_id' => 'nullable|uuid|exists:profiles,id',
            'employee_id' => 'sometimes|string|max:50',
            'staff_type' => 'nullable|string|in:teacher,admin,accountant,librarian,hostel_manager,asset_manager,security,maintenance,other',
            'staff_type_id' => 'nullable|uuid|exists:staff_types,id',
            'school_id' => 'nullable|uuid|exists:school_branding,id',
            'first_name' => 'sometimes|string|max:100',
            'father_name' => 'sometimes|string|max:100',
            'grandfather_name' => 'nullable|string|max:100',
            'tazkira_number' => 'nullable|string|max:50',
            'birth_year' => 'nullable|string|max:10',
            'birth_date' => 'nullable|date',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'home_address' => 'nullable|string|max:255',
            'origin_province' => 'nullable|string|max:50',
            'origin_district' => 'nullable|string|max:50',
            'origin_village' => 'nullable|string|max:50',
            'current_province' => 'nullable|string|max:50',
            'current_district' => 'nullable|string|max:50',
            'current_village' => 'nullable|string|max:50',
            'religious_education' => 'nullable|string|max:50',
            'religious_university' => 'nullable|string|max:100',
            'religious_graduation_year' => 'nullable|string|max:10',
            'religious_department' => 'nullable|string|max:100',
            'modern_education' => 'nullable|string|max:50',
            'modern_school_university' => 'nullable|string|max:100',
            'modern_graduation_year' => 'nullable|string|max:10',
            'modern_department' => 'nullable|string|max:100',
            'teaching_section' => 'nullable|string|max:50',
            'position' => 'nullable|string|max:50',
            'duty' => 'nullable|string|max:50',
            'salary' => 'nullable|string|max:50',
            'status' => 'nullable|string|in:active,inactive,on_leave,terminated,suspended',
            'picture_url' => 'nullable|string',
            'document_urls' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        // Validate employee_id uniqueness if being changed
        if ($request->has('employee_id') && $request->employee_id !== $staff->employee_id) {
            $existing = Staff::where('organization_id', $staff->organization_id)
                ->where('employee_id', $request->employee_id)
                ->where('id', '!=', $id)
                ->whereNull('deleted_at')
                ->first();

            if ($existing) {
                return response()->json(['error' => 'Employee ID already exists in this organization'], 422);
            }
        }

        // Validate profile_id uniqueness if being changed
        if ($request->has('profile_id') && $request->profile_id !== $staff->profile_id) {
            if ($request->profile_id) {
                $existingProfile = Staff::where('organization_id', $staff->organization_id)
                    ->where('profile_id', $request->profile_id)
                    ->where('id', '!=', $id)
                    ->whereNull('deleted_at')
                    ->first();

                if ($existingProfile) {
                    return response()->json(['error' => 'Profile already assigned to a staff member in this organization'], 422);
                }
            }
        }

        // Set default staff_type_id if not provided but staff_type is
        if ($request->has('staff_type') && !$request->has('staff_type_id')) {
            $staffType = StaffType::where('code', $request->staff_type)
                ->whereNull('organization_id')
                ->whereNull('deleted_at')
                ->first();
            if ($staffType) {
                $request->merge(['staff_type_id' => $staffType->id]);
            }
        }

        $updateData = $request->only([
            'profile_id',
            'employee_id',
            'staff_type',
            'staff_type_id',
            'school_id',
            'first_name',
            'father_name',
            'grandfather_name',
            'tazkira_number',
            'birth_year',
            'birth_date',
            'phone_number',
            'email',
            'home_address',
            'origin_province',
            'origin_district',
            'origin_village',
            'current_province',
            'current_district',
            'current_village',
            'religious_education',
            'religious_university',
            'religious_graduation_year',
            'religious_department',
            'modern_education',
            'modern_school_university',
            'modern_graduation_year',
            'modern_department',
            'teaching_section',
            'position',
            'duty',
            'salary',
            'status',
            'picture_url',
            'document_urls',
            'notes',
        ]);

        $updateData['updated_by'] = $user->id;

        $staff->update($updateData);
        $staff->load(['staffType', 'organization', 'school', 'profile']);

        $staffArray = $staff->toArray();
        if ($staff->profile) {
            $staffArray['profile'] = [
                'id' => $staff->profile->id,
                'full_name' => $staff->profile->full_name,
                'email' => $staff->profile->email,
                'phone' => $staff->profile->phone,
                'avatar_url' => $staff->profile->avatar_url,
                'role' => $staff->profile->role,
            ];
        }

        return response()->json($staffArray);
    }

    /**
     * Remove the specified staff member (soft delete)
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        // Check organization access
        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete staff from different organization'], 403);
        }

        // Soft delete
        $staff->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Staff member deleted successfully']);
    }

    /**
     * Get staff statistics
     */
    public function stats(Request $request)
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

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (empty($orgIds)) {
            return response()->json([
                'total' => 0,
                'active' => 0,
                'inactive' => 0,
                'on_leave' => 0,
                'terminated' => 0,
                'suspended' => 0,
                'by_type' => [
                    'teacher' => 0,
                    'admin' => 0,
                    'accountant' => 0,
                    'librarian' => 0,
                    'other' => 0,
                ],
            ]);
        }

        $query = Staff::whereNull('deleted_at')->whereIn('organization_id', $orgIds);

        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('organization_id', $request->organization_id);
            } else {
                return response()->json([
                    'total' => 0,
                    'active' => 0,
                    'inactive' => 0,
                    'on_leave' => 0,
                    'terminated' => 0,
                    'suspended' => 0,
                    'by_type' => [
                        'teacher' => 0,
                        'admin' => 0,
                        'accountant' => 0,
                        'librarian' => 0,
                        'other' => 0,
                    ],
                ]);
            }
        }

        // Get teacher type ID
        $teacherType = StaffType::where('code', 'teacher')
            ->whereNull('organization_id')
            ->whereNull('deleted_at')
            ->first();

        $teacherTypeId = $teacherType?->id;

        // Get counts by status
        $total = (clone $query)->count();
        $active = (clone $query)->where('status', 'active')->count();
        $inactive = (clone $query)->where('status', 'inactive')->count();
        $onLeave = (clone $query)->where('status', 'on_leave')->count();
        $terminated = (clone $query)->where('status', 'terminated')->count();
        $suspended = (clone $query)->where('status', 'suspended')->count();

        // Get counts by type
        $teachers = $teacherTypeId ? (clone $query)->where('staff_type_id', $teacherTypeId)->count() : 0;
        
        // Get other types
        $adminType = StaffType::where('code', 'admin')->whereNull('organization_id')->whereNull('deleted_at')->first();
        $accountantType = StaffType::where('code', 'accountant')->whereNull('organization_id')->whereNull('deleted_at')->first();
        $librarianType = StaffType::where('code', 'librarian')->whereNull('organization_id')->whereNull('deleted_at')->first();
        
        $admins = $adminType ? (clone $query)->where('staff_type_id', $adminType->id)->count() : 0;
        $accountants = $accountantType ? (clone $query)->where('staff_type_id', $accountantType->id)->count() : 0;
        $librarians = $librarianType ? (clone $query)->where('staff_type_id', $librarianType->id)->count() : 0;
        $other = $total - $teachers - $admins - $accountants - $librarians;

        return response()->json([
            'total' => $total,
            'active' => $active,
            'inactive' => $inactive,
            'on_leave' => $onLeave,
            'terminated' => $terminated,
            'suspended' => $suspended,
            'by_type' => [
                'teacher' => $teachers,
                'admin' => $admins,
                'accountant' => $accountants,
                'librarian' => $librarians,
                'other' => max(0, $other),
            ],
        ]);
    }

    /**
     * Upload staff picture
     */
    public function uploadPicture(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot upload picture for staff from different organization'], 403);
        }

        $request->validate([
            'file' => 'required|file|image|max:10240', // 10MB max
        ]);

        $file = $request->file('file');
        $fileExt = $file->getClientOriginalExtension();
        $fileName = time() . '.' . $fileExt;
        
        // Build path: {organization_id}/{school_id}/{staff_id}/picture/{filename}
        $schoolPath = $staff->school_id ? "{$staff->school_id}/" : '';
        $filePath = "{$staff->organization_id}/{$schoolPath}{$staff->id}/picture/{$fileName}";

        // Store file
        $storedPath = $file->storeAs('staff-files', $filePath, 'public');

        // Update staff record with picture URL (store relative path)
        $staff->update(['picture_url' => $fileName]);

        // Return public URL
        $publicUrl = Storage::disk('public')->url($storedPath);

        return response()->json([
            'url' => $publicUrl,
            'path' => $fileName,
        ]);
    }

    /**
     * Upload staff document
     */
    public function uploadDocument(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot upload document for staff from different organization'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $fileExt = $file->getClientOriginalExtension();
        $fileName = time() . '.' . $fileExt;
        
        // Build path: {organization_id}/{school_id}/{staff_id}/documents/{document_type}/{filename}
        $schoolPath = $staff->school_id ? "{$staff->school_id}/" : '';
        $filePath = "{$staff->organization_id}/{$schoolPath}{$staff->id}/documents/{$request->document_type}/{$fileName}";

        // Store file
        $storedPath = $file->storeAs('staff-files', $filePath, 'public');

        // Create document record
        $document = StaffDocument::create([
            'staff_id' => $staff->id,
            'organization_id' => $staff->organization_id,
            'school_id' => $staff->school_id,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'description' => $request->description ?? null,
            'uploaded_by' => $user->id,
        ]);

        // Return public URL
        $publicUrl = Storage::disk('public')->url($storedPath);

        return response()->json([
            'document' => $document,
            'url' => $publicUrl,
        ], 201);
    }
}



