import { useQuery } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';

export interface StudentAutocompleteData {
    names: string[];
    fatherNames: string[];
    grandfatherNames: string[];
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
        queryKey: ['student-autocomplete', profile?.organization_id, profile?.role],
        queryFn: async (): Promise<StudentAutocompleteData> => {
            if (!user || !profile) {
                return {
                    names: [],
                    fatherNames: [],
                    grandfatherNames: [],
                    origDistricts: [],
                    currDistricts: [],
                    origVillages: [],
                    currVillages: [],
                    guardianNames: [],
                    zaminNames: [],
                };
            }

            // Fetch autocomplete data from Laravel API
            const data = await studentsApi.autocomplete();
            return data as StudentAutocompleteData;
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}


