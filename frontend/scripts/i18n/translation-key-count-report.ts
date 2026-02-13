/**
 * Translation Key Count Report
 *
 * Compares key counts across en, ps, fa, ar for each translation module.
 * Generates MD reports for languages that have fewer keys than English.
 *
 * Run:
 *   npm run i18n:report
 */

/// <reference types="node" />

import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'node:url';

const LANGUAGES = ['en', 'ps', 'fa', 'ar'] as const;
type Lang = (typeof LANGUAGES)[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Flatten object to dot-notation keys, return set of leaf keys */
function flattenToKeys(obj: unknown, prefix = ''): Set<string> {
  const keys = new Set<string>();
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    if (prefix) keys.add(prefix);
    return keys;
  }
  if (!isPlainObject(obj)) return keys;

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      keys.add(fullKey);
    } else if (isPlainObject(v)) {
      flattenToKeys(v, fullKey).forEach((key) => keys.add(key));
    }
  }
  return keys;
}

async function loadModule(filePath: string): Promise<Record<string, unknown>> {
  const url = pathToFileURL(filePath).href;
  const mod = await import(url);
  const data = mod.default;
  return isPlainObject(data) ? data : {};
}

async function findTranslationModules(translationsDir: string): Promise<{ dir: string; base: string }[]> {
  const modules: { dir: string; base: string }[] = [];

  for (const subdir of ['shared', 'pages']) {
    const subPath = path.join(translationsDir, subdir);
    try {
      const entries = await fs.readdir(subPath, { withFileTypes: true });
      for (const dent of entries) {
        if (!dent.isDirectory()) continue;
        const dirPath = path.join(subPath, dent.name);
        const files = await fs.readdir(dirPath);
        const enFile = files.find((f) => f.endsWith('.en.ts'));
        if (enFile) {
          const base = enFile.replace('.en.ts', '');
          modules.push({ dir: path.join(subdir, dent.name), base });
        }
      }
    } catch {
      // skip if dir doesn't exist
    }
  }

  return modules.sort((a, b) => a.dir.localeCompare(b.dir));
}

interface ModuleStats {
  dir: string;
  base: string;
  filePath: string;
  keyCount: number;
  keys: Set<string>;
}

async function analyzeModule(
  translationsDir: string,
  module: { dir: string; base: string },
  lang: Lang
): Promise<ModuleStats | null> {
  const filePath = path.join(translationsDir, module.dir, `${module.base}.${lang}.ts`);
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }

  const data = await loadModule(filePath);
  const keys = flattenToKeys(data);

  return {
    dir: module.dir,
    base: module.base,
    filePath: path.relative(translationsDir, filePath),
    keyCount: keys.size,
    keys,
  };
}

function generateMarkdownReport(
  lang: Lang,
  mismatches: { module: string; enCount: number; langCount: number; missingKeys: string[] }[]
): string {
  const langName = { en: 'English', ps: 'Pashto', fa: 'Farsi', ar: 'Arabic' }[lang];
  const totalMissing = mismatches.reduce((sum, m) => sum + m.missingKeys.length, 0);
  const totalModules = mismatches.length;

  let md = `# Translation Report: ${langName} (${lang})\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Modules with fewer keys than EN:** ${totalModules}\n`;
  md += `- **Total missing keys:** ${totalMissing}\n\n`;
  md += `---\n\n`;
  md += `## Files with Missing Keys\n\n`;
  md += `| Module | EN Keys | ${lang.toUpperCase()} Keys | Missing | Diff |\n`;
  md += `|--------|---------|-------------|---------|------|\n`;

  for (const m of mismatches) {
    const missingCount = m.missingKeys.length;
    const diff = m.enCount - m.langCount;
    md += `| \`${m.module}\` | ${m.enCount} | ${m.langCount} | ${missingCount} | -${diff} |\n`;
  }

  md += `\n---\n\n`;
  md += `## Missing Keys by Module\n\n`;

  for (const m of mismatches) {
    if (m.missingKeys.length === 0) continue;
    md += `### \`${m.module}\`\n\n`;
    md += `**Missing ${m.missingKeys.length} key(s):**\n\n`;
    for (const key of m.missingKeys.slice(0, 50)) {
      md += `- \`${key}\`\n`;
    }
    if (m.missingKeys.length > 50) {
      md += `- ... and ${m.missingKeys.length - 50} more\n`;
    }
    md += `\n`;
  }

  return md;
}

