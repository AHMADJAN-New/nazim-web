#!/bin/bash
# Create a demo admin user for testing

set -e

echo "Creating demo admin user..."

docker compose --env-file docker/env/compose.demo.env -f docker-compose.demo.yml exec -T php php artisan tinker <<'PHP'
// Get the first non-platform organization
$org = DB::table('organizations')
    ->where('id', '!=', '00000000-0000-0000-0000-000000000000')
    ->whereNull('deleted_at')
    ->first();

if (!$org) {
    echo "No organization found. Creating one...\n";
    $orgId = (string) \Illuminate\Support\Str::uuid();
    DB::table('organizations')->insert([
        'id' => $orgId,
        'name' => 'Demo Organization',
        'slug' => 'demo-org',
        'settings' => json_encode([]),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $org = (object) ['id' => $orgId, 'name' => 'Demo Organization'];
}

// Get or create default school
$schoolId = DB::table('school_branding')
    ->where('organization_id', $org->id)
    ->whereNull('deleted_at')
    ->value('id');

if (!$schoolId) {
    echo "No school found. Creating one...\n";
    $schoolId = (string) \Illuminate\Support\Str::uuid();
    DB::table('school_branding')->insert([
        'id' => $schoolId,
        'organization_id' => $org->id,
        'name' => 'Demo School',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

// Check if user already exists
$existingUser = DB::table('users')->where('email', 'admin@demo.com')->first();

if ($existingUser) {
    echo "User admin@demo.com already exists. Updating...\n";
    $userId = $existingUser->id;
    
    // Update password
    DB::table('users')->where('id', $userId)->update([
        'encrypted_password' => Hash::make('demo123'),
        'updated_at' => now(),
    ]);
    
    // Update profile
    DB::table('profiles')->where('id', $userId)->update([
        'organization_id' => $org->id,
        'default_school_id' => $schoolId,
        'is_active' => true,
        'updated_at' => now(),
    ]);
    
    echo "Updated existing user.\n";
} else {
    echo "Creating new user...\n";
    $userId = (string) \Illuminate\Support\Str::uuid();
    
    // Create user
    DB::table('users')->insert([
        'id' => $userId,
        'email' => 'admin@demo.com',
        'encrypted_password' => Hash::make('demo123'),
        'email_confirmed_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    // Create profile
    DB::table('profiles')->insert([
        'id' => $userId,
        'organization_id' => $org->id,
        'default_school_id' => $schoolId,
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    
    echo "Created new user.\n";
}

echo "\n";
echo "✅ Demo admin user created successfully!\n";
echo "\n";
echo "Credentials:\n";
echo "  Email: admin@demo.com\n";
echo "  Password: demo123\n";
echo "  Organization: {$org->name}\n";
echo "\n";
PHP

echo "Done!"

