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

// Supabase is deprecated - using Laravel API instead
// Validate environment variables (optional - won't throw if missing)
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Supabase not configured - using Laravel API instead. This is expected after migration.');
  // Don't throw - just create a dummy client that won't be used
}

// Supabase admin client is deprecated - using Laravel API instead
// This file is kept for backward compatibility but should not be used for new features
// Create admin client with service role key (dummy if not configured)
// This bypasses RLS and should only be used for admin operations
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY || 'dummy-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

