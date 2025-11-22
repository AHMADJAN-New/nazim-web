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
  const { user, profile } = useAuth();
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

    // Use profile from AuthContext - no Supabase query needed
    if (profile?.role) {
      console.log('User role from AuthContext:', profile.role);
      setUserRole(profile.role);
      setLoading(false);
      return;
    }

    // If profile not available yet, check for pending registration
    console.log('Profile not available, checking pending registration for:', user.email);
    
    const checkPendingRegistration = async () => {
      try {
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
      } catch (error) {
        console.error('Unexpected error checking pending registration:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkPendingRegistration();
  }, [user, profile, navigate]);

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