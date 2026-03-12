import { FileSpreadsheet, Plus, Calendar } from 'lucide-react';
import { useState, useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useOrgHrPayrollPeriods, useOrgHrCompensation } from '@/hooks/orgHr/useOrgHr';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

const periodStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'paid': return 'default';
    case 'finalized': return 'secondary';
    case 'processing': return 'outline';
    case 'draft': return 'outline';
    default: return 'secondary';
  }
};

export default function OrganizationHrPayrollPage() {
  const { t } = useLanguage();
  const { data: periods, isLoading: periodsLoading } = useOrgHrPayrollPeriods();
  const { data: compensation, isLoading: compLoading } = useOrgHrCompensation();

  const isLoading = periodsLoading || compLoading;
  const periodList = useMemo(() => periods ?? [], [periods]);
  const compList = useMemo(() => compensation?.data ?? [], [compensation]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.payroll')}
        description={t('organizationHr.payrollPageDesc')}
        icon={<FileSpreadsheet className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/org-admin/hr' },
          { label: t('organizationHr.payroll') },
        ]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t('organizationHr.payrollPeriods')}</CardTitle>
              </div>
              <CardDescription>{t('organizationHr.payrollPeriodsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationHr.name')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('organizationHr.periodRange')}</TableHead>
                      <TableHead>{t('organizationHr.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                          {t('organizationHr.noPayrollPeriods')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      periodList.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">{period.name}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                            {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={periodStatusVariant(period.status)}>{period.status}</Badge>
                          </TableCell>
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
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t('organizationHr.compensationProfiles')}</CardTitle>
              </div>
              <CardDescription>{t('organizationHr.compensationProfilesDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('organizationHr.staffId')}</TableHead>
                      <TableHead>{t('organizationHr.baseSalary')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('organizationHr.effectiveFrom')}</TableHead>
                      <TableHead>{t('organizationHr.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                          {t('organizationHr.noCompensationProfiles')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      compList.map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell className="font-mono text-xs">{comp.staffId.slice(0, 8)}...</TableCell>
                          <TableCell className="font-medium">
                            {new Intl.NumberFormat('en-US').format(comp.baseSalary)} {comp.currency}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(comp.effectiveFrom)}</TableCell>
                          <TableCell>
                            <Badge variant={comp.status === 'active' ? 'default' : 'secondary'}>{comp.status}</Badge>
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
      )}
    </div>
  );
}
