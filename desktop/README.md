# Nazim Desktop

Electron desktop build. Loads the bundled React app from `dist-renderer/` when packaged, or a remote URL in dev. Includes a full **offline-first** subsystem (SQLCipher queue + sync worker + Tier B read cache).

> See **[`docs/OFFLINE_FIRST.md`](../docs/OFFLINE_FIRST.md)** for the architecture, setup, dev usage, and how to add new offline-capable features.

## Requirements

- Node.js 18+
- npm or yarn

## Setup

```bash
cd desktop
npm install
```

## Configuration

Copy `.env.example` to `.env` and set the app URL:

```bash
cp .env.example .env
```

Edit `.env`:

- **NAZIM_APP_URL** – URL of the Nazim web app to load (e.g. `https://app.nazim.cloud`). For local development use your frontend dev server (e.g. `http://localhost:5173`).

If `.env` is missing, the app falls back to `https://app.nazim.cloud`.

## Run (development)

```bash
npm start
```

Opens a window that loads the configured URL. A splash screen is shown until the page has loaded.

## Build Windows .exe

```bash
npm run dist:win
```

This first runs `build:renderer` (which executes `vite build --base=./` in
`../frontend` and copies `dist/` into `desktop/dist-renderer/`), then
packages the app via electron-builder.

Outputs to `desktop/dist/`:

- **Nazim Setup x.x.x.exe** – installer (NSIS)
- **Nazim x.x.x.exe** – portable single-file executable

To build for all platforms:

```bash
npm run dist
```

To build only the bundled UI (no installer):

```bash
npm run build:renderer
```

## Behaviour

- **Single instance** – Opening the app again focuses the existing window.
- **Load failure** – If the URL fails to load, an error page with a “Retry” button is shown.
- **Session** – Cookies and localStorage are stored in the app’s user data directory, so login persists across restarts.
- **External links** – Links that open in a new window are opened in the system browser.

## Updates

- **Web app** – Because the window loads from a URL, each launch uses the latest deployed frontend. No extra update flow.
- **Desktop shell** – To ship a new .exe version, build and distribute the new installer (e.g. via your existing desktop release flow or download page). Optional: you can add `electron-updater` and a feed later for in-app shell updates.

## Project structure

- `main.js` – Electron main process. Loads the bundled UI (`dist-renderer/`) when packaged, falls back to `NAZIM_APP_URL` otherwise. Registers offline IPC handlers.
- `preload.js` – Exposes `window.electron.retryLoad()` and the full `window.electron.offline.*` bridge for the offline subsystem.
- `splash.html` – Splash screen shown while the main window loads.
- `error.html` – Shown when load fails; includes Retry.
- `src/offline/` – Offline-first subsystem (SQLCipher DB, sync worker, IPC handlers, encryption keystore). See **[`docs/OFFLINE_FIRST.md`](../docs/OFFLINE_FIRST.md)**.
- `dist-renderer/` – Bundled React build (gitignored; produced by `build:renderer`).
