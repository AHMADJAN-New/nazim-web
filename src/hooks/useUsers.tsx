import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, avatar_url');

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((u) => ({
        id: u.id,
        name: u.full_name || u.email || '',
        email: u.email || '',
        role: u.role || '',
        avatar: (u as any).avatar_url || null,
      }));
    },
  });
};
