import { Database } from 'lucide-react';

// Discreet hint that the data on screen came from the offline cache
// rather than a fresh server response. The Tier B helper sets
// `isFromCache` on its return value when the network call failed and
// the body was reloaded from SQLite; pass it straight through here.
type Props = {
  isFromCache: boolean;
  cachedAt: string | null;
  className?: string;
};

export function CachedDataBanner({ isFromCache, cachedAt, className }: Props) {
  if (!isFromCache) return null;

  return (
    <div
      className={
        'flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 ' +
        'dark:border-amber-900 dark:bg-amber-950 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 ' +
        (className ?? '')
      }
      role="status"
    >
      <Database className="h-3.5 w-3.5 flex-shrink-0" />
      <span>
        Showing cached data
        {cachedAt ? <> &middot; saved {formatRelative(cachedAt)}</> : null}
        . Reconnect to refresh.
      </span>
    </div>
  );
}

function formatRelative(iso: string): string {
  // The desktop layer stores `cached_at` as `YYYY-MM-DD HH:MM:SS` in UTC
  // (SQLite datetime('now')). Treat as UTC by appending 'Z'.
  const t = Date.parse(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  if (!Number.isFinite(t)) return iso;
  const seconds = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
