import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = 1;

export type SqliteDatabase = Database.Database;

export interface OpenDatabaseOptions {
  dbPath?: string;
  appDataPath?: string;
}

const resolveAppDataPath = (override?: string): string => {
  if (override) return override;
  if (app?.isReady?.()) return app.getPath('appData');
  return process.env.APPDATA || path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Roaming');
};

export const getDefaultDbPath = (options: OpenDatabaseOptions = {}): string =>
  options.dbPath || path.join(resolveAppDataPath(options.appDataPath), 'nazim-offline', 'school.db');

const getSchemaPath = (): string => {
  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, '..', '..', '..', 'src', 'db', 'schema.sql'),
    path.join(__dirname, '..', 'src', 'db', 'schema.sql'),
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Unable to locate schema.sql. Checked: ${candidates.join(', ')}`);
  }
  return found;
};

export const openDatabase = (options: OpenDatabaseOptions = {}): SqliteDatabase => {
  const dbPath = getDefaultDbPath(options);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
};

export const migrate = (db: SqliteDatabase): void => {
  const schema = fs.readFileSync(getSchemaPath(), 'utf8');
  db.exec(schema);

  const version = db
    .prepare('SELECT version FROM schema_versions WHERE id = 1')
    .get() as { version: number } | undefined;

  if (!version || version.version < SCHEMA_VERSION) {
    db.prepare(
      'INSERT INTO schema_versions (id, version, applied_at) VALUES (1, ?, datetime(\'now\')) ON CONFLICT(id) DO UPDATE SET version = excluded.version, applied_at = excluded.applied_at',
    ).run(SCHEMA_VERSION);
  }
};
