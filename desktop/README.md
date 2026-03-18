# Nazim Desktop

Electron wrapper that loads the Nazim web app from a URL. The desktop app does not bundle the frontend; it opens a window to your deployed site so users always get the latest version.

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

Outputs to `desktop/dist/`:

- **Nazim Setup x.x.x.exe** – installer (NSIS)
- **Nazim x.x.x.exe** – portable single-file executable

To build for all platforms:

```bash
npm run dist
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

- `main.js` – Electron main process (window creation, splash, error handling, IPC).
- `preload.js` – Exposes `window.electron.retryLoad()` for the error page.
- `splash.html` – Splash screen shown while the main window loads.
- `error.html` – Shown when the app URL fails to load; includes Retry.
