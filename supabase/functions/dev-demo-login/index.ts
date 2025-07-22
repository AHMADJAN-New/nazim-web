import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow this in development environments
    const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production'
    
    if (!isDevelopment) {
      return new Response(
        JSON.stringify({ error: 'This endpoint is only available in development mode' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create admin client for user operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user by email
    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    
    if (getUserError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate a session for this user (bypass password check)
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (sessionError) {
      console.error('Session generation error:', sessionError)
      return new Response(
        JSON.stringify({ error: 'Failed to create development session' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the development login
    try {
      await supabaseAdmin.rpc('log_auth_event', {
        event_type: 'dev_demo_login_bypass',
        event_data: { 
          email: email,
          user_id: authUser.user.id,
          development_mode: true,
          bypass_auth: true
        },
        error_message: null,
        user_email: email
      })
    } catch (logError) {
      console.error('Logging error:', logError)
      // Continue even if logging fails
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        session_url: sessionData.properties?.action_link,
        user: authUser.user
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in dev-demo-login:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})