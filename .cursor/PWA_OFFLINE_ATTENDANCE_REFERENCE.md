# PWA & Offline Attendance – Implementation Reference

> Summary of PWA knowledge and offline-attendance design from chat. Use this when implementing PWA re-enable and offline attendance queue/sync.

---

## 1. What is a PWA?

A **Progressive Web App (PWA)** is a web app that uses standard web APIs to:

- Be **installable** (add to home screen / app list, run in standalone window).
- Use a **service worker** for caching and offline behavior.
- Optionally support **push notifications** and **background sync**.

Same URL can behave like a normal site or like an installed app.

---

## 2. Current State in This App

### What Exists

- **`vite-plugin-pwa`** in `package.json` (e.g. `"vite-plugin-pwa": "^0.20.0"`).
- **`frontend/src/lib/pwa.ts`** – full PWA layer:
  - Service worker registration (`/sw.js`).
  - Install prompt (`beforeinstallprompt` / `appinstalled`).
  - SW updates and “new version” handling.
  - Online/offline status, notifications, background sync API, cache clear, share.
  - Hooks: `usePWAInstall`, `usePWAUpdate`, `usePWAOnlineStatus`.
- **`frontend/public/sw.js`** – manual service worker:
  - Caches static assets and GET requests (cache-first / network-first).
  - **Skips all non-GET requests** (POST/PUT never queued).
  - Has a `sync` listener and `doBackgroundSync()` that reads “failed requests” from IndexedDB – but **`getFailedRequests()` returns `[]`** and nothing writes to that store.
- **`frontend/index.html`** – has meta (theme-color, og/twitter), icons referenced (`/icons/icon-512x512.png`).

### What Is Disabled

- **`frontend/src/main.tsx`** (lines 15–35) **unregisters all service workers** (“PWA removed for performance”). So no active SW, no installability, no offline caching at runtime.

### Summary

PWA code exists but is **off**. No offline queue or request persistence anywhere.

---

## 3. Offline Attendance Scenario (Requirements)

- **Desktop**, PWA enabled.
- User wants to take attendance → **internet goes off**.
- **Questions:**
  - Can he still **create the session** and **take attendance**?
  - When internet comes back (after **restart**, **1 hour**, **3 days**, **1 week**) – can he **upload** all taken attendance for those days?

### Current Answers (Without Implementation)

| Question | Answer today |
|----------|--------------|
| Create session when offline? | **No** – direct API call fails. |
| Take attendance when offline? | **No** – direct API call fails. |
| Upload when back online (restart / 1h / 3d / 1w)? | **No** – no queue; nothing to replay. |

### After Implementation (Target)

- **Yes** – create session and take attendance offline (stored in IndexedDB queue).
- **Yes** – when back online (any of those timeframes), replay queue so all records upload. IndexedDB persists across restart and time gaps until user clears site data.

---

## 4. Why It Doesn’t Work Today

1. **Attendance is online-only**
   - `useCreateAttendanceSession` → `attendanceSessionsApi.create(...)` (direct HTTP).
   - `useMarkAttendance` → `attendanceSessionsApi.markRecords(sessionId, { records })` (direct HTTP).
   - No offline branch, no queue.

2. **Service worker does not queue writes**
   - `public/sw.js` fetch handler skips non-GET requests.
   - `getFailedRequests()` returns `[]`; no code writes failed requests to IndexedDB.

3. **No offline data layer**
   - No IndexedDB (or similar) for pending “create session” or “mark records” operations.

---

## 5. What Implementation Will Take

### New Pieces

| Piece | Purpose |
|-------|--------|
| **Offline queue store** | Persist pending ops (create session, mark records) in IndexedDB; survive refresh/restart/days. |
| **Queue API layer** | When a mutation runs: if online → call API; if offline → append to queue. Same surface for UI. |
| **Replay on online** | On app load and on `online`: read queue, replay in order (create session first, then mark records), remove on success. |
| **Optional: Background Sync** | In SW, on `sync` event, trigger same replay. |
| **UI for “pending sync”** | Show pending/syncing state (banner, badge, optional list). |

### Code to Touch

