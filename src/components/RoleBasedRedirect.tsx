import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
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
          // User might be pending approval
          console.log('User profile not found, checking pending registrations');
          const { data: pendingData } = await supabase
            .from('pending_registrations')
            .select('status')
            .eq('user_id', user.id)
            .single();

          if (pendingData) {
            setUserRole('pending');
          }
        } else {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (loading || !userRole) return;

    // Redirect based on role
    switch (userRole) {
      case 'super_admin':
        navigate('/super-admin');
        break;
      case 'admin':
        navigate('/school-admin');
        break;
      case 'pending':
        navigate('/pending-approval');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return null;
}