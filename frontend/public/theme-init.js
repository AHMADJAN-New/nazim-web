/**
 * Apply stored dark theme before first paint to avoid a light-mode flash.
 * Loaded as an external file because production CSP is script-src 'self' 'unsafe-eval'.
 * Keep the storage key in sync with ThemeProvider (THEME_STORAGE_KEY).
 */
(function () {
  try {
    var theme = localStorage.getItem('nazim-theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // Ignore storage/access errors (private mode, blocked storage).
  }
})();
