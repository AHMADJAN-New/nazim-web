const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

const offlineIpc = require('./src/offline/ipc');

function writeMainLog(...parts) {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const logPath = path.join(logsDir, 'main.log');
    const line = `[${new Date().toISOString()}] ${parts
      .map((p) => (typeof p === 'string' ? p : JSON.stringify(p)))
      .join(' ')}\n`;
    fs.appendFileSync(logPath, line, 'utf8');
  } catch {
    // best-effort logging; never crash the app
  }
}

// Load `.env` only for local development.
// In packaged builds we must prefer the bundled renderer (`dist-renderer/`)
// so the app can boot without any dev server/network.
if (!app.isPackaged) {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*NAZIM_APP_URL\s*=\s*(.+)$/);
      if (match) {
        process.env.NAZIM_APP_URL = match[1].trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

const APP_URL = process.env.NAZIM_APP_URL || 'https://app.nazim.cloud';
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const IS_LOCALHOST_APP_URL = /^https:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(APP_URL);

// Bundled renderer (built React app) lives under dist-renderer/. When
// present and no explicit NAZIM_APP_URL override is set, we load from
// file:// so the app boots even with no internet — first run included.
// Falls back to APP_URL in dev or when the bundle hasn't been built.
const BUNDLED_INDEX = path.join(__dirname, 'dist-renderer', 'index.html');
const HAS_BUNDLE = fs.existsSync(BUNDLED_INDEX);
// Packaged builds must always prefer the bundled UI when it exists.
// (Environment overrides are for dev only; bundled UI enables offline-first boot.)
const USE_BUNDLE = HAS_BUNDLE && app.isPackaged;
writeMainLog('boot', { isPackaged: app.isPackaged, HAS_BUNDLE, USE_BUNDLE, APP_URL, BUNDLED_INDEX });

let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Surface renderer-side errors in production where DevTools may not be open.
    writeMainLog('renderer:console', { level, message, line, sourceId });
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    writeMainLog('renderer:gone', details);
  });

  mainWindow.webContents.on('unresponsive', () => {
    writeMainLog('renderer:unresponsive');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    writeMainLog('did-finish-load', { url: mainWindow.webContents.getURL() });
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3 || errorCode === -2) return;
    writeMainLog('did-fail-load', { errorCode, errorDescription, validatedURL });
    if (!mainWindow || mainWindow.isDestroyed()) return;
    // When loading the bundled UI, did-fail-load shouldn't normally fire
    // (file:// is local). When it does, fall back to error.html.
    if (USE_BUNDLE) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'), {
        query: { url: 'bundled', message: errorDescription || 'Failed to load bundled UI' },
      });
      return;
    }
    mainWindow.loadFile(path.join(__dirname, 'error.html'), {
      query: { url: APP_URL, message: errorDescription || 'Connection failed' },
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadShell();
}

function loadShell() {
  const win = mainWindow;
  if (!win || win.isDestroyed()) return;
  if (USE_BUNDLE) {
    // file:// load — virtually always succeeds when packaged.
    win.loadFile(BUNDLED_INDEX).catch(() => {
      // The window may have been closed/destroyed while the promise rejected.
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.loadFile(path.join(__dirname, 'error.html'), {
        query: { url: 'bundled', message: 'Failed to load bundled UI' },
      });
    });
    return;
  }
  win.loadURL(APP_URL).catch(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.loadFile(path.join(__dirname, 'error.html'), {
      query: { url: APP_URL, message: 'Failed to load application' },
    });
  });
}

ipcMain.handle('retry-load', () => {
  loadShell();
});

app.whenReady().then(() => {
  // In local development we often use mkcert/self-signed certificates.
  // Trust localhost only so the app can load dev servers safely.
  if (IS_DEV && IS_LOCALHOST_APP_URL) {
    session.defaultSession.setCertificateVerifyProc((request, callback) => {
      const host = request.hostname || '';
      if (host === 'localhost' || host === '127.0.0.1') {
        callback(0);
        return;
      }
      callback(-3);
    });
  }

  // Register offline IPC handlers before any window can call them. Handlers
  // are no-ops until the renderer calls offline:login post-authentication.
  offlineIpc.register();

  createSplashWindow();
  createMainWindow();
});

app.on('will-quit', () => {
  offlineIpc.unregister();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createSplashWindow();
    createMainWindow();
  }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
