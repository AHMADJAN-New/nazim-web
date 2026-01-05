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
      department: row.routing_department_id || "Unassigned",
      total: row.total,
    }));
  }, [data]);

  // Prepare data for export - Security Breakdown
  const securityBreakdownData = useMemo(() => {
    if (!data?.security_breakdown) return [];
    return data.security_breakdown.map((row: any) => ({
      security_level: row.security_level_key || "None",
      count: row.total,
    }));
  }, [data]);

  // Prepare data for export - Pending Aging
  const pendingAgingData = useMemo(() => {
    if (!data?.pending_aging) return [];
    return data.pending_aging.map((row: any) => ({
      status: row.status || "N/A",
      average_days: Number(row.average_days).toFixed(1),
    }));
  }, [data]);

  // Build filters summary
  const buildFiltersSummary = () => {
    return "DMS Distribution Report";
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Incoming by department</CardTitle>
            <ReportExportButtons
              data={incomingByDeptData}
              columns={[
                { key: 'department', label: 'Department' },
                { key: 'total', label: 'Total' },
              ]}
              reportKey="dms_incoming_by_department"
              title="DMS Incoming Documents by Department"
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
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.incoming_by_department?.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.routing_department_id || "Unassigned"}</TableCell>
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
            <CardTitle>Security distribution</CardTitle>
            <ReportExportButtons
              data={securityBreakdownData}
              columns={[
                { key: 'security_level', label: 'Security Level' },
                { key: 'count', label: 'Count' },
              ]}
              reportKey="dms_security_distribution"
              title="DMS Security Level Distribution"
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
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.security_breakdown?.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>{row.security_level_key || "None"}</TableCell>
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
            <CardTitle>Pending aging</CardTitle>
            <ReportExportButtons
              data={pendingAgingData}
              columns={[
                { key: 'status', label: 'Status' },
                { key: 'average_days', label: 'Average Days' },
              ]}
              reportKey="dms_pending_aging"
              title="DMS Pending Documents Aging"
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
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Avg days</TableHead>
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
