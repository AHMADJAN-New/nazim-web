/**
 * Seed Super Admin User Script
 *
 * Creates a super admin user and assigns them to all existing organizations.
 * Run with: npx tsx scripts/seed-admin.ts
 *
 * Credentials:
 * - Email: admin@nazim.local
 * - Password: Admin123!@#
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
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
const ADMIN_ROLE = 'super_admin';

async function seedSuperAdmin() {
  console.log('Seeding super admin user...');
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Fetch or create a baseline organization
    let { data: orgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (orgError && orgError.code !== 'PGRST116') {
      throw orgError;
    }

    if (!orgs) {
      const { data: newOrg, error: createOrgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'Default Organization', slug: 'default-org', settings: { theme: 'default' } })
        .select('id')
        .single();
      if (createOrgError) throw createOrgError;
      orgs = newOrg;
      console.log(`Created default organization: ${orgs.id}`);
    }

    const organizationId = orgs.id as string;

    // See if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    const existingUser = existingUsers?.users?.find((u: any) => u.email === ADMIN_EMAIL);

    const upsertProfile = async (userId: string) => {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email: ADMIN_EMAIL,
          full_name: ADMIN_NAME,
          role: ADMIN_ROLE,
          organization_id: organizationId
        }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // Assign super admin to ALL existing organizations
      const { data: allOrgs, error: orgsError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .is('deleted_at', null);
      
      if (orgsError) throw orgsError;

      if (allOrgs && allOrgs.length > 0) {
        const assignments = allOrgs.map((org: any, index: number) => ({
          super_admin_id: userId,
          organization_id: org.id,
          is_primary: index === 0 // First org is primary
        }));

        const { error: assignError } = await supabaseAdmin
          .from('super_admin_organizations')
          .upsert(assignments, { onConflict: 'super_admin_id,organization_id' });
        
        if (assignError) throw assignError;
        console.log(`Assigned super admin to ${allOrgs.length} organization(s)`);
      }
    };

    if (existingUser) {
      await upsertProfile(existingUser.id);
      
      // Assign permissions for all organizations
      const { data: allOrgs } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .is('deleted_at', null);
      
      if (allOrgs && allOrgs.length > 0) {
        for (const org of allOrgs) {
          await supabaseAdmin.rpc('assign_super_admin_permissions_for_org', { org_id: org.id });
        }
        console.log(`Assigned permissions for ${allOrgs.length} organization(s)`);
      }
      
      console.log('Super admin already exists and was updated.');
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Password: ${ADMIN_PASSWORD}`);
      return;
    }

    // Create user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME, role: ADMIN_ROLE, organization_id: organizationId }
    });
    if (createError) throw createError;
    if (!newUser.user) throw new Error('User creation returned no user data');

    await upsertProfile(newUser.user.id);

    // Assign permissions for all organizations
    const { data: allOrgs } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .is('deleted_at', null);
    
    if (allOrgs && allOrgs.length > 0) {
      for (const org of allOrgs) {
        await supabaseAdmin.rpc('assign_super_admin_permissions_for_org', { org_id: org.id });
      }
      console.log(`Assigned permissions for ${allOrgs.length} organization(s)`);
    }

    console.log('Super admin user seeded successfully!');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error: any) {
    console.error('Failed to seed super admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
