<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Services\OrganizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class OrganizationController extends Controller
{
    protected OrganizationService $organizationService;

    public function __construct(OrganizationService $organizationService)
    {
        $this->organizationService = $organizationService;
    }

    /**
     * Display a listing of organizations (protected - requires authentication)
     * Returns organizations filtered by user's access
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
            if (!$this->userHasPermission($user, 'organizations.read', $profile->organization_id)) {
                Log::warning("Permission denied for organizations.read", [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                ]);
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'organizations.read'
                ], 403);
            }

            // Use DB facade directly to avoid Eloquent issues if table doesn't exist
            $query = DB::connection('pgsql')
                ->table('organizations')
                ->whereNull('deleted_at');

            // All users see only their organization
            $query->where('id', $profile->organization_id);

            $organizations = $query->orderBy('name')->get();

            return response()->json($organizations);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('OrganizationController::index database error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'trace' => $e->getTraceAsString()
            ]);

            // If table doesn't exist, return empty array instead of error
            if (str_contains($e->getMessage(), 'does not exist') || str_contains($e->getMessage(), 'relation')) {
                return response()->json([]);
            }

            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        } catch (\Exception $e) {
            Log::error('OrganizationController::index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch organizations'], 500);
        }
    }

    /**
     * Store a newly created organization with admin user and default school
     *
     * IMPORTANT: This creates a complete organization setup including:
     * - Organization entity
     * - Default school for the organization
     * - Organization admin user account
     * - Organization admin role and permissions
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
        if (!$this->userHasPermission($user, 'organizations.create', $profile->organization_id)) {
            Log::warning("Permission denied for organizations.create", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.create'
            ], 403);
        }

        // Validate organization and admin data
        $validated = $request->validate([
            // Organization data
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:100', \Illuminate\Validation\Rule::unique('organizations', 'slug')->whereNull('deleted_at')],
            'email' => ['nullable', 'email', 'max:255', \Illuminate\Validation\Rule::unique('organizations', 'email')->whereNull('deleted_at')],
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'street_address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state_province' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'registration_number' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'established_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_email' => ['nullable', 'email', 'max:255', \Illuminate\Validation\Rule::unique('organizations', 'contact_person_email')->whereNull('deleted_at')],
            'contact_person_phone' => 'nullable|string|max:50',
            'contact_person_position' => 'nullable|string|max:100',
            'logo_url' => 'nullable|url|max:500',
            'settings' => 'nullable|array',

            // Admin user data - email must be globally unique across all users
            'admin_email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')],
            'admin_password' => 'required|string|min:8',
            'admin_full_name' => 'required|string|max:255',
        ]);

        try {
            // Prepare organization data
            $organizationData = [
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'website' => $validated['website'] ?? null,
                'street_address' => $validated['street_address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state_province' => $validated['state_province'] ?? null,
                'country' => $validated['country'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'registration_number' => $validated['registration_number'] ?? null,
                'tax_id' => $validated['tax_id'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'type' => $validated['type'] ?? null,
                'description' => $validated['description'] ?? null,
                'established_date' => $validated['established_date'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'contact_person_name' => $validated['contact_person_name'] ?? null,
                'contact_person_email' => $validated['contact_person_email'] ?? null,
                'contact_person_phone' => $validated['contact_person_phone'] ?? null,
                'contact_person_position' => $validated['contact_person_position'] ?? null,
                'logo_url' => $validated['logo_url'] ?? null,
                'settings' => $validated['settings'] ?? [],
            ];

            // Prepare admin data
            $adminData = [
                'email' => $validated['admin_email'],
                'password' => $validated['admin_password'],
                'full_name' => $validated['admin_full_name'],
            ];

            // Create organization with admin and school
            $result = $this->organizationService->createOrganizationWithAdmin(
                $organizationData,
                $adminData
            );

            return response()->json([
                'organization' => $result['organization'],
                'school' => [
                    'id' => $result['school']->id,
                    'school_name' => $result['school']->school_name,
                ],
                'admin' => [
                    'id' => $result['admin_user']->id,
                    'email' => $result['admin_user']->email,
                ],
                'message' => 'Organization created successfully with admin user and default school',
            ], 201);

        } catch (\Exception $e) {
            Log::error('Failed to create organization: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['admin_password'])
            ]);

            return response()->json([
                'error' => 'Failed to create organization',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified organization
     */
    public function show(string $id)
    {
        try {
            $user = request()->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
            if (!$this->userHasPermission($user, 'organizations.read', $profile->organization_id)) {
                Log::warning("Permission denied for organizations.read", [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                ]);
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                    'required_permission' => 'organizations.read'
                ], 403);
            }

            $organization = Organization::whereNull('deleted_at')->find($id);

            if (!$organization) {
                return response()->json(['error' => 'Organization not found'], 404);
            }

            // All users can only view their own organization
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Organization not found'], 404);
            }

            return response()->json($organization);
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('OrganizationController::show database error: ' . $e->getMessage(), [
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json(['error' => 'Failed to fetch organization'], 500);
        } catch (\Exception $e) {
            Log::error('OrganizationController::show error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'id' => $id
            ]);

            return response()->json([
                'error' => 'Failed to fetch organization',
                'message' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Update the specified organization
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $organization = Organization::whereNull('deleted_at')->findOrFail($id);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
        if (!$this->userHasPermission($user, 'organizations.update', $profile->organization_id)) {
            Log::warning("Permission denied for organizations.update", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.update'
            ], 403);
        }

        // Platform admins can update any organization, regular users can only update their own
        $isPlatformAdmin = false;
        try {
            // Check if user is platform admin (has subscription.admin permission)
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');
        } catch (\Exception $e) {
            // If permission check fails, user is not platform admin
            Log::debug("Platform admin check failed: " . $e->getMessage());
        }

        if (!$isPlatformAdmin && $profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Cannot update organization from different organization'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:organizations,slug,' . $id,
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'street_address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state_province' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'registration_number' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'established_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_email' => 'nullable|email|max:255',
            'contact_person_phone' => 'nullable|string|max:50',
            'contact_person_position' => 'nullable|string|max:100',
            'logo_url' => 'nullable|url|max:500',
            'settings' => 'nullable|array',
        ]);

        $organization->update($request->only([
            'name',
            'slug',
            'email',
            'phone',
            'website',
            'street_address',
            'city',
            'state_province',
            'country',
            'postal_code',
            'registration_number',
            'tax_id',
            'license_number',
            'type',
            'description',
            'established_date',
            'is_active',
            'contact_person_name',
            'contact_person_email',
            'contact_person_phone',
            'contact_person_position',
            'logo_url',
            'settings',
        ]));

        return response()->json($organization);
    }

    /**
     * Remove the specified organization (soft delete)
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $organization = Organization::findOrFail($id);

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
        if (!$this->userHasPermission($user, 'organizations.delete', $profile->organization_id)) {
            Log::warning("Permission denied for organizations.delete", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.delete'
            ], 403);
        }

        // All users can only delete their own organization
        if ($profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Cannot delete organization from different organization'], 403);
        }

        $organization->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Organization deleted successfully']);
    }

    /**
     * Get organization statistics
     */
    public function statistics(Request $request, string $id)
    {
        try {
            $user = $request->user();
            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json(['error' => 'Profile not found'], 404);
            }

            $organization = Organization::whereNull('deleted_at')->findOrFail($id);

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json(['error' => 'User must be assigned to an organization'], 403);
            }

            // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
            if (!$this->userHasPermission($user, 'organizations.read', $profile->organization_id)) {
                Log::warning("Permission denied for organizations.read in statistics", [
                    'user_id' => $user->id,
                    'organization_id' => $profile->organization_id,
                ]);
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'You do not have permission to access this resource.',
                ], 403);
            }

            // All users can only view their own organization's statistics
            if ($profile->organization_id !== $organization->id) {
                return response()->json(['error' => 'Cannot view statistics for different organization'], 403);
            }

            // Get statistics
            $userCount = DB::connection('pgsql')
                ->table('profiles')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Schools count (direct organization_id)
            $schoolCount = DB::connection('pgsql')
                ->table('school_branding')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Students count (direct organization_id)
            $studentCount = DB::connection('pgsql')
                ->table('students')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Classes count (direct organization_id)
            $classCount = DB::connection('pgsql')
                ->table('classes')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Staff count (direct organization_id)
            $staffCount = DB::connection('pgsql')
                ->table('staff')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->count();

            // Buildings are linked to organizations through schools
            // Get school IDs for this organization first
            $schoolIds = DB::connection('pgsql')
                ->table('school_branding')
                ->where('organization_id', $id)
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();

            $buildingCount = 0;
            if (!empty($schoolIds)) {
                $buildingCount = DB::connection('pgsql')
                    ->table('buildings')
                    ->whereIn('school_id', $schoolIds)
                    ->whereNull('deleted_at')
                    ->count();
            }

            // Rooms are linked to organizations through schools
            $roomCount = 0;
            if (!empty($schoolIds)) {
                $roomCount = DB::connection('pgsql')
                    ->table('rooms')
                    ->whereIn('school_id', $schoolIds)
                    ->whereNull('deleted_at')
                    ->count();
            }

            return response()->json([
                'userCount' => $userCount,
                'schoolCount' => $schoolCount,
                'studentCount' => $studentCount,
                'classCount' => $classCount,
                'staffCount' => $staffCount,
                'buildingCount' => $buildingCount,
                'roomCount' => $roomCount,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Organization not found'], 404);
        } catch (\Exception $e) {
            Log::error('OrganizationController::statistics error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'organization_id' => $id,
            ]);
            return response()->json(['error' => 'Failed to fetch organization statistics'], 500);
        }
    }

    /**
     * Get accessible organizations for the user
     */
    public function accessible(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            $profile = DB::connection('pgsql')
                ->table('profiles')
                ->where('id', $user->id)
                ->first();

            if (!$profile) {
                return response()->json([]);
            }

            // Require organization_id for all users
            if (!$profile->organization_id) {
                return response()->json([]);
            }

            // Get user's organization
            $orgIds = [$profile->organization_id];

            if (empty($orgIds)) {
                $organizations = collect([]);
            } else {
                $organizations = DB::connection('pgsql')
                    ->table('organizations')
                    ->whereIn('id', $orgIds)
                    ->whereNull('deleted_at')
                    ->orderBy('name')
                    ->get();
            }

            return response()->json($organizations);
        } catch (\Exception $e) {
            Log::error('OrganizationController::accessible error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json(['error' => 'Failed to fetch accessible organizations'], 500);
        }
    }

    /**
     * Get preview of what will be created when organization is created
     * Shows: organization, default school, admin user, roles, and permissions
     */
    public function preview(Request $request)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission using manual query (Spatie's hasPermissionTo() doesn't work correctly with teams)
        if (!$this->userHasPermission($user, 'organizations.create', $profile->organization_id)) {
            Log::warning("Permission denied for organizations.create", [
                'user_id' => $user->id,
                'organization_id' => $profile->organization_id,
            ]);
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.create'
            ], 403);
        }

        // Get permission definitions from PermissionSeeder
        $permissions = \Database\Seeders\PermissionSeeder::getPermissions();
        $rolePermissions = \Database\Seeders\PermissionSeeder::getRolePermissions();

        // Build preview structure
        $preview = [
            'organization' => [
                'name' => $request->input('name', 'New Organization'),
                'slug' => $request->input('slug', 'new-organization'),
                'description' => 'Organization will be created with the provided details',
            ],
            'school' => [
                'name' => ($request->input('name', 'New Organization')) . ' - Main School',
                'description' => 'Default school will be created automatically',
            ],
            'admin_user' => [
                'email' => $request->input('admin_email', 'admin@example.com'),
                'full_name' => $request->input('admin_full_name', 'Organization Administrator'),
                'role' => 'organization_admin',
                'description' => 'Admin user will be created with full access to organization',
            ],
            'roles' => [
                [
                    'name' => 'admin',
                    'description' => 'Administrator with full access to all features',
                    'permissions_count' => $rolePermissions['admin'] === '*' ? count($permissions, COUNT_RECURSIVE) - count($permissions) : count($rolePermissions['admin']),
                ],
                [
                    'name' => 'staff',
                    'description' => 'Staff member with limited access for operational tasks',
                    'permissions_count' => count($rolePermissions['staff'] ?? []),
                ],
                [
                    'name' => 'teacher',
                    'description' => 'Teacher with access to academic content and student information',
                    'permissions_count' => count($rolePermissions['teacher'] ?? []),
                ],
            ],
            'permissions' => [
                'total_count' => array_sum(array_map('count', $permissions)),
                'resources' => array_keys($permissions),
                'description' => 'All permissions will be created specifically for this organization',
            ],
        ];

        return response()->json($preview);
    }

    /**
     * Get organization permissions for management
     */
    public function permissions(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        // CRITICAL: setPermissionsTeamId() is called in EnsureOrganizationAccess middleware
        // So we don't need to pass organization_id as second parameter
        try {
            if (!$this->userHasPermission($user, 'organizations.read', $profile->organization_id)) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.read'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for organizations.read: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This action is unauthorized.',
            ], 403);
        }

        $organization = Organization::whereNull('deleted_at')->find($id);

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        // All users can only view their own organization
        if ($profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        // Get organization permissions
        $permissions = DB::connection('pgsql')
            ->table('permissions')
            ->where('organization_id', $organization->id)
            ->orderBy('resource')
            ->orderBy('action')
            ->get();

        // Get roles and their permissions
        $roles = DB::connection('pgsql')
            ->table('roles')
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->get();

        $rolesWithPermissions = [];
        foreach ($roles as $role) {
            $rolePerms = DB::connection('pgsql')
                ->table('role_has_permissions')
                ->join('permissions', 'role_has_permissions.permission_id', '=', 'permissions.id')
                ->where('role_has_permissions.role_id', $role->id)
                ->where('role_has_permissions.organization_id', $organization->id)
                ->pluck('permissions.name')
                ->toArray();

            $rolesWithPermissions[] = [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'permissions' => $rolePerms,
                'permissions_count' => count($rolePerms),
            ];
        }

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'permissions' => $permissions,
            'roles' => $rolesWithPermissions,
            'total_permissions' => $permissions->count(),
        ]);
    }

    /**
     * Update organization permissions (assign permissions to roles)
     */
    public function updatePermissions(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::connection('pgsql')
            ->table('profiles')
            ->where('id', $user->id)
            ->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        // Require organization_id for all users
        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        // Check permission WITH organization context
        // CRITICAL: setPermissionsTeamId() is called in EnsureOrganizationAccess middleware
        // So we don't need to pass organization_id as second parameter
        try {
            if (!$this->userHasPermission($user, 'organizations.update', $profile->organization_id)) {
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'You do not have permission to access this resource.',
                'required_permission' => 'organizations.update'
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for organizations.update: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This action is unauthorized.',
            ], 403);
        }

        $organization = Organization::whereNull('deleted_at')->find($id);

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        // Platform admins can update permissions for any organization, regular users can only update their own
        $isPlatformAdmin = false;
        try {
            // Check if user is platform admin (has subscription.admin permission)
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            $isPlatformAdmin = $user->hasPermissionTo('subscription.admin');
        } catch (\Exception $e) {
            // If permission check fails, user is not platform admin
            Log::debug("Platform admin check failed: " . $e->getMessage());
        }

        if (!$isPlatformAdmin && $profile->organization_id !== $organization->id) {
            return response()->json(['error' => 'Cannot update organization from different organization'], 403);
        }

        $request->validate([
            'role' => 'required|string',
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'required|uuid|exists:permissions,id',
        ]);

        $role = DB::connection('pgsql')
            ->table('roles')
            ->where('name', $request->role)
            ->where('organization_id', $organization->id)
            ->where('guard_name', 'web')
            ->first();

        if (!$role) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        // Validate all permissions belong to this organization
        $permissions = DB::connection('pgsql')
            ->table('permissions')
            ->whereIn('id', $request->permission_ids)
            ->where('organization_id', $organization->id)
            ->pluck('id')
            ->toArray();

        if (count($permissions) !== count($request->permission_ids)) {
            return response()->json(['error' => 'Some permissions do not belong to this organization'], 403);
        }

        // Remove existing permissions for this role
        DB::connection('pgsql')
            ->table('role_has_permissions')
            ->where('role_id', $role->id)
            ->where('organization_id', $organization->id)
            ->delete();

        // Assign new permissions
        $insertData = [];
        foreach ($permissions as $permissionId) {
            $insertData[] = [
                'role_id' => $role->id,
                'permission_id' => $permissionId,
                'organization_id' => $organization->id,
            ];
        }

        if (!empty($insertData)) {
            DB::connection('pgsql')
                ->table('role_has_permissions')
                ->insert($insertData);
        }

        // Clear permission cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permissions updated successfully',
            'role' => $role->name,
            'permissions_count' => count($permissions),
        ]);
    }

    /**
     * Get all organization admins (platform management)
     * Only accessible to platform admins (subscription.admin permission - GLOBAL)
     * CRITICAL: Platform admins are NOT tied to organizations
     */
    public function admins(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL, not organization-scoped)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        // Get all organizations with their admin users
        $organizations = DB::connection('pgsql')
            ->table('organizations')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        $result = [];

        foreach ($organizations as $org) {
            // Get admin users for this organization
            // Look for users with 'admin' or 'organization_admin' role
            $adminUsers = DB::connection('pgsql')
                ->table('profiles')
                ->join('model_has_roles', 'profiles.id', '=', 'model_has_roles.model_id')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->where('profiles.organization_id', $org->id)
                ->where('model_has_roles.organization_id', $org->id)
                ->whereIn('roles.name', ['admin', 'organization_admin'])
                ->where('profiles.is_active', true)
                ->whereNull('profiles.deleted_at')
                ->select(
                    'profiles.id',
                    'profiles.email',
                    'profiles.full_name',
                    'profiles.phone',
                    'profiles.created_at',
                    'roles.name as role_name'
                )
                ->get();

            $result[] = [
                'organization' => [
                    'id' => $org->id,
                    'name' => $org->name,
                    'slug' => $org->slug,
                    'email' => $org->email,
                    'phone' => $org->phone,
                    'is_active' => $org->is_active,
                    'created_at' => $org->created_at,
                ],
                'admins' => $adminUsers->map(function ($admin) {
                    return [
                        'id' => $admin->id,
                        'email' => $admin->email,
                        'full_name' => $admin->full_name,
                        'phone' => $admin->phone,
                        'role' => $admin->role_name,
                        'created_at' => $admin->created_at,
                    ];
                }),
                'admin_count' => $adminUsers->count(),
            ];
        }

        return response()->json($result);
    }

    /**
     * Store a newly created organization (Platform Admin)
     * Platform admins can create organizations without having organization_id
     */
    public function storePlatformAdmin(Request $request)
    {
        // CRITICAL: Log entry to method
        error_log('storePlatformAdmin called');
        error_log('Request data: ' . json_encode($request->except(['admin_password'])));
        
        try {
            $user = $request->user();

            if (!$user) {
                error_log('No user found in storePlatformAdmin');
                return response()->json(['error' => 'Unauthenticated'], 401);
            }

            error_log('User authenticated: ' . $user->id);

            // CRITICAL: Permission check is already done by platform.admin middleware
            // The middleware sets the team context, so we don't need to check again here
            // However, we should clear team context to ensure clean state for organization creation
            setPermissionsTeamId(null);

            error_log('Starting validation');

            // Validate organization and admin data (same validation as regular store)
            try {
                $validated = $request->validate([
                    // Organization data
                    'name' => 'required|string|max:255',
                    'slug' => ['required', 'string', 'max:100', \Illuminate\Validation\Rule::unique('organizations', 'slug')->whereNull('deleted_at')],
                    'email' => ['nullable', 'email', 'max:255', \Illuminate\Validation\Rule::unique('organizations', 'email')->whereNull('deleted_at')],
                    'phone' => 'nullable|string|max:50',
                    'website' => 'nullable|url|max:255',
                    'street_address' => 'nullable|string|max:500',
                    'city' => 'nullable|string|max:100',
                    'state_province' => 'nullable|string|max:100',
                    'country' => 'nullable|string|max:100',
                    'postal_code' => 'nullable|string|max:20',
                    'registration_number' => 'nullable|string|max:100',
                    'tax_id' => 'nullable|string|max:100',
                    'license_number' => 'nullable|string|max:100',
                    'type' => 'nullable|string|max:100',
                    'description' => 'nullable|string|max:2000',
                    'established_date' => 'nullable|date',
                    'is_active' => 'nullable|boolean',
                    'contact_person_name' => 'nullable|string|max:255',
                    'contact_person_email' => ['nullable', 'email', 'max:255', \Illuminate\Validation\Rule::unique('organizations', 'contact_person_email')->whereNull('deleted_at')],
                    'contact_person_phone' => 'nullable|string|max:50',
                    'contact_person_position' => 'nullable|string|max:100',
                    'logo_url' => 'nullable|url|max:500',
                    'settings' => 'nullable|array',

                    // Admin user data - email must be globally unique across all users
                    'admin_email' => ['required', 'email', 'max:255', \Illuminate\Validation\Rule::unique('users', 'email')],
                    'admin_password' => 'required|string|min:8',
                    'admin_full_name' => 'required|string|max:255',
                ]);
                
                error_log('Validation passed');
            } catch (\Illuminate\Validation\ValidationException $e) {
                error_log('Validation failed: ' . json_encode($e->errors()));
                Log::error('Validation failed when creating organization (platform admin)', [
                    'errors' => $e->errors(),
                ]);

                return response()->json([
                    'error' => 'Validation failed',
                    'message' => 'The provided data is invalid.',
                    'errors' => $e->errors(),
                ], 422);
            } catch (\Exception $e) {
                error_log('Exception during validation: ' . $e->getMessage());
                error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
                Log::error('Exception during validation in storePlatformAdmin', [
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString(),
                ]);
                
                return response()->json([
                    'error' => 'Validation error',
                    'message' => $e->getMessage(),
                ], 500);
            }

            error_log('Starting organization creation');

            // Prepare organization data
            $organizationData = [
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'website' => $validated['website'] ?? null,
                'street_address' => $validated['street_address'] ?? null,
                'city' => $validated['city'] ?? null,
                'state_province' => $validated['state_province'] ?? null,
                'country' => $validated['country'] ?? null,
                'postal_code' => $validated['postal_code'] ?? null,
                'registration_number' => $validated['registration_number'] ?? null,
                'tax_id' => $validated['tax_id'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'type' => $validated['type'] ?? null,
                'description' => $validated['description'] ?? null,
                'established_date' => $validated['established_date'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'contact_person_name' => $validated['contact_person_name'] ?? null,
                'contact_person_email' => $validated['contact_person_email'] ?? null,
                'contact_person_phone' => $validated['contact_person_phone'] ?? null,
                'contact_person_position' => $validated['contact_person_position'] ?? null,
                'logo_url' => $validated['logo_url'] ?? null,
                'settings' => $validated['settings'] ?? [],
            ];

            // Prepare admin data
            $adminData = [
                'email' => $validated['admin_email'],
                'password' => $validated['admin_password'],
                'full_name' => $validated['admin_full_name'],
            ];

            // Create organization with admin and school
            $result = $this->organizationService->createOrganizationWithAdmin(
                $organizationData,
                $adminData
            );

            return response()->json([
                'data' => $result['organization'],
                'message' => 'Organization created successfully',
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            Log::error('Validation failed when creating organization (platform admin)', [
                'errors' => $e->errors(),
            ]);

            return response()->json([
                'error' => 'Validation failed',
                'message' => 'The provided data is invalid.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            // CRITICAL: Use error_log to ensure error is written even if Log::error fails
            error_log('Organization creation error: ' . $e->getMessage());
            error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
            error_log('Trace: ' . $e->getTraceAsString());
            
            // Also use Laravel's Log facade
            try {
                Log::error('Failed to create organization (platform admin): ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'request_data' => $request->except(['admin_password']),
                    'exception_class' => get_class($e),
                ]);
            } catch (\Exception $logException) {
                error_log('Failed to write to Laravel log: ' . $logException->getMessage());
            }

            return response()->json([
                'error' => 'Failed to create organization',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    /**
     * Show organization (Platform Admin)
     */
    public function showPlatformAdmin(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            // Global permissions are stored with platform org UUID (00000000-0000-0000-0000-000000000000)
            // in model_has_permissions, but the permission itself has organization_id = NULL
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in showPlatformAdmin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $organization = Organization::whereNull('deleted_at')->findOrFail($id);

        return response()->json([
            'data' => $organization,
        ]);
    }

    /**
     * Update organization (Platform Admin)
     */
    public function updatePlatformAdmin(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in updatePlatformAdmin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $organization = Organization::whereNull('deleted_at')->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|max:100|unique:organizations,slug,' . $id,
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'website' => 'nullable|url|max:255',
            'street_address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state_province' => 'nullable|string|max:100',
            'country' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'registration_number' => 'nullable|string|max:100',
            'tax_id' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'established_date' => 'nullable|date',
            'is_active' => 'nullable|boolean',
            'contact_person_name' => 'nullable|string|max:255',
            'contact_person_email' => 'nullable|email|max:255',
            'contact_person_phone' => 'nullable|string|max:50',
            'contact_person_position' => 'nullable|string|max:100',
            'logo_url' => 'nullable|url|max:500',
            'settings' => 'nullable|array',
        ]);

        $organization->update($request->only([
            'name',
            'slug',
            'email',
            'phone',
            'website',
            'street_address',
            'city',
            'state_province',
            'country',
            'postal_code',
            'registration_number',
            'tax_id',
            'license_number',
            'type',
            'description',
            'established_date',
            'is_active',
            'contact_person_name',
            'contact_person_email',
            'contact_person_phone',
            'contact_person_position',
            'logo_url',
            'settings',
        ]));

        return response()->json([
            'data' => $organization->fresh(),
            'message' => 'Organization updated successfully',
        ]);
    }

    /**
     * Delete organization (Platform Admin)
     */
    public function destroyPlatformAdmin(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            // CRITICAL: Use platform org UUID as team context for global permissions
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in destroyPlatformAdmin: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $organization = Organization::whereNull('deleted_at')->findOrFail($id);

        // Soft delete
        $organization->delete();

        return response()->noContent();
    }

    /**
     * Get website data (domains and settings) for an organization (Platform Admin)
     * Note: Permission check is handled by platform.admin middleware
     */
    public function websiteData(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Middleware already checks subscription.admin permission, but add defensive check
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            // Try to check permission, but don't fail if method doesn't exist
            if (method_exists($user, 'hasPermissionTo')) {
                if (!$user->hasPermissionTo('subscription.admin')) {
                    return response()->json([
                        'error' => 'Access Denied',
                        'message' => 'This endpoint is only accessible to platform administrators.',
                    ], 403);
                }
            }
        } catch (\Exception $e) {
            // If permission check fails, log but continue (middleware should have caught it)
            Log::debug("Permission check in websiteData (non-blocking): " . $e->getMessage());
        }

        try {
            $organization = Organization::whereNull('deleted_at')->findOrFail($id);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        // Get all domains for this organization (across all schools)
        $domains = [];
        try {
            $domains = DB::connection('pgsql')
                ->table('website_domains')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->orderBy('is_primary', 'desc')
                ->orderBy('created_at', 'desc')
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            // Table might not exist yet, return empty array
            Log::debug("website_domains table query failed: " . $e->getMessage());
        }

        // Get all website settings for this organization (across all schools)
        $settings = [];
        try {
            $settings = DB::connection('pgsql')
                ->table('website_settings')
                ->where('organization_id', $organization->id)
                ->whereNull('deleted_at')
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            // Table might not exist yet, return empty array
            Log::debug("website_settings table query failed: " . $e->getMessage());
        }

        // Get schools for this organization
        $schools = [];
        try {
            $schools = DB::connection('pgsql')
                ->table('school_branding as s')
                ->leftJoin('website_settings as ws', function ($join) {
                    $join->on('ws.school_id', '=', 's.id')
                        ->whereNull('ws.deleted_at');
                })
                ->where('s.organization_id', $organization->id)
                ->whereNull('s.deleted_at')
                ->select(
                    's.id',
                    's.school_name',
                    DB::raw('ws.school_slug as school_slug')
                )
                ->get()
                ->toArray();
        } catch (\Exception $e) {
            // Table might not exist yet, return empty array
            Log::debug("school_branding table query failed: " . $e->getMessage());
        }

        return response()->json([
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'website' => $organization->website,
            ],
            'domains' => $domains,
            'settings' => $settings,
            'schools' => $schools,
        ]);
    }
}

