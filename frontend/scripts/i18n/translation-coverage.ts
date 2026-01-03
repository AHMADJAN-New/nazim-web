 
/**
 * Nazim Web - Translation Coverage Report
 *
 * Loads existing translation objects (en/ps/fa/ar), flattens them to dot-keys,
 * scans code for used `t('...')` keys, and outputs:
 *  - ../translation-coverage.md
 *  - ../translation-coverage.json
 *
 * CI mode:
 *   tsx scripts/i18n/translation-coverage.ts --ci
 *
 * CI behavior (incremental, no massive rewrites required):
 * - If a baseline exists at `scripts/i18n/coverage.baseline.json`,
 *   CI fails when "missing used keys" increases vs baseline.
 * - You can override with `I18N_COVERAGE_CI_MAX_MISSING_USED=<number>`
 *   to enforce an absolute cap.
 */

/// <reference types="node" />

import fs from 'fs/promises';
import path from 'path';

import { ar } from '../../src/lib/translations/ar';
import { en } from '../../src/lib/translations/en';
import { fa } from '../../src/lib/translations/fa';
import { ps } from '../../src/lib/translations/ps';

type Lang = 'en' | 'ps' | 'fa' | 'ar';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenToDotKeys(obj: unknown): Set<string> {
  const out = new Set<string>();

  function walk(value: unknown, prefix: string) {
    if (typeof value === 'string') {
      if (prefix) out.add(prefix);
      return;
    }
    if (!isPlainObject(value)) return;

    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      walk(v, next);
    }
  }

  walk(obj, '');
  return out;
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [dir];

  while (stack.length) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      if (e.name.startsWith('.')) continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (e.isFile()) {
        if (full.endsWith('.ts') || full.endsWith('.tsx')) {
          out.push(full);
        }
      }
    }
  }

  return out;
}

