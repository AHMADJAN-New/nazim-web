const fs = require('fs');
const path = require('path');

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function main() {
  const desktopDir = path.resolve(__dirname, '..');
  const frontendDist = path.resolve(desktopDir, '..', 'frontend', 'dist');
  const target = path.resolve(desktopDir, 'dist-renderer');
  const staging = path.resolve(desktopDir, 'dist-renderer.__staging__');

  if (!fs.existsSync(frontendDist)) {
    throw new Error(`frontend dist not found at: ${frontendDist}`);
  }

  // Copy into staging first so we never leave a half-copied dist-renderer.
  rm(staging);
  fs.mkdirSync(staging, { recursive: true });
  fs.cpSync(frontendDist, staging, { recursive: true });

  // Swap in place (best-effort on Windows).
  const backup = path.resolve(desktopDir, 'dist-renderer.__backup__');
  rm(backup);
  if (fs.existsSync(target)) {
    fs.renameSync(target, backup);
  }
  fs.renameSync(staging, target);
  rm(backup);
}

main();

