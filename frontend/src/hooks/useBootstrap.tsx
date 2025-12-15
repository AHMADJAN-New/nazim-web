import { useQuery } from '@tanstack/react-query';
import { appApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface BootstrapData {
  user: { id: string; email: string };
  profile: {
    id: string;
    organization_id: string | null;
    role: string | null;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
    default_school_id: string | null;
  };
  permissions: string[];
  accessibleOrganizations: any[];
  selectedOrganization: any;
  dashboardCounters: {
    students_count: number;
    staff_count: number;
    classes_count: number;
    rooms_count: number;
    buildings_count: number;
  };
}

/**
 * Bootstrap hook - fetches all initial app data in one request
 * This replaces multiple API calls on login/reload
 * 
 * Only runs once when user is authenticated
 */
export const useBootstrap = () => {
  const { user } = useAuth();

  return useQuery<BootstrapData>({
    queryKey: ['app', 'bootstrap'],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }
      return await appApi.bootstrap();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
  });
};