function extractLiteralTKeys(source: string): string[] {
  // Capture: t('some.key'), t("some.key"), t(`some.key`)
  // Ignore dynamic template literals like t(`x.${y}`)
  const re = /\bt\(\s*(["'`])([^"'`]+)\1/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const key = m[2];
    if (!key) continue;
    if (key.includes('${')) continue;
    // Nazim translation keys are dot-paths (e.g. "common.save").
    // Filtering out non-dot strings avoids false-positives from other `t()` usages.
    if (!key.includes('.')) continue;
    keys.push(key);
  }
  return keys;
}

function topNamespaces(keys: Iterable<string>, limit: number): Array<{ namespace: string; count: number }> {
  const counts = new Map<string, number>();
  for (const k of keys) {
    const ns = k.split('.')[0] || '(root)';
    counts.set(ns, (counts.get(ns) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([namespace, count]) => ({ namespace, count }));
}

function firstN(keys: string[], n: number): string[] {
  return keys.slice(0, n);
}

function toSortedArray(set: Set<string>): string[] {
  return [...set].sort((a, b) => a.localeCompare(b));
}

type CoverageJson = {
  generatedAt: string;
  repoRoot: string;
  languages: Record<Lang, { totalKeys: number }>;
  totals: {
    enKeys: number;
    usedKeys: number;
    usedKeysPresentInEn: number;
    usedKeysMissingInEn: number;
    missingInPsFromEn: number;
    missingInFaFromEn: number;
    missingInArFromEn: number;
    driftPsNotInEn: number;
    driftFaNotInEn: number;
    driftArNotInEn: number;
    missingUsedPs: number;
    missingUsedFa: number;
    missingUsedAr: number;
    missingUsedTotal: number;
  };
  missing: {
    psFromEn: string[];
    faFromEn: string[];
    arFromEn: string[];
    driftPsNotInEn: string[];
    driftFaNotInEn: string[];
    driftArNotInEn: string[];
    usedMissingInEn: string[];
    usedMissingPs: string[];
    usedMissingFa: string[];
    usedMissingAr: string[];
  };
  stats: {
    topNamespacesMissingUsed: Array<{ namespace: string; count: number }>;
    topFilesMissingUsed: Array<{ file: string; count: number }>;
  };
};

async function readBaseline(baselinePath: string): Promise<{ missingUsedTotal: number } | null> {
  try {
    const raw = await fs.readFile(baselinePath, 'utf8');
    const parsed = JSON.parse(raw) as { missingUsedTotal?: number };
    if (typeof parsed.missingUsedTotal === 'number') return { missingUsedTotal: parsed.missingUsedTotal };
    return null;
  } catch {
    return null;
  }
}

async function writeBaseline(baselinePath: string, missingUsedTotal: number): Promise<void> {
  const payload = {
    generatedAt: new Date().toISOString(),
    missingUsedTotal,
  };
  await fs.mkdir(path.dirname(baselinePath), { recursive: true });
  await fs.writeFile(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const isCi = args.has('--ci');
  const shouldUpdateBaseline = args.has('--update-baseline');

  const cwd = process.cwd(); // expected: .../frontend
  const repoRoot = path.resolve(cwd, '..');
  const srcRoot = path.resolve(cwd, 'src');

  const keysEn = flattenToDotKeys(en);
  const keysPs = flattenToDotKeys(ps);
  const keysFa = flattenToDotKeys(fa);
  const keysAr = flattenToDotKeys(ar);

  const missingPsFromEn = new Set([...keysEn].filter((k) => !keysPs.has(k)));
  const missingFaFromEn = new Set([...keysEn].filter((k) => !keysFa.has(k)));
  const missingArFromEn = new Set([...keysEn].filter((k) => !keysAr.has(k)));

  const driftPsNotInEn = new Set([...keysPs].filter((k) => !keysEn.has(k)));
  const driftFaNotInEn = new Set([...keysFa].filter((k) => !keysEn.has(k)));
  const driftArNotInEn = new Set([...keysAr].filter((k) => !keysEn.has(k)));

  // Scan code usage
  const files = await walkFiles(srcRoot);
  const usedKeys = new Set<string>();
  const usedKeysByFile = new Map<string, Set<string>>();

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const keys = extractLiteralTKeys(content);
    if (keys.length === 0) continue;
    const set = new Set(keys);
    usedKeysByFile.set(file, set);
    for (const k of set) usedKeys.add(k);
  }

  const usedMissingInEn = new Set([...usedKeys].filter((k) => !keysEn.has(k)));
  const usedKeysPresentInEn = new Set([...usedKeys].filter((k) => keysEn.has(k)));

  const missingUsedPs = new Set([...usedKeysPresentInEn].filter((k) => !keysPs.has(k)));
  const missingUsedFa = new Set([...usedKeysPresentInEn].filter((k) => !keysFa.has(k)));
  const missingUsedAr = new Set([...usedKeysPresentInEn].filter((k) => !keysAr.has(k)));

  const missingUsedUnion = new Set<string>([
    ...missingUsedPs,
    ...missingUsedFa,
    ...missingUsedAr,
  ]);

  // Top namespaces (missing-used)
  const topNs = topNamespaces(missingUsedUnion, 20);

  // Top files (missing-used total across ps/fa/ar)
  const perFileCounts: Array<{ file: string; count: number }> = [];
  for (const [file, ks] of usedKeysByFile.entries()) {
    let count = 0;
    for (const k of ks) {
      if (!keysEn.has(k)) continue; // prioritize used keys that exist in EN
      if (!keysPs.has(k)) count++;
      if (!keysFa.has(k)) count++;
      if (!keysAr.has(k)) count++;
    }
    if (count > 0) perFileCounts.push({ file: path.relative(repoRoot, file), count });
  }
  perFileCounts.sort((a, b) => b.count - a.count);

  const json: CoverageJson = {
    generatedAt: new Date().toISOString(),
    repoRoot,
    languages: {
      en: { totalKeys: keysEn.size },
      ps: { totalKeys: keysPs.size },
      fa: { totalKeys: keysFa.size },
      ar: { totalKeys: keysAr.size },
    },
    totals: {
      enKeys: keysEn.size,
      usedKeys: usedKeys.size,
      usedKeysPresentInEn: usedKeysPresentInEn.size,
      usedKeysMissingInEn: usedMissingInEn.size,
      missingInPsFromEn: missingPsFromEn.size,
      missingInFaFromEn: missingFaFromEn.size,
      missingInArFromEn: missingArFromEn.size,
      driftPsNotInEn: driftPsNotInEn.size,
      driftFaNotInEn: driftFaNotInEn.size,
      driftArNotInEn: driftArNotInEn.size,
      missingUsedPs: missingUsedPs.size,
      missingUsedFa: missingUsedFa.size,
      missingUsedAr: missingUsedAr.size,
      missingUsedTotal: missingUsedPs.size + missingUsedFa.size + missingUsedAr.size,
    },
    missing: {
      psFromEn: toSortedArray(missingPsFromEn),
      faFromEn: toSortedArray(missingFaFromEn),
      arFromEn: toSortedArray(missingArFromEn),
      driftPsNotInEn: toSortedArray(driftPsNotInEn),
      driftFaNotInEn: toSortedArray(driftFaNotInEn),
      driftArNotInEn: toSortedArray(driftArNotInEn),
      usedMissingInEn: toSortedArray(usedMissingInEn),
      usedMissingPs: toSortedArray(missingUsedPs),
      usedMissingFa: toSortedArray(missingUsedFa),
      usedMissingAr: toSortedArray(missingUsedAr),
    },
    stats: {
      topNamespacesMissingUsed: topNs,
      topFilesMissingUsed: perFileCounts.slice(0, 20),
    },
  };

  // Markdown output
  const mdLines: string[] = [];
  mdLines.push('# Translation Coverage Report');
  mdLines.push('');
  mdLines.push(`Generated: ${json.generatedAt}`);
  mdLines.push('');
  mdLines.push('## Summary');
  mdLines.push('');
  mdLines.push(`- EN keys: **${json.totals.enKeys}**`);
  mdLines.push(`- Used keys (code scan): **${json.totals.usedKeys}**`);
  mdLines.push(`- Used keys missing in EN (likely typos/dynamic): **${json.totals.usedKeysMissingInEn}**`);
  mdLines.push('');
  mdLines.push('## Missing (from EN)');
  mdLines.push('');
  mdLines.push(`- Missing in Pashto (ps): **${json.totals.missingInPsFromEn}**`);
  mdLines.push(`- Missing in Farsi (fa): **${json.totals.missingInFaFromEn}**`);
  mdLines.push(`- Missing in Arabic (ar): **${json.totals.missingInArFromEn}**`);
  mdLines.push('');
  mdLines.push('## Missing USED keys (highest priority)');
  mdLines.push('');
  mdLines.push(`- Missing USED in ps: **${json.totals.missingUsedPs}**`);
  mdLines.push(`- Missing USED in fa: **${json.totals.missingUsedFa}**`);
  mdLines.push(`- Missing USED in ar: **${json.totals.missingUsedAr}**`);
  mdLines.push('');
  mdLines.push('## Top 20 namespaces with missing USED keys (union across ps/fa/ar)');
  mdLines.push('');
  for (const row of json.stats.topNamespacesMissingUsed) {
    mdLines.push(`- ${row.namespace}: ${row.count}`);
  }
  mdLines.push('');
  mdLines.push('## Top 20 files by missing USED keys (ps+fa+ar summed)');
  mdLines.push('');
  for (const row of json.stats.topFilesMissingUsed) {
    mdLines.push(`- ${row.file}: ${row.count}`);
  }
  mdLines.push('');
  mdLines.push('## Missing in Pashto (ps) — Highest Priority (first 100 keys)');
  mdLines.push('');
  for (const k of firstN(json.missing.usedMissingPs, 100)) mdLines.push(`- ${k}`);
  mdLines.push('');
  mdLines.push('## Missing in Farsi (fa) — Highest Priority (first 100 keys)');
  mdLines.push('');
  for (const k of firstN(json.missing.usedMissingFa, 100)) mdLines.push(`- ${k}`);
  mdLines.push('');
  mdLines.push('## Missing in Arabic (ar) — Highest Priority (first 100 keys)');
  mdLines.push('');
  for (const k of firstN(json.missing.usedMissingAr, 100)) mdLines.push(`- ${k}`);
  mdLines.push('');
  if (json.missing.usedMissingInEn.length > 0) {
    mdLines.push('## Used keys missing in EN (likely typos/dynamic) — first 100');
    mdLines.push('');
    for (const k of firstN(json.missing.usedMissingInEn, 100)) mdLines.push(`- ${k}`);
    mdLines.push('');
  }

  const outMd = path.resolve(repoRoot, 'translation-coverage.md');
  const outJson = path.resolve(repoRoot, 'translation-coverage.json');
  await fs.writeFile(outMd, mdLines.join('\n') + '\n', 'utf8');
  await fs.writeFile(outJson, JSON.stringify(json, null, 2) + '\n', 'utf8');

  console.log(`[i18n:coverage] Wrote ${path.relative(repoRoot, outMd)}`);
  console.log(`[i18n:coverage] Wrote ${path.relative(repoRoot, outJson)}`);

  const baselinePath = path.resolve(cwd, 'scripts/i18n/coverage.baseline.json');

  if (shouldUpdateBaseline) {
    await writeBaseline(baselinePath, json.totals.missingUsedTotal);
    console.log(`[i18n:coverage] Updated baseline at ${path.relative(cwd, baselinePath)}`);
  }

  if (isCi) {
    const envMaxRaw = process.env.I18N_COVERAGE_CI_MAX_MISSING_USED;
    const envMax = envMaxRaw !== undefined ? Number(envMaxRaw) : undefined;
    if (envMaxRaw !== undefined && Number.isNaN(envMax)) {
      console.error('[i18n:coverage] Invalid I18N_COVERAGE_CI_MAX_MISSING_USED value');
      process.exit(2);
    }

    const baseline = await readBaseline(baselinePath);
    const baselineMax = baseline?.missingUsedTotal;
    const maxAllowed = envMax !== undefined ? envMax : baselineMax ?? 0;

    if (json.totals.missingUsedTotal > maxAllowed) {
      console.error(
        `[i18n:coverage] FAIL: missingUsedTotal=${json.totals.missingUsedTotal} exceeds maxAllowed=${maxAllowed}`
      );
      process.exit(1);
    }

    console.log(
      `[i18n:coverage] OK (ci): missingUsedTotal=${json.totals.missingUsedTotal} <= maxAllowed=${maxAllowed}`
    );
  }
}

main().catch((err) => {
  console.error('[i18n:coverage] Unhandled error:', err);
  process.exit(1);
});


