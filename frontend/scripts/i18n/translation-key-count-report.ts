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

/** Extract all leaf key-value pairs (string values only) */
function flattenToKeyValues(
  obj: unknown,
  prefix = ''
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  if (typeof obj === 'string') {
    if (prefix) out.push({ key: prefix, value: obj });
    return out;
  }
  if (!isPlainObject(obj)) return out;

  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out.push({ key: fullKey, value: v });
    } else if (isPlainObject(v)) {
      out.push(...flattenToKeyValues(v, fullKey));
    }
  }
  return out;
}

/** Heuristic: string looks like English (ASCII letters, common patterns) */
function looksLikeEnglish(value: string): boolean {
  if (!value || value.trim().length < 2) return false;
  const trimmed = value.trim();
  const letterChars = trimmed.replace(/[\s\d.,;:!?'"\-–—()[\]]/g, '');
  if (letterChars.length < 2) return false;
  const asciiLetters = letterChars.replace(/[^a-zA-Z]/g, '');
  const ratio = asciiLetters.length / letterChars.length;
  return ratio > 0.6;
}

/** Parse TS/JS object file to extract key-value pairs (regex-based, for when import fails) */
function parseKeyValuesFromFileContent(content: string): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const keyPath: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('}')) {
      if (keyPath.length > 0) keyPath.pop();
      continue;
    }
    const objStart = trimmed.match(/^(\w+)\s*:\s*\{/);
    if (objStart) {
      keyPath.push(objStart[1]);
      continue;
    }
    const kvDouble = trimmed.match(/^(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const kvSingle = trimmed.match(/^(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/);
    const kv = kvDouble || kvSingle;
    if (kv) {
      const fullKey = keyPath.length > 0 ? [...keyPath, kv[1]].join('.') : kv[1];
      out.push({ key: fullKey, value: kv[2].replace(/\\(.)/g, '$1') });
    }
  }
  return out;
}

async function loadModule(filePath: string): Promise<Record<string, unknown>> {
  const absolutePath = path.resolve(filePath);
  const url = pathToFileURL(absolutePath).href;
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
  keyValues?: Array<{ key: string; value: string }>;
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
  let keyValues: Array<{ key: string; value: string }> | undefined;
  if (lang !== 'en') {
    keyValues = flattenToKeyValues(data);
    if (keyValues.length === 0) {
      const content = await fs.readFile(filePath, 'utf8');
      keyValues = parseKeyValuesFromFileContent(content);
    }
  }

  return {
    dir: module.dir,
    base: module.base,
    filePath: path.relative(translationsDir, filePath),
    keyCount: keys.size,
    keys,
    keyValues,
  };
}

interface EnglishHardcodedEntry {
  filePath: string;
  module: string;
  key: string;
  value: string;
}

function generateMarkdownReport(
  lang: Lang,
  mismatches: { module: string; enCount: number; langCount: number; missingKeys: string[] }[],
  englishHardcoded: EnglishHardcodedEntry[] = []
): string {
  const langName = { en: 'English', ps: 'Pashto', fa: 'Farsi', ar: 'Arabic' }[lang];
  const totalMissing = mismatches.reduce((sum, m) => sum + m.missingKeys.length, 0);
  const totalModules = mismatches.length;

  let md = `# Translation Report: ${langName} (${lang})\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Modules with fewer keys than EN:** ${totalModules}\n`;
  md += `- **Total missing keys:** ${totalMissing}\n`;
  md += `- **Keys with English hardcoded values:** ${englishHardcoded.length}\n\n`;
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

  if (englishHardcoded.length > 0) {
    md += `\n---\n\n`;
    md += `## Keys with English Hardcoded Values (should be translated)\n\n`;

    // Summary table: group by file, count hardcoded entries
    const hardcodedByFileInReport = new Map<string, number>();
    for (const e of englishHardcoded) {
      hardcodedByFileInReport.set(e.filePath, (hardcodedByFileInReport.get(e.filePath) ?? 0) + 1);
    }
    const sortedFilesForSummary = [...hardcodedByFileInReport.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    md += `### Summary by File\n\n`;
    md += `| File | Module | Count |\n`;
    md += `|------|--------|-------|\n`;
    for (const [filePath, count] of sortedFilesForSummary) {
      const moduleName = englishHardcoded.find((e) => e.filePath === filePath)?.module ?? filePath;
      md += `| \`${filePath}\` | \`${moduleName}\` | ${count} |\n`;
    }
    md += `\n`;

    md += `### Detail (first 200)\n\n`;
    md += `| File | Key | Value |\n`;
    md += `|------|-----|-------|\n`;
    for (const e of englishHardcoded.slice(0, 200)) {
      const escaped = e.value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const preview = escaped.length > 60 ? escaped.slice(0, 57) + '...' : escaped;
      md += `| \`${e.filePath}\` | \`${e.key}\` | ${preview} |\n`;
    }
    if (englishHardcoded.length > 200) {
      md += `\n*... and ${englishHardcoded.length - 200} more. See translation-report-english-hardcoded.md for full list.*\n`;
    }
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

  const allEnglishHardcoded: EnglishHardcodedEntry[] = [];

  for (const compareLang of ['ps', 'fa', 'ar'] as const) {
    const mismatches: {
      module: string;
      enCount: number;
      langCount: number;
      missingKeys: string[];
    }[] = [];

    const englishHardcoded: EnglishHardcodedEntry[] = [];

    for (const [moduleKey, stats] of Object.entries(results)) {
      const enStats = stats.en;
      const langStats = stats[compareLang];
      if (!enStats || !langStats) continue;

      if (langStats.keyCount < enStats.keyCount) {
        const missingKeys = [...enStats.keys].filter((k) => !langStats.keys.has(k)).sort();
        mismatches.push({
          module: moduleKey.replace(/\\/g, '/'),
          enCount: enStats.keyCount,
          langCount: langStats.keyCount,
          missingKeys,
        });
      }

      if (langStats.keyValues) {
        for (const { key, value } of langStats.keyValues) {
          if (looksLikeEnglish(value)) {
            const entry: EnglishHardcodedEntry = {
              filePath: langStats.filePath.replace(/\\/g, '/'),
              module: moduleKey.replace(/\\/g, '/'),
              key,
              value,
            };
            englishHardcoded.push(entry);
            allEnglishHardcoded.push(entry);
          }
        }
      }
    }

    const md = generateMarkdownReport(compareLang, mismatches, englishHardcoded);
    const outPath = path.join(reportDir, `translation-report-${compareLang}.md`);
    await fs.writeFile(outPath, md, 'utf8');
    console.log(
      `[i18n:report] Wrote ${path.relative(cwd, outPath)} (${mismatches.length} modules with fewer keys, ${englishHardcoded.length} English hardcoded)`
    );
  }

  const hardcodedByFile = new Map<string, EnglishHardcodedEntry[]>();
  for (const e of allEnglishHardcoded) {
    const list = hardcodedByFile.get(e.filePath) ?? [];
    list.push(e);
    hardcodedByFile.set(e.filePath, list);
  }

  const sortedFiles = [...hardcodedByFile.entries()].sort((a, b) => b[1].length - a[1].length);

  let hardcodedMd = `# English Hardcoded in PS / FA / AR Translation Files\n\n`;
  hardcodedMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  hardcodedMd += `Files (ps, fa, ar) that contain string values which look like English instead of the target language.\n\n`;
  hardcodedMd += `## Summary\n\n`;
  hardcodedMd += `- **Total keys with English values:** ${allEnglishHardcoded.length}\n`;
  hardcodedMd += `- **Files affected:** ${hardcodedByFile.size}\n\n`;

  // Summary table: file, language, module, count (sorted by count desc)
  hardcodedMd += `## Summary by File\n\n`;
  hardcodedMd += `| File | Lang | Module | Count |\n`;
  hardcodedMd += `|------|------|--------|-------|\n`;
  for (const [filePath, entries] of sortedFiles) {
    const langTag = filePath.match(/\.(ps|fa|ar)\.ts$/)?.slice(1, 2).join().toUpperCase() ?? '?';
    const moduleName = entries[0]?.module ?? filePath;
    hardcodedMd += `| \`${filePath}\` | ${langTag} | \`${moduleName}\` | ${entries.length} |\n`;
  }
  hardcodedMd += `\n---\n\n`;
  hardcodedMd += `## By File\n\n`;

  const sortedFilesByName = [...hardcodedByFile.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [filePath, entries] of sortedFilesByName) {
    const langTag = filePath.match(/\.(ps|fa|ar)\.ts$/)?.slice(1, 2).join().toUpperCase() ?? '?';
    hardcodedMd += `### \`${filePath}\` (${langTag})\n\n`;
    hardcodedMd += `| Key | Value |\n|-----|-------|\n`;
    for (const e of entries) {
      const escaped = e.value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const preview = escaped.length > 80 ? escaped.slice(0, 77) + '...' : escaped;
      hardcodedMd += `| \`${e.key}\` | ${preview} |\n`;
    }
    hardcodedMd += `\n`;
  }

  const hardcodedPath = path.join(reportDir, 'translation-report-english-hardcoded.md');
  await fs.writeFile(hardcodedPath, hardcodedMd, 'utf8');
  console.log(`[i18n:report] Wrote ${path.relative(cwd, hardcodedPath)} (${allEnglishHardcoded.length} entries)`);

  const summaryPath = path.join(reportDir, 'translation-report-summary.md');
  const psHardcoded = allEnglishHardcoded.filter((e) => e.filePath.endsWith('.ps.ts')).length;
  const faHardcoded = allEnglishHardcoded.filter((e) => e.filePath.endsWith('.fa.ts')).length;
  const arHardcoded = allEnglishHardcoded.filter((e) => e.filePath.endsWith('.ar.ts')).length;
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
  summaryMd += `## English Hardcoded in Non-English Files\n\n`;
  summaryMd += `Keys with English values that should be translated:\n\n`;
  summaryMd += `| Language | Count | Report |\n|----------|-------|--------|\n`;
  summaryMd += `| Pashto (ps) | ${psHardcoded} | [translation-report-ps.md](./translation-report-ps.md) |\n`;
  summaryMd += `| Farsi (fa) | ${faHardcoded} | [translation-report-fa.md](./translation-report-fa.md) |\n`;
  summaryMd += `| Arabic (ar) | ${arHardcoded} | [translation-report-ar.md](./translation-report-ar.md) |\n`;
  summaryMd += `| **Total** | **${allEnglishHardcoded.length}** | [translation-report-english-hardcoded.md](./translation-report-english-hardcoded.md) |\n\n`;
  summaryMd += `---\n\n`;
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
