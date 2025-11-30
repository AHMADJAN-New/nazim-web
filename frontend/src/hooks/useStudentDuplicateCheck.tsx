import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

            // Build OR filters similar to the Python implementation
            // Using multiple queries then merging to keep it simple and avoid PostgREST OR complexity.
            const filters: any = {};
            const isSuperAdmin = profile.role === 'super_admin';
            if (!isSuperAdmin) {
                filters.organization_id = profile.organization_id;
            }

            const results: DuplicateRecord[] = [];

            async function runQuery(select: string, builder: any, reason: string) {
                const { data, error } = await builder.select(select);
                if (error) return;
                (data || []).forEach((row: any) => {
                    results.push({
                        id: row.id,
                        full_name: row.full_name,
                        father_name: row.father_name,
                        tazkira_number: row.tazkira_number || null,
                        card_number: row.card_number || null,
                        admission_no: row.admission_no || null,
                        orig_province: row.orig_province || null,
                        admission_year: row.admission_year || null,
                        created_at: row.created_at || null,
                        match_reason: reason,
                    });
                });
            }

            const base = () => {
                let q = (supabase as any).from('students');
                for (const [k, v] of Object.entries(filters)) {
                    q = q.eq(k, v);
                }
                return q;
            };

            const selectCols =
                'id, full_name, father_name, tazkira_number, card_number, admission_no, orig_province, admission_year, created_at';

            // Exact: name + father_name
            await runQuery(
                selectCols,
                base().eq('full_name', payload.full_name).eq('father_name', payload.father_name),
                'Exact name and father name match'
            );

            // Tazkira number match
            if (payload.tazkira_number) {
                await runQuery(selectCols, base().eq('guardian_tazkira', payload.tazkira_number), 'Guardian tazkira matches');
            }

            // Card number match
            if (payload.card_number) {
                await runQuery(selectCols, base().eq('card_number', payload.card_number), 'Card number matches');
            }

            // Admission number match
            if (payload.admission_no) {
                await runQuery(selectCols, base().eq('admission_no', payload.admission_no), 'Admission number matches');
            }

            // Partial: name LIKE and father_name LIKE (simple contains)
            await runQuery(
                selectCols,
                base().ilike('full_name', `%${payload.full_name}%`).ilike('father_name', `%${payload.father_name}%`),
                'Partial name and father name match'
            );

            // Deduplicate by id + reason preference (keep first)
            const seen = new Set<string>();
            const unique: DuplicateRecord[] = [];
            for (const rec of results) {
                const key = `${rec.id}:${rec.match_reason}`;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(rec);
            }

            return unique.slice(0, 25);
        },
    });
};


