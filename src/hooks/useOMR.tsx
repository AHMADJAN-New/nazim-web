import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { OMRScanResult, AnswerKey } from '@/types/omr';

export const useOMRScans = () => {
  return useQuery({
    queryKey: ['omr-scans'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('omr_scans')
        .select('*')
        .order('scanned_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((scan: any) => ({
        id: scan.id,
        fileName: scan.file_name,
        studentId: scan.student_id,
        score: scan.score ?? 0,
        totalQuestions: scan.total_questions ?? 0,
        answers: scan.answers || {},
        layoutId: scan.layout_id || '',
        scanAccuracy: scan.scan_accuracy ?? 0,
        scanDate: scan.scanned_at ? new Date(scan.scanned_at) : new Date(),
      })) as OMRScanResult[];
    },
  });
};

export const useSaveOMRScans = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (results: OMRScanResult[]) => {
      const payload = results.map(r => ({
        file_name: r.fileName,
        student_id: r.studentId,
        score: r.score,
        total_questions: r.totalQuestions,
        answers: r.answers,
        layout_id: r.layoutId,
        scan_accuracy: r.scanAccuracy,
        scanned_at: r.scanDate.toISOString(),
      }));
      const { error } = await (supabase as any)
        .from('omr_scans')
        .insert(payload);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omr-scans'] });
      toast.success('Scan results saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save scan results');
    },
  });
};

export const useClearOMRScans = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('omr_scans')
        .delete()
        .neq('id', '');
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omr-scans'] });
      toast.success('Scan results cleared');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clear scan results');
    },
  });
};

export const useAnswerKey = () => {
  return useQuery({
    queryKey: ['omr-answer-key'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('answer_keys')
        .select('*')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }
      return (data?.answers || null) as AnswerKey | null;
    },
  });
};

export const useSaveAnswerKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (answers: AnswerKey) => {
      const { error } = await (supabase as any)
        .from('answer_keys')
        .upsert({ layout_id: 'default', answers })
        .select()
        .single();
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omr-answer-key'] });
      toast.success('Answer key saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save answer key');
    },
  });
};

export const useClearAnswerKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('answer_keys')
        .delete()
        .neq('id', '');
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omr-answer-key'] });
      toast.success('Answer key cleared');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clear answer key');
    },
  });
};

