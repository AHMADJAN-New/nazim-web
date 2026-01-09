import { Bell, CheckCircle, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";
import { useNotificationHandler } from "@/hooks/useNotificationHandler";
import { useNotifications, useNotificationActions, useNotificationCount } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";

const LEVEL_COPY: Record<string, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

const levelVariant = (level: string | undefined) => {
  if (level === 'critical') return 'destructive';
  if (level === 'warning') return 'secondary';
  return 'outline';
};

const PER_PAGE = 20;

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useNotifications({ limit: PER_PAGE, page });
  const { data: unreadCount } = useNotificationCount();
  const { markRead, markAllRead } = useNotificationActions();
  const { handleNotification, StudentDialog } = useNotificationHandler();

  const notifications = data?.notifications ?? [];
  const totalPages = data?.meta?.last_page ?? 1;

  const unread = useMemo(() => notifications.filter((n) => !n.read_at).length, [notifications]);

  const handleMarkRead = (notification: NotificationItem) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    await handleNotification(notification);
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    // If notification has entity info, use handler; otherwise fallback to URL
    if (hasEntityInfo(notification)) {
      await handleOpenNotification(notification);
    } else if (notification.url) {
      // Fallback: navigate to URL if no entity info
      if (!notification.read_at) {
        markRead.mutate(notification.id);
      }
      window.location.href = notification.url;
    }
  };

  const hasEntityInfo = (notification: NotificationItem): boolean => {
    return !!(notification.event?.entity_type && notification.event?.entity_id);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h1 className="text-2xl font-semibold">Notifications</h1>
            {unread > 0 && (
              <Badge variant="destructive">{unread} new</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Stay on top of admissions, finance, attendance, and system events.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={unread === 0 || markAllRead.isPending}
          >
            {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Mark all as read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Inbox</CardTitle>
            <CardDescription>
              {unreadCount?.count ?? 0} unread • Polling every 30 seconds
            </CardDescription>
          </div>
          {isFetching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : (
            <>
              {notifications.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No notifications yet.
                </div>
              )}

              {notifications.map((notification, index) => (
                <div key={notification.id} className="space-y-2">
                  <div 
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        <Badge variant={levelVariant(notification.level)} className="text-[11px]">
                          {LEVEL_COPY[notification.level ?? 'info'] ?? notification.level}
                        </Badge>
                        {!notification.read_at && (
                          <Badge variant="secondary" className="text-[11px]">
                            {t('events.unread') ?? 'Unread'}
                          </Badge>
                        )}
                      </div>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground max-w-3xl">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(notification.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!notification.read_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkRead(notification)}
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </Button>
                      )}
                      {hasEntityInfo(notification) ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenNotification(notification)}
                        >
                          View
                        </Button>
                      ) : notification.url ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notification.read_at) {
                              markRead.mutate(notification.id);
                            }
                            window.location.href = notification.url!;
                          }}
                        >
                          Open
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {index < notifications.length - 1 && <Separator />}
                </div>
              ))}

              {totalPages > 1 && (
                <Pagination className="pt-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.max(1, page - 1));
                        }}
                        href="#"
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <PaginationItem key={idx}>
                        <PaginationLink
                          href="#"
                          isActive={page === idx + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(idx + 1);
                          }}
                        >
                          {idx + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(Math.min(totalPages, page + 1));
                        }}
                        href="#"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {StudentDialog}
    </div>
  );
}
