# Offline Support Plan – SQLite + Sync for Nazim Desktop

This document describes how to add offline support to the Nazim Electron desktop app using a local SQLite database. Only the logged-in user’s data is cached; the full API is not exposed offline.

---

## Goals

- **Online**: App continues to use the Laravel API; SQLite acts as a local cache of the current user’s data.
- **Offline**: App reads and writes from SQLite so the user can keep working without internet.
- **Scope**: Cache only a defined subset of data (user profile, org/school context, and selected entities). The API remains the source of truth; SQLite is a user-scoped, limited mirror.

---

## Architecture (high level)

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron app (desktop)                                          │
│  ┌─────────────┐    online      ┌──────────────┐                 │
│  │  React UI   │ ◄───────────►  │  Laravel API │  (source of     │
│  │  (webview)  │                │  (backend)   │   truth)       │
│  └──────┬──────┘                └──────────────┘                 │
│         │                                                          │
│         │ read/write (offline + cache)                             │
│         ▼                                                          │
│  ┌─────────────┐                                                  │
│  │  Sync layer │  Sync when online; serve from DB when offline   │
│  │  (main)     │                                                  │
│  └──────┬──────┘                                                  │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────┐                                                  │
│  │  SQLite DB  │  Data for current user only (org/school scoped) │
│  │  (local)    │                                                  │
│  └─────────────┘                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- **Sync layer**: Implemented in the Electron main process (Node), using SQLite and an HTTP client to talk to the API.
- **SQLite**: One database per user (or one DB with `user_id` / `organization_id` on all tables). Holds only the entities and fields chosen for offline.
- **UI**: When online, can still call the API; when offline (or in “use cache” mode), it calls the sync layer via IPC, which reads/writes SQLite.

---

## What to store in SQLite (user data only)

Define a fixed subset of “offline-capable” data. Example:

| Category | Examples | Purpose |
|----------|----------|---------|
| User / profile | Current user, org_id, school_id, permissions | Know who is “logged in” and what they can do offline |
| Reference | Classes, subjects, academic years, terms | Lookups for forms and lists |
| Entity lists | Students, staff, courses (ids + key fields) | Offline list views and selection |
| Transactional | Attendance, grades, form drafts | Data the user creates/edits offline |

Do **not** cache:

- Full API surface.
- Other users’ or other orgs’ data (enforce by `organization_id` / `school_id` in sync and schema).

---

## Sync model

- **When online**
  - After login (or on a timer): **pull** from API into SQLite (profile, org/school, and chosen entities).
  - Optionally **push** local changes (e.g. attendance entered offline) when back online.
- **When offline**
  - All reads/writes for those entities go to SQLite only (no API).
- **Conflicts**
  - Define rules (e.g. server-wins, or last-write-wins with timestamps). For simple flows (e.g. “offline attendance → push when online”) append or overwrite by ID.

---

## Where SQLite and sync run

- **SQLite** and **sync logic**: Electron **main process** (or a dedicated Node worker). Use e.g. `better-sqlite3` or `sql.js` from Node.
- **Bridge**: Main exposes a small API to the renderer via **preload** + `contextBridge`, e.g.:
  - `getOfflineData(kind, query)` – read from SQLite.
  - `setOfflineData(kind, payload)` – write to SQLite (and optionally queue for push).
  - `syncNow()` / `getSyncStatus()` – trigger sync or report online/offline and last sync.
- **Detection**: Main or renderer detects online/offline (e.g. `navigator.onLine`, or polling the API). When offline, the UI uses the bridge (SQLite-backed) instead of calling the Laravel API.

---

## Security

- **SQLite file**: Under Electron’s user data directory. Treat as sensitive (user data).
- **At rest**: Encrypt the DB (e.g. SQLCipher) or encrypt the file with a key derived from the user session.
- **Tokens**: Do not store API tokens in SQLite in plain text. Use Electron `safeStorage` or system keychain for refresh/access tokens if sync must run after restart while “offline”.

---

## Implementation checklist

### 1. Dependencies and DB location

- [ ] Add `better-sqlite3` (or `sql.js`) in `desktop/package.json`.
- [ ] Decide DB path: e.g. `app.getPath('userData')/nazim_offline.db` or per-user `nazim_offline_<userId>.db`.
- [ ] Optional: add SQLCipher or file-level encryption for the DB.

### 2. Schema (main process)

- [ ] Define tables for: user/profile, org/school, and the chosen entities (e.g. `students`, `classes`, `attendance`, `sync_meta`).
- [ ] Add `user_id` / `organization_id` / `school_id` where needed so data is strictly user-scoped.
- [ ] Add a `pending_changes` (or similar) table for offline creates/updates/deletes to push when back online.

### 3. Sync service (main process)

- [ ] Implement **pull**: fetch from Laravel API (using stored token or session) and write into SQLite.
- [ ] Implement **push**: read from `pending_changes`, call API, then clear or mark as synced.
- [ ] Trigger pull after login and optionally on an interval; trigger push when coming back online.
- [ ] Handle errors (e.g. 401, 403, 409) and basic conflict resolution.

### 4. IPC and preload

- [ ] In `main.js`: register `ipcMain.handle` for e.g. `offline-get`, `offline-set`, `offline-sync`, `offline-status`.
- [ ] In `preload.js`: expose `window.electron.offline.get()`, `.set()`, `.sync()`, `.getStatus()` via `contextBridge`.

### 5. Frontend (web app)

- [ ] Detect offline (e.g. `navigator.onLine` or a “last successful API call” heuristic).
- [ ] When offline: use `window.electron.offline.*` instead of `fetch(API_URL/...)` for the cached entities.
- [ ] When online: use existing API; optionally trigger a sync so SQLite is up to date for the next offline.
- [ ] UI: show “Offline” indicator and optionally “Sync when online” / “Last synced at …”.

### 6. Testing

- [ ] Test: go offline, read/write from SQLite, then go online and verify push and pull.
- [ ] Test: multi-tab or multi-window behaviour if applicable.
- [ ] Test: schema migration when adding new offline entities later.

---

## File structure (suggested)

```
desktop/
├── main.js              # existing; add IPC handlers and sync trigger
├── preload.js           # existing; add offline API to contextBridge
├── plan.md              # this file
├── src/
│   └── offline/         # optional: keep main.js small
│       ├── db.js        # SQLite open, schema, migrations
│       ├── sync.js      # pull/push logic
│       └── schema.sql   # or inline in db.js
└── package.json         # add better-sqlite3 (or sql.js)
```

---

## References

- Current desktop app: `main.js`, `preload.js`, `README.md` in this folder.
- Backend API: Laravel; auth via Sanctum; multi-tenant by `organization_id` and `school_id`.
- Frontend: React app loaded from URL; uses `apiClient` and TanStack Query; would need an “offline adapter” or branch that calls `window.electron.offline` when offline.
