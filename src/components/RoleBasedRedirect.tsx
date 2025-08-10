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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Determining user role...</p>
        </div>
      </div>
    );
  }

  return null;
}