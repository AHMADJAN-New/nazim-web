const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const { applySchema } = require('./schema');

// Lazy-loaded singleton. Opened on first call after the user logs in
// (when we know which user_id to scope the file to).
let db = null;
let dbPath = null;

function dbDirectory() {
  return path.join(app.getPath('userData'), 'offline');
}

function dbFileFor(userId) {
  // Per-user file: switching accounts on the same machine never mixes data.
  // userId is a UUID, so it's filesystem-safe as-is.
  return path.join(dbDirectory(), `nazim_${userId}.db`);
}

function open(userId) {
  if (!userId) {
    throw new Error('open() requires an authenticated user_id');
  }

  if (db && dbPath === dbFileFor(userId)) {
    return db;
  }

  if (db) {
    // Different user logged in — close the previous handle before swapping.
    try {
      db.close();
    } catch (_) {
      // ignore
    }
    db = null;
  }

  const dir = dbDirectory();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Require lazily so unit tests / non-Electron contexts don't pull in
  // the native binding unless needed.
  // TODO(security): wrap this with a SQLCipher-capable build (e.g.
  // better-sqlite3-multiple-ciphers) and key it with Electron safeStorage
  // before shipping to schools. For PR1 the file is per-user under
  // userData with 0700 permissions — sufficient for the data flow but
  // not for at-rest encryption.
  // eslint-disable-next-line global-require
  const Database = require('better-sqlite3');

  dbPath = dbFileFor(userId);
  db = new Database(dbPath);
  applySchema(db);
  return db;
}

function get() {
  if (!db) {
    throw new Error('Offline DB not open. Call open(userId) after login.');
  }
  return db;
}

function isOpen() {
  return db !== null;
}

function close() {
  if (db) {
    try {
      db.close();
    } catch (_) {
      // ignore
    }
    db = null;
    dbPath = null;
  }
}

module.exports = { open, get, isOpen, close, dbFileFor };
