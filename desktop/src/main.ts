import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { openDatabase } from './db/database';
import { createRepositories } from './repos/repositorySet';
import { registerIpcHandlers } from './api/handlers';
import { SyncStatusService } from './sync/syncStatus';

let mainWindow: BrowserWindow | null = null;

const getRendererIndexPath = (): string | null => {
  const candidates = [
    path.join(process.resourcesPath || '', 'frontend-dist', 'index.html'),
    path.join(__dirname, '..', '..', '..', 'frontend', 'dist', 'index.html'),
    path.join(process.cwd(), '..', 'frontend', 'dist', 'index.html'),
  ];
  return candidates.find((candidate) => candidate && require('node:fs').existsSync(candidate)) ?? null;
};

const createWindow = async (): Promise<void> => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const indexPath = getRendererIndexPath();
  if (indexPath) {
    await mainWindow.loadFile(indexPath);
  } else {
    await mainWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent('<main style="font-family: sans-serif; padding: 32px"><h1>Nazim Desktop</h1><p>Build frontend/dist to load the React app from disk.</p></main>')}`,
    );
  }
};

app.whenReady().then(async () => {
  app.setName('Nazim');

  const db = openDatabase();
  const repos = createRepositories(db);
  const syncStatus = new SyncStatusService(repos.outbox);
  registerIpcHandlers({ repos, syncStatus });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
