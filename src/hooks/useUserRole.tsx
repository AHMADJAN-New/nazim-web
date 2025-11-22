import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

export const useUserRole = () => {
  const { profile } = useAuth();
  
  // Always use profile from AuthContext - no Supabase query needed
  const role = profile?.role || null;
  const loading = false; // Profile is always available from AuthContext

  return { role, loading };
};