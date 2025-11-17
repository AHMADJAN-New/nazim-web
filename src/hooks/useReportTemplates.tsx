import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface ReportTemplate {
    id: string;
    school_id: string;
    template_name: string;
    template_type: string;
    header_text: string | null;
    footer_text: string | null;
    header_html: string | null;
    footer_html: string | null;
    report_logo_selection: string;
    show_page_numbers: boolean;
    show_generation_date: boolean;
    table_alternating_colors: boolean;
    report_font_size: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CreateReportTemplateData {
    school_id: string;
    template_name: string;
    template_type: string;
    header_text?: string;
    footer_text?: string;
    header_html?: string;
    footer_html?: string;
    report_logo_selection?: string;
    show_page_numbers?: boolean;
    show_generation_date?: boolean;
    table_alternating_colors?: boolean;
    report_font_size?: string;
    is_default?: boolean;
    is_active?: boolean;
}

export interface UpdateReportTemplateData extends Partial<CreateReportTemplateData> {
    id: string;
}

export const useReportTemplates = (schoolId?: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['report-templates', schoolId],
        queryFn: async () => {
            if (!user || !profile) return [];

            let query = (supabase as any)
                .from('report_templates')
                .select('*')
                .order('template_name', { ascending: true });

            if (schoolId) {
                query = query.eq('school_id', schoolId);
            } else if (profile.organization_id) {
                // Get templates for all schools in the organization
                const { data: schools } = await supabase
                    .from('school_branding')
                    .select('id')
                    .eq('organization_id', profile.organization_id)
                    .is('deleted_at', null);

                if (schools && schools.length > 0) {
                    const schoolIds = schools.map(s => s.id);
                    query = query.in('school_id', schoolIds);
                } else {
                    return [];
                }
            }

            // Try with deleted_at filter, fallback if column doesn't exist
            const { data, error } = await query.is('deleted_at', null);

            if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
                const { data: retryData, error: retryError } = await query;
                if (retryError) {
                    throw new Error(retryError.message);
                }
                return (retryData as unknown) as ReportTemplate[];
            }

            if (error) {
                throw new Error(error.message);
            }

            return (data as unknown) as ReportTemplate[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useCreateReportTemplate = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (templateData: CreateReportTemplateData) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const isSuperAdmin = profile.role === 'super_admin';
            const isAdmin = profile.role === 'admin';

            if (!isSuperAdmin && !isAdmin) {
                throw new Error('Insufficient permissions to create report templates');
            }

            const { data, error } = await (supabase as any)
                .from('report_templates')
                .insert({
                    school_id: templateData.school_id,
                    template_name: templateData.template_name,
                    template_type: templateData.template_type,
                    header_text: templateData.header_text || null,
                    footer_text: templateData.footer_text || null,
                    header_html: templateData.header_html || null,
                    footer_html: templateData.footer_html || null,
                    report_logo_selection: templateData.report_logo_selection || 'primary',
                    show_page_numbers: templateData.show_page_numbers !== undefined ? templateData.show_page_numbers : true,
                    show_generation_date: templateData.show_generation_date !== undefined ? templateData.show_generation_date : true,
                    table_alternating_colors: templateData.table_alternating_colors !== undefined ? templateData.table_alternating_colors : true,
                    report_font_size: templateData.report_font_size || '12px',
                    is_default: templateData.is_default !== undefined ? templateData.is_default : false,
                    is_active: templateData.is_active !== undefined ? templateData.is_active : true,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
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

export const useUpdateReportTemplate = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (templateData: UpdateReportTemplateData) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const isSuperAdmin = profile.role === 'super_admin';
            const isAdmin = profile.role === 'admin';

            if (!isSuperAdmin && !isAdmin) {
                throw new Error('Insufficient permissions to update report templates');
            }

            const updateData: any = {};
            if (templateData.template_name !== undefined) updateData.template_name = templateData.template_name;
            if (templateData.template_type !== undefined) updateData.template_type = templateData.template_type;
            if (templateData.header_text !== undefined) updateData.header_text = templateData.header_text;
            if (templateData.footer_text !== undefined) updateData.footer_text = templateData.footer_text;
            if (templateData.header_html !== undefined) updateData.header_html = templateData.header_html;
            if (templateData.footer_html !== undefined) updateData.footer_html = templateData.footer_html;
            if (templateData.report_logo_selection !== undefined) updateData.report_logo_selection = templateData.report_logo_selection;
            if (templateData.show_page_numbers !== undefined) updateData.show_page_numbers = templateData.show_page_numbers;
            if (templateData.show_generation_date !== undefined) updateData.show_generation_date = templateData.show_generation_date;
            if (templateData.table_alternating_colors !== undefined) updateData.table_alternating_colors = templateData.table_alternating_colors;
            if (templateData.report_font_size !== undefined) updateData.report_font_size = templateData.report_font_size;
            if (templateData.is_default !== undefined) updateData.is_default = templateData.is_default;
            if (templateData.is_active !== undefined) updateData.is_active = templateData.is_active;

            const { data, error } = await (supabase as any)
                .from('report_templates')
                .update(updateData)
                .eq('id', templateData.id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
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

export const useDeleteReportTemplate = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Soft delete: set deleted_at timestamp
            const { error } = await (supabase as any)
                .from('report_templates')
                .update({ deleted_at: new Date().toISOString() })
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

