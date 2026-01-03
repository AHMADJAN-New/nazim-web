 
/**
 * Nazim Web - Prevent new translation debt (incremental).
 *
 * Checks `frontend/src` for:
 *  A) `t('...') || 'English'` style fallbacks
 *  B) `showToast.(success|error|info|warning|loading)('Hardcoded message')` (no dot-key)
 *
 * IMPORTANT: The repo currently contains legacy debt. This checker is baseline-based:
 * - It FAILS if counts increase vs baseline.
 * - Update baseline intentionally with: `npm run i18n:check:update-baseline`
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const TYPES = /** @type {const} */ ({
  T_FALLBACK: 't_fallback',
  TOAST_HARDCODED: 'toast_hardcoded',
});

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function walkFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      if (e.name.startsWith('.')) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) stack.push(full);
      if (e.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} content
 * @returns {{ tFallback: number; toastHardcoded: number; details: Array<{type: string; match: string; index: number}> }}
 */
function scanContent(content) {
  let tFallback = 0;
  let toastHardcoded = 0;
  /** @type {Array<{type: string; match: string; index: number}>} */
  const details = [];

  // A) t('...') ... ) || ...
  // NOTE: dotAll to handle multi-line JSX expressions.
  const tFallbackRe = /\bt\(\s*(["'`])[^"'`]+\1[\s\S]*?\)\s*\|\|/g;
  for (const m of content.matchAll(tFallbackRe)) {
    tFallback++;
    details.push({ type: TYPES.T_FALLBACK, match: m[0].slice(0, 160), index: m.index ?? 0 });
  }

  // B) showToast.success('...') where literal does NOT look like a translation key (no dot)
  const toastRe = /\bshowToast\.(success|error|info|warning|loading)\(\s*(["'`])([^"'`]+)\2/g;
  for (const m of content.matchAll(toastRe)) {
    const literal = m[3] ?? '';
    // allow translation keys like "toast.userCreated" (contains dot)
    if (literal.includes('.')) continue;
    toastHardcoded++;
    details.push({ type: TYPES.TOAST_HARDCODED, match: m[0].slice(0, 160), index: m.index ?? 0 });
  }

  return { tFallback, toastHardcoded, details };
}

/**
 * @param {string} content
 * @param {number} index
 */
function indexToLine(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * @param {string} baselinePath
 * @returns {Promise<null | { totals: { tFallback: number; toastHardcoded: number }; byFile: Record<string, { tFallback: number; toastHardcoded: number }> }>}
 */
async function readBaseline(baselinePath) {
  try {
    const raw = await fs.readFile(baselinePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const totals = parsed.totals;
    const byFile = parsed.byFile;
    if (!isPlainObject(totals) || !isPlainObject(byFile)) return null;
    return /** @type {any} */ (parsed);
  } catch {
    return null;
  }
}

/**
 * @param {string} baselinePath
 * @param {any} baseline
 */
async function writeBaseline(baselinePath, baseline) {
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(baselinePath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const updateBaseline = args.has('--update-baseline');

  const cwd = process.cwd(); // expected: .../frontend
  const srcRoot = path.resolve(cwd, 'src');
  const repoRoot = path.resolve(cwd, '..');
  const baselinePath = path.resolve(cwd, 'scripts/i18n/bad-patterns.baseline.json');

  const files = await walkFiles(srcRoot);

  /** @type {Record<string, { tFallback: number; toastHardcoded: number }>} */
  const byFile = {};
  let totalTFallback = 0;
  let totalToastHardcoded = 0;

  /** @type {Array<{ type: string; file: string; line: number; snippet: string }>} */
  const findings = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const scan = scanContent(content);
    if (scan.tFallback === 0 && scan.toastHardcoded === 0) continue;

    const rel = path.relative(repoRoot, file);
    byFile[rel] = { tFallback: scan.tFallback, toastHardcoded: scan.toastHardcoded };
    totalTFallback += scan.tFallback;
    totalToastHardcoded += scan.toastHardcoded;

    // keep a few details for display (cap per file)
    for (const d of scan.details.slice(0, 20)) {
      findings.push({
        type: d.type,
        file: rel,
        line: indexToLine(content, d.index),
        snippet: d.match.replace(/\s+/g, ' ').trim(),
      });
    }
  }

  const currentBaseline = {
    generatedAt: new Date().toISOString(),
    totals: {
      tFallback: totalTFallback,
      toastHardcoded: totalToastHardcoded,
    },
    byFile,
  };

  if (updateBaseline) {
    await writeBaseline(baselinePath, currentBaseline);
    console.log(`[i18n:check] Baseline updated at ${path.relative(cwd, baselinePath)}`);
    console.log(`[i18n:check] totals: tFallback=${totalTFallback}, toastHardcoded=${totalToastHardcoded}`);
    process.exit(0);
  }

  const baseline = await readBaseline(baselinePath);
  if (!baseline) {
    console.error(`[i18n:check] Missing baseline: ${path.relative(cwd, baselinePath)}`);
    console.error('[i18n:check] Run: npm run i18n:check:update-baseline');
    process.exit(2);
  }

  // Fail if totals increase OR any file's count increases (prevents moving debt around silently).
  let failed = false;

  const tFallbackDelta = totalTFallback - (baseline.totals?.tFallback ?? 0);
  const toastDelta = totalToastHardcoded - (baseline.totals?.toastHardcoded ?? 0);
  if (tFallbackDelta > 0 || toastDelta > 0) failed = true;

  for (const [file, counts] of Object.entries(byFile)) {
    const prev = baseline.byFile?.[file] ?? { tFallback: 0, toastHardcoded: 0 };
    if ((counts.tFallback ?? 0) > (prev.tFallback ?? 0)) failed = true;
    if ((counts.toastHardcoded ?? 0) > (prev.toastHardcoded ?? 0)) failed = true;
  }

  if (!failed) {
    console.log(
      `[i18n:check] OK: totals (tFallback=${totalTFallback}, toastHardcoded=${totalToastHardcoded}) did not increase vs baseline`
    );
    process.exit(0);
  }

  console.error('[i18n:check] FAIL: New translation-debt patterns introduced (increase vs baseline).');
  console.error('');
  console.error(`Current totals: tFallback=${totalTFallback}, toastHardcoded=${totalToastHardcoded}`);
  console.error(`Baseline totals: tFallback=${baseline.totals?.tFallback ?? 0}, toastHardcoded=${baseline.totals?.toastHardcoded ?? 0}`);
  console.error('');
  console.error('Sample findings (first 50):');
  for (const f of findings.slice(0, 50)) {
    console.error(`- ${f.type} ${f.file}:${f.line}  ${f.snippet}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('[i18n:check] Unhandled error:', err);
  process.exit(1);
});


