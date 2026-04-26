import { CloudOff, RefreshCw, Cloud } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { triggerSyncNow, useOfflineStatus } from '@/hooks/useOfflineStatus';

// Renders nothing in the regular web app. In the Electron desktop build,
// shows a compact pill: cloud icon (online/offline) + pending-op count.
// Clicking forces an immediate heartbeat + drain.
export function OfflineStatusIndicator() {
  const status = useOfflineStatus();
  const [busy, setBusy] = useState(false);

  if (!status) return null;

  const pending = status.pending + status.in_flight;
  const hasIssues = status.open_issues > 0;

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await triggerSyncNow();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative h-8 sm:h-9 px-2 sm:px-3"
      onClick={handleClick}
      disabled={busy}
      title={
        status.online
          ? `Online${pending ? ` · ${pending} pending` : ''}${
              status.last_synced_at ? ` · last synced ${formatRelative(status.last_synced_at)}` : ''
            }`
          : `Offline${pending ? ` · ${pending} queued` : ''}`
      }
    >
      {busy ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : status.online ? (
        <Cloud className="h-4 w-4" />
      ) : (
        <CloudOff className="h-4 w-4 text-amber-500" />
      )}
      {pending > 0 && (
        <Badge
          variant={hasIssues ? 'destructive' : 'secondary'}
          className="absolute -top-1 -right-1 h-5 min-w-5 text-xs px-1 flex items-center justify-center"
        >
          {pending > 99 ? '99+' : pending}
        </Badge>
      )}
    </Button>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
