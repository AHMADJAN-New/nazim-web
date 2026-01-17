import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowUpRight, Inbox, Send, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { dmsApi } from "@/lib/api/client";
import { useLanguage } from "@/hooks/useLanguage";
import type { DmsDashboardStats } from "@/types/dms";

export default function DmsDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
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

      {/* Main Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Incoming This Week */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.incomingThisWeek") || "Incoming this week"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-blue-600 break-words">
              {stats?.incoming.week ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              <Badge variant="secondary" className="text-xs">{t("dms.dashboard.week") || "Week"}</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
              onClick={() => navigate('/dms/incoming')}
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="text-left">{t("dms.viewIncoming") || "View Incoming"}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Incoming This Month */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.incomingThisMonth") || "Incoming this month"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
              <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-green-600 break-words">
              {stats?.incoming.month ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              <Badge variant="secondary" className="text-xs">{t("dms.dashboard.month") || "Month"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Outgoing This Week */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.outgoingThisWeek") || "Outgoing this week"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-purple-600 break-words">
              {stats?.outgoing.week ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              <Badge variant="secondary" className="text-xs">{t("dms.dashboard.week") || "Week"}</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-3 pb-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
              onClick={() => navigate('/dms/outgoing')}
            >
              <ArrowUpRight className="h-4 w-4 mr-1.5 flex-shrink-0" />
              <span className="text-left">{t("dms.viewOutgoing") || "View Outgoing"}</span>
            </Button>
          </CardFooter>
        </Card>

        {/* Outgoing This Month */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.outgoingThisMonth") || "Outgoing this month"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-amber-600 break-words">
              {stats?.outgoing.month ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              <Badge variant="secondary" className="text-xs">{t("dms.dashboard.month") || "Month"}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Pending Routed Documents */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.pendingRoutedDocuments") || "Pending routed documents"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-orange-600 break-words">
              {stats?.pending_routed ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t("dms.dashboard.awaitingAction") || "awaiting action"}
            </div>
          </CardContent>
        </Card>

        {/* Confidential & Higher */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-8 -mt-8 pointer-events-none opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground break-words flex-1 min-w-0">
              {t("dms.dashboard.confidentialAndHigher") || "Confidential & higher"}
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 flex-shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="text-2xl sm:text-3xl font-bold mb-2 text-red-600 break-words">
              {stats?.confidential_plus ?? 0}
            </div>
            <div className="text-xs text-muted-foreground mb-2 break-words">
              {t("dms.dashboard.highSecurity") || "high security documents"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-sm text-muted-foreground">{t("dms.dashboard.manageHint") || "Use the tabs on the sidebar to manage incoming, outgoing, templates, and reports."}</p>
    </div>
  );
}
