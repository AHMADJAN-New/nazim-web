import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReportTemplate {
  id: string;
  template_name: string;
  template_type: string;
  school_id: string;
  header_text: string | null;
  footer_text: string | null;
  header_html: string | null;
  footer_html: string | null;
  report_logo_selection: string | null;
  show_page_numbers: boolean;
  show_generation_date: boolean;
  table_alternating_colors: boolean;
  report_font_size: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateReportTemplateData {
  template_name: string;
  template_type: string;
  school_id: string;
  header_text?: string | null;
  footer_text?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  report_logo_selection?: string | null;
  show_page_numbers?: boolean;
  show_generation_date?: boolean;
  table_alternating_colors?: boolean;
  report_font_size?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

// Hook to fetch report templates by school
export const useReportTemplates = (schoolId?: string) => {
  return useQuery({
    queryKey: ['report-templates', schoolId],
    queryFn: async (): Promise<ReportTemplate[]> => {
      // Build query conditionally to avoid type inference issues
      const baseQuery = (supabase as any)
        .from('report_templates')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      const { data, error } = schoolId
        ? await baseQuery.eq('school_id', schoolId)
        : await baseQuery;

      if (error) {
        const msg = error.message || '';
        const isMissingTable =
          error.code === '42P01' || // postgres: undefined table
          error.code === 'PGRST116' || // postgrest: relation not found
          (error as any).status === 404 ||
          msg.includes('does not exist') ||
          msg.includes('schema cache') ||
          msg.includes("Could not find the table 'public.report_templates'");

        if (isMissingTable) {
          if (import.meta.env.DEV) {
            console.warn(
              '[Nazim] report_templates table does not exist yet (local dev). Returning empty templates array.',
            );
          }
          return [];
        }
        // real error
        throw new Error(error.message);
      }

      // Type assertion through unknown to avoid deep instantiation error
      return ((data || []) as unknown) as ReportTemplate[];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to create a new report template
export const useCreateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreateReportTemplateData): Promise<ReportTemplate> => {
      const { data, error } = await (supabase as any)
        .from('report_templates')
        .insert(templateData as any)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Type assertion through unknown to avoid deep instantiation error
      return ((data as unknown) as ReportTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Report template created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create report template');
    },
  });
};

// Hook to update a report template
export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateReportTemplateData> & { id: string }): Promise<ReportTemplate> => {
      const { data, error } = await (supabase as any)
        .from('report_templates')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Type assertion through unknown to avoid deep instantiation error
      return ((data as unknown) as ReportTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Report template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update report template');
    },
  });
};

// Hook to delete a report template (soft delete)
export const useDeleteReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await (supabase as any)
        .from('report_templates')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Report template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete report template');
    },
  });
};

