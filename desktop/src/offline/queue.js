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
};
