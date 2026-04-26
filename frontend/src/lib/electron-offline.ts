// Thin typed wrapper around the Electron offline bridge exposed by
// desktop/preload.js. Returns null when the page is running in a regular
// browser tab — every call site must tolerate the bridge being absent so
// that the same code keeps working in the web app.

export type OfflineKind =
  | 'attendance.session.create'
  | 'attendance.records.mark'
  | 'attendance.scan';

export type OfflineOp = {
  client_uuid: string;
  kind: OfflineKind;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string; // path only, e.g. "/attendance-sessions" or "/attendance-sessions/:session_id/records"
  payload: Record<string, unknown>;
  depends_on?: string;
};

export type OfflineStatus = {
  online: boolean;
  pending: number;
  in_flight: number;
  synced: number;
  failed: number;
  open_issues: number;
  last_synced_at: string | null;
};

type OfflineBridge = {
  login(payload: {
    userId: string;
    organizationId: string;
    schoolId?: string | null;
    apiToken: string;
    apiBaseUrl: string;
  }): Promise<{ ok: true }>;
  logout(): Promise<{ ok: true }>;
  enqueue(op: OfflineOp): Promise<{ inserted: boolean; client_uuid: string }>;
  status(): Promise<OfflineStatus>;
  syncNow(): Promise<OfflineStatus>;
  snapshotRoster(
    sessionClientUuid: string,
    students: Array<{ id: string; full_name?: string | null; admission_no?: string | null }>,
  ): Promise<{ ok: true; count: number }>;
  listIssues(): Promise<Array<{
    id: number;
    client_uuid: string;
    kind: string;
    reason: string;
    details_json: string | null;
    created_at: string;
    resolved_at: string | null;
  }>>;
  resolveIssue(id: number): Promise<{ ok: true }>;
  onStatus(handler: (snapshot: OfflineStatus) => void): () => void;
};

declare global {
  interface Window {
    electron?: {
      retryLoad?: () => Promise<unknown>;
      offline?: OfflineBridge;
    };
  }
}

export function getOfflineBridge(): OfflineBridge | null {
  if (typeof window === 'undefined') return null;
  return window.electron?.offline ?? null;
}

export function isElectron(): boolean {
  return getOfflineBridge() !== null;
}

// RFC 4122 v4 generator. We can't depend on `crypto.randomUUID()` everywhere
// (older Electron renderers, some embedded webviews), so we fall back to
// `crypto.getRandomValues` if available.
export function newClientUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// Tracks ids that were issued optimistically in this session — we need
// this to thread depends_on for child ops (records, scans) that target
// a session not yet synced. Persisted in sessionStorage so a tab reload
// during a flaky-network class doesn't lose the relationship.
const OPTIMISTIC_IDS_KEY = 'nazim:optimistic-ids:v1';
const optimisticIds: Set<string> = (() => {
  if (typeof sessionStorage === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(OPTIMISTIC_IDS_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
})();

function persistOptimisticIds(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(OPTIMISTIC_IDS_KEY, JSON.stringify([...optimisticIds]));
  } catch {
    // sessionStorage may be unavailable (private mode); not fatal.
  }
}

export function markOptimisticId(id: string): void {
  optimisticIds.add(id);
  persistOptimisticIds();
}

export function isOptimisticId(id: string): boolean {
  return optimisticIds.has(id);
}

export function forgetOptimisticId(id: string): void {
  if (optimisticIds.delete(id)) persistOptimisticIds();
}

// Try the network first; if it fails for a reason that looks like
// "offline" (TypeError from fetch, or a 5xx the caller maps to retryable),
// queue the op via the bridge and return a synthetic optimistic response.
//
// The caller supplies the network attempt and the optimistic-response
// builder. The optimistic response shape must mirror what the server would
// return so downstream mappers and TanStack Query updates don't break.
export async function tryNetworkThenQueue<TResponse>(args: {
  op: OfflineOp;
  networkAttempt: () => Promise<TResponse>;
  optimisticResponse: () => TResponse;
  // When provided, the id is added to the optimistic set on fallback so
  // subsequent child ops know to thread depends_on.
  trackOptimisticId?: string;
}): Promise<TResponse> {
  const bridge = getOfflineBridge();

  // No bridge => regular web app. Just hit the network and let the caller
  // handle errors normally.
  if (!bridge) {
    return args.networkAttempt();
  }

  try {
    return await args.networkAttempt();
  } catch (err) {
    if (!isLikelyNetworkError(err)) {
      throw err;
    }
    await bridge.enqueue(args.op);
    if (args.trackOptimisticId) {
      markOptimisticId(args.trackOptimisticId);
    }
    return args.optimisticResponse();
  }
}

function isLikelyNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // fetch() throws TypeError on offline
  const message = (err as { message?: string })?.message ?? '';
  if (/network|fetch|failed to fetch|offline/i.test(message)) return true;
  // 5xx surfaced through our ApiError shape would have status >= 500
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number' && status >= 500) return true;
  return false;
}
