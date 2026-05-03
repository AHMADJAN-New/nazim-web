<?php

namespace App\Http\Controllers;

use App\Helpers\OrganizationHelper;
use App\Http\Controllers\Concerns\RestrictsSchoolScopedAdmins;
use App\Models\SchoolBranding;
use App\Models\User;
use App\Services\ActivityLogService;
use App\Services\OrganizationAdminSchoolAccessService;
use App\Services\TourAssignmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class UserController extends Controller
{
    use RestrictsSchoolScopedAdmins;

    public function __construct(
        private ActivityLogService $activityLogService,
        private OrganizationAdminSchoolAccessService $organizationAdminSchoolAccessService
    ) {}

    /**
     * Display a listing of users
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('users.read')) {
                return response()->json(['error' => 'Insufficient permissions to view users'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for users.read - denying access: '.$e->getMessage());

            return response()->json(['error' => 'Insufficient permissions to view users'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$profile->organization_id];

        if (empty($orgIds)) {
            return response()->json([]);
        }

        // Join with users table to get email (email is stored in auth.users table)
        // Left join with staff to get staff information and avatar
        $query = DB::table('profiles')
            ->join('users', 'profiles.id', '=', 'users.id')
            ->leftJoin('staff', 'profiles.staff_id', '=', 'staff.id')
            ->select(
                'profiles.id',
                'profiles.full_name',
                'users.email', // Get email from users table (auth schema)
                'profiles.role',
                'profiles.organization_id',
                'profiles.default_school_id',
                'profiles.staff_id',
                'profiles.phone',
                'profiles.avatar_url',
                'profiles.is_active',
                'profiles.schools_access_all',
                'profiles.created_at',
                'profiles.updated_at',
                // Staff information
                'staff.picture_url as staff_picture_url',
                'staff.full_name as staff_full_name',
                'staff.employee_id as staff_employee_id'
            )
            ->whereNull('profiles.deleted_at')
            ->whereIn('profiles.organization_id', $orgIds);

        if ($this->isSchoolScopedProfile($profile)) {
            $query->where('profiles.default_school_id', $profile->default_school_id);
        }

        // Apply filters
        if ($request->has('role') && $request->role) {
            $query->where('profiles.role', $request->role);
        }

        if ($request->has('organization_id') && $request->organization_id) {
            if (in_array($request->organization_id, $orgIds)) {
                $query->where('profiles.organization_id', $request->organization_id);
            } else {
                return response()->json([]);
            }
        }

        if ($request->has('is_active') && $request->is_active !== null) {
            $query->where('profiles.is_active', $request->is_active);
        }

        $profiles = $query->orderBy('profiles.created_at', 'desc')->get();

        // Transform to UserProfile format
        $users = $profiles->map(function ($p) {
            // Ensure we have valid data - check if full_name or email exist
            $name = ! empty($p->full_name) ? $p->full_name : (! empty($p->email) ? $p->email : 'No name');
            $email = ! empty($p->email) ? $p->email : 'No email';

            // Use staff picture if available, otherwise use profile avatar
            $avatar = $p->staff_picture_url ?? $p->avatar_url ?? null;

            return [
                'id' => $p->id,
                'name' => $name,
                'email' => $email,
                'role' => (string) ($p->role ?? ''),
                'organization_id' => $p->organization_id,
                'default_school_id' => $p->default_school_id ?? null,
                'staff_id' => $p->staff_id ?? null,
                'phone' => $p->phone ?? null,
                'avatar' => $avatar,
                'schools_access_all' => (bool) ($p->schools_access_all ?? false),
                'is_active' => $p->is_active ?? true,
                'created_at' => $p->created_at,
                'updated_at' => $p->updated_at,
                // Staff information
                'staff' => $p->staff_id ? [
                    'id' => $p->staff_id,
                    'full_name' => $p->staff_full_name,
                    'employee_id' => $p->staff_employee_id,
                    'picture_url' => $p->staff_picture_url,
                ] : null,
            ];
        });

        // Apply search filter client-side
        if ($request->has('search') && $request->search) {
            $searchLower = strtolower($request->search);
            $users = $users->filter(function ($u) use ($searchLower) {
                return str_contains(strtolower($u['name']), $searchLower) ||
                       str_contains(strtolower($u['email']), $searchLower) ||
                       str_contains(strtolower($u['role']), $searchLower);
            })->values();
        }

        return response()->json($users->values());
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request)
    {
        $request->validate([
            // Email must be globally unique across all users (not per-organization)
            'email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')],
            'password' => 'required|string|min:8',
            'full_name' => 'required|string|max:255',
            'role' => 'required|string|max:255', // Changed: Allow any role name, validate existence later
            'organization_id' => 'nullable|uuid|exists:organizations,id',
            'default_school_id' => 'nullable|uuid',
            'staff_id' => 'nullable|uuid|exists:staff,id',
            'phone' => 'nullable|string|max:20',
            'schools_access_all' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('users.create')) {
                return response()->json(['error' => 'Insufficient permissions to create users'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for users.create - denying access: '.$e->getMessage());

            return response()->json(['error' => 'Insufficient permissions to create users'], 403);
        }

        // Get accessible organization IDs (user's organization only)
        $orgIds = [$currentProfile->organization_id];

        // Determine organization_id
        $organizationId = $request->organization_id ?? $currentProfile->organization_id ?? null;

        // If no organization_id provided, get default "ناظم" organization (cached)
        if (! $organizationId) {
            $organizationId = OrganizationHelper::getDefaultOrganizationId();

            if (! $organizationId && ! empty($orgIds)) {
                $organizationId = $orgIds[0];
            }
        }

        if ($organizationId && ! in_array($organizationId, $orgIds)) {
            return response()->json(['error' => 'Cannot create user for a non-accessible organization'], 403);
        }

        $isSchoolScopedManager = $this->isSchoolScopedProfile($currentProfile);

        if ($isSchoolScopedManager && $this->isProtectedOrganizationRole($request->role)) {
            return response()->json(['error' => 'School admins cannot assign the organization_admin role'], 403);
        }

        if ($isSchoolScopedManager && $request->boolean('schools_access_all')) {
            return response()->json(['error' => 'School admins cannot grant access to all schools'], 403);
        }

        // CRITICAL: Validate that the role exists in the organization's roles table
        // This allows custom roles created by the organization admin
        if ($request->role && $organizationId) {
            $roleExists = DB::table('roles')
                ->where('name', $request->role)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->exists();

            if (! $roleExists) {
                return response()->json([
                    'error' => 'The selected role is invalid.',
                    'message' => "Role '{$request->role}' does not exist in your organization. Please select a valid role.",
                ], 422);
            }
        }

        // Determine default_school_id: explicit null = no school (org-level user); omitted = auto-assign first school
        $defaultSchoolId = $request->has('default_school_id') ? $request->default_school_id : null;
        if ($defaultSchoolId === null && ! $request->has('default_school_id') && $organizationId) {
            $school = SchoolBranding::where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->orderBy('created_at', 'asc')
                ->first();
            if ($school) {
                $defaultSchoolId = $school->id;
            }
        }
        // When no school (org-level user), set schools_access_all so they can access Organization Admin
        $schoolsAccessAll = $request->has('default_school_id') && $request->default_school_id === null
            ? true
            : $request->boolean('schools_access_all', false);
        if ($organizationId && $this->organizationAdminSchoolAccessService->shouldAutoEnableAllSchoolsForRole($organizationId, $request->role)) {
            $schoolsAccessAll = true;
        }

        if ($isSchoolScopedManager) {
            $managerSchoolId = $currentProfile->default_school_id ?? null;

            if (! is_string($managerSchoolId) || $managerSchoolId === '') {
                return response()->json(['error' => 'School context is required for school admins'], 403);
            }

            if ($request->has('default_school_id')) {
                $requestedSchoolId = $request->default_school_id;
                if (! is_string($requestedSchoolId) || $requestedSchoolId === '' || $requestedSchoolId !== $managerSchoolId) {
                    return response()->json(['error' => 'School admins can only create users for their own school'], 403);
                }
            }

            $defaultSchoolId = $managerSchoolId;
            $schoolsAccessAll = false;
        }

        // Create user in auth.users table
        $userId = (string) Str::uuid();
        $encryptedPassword = Hash::make($request->password);

        DB::table('users')->insert([
            'id' => $userId,
            'email' => $request->email,
            'encrypted_password' => $encryptedPassword,
            'email_confirmed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Validate staff_id belongs to the same organization if provided
        if ($request->has('staff_id') && $request->staff_id) {
            $staff = DB::table('staff')
                ->where('id', $request->staff_id)
                ->where('organization_id', $organizationId)
                ->whereNull('deleted_at')
                ->first();

            if (! $staff) {
                return response()->json(['error' => 'Staff member not found or does not belong to your organization'], 422);
            }
        }

        // Create profile
        DB::table('profiles')->insert([
            'id' => $userId,
            'email' => $request->email,
            'full_name' => $request->full_name,
            'role' => $request->role,
            'organization_id' => $organizationId,
            'default_school_id' => $defaultSchoolId,
            'staff_id' => $request->staff_id ?? null,
            'phone' => $request->phone ?? null,
            'schools_access_all' => $schoolsAccessAll,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // CRITICAL: Assign role to user via Spatie's model_has_roles table
        if ($request->role && $organizationId) {
            $role = DB::table('roles')
                ->where('name', $request->role)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->first();

            if ($role) {
                // Check if role is already assigned
                $hasRole = DB::table('model_has_roles')
                    ->where('role_id', $role->id)
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $userId)
                    ->where('organization_id', $organizationId)
                    ->exists();

                if (! $hasRole) {
                    DB::table('model_has_roles')->insert([
                        'role_id' => $role->id,
                        'model_type' => 'App\\Models\\User',
                        'model_id' => $userId,
                        'organization_id' => $organizationId, // CRITICAL: Always set organization_id
                    ]);
                }

                app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
            }
        }

        // Assign schools.access_all permission if checkbox is checked
        if ($request->boolean('schools_access_all') && $organizationId) {
            // Get User model instance (Spatie needs Eloquent model)
            $userModel = \App\Models\User::find($userId);
            if ($userModel) {
                // Organization context is already set by middleware, but ensure it's set
                // Spatie will use the organization context from EnsureOrganizationAccess middleware
                $userModel->givePermissionTo('schools.access_all');
            }
        }

        // CRITICAL: Auto-assign tours to new users
        // initialSetup tour should ALWAYS be assigned to all users, regardless of organization or permissions
        try {
            $tourService = app(TourAssignmentService::class);

            // CRITICAL: Always assign initialSetup tour first (no permissions required)
            $tourService->assignInitialSetupTour($userId);

            // Then assign other tours based on permissions (if user has organization and permissions)
            $userModel = \App\Models\User::find($userId);
            if ($userModel && $organizationId) {
                // Set organization context for permission checks (global helper, not User method)
                setPermissionsTeamId($organizationId);

                // Get user's permissions (from roles and direct assignments)
                $userPermissions = $userModel->getAllPermissions()->pluck('name')->toArray();

                // Assign other tours based on permissions (initialSetup already assigned above)
                $assignedTours = $tourService->assignToursForUser($userId, $userPermissions);

                if (! empty($assignedTours) && config('app.debug')) {
                    Log::info("Assigned tours to user {$userId}: ".implode(', ', $assignedTours));
                }
            } else {
                // User created without organization - still assign initialSetup (already done above)
                if (config('app.debug')) {
                    Log::info("Assigned initialSetup tour to user {$userId} (no organization/permissions yet)");
                }
            }
        } catch (\Exception $e) {
            // Don't fail user creation if tour assignment fails
            Log::warning("Failed to assign tours to user {$userId}: ".$e->getMessage());
        }

        $createdProfile = DB::table('profiles')->where('id', $userId)->first();

        // Get staff information if staff_id is set
        $staffInfo = null;
        if ($createdProfile->staff_id) {
            $staff = DB::table('staff')
                ->where('id', $createdProfile->staff_id)
                ->whereNull('deleted_at')
                ->first();

            if ($staff) {
                $staffInfo = [
                    'id' => $staff->id,
                    'full_name' => $staff->full_name,
                    'employee_id' => $staff->employee_id,
                    'picture_url' => $staff->picture_url,
                ];
            }
        }

        // Return in UserProfile format
        return response()->json([
            'id' => $userId,
            'name' => $createdProfile->full_name || $createdProfile->email || '',
            'email' => $createdProfile->email || '',
            'role' => (string) ($createdProfile->role ?? ''),
            'organization_id' => $createdProfile->organization_id,
            'default_school_id' => $createdProfile->default_school_id ?? null,
            'staff_id' => $createdProfile->staff_id ?? null,
            'phone' => $createdProfile->phone,
            'avatar' => ($staffInfo && isset($staffInfo['picture_url'])) ? $staffInfo['picture_url'] : ($createdProfile->avatar_url ?? null),
            'is_active' => $createdProfile->is_active ?? true,
            'created_at' => $createdProfile->created_at,
            'updated_at' => $createdProfile->updated_at,
            'staff' => $staffInfo,
        ], 201);
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255',
            'role' => 'sometimes|string|max:64',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'sometimes|boolean',
            'schools_access_all' => 'nullable|boolean',
            'default_school_id' => 'nullable|uuid',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('users.update')) {
                return response()->json(['error' => 'Insufficient permissions to update users'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for users.update - denying access: '.$e->getMessage());

            return response()->json(['error' => 'Insufficient permissions to update users'], 403);
        }

        // Get target user's profile
        $targetProfile = DB::table('profiles')->where('id', $id)->first();

        if (! $targetProfile) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Require organization_id for all users
        if (! $currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check organization access (all users)
        if ($targetProfile->organization_id !== $currentProfile->organization_id) {
            return response()->json(['error' => 'Cannot update user from different organization'], 403);
        }

        $isSchoolScopedManager = $this->isSchoolScopedProfile($currentProfile);

        if ($isSchoolScopedManager && ! $this->canSchoolScopedProfileManageTarget($currentProfile, $targetProfile)) {
            return response()->json(['error' => 'School admins can only manage users in their own school'], 403);
        }

        if ($isSchoolScopedManager && $this->userHasProtectedOrganizationRole($id, $currentProfile->organization_id)) {
            return response()->json(['error' => 'School admins cannot manage organization administrators'], 403);
        }

        // Validate staff_id belongs to the same organization if provided
        if ($request->has('staff_id') && $request->staff_id !== null) {
            $staff = DB::table('staff')
                ->where('id', $request->staff_id)
                ->where('organization_id', $targetProfile->organization_id)
                ->whereNull('deleted_at')
                ->first();

            if (! $staff) {
                return response()->json(['error' => 'Staff member not found or does not belong to your organization'], 422);
            }
        }

        // Validate default_school_id when provided: null = no school (org-level); non-null = must belong to org
        if ($request->has('default_school_id')) {
            $newSchoolId = $request->default_school_id;
            if ($newSchoolId !== null && $newSchoolId !== '') {
                $schoolExists = DB::table('school_branding')
                    ->where('id', $newSchoolId)
                    ->where('organization_id', $targetProfile->organization_id)
                    ->whereNull('deleted_at')
                    ->exists();
                if (! $schoolExists) {
                    return response()->json(['error' => 'Selected school does not belong to this organization'], 422);
                }
            }
        }

        // CRITICAL: Validate role exists in the target user's organization (same as store)
        $organizationId = $targetProfile->organization_id;
        if ($request->has('role') && $request->role !== null && $request->role !== '') {
            $roleExists = DB::table('roles')
                ->where('name', $request->role)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->exists();

            if (! $roleExists) {
                return response()->json([
                    'error' => 'The selected role is invalid.',
                    'message' => "Role '{$request->role}' does not exist in your organization. Please select a valid role.",
                ], 422);
            }
        }

        if ($isSchoolScopedManager && $request->has('role') && $this->isProtectedOrganizationRole($request->role)) {
            return response()->json(['error' => 'School admins cannot assign the organization_admin role'], 403);
        }

        if ($isSchoolScopedManager && $request->has('schools_access_all') && $request->boolean('schools_access_all')) {
            return response()->json(['error' => 'School admins cannot grant access to all schools'], 403);
        }

        if ($isSchoolScopedManager && $request->has('default_school_id')) {
            $managerSchoolId = $currentProfile->default_school_id ?? null;
            $requestedSchoolId = $request->default_school_id;

            if (! is_string($managerSchoolId) || $managerSchoolId === '') {
                return response()->json(['error' => 'School context is required for school admins'], 403);
            }

            if (! is_string($requestedSchoolId) || $requestedSchoolId === '' || $requestedSchoolId !== $managerSchoolId) {
                return response()->json(['error' => 'School admins can only assign users to their own school'], 403);
            }
        }

        // Build update data - NEVER change organization_id from request
        $updateData = [];
        if ($request->has('full_name')) {
            $updateData['full_name'] = $request->full_name;
        }
        if ($request->has('phone')) {
            $updateData['phone'] = $request->phone;
        }
        if ($request->has('role')) {
            $updateData['role'] = $request->role;
        }
        if ($request->has('is_active')) {
            $updateData['is_active'] = $request->is_active;
        }
        if ($request->has('staff_id')) {
            $updateData['staff_id'] = $request->staff_id;
        }
        $schoolsAccessAllExplicitlyProvided = $request->has('schools_access_all');
        if ($schoolsAccessAllExplicitlyProvided) {
            $updateData['schools_access_all'] = $request->boolean('schools_access_all');
        }
        // Allow updating default_school_id (including to null for org-level users)
        if ($request->has('default_school_id')) {
            $updateData['default_school_id'] = $request->default_school_id ?: null;
            // When setting to no school, auto-enable schools_access_all so they can access Organization Admin
            // Only apply when user did NOT explicitly set schools_access_all (respect explicit choice)
            if (! $schoolsAccessAllExplicitlyProvided && ($request->default_school_id === null || $request->default_school_id === '')) {
                $updateData['schools_access_all'] = true;
            }
        }
        // Auto-enable schools_access_all for org-level roles (e.g. organization_admin)
        // Only apply when user did NOT explicitly set schools_access_all (respect explicit choice)
        if (! $schoolsAccessAllExplicitlyProvided && $organizationId) {
            $effectiveRole = $request->has('role') ? $request->role : ($targetProfile->role ?? null);
            if ($this->organizationAdminSchoolAccessService->shouldAutoEnableAllSchoolsForRole($organizationId, $effectiveRole)) {
                $updateData['schools_access_all'] = true;
            }
        }

        // Update email in both users and profiles tables
        if ($request->has('email')) {
            // Check if email is already taken by another user
            $existingUser = DB::table('users')
                ->where('email', $request->email)
                ->where('id', '!=', $id)
                ->first();

            if ($existingUser) {
                return response()->json(['error' => 'Email already taken'], 422);
            }

            DB::table('users')
                ->where('id', $id)
                ->update(['email' => $request->email, 'updated_at' => now()]);

            $updateData['email'] = $request->email;
        }

        $updateData['updated_at'] = now();

        DB::table('profiles')
            ->where('id', $id)
            ->update($updateData);

        // CRITICAL: Sync Spatie model_has_roles when role is updated (organization_id and default_school_id stay intact)
        if ($request->has('role') && $organizationId) {
            $newRoleName = $request->role;
            $roleRow = DB::table('roles')
                ->where('name', $newRoleName)
                ->where('organization_id', $organizationId)
                ->where('guard_name', 'web')
                ->first();

            if ($roleRow) {
                // Remove all existing roles for this user in this organization
                DB::table('model_has_roles')
                    ->where('model_type', 'App\\Models\\User')
                    ->where('model_id', $id)
                    ->where('organization_id', $organizationId)
                    ->delete();

                // Assign the new role
                DB::table('model_has_roles')->insert([
                    'role_id' => $roleRow->id,
                    'model_type' => 'App\\Models\\User',
                    'model_id' => $id,
                    'organization_id' => $organizationId,
                ]);
            }
        }

        $updatedProfile = DB::table('profiles')->where('id', $id)->first();

        // Get staff information if staff_id is set
        $staffInfo = null;
        if ($updatedProfile->staff_id) {
            $staff = DB::table('staff')
                ->where('id', $updatedProfile->staff_id)
                ->whereNull('deleted_at')
                ->first();

            if ($staff) {
                $staffInfo = [
                    'id' => $staff->id,
                    'full_name' => $staff->full_name,
                    'employee_id' => $staff->employee_id,
                    'picture_url' => $staff->picture_url,
                ];
            }
        }

        // Return in UserProfile format
        return response()->json([
            'id' => $id,
            'name' => $updatedProfile->full_name || $updatedProfile->email || '',
            'email' => $updatedProfile->email || '',
            'role' => (string) ($updatedProfile->role ?? ''),
            'organization_id' => $updatedProfile->organization_id,
            'default_school_id' => $updatedProfile->default_school_id ?? null,
            'staff_id' => $updatedProfile->staff_id ?? null,
            'phone' => $updatedProfile->phone,
            'avatar' => $staffInfo['picture_url'] ?? $updatedProfile->avatar_url ?? null,
            'is_active' => $updatedProfile->is_active ?? true,
            'created_at' => $updatedProfile->created_at,
            'updated_at' => $updatedProfile->updated_at,
            'staff' => $staffInfo,
        ]);
    }

    /**
     * Remove the specified user
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('users.delete')) {
                return response()->json(['error' => 'Insufficient permissions to delete users'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for users.delete - denying access: '.$e->getMessage());

            return response()->json(['error' => 'Insufficient permissions to delete users'], 403);
        }

        // Get target user's profile
        $targetProfile = DB::table('profiles')->where('id', $id)->first();

        if (! $targetProfile) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Check organization access (all users)
        if ($targetProfile->organization_id !== $currentProfile->organization_id) {
            return response()->json(['error' => 'Cannot delete user from different organization'], 403);
        }

        if ($this->isSchoolScopedProfile($currentProfile) && ! $this->canSchoolScopedProfileManageTarget($currentProfile, $targetProfile)) {
            return response()->json(['error' => 'School admins can only manage users in their own school'], 403);
        }

        if ($this->isSchoolScopedProfile($currentProfile) && $this->userHasProtectedOrganizationRole($id, $currentProfile->organization_id)) {
            return response()->json(['error' => 'School admins cannot manage organization administrators'], 403);
        }

        // Capture user data before deletion for logging
        $deletedUserData = [
            'id' => $id,
            'email' => DB::table('users')->where('id', $id)->value('email'),
            'full_name' => $targetProfile->full_name ?? null,
        ];

        // Delete user (cascade will delete profile)
        DB::table('users')->where('id', $id)->delete();
        DB::table('profiles')->where('id', $id)->delete();

        // Log user deletion
        try {
            $this->activityLogService->logEvent(
                description: "Deleted user: {$deletedUserData['email']}",
                logName: 'users',
                event: 'deleted',
                properties: ['deleted_user' => $deletedUserData],
                request: request()
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log user deletion: '.$e->getMessage());
        }

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Reset password for a user
     */
    public function resetPassword(Request $request, string $id)
    {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);

        $user = $request->user();
        $currentProfile = DB::table('profiles')->where('id', $user->id)->first();

        if (! $currentProfile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (! $currentProfile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        try {
            if (! $user->hasPermissionTo('users.reset_password')) {
                return response()->json(['error' => 'Insufficient permissions to reset passwords'], 403);
            }
        } catch (\Exception $e) {
            Log::warning('Permission check failed for users.reset_password - denying access: '.$e->getMessage());

            return response()->json(['error' => 'Insufficient permissions to reset passwords'], 403);
        }

        // Check if user exists
        $targetUser = DB::table('users')->where('id', $id)->first();
        if (! $targetUser) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $targetProfile = DB::table('profiles')->where('id', $id)->first();
        if (! $targetProfile || $targetProfile->organization_id !== $currentProfile->organization_id) {
            return response()->json(['error' => 'Cannot reset password for user in different organization'], 403);
        }

        if ($this->isSchoolScopedProfile($currentProfile) && ! $this->canSchoolScopedProfileManageTarget($currentProfile, $targetProfile)) {
            return response()->json(['error' => 'School admins can only manage users in their own school'], 403);
        }

        if ($this->isSchoolScopedProfile($currentProfile) && $this->userHasProtectedOrganizationRole($id, $currentProfile->organization_id)) {
            return response()->json(['error' => 'School admins cannot manage organization administrators'], 403);
        }

        // Update password
        $encryptedPassword = Hash::make($request->password);
        DB::table('users')
            ->where('id', $id)
            ->update([
                'encrypted_password' => $encryptedPassword,
                'updated_at' => now(),
            ]);

        // Log password reset
        try {
            $this->activityLogService->logEvent(
                description: "Reset password for user: {$targetUser->email}",
                logName: 'authentication',
                event: 'password_reset',
                properties: [
                    'target_user_id' => $id,
                    'target_email' => $targetUser->email,
                ],
                request: $request
            );
        } catch (\Exception $e) {
            Log::warning('Failed to log password reset: '.$e->getMessage());
        }

        return response()->json(['message' => 'Password reset successfully']);
    }
}
