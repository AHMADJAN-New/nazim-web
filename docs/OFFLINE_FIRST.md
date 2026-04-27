# Offline-First Desktop (Electron) — Architecture & Usage

The Nazim desktop app keeps teachers productive when WiFi drops mid-class.
This document explains what's built, how it's wired together, and how to
add new offline-capable features without breaking the existing system.

> Scope: this is a desktop-only feature. The browser web app is unchanged
> — every helper checks for the Electron bridge and falls through silently
> when absent.

---

## TL;DR

- **Tier A — full offline write**: attendance create/mark/scan. Queued in
  encrypted SQLite, replayed on reconnect with idempotent `client_uuid`.
- **Tier B — read-only cache**: students, attendance history, fee
  structures/assignments/payments, leave, hostel rooms, hostel overview.
  Pulled from cache when the network call fails.
- **Tier C — online-only**: report exports, bulk imports, leave
  approve/reject. Buttons disabled with a tooltip when offline.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Electron renderer (React)                                           │
│                                                                      │
│   apiClient.attendanceSessionsApi.create(...)                        │
│         │                                                            │
│         ├─► tryNetworkThenQueue() ──► fetch() ─►─►─► (online)        │
│         │              │                                             │
│         │              └─ TypeError ─► window.electron.offline       │
│         │                                .enqueue({client_uuid,...}) │
│         │                                                            │
│   useOfflineCachedQuery(...) — list reads                            │
│         │                                                            │
│         ├─► fetch() ── success ──► cachePut(key,kind,body)           │
│         └─► fetch() ── error   ──► cacheGet(key) ──► render          │
│                                                                      │
│   <OfflineDisabled> — Tier C buttons                                 │
│         └─► useIsOnline() === false ─► forces disabled + tooltip     │
└──────────────────────────────────────────────────────────────────────┘
                              │ contextBridge IPC
┌──────────────────────────────────────────────────────────────────────┐
│  Electron main process                                               │
│                                                                      │
│   ipc.js  ──► queue.js ──► db.js (SQLCipher, per-user)               │
│                                       └──► userData/offline/         │
│                                            nazim_<userId>.db         │
│                                            keys/<userId>.bin (sealed)│
│                                                                      │
│   sync.js — heartbeat /api/me every 30s                              │
│           — drains pending_operations FIFO when online               │
│           — broadcasts offline:status + offline:resolved             │
└──────────────────────────────────────────────────────────────────────┘
                              │ HTTP
┌──────────────────────────────────────────────────────────────────────┐
│  Laravel API                                                         │
│                                                                      │
│   POST /api/attendance-sessions                                      │
│        {client_uuid, ...} → UNIQUE(organization_id, client_uuid)     │
│        Replay-safe: duplicate POST returns existing row, not 409     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Setup

### Prerequisites

- Node.js 18+
- The Laravel backend running and reachable.
- For Linux desktop builds: a configured OS keyring (`gnome-keyring` or
  `kwallet`). Without it `safeStorage` refuses and the offline DB won't
  open.

### Run the migration once

```bash
cd backend
php artisan migrate
```

Adds `client_uuid` + `UNIQUE(organization_id, client_uuid)` to
`attendance_sessions` and `attendance_records`.

### Dev workflow

```bash
# Terminal 1 — backend
cd backend
php artisan serve

# Terminal 2 — frontend (Vite dev server)
cd frontend
npm install
npm run dev

# Terminal 3 — Electron desktop
cd desktop
npm install
NAZIM_APP_URL=http://localhost:5173 npm start
```

In dev, the Electron window loads from the Vite dev server URL. The
offline bridge is still wired up — you can still test queueing/sync
against the local backend.

### Production build (with bundled UI)

```bash
cd desktop
npm install
npm run dist:win   # or `npm run dist` for all platforms
```

This runs `build:renderer` first — which calls `vite build --base=./`
in the frontend and copies `dist/` into `desktop/dist-renderer/` —
then packages everything with electron-builder.

The packaged app loads `dist-renderer/index.html` via `file://` so it
works on the very first cold boot **without internet** (login still
needs the network, but the shell renders immediately).

To override and load a remote URL instead (e.g. for staging):

```bash
NAZIM_APP_URL=https://staging.nazim.cloud /path/to/Nazim
```

---

## How a feature becomes "offline-capable"

There are three patterns. Pick the one that matches your feature.

### Pattern A — full offline write (queued + idempotent replay)

For mutations users actively perform mid-class — currently just
attendance.

#### 1. Backend: accept `client_uuid` and replay idempotently

```php
// In your store controller
$clientUuid = $validated['client_uuid'] ?? null;
if ($clientUuid) {
    $existing = YourModel::where('organization_id', $orgId)
        ->where('client_uuid', $clientUuid)
        ->first();
    if ($existing) return response()->json($existing, 200);
}
// ...regular create flow, threading $clientUuid into the row
```

Plus a migration adding `client_uuid uuid NULL` and
`UNIQUE(organization_id, client_uuid)`. See
`2026_04_26_000001_add_client_uuid_to_attendance_tables.php` for the
canonical pattern.