async function main() {
  const cwd = process.cwd();
  const translationsDir = path.resolve(cwd, 'src/lib/translations');
  const reportDir = path.resolve(cwd, 'scripts/i18n/reports');

  console.log('[i18n:report] Scanning translation modules...');
  const modules = await findTranslationModules(translationsDir);
  console.log(`[i18n:report] Found ${modules.length} modules`);

  const results: Record<string, Partial<Record<Lang, ModuleStats>>> = {};

  for (const module of modules) {
    const moduleKey = `${module.dir}/${module.base}`;
    results[moduleKey] = {};
    for (const lang of LANGUAGES) {
      const stats = await analyzeModule(translationsDir, module, lang);
      if (stats) results[moduleKey][lang] = stats;
    }
  }

  await fs.mkdir(reportDir, { recursive: true });

  for (const compareLang of ['ps', 'fa', 'ar'] as const) {
    const mismatches: {
      module: string;
      enCount: number;
      langCount: number;
      missingKeys: string[];
    }[] = [];

    for (const [moduleKey, stats] of Object.entries(results)) {
      const enStats = stats.en;
      const langStats = stats[compareLang];
      if (!enStats || !langStats) continue;
      if (langStats.keyCount >= enStats.keyCount) continue;

      const missingKeys = [...enStats.keys].filter((k) => !langStats.keys.has(k)).sort();

      mismatches.push({
        module: moduleKey.replace(/\\/g, '/'),
        enCount: enStats.keyCount,
        langCount: langStats.keyCount,
        missingKeys,
      });
    }

    const md = generateMarkdownReport(compareLang, mismatches);
    const outPath = path.join(reportDir, `translation-report-${compareLang}.md`);
    await fs.writeFile(outPath, md, 'utf8');
    console.log(`[i18n:report] Wrote ${path.relative(cwd, outPath)} (${mismatches.length} modules with fewer keys)`);
  }

  const summaryPath = path.join(reportDir, 'translation-report-summary.md');
  const allMismatches = new Map<string, { ps: number; fa: number; ar: number }>();
  const norm = (s: string) => s.replace(/\\/g, '/');
  for (const [moduleKey, stats] of Object.entries(results)) {
    const enCount = stats.en?.keyCount ?? 0;
    const psCount = stats.ps?.keyCount ?? 0;
    const faCount = stats.fa?.keyCount ?? 0;
    const arCount = stats.ar?.keyCount ?? 0;
    if (psCount < enCount || faCount < enCount || arCount < enCount) {
      allMismatches.set(norm(moduleKey), {
        ps: enCount - psCount,
        fa: enCount - faCount,
        ar: enCount - arCount,
      });
    }
  }

  let summaryMd = `# Translation Key Count Summary\n\n`;
  summaryMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  summaryMd += `## Modules Where Any Language Has Fewer Keys Than EN\n\n`;
  summaryMd += `| Module | EN | PS | FA | AR | PS Diff | FA Diff | AR Diff |\n`;
  summaryMd += `|--------|-----|-----|-----|-----|---------|---------|---------|\n`;

  for (const [moduleKey, stats] of Object.entries(results)) {
    const key = norm(moduleKey);
    const enCount = stats.en?.keyCount ?? 0;
    const psCount = stats.ps?.keyCount ?? 0;
    const faCount = stats.fa?.keyCount ?? 0;
    const arCount = stats.ar?.keyCount ?? 0;
    const psDiff = enCount - psCount;
    const faDiff = enCount - faCount;
    const arDiff = enCount - arCount;
    if (psDiff > 0 || faDiff > 0 || arDiff > 0) {
      summaryMd += `| \`${key}\` | ${enCount} | ${psCount} | ${faCount} | ${arCount} | ${psDiff > 0 ? `-${psDiff}` : '✓'} | ${faDiff > 0 ? `-${faDiff}` : '✓'} | ${arDiff > 0 ? `-${arDiff}` : '✓'} |\n`;
    }
  }

  await fs.writeFile(summaryPath, summaryMd, 'utf8');
  console.log(`[i18n:report] Wrote ${path.relative(cwd, summaryPath)}`);
  console.log('[i18n:report] Done.');
}

main().catch((err) => {
  console.error('[i18n:report] Error:', err);
  process.exit(1);
});
