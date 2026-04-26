const { ipcMain, BrowserWindow } = require('electron');

const db = require('./db');
const queue = require('./queue');
const sync = require('./sync');

// IPC channel naming convention: "offline:<verb>". The renderer talks
// to these via the bridge exposed in preload.js — never directly.

let registered = false;
let unsubscribeStatus = null;

function broadcastStatus(snapshot) {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) {
      w.webContents.send('offline:status', snapshot);
    }
  }
}

function register() {
  if (registered) return;
  registered = true;

  // Called by the renderer right after a successful login (and on token
  // refresh). Opens the per-user DB, stores the auth context, and starts
  // the heartbeat. Must complete before any enqueue/sync calls.
  ipcMain.handle('offline:login', (_event, payload) => {
    const { userId, organizationId, schoolId, apiToken, apiBaseUrl } = payload || {};
    if (!userId || !organizationId || !apiToken || !apiBaseUrl) {
      throw new Error('offline:login requires userId, organizationId, apiToken, apiBaseUrl');
    }
    db.open(userId);
    queue.setAuthContext({ userId, organizationId, schoolId, apiToken, apiBaseUrl });
    sync.start();
    return { ok: true };
  });

  // Called on logout. Stops the heartbeat, clears auth context, closes
  // the DB. Pending operations remain on disk (under that user's file)
  // and will resume next time the same user logs in.
  ipcMain.handle('offline:logout', () => {
    sync.stop();
    if (db.isOpen()) {
      try { queue.clearAuthContext(); } catch (_) { /* ignore */ }
      db.close();
    }
    return { ok: true };
  });

  ipcMain.handle('offline:enqueue', (_event, op) => {
    return queue.enqueue(op);
  });

  ipcMain.handle('offline:status', () => {
    return { online: sync.isOnline(), ...queue.status() };
  });

  ipcMain.handle('offline:sync-now', async () => {
    await sync.heartbeat();
    await sync.drain();
    return { online: sync.isOnline(), ...queue.status() };
  });

  ipcMain.handle('offline:snapshot-roster', (_event, payload) => {
    const { sessionClientUuid, students } = payload || {};
    if (!sessionClientUuid || !Array.isArray(students)) {
      throw new Error('offline:snapshot-roster requires sessionClientUuid and students[]');
    }
    queue.snapshotRoster(sessionClientUuid, students);
    return { ok: true, count: students.length };
  });

  ipcMain.handle('offline:list-issues', () => {
    return db.get().prepare(`
      SELECT id, client_uuid, kind, reason, details_json, created_at, resolved_at
      FROM sync_issues
      WHERE resolved_at IS NULL
      ORDER BY created_at DESC
      LIMIT 200
    `).all();
  });

  ipcMain.handle('offline:resolve-issue', (_event, id) => {
    db.get().prepare(`
      UPDATE sync_issues SET resolved_at = datetime('now') WHERE id = ?
    `).run(id);
    return { ok: true };
  });

  unsubscribeStatus = sync.onChange(broadcastStatus);
}

function unregister() {
  if (!registered) return;
  registered = false;

  if (unsubscribeStatus) {
    unsubscribeStatus();
    unsubscribeStatus = null;
  }

  for (const channel of [
    'offline:login',
    'offline:logout',
    'offline:enqueue',
    'offline:status',
    'offline:sync-now',
    'offline:snapshot-roster',
    'offline:list-issues',
    'offline:resolve-issue',
  ]) {
    ipcMain.removeHandler(channel);
  }
}

module.exports = { register, unregister };
