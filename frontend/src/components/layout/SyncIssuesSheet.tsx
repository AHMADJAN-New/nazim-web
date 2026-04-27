import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getOfflineBridge } from '@/lib/electron-offline';

type Issue = {
  id: number;
  client_uuid: string;
  kind: string;
  reason: string;
  details_json: string | null;
  created_at: string;
  resolved_at: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Surfaces the unresolved entries from desktop's sync_issues table — the
// ones the server rejected with a 4xx during replay (transferred student,
// closed session, validation error, etc). The user reviews and dismisses
// them here so they're not silently lost.
export function SyncIssuesSheet({ open, onOpenChange }: Props) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  const bridge = getOfflineBridge();

  useEffect(() => {
    if (!open || !bridge) return;
    let cancelled = false;
    setLoading(true);
    bridge.listIssues()
      .then((rows) => { if (!cancelled) setIssues(rows); })
      .catch(() => { if (!cancelled) setIssues([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, bridge]);

  const handleResolve = async (id: number) => {
    if (!bridge) return;
    await bridge.resolveIssue(id);
    setIssues((prev) => prev.filter((i) => i.id !== id));
  };

  const refresh = async () => {
    if (!bridge) return;
    setLoading(true);
    try {
      const rows = await bridge.listIssues();
      setIssues(rows);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Sync issues
          </SheetTitle>
          <SheetDescription>
            Operations the server rejected during replay. Review and dismiss
            once you&rsquo;ve handled them online.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading && issues.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : issues.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No open sync issues. Everything queued has either synced or is
            still waiting for the network.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {issues.map((issue) => {
              const details = parseDetails(issue.details_json);
              return (
                <li
                  key={issue.id}
                  className="rounded-md border border-border bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {humanKind(issue.kind)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {humanReason(issue.reason)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResolve(issue.id)}
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {details?.error && (
                    <p className="mt-2 text-xs text-destructive">
                      {String(details.error)}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {new Date(issue.created_at).toLocaleString()} ·{' '}
                    <span className="font-mono">{issue.client_uuid.slice(0, 8)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

function parseDetails(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return null; }
}

function humanKind(kind: string): string {
  switch (kind) {
    case 'attendance.session.create': return 'Attendance session create';
    case 'attendance.records.mark': return 'Attendance records';
    case 'attendance.scan': return 'Attendance scan';
    default: return kind;
  }
}

function humanReason(reason: string): string {
  if (reason.startsWith('server_rejected_')) {
    const code = reason.slice('server_rejected_'.length);
    return `Server rejected (${code})`;
  }
  return reason;
}