#### 2. Frontend apiClient: route through `tryNetworkThenQueue`

```ts
import { newClientUuid, tryNetworkThenQueue } from '@/lib/electron-offline';

create: async (data: any) => {
  const clientUuid = data?.client_uuid ?? newClientUuid();
  const payload = { ...data, client_uuid: clientUuid };
  return tryNetworkThenQueue<any>({
    op: {
      client_uuid: clientUuid,
      kind: 'attendance.session.create', // add to KNOWN_KINDS in queue.js
      method: 'POST',
      endpoint: '/your-endpoint',
      payload,
    },
    trackOptimisticId: clientUuid,
    networkAttempt: () => apiClient.post('/your-endpoint', payload),
    optimisticResponse: () => ({
      id: clientUuid, // server's id replaces this on sync
      _offline: true,
      ...payload,
    }),
  });
},
```

Then add the `kind` to `KNOWN_KINDS` in `desktop/src/offline/queue.js`.

#### 3. Optional: react to sync resolution

```ts
useEffect(() => {
  return subscribeResolved((payload) => {
    if (payload.kind !== 'your.kind') return;
    void queryClient.invalidateQueries({ queryKey: ['your-list'] });
  });
}, [queryClient]);
```

### Pattern B — read-only cache (works offline, fresh on reconnect)

For lists and detail pages users want to view offline. Just swap
`useQuery` for `useOfflineCachedQuery`:

```ts
const queryKey = ['your-list', orgId, filters, page];

const { data, isLoading, error, isFromCache, cachedAt } =
  useOfflineCachedQuery<YourType[]>({
    cacheKey: `your.list:${JSON.stringify(queryKey)}`,
    cacheKind: 'your.list',           // coarse label, used by evict
    queryKey,
    queryFn: async () => {/* normal fetch */},
    staleTime: 5 * 60 * 1000,
  });
```

Then at the page level:

```tsx
import { CachedDataBanner } from '@/components/layout/CachedDataBanner';
// ...
<CachedDataBanner isFromCache={!!isFromCache} cachedAt={cachedAt ?? null} />
```

When the user later writes through this module's mutation, evict the
cache so subsequent reads pull fresh:

```ts
import { evictOfflineCache } from '@/lib/electron-offline';
// in the mutation's onSuccess
evictOfflineCache('your.list');
```

### Pattern C — online-only with a tooltip

For server-rendered exports, bulk imports, multi-user approvals, etc.
Wrap the trigger button:

```tsx
import { OfflineDisabled } from '@/components/layout/OfflineDisabled';

<OfflineDisabled reason="This action runs on the server. Reconnect to continue.">
  <Button onClick={onExport} disabled={loading}>Export PDF</Button>
</OfflineDisabled>
```

In the regular browser build (no Electron bridge), `OfflineDisabled` is
a passthrough — you don't need platform branching at the call site.

---

## Storage layout

```
<userData>/offline/
├── nazim_<userId>.db          # per-user SQLCipher database
└── keys/
    └── <userId>.bin           # safeStorage-sealed 32-byte key (0600)
```

- `nazim_<userId>.db` is encrypted by SQLCipher; the key is generated
  once per user and sealed with Electron `safeStorage` (OS keychain on
  macOS / Linux libsecret / Windows DPAPI).
- Switching accounts on the same machine never mixes data — a fresh
  file + key pair is created per `user_id`.
- Permanent removal: call `window.electron.offline.purge(userId)` —
  closes the DB, deletes the file, destroys the sealed key.

### Schema

| Table | Purpose |
|-------|---------|
| `auth_context` | Single row: active user/org/school/token. Wiped on logout. |
| `pending_operations` | FIFO queue of mutations to replay. |
| `roster_snapshot` | Evidence: which students were on screen at session-create time. |
| `sync_issues` | Server-rejected entries surfaced to the user via the issues sheet. |
| `cached_responses` | Tier B read-cache. TTL 7 days. |
| `schema_version` | Future-proof for migrations. |

---

## Sync semantics

### Idempotency

Every queued create stamps a `client_uuid`. Backend uniqueness on
`(organization_id, client_uuid)` makes replays a no-op — duplicates
return the existing row.

### Dependency ordering

Records, scans, and other "child" ops can target a parent session
that's still pending sync. The frontend tracks optimistic ids in
`sessionStorage`; child ops set `depends_on` to the parent's
`client_uuid`. The sync worker uses `:session_id` substitution to
swap in the real server id at replay time.

### Online detection

`navigator.onLine` lies (captive portals at school WiFi). The main
process pings `GET /api/me` every 30 seconds with the user's bearer
token; a successful response is the only thing that flips the online
flag and triggers a queue drain.

### Conflict handling

- **Server returns 4xx** (except 408/429): mark op `failed`, write a
  `sync_issues` row, broadcast status. The user sees a red badge on
  the indicator and can click through to the issues sheet to dismiss
  or investigate.
