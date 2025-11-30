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
     * Note: This seeder works with the existing Supabase database structure.
     * Users are stored in auth.users table, not the default Laravel users table.
     */
    public function run(): void
    {
        try {
            // Check if auth schema and auth.users table exist
            $schemaExists = DB::connection('pgsql')
                ->select("SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') as exists")[0]->exists ?? false;

            if (!$schemaExists) {
                $this->command->warn('Auth schema does not exist. Creating auth schema and users table...');
                
                // Enable pgcrypto extension for UUID generation
                try {
                    DB::connection('pgsql')->statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');
                } catch (\Exception $e) {
                    // Extension might already exist or require superuser privileges
                    $this->command->warn('Could not create pgcrypto extension: ' . $e->getMessage());
                }
                
                // Create auth schema
                DB::connection('pgsql')->statement('CREATE SCHEMA IF NOT EXISTS auth');
                
                // Create auth.users table (Supabase structure)
                // Use UUID generation in PHP if gen_random_uuid() is not available
                DB::connection('pgsql')->statement("
                    CREATE TABLE IF NOT EXISTS auth.users (
                        id UUID PRIMARY KEY,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        encrypted_password VARCHAR(255) NOT NULL,
                        email_confirmed_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                ");
                
                $this->command->info('Auth schema and users table created.');
            }

            // Check if auth.users table exists
            $tableExists = DB::connection('pgsql')
                ->select("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') as exists")[0]->exists ?? false;

            if (!$tableExists) {
                $this->command->error('auth.users table does not exist and could not be created.');
                return;
            }

            // Check if default admin user already exists
            $existingUser = DB::connection('pgsql')
                ->table('auth.users')
                ->where('email', 'admin@nazim.local')
                ->first();

            if (!$existingUser) {
                // Create default admin user in auth.users table
                $userId = (string) Str::uuid();
                
                DB::connection('pgsql')
                    ->table('auth.users')
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
                    DB::connection('pgsql')
                        ->table('profiles')
                        ->insert([
                            'id' => $userId,
                            'full_name' => 'System Administrator',
                            'role' => 'super_admin',
                            'organization_id' => null, // Super admin has no organization
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    $this->command->info('Default admin user and profile created: admin@nazim.local / Admin123!@#');
                } else {
                    $this->command->info('Default admin user created: admin@nazim.local / Admin123!@#');
                    $this->command->warn('Profiles table does not exist. Profile not created.');
                }
            } else {
                $this->command->info('Default admin user already exists.');
            }
        } catch (\Exception $e) {
            $this->command->error('Error seeding database: ' . $e->getMessage());
            $this->command->error('Stack trace: ' . $e->getTraceAsString());
        }
    }
}
