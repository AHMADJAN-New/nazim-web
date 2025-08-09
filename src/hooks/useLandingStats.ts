import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface LandingStats {
  students: number;
  staff: number;
}

export const useLandingStats = () => {
  const query = useQuery({
    queryKey: ['landing-stats'],
    queryFn: async (): Promise<LandingStats> => {
      const [students, staff] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('staff').select('*', { count: 'exact', head: true }),
      ]);

      return {
        students: students.count ?? 0,
        staff: staff.count ?? 0,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('landing-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        query.refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        query.refetch();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [query.refetch]);

  return query;
};

