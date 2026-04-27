const db = require('./db');

// Operation kinds the desktop layer knows how to replay. Keeping this as
// an explicit allow-list rather than a free-form string prevents the
// renderer from queuing arbitrary endpoints — only attendance writes
// flow through here in PR1.
const KNOWN_KINDS = new Set([
  'attendance.session.create',
  'attendance.records.mark',
  'attendance.scan',
]);

function setAuthContext({ userId, organizationId, schoolId, apiToken, apiBaseUrl }) {
  if (!userId || !organizationId || !apiToken || !apiBaseUrl) {
    throw new Error('setAuthContext requires userId, organizationId, apiToken, apiBaseUrl');
  }
  const stmt = db.get().prepare(`
    INSERT INTO auth_context (id, user_id, organization_id, school_id, api_token, api_base_url, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      organization_id = excluded.organization_id,
      school_id = excluded.school_id,
      api_token = excluded.api_token,
      api_base_url = excluded.api_base_url,
      updated_at = excluded.updated_at
  `);
  stmt.run(userId, organizationId, schoolId ?? null, apiToken, apiBaseUrl);
}

function getAuthContext() {
  return db.get().prepare('SELECT * FROM auth_context WHERE id = 1').get();
}

function clearAuthContext() {
  db.get().exec('DELETE FROM auth_context');
}

function enqueue(op) {
  if (!op || !op.client_uuid || !op.kind || !op.method || !op.endpoint) {
    throw new Error('enqueue requires { client_uuid, kind, method, endpoint, payload }');
  }
  if (!KNOWN_KINDS.has(op.kind)) {
    throw new Error(`enqueue: unsupported kind "${op.kind}"`);
  }

  const ctx = getAuthContext();
  if (!ctx) {
    throw new Error('enqueue: no auth context — user must be logged in');
  }

  const stmt = db.get().prepare(`
    INSERT INTO pending_operations
      (client_uuid, user_id, organization_id, kind, method, endpoint, payload_json, depends_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_uuid) DO NOTHING
  `);

  const result = stmt.run(
    op.client_uuid,
    ctx.user_id,
    ctx.organization_id,
    op.kind,
    op.method,
    op.endpoint,
    JSON.stringify(op.payload ?? {}),
    op.depends_on ?? null,
  );

  return { inserted: result.changes > 0, client_uuid: op.client_uuid };
}

// Operations whose dependency (parent session) is either absent (no
// depends_on) or already synced. Keeps drain order consistent with
// causality — records never POST before their session.
function listReady(limit = 50) {
  return db.get().prepare(`
    SELECT * FROM pending_operations
    WHERE status = 'pending'
      AND (
        depends_on IS NULL
        OR EXISTS (
          SELECT 1 FROM pending_operations parent
          WHERE parent.client_uuid = pending_operations.depends_on
            AND parent.status = 'synced'
        )
      )
    ORDER BY created_at ASC
    LIMIT ?
  `).all(limit);
}

function markInFlight(clientUuid) {
  db.get().prepare(`
    UPDATE pending_operations
    SET status = 'in_flight', attempt_count = attempt_count + 1, updated_at = datetime('now')
    WHERE client_uuid = ?
  `).run(clientUuid);
}

function markSynced(clientUuid, serverResponse) {
  db.get().prepare(`
    UPDATE pending_operations
    SET status = 'synced',
        server_response_json = ?,
        last_error = NULL,
        synced_at = datetime('now'),
        updated_at = datetime('now')
    WHERE client_uuid = ?
  `).run(serverResponse ? JSON.stringify(serverResponse) : null, clientUuid);
}

function markFailed(clientUuid, error, terminal = false) {
  db.get().prepare(`
    UPDATE pending_operations
    SET status = ?,
        last_error = ?,
        updated_at = datetime('now')
    WHERE client_uuid = ?
  `).run(terminal ? 'failed' : 'pending', String(error?.message ?? error ?? 'unknown'), clientUuid);
}

function recordSyncIssue({ clientUuid, kind, reason, details }) {
  db.get().prepare(`
    INSERT INTO sync_issues (client_uuid, kind, reason, details_json)
    VALUES (?, ?, ?, ?)
  `).run(clientUuid, kind, reason, details ? JSON.stringify(details) : null);
}

