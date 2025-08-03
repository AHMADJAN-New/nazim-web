import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemSettings {
  school_name: string;
  school_logo_url?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_website?: string;
  academic_year_start_month: number;
  academic_year_end_month: number;
  default_language: string;
  currency_symbol: string;
  date_format: string;
  time_format: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  report_header_text?: string;
  report_footer_text?: string;
  enable_notifications: boolean;
  enable_sms: boolean;
  enable_email: boolean;
  max_students_per_class: number;
  passing_grade_percentage: number;
  late_fee_amount: number;
}

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('category', 'general');

      if (error) {
        throw new Error(error.message);
      }

      // Convert key-value pairs to settings object
      const settings: any = {};
      data?.forEach((setting) => {
        const key = setting.key;
        let value = setting.value;
        
        // Parse JSON values if needed
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if not valid JSON
          }
        }
        
        settings[key] = value;
      });

      return settings as SystemSettings;
    },
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: Partial<SystemSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updates = Object.entries(settingsData).map(([key, value]) => ({
        category: 'general',
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : value,
        description: `System setting for ${key}`,
        is_public: false,
        updated_by: user?.id || '',
      }));

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key,category' });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('System settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update system settings');
    },
  });
};