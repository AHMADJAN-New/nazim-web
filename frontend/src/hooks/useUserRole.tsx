import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { profile } = useAuth();

  // Always use profile from AuthContext - no Supabase query needed
  const role = profile?.role || null;
  const loading = false; // Profile is always available from AuthContext

  return { role, loading };
};