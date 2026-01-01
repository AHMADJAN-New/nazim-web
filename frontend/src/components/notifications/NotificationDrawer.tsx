import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Inbox, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNotifications, useNotificationActions } from "@/hooks/useNotifications";
import { formatDateTime } from "@/lib/utils";
import type { NotificationItem } from "@/types/notification";

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const levelVariant = (level: string | undefined) => {
  if (level === 'critical') return 'destructive';
  if (level === 'warning') return 'secondary';
  return 'outline';
};

export function NotificationDrawer({ open, onOpenChange }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const { data, isFetching } = useNotifications({ limit: 10, page: 1, enabled: open });
  const { markRead, markAllRead } = useNotificationActions();

  const notifications = data?.notifications ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const handleOpenNotification = (notification: NotificationItem) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }
    if (notification.url) {
      navigate(notification.url);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <SheetDescription>Latest activity across your organization.</SheetDescription>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              {markAllRead.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCheck className="h-4 w-4 mr-2" />}
              Mark all read
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate('/notifications')}>
              Open inbox
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {isFetching && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </div>
            )}

            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                <Inbox className="h-10 w-10 mb-3" />
                <p className="text-sm">No notifications yet.</p>
              </div>
            )}

            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`rounded-lg border ${notification.read_at ? 'bg-background' : 'bg-muted'} p-3 transition hover:border-primary/40`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium leading-tight">{notification.title}</p>
                      <Badge variant={levelVariant(notification.level)} className="text-[11px]">
                        {notification.level || 'info'}
                      </Badge>
                      {!notification.read_at && (
                        <Badge variant="secondary" className="text-[11px]">New</Badge>
                      )}
                    </div>
                    {notification.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenNotification(notification)}
                  >
                    View
                  </Button>
                </div>
                {index < notifications.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
