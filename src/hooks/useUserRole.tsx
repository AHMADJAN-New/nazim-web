import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

export const useUserRole = () => {
  const { user, profile } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have a profile from useAuth, use it directly (faster and more reliable)
    if (profile?.role) {
      setRole(profile.role);
      setLoading(false);
      return;
    }

    // Development mode: Only use admin as fallback if no user
    if (DEV_AUTH_BYPASS && !user) {
      setRole('admin');
      setLoading(false);
      return;
    }

    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Fetch role from database if profile not available
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
  }, [user, profile]);

  return { role, loading };
};