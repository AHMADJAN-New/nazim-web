#!/usr/bin/env tsx

/**
 * Script to remove specific translation keys from all translation files
 * 
 * Usage:
 * 1. Add keys to the KEYS_TO_REMOVE array below
 * 2. Run: npm run i18n:remove-specific
 * 3. Review changes: git diff
 * 4. Test the application
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');
const TRANSLATIONS_DIR = path.join(FRONTEND_DIR, 'src', 'lib', 'translations');
const TYPES_FILE = path.join(TRANSLATIONS_DIR, 'types.ts');
const BACKUP_DIR = path.join(REPO_ROOT, 'translation-backups');

type Language = 'en' | 'ps' | 'fa' | 'ar';

// Import translation files
import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';

/**
 * ============================================
 * ADD YOUR KEYS TO REMOVE HERE
 * ============================================
 * 
 * Add translation keys (one per line) that you want to remove.
 * Keys should be in dot-notation format (e.g., 'subjects.view', 'attendance.title')
 */
const KEYS_TO_REMOVE: string[] = [
  // Example keys (replace with your actual keys):
  // 'subjects.veryStrong',
  // 'subjects.view',
  // 'subjects.viewAll',
  // 'subjects.viewDetails',
  // 'subjects.weak',
  // 'subjects.years',
  // 'subjects.yes',
  // 'summary.approvedBatches',
  // 'summary.draftBatches',
  // 'summary.issuedBatches',
  // 'summary.totalBatches',
  // 'table.needsReview',
  
  // Add your keys here:
  'attendance.excludeLeaves',
  'attendance.requireAttendance',
  'attendance.title',
  'batches.description',
  'classes.class',
  'classes.classes',
  'classes.selectClass',
  'classes.selectClassFirst',
  'dashboard.certificatesThisYear',
  'dashboard.createBatch',
  'dashboard.createBatchDesc',
  'dashboard.currentYearBatches',
  'dashboard.issuedCertificates',
  'dashboard.issuedCertificatesDesc',
  'dashboard.noPendingApprovals',
  'dashboard.noSchools',
  'dashboard.pendingApprovals',
  'dashboard.recentBatches',
  'dashboard.selectSchool',
  'dashboard.upcomingGraduations',
  'dashboard.viewTemplates',
  'dashboard.viewTemplatesDesc',
  'dms.issueLetter',
  'documentTypes.bankStatement',
  'documentTypes.budget',
  'documentTypes.invoice',
  'documentTypes.other',
  'documentTypes.receipt',
  'documentTypes.report',
  'documentTypes.taxDocument',
  'documentTypes.voucher',
  'events.common',
  'events.fillAllFields',
  'events.notifications',
  'events.submit',
  'events.userCreated',
  'events.userDeleteFailed',
  'events.userDeleted',
  'events.userUpdateFailed',
  'events.userUpdated',
  'examReports.studentNotEnrolled',
  'exams.allClasses',
  'exams.equalWeights',
  'exams.fatherName',
  'exams.filterByStatus',
  'exams.markAttendance',
  'exams.notFound',
  'exams.reports',
  'exams.searchPlaceholder',
  'exams.selectClass',
  'exams.status',
  'exams.totalWeight',
  'exams.weights',
  'fees.defaulters',
  'fees.studentFees',
  'filters.dateFrom',
  'filters.dateTo',
  'filters.searchPlaceholder',
  'filters.status',
  'finance.assetsIncludedInBalance',
  'finance.categoryCode',
  'graduation.description',
  'helpCenter.title',
  'idCards.assignment.assignmentPanel.assignButton',
  'idCards.assignment.assignmentPanel.assigning',
  'idCards.assignment.assignmentPanel.bulkAssign',
  'idCards.assignment.assignmentPanel.cardFee',
  'idCards.assignment.assignmentPanel.cardFeeOptional',
  'idCards.assignment.assignmentPanel.selectedStudents',
  'idCards.assignment.assignmentPanel.templateSelection',
  'idCards.assignment.assignmentPanel.title',
  'idCards.assignment.filters.academicYear',
  'idCards.assignment.filters.academicYearRequired',
  'idCards.assignment.filters.active',
  'idCards.assignment.filters.allClasses',
  'idCards.assignment.filters.allStatuses',
  'idCards.assignment.filters.allTemplates',
  'idCards.assignment.filters.class',
  'idCards.assignment.filters.enrollmentStatus',
  'idCards.assignment.filters.search',
  'idCards.assignment.filters.searchPlaceholder',
  'idCards.assignment.filters.template',
  'idCards.assignment.managementTable.actions',
  'idCards.assignment.managementTable.admissionNumber',
  'idCards.assignment.managementTable.bulkActions',
  'idCards.assignment.managementTable.class',
  'idCards.assignment.managementTable.delete',
  'idCards.assignment.managementTable.edit',
  'idCards.assignment.managementTable.exportSelected',
  'idCards.assignment.managementTable.feeStatus',
  'idCards.assignment.managementTable.markFeePaid',
  'idCards.assignment.managementTable.markPrinted',
  'idCards.assignment.managementTable.markSelectedFeePaid',
  'idCards.assignment.managementTable.markSelectedPrinted',
  'idCards.assignment.managementTable.noCardsFound',
  'idCards.assignment.managementTable.printedStatus',
  'idCards.assignment.managementTable.studentName',
  'idCards.assignment.managementTable.template',
  'idCards.assignment.managementTable.title',
  'idCards.assignment.preview.back',
  'idCards.assignment.preview.front',
  'idCards.assignment.preview.selectStudent',
  'idCards.assignment.preview.side',
  'idCards.assignment.preview.title',
  'idCards.assignment.studentList.deselectAll',
  'idCards.assignment.studentList.noStudentsFound',
  'idCards.assignment.studentList.of',
  'idCards.assignment.studentList.selectAll',
  'idCards.assignment.studentList.showing',
  'idCards.assignment.studentList.students',
  'idCards.assignment.studentList.title',
  'idCards.assignment.subtitle',
  'idCards.assignment.title',
  'idCards.export',
  'idCards.export.actions.exportAllFiltered',
  'idCards.export.actions.exportIndividual',
  'idCards.export.actions.exportSelected',
  'idCards.export.actions.exporting',
  'idCards.export.filters.academicYear',
  'idCards.export.filters.academicYearRequired',
  'idCards.export.filters.active',
  'idCards.export.filters.all',
  'idCards.export.filters.allClasses',
  'idCards.export.filters.allStatuses',
  'idCards.export.filters.allTemplates',
  'idCards.export.filters.class',
  'idCards.export.filters.dateRange',
  'idCards.export.filters.enrollmentStatus',
  'idCards.export.filters.feeStatus',
  'idCards.export.filters.from',
  'idCards.export.filters.paid',
  'idCards.export.filters.printed',
  'idCards.export.filters.printedStatus',
  'idCards.export.filters.search',
  'idCards.export.filters.searchPlaceholder',
  'idCards.export.filters.template',
  'idCards.export.filters.to',
  'idCards.export.filters.unpaid',
  'idCards.export.filters.unprinted',
  'idCards.export.options.backOnly',
  'idCards.export.options.bothSides',
  'idCards.export.options.cardSides',
  'idCards.export.options.cardsPerPage',
  'idCards.export.options.exportFormat',
  'idCards.export.options.fileNaming',
  'idCards.export.options.frontOnly',
  'idCards.export.options.high',
  'idCards.export.options.includeUnpaid',
  'idCards.export.options.includeUnprinted',
  'idCards.export.options.quality',
  'idCards.export.options.singlePdf',
  'idCards.export.options.standard',
  'idCards.export.options.title',
  'idCards.export.options.zipPdf',
  'idCards.export.options.zipPng',
  'idCards.export.statistics.feePaid',
  'idCards.export.statistics.feeUnpaid',
  'idCards.export.statistics.printed',
  'idCards.export.statistics.title',
  'idCards.export.statistics.totalCards',
  'idCards.export.statistics.totalFeeCollected',
  'idCards.export.statistics.totalFeePending',
  'idCards.export.statistics.unprinted',
  'idCards.export.studentSelection.clearSelection',
  'idCards.export.studentSelection.deselectAll',
  'idCards.export.studentSelection.noStudentsFound',
  'idCards.export.studentSelection.selectAll',
  'idCards.export.studentSelection.selectByClass',
  'idCards.export.studentSelection.selectByStatus',
  'idCards.export.studentSelection.selectedCount',
  'idCards.export.studentSelection.title',
  'idCards.export.subtitle',
  'idCards.export.title',
  'idCards.status',
  'idCards.title',
  'noBatches.description',
  'noBatches.title',
  'questionBank.difficulty',
  'subjects.actions',
  'subjects.active',
  'subjects.add',
  'subjects.address',
  'subjects.allAcademicYears',
  'subjects.approve',
  'subjects.auditLog',
  'subjects.autoGenerated',
  'subjects.back',
  'subjects.base',
  'subjects.basicInformation',
  'subjects.body',
  'subjects.breadcrumb',
  'subjects.cancel',
  'subjects.clear',
  'subjects.clearFilters',
  'subjects.close',
  'subjects.code',
  'subjects.common',
  'subjects.confirm',
  'subjects.confirmDelete',
  'subjects.contact',
  'subjects.courseNameExample',
  'subjects.create',
  'subjects.createdAt',
  'subjects.creating',
  'subjects.currentPassword',
  'subjects.date',
  'subjects.dates',
  'subjects.days',
  'subjects.default',
  'subjects.delete',
  'subjects.deleting',
  'subjects.description',
  'subjects.deselectAll',
  'subjects.displayOrder',
  'subjects.download',
  'subjects.downloadPdf',
  'subjects.duplicate',
  'subjects.edit',
  'subjects.email',
  'subjects.endDate',
  'subjects.enterCurrentPassword',
  'subjects.enterFullName',
  'subjects.enterNewPassword',
  'subjects.enterPhoneNumber',
  'subjects.error',
  'subjects.example',
  'subjects.exampleCategories',
  'subjects.export',
  'subjects.exportErrorExcel',
  'subjects.exportErrorNoData',
  'subjects.exportErrorNoSchool',
  'subjects.exportErrorPdf',
  'subjects.exportExcel',
  'subjects.exportPdf',
  'subjects.exportSuccessExcel',
  'subjects.exportSuccessPdf',
  'subjects.fail',
  'subjects.fair',
  'subjects.filter',
  'subjects.filterByGrade',
  'subjects.filterByStatus',
  'subjects.filters',
  'subjects.firstName',
  'subjects.from',
  'subjects.generateStudents',
  'subjects.goBack',
  'subjects.good',
  'subjects.gradeExample',
  'subjects.graduationDate',
  'subjects.hide',
  'subjects.howToUse',
  'subjects.import',
  'subjects.inactive',
  'subjects.kb',
  'subjects.lastName',
  'subjects.loading',
  'subjects.mainNavigation',
  'subjects.metadata',
  'subjects.more',
  'subjects.morePages',
  'subjects.name',
  'subjects.next',
  'subjects.nextPage',
  'subjects.no',
  'subjects.noData',
  'subjects.noDataToExport',
  'subjects.noPermission',
  'subjects.noResults',
  'subjects.none',
  'subjects.notAssignedToOrganization',
  'subjects.notAvailable',
  'subjects.notFound',
  'subjects.notes',
  'subjects.notifications',
  'subjects.of',
  'subjects.on',
  'subjects.optional',
  'subjects.other',
  'subjects.overrideCapacity',
  'subjects.overrideCapacityAll',
  'subjects.pageSize',
  'subjects.pass',
  'subjects.passRate',
  'subjects.phone',
  'subjects.pleaseSelectOrganization',
  'subjects.preview',
  'subjects.previous',
  'subjects.previousPage',
  'subjects.previousSlide',
  'subjects.print',
  'subjects.processing',
  'subjects.published',
  'subjects.refresh',
  'subjects.remove',
  'subjects.required',
  'subjects.reset',
  'subjects.resetToDefault',
  'subjects.retry',
  'subjects.rtl',
  'subjects.save',
  'subjects.saveAll',
  'subjects.saving',
  'subjects.scanCardNumber',
  'subjects.schoolManagement',
  'subjects.schoolSwitched',
  'subjects.search',
  'subjects.searchStudentPlaceholder',
  'subjects.section',
  'subjects.sectionExample',
  'subjects.sectionsInputHint',
  'subjects.select',
  'subjects.selectAll',
  'subjects.selectClass',
  'subjects.selectCourse',
  'subjects.selectLanguage',
  'subjects.selectSchool',
  'subjects.selected',
  'subjects.show',
  'subjects.signature',
  'subjects.startDate',
  'subjects.status',
  'subjects.statusLabel',
  'subjects.strong',
  'subjects.subjects',
  'subjects.submit',
  'subjects.success',
  'subjects.title',
  'subjects.to',
  'subjects.today',
  'subjects.toggleSidebar',
  'subjects.topPerformers',
  'subjects.total',
  'subjects.tryAgain',
  'subjects.type',
  'subjects.unauthorized',
  'subjects.unexpectedError',
  'subjects.unknown',
  'subjects.unread',
  'subjects.update',
  'subjects.updatedAt',
  'subjects.updating',
  'subjects.upload',
  'subjects.uploading',
  'subjects.user',
  'subjects.validationError',
  'subjects.verify',
  'subjects.veryStrong',
  'subjects.view',
  'subjects.viewAll',
  'subjects.viewDetails',
  'subjects.weak',
  'subjects.years',
  'subjects.yes',
  'summary.approvedBatches',
  'summary.draftBatches',
  'summary.issuedBatches',
  'summary.totalBatches',
  'table.needsReview',
  'toast.disciplineRecordDeleteFailed',
  'type.finalYear',
  'type.promotion',
  'type.transfer',
  'type.true_false',
  'types.finalYear',
  'types.promotion',
  'types.transfer',
  'validation.fromToClassDifferent',
  'validation.weightsMustSum100',
];

