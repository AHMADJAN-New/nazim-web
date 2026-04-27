const { contextBridge, ipcRenderer } = require('electron');

// Bridge between the renderer (web app) and the Electron main process.
// Only the explicit functions below are exposed to the page; the renderer
// has no direct access to ipcRenderer, fs, or the SQLite database.
contextBridge.exposeInMainWorld('electron', {
  retryLoad: () => ipcRenderer.invoke('retry-load'),

  offline: {
    // Call right after a successful login (and on token rotation).
    login: (payload) => ipcRenderer.invoke('offline:login', payload),

    logout: () => ipcRenderer.invoke('offline:logout'),

    // Queue a write operation for later replay. Returns
    // { inserted: boolean, client_uuid: string }. The op shape:
    //   { client_uuid, kind, method, endpoint, payload, depends_on? }
    enqueue: (op) => ipcRenderer.invoke('offline:enqueue', op),

    // One-shot status snapshot for UI rendering on demand.
    status: () => ipcRenderer.invoke('offline:status'),

    // Force a heartbeat + drain (e.g. when the user clicks "Sync now").
    syncNow: () => ipcRenderer.invoke('offline:sync-now'),

    // Persist the roster snapshot the teacher saw at session-creation time.
    snapshotRoster: (sessionClientUuid, students) =>
      ipcRenderer.invoke('offline:snapshot-roster', {
        sessionClientUuid,
        students,
      }),

    listIssues: () => ipcRenderer.invoke('offline:list-issues'),
    resolveIssue: (id) => ipcRenderer.invoke('offline:resolve-issue', id),

    // Tier B read-cache: persist a successful API response keyed by
    // cacheKey + kind, then read it back when offline. Body is stored
    // verbatim and returned exactly as supplied.
    cachePut: (cacheKey, kind, body) =>
      ipcRenderer.invoke('offline:cache-put', { cacheKey, kind, body }),
    cacheGet: (cacheKey) => ipcRenderer.invoke('offline:cache-get', cacheKey),
    cacheEvict: (kind) => ipcRenderer.invoke('offline:cache-evict', kind),

    // Full data removal for the given user — closes the DB, deletes the
    // file and purges the sealed key. Use this when the user signs out
    // permanently or clears their offline data.
    purge: (userId) => ipcRenderer.invoke('offline:purge', userId),

    // Subscribe to push-style status updates (broadcast on heartbeat
    // transitions and after every drain). Returns an unsubscribe fn.
    onStatus: (handler) => {
      const listener = (_event, snapshot) => handler(snapshot);
      ipcRenderer.on('offline:status', listener);
      return () => ipcRenderer.removeListener('offline:status', listener);
    },

    // Fires once per queued create/scan/etc. that finishes syncing.
    // Payload: { client_uuid, kind, server_id, body }. Renderer uses
    // this to swap optimistic ids and invalidate caches.
    onResolved: (handler) => {
      const listener = (_event, payload) => handler(payload);
      ipcRenderer.on('offline:resolved', listener);
      return () => ipcRenderer.removeListener('offline:resolved', listener);
    },
  },
});
