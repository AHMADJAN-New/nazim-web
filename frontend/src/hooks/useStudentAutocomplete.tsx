import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';
import { studentsApi } from '@/lib/api/client';

export interface StudentAutocompleteData {
    names: string[];
    fatherNames: string[];
    grandfatherNames: string[];
    origProvinces: string[];
    currProvinces: string[];
    origDistricts: string[];
    currDistricts: string[];
    origVillages: string[];
    currVillages: string[];
    guardianNames: string[];
    zaminNames: string[];
}

export function useStudentAutocomplete() {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['student-autocomplete', profile?.organization_id, profile?.default_school_id ?? null, profile?.role],
        queryFn: async (): Promise<StudentAutocompleteData> => {
            if (!user || !profile) {
                return {
                    names: [],
                    fatherNames: [],
                    grandfatherNames: [],
                    origProvinces: [],
                    currProvinces: [],
                    origDistricts: [],
                    currDistricts: [],
                    origVillages: [],
                    currVillages: [],
                    guardianNames: [],
                    zaminNames: [],
                };
            }

            // Fetch autocomplete data from Laravel API
            // Backend automatically scopes by organization_id and school_id via middleware
            const data = await studentsApi.autocomplete({
                organization_id: profile.organization_id,
                school_id: profile.default_school_id,
            });
            return data as StudentAutocompleteData;
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false, // REQUIRED: Performance optimization
        refetchOnReconnect: false, // REQUIRED: Performance optimization
    });
}