/**
 * Flatten object to dot-notation keys
 */
function flattenToDotKeys(obj: unknown): Map<string, string> {
  const result = new Map<string, string>();
  
  function walk(value: unknown, prefix: string) {
    if (typeof value === 'string') {
      if (prefix) {
        result.set(prefix, value);
      }
      return;
    }
    
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return;
    }
    
    for (const [k, v] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${k}` : k;
      walk(v, next);
    }
  }
  
  walk(obj, '');
  return result;
}

/**
 * Remove key from nested object
 */
function removeKeyFromObject(obj: any, keyPath: string[]): void {
  if (keyPath.length === 0) return;
  
  const [current, ...rest] = keyPath;
  
  if (rest.length === 0) {
    // Last key - remove it
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      delete obj[current];
    }
  } else {
    // Navigate deeper
    if (obj && typeof obj === 'object' && !Array.isArray(obj) && obj[current]) {
      removeKeyFromObject(obj[current], rest);
      
      // If the nested object is now empty, remove it
      if (Object.keys(obj[current]).length === 0) {
        delete obj[current];
      }
    }
  }
}

/**
 * Create backup of translation files
 */
function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}-specific-keys`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  fs.mkdirSync(backupPath, { recursive: true });
  
  const files = ['en.ts', 'ps.ts', 'fa.ts', 'ar.ts', 'types.ts'];
  for (const file of files) {
    const src = path.join(TRANSLATIONS_DIR, file);
    const dest = path.join(backupPath, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
  
  return backupPath;
}

/**
 * Remove specific keys from translation object
 */
function removeKeysFromTranslation(translation: any, keysToRemove: Set<string>): any {
  const flattened = flattenToDotKeys(translation);
  const translationCopy = JSON.parse(JSON.stringify(translation)); // Deep clone
  
  let removedCount = 0;
  for (const key of keysToRemove) {
    if (flattened.has(key)) {
      const keyPath = key.split('.');
      removeKeyFromObject(translationCopy, keyPath);
      removedCount++;
    }
  }
  
  return { cleaned: translationCopy, removedCount };
}

/**
 * Write translation file with proper formatting
 */
function writeTranslationFile(filePath: string, translation: any, lang: Language): void {
  // Use JSON.stringify with proper indentation
  // Prettier will fix the formatting when you run npm run format
  const jsonContent = JSON.stringify(translation, null, 2);
  
  const content = `import type { TranslationKeys } from './types';

export const ${lang}: TranslationKeys = ${jsonContent};
`;
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Remove keys from types.ts interface
 */
function removeKeysFromTypes(keysToRemove: Set<string>): { content: string; removedCount: number } {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const lines = content.split('\n');
  const keysToRemoveSet = keysToRemove;
  
  // Track which lines to remove
  const linesToRemove = new Set<number>();
  const pathStack: string[] = [];
  let inInterface = false;
  let braceDepth = 0;
  let removedCount = 0;
  
  // First pass: identify lines to remove
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    const trimmedNoComment = trimmed.replace(/\/\/.*$/, '').trim();
    
    // Skip comments
    if (trimmedNoComment.startsWith('/*') || trimmedNoComment.startsWith('*')) {
      continue;
    }
    
    // Detect interface start
    if (trimmedNoComment.includes('interface TranslationKeys') || trimmedNoComment.includes('export interface TranslationKeys')) {
      inInterface = true;
      braceDepth = 0;
      pathStack.length = 0;
      continue;
    }
    
    if (!inInterface) continue;
    
    // Track brace depth
    const openBraces = (trimmedNoComment.match(/\{/g) || []).length;
    const closeBraces = (trimmedNoComment.match(/\}/g) || []).length;
    const prevBraceDepth = braceDepth;
    braceDepth += openBraces - closeBraces;
    
    // Check if we're leaving the interface
    if (braceDepth < 0) {
      inInterface = false;
      continue;
    }
    
    // Check for object start: "key: {"
    const objectStartMatch = trimmedNoComment.match(/^(\w+):\s*\{/);
    if (objectStartMatch) {
      pathStack.push(objectStartMatch[1]);
      continue;
    }
    
    const quotedObjectMatch = trimmedNoComment.match(/^["']([^"']+)["']:\s*\{/);
    if (quotedObjectMatch) {
      pathStack.push(quotedObjectMatch[1]);
      continue;
    }
    
    // Check for key definition: "key: string;"
    const keyMatch = trimmedNoComment.match(/^(\w+):\s*string;/);
    if (keyMatch && pathStack.length > 0) {
      const key = keyMatch[1];
      const fullPath = [...pathStack, key].join('.');
      if (keysToRemoveSet.has(fullPath)) {
        linesToRemove.add(i);
        removedCount++;
      }
      continue;
    }
    
    const quotedKeyMatch = trimmedNoComment.match(/^["']([^"']+)["']:\s*string;/);
    if (quotedKeyMatch && pathStack.length > 0) {
      const key = quotedKeyMatch[1];
      let fullPath: string;
      if (key.includes('.')) {
        // Key already contains dots (e.g., "true_false")
        fullPath = key;
      } else {
        fullPath = [...pathStack, key].join('.');
      }
      if (keysToRemoveSet.has(fullPath)) {
        linesToRemove.add(i);
        removedCount++;
      }
      continue;
    }
    
    // Handle closing braces - pop from path stack
    if (closeBraces > 0 && pathStack.length > 0 && prevBraceDepth > braceDepth) {
      // Check if we should remove the entire object if it's now empty
      // This is complex - for now, just pop the stack
      pathStack.pop();
    }
  }
  
  // Second pass: remove lines and clean up empty objects
  const newLines: string[] = [];
  let skipNextEmptyLine = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (linesToRemove.has(i)) {
      // Skip this line
      skipNextEmptyLine = true;
      continue;
    }
    
    // Skip empty lines after removed lines (but keep at least one)
    if (skipNextEmptyLine && lines[i].trim() === '') {
      skipNextEmptyLine = false;
      continue;
    }
    
    skipNextEmptyLine = false;
    newLines.push(lines[i]);
  }
  
  // Clean up trailing commas and empty objects
  const cleanedContent = newLines.join('\n')
    // Remove trailing commas before closing braces
    .replace(/,(\s*})/g, '$1')
    // Remove empty object definitions (simple cases)
    .replace(/(\w+):\s*\{\s*\},?\s*\n/g, '')
    .replace(/(["'][^"']+["']):\s*\{\s*\},?\s*\n/g, '');
  
  return { content: cleanedContent, removedCount };
}

/**
 * Main function
 */
async function main() {
  console.log('🗑️  Removing specific translation keys...\n');
  
  if (KEYS_TO_REMOVE.length === 0) {
    console.log('⚠️  No keys specified in KEYS_TO_REMOVE array.');
    console.log('   Please add keys to remove at the top of the script.');
    return;
  }
  
  const keysToRemoveSet = new Set(KEYS_TO_REMOVE);
  
  console.log(`📋 Keys to remove: ${keysToRemoveSet.size}`);
  console.log('\n📋 First 20 keys:');
  Array.from(keysToRemoveSet).slice(0, 20).forEach(key => {
    console.log(`   - ${key}`);
  });
  if (keysToRemoveSet.size > 20) {
    console.log(`   ... and ${keysToRemoveSet.size - 20} more`);
  }
  
  // Create backup
  console.log('\n💾 Creating backup...');
  const backupPath = createBackup();
  console.log(`   Backup created: ${backupPath}`);
  
  // Confirm
  console.log(`\n⚠️  This will remove ${keysToRemoveSet.size} specific keys from all translation files.`);
  console.log('   Backup has been created.');
  console.log('\n   Processing in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Remove from translation files
  console.log('\n🗑️  Removing keys from translation files...');
  
  const translations = { en, ps, fa, ar };
  const langFiles: Record<Language, string> = {
    en: path.join(TRANSLATIONS_DIR, 'en.ts'),
    ps: path.join(TRANSLATIONS_DIR, 'ps.ts'),
    fa: path.join(TRANSLATIONS_DIR, 'fa.ts'),
    ar: path.join(TRANSLATIONS_DIR, 'ar.ts'),
  };
  
  let totalRemoved = 0;
  
  // Remove from translation files
  for (const lang of ['en', 'ps', 'fa', 'ar'] as Language[]) {
    console.log(`   Processing ${lang.toUpperCase()}...`);
    const { cleaned, removedCount } = removeKeysFromTranslation(translations[lang], keysToRemoveSet);
    writeTranslationFile(langFiles[lang], cleaned, lang);
    console.log(`   ✓ ${lang.toUpperCase()} cleaned (removed ${removedCount} keys)`);
    totalRemoved += removedCount;
  }
  
  // Remove from types.ts
  console.log(`   Processing types.ts...`);
  const { content: typesContent, removedCount: typesRemovedCount } = removeKeysFromTypes(keysToRemoveSet);
  fs.writeFileSync(TYPES_FILE, typesContent, 'utf-8');
  console.log(`   ✓ types.ts cleaned (removed ${typesRemovedCount} keys)`);
  
  console.log(`\n✅ Removal complete!`);
  console.log(`   Removed ${totalRemoved} key instances from all translation files`);
  console.log(`   Removed ${typesRemovedCount} keys from types.ts`);
  console.log(`   Backup location: ${backupPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the changes: git diff`);
  console.log(`   2. Format files: npm run format`);
  console.log(`   3. Test the application: npm run dev`);
  console.log(`   4. Commit the changes`);
  console.log(`\n💡 Tip: If something breaks, restore from backup:`);
  console.log(`   cp ${backupPath}/* ${TRANSLATIONS_DIR}/`);
}

main().catch(console.error);

