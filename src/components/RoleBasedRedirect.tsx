import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading';

// Development mode: Set to true to bypass authentication
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DISABLE_AUTH !== 'false';

export default function RoleBasedRedirect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Development mode: Skip role check and go to dashboard
    if (DEV_AUTH_BYPASS) {
      console.log('🔓 Development mode: Redirecting to dashboard (auth bypassed)');
      navigate('/dashboard');
      return;
    }

    if (!user) {
      console.log('No user in RoleBasedRedirect, staying on current page');
      setLoading(false);
      return;
    }

    console.log('Fetching user role for:', user.email);
    
    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          // User might be pending approval
          // Checking pending registrations
          const { data: pendingData } = await supabase
            .from('pending_registrations')
            .select('status')
            .eq('user_id', user.id)
            .single();

          if (pendingData) {
            console.log('User has pending registration:', pendingData.status);
            setUserRole('pending');
          } else {
            console.log('No profile or pending registration found');
            setUserRole(null);
          }
        } else {
          console.log('User role found:', data.role);
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Unexpected error fetching user role:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (loading || !userRole) return;

    console.log('Redirecting based on role:', userRole);
    
    // Redirect based on role
    switch (userRole) {
      case 'super_admin':
        console.log('Redirecting to super admin');
        navigate('/super-admin');
        break;
      case 'admin':
        console.log('Redirecting to school admin');
        navigate('/school-admin');
        break;
      case 'pending':
        console.log('Redirecting to pending approval');
        navigate('/pending-approval');
        break;
      default:
        console.log('Redirecting to dashboard');
        navigate('/dashboard');
        break;
    }
  }, [userRole, loading, navigate]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Determining user role..." fullScreen />;
  }

  return null;
}