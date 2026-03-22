/**
 * Crypto.randomUUID polyfill for environments where it is missing or not a function.
 * Loaded before the app bundle; keep in sync with any CSP script-src allowances.
 */
(function () {
  try {
    if (typeof window === 'undefined' || !window.crypto) return;

    if (typeof window.crypto.randomUUID === 'function') return;

    window.crypto.randomUUID = function randomUUID() {
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);

      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      var hex = Array.from(bytes, function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');

      return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20, 32),
      ].join('-');
    };
  } catch (e) {
    // If crypto is blocked/unavailable, just don't polyfill.
  }
})();