- **Attendance hooks** (`frontend/src/hooks/useAttendance.tsx`): `useCreateAttendanceSession`, `useMarkAttendance` (and optionally update/close). They go through the queue layer when offline.
- **API client or thin wrapper**: Either attendance calls go through an “offline-aware” layer that enqueues on failure/offline, or hooks do the check + queue.
- **App bootstrap** (e.g. `App.tsx` or a provider): Register online listener; run “replay queue” on load and when back online.
- **Service worker** (`frontend/public/sw.js`): If using Background Sync – implement queue read in SW or message app to run replay. Optionally re-enable SW registration in `main.tsx`.
- **Attendance UI** (e.g. `AttendanceMarking.tsx`): Consume “pending”/“syncing” state; support temporary “local session id” for offline-created sessions.

### Design Choices

- **Where to queue**
  - **Option A (recommended):** In the hooks – check `navigator.onLine` / failed request; if offline, write to IndexedDB and return success; replay later. No change to global API client.
  - **Option B:** In API client – intercept failed requests and queue generically. More reusable but trickier (cloning, auth, idempotency).

- **Session identity offline**
  - Offline “create session” has no server `session_id`. Use a **local temporary id** (e.g. UUID). Queue: “create session” (payload + temp id), “mark records” (temp session id + records). On replay: create session → get real id → replace temp id in mark-records and send.

- **Conflicts**
  - Same class/date created offline and online elsewhere → possible duplicate. First version: replay in order; if server rejects, show error. Later: optional conflict handling (e.g. by class+date).

---

## 6. Effect on App State and Logic

### State

- **New:** “Pending sync” queue (and optionally “is syncing”). Keep in a small store/context or derive from IndexedDB + replay events. React Query stays as-is; after replay, invalidate relevant keys (e.g. `['attendance-sessions']`, `['attendance-session', id]`).
- **Existing:** Unchanged. Replay uses same auth/context; no new “offline user” concept.

### Logic Flow

- **Today:** Create session → API → success/error. Mark attendance → API → success/error.
- **With offline:** If online → same as today. If offline → write to IndexedDB (create session with temp id, or mark records with temp session id), return success to UI, show “will sync when online.” On load / `online`: replay (create sessions first, then mark records, temp id → real id), remove from queue, invalidate queries.

### Edge Cases

- Replay order: create session before mark records; resolve temp session id to real id.
- Replay only when user is logged in; use same token as normal API.
- If “create session” fails (e.g. 409 already exists): get real `session_id` from response or a “get by class/date” call; replay only mark records for that session.
- Partial failure: leave failed item in queue; retry on next online or next load; optional “failed” state for manual retry.

---

## 7. Rough Time Estimate

| Area | Effort |
|------|--------|
| IndexedDB queue store (open DB, add/get/remove, temp id) | 0.5–1 day |
| Queue layer in attendance hooks (create + mark, offline branch, temp id) | 1–1.5 days |
| Replay (on load + online, order, temp→real id, invalidate) | 1–2 days |
| UI (pending/syncing indicator, optional list) | 0.5–1 day |
| Service worker (re-enable, optional Background Sync) | 0.5 day |
| Testing (offline create + mark, restart, 1h/3d, conflicts) | 1–2 days |

**Total: ~5–8 working days** for one developer.

---

## 8. Key File References

| Purpose | Path |
|---------|------|
| PWA manager & hooks | `frontend/src/lib/pwa.ts` |
| SW unregister (remove to re-enable PWA) | `frontend/src/main.tsx` (lines 15–35) |
| Service worker | `frontend/public/sw.js` |
| Attendance hooks (create, mark, update, close) | `frontend/src/hooks/useAttendance.tsx` |
| Attendance marking UI | `frontend/src/pages/AttendanceMarking.tsx` |
| SW sync / getFailedRequests (stub) | `frontend/public/sw.js` (~354–380, 473–476) |

---

## 9. PWA Re-enable (Without Offline Queue)

If you only want to re-enable PWA (install + cached shell) first:

1. Remove or comment out the service worker unregister block in `frontend/src/main.tsx`.
2. Call `initializePWA()` from `pwa.ts` after app mount (e.g. in `App.tsx` or root layout).
3. Ensure `public/sw.js` and `manifest.json` (or equivalent) and icons exist and are correct.

Offline attendance queue is a separate layer on top of this.
