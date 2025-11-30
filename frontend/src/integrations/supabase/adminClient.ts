// Admin Supabase client for server-side operations
// WARNING: This uses the service role key and should ONLY be used for admin operations
// In production, these operations should be moved to Edge Functions or RPC functions

import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = env.VITE_SUPABASE_URL;

// For local development, use the default local service role key
// For production, this should come from environment variables (server-side only)
// Note: In production, this should be moved to an Edge Function or RPC function for security
const SUPABASE_SERVICE_ROLE_KEY = 
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
  // Default local Supabase service role key (secret format from supabase start)
  // This is the "Secret key" shown in `supabase status` output
  'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is not configured');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY is not configured. Admin operations may fail.');
}

// Create admin client with service role key
// This bypasses RLS and should only be used for admin operations
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

