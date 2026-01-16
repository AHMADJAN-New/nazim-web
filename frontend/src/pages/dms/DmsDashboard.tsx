import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dmsApi } from "@/lib/api/client";
import { useLanguage } from "@/hooks/useLanguage";
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
  const { t } = useLanguage();
  const { data: stats } = useQuery<DmsDashboardStats>({
    queryKey: ["dms", "dashboard"],
    queryFn: dmsApi.dashboard,
    staleTime: 60_000,
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t("dms.dashboard.title") || "Document System Dashboard"}
        description={t("dms.dashboard.description") || "Quick glance across incoming, outgoing, and pending routed documents."}
        icon={<FileText className="h-5 w-5" />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t("dms.dashboard.incomingThisWeek") || "Incoming this week"} 
          value={stats?.incoming.week ?? 0} 
          description={t("dms.dashboard.week") || "Week"} 
        />
        <StatCard 
          title={t("dms.dashboard.incomingThisMonth") || "Incoming this month"} 
          value={stats?.incoming.month ?? 0} 
          description={t("dms.dashboard.month") || "Month"} 
        />
        <StatCard 
          title={t("dms.dashboard.outgoingThisWeek") || "Outgoing this week"} 
          value={stats?.outgoing.week ?? 0} 
          description={t("dms.dashboard.week") || "Week"} 
        />
        <StatCard 
          title={t("dms.dashboard.outgoingThisMonth") || "Outgoing this month"} 
          value={stats?.outgoing.month ?? 0} 
          description={t("dms.dashboard.month") || "Month"} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dms.dashboard.pendingRoutedDocuments") || "Pending routed documents"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{stats?.pending_routed ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dms.dashboard.confidentialAndHigher") || "Confidential & higher"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold">{stats?.confidential_plus ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-sm text-muted-foreground">{t("dms.dashboard.manageHint") || "Use the tabs on the sidebar to manage incoming, outgoing, templates, and reports."}</p>
    </div>
  );
}
