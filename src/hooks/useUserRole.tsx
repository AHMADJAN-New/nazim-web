import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

export const useUserRole = () => {
  const { user } = useAuth();
  // In dev mode, start with admin role and no loading
  const [role, setRole] = useState<string | null>(DEV_AUTH_BYPASS ? 'admin' : null);
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);

  useEffect(() => {
    // Development mode: Return admin role immediately
    if (DEV_AUTH_BYPASS) {
      setRole('admin'); // Default to admin role for full access
      setLoading(false);
      return;
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { role, loading };
};