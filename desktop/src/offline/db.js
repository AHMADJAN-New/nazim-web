const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const { applySchema } = require('./schema');
const keystore = require('./keystore');

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
  // the native binding unless needed. better-sqlite3-multiple-ciphers is
  // an API-compatible drop-in for better-sqlite3 with SQLCipher built in.
  // eslint-disable-next-line global-require
  const Database = require('better-sqlite3-multiple-ciphers');

  // Per-user encryption key, sealed by the OS keychain via safeStorage.
  // If safeStorage isn't available we refuse to open rather than silently
  // store data in plaintext — surfacing the error is the safer default.
  const key = keystore.getOrCreateKey(userId);

  dbPath = dbFileFor(userId);
  db = new Database(dbPath);

  // PRAGMA key MUST be the very first statement on a fresh handle, before
  // anything triggers a page read. Quoting as a string literal makes the
  // 32-byte hex key compatible across all SQLCipher versions.
  db.pragma(`cipher='sqlcipher'`);
  db.pragma(`key='${key}'`);

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
