import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Demo account emails
    const demoEmails = [
      'super.admin@greenvalley.edu',
      'admin@greenvalley.edu',
      'teacher@greenvalley.edu',
      'student@greenvalley.edu',
      'parent@greenvalley.edu',
      'staff@greenvalley.edu',
      'pending@greenvalley.edu'
    ];

    const results = [];

    for (const email of demoEmails) {
      try {
        // Update password using admin API
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === email);
        
        if (user) {
          const { error } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: 'admin123' }
          );

          if (error) {
            console.error(`Error updating password for ${email}:`, error);
            results.push({ email, success: false, error: error.message });
          } else {
            console.log(`Successfully updated password for ${email}`);
            results.push({ email, success: true });
          }
        } else {
          console.log(`User not found: ${email}`);
          results.push({ email, success: false, error: 'User not found' });
        }
      } catch (error: any) {
        console.error(`Error processing ${email}:`, error);
        results.push({ email, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Updated passwords for ${successCount}/${demoEmails.length} demo accounts`);

    return new Response(JSON.stringify({ 
      message: `Updated passwords for ${successCount}/${demoEmails.length} demo accounts`,
      results,
      password: 'admin123'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in update-demo-passwords function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);