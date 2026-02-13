/**
 * Migration script: Split monolithic translation files into per-page structure.
 *
 * Creates:
 *   - shared/ - common, nav, toast, forms, validation, etc.
 *   - pages/{module}/ - one folder per feature with {module}.en.ts, .ps.ts, .fa.ts, .ar.ts
 *
 * Run:
 *   npm run i18n:migrate
 *
 * After migration, the main en.ts, ps.ts, fa.ts, ar.ts will import from the new structure.
 */

/// <reference types="node" />

import fs from 'fs/promises';
import path from 'path';

import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';

function loadTranslations() {
  return { en, ps, fa, ar };
}

/** Keys that stay in website/ - do not migrate */
const WEBSITE_KEYS = new Set(['aboutUs', 'landing', 'websitePublic', 'websiteManager', 'website', 'navWebsite']);

/**
 * Map: folder path (relative to translations/) -> array of top-level keys to extract.
 * Shared keys go to shared/, page keys go to pages/{name}/
 */
const FOLDER_MAPPING: Record<string, string[]> = {
  // Shared
  'shared/common': ['common'],
  'shared/nav': ['nav'],
  'shared/toast': ['toast'],
  'shared/forms': ['forms'],
  'shared/validation': ['validation'],
  'shared/pagination': ['pagination'],
  'shared/ui': ['ui'],
  'shared/errorBoundary': ['errorBoundary'],
  'shared/notFound': ['notFound'],
  'shared/footer': ['footer'],
  'shared/search': ['search'],
  'shared/privacyPolicy': ['privacyPolicy'],
  'shared/termsOfService': ['termsOfService'],
  'shared/resetPassword': ['resetPassword'],
  // Pages - group related keys
  'pages/academic': ['academic'],
  'pages/admissions': ['admissions'],
  'pages/activity-logs': ['activityLogs'],
  'pages/assets': ['assets'],
  'pages/attendance': ['attendance', 'attendancePage', 'attendanceReports', 'attendanceTotalsReport'],
  'pages/auth': ['auth'],
  'pages/certificates': ['certificates', 'certificateTemplates'],
  'pages/courses': ['courses'],
  'pages/dashboard': ['dashboard'],
  'pages/dms': ['dms'],
  'pages/events': ['events'],
  'pages/exams': [
    'examPaperPreview',
    'examPapers',
    'examReports',
    'exams',
    'examTypes',
  ],
  'pages/fees': ['fees'],
  'pages/finance': ['finance'],
  'pages/grades': ['grades'],
  'pages/guards': ['guards'],
  'pages/help-center': ['helpCenter'],
  'pages/hostel': ['hostel'],
  'pages/id-cards': ['idCards'],
  'pages/image-capture': ['imageCapture'],
  'pages/leave': ['leave'],
  'pages/library': ['library'],
  'pages/maintenance': ['maintenance'],
  'pages/onboarding': ['onboarding'],
  'pages/organizations': ['organizations'],
  'pages/permissions': ['permissions'],
  'pages/phone-book': ['phoneBook'],
  'pages/profile-management': ['profileManagement'],
  'pages/question-bank': ['questionBank'],
  'pages/reports': ['reports', 'reportTemplates'],
  'pages/roles': ['roles'],
  'pages/schools': ['schools'],
  'pages/settings': ['settings'],
  'pages/short-term-courses': ['shortTermCourses'],
  'pages/staff': ['staff'],
  'pages/student-report': ['studentReport', 'studentReportCard'],
  'pages/students': ['students'],
  'pages/student-history': ['studentHistory'],
  'pages/subscription': ['subscription'],
  'pages/subjects': ['subjects'],
  'pages/teacher-subject-assignments': ['teacherSubjectAssignments'],
  'pages/timetable': ['timetable'],
  'pages/user-management': ['userManagement'],
  'pages/user-permissions': ['userPermissions'],
  'pages/watermarks': ['watermarks'],
  'pages/graduation': ['graduation'],
  'pages/website-admin': ['websiteAdmin'],
  'pages/platform': ['platform', 'platformLandingOffers'],
  'pages/misc': [
    'status',
    'table',
    'buildings',
    'classes',
    'articleFound',
    'browseHelpCenter',
    'completionDate',
    'contextualHelp',
    'course',
    'courseDocuments',
    'deleteDocument',
    'deleteDocumentConfirm',
    'documentDescription',
    'documentTitle',
    'documentType',
    'errorLoading',
    'generateCertificate',
    'generated',
    'generating',
    'generatingReport',
    'goBack',
    'goHome',
    'message',
    'noArticleFound',
    'noDocuments',
    'pleaseWait',
    'reportGeneration',
    'size',
    'student',
    'title',
    'uploadDocument',
    'uploaded',
    'viewFullArticle',
    'failed',
  ],
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Serialize a value to TypeScript literal string */
function serializeToTS(value: unknown, indent = 0): string {
  if (value === null || value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (isPlainObject(value)) {
    const lines: string[] = [];
    const spaces = '  '.repeat(indent + 1);
    for (const [k, v] of Object.entries(value)) {
      const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : JSON.stringify(k);
      lines.push(`${spaces}${key}: ${serializeToTS(v, indent + 1)}`);
    }
    const closeSpaces = '  '.repeat(indent);
    return `{\n${lines.join(',\n')}\n${closeSpaces}}`;
  }
  return '{}';
}

/** Extract keys from source object into a new object */
function extractKeys(
  source: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

/** Get all top-level keys from the translation object (excluding website) */
function getAllTopLevelKeys(obj: Record<string, unknown>): Set<string> {
  const keys = new Set<string>();
  for (const key of Object.keys(obj)) {
    if (!WEBSITE_KEYS.has(key)) {
      keys.add(key);
    }
  }
  return keys;
}

/** Build the set of all keys we're migrating */
function getMigratedKeys(): Set<string> {
  const migrated = new Set<string>();
  for (const keys of Object.values(FOLDER_MAPPING)) {
    for (const k of keys) {
      migrated.add(k);
    }
  }
  return migrated;
}

async function createFolderStructure(translationsDir: string) {
  for (const folder of Object.keys(FOLDER_MAPPING)) {
    const fullPath = path.join(translationsDir, folder);
    await fs.mkdir(fullPath, { recursive: true });
  }
}

function getFileBaseName(folderPath: string): string {
  const base = path.basename(folderPath);
  if (folderPath.startsWith('shared/')) return base;
  const parts = base.split('-');
  return parts.map((s, i) => (i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))).join('');
}

async function writePageFile(
  translationsDir: string,
  folderPath: string,
  fileBaseName: string,
  lang: string,
  data: Record<string, unknown>
) {
  const folderName = path.basename(folderPath);
  const desc = folderPath.startsWith('shared/')
    ? `Shared ${folderName} translations`
    : `${folderName} page translations`;

  const serialized = serializeToTS(data);

  const content = `/**
 * ${desc} (${lang}).
 * Auto-generated by: scripts/i18n/migrate-to-page-structure.ts
 */

export default ${serialized};
`;

  const filePath = path.join(translationsDir, folderPath, `${fileBaseName}.${lang}.ts`);
  await fs.writeFile(filePath, content, 'utf8');
}

async function migrate() {
  const cwd = process.cwd();
  const translationsDir = path.resolve(cwd, 'src/lib/translations');

  console.log('[i18n:migrate] Loading translations...');
  const { en, ps, fa, ar } = loadTranslations();

  const allLangs = { en, ps, fa, ar } as const;
  const migratedKeys = getMigratedKeys();

  // Check for unmigrated keys
  const allKeys = getAllTopLevelKeys(en as Record<string, unknown>);
  const unmigrated = [...allKeys].filter((k) => !migratedKeys.has(k));
  if (unmigrated.length > 0) {
    console.warn('[i18n:migrate] Unmigrated keys (will remain in main file):', unmigrated.join(', '));
  }

  console.log('[i18n:migrate] Creating folder structure...');
  await createFolderStructure(translationsDir);

  const fileCounts = { created: 0 };

  for (const [folderPath, keys] of Object.entries(FOLDER_MAPPING)) {
    const fileBaseName = getFileBaseName(folderPath);

    let enExtracted = extractKeys(allLangs.en as Record<string, unknown>, keys);
    if (Object.keys(enExtracted).length === 0) continue;

    for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
      const source = allLangs[lang] as Record<string, unknown>;
      let extracted = extractKeys(source, keys);
      if (Object.keys(extracted).length === 0 && lang !== 'en') {
        extracted = { ...enExtracted };
      }

      await writePageFile(translationsDir, folderPath, fileBaseName, lang, extracted);
      fileCounts.created++;
    }
  }

  console.log(`[i18n:migrate] Created ${fileCounts.created} translation files.`);
  return { unmigrated, translationsDir };
}

function toImportName(folderPath: string): string {
  return folderPath
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/^shared_/, 'shared_')
    .replace(/^pages_/, 'pages_');
}

async function generateMergedFiles(translationsDir: string) {
  const langUpper: Record<string, string> = {
    en: 'En',
    ps: 'Ps',
    fa: 'Fa',
    ar: 'Ar',
  };

  for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
    const u = langUpper[lang];
    const imports: string[] = [
      `import { websitePublic${u} } from './website/public-${lang}';`,
      `import { websiteAdmin${u} } from './website/admin-${lang}';`,
      '',
    ];
    const spreads: string[] = [];

    for (const folderPath of Object.keys(FOLDER_MAPPING)) {
      const fileBaseName = getFileBaseName(folderPath);
      const importVar = toImportName(folderPath) + '_' + lang;
      imports.push(`import ${importVar} from './${folderPath}/${fileBaseName}.${lang}';`);
      spreads.push(`  ...${importVar},`);
    }

    const content = `/**
 * ${lang.toUpperCase()} translations - merged from per-page structure.
 * Auto-generated by: scripts/i18n/migrate-to-page-structure.ts
 * Source: shared/ and pages/ directory structure
 */

${imports.join('\n')}

export const ${lang} = {
  ...websitePublic${u},
${spreads.join('\n')}
  websiteManager: websiteAdmin${u}.websiteManager,
  website: websiteAdmin${u}.website,
};
`;

    const filePath = path.join(translationsDir, `${lang}.ts`);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`[i18n:migrate] Updated ${lang}.ts`);
  }
}

// Run migration
async function main() {
  console.log('[i18n:migrate] Starting migration...');
  const { translationsDir } = await migrate();

  console.log('[i18n:migrate] Generating merged en.ts, ps.ts, fa.ts, ar.ts...');
  await generateMergedFiles(translationsDir);

  console.log('[i18n:migrate] Done. Run "npm run i18n:keys:generate" to regenerate keys.');
}

main().catch((err) => {
  console.error('[i18n:migrate] Error:', err);
  process.exit(1);
});
