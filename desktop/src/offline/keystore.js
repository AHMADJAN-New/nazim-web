const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app, safeStorage } = require('electron');

// Per-user SQLCipher keys, sealed with Electron safeStorage. safeStorage
// uses the OS keychain (Keychain on macOS, libsecret on Linux, DPAPI on
// Windows) so the key on disk is unreadable without the OS-level user
// session that produced it.
//
// File layout under userData/offline/:
//   keys/<userId>.bin   -> safeStorage-sealed 32-byte raw key (binary)
//
// First call generates a fresh random key; subsequent calls re-open it.

function keysDir() {
  const dir = path.join(app.getPath('userData'), 'offline', 'keys');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

function keyFileFor(userId) {
  return path.join(keysDir(), `${userId}.bin`);
}

function isAvailable() {
  // safeStorage is unavailable on Linux without a configured keyring.
  // We surface that explicitly so callers can decide whether to refuse
  // to start (recommended for school deployments) or fall back to a
  // plaintext DB (acceptable for local development only).
  try {
    return safeStorage.isEncryptionAvailable();
  } catch (_) {
    return false;
  }
}

function getOrCreateKey(userId) {
  if (!userId) throw new Error('getOrCreateKey requires userId');
  if (!isAvailable()) {
    throw new Error(
      'safeStorage encryption is not available on this OS. Refusing to ' +
      'open the offline database without a sealed key. On Linux, install ' +
      'and configure a keyring (gnome-keyring or kwallet) and restart.',
    );
  }

  const file = keyFileFor(userId);

  if (fs.existsSync(file)) {
    const sealed = fs.readFileSync(file);
    const key = safeStorage.decryptString(sealed);
    if (!key || key.length < 32) {
      throw new Error(`Stored offline key for user ${userId} is corrupt`);
    }
    return key;
  }

  // Generate a 32-byte random key, hex-encode (so SQLCipher's PRAGMA key
  // accepts it as a literal), then seal with safeStorage before writing.
  const raw = crypto.randomBytes(32);
  const hex = raw.toString('hex');
  const sealed = safeStorage.encryptString(hex);
  fs.writeFileSync(file, sealed, { mode: 0o600 });
  return hex;
}

function destroyKey(userId) {
  if (!userId) return;
  const file = keyFileFor(userId);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

module.exports = { getOrCreateKey, destroyKey, isAvailable };
