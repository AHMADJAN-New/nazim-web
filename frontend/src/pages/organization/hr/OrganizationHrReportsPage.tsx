import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgHrAnalyticsOverview } from '@/hooks/orgHr/useOrgHr';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrReportsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useOrgHrAnalyticsOverview();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t('organizationHr.reportsTitle') || 'Organization HR / Reports'}</h1>

      {isLoading ? <div>{t('organizationHr.loading') || 'Loading...'}</div> : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('organizationHr.kpiSchools') || 'Schools with headcount'}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data?.headcount_by_school?.length ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('organizationHr.kpiPayrollMonths') || 'Payroll months'}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data?.payroll_by_month?.length ?? 0}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('organizationHr.kpiPendingApprovals') || 'Pending approvals'}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{data?.pending_approvals ?? 0}</CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">{t('organizationHr.analyticsRaw') || 'Analytics (raw JSON)'}</p>
          <pre className="rounded border p-3 text-xs overflow-auto">{JSON.stringify(data ?? {}, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
