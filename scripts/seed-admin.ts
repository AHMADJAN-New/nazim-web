/**
 * Seed Super Admin User Script
 * 
 * This script creates a super admin user for local development.
 * Run with: npx tsx scripts/seed-admin.ts
 * 
 * Credentials:
 * - Email: admin@nazim.local
 * - Password: Admin123!@#
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // Default local dev key

const ADMIN_EMAIL = 'admin@nazim.local';
const ADMIN_PASSWORD = 'Admin123!@#';
const ADMIN_NAME = 'Super Admin';

async function seedSuperAdmin() {
  console.log('🌱 Seeding super admin user...');
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  
  // Create admin client with service role key
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

    if (existingUser) {
      console.log(`✅ User ${ADMIN_EMAIL} already exists`);
      
      // Update the user's profile to ensure it's super_admin
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: existingUser.id,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          role: 'super_admin',
          organization_id: null
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
        throw profileError;
      }

      console.log('✅ Profile updated to super_admin');
      console.log('\n📋 Login Credentials:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      return;
    }

    // Create new user
    console.log(`📝 Creating new user: ${ADMIN_EMAIL}`);
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true, // Auto-confirm email for dev
      user_metadata: {
        full_name: ADMIN_NAME,
        role: 'super_admin',
        organization_id: null
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      throw createError;
    }

    if (!newUser.user) {
      throw new Error('User creation returned no user data');
    }

    console.log(`✅ User created with ID: ${newUser.user.id}`);

    // Ensure profile is created/updated
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: ADMIN_EMAIL,
        full_name: ADMIN_NAME,
        role: 'super_admin',
        organization_id: null
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      throw profileError;
    }

    console.log('✅ Profile created/updated');
    console.log('\n🎉 Super admin user seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: super_admin`);
    console.log(`   Organization: None (super admin)`);

  } catch (error: any) {
    console.error('❌ Failed to seed super admin:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSuperAdmin();


