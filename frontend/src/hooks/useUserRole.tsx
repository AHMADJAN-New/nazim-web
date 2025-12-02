import { useAuth } from '@/hooks/useAuth';

export const useUserRole = () => {
  const { profile } = useAuth();

  // Always use profile from AuthContext
  const role = profile?.role || null;
  const loading = false; // Profile is always available from AuthContext

  return { role, loading };
};