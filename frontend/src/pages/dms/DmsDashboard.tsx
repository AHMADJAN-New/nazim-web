import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { dmsApi } from "@/lib/api/client";
import type { DmsDashboardStats } from "@/types/dms";

const StatCard = ({ title, value, description }: { title: string; value: number; description?: string }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between text-base font-medium">
        <span>{title}</span>
        <Badge variant="secondary">{description}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl font-semibold">{value}</p>
    </CardContent>
  </Card>
);

export default function DmsDashboard() {
  const { data: stats } = useQuery<DmsDashboardStats>({
    queryKey: ["dms", "dashboard"],
    queryFn: dmsApi.dashboard,
    staleTime: 60_000,
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document System Dashboard</h1>
          <p className="text-muted-foreground mt-1">Quick glance across incoming, outgoing, and pending routed documents.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Incoming this week" value={stats?.incoming.week ?? 0} description="Week" />
        <StatCard title="Incoming this month" value={stats?.incoming.month ?? 0} description="Month" />
        <StatCard title="Outgoing this week" value={stats?.outgoing.week ?? 0} description="Week" />
        <StatCard title="Outgoing this month" value={stats?.outgoing.month ?? 0} description="Month" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pending routed documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{stats?.pending_routed ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidential & higher</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{stats?.confidential_plus ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-sm text-muted-foreground">Use the tabs on the sidebar to manage incoming, outgoing, templates, and reports.</p>
    </div>
  );
}
