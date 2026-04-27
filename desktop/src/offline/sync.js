const queue = require('./queue');

// Online detection + queue drain. We deliberately do NOT trust
// navigator.onLine in the renderer because school WiFi behind a captive
// portal lies. Instead the main process pings /api/me on a heartbeat;
// only a successful auth response counts as "online".

const HEARTBEAT_MS = 30_000;
const SYNC_BATCH = 25;

let online = false;
let heartbeatTimer = null;
let draining = false;
let listeners = new Set();
let resolvedListeners = new Set();

function isOnline() {
  return online;
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Notified whenever a queued create finishes syncing — gives the renderer
// the (client_uuid, server_response) pair it needs to swap the optimistic
// id for the real one and invalidate the relevant query caches.
function onResolved(fn) {
  resolvedListeners.add(fn);
  return () => resolvedListeners.delete(fn);
}

function emit() {
  const snapshot = { online, ...queue.status() };
  for (const fn of listeners) {
    try { fn(snapshot); } catch (_) { /* ignore listener errors */ }
  }
}

function emitResolved(payload) {
  for (const fn of resolvedListeners) {
    try { fn(payload); } catch (_) { /* ignore listener errors */ }
  }
}

async function pingApi() {
  const ctx = queue.getAuthContext();
  if (!ctx) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    const res = await fetch(`${ctx.api_base_url}/me`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${ctx.api_token}`,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch (_) {
    return false;
  }
}

async function heartbeat() {
  const wasOnline = online;
  online = await pingApi();

  if (online && !wasOnline) {
    // Just came back online — drain immediately. emit() will fire after.
    drain().catch(() => {});
  }
  emit();
}

function start() {
  if (heartbeatTimer) return;
  // Drop expired Tier B cache entries on each session start so users
  // returning after a long idle don't see frozen data on the first
  // offline render.
  try { queue.cacheVacuum(); } catch (_) { /* non-fatal */ }
  heartbeat();
  heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
}

function stop() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

async function replayOne(op) {
  const ctx = queue.getAuthContext();
  if (!ctx) throw new Error('No auth context');

  const payload = JSON.parse(op.payload_json || '{}');

  // For child ops that depend on a parent session, substitute the
  // server-assigned session id once the parent is synced. The endpoint
  // template uses ":session_id" which we replace at replay time.
  let endpoint = op.endpoint;
  if (endpoint.includes(':session_id') && op.depends_on) {
    const parentRow = require('./db')
      .get()
      .prepare('SELECT server_response_json FROM pending_operations WHERE client_uuid = ?')
      .get(op.depends_on);
    const parentResp = parentRow?.server_response_json
      ? JSON.parse(parentRow.server_response_json)
      : null;
    if (!parentResp?.id) {
      throw new Error('Parent session not synced yet');
    }
    endpoint = endpoint.replace(':session_id', parentResp.id);
  }

  const url = `${ctx.api_base_url}${endpoint}`;

  const res = await fetch(url, {
    method: op.method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ctx.api_token}`,
    },
    body: ['POST', 'PUT', 'PATCH'].includes(op.method) ? JSON.stringify(payload) : undefined,
  });

  let body = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { body = await res.json(); } catch (_) { body = null; }
  }

  if (!res.ok) {
    const err = new Error(body?.error || body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

async function drain() {
  if (draining || !online) return;
  draining = true;
  try {
    let batch = queue.listReady(SYNC_BATCH);
    while (batch.length > 0 && online) {
      for (const op of batch) {
        queue.markInFlight(op.client_uuid);
        try {
          const resp = await replayOne(op);
          queue.markSynced(op.client_uuid, resp);
          emitResolved({
            client_uuid: op.client_uuid,
            kind: op.kind,
            server_id: resp && typeof resp === 'object' ? resp.id ?? null : null,
            body: resp,
          });
        } catch (err) {
          // 4xx (except 408/429) are terminal — replaying won't help.
          // Surface as a sync issue so the user can resolve it.
          const status = err.status ?? 0;
          const terminal = status >= 400 && status < 500 && status !== 408 && status !== 429;
          queue.markFailed(op.client_uuid, err, terminal);
          if (terminal) {
            queue.recordSyncIssue({
              clientUuid: op.client_uuid,
              kind: op.kind,
              reason: `server_rejected_${status}`,
              details: { error: err.message, body: err.body ?? null, endpoint: op.endpoint },
            });
          } else {
            // Network / 5xx — stop the batch; next heartbeat retries.
            online = false;
            break;
          }
        }
      }
      if (!online) break;
      batch = queue.listReady(SYNC_BATCH);
    }
  } finally {
    draining = false;
    emit();
  }
}

module.exports = { start, stop, drain, isOnline, onChange, onResolved, heartbeat };
