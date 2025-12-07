import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportTemplatesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface ReportTemplate {
  id: string;
  organization_id: string;
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
      if (schoolId) {
        return await reportTemplatesApi.bySchool(schoolId);
      }
      return await reportTemplatesApi.list();
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
      return await reportTemplatesApi.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      showToast.success('toast.reportTemplateCreated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.reportTemplateCreateFailed');
    },
  });
};

// Hook to update a report template
export const useUpdateReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateReportTemplateData> & { id: string }): Promise<ReportTemplate> => {
      return await reportTemplatesApi.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      showToast.success('toast.reportTemplateUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.reportTemplateUpdateFailed');
    },
  });
};

// Hook to delete a report template (soft delete)
export const useDeleteReportTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await reportTemplatesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      showToast.success('toast.reportTemplateDeleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.reportTemplateDeleteFailed');
    },
  });
};

