import { BarChart3, Building2, ClipboardList, FileSpreadsheet, Users, UserRound, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useOrgHrAnalyticsOverview } from '@/hooks/orgHr/useOrgHr';
import { useHasPermission } from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrHubPage() {
  const { t } = useLanguage();
  const { data: analytics, isLoading } = useOrgHrAnalyticsOverview();

  const hasStaffPerm = useHasPermission('hr_staff.read');
  const hasAssignmentsPerm = useHasPermission('hr_assignments.read');
  const hasPayrollPerm = useHasPermission('hr_payroll.read');
  const hasReportsPerm = useHasPermission('hr_reports.read');

  const modules = [
    {
      title: t('organizationHr.staffMaster'),
      description: t('organizationHr.staffMasterDesc'),
      path: '/organization/hr/staff',
      icon: UserRound,
      color: 'blue' as const,
      visible: hasStaffPerm,
    },
    {
      title: t('organizationHr.assignments'),
      description: t('organizationHr.assignmentsDesc'),
      path: '/organization/hr/assignments',
      icon: ClipboardList,
      color: 'green' as const,
      visible: hasAssignmentsPerm,
    },
    {
      title: t('organizationHr.payroll'),
      description: t('organizationHr.payrollDesc'),
      path: '/organization/hr/payroll',
      icon: FileSpreadsheet,
      color: 'purple' as const,
      visible: hasPayrollPerm,
    },
    {
      title: t('organizationHr.reports'),
      description: t('organizationHr.reportsDesc'),
      path: '/organization/hr/reports',
      icon: BarChart3,
      color: 'amber' as const,
      visible: hasReportsPerm,
    },
  ];

  const totalHeadcount = analytics?.headcountBySchool?.reduce((sum, s) => sum + s.headcount, 0) ?? 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.hubTitle')}
        description={t('organizationHr.hubDescription')}
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[{ label: t('organizationHr.hubTitle') }]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {modules.filter(m => m.visible).map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.path} to={module.path} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{module.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {module.description}
                  </CardDescription>
                  <div className="mt-3 flex items-center text-xs font-medium text-primary group-hover:underline">
                    {t('organizationHr.openModule')}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
