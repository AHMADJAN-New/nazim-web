const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rmWithRetries(targetPath, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return true;
    } catch (err) {
      const code = err && err.code;
      if (i === attempts - 1) return false;
      // Windows can hold locks briefly (AV, explorer, previous process). Backoff.
      if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
        // eslint-disable-next-line no-await-in-loop
        await sleep(250 * (i + 1));
        continue;
      }
      return false;
    }
  }
  return false;
}

function tryTaskKill(imageName) {
  try {
    spawnSync('taskkill', ['/IM', imageName, '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch {
    // best-effort
  }
}

function timestampId() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}${pad(d.getSeconds())}`;
}

async function main() {
  const desktopDir = path.resolve(__dirname, '..');
  const distRoot = path.join(desktopDir, 'dist');

  const args = process.argv.slice(2);
  const wantsWin = args.includes('--win'); // informational; electron-builder infers platform
  const wantsDir = args.includes('--dir');

  // Free the most common lock: a previously launched packaged app.
  // Avoid killing generic processes like "electron.exe" (can kill other apps).
  tryTaskKill('Nazim.exe');

  // Best-effort cleanup. If it fails due to locks, we still proceed because
  // we build into a fresh output directory every time.
  if (fs.existsSync(distRoot)) {
    // Remove only the common unpacked folder names to reduce disk usage.
    await rmWithRetries(path.join(distRoot, 'win-unpacked'), 6);
    await rmWithRetries(path.join(distRoot, 'win-ia32-unpacked'), 6);
    await rmWithRetries(path.join(distRoot, 'win-arm64-unpacked'), 6);
  }

  const outDir = path.join(distRoot, `win-build-${timestampId()}`);
  fs.mkdirSync(outDir, { recursive: true });

  // On Windows, spawning the `.cmd` shim directly from Node can fail with EINVAL.
  // Run the JS CLI via Node instead (works cross-platform).
  const bin = process.execPath;
  const cli = path.join(desktopDir, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');

  const ebArgs = [
    ...(wantsWin ? ['--win'] : []),
    ...(wantsDir ? ['--dir'] : []),
    `--config.directories.output=${outDir}`,
  ];

  const res = spawnSync(bin, [cli, ...ebArgs], {
    cwd: desktopDir,
    stdio: 'inherit',
    windowsHide: false,
    env: process.env,
  });

  if (res.error || res.status == null) {
    // eslint-disable-next-line no-console
    console.error('Failed to run electron-builder', {
      bin,
      cli,
      args: ebArgs,
      status: res.status,
      signal: res.signal,
      error: res.error ? { message: res.error.message, code: res.error.code } : null,
    });
    process.exit(1);
  }

  process.exit(res.status);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

