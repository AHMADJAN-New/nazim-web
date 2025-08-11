import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.0";

const rawAllowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const isOriginAllowed = (origin: string) => {
  if (!rawAllowedOrigins.length) return true; // allow all if not configured
  return rawAllowedOrigins.includes(origin);
};

const getCorsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
});

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  if (!isOriginAllowed(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller and verify role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const srKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get('authorization') || '' } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check role from profiles
    const serviceClient = createClient(supabaseUrl, srKey);
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Unable to resolve user role' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const allowedRoles = new Set(['super_admin', 'admin', 'staff']);
    if (!allowedRoles.has(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { ip, port } = await req.json();
    if (!ip || !port || typeof ip !== 'string' || typeof port !== 'number') {
      return new Response(JSON.stringify({ error: 'Missing or invalid ip/port' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Validate against allowlist of active attendance devices
    const { data: device, error: deviceErr } = await serviceClient
      .from('attendance_devices')
      .select('id, ip_address, port, is_active')
      .eq('ip_address', ip)
      .eq('port', port)
      .eq('is_active', true)
      .maybeSingle();

    if (deviceErr || !device) {
      return new Response(JSON.stringify({ error: 'Device not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const url = `http://${ip}:${port}/logs`;
    const deviceResponse = await fetch(url, { method: 'GET' });
    if (!deviceResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to retrieve device logs' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const logs = await deviceResponse.json();

    return new Response(JSON.stringify({ logs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('fetch-device-logs error', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
