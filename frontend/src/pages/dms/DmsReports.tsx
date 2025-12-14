import { useQuery } from "@tanstack/react-query";
import { dmsApi } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DmsReports() {
  const { data } = useQuery({ queryKey: ["dms", "distribution"], queryFn: dmsApi.distribution, staleTime: 120_000 });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Incoming by department</CardTitle>
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
          <CardTitle>Security distribution</CardTitle>
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
          <CardTitle>Pending aging</CardTitle>
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
  );
}
