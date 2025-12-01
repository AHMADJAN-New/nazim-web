<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     * Users are stored in public.users table (Laravel standard).
     */
    public function run(): void
    {
        // Seed default organization first
        $this->call(OrganizationSeeder::class);
        
        try {
            // Check if users table exists (in public schema)
            $tableExists = DB::connection('pgsql')
                ->select("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') as exists")[0]->exists ?? false;

            if (!$tableExists) {
                $this->command->error('users table does not exist. Please run migrations first: php artisan migrate');
                return;
            }

            // Check if default admin user already exists
            $existingUser = DB::table('users')
                ->where('email', 'admin@nazim.local')
                ->first();

            if (!$existingUser) {
                // Create default admin user in public.users table
                $userId = (string) Str::uuid();
                
                DB::table('users')
                    ->insert([
                        'id' => $userId,
                        'email' => 'admin@nazim.local',
                        'encrypted_password' => Hash::make('Admin123!@#'),
                        'email_confirmed_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                // Check if profiles table exists before inserting
                $profilesTableExists = DB::connection('pgsql')
                    ->select("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as exists")[0]->exists ?? false;

                if ($profilesTableExists) {
                    // Create profile for admin user
                    DB::table('profiles')
                        ->insert([
                            'id' => $userId,
                            'email' => 'admin@nazim.local',
                            'full_name' => 'System Administrator',
                            'role' => 'super_admin',
                            'organization_id' => null, // Super admin has no organization
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    
                    // Verify user was created
                    $createdUser = DB::table('users')
                        ->where('id', $userId)
                        ->first();
                    
                    if ($createdUser) {
                        $this->command->info('Default admin user and profile created: admin@nazim.local / Admin123!@#');
                        $this->command->info('User ID: ' . $userId);
                    } else {
                        $this->command->warn('User was inserted but could not be verified.');
                    }
                } else {
                    $this->command->info('Default admin user created: admin@nazim.local / Admin123!@#');
                    $this->command->warn('Profiles table does not exist. Profile not created.');
                    $this->command->info('Run: php artisan migrate to create the profiles table.');
                }
            } else {
                $this->command->info('Default admin user already exists.');
                
                // Check if profile exists for this user
                $existingProfile = DB::table('profiles')
                    ->where('id', $existingUser->id)
                    ->first();
                
                if (!$existingProfile) {
                    // Create profile for existing user
                    $profilesTableExists = DB::connection('pgsql')
                        ->select("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as exists")[0]->exists ?? false;
                    
                    if ($profilesTableExists) {
                        DB::table('profiles')
                            ->insert([
                                'id' => $existingUser->id,
                                'email' => $existingUser->email,
                                'full_name' => 'System Administrator',
                                'role' => 'super_admin',
                                'organization_id' => null,
                                'is_active' => true,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        $this->command->info('Profile created for existing admin user.');
                    } else {
                        $this->command->warn('Profiles table does not exist. Run: php artisan migrate');
                    }
                } else {
                    $this->command->info('Profile already exists for admin user.');
                }
            }
        } catch (\Exception $e) {
            $this->command->error('Error seeding database: ' . $e->getMessage());
            $this->command->error('Stack trace: ' . $e->getTraceAsString());
        }
    }
}
