import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { ReportExportButtons } from "@/components/reports/ReportExportButtons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/hooks/useLanguage";
import { dmsApi } from "@/lib/api/client";

export default function DmsReports() {
  const { t } = useLanguage();
  const { data } = useQuery({ queryKey: ["dms", "distribution"], queryFn: dmsApi.distribution, staleTime: 120_000 });

  // Prepare data for export - Incoming by Department
  const incomingByDeptData = useMemo(() => {
    if (!data?.incoming_by_department) return [];
    return data.incoming_by_department.map((row: any) => ({
      department: row.routing_department_id || t('dms.reportsPage.unassigned'),
      total: row.total,
    }));
  }, [data, t]);

  // Prepare data for export - Security Breakdown
  const securityBreakdownData = useMemo(() => {
    if (!data?.security_breakdown) return [];
    return data.security_breakdown.map((row: any) => ({
      security_level: row.security_level_key || t('dms.reportsPage.none'),
      count: row.total,
    }));
  }, [data, t]);

  // Prepare data for export - Pending Aging
  const pendingAgingData = useMemo(() => {
    if (!data?.pending_aging) return [];
    return data.pending_aging.map((row: any) => ({
      status: row.status || t('dms.reportsPage.notAvailable'),
      average_days: Number(row.average_days).toFixed(1),
    }));
  }, [data, t]);

  // Build filters summary
  const buildFiltersSummary = () => {
    return t('dms.reportsPage.filterSummary');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dms.reportsPage.incomingByDepartment')}</CardTitle>
            <ReportExportButtons
              data={incomingByDeptData}
              columns={[
                { key: 'department', label: t('dms.reportsPage.department') },
                { key: 'total', label: t('dms.reportsPage.total') },
              ]}
              reportKey="dms_incoming_by_department"
              title={t('dms.reportsPage.incomingByDepartment')}
              transformData={(data) => data}
              buildFiltersSummary={buildFiltersSummary}
              templateType="dms"
              disabled={incomingByDeptData.length === 0}
              errorNoData={t('events.noDataToExport') || 'No data to export'}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dms.reportsPage.department')}</TableHead>
                <TableHead className="text-right">{t('dms.reportsPage.total')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.incoming_by_department?.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.routing_department_id || t('dms.reportsPage.unassigned')}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dms.reportsPage.securityDistribution')}</CardTitle>
            <ReportExportButtons
              data={securityBreakdownData}
              columns={[
                { key: 'security_level', label: t('dms.reportsPage.level') },
                { key: 'count', label: t('dms.reportsPage.count') },
              ]}
              reportKey="dms_security_distribution"
              title={t('dms.reportsPage.securityDistribution')}
              transformData={(data) => data}
              buildFiltersSummary={buildFiltersSummary}
              templateType="dms"
              disabled={securityBreakdownData.length === 0}
              errorNoData={t('events.noDataToExport') || 'No data to export'}
              buttonSize="icon"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dms.reportsPage.level')}</TableHead>
                <TableHead className="text-right">{t('dms.reportsPage.count')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.security_breakdown?.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.security_level_key || t('dms.reportsPage.none')}</TableCell>
                  <TableCell className="text-right">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dms.reportsPage.pendingAging')}</CardTitle>
            <ReportExportButtons
              data={pendingAgingData}
              columns={[
                { key: 'status', label: t('dms.reportsPage.status') },
                { key: 'average_days', label: t('dms.reportsPage.avgDays') },
              ]}
              reportKey="dms_pending_aging"
              title={t('dms.reportsPage.pendingAging')}
              transformData={(data) => data}
              buildFiltersSummary={buildFiltersSummary}
              templateType="dms"
              disabled={pendingAgingData.length === 0}
              errorNoData={t('events.noDataToExport') || 'No data to export'}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dms.reportsPage.status')}</TableHead>
                <TableHead className="text-right">{t('dms.reportsPage.avgDays')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.pending_aging?.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{Number(row.average_days).toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
