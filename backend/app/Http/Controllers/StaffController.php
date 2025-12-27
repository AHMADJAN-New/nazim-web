<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\StaffType;
use App\Models\StaffDocument;
use App\Services\Storage\FileStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StaffController extends Controller
{
    public function __construct(
        private FileStorageService $fileStorageService
    ) {}
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

        // Strict school scoping: only current school from middleware context
        $currentSchoolId = $this->getCurrentSchoolId($request);

        $query = Staff::with(['staffType', 'organization', 'school', 'profile'])
            ->whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

        // Apply filters
        // NOTE: Ignore client-provided organization_id/school_id; everything is school-scoped.

        if ($request->has('staff_type_id') && $request->staff_type_id) {
            $query->where('staff_type_id', $request->staff_type_id);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // school_id filter is ignored; current school enforced.

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('father_name', 'ilike', "%{$search}%")
                  ->orWhere('grandfather_name', 'ilike', "%{$search}%")
                  ->orWhere('employee_id', 'ilike', "%{$search}%")
                  ->orWhere('staff_code', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        // Handle pagination if requested
        if ($request->has('page') && $request->has('per_page')) {
            $perPage = (int) $request->per_page;
            $page = (int) $request->page;
            
            $staff = $query->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
            
            // Transform to include profile data
            $transformedData = $staff->getCollection()->map(function ($s) {
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
            
            // Return paginated response in Laravel format
            return response()->json([
                'data' => $transformedData,
                'current_page' => $staff->currentPage(),
                'from' => $staff->firstItem(),
                'last_page' => $staff->lastPage(),
                'per_page' => $staff->perPage(),
                'to' => $staff->lastItem(),
                'total' => $staff->total(),
                'path' => $request->url(),
                'first_page_url' => $staff->url(1),
                'last_page_url' => $staff->url($staff->lastPage()),
                'next_page_url' => $staff->nextPageUrl(),
                'prev_page_url' => $staff->previousPageUrl(),
            ]);
        }

        // Non-paginated response
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

        $currentSchoolId = request()->get('current_school_id');

        $staff = Staff::with(['staffType', 'organization', 'school', 'profile'])
            ->whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Org access is enforced by organization middleware + school scope.

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
            // These are scope fields; accepted for backward compatibility but ignored.
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'employee_id' => 'required|string|max:50',
            'staff_code' => [
                'nullable',
                'string',
                'max:32',
                function ($attribute, $value, $fail) use ($request, $profile) {
                    if ($value && $profile?->organization_id) {
                        $schoolId = $request->get('current_school_id');
                        $exists = DB::table('staff')
                            ->where('staff_code', $value)
                            ->where('organization_id', $profile->organization_id)
                            ->where('school_id', $schoolId)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A staff member with this code already exists in this school.');
                        }
                    }
                },
            ],
            'staff_type' => 'nullable|string|in:teacher,admin,accountant,librarian,hostel_manager,asset_manager,security,maintenance,other',
            'staff_type_id' => 'nullable|uuid|exists:staff_types,id',
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
            if (!$user->hasPermissionTo('staff.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.create: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $organizationId = $profile->organization_id;
        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Validate employee_id uniqueness within organization
        $existing = Staff::where('organization_id', $organizationId)
            ->where('school_id', $currentSchoolId)
            ->where('employee_id', $request->employee_id)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Employee ID already exists in this organization'], 422);
        }

        // Validate profile_id uniqueness within organization if provided
        if ($request->profile_id) {
            $existingProfile = Staff::where('organization_id', $organizationId)
                ->where('school_id', $currentSchoolId)
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
            'organization_id' => $organizationId,
            'employee_id' => $request->employee_id,
            'staff_code' => $request->staff_code ?? null, // Will be auto-generated if null
            'staff_type' => $request->staff_type ?? 'teacher',
            'staff_type_id' => $staffTypeId,
            // Force current school (never trust client input)
            'school_id' => $currentSchoolId,
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $staff = Staff::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.update: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Org access is enforced by organization middleware + school scope.

        $request->validate([
            'profile_id' => 'nullable|uuid|exists:profiles,id',
            'employee_id' => 'sometimes|string|max:50',
            'staff_code' => [
                'nullable',
                'string',
                'max:32',
                function ($attribute, $value, $fail) use ($staff) {
                    if ($value && $staff->organization_id) {
                        $exists = DB::table('staff')
                            ->where('staff_code', $value)
                            ->where('organization_id', $staff->organization_id)
                            ->where('id', '!=', $staff->id)
                            ->whereNull('deleted_at')
                            ->exists();
                        if ($exists) {
                            $fail('A staff member with this code already exists in this organization.');
                        }
                    }
                },
            ],
            'staff_type' => 'nullable|string|in:teacher,admin,accountant,librarian,hostel_manager,asset_manager,security,maintenance,other',
            'staff_type_id' => 'nullable|uuid|exists:staff_types,id',
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
            'staff_code',
            'staff_type',
            'staff_type_id',
            // school_id is scope and cannot be updated via this endpoint
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

        unset($updateData['school_id'], $updateData['organization_id']);
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

        $currentSchoolId = request()->get('current_school_id');
        $staff = Staff::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (!$user->hasPermissionTo('staff.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for staff.delete: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        // Org access is enforced by organization middleware + school scope.

        // Soft delete
        $staff->delete();

        // CRITICAL: Return 204 No Content with NO body (not JSON)
        return response()->noContent();
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $query = Staff::whereNull('deleted_at')
            ->whereIn('organization_id', $orgIds)
            ->where('school_id', $currentSchoolId);

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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $staff = Staff::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Org access is enforced by organization middleware + school scope.

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
        ]);

        $file = $request->file('file');

        // Validate image extension
        if (!$this->fileStorageService->isAllowedExtension($file->getClientOriginalName(), $this->fileStorageService->getAllowedImageExtensions())) {
            return response()->json(['error' => 'The file must be an image (jpg, jpeg, png, gif, or webp).'], 422);
        }

        // Delete old picture if exists
        if ($staff->picture_url) {
            // Try to delete old picture from public storage
            $this->fileStorageService->deleteFile($staff->picture_url, $this->fileStorageService->getPublicDisk());
        }

        // Store picture using FileStorageService (PUBLIC storage for staff pictures)
        $filePath = $this->fileStorageService->storeStaffPicturePublic(
            $file,
            $staff->organization_id,
            $id,
            $staff->school_id
        );

        // Update staff record with picture path
        $staff->update(['picture_url' => $filePath]);

        // Return public URL
        $publicUrl = $this->fileStorageService->getPublicUrl($filePath);

        return response()->json([
            'url' => $publicUrl,
            'path' => $filePath,
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

        $currentSchoolId = $this->getCurrentSchoolId($request);
        $staff = Staff::whereNull('deleted_at')
            ->where('school_id', $currentSchoolId)
            ->find($id);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Org access is enforced by organization middleware + school scope.

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');

        // Store document using FileStorageService (PRIVATE storage for staff documents)
        $filePath = $this->fileStorageService->storeStaffDocument(
            $file,
            $staff->organization_id,
            $id,
            $staff->school_id,
            $request->document_type
        );

        // Create document record
        $document = StaffDocument::create([
            'staff_id' => $staff->id,
            'organization_id' => $staff->organization_id,
            'school_id' => $staff->school_id,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'mime_type' => $this->fileStorageService->getMimeTypeFromExtension($file->getClientOriginalName()),
            'description' => $request->description ?? null,
            'uploaded_by' => $user->id,
        ]);

        // Return download URL for private file
        $downloadUrl = $this->fileStorageService->getPrivateDownloadUrl($filePath);

        return response()->json([
            'document' => $document,
            'download_url' => $downloadUrl,
        ], 201);
    }
}



