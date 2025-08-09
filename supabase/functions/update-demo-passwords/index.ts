import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const getCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
});

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  if (!allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  const corsHeaders = getCorsHeaders(origin);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate caller and authorize super_admin only
    const authHeader = req.headers.get('authorization') || '';
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await supabaseAuth.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (!callerProfile || callerProfile.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // Demo account emails with their details
    const demoAccounts = [
      { 
        email: 'super.admin@greenvalley.edu', 
        fullName: 'Super Administrator', 
        role: 'super_admin' 
      },
      { 
        email: 'admin@greenvalley.edu', 
        fullName: 'School Administrator', 
        role: 'admin' 
      },
      { 
        email: 'teacher@greenvalley.edu', 
        fullName: 'John Teacher', 
        role: 'teacher' 
      },
      { 
        email: 'student@greenvalley.edu', 
        fullName: 'Sarah Student', 
        role: 'student' 
      },
      { 
        email: 'parent@greenvalley.edu', 
        fullName: 'Parent User', 
        role: 'parent' 
      },
      { 
        email: 'staff@greenvalley.edu', 
        fullName: 'Staff Member', 
        role: 'staff' 
      },
      { 
        email: 'pending@greenvalley.edu', 
        fullName: 'Pending User', 
        role: 'student' 
      }
    ];

    const { data: existingUsersData } = await supabase.auth.admin.listUsers();
    const existingUsers = new Map(existingUsersData.users.map(u => [u.email, u]));

    const results = [];

    for (const account of demoAccounts) {
      try {
        // First check if user exists using pre-fetched data
        let user = existingUsers.get(account.email);
        
        if (!user) {
          // Create the user if they don't exist
          console.log(`Creating user: ${account.email}`);
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: account.email,
            password: 'admin123',
            email_confirm: true,
            user_metadata: {
              full_name: account.fullName,
              role: account.role,
              school_id: account.role !== 'super_admin' ? '348b0c64-f47f-4ac0-844f-99438c0c5f51' : undefined
            }
          });

          if (createError) {
            console.error(`Error creating user ${account.email}:`, createError);
            results.push({ email: account.email, success: false, error: `Failed to create: ${createError.message}` });
            continue;
          }
          
          user = newUser.user;
          existingUsers.set(account.email, user);
          console.log(`Successfully created user: ${account.email}`);
        } else {
          // Update existing user's password and metadata
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            {
              password: 'admin123',
              user_metadata: {
                full_name: account.fullName,
                role: account.role,
                school_id: account.role !== 'super_admin' ? '348b0c64-f47f-4ac0-844f-99438c0c5f51' : undefined
              }
            }
          );

          if (updateError) {
            console.error(`Error updating password for ${account.email}:`, updateError);
            results.push({ email: account.email, success: false, error: updateError.message });
            continue;
          }

          console.log(`Successfully updated password for: ${account.email}`);
        }

        results.push({ email: account.email, success: true });
      } catch (error) {
        console.error(`Error processing ${account.email}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        results.push({ email: account.email, success: false, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Updated passwords for ${successCount}/${demoAccounts.length} demo accounts`);

    return new Response(JSON.stringify({ 
      message: `Updated passwords for ${successCount}/${demoAccounts.length} demo accounts`,
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error in update-demo-passwords function:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
