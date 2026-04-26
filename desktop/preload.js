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

    // Subscribe to push-style status updates (broadcast on heartbeat
    // transitions and after every drain). Returns an unsubscribe fn.
    onStatus: (handler) => {
      const listener = (_event, snapshot) => handler(snapshot);
      ipcRenderer.on('offline:status', listener);
      return () => ipcRenderer.removeListener('offline:status', listener);
    },
  },
});
