import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

async function distinctValues(table: string, column: string, filters?: Record<string, any>): Promise<string[]> {
    let query = (supabase as any).from(table).select(`${column}`).not(column, 'is', null).neq(column, '');

    if (filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (value === null) continue;
            query = query.eq(key, value);
        }
    }

    const { data, error } = await query.order(column, { ascending: true });
    if (error) {
        throw new Error(error.message);
    }

    const values = (data || []).map((row: any) => row[column]).filter((v: any) => typeof v === 'string') as string[];
    // Deduplicate while preserving order
    return Array.from(new Set(values));
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

            const isSuperAdmin = profile.role === 'super_admin';
            const filters = isSuperAdmin ? undefined : { organization_id: profile.organization_id };

            const [
                names,
                fatherNames,
                grandfatherNames,
                origDistricts,
                currDistricts,
                origVillages,
                currVillages,
                guardianNames,
                zaminNames,
            ] = await Promise.all([
                distinctValues('students', 'full_name', filters),
                distinctValues('students', 'father_name', filters),
                distinctValues('students', 'grandfather_name', filters),
                distinctValues('students', 'orig_district', filters),
                distinctValues('students', 'curr_district', filters),
                distinctValues('students', 'orig_village', filters),
                distinctValues('students', 'curr_village', filters),
                distinctValues('students', 'guardian_name', filters),
                distinctValues('students', 'zamin_name', filters),
            ]);

            return {
                names,
                fatherNames,
                grandfatherNames,
                origDistricts,
                currDistricts,
                origVillages,
                currVillages,
                guardianNames,
                zaminNames,
            };
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}