function status() {
  const counts = db.get().prepare(`
    SELECT status, COUNT(*) AS n FROM pending_operations GROUP BY status
  `).all();
  const issues = db.get().prepare(`
    SELECT COUNT(*) AS n FROM sync_issues WHERE resolved_at IS NULL
  `).get();
  const lastSynced = db.get().prepare(`
    SELECT MAX(synced_at) AS at FROM pending_operations WHERE status = 'synced'
  `).get();

  const result = {
    pending: 0, in_flight: 0, synced: 0, failed: 0,
    open_issues: issues?.n ?? 0,
    last_synced_at: lastSynced?.at ?? null,
  };
  for (const row of counts) {
    result[row.status] = row.n;
  }
  return result;
}

// Tier B read-cache helpers. The renderer derives `cache_key` from its
// TanStack Query key; `kind` is a coarse module label ("students.list",
// "fees.payments") so we can evict a whole module at once on logout.
function cachePut(cacheKey, kind, body) {
  if (!cacheKey || !kind) {
    throw new Error('cachePut requires cacheKey and kind');
  }
  db.get().prepare(`
    INSERT INTO cached_responses (cache_key, kind, body_json, cached_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(cache_key) DO UPDATE SET
      kind = excluded.kind,
      body_json = excluded.body_json,
      cached_at = excluded.cached_at
  `).run(cacheKey, kind, JSON.stringify(body ?? null));
}

// Cached responses older than this are considered too stale to surface,
// even when offline. 7 days matches a typical school holiday gap — long
// enough that a teacher who's been disconnected over a weekend still
// sees their data, short enough that data stops being a hazard for
// users who left the app idle for weeks.
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cacheGet(cacheKey) {
  if (!cacheKey) return null;
  const row = db.get().prepare(`
    SELECT body_json, cached_at FROM cached_responses WHERE cache_key = ?
  `).get(cacheKey);
  if (!row) return null;

  // Reject expired rows. We don't delete here — let cacheVacuum handle
  // bulk pruning on a schedule.
  const cachedAtMs = Date.parse(`${row.cached_at}Z`);
  if (Number.isFinite(cachedAtMs) && Date.now() - cachedAtMs > CACHE_MAX_AGE_MS) {
    return null;
  }

  try {
    return { body: JSON.parse(row.body_json), cached_at: row.cached_at };
  } catch (_) {
    return null;
  }
}

function cacheVacuum(maxAgeMs = CACHE_MAX_AGE_MS) {
  // SQLite's datetime('now') returns UTC; cached_at is stored that way
  // too, so we can compute the cutoff as ISO and compare strings safely.
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString().replace('T', ' ').slice(0, 19);
  const result = db.get().prepare(`
    DELETE FROM cached_responses WHERE cached_at < ?
  `).run(cutoff);
  return { removed: result.changes };
}

function cacheEvict(kind) {
  if (kind) {
    db.get().prepare('DELETE FROM cached_responses WHERE kind = ?').run(kind);
  } else {
    db.get().exec('DELETE FROM cached_responses');
  }
}

function snapshotRoster(sessionClientUuid, students) {
  if (!Array.isArray(students)) return;
  const insert = db.get().prepare(`
    INSERT INTO roster_snapshot (session_client_uuid, student_id, student_name, admission_no)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_client_uuid, student_id) DO NOTHING
  `);
  const tx = db.get().transaction((rows) => {
    for (const s of rows) {
      insert.run(sessionClientUuid, s.id, s.full_name ?? null, s.admission_no ?? null);
    }
  });
  tx(students);
}

module.exports = {
  KNOWN_KINDS,
  setAuthContext,
  getAuthContext,
  clearAuthContext,
  enqueue,
  listReady,
  markInFlight,
  markSynced,
  markFailed,
  recordSyncIssue,
  status,
  snapshotRoster,
  cachePut,
  cacheGet,
  cacheEvict,
  cacheVacuum,
  CACHE_MAX_AGE_MS,
};
