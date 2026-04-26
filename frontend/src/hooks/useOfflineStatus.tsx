import { useEffect, useState } from 'react';

import { getOfflineBridge, type OfflineStatus } from '@/lib/electron-offline';

// Subscribes to the Electron offline bridge for live status updates.
// Returns null when running in a regular browser tab — callers should
// render nothing (or a fallback) in that case.
export function useOfflineStatus(): OfflineStatus | null {
  const [status, setStatus] = useState<OfflineStatus | null>(null);

  useEffect(() => {
    const bridge = getOfflineBridge();
    if (!bridge) return undefined;

    let cancelled = false;

    // Prime with the current snapshot so the indicator doesn't flash
    // empty on first render.
    bridge.status().then((snap) => {
      if (!cancelled) setStatus(snap);
    }).catch(() => {
      // Bridge may not be ready (no auth context yet). Live updates will
      // fill this in once the user logs in and the heartbeat fires.
    });

    const unsubscribe = bridge.onStatus((snap) => {
      if (!cancelled) setStatus(snap);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return status;
}

export async function triggerSyncNow(): Promise<OfflineStatus | null> {
  const bridge = getOfflineBridge();
  if (!bridge) return null;
  return bridge.syncNow();
}
