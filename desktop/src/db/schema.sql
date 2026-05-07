PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_versions (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_versions (id, version)
VALUES (1, 1)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schools_organization_id ON schools(organization_id);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  default_school_id TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  permissions_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (default_school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_default_school_id ON profiles(default_school_id);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  academic_year_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_classes_organization_school ON classes(organization_id, school_id);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  admission_number TEXT,
  class_id TEXT,
  status TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_students_organization_school ON students(organization_id, school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);

CREATE TABLE IF NOT EXISTS attendance_round_names (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_att_round_names_scope ON attendance_round_names(organization_id, school_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  session_date TEXT NOT NULL,
  starts_at TEXT,
  ends_at TEXT,
  status TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_organization_school ON sessions(organization_id, school_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_date ON sessions(class_id, session_date);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  value TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_records_organization_school ON records(organization_id, school_id);
CREATE INDEX IF NOT EXISTS idx_records_student_session ON records(student_id, session_id);

CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_outbox (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'synced', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created ON sync_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_scope ON sync_outbox(organization_id, school_id);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_entity ON sync_outbox(entity_table, entity_id);
