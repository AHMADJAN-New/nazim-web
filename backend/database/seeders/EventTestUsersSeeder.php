<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Permission;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class EventTestUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Creates 3 test users:
     * 1. checkin@test.com - Only check-in permission (event_checkins.create)
     * 2. guest@test.com - Only add guest permission (event_guests.create)
     * 3. both@test.com - Both permissions (event_checkins.create + event_guests.create)
     */
    public function run(): void
    {
        $this->command->info('Creating event test users...');

        // Get or create an organization (use first organization or create default)
        $organization = DB::table('organizations')
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            $orgId = (string) Str::uuid();
            DB::table('organizations')->insert([
                'id' => $orgId,
                'name' => 'Test Organization',
                'slug' => 'test-org',
                'settings' => json_encode([]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $organization = (object) ['id' => $orgId];
            $this->command->info("Created test organization: {$orgId}");
        }

        // Pick a default school for this organization (required for strict school context)
        $defaultSchoolId = DB::table('school_branding')
            ->where('organization_id', $organization->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'asc')
            ->value('id');

        // Get permission IDs (they should be global, organization_id = NULL)
        $checkinPermission = Permission::where('name', 'event_checkins.create')
            ->whereNull('organization_id')
            ->first();
        
        $checkinReadPermission = Permission::where('name', 'event_checkins.read')
            ->whereNull('organization_id')
            ->first();
        
        $guestPermission = Permission::where('name', 'event_guests.create')
            ->whereNull('organization_id')
            ->first();
        
        $guestReadPermission = Permission::where('name', 'event_guests.read')
            ->whereNull('organization_id')
            ->first();
        
        $eventReadPermission = Permission::where('name', 'events.read')
            ->whereNull('organization_id')
            ->first();

        if (!$checkinPermission || !$checkinReadPermission) {
            $this->command->error('Permission event_checkins.create or event_checkins.read not found. Please run PermissionSeeder first.');
            return;
        }

        if (!$guestPermission || !$guestReadPermission) {
            $this->command->error('Permission event_guests.create or event_guests.read not found. Please run PermissionSeeder first.');
            return;
        }

        if (!$eventReadPermission) {
            $this->command->error('Permission events.read not found. Please run PermissionSeeder first.');
            return;
        }

        // User 1: Only check-in permission (with read permissions to view events and check-ins)
        $this->createTestUser(
            'checkin@test.com',
            'Check-in User',
            'password123',
            $organization->id,
            $defaultSchoolId,
            [
                $eventReadPermission->id,
                $checkinReadPermission->id,
                $checkinPermission->id,
            ]
        );

        // User 2: Only add guest permission (with read permissions to view events and guests)
        $this->createTestUser(
            'guest@test.com',
            'Guest User',
            'password123',
            $organization->id,
            $defaultSchoolId,
            [
                $eventReadPermission->id,
                $guestReadPermission->id,
                $guestPermission->id,
            ]
        );

        // User 3: Both permissions (with read permissions)
        $this->createTestUser(
            'both@test.com',
            'Both Permissions User',
            'password123',
            $organization->id,
            $defaultSchoolId,
            [
                $eventReadPermission->id,
                $checkinReadPermission->id,
                $checkinPermission->id,
                $guestReadPermission->id,
                $guestPermission->id,
            ]
        );

        $this->command->info('✓ Event test users created successfully!');
        $this->command->info('');
        $this->command->info('Test Users:');
        $this->command->info('  1. checkin@test.com / password123 (Only check-in)');
        $this->command->info('  2. guest@test.com / password123 (Only add guest)');
        $this->command->info('  3. both@test.com / password123 (Both permissions)');
    }

    /**
     * Create a test user with profile and permissions
     */
    protected function createTestUser(
        string $email,
        string $name,
        string $password,
        string $organizationId,
        ?string $defaultSchoolId,
        array $permissionIds
    ): void {
        // Check if user already exists
        $existingUser = DB::table('users')
            ->where('email', $email)
            ->first();

        $userId = $existingUser ? $existingUser->id : (string) Str::uuid();
        $isNewUser = !$existingUser;

        if ($isNewUser) {
            // Create user in auth.users
            DB::table('users')->insert([
                'id' => $userId,
                'email' => $email,
                'encrypted_password' => Hash::make($password),
                'email_confirmed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Create profile
            DB::table('profiles')->insert([
                'id' => $userId,
                'email' => $email,
                'full_name' => $name,
                'organization_id' => $organizationId,
                'default_school_id' => $defaultSchoolId,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->command->info("  ✓ Created user: {$email}");
        } else {
            // Update existing user's profile to ensure organization_id is set
            DB::table('profiles')
                ->where('id', $userId)
                ->update([
                    'organization_id' => $organizationId,
                    'default_school_id' => $defaultSchoolId,
                    'updated_at' => now(),
                ]);
            $this->command->info("  ✓ Updated existing user: {$email}");
        }

        // Assign permissions directly to user
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        
        $modelHasPermissionsTable = $tableNames['model_has_permissions'] ?? 'model_has_permissions';
        $modelMorphKey = $columnNames['model_morph_key'] ?? 'model_id';

        foreach ($permissionIds as $permissionId) {
            // Check if permission already assigned
            $exists = DB::table($modelHasPermissionsTable)
                ->where('permission_id', $permissionId)
                ->where($modelMorphKey, $userId)
                ->where('model_type', User::class)
                ->where('organization_id', $organizationId)
                ->exists();

            if (!$exists) {
                DB::table($modelHasPermissionsTable)->insert([
                    'permission_id' => $permissionId,
                    $modelMorphKey => $userId,
                    'model_type' => User::class,
                    'organization_id' => $organizationId,
                ]);
            }
        }

        $permissionNames = Permission::whereIn('id', $permissionIds)
            ->pluck('name')
            ->toArray();
        
        $this->command->info("    Permissions: " . implode(', ', $permissionNames));
    }
}

