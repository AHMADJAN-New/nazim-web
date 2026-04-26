// Local SQLite schema for the Nazim offline-first desktop app.
//
// Scope: stores ONLY the currently authenticated user's queued mutations
// and the minimum reference data needed to keep the user productive while
// offline (currently: attendance rosters and per-session evidence).
//
// Out of scope (intentionally): replicating the full backend, caching
// other users' data, or storing third-party data. The Laravel API remains
// the source of truth.

const SCHEMA_STATEMENTS = [
  // Single-row table holding the active user's API context. Wiped on logout.
  `CREATE TABLE IF NOT EXISTS auth_context (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    school_id TEXT,
    api_token TEXT NOT NULL,
    api_base_url TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // FIFO queue of mutations to replay against the API when online.
  // client_uuid is the idempotency key the backend uses to collapse
  // duplicates; depends_on threads child ops (records, scans) behind
  // their parent session so we never POST a record before its session
  // has a server-assigned id.
  `CREATE TABLE IF NOT EXISTS pending_operations (
    client_uuid TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    depends_on TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    server_response_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    synced_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS pending_operations_status_idx
     ON pending_operations(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS pending_operations_depends_idx
     ON pending_operations(depends_on)`,

  // Snapshot of the roster the teacher saw when they created the offline
  // session. Kept as evidence: if a student transferred between cache time
  // and sync time, the sync_issues table will surface it but this row
  // remains as proof of what was on screen.
  `CREATE TABLE IF NOT EXISTS roster_snapshot (
    session_client_uuid TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT,
    admission_no TEXT,
    cached_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (session_client_uuid, student_id)
  )`,

  // Surfaced post-sync to the user (e.g. "3 records skipped — student
  // transferred"). Resolved when the user reviews them.
  `CREATE TABLE IF NOT EXISTS sync_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_uuid TEXT NOT NULL,
    kind TEXT NOT NULL,
    reason TEXT NOT NULL,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

const CURRENT_VERSION = 1;

function applySchema(db) {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  for (const stmt of SCHEMA_STATEMENTS) {
    db.exec(stmt);
  }

  const row = db
    .prepare('SELECT MAX(version) AS v FROM schema_version')
    .get();
  if (!row || row.v == null) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(
      CURRENT_VERSION,
    );
  }
}

module.exports = { applySchema, CURRENT_VERSION };