- **Server returns 5xx / network error**: keep `pending`, back off
  until the next heartbeat. No data lost.

### Roster drift

When a teacher creates an offline attendance session, the
`useCreateAttendanceSession` hook snapshots the student roster they
saw into `roster_snapshot`. If a student transferred between create
time and sync time, the snapshot proves what was on screen — no
silent data loss.

---

## File map

| Layer | File | What it does |
|-------|------|--------------|
| Backend | `backend/database/migrations/2026_04_26_000001_add_client_uuid_to_attendance_tables.php` | Schema for idempotency |
| Backend | `backend/app/Http/Controllers/AttendanceSessionController.php` | `store`, `markRecords`, `scan` honour `client_uuid` |
| Desktop | `desktop/main.js` | Loads bundled UI when packaged, URL otherwise |
| Desktop | `desktop/preload.js` | `window.electron.offline.*` contextBridge surface |
| Desktop | `desktop/src/offline/db.js` | Per-user SQLCipher open + close |
| Desktop | `desktop/src/offline/keystore.js` | safeStorage-sealed 32-byte key |
| Desktop | `desktop/src/offline/schema.js` | Table DDL |
| Desktop | `desktop/src/offline/queue.js` | enqueue / cache CRUD / sync_issues |
| Desktop | `desktop/src/offline/sync.js` | Heartbeat + FIFO drain + `offline:resolved` |
| Desktop | `desktop/src/offline/ipc.js` | IPC handler registration |
| Frontend | `frontend/src/lib/electron-offline.ts` | Bridge wrapper, `tryNetworkThenQueue`, optimistic-id set, `evictOfflineCache` |
| Frontend | `frontend/src/hooks/useOfflineCachedQuery.tsx` | Tier B helper |
| Frontend | `frontend/src/hooks/useOfflineStatus.tsx` | Status hook + `useIsOnline` |
| Frontend | `frontend/src/components/layout/OfflineStatusIndicator.tsx` | Header pill |
| Frontend | `frontend/src/components/layout/CachedDataBanner.tsx` | "Showing cached data" hint |
| Frontend | `frontend/src/components/layout/SyncIssuesSheet.tsx` | Issues review drawer |
| Frontend | `frontend/src/components/layout/OfflineDisabled.tsx` | Tier C button wrapper |
| Frontend | `frontend/src/main.tsx` | Registers SW only in Electron |
| Frontend | `frontend/public/sw.js` | App-shell cache + SPA navigation fallback |

---

## Tests

```bash
cd frontend
npm test -- src/__tests__/electron-offline.test.ts
npm test -- src/__tests__/desktop-bundle.test.ts
```

The `desktop-bundle` test only runs after `npm run build:renderer` has
produced `desktop/dist-renderer/`; otherwise it skips with a note.

---

## Troubleshooting

### "safeStorage encryption is not available"

You're on Linux without a configured keyring. Install and start one:

```bash
sudo apt-get install gnome-keyring
# log out / log back in so the keyring daemon starts
```

We deliberately refuse to fall back to a plaintext database — exposing
school data without encryption isn't an acceptable default.

### Electron app shows "Failed to load application" on first run

1. **Bundled mode**: confirm `desktop/dist-renderer/index.html` exists.
   If not, `cd desktop && npm run build:renderer` and retry.
2. **URL mode**: the `NAZIM_APP_URL` is unreachable. Check the URL,
   network connectivity, and the backend's CORS configuration.

### `better-sqlite3-multiple-ciphers` fails to load

Native modules need to be rebuilt against Electron's Node ABI. The
`postinstall` script handles this automatically; if it fails:

```bash
cd desktop
npx @electron/rebuild -f -w better-sqlite3-multiple-ciphers
```

### Pending ops keep retrying but never succeed

Open the OfflineStatusIndicator pill — if it's red, there are
unresolved sync issues. Click to open the sheet; each entry shows the
server's rejection reason. Common causes:
- Auth token expired → re-login.
- Student/class deleted server-side → mark as resolved manually.
- Validation error from a backend change → fix and re-issue.

### Cached data is stale

The Tier B cache TTL is 7 days. Older entries are vacuumed on
heartbeat start. Force-clear from DevTools:

```ts
await window.electron.offline.cacheEvict()  // omit kind to wipe all
```

Or evict a specific module:

```ts
await window.electron.offline.cacheEvict('students.list')
```

---

## Limitations & explicit non-goals

- **First boot still needs internet for login** — bundled UI loads
  without internet but auth is online-only by design.
- **Tier C is intentional**: reports, bulk imports, financial approvals
  stay online. Replicating server-side rendering or multi-user state
  in SQLite isn't worth the complexity.
- **No CRDTs** — the conflict policy is "server is authoritative".
  Idempotency + per-teacher session model means actual conflicts are
  rare for the in-scope flows.
- **Single-tenant offline DB** — switching organizations isn't
  supported in the same login session; logout first.
- **No background sync after the renderer closes** — closing the
  Electron window stops the heartbeat. Queued ops resume on next
  launch when the same user logs in.
