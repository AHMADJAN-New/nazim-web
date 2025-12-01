import { useMutation } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfiles';

export interface DuplicateCheckInput {
    full_name: string;
    father_name: string;
    tazkira_number?: string | null;
    card_number?: string | null;
    admission_no?: string | null;
}

export interface DuplicateRecord {
    id: string;
    full_name: string;
    father_name: string;
    tazkira_number: string | null;
    card_number: string | null;
    admission_no: string | null;
    orig_province: string | null;
    admission_year: string | null;
    created_at: string | null;
    match_reason: string;
}

export const useStudentDuplicateCheck = () => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (payload: DuplicateCheckInput): Promise<DuplicateRecord[]> => {
            if (!user || !profile) return [];

            // Fetch duplicate check results from Laravel API
            const results = await studentsApi.checkDuplicates(payload);
            return results as DuplicateRecord[];
        },
    });
};


