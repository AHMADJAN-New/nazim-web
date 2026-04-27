import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

// Validates the desktop bundle (produced by `npm run build:renderer` in
// the desktop package) ships with relative asset paths. Loading from
// file:// fails silently if Vite was built without --base=./ — script
// tags resolve against the file:// origin and 404, leaving a blank
// screen with no visible error. Catching this at test time prevents
// shipping a broken Electron build.
//
// The test is conditional: if the bundle hasn't been produced (typical
// in dev / unit-test runs), it skips with a clear note rather than
// failing.

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const indexPath = path.join(repoRoot, 'desktop', 'dist-renderer', 'index.html');

describe('desktop bundle (dist-renderer)', () => {
  const exists = fs.existsSync(indexPath);

  it.skipIf(!exists)('uses relative asset paths so file:// loads work', () => {
    const html = fs.readFileSync(indexPath, 'utf8');

    // Catch absolute /assets/* references — these break under file://.
    // We only care about <script src=...> and <link href=...> attribute
    // values. A simple regex over those is enough; we don't need a full
    // HTML parser for this guarantee.
    const absoluteScripts = html.match(/<script[^>]*src="\/[^"]+/g) ?? [];
    const absoluteLinks = html.match(/<link[^>]*href="\/[^"]+/g) ?? [];

    expect(
      [...absoluteScripts, ...absoluteLinks],
      'desktop bundle contains absolute /assets paths — rebuild with `vite build --base=./`',
    ).toEqual([]);
  });

  it.skipIf(!exists)('contains the SPA mount point', () => {
    const html = fs.readFileSync(indexPath, 'utf8');
    expect(html).toMatch(/id="root"/);
  });

  it.skipIf(exists)('skipped — run `npm run build:renderer` in desktop/ to validate the bundle', () => {
    expect(true).toBe(true);
  });
});
