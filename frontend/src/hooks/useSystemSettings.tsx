import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';

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
      // TODO: Migrate to Laravel API endpoint for fetching system settings
      throw new Error('System settings endpoint not yet implemented in Laravel API');
    },
    enabled: false, // Disabled until migrated
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingsData: Partial<SystemSettings>) => {
      // TODO: Migrate to Laravel API endpoint for updating system settings
      throw new Error('Update system settings endpoint not yet implemented in Laravel API');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      showToast.success('toast.systemSettingsUpdated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.systemSettingsUpdateFailed');
    },
  });
};