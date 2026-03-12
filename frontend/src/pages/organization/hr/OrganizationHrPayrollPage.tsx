import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrPayrollPage() {
  const { t } = useLanguage();

  return <div className="p-4 md:p-6 text-2xl font-bold">{t('organizationHr.payroll') || 'Organization HR / Payroll'}</div>;
}
