const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const offlineIpc = require('./src/offline/ipc');

// Load .env from desktop directory if present (no extra dependency)
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

const APP_URL = process.env.NAZIM_APP_URL || 'https://app.nazim.cloud';
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Bundled renderer (built React app) lives under dist-renderer/. When
// present and no explicit NAZIM_APP_URL override is set, we load from
// file:// so the app boots even with no internet — first run included.
// Falls back to APP_URL in dev or when the bundle hasn't been built.
const BUNDLED_INDEX = path.join(__dirname, 'dist-renderer', 'index.html');
const HAS_BUNDLE = fs.existsSync(BUNDLED_INDEX);
const USE_BUNDLE = HAS_BUNDLE && !IS_DEV && !process.env.NAZIM_APP_URL;

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

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    if (errorCode === -3 || errorCode === -2) return;
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
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (USE_BUNDLE) {
    // file:// load — virtually always succeeds when packaged.
    mainWindow.loadFile(BUNDLED_INDEX).catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'error.html'), {
        query: { url: 'bundled', message: 'Failed to load bundled UI' },
      });
    });
    return;
  }
  mainWindow.loadURL(APP_URL).catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'error.html'), {
      query: { url: APP_URL, message: 'Failed to load application' },
    });
  });
}

ipcMain.handle('retry-load', () => {
  loadShell();
});

app.whenReady().then(() => {
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
