import { BarChart3, Building2, Users, Clock, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useOrgHrAnalyticsOverview } from '@/hooks/orgHr/useOrgHr';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrReportsPage() {
  const { t } = useLanguage();
  const { data: analytics, isLoading } = useOrgHrAnalyticsOverview();
  const { data: schools } = useSchools();

  const totalHeadcount = useMemo(
    () => analytics?.headcountBySchool?.reduce((sum, s) => sum + s.headcount, 0) ?? 0,
    [analytics],
  );

  const totalPayroll = useMemo(
    () => analytics?.payrollByMonth?.reduce((sum, m) => sum + m.totalNet, 0) ?? 0,
    [analytics],
  );

  const schoolName = (schoolId: string) => {
    if (!schools) return schoolId.slice(0, 8);
    const school = (schools as { id: string; name?: string; school_name?: string }[])
      .find(s => s.id === schoolId);
    return school?.name || school?.school_name || schoolId.slice(0, 8);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.reportsTitle')}
        description={t('organizationHr.reportsPageDesc')}
        icon={<BarChart3 className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/organization/hr' },
          { label: t('organizationHr.reports') },
        ]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title={t('organizationHr.kpiTotalStaff')}
              value={totalHeadcount}
              icon={Users}
              color="blue"
            />
            <StatsCard
              title={t('organizationHr.kpiSchools')}
              value={analytics?.headcountBySchool?.length ?? 0}
              icon={Building2}
              color="green"
            />
            <StatsCard
              title={t('organizationHr.kpiPendingApprovals')}
              value={analytics?.pendingApprovals ?? 0}
              icon={Clock}
              color="amber"
            />
            <StatsCard
              title={t('organizationHr.kpiTotalPayroll')}
              value={new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(totalPayroll)}
              icon={TrendingUp}
              color="purple"
            />
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('organizationHr.headcountBySchool')}</CardTitle>
                <CardDescription>{t('organizationHr.headcountBySchoolDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationHr.school')}</TableHead>
                        <TableHead className="text-right">{t('organizationHr.headcount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.headcountBySchool ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                            {t('organizationHr.noData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        (analytics?.headcountBySchool ?? []).map((item) => (
                          <TableRow key={item.schoolId}>
                            <TableCell className="font-medium">{schoolName(item.schoolId)}</TableCell>
                            <TableCell className="text-right font-medium">{item.headcount}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('organizationHr.payrollByMonth')}</CardTitle>
                <CardDescription>{t('organizationHr.payrollByMonthDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('organizationHr.month')}</TableHead>
                        <TableHead className="text-right">{t('organizationHr.totalNet')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(analytics?.payrollByMonth ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="h-20 text-center text-muted-foreground">
                            {t('organizationHr.noData')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        (analytics?.payrollByMonth ?? []).map((item) => (
                          <TableRow key={item.month}>
                            <TableCell className="font-medium">{item.month}</TableCell>
                            <TableCell className="text-right font-medium">
                              {new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(item.totalNet)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
