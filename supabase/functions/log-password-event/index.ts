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

interface PasswordEventRequest {
  email?: string;
  event_type:
    | 'password_reset_requested'
    | 'password_reset_completed'
    | 'password_changed';
}

const rateLimitWindowMs = 60_000;
const maxRequestsPerKey = 20;
const recentHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = recentHits.get(key);
  if (!entry || now > entry.resetAt) {
    recentHits.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequestsPerKey;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin') || '';
  if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return new Response('Origin not allowed', { status: 403 });
  }

  const corsHeaders = getCorsHeaders(origin || '*');
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, event_type }: PasswordEventRequest = await req.json();

    // Whitelist event types
    const allowedEvents = new Set<PasswordEventRequest['event_type']>([
      'password_reset_requested',
      'password_reset_completed',
      'password_changed',
    ]);
    if (!allowedEvents.has(event_type)) {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Rate limit by IP and email
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rlKeyIp = `ip:${clientIp}`;
    const rlKeyEmail = email ? `email:${email.toLowerCase()}` : '';
    if (isRateLimited(rlKeyIp) || (rlKeyEmail && isRateLimited(rlKeyEmail))) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userAgent = req.headers.get('user-agent') || 'unknown';

    let user_id: string | null = null;

    // If we have an email, try to find the user (do not error on not found)
    if (email) {
      const { data } = await supabase.auth.admin.getUserByEmail(email);
      user_id = data?.user?.id ?? null;
    } else {
      // If no email provided, try to get from auth header
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        user_id = data?.user?.id ?? null;
      }
    }

    // Insert audit log (even if user unknown)
    const { error: logError } = await supabase
      .from('password_audit_logs')
      .insert({
        user_id,
        event_type,
        ip_address: clientIp,
        user_agent: userAgent,
      });

    if (logError) {
      console.error('Error logging password event:', logError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error('Error in log-password-event function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
