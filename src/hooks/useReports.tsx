import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type ReportTemplate = Database['public']['Tables']['report_templates']['Row'];
export type GeneratedReport = Database['public']['Tables']['generated_reports']['Row'];
export type ScheduledReport = Database['public']['Tables']['scheduled_reports']['Row'];

// Report Templates
export const useReports = () => {
  return useQuery<ReportTemplate[]>({
    queryKey: ['report_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data as ReportTemplate[];
    },
  });
};

export const useCreateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      report: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('report_templates')
        .insert(report)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ReportTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Report created successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReportTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('report_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ReportTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Report updated successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report_templates'] });
      toast.success('Report deleted successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Generated Reports (History)
export const useReportHistory = () => {
  return useQuery<GeneratedReport[]>({
    queryKey: ['generated_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .order('generated_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as GeneratedReport[];
    },
  });
};

export const useCreateGeneratedReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      report: Omit<GeneratedReport, 'id' | 'generated_at' | 'download_count'>
    ) => {
      const { data, error } = await supabase
        .from('generated_reports')
        .insert({ ...report, download_count: 0 })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as GeneratedReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated_reports'] });
      toast.success('Report history added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateGeneratedReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GeneratedReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('generated_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as GeneratedReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated_reports'] });
      toast.success('Report history updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteGeneratedReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('generated_reports')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated_reports'] });
      toast.success('Report history deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

// Scheduled Reports
export const useReportSchedules = () => {
  return useQuery<ScheduledReport[]>({
    queryKey: ['scheduled_reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('next_run');
      if (error) throw new Error(error.message);
      return data as ScheduledReport[];
    },
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      schedule: Omit<ScheduledReport, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert(schedule)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_reports'] });
      toast.success('Schedule created successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ScheduledReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_reports'] });
      toast.success('Schedule updated successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_reports'] });
      toast.success('Schedule deleted successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

