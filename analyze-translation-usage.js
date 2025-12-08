#!/usr/bin/env node

/**
 * Translation Key Usage Analyzer
 * 
 * This script analyzes translation key usage across the codebase:
 * 1. Extracts all translation keys from TranslationKeys interface
 * 2. Scans all TypeScript/TSX files for translation key usage
 * 3. Reports unused keys (defined but never used)
 * 4. Reports missing keys (used but not defined)
 * 5. Identifies files that might need translations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const TYPES_FILE = path.join(FRONTEND_DIR, 'lib', 'translations', 'types.ts');
const OUTPUT_FILE = path.join(__dirname, 'translation-usage-report.md');

// Validation helper to key mapping
const VALIDATION_HELPER_MAP = {
  invalidUuid: 'validation.invalidUuid',
  invalidEmail: 'validation.invalidEmail',
  phoneMaxLength: 'validation.phoneMaxLength',
  fieldMaxLength: 'validation.fieldMaxLength',
  fieldRequired: 'validation.fieldRequired',
  incidentDateRequired: 'validation.incidentDateRequired',
  endDateAfterStart: 'validation.endDateAfterStart',
  fileRequired: 'validation.fileRequired',
  fileSizeMax: 'validation.fileSizeMax',
  fileTypeInvalid: 'validation.fileTypeInvalid',
  currentPasswordRequired: 'validation.currentPasswordRequired',
  passwordMinLength: 'validation.passwordMinLength',
  passwordUppercase: 'validation.passwordUppercase',
  passwordLowercase: 'validation.passwordLowercase',
  passwordNumber: 'validation.passwordNumber',
  passwordSpecial: 'validation.passwordSpecial',
  passwordConfirmationRequired: 'validation.passwordConfirmationRequired',
  passwordsDoNotMatch: 'validation.passwordsDoNotMatch',
  ageMin: 'validation.ageMin',
  ageMax: 'validation.ageMax',
  invalidClassInstance: 'validation.invalidClassInstance',
  invalidSubject: 'validation.invalidSubject',
  invalidTeacher: 'validation.invalidTeacher',
  invalidScheduleSlot: 'validation.invalidScheduleSlot',
  invalidScheduleSlotId: 'validation.invalidScheduleSlotId',
  teacherRequired: 'validation.teacherRequired',
  atLeastOneEntryRequired: 'validation.atLeastOneEntryRequired',
};

// Patterns to match translation key usage
const USAGE_PATTERNS = [
  // t('key') or t("key")
  { pattern: /t\(['"]([^'"]+)['"]\)/g, type: 't()' },
  // showToast.success('key'), showToast.error('key'), etc.
  { pattern: /showToast\.(success|error|info|warning|loading)\(['"]([^'"]+)['"]/g, type: 'showToast' },
  // validationMessages.helper()
  { pattern: /validationMessages\.(\w+)\(/g, type: 'validationMessages' },
  // titleKey: 'key'
  { pattern: /titleKey:\s*['"]([^'"]+)['"]/g, type: 'titleKey' },
];

// Patterns to match hardcoded strings that might need translation
const HARDCODED_PATTERNS = [
  /['"]([A-Z][^'"]{10,})['"]/g, // Long capitalized strings
  /placeholder\s*=\s*['"]([^'"]+)['"]/g,
  /label\s*=\s*['"]([^'"]+)['"]/g,
  /title\s*=\s*['"]([^'"]+)['"]/g,
];

/**
 * Extract all translation keys from TranslationKeys interface
 */
function extractTranslationKeys() {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const keys = new Set();
  
  // Parse TypeScript interface using a stack-based approach
  const lines = content.split('\n');
  const pathStack = [];
  let inInterface = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove inline comments
    line = line.replace(/\/\/.*$/, '').trim();
    
    // Skip block comments
    if (line.startsWith('/*') || line.startsWith('*')) {
      continue;
    }
    
    // Detect interface start
    if (line.includes('interface TranslationKeys') || line.includes('export interface TranslationKeys')) {
      inInterface = true;
      braceDepth = 0;
      pathStack.length = 0;
      continue;
    }
    
    if (!inInterface) continue;
    
    // Count braces to track depth
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const prevBraceDepth = braceDepth;
    braceDepth += openBraces - closeBraces;
    
    // Detect category/object start (e.g., common: { or buildings: {)
    const objectStartMatch = line.match(/^(\w+):\s*\{/);
    if (objectStartMatch) {
      const category = objectStartMatch[1];
      pathStack.push(category);
      continue;
    }
    
    // Handle nested object with quoted key (e.g., "library.categories": {)
    const quotedObjectMatch = line.match(/^["']([^"']+)["']:\s*\{/);
    if (quotedObjectMatch) {
      const category = quotedObjectMatch[1];
      pathStack.push(category);
      continue;
    }
    
    // Extract key: string; pattern (leaf keys)
    const keyMatch = line.match(/^(\w+):\s*string;/);
    if (keyMatch && pathStack.length > 0) {
      const key = keyMatch[1];
      const fullPath = [...pathStack, key].join('.');
      keys.add(fullPath);
      continue;
    }
    
    // Handle quoted keys (e.g., "library.categories": string;)
    const quotedKeyMatch = line.match(/^["']([^"']+)["']:\s*string;/);
    if (quotedKeyMatch && pathStack.length > 0) {
      const key = quotedKeyMatch[1];
      // If key contains dots, it's already a full path
      if (key.includes('.')) {
        keys.add(key);
      } else {
        const fullPath = [...pathStack, key].join('.');
        keys.add(fullPath);
      }
      continue;
    }
    
    // Pop from stack when closing brace (when depth decreases)
    if (closeBraces > 0 && pathStack.length > 0 && braceDepth < prevBraceDepth) {
      pathStack.pop();
    }
    
    // Reset if we've closed the interface
    if (braceDepth < 0) {
      inInterface = false;
      pathStack.length = 0;
    }
  }
  
  return keys;
}

/**
 * Get all TypeScript/TSX files recursively
 */
function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', '.git', '.next', 'build'].includes(file)) {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      // Skip test files and type definition files
      if (!file.includes('.test.') && !file.includes('.spec.') && !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Extract translation keys used in a file
 */
function extractUsedKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const usedKeys = new Set();
  const hardcodedStrings = new Set();
  const keyUsage = new Map(); // Track where keys are used
  
  // Extract keys from all patterns
  for (const { pattern, type } of USAGE_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      let key = null;
      
      if (type === 'showToast' && match[2]) {
        // showToast.success('key') - match[2] is the key
        key = match[2];
      } else if (type === 'validationMessages' && match[1]) {
        // validationMessages.helper() - match[1] is helper name
        const helperName = match[1];
        key = VALIDATION_HELPER_MAP[helperName] || `validation.${helperName}`;
      } else if (match[1] && !match[1].includes('(') && !match[1].includes(')')) {
        // Regular key pattern (t('key') or titleKey: 'key')
        key = match[1];
      }
      
      if (key) {
        usedKeys.add(key);
        if (!keyUsage.has(key)) {
          keyUsage.set(key, []);
        }
        keyUsage.get(key).push({ file: path.relative(FRONTEND_DIR, filePath), type });
      }
    }
  }
  
  // Extract potential hardcoded strings
  for (const pattern of HARDCODED_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const str = match[1];
      // Filter out obvious non-translatable strings
      if (str && str.length > 5 && !str.match(/^(https?|mailto|data:|#)/) && !str.includes('${')) {
        hardcodedStrings.add(str);
      }
    }
  }
  
  return { usedKeys, hardcodedStrings, keyUsage };
}

/**
 * Check if a key exists in translation keys (supports partial matching)
 */
function keyExists(key, allKeys) {
  // Exact match
  if (allKeys.has(key)) {
    return true;
  }
  
  // Check if it's a partial key (e.g., 'common' matches 'common.loading')
  const parts = key.split('.');
  for (let i = 1; i < parts.length; i++) {
    const partialKey = parts.slice(0, i).join('.');
    if (allKeys.has(partialKey)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find files that might need translations
 */
function findFilesNeedingTranslations(files, allKeys, usedKeys) {
  const filesNeedingWork = [];
  
  for (const file of files) {
    const { usedKeys: fileUsedKeys, hardcodedStrings } = extractUsedKeys(file);
    const missingKeys = [];
    const hardcodedCount = hardcodedStrings.size;
    
    for (const key of fileUsedKeys) {
      if (!keyExists(key, allKeys)) {
        missingKeys.push(key);
      }
    }
    
    if (missingKeys.length > 0 || hardcodedCount > 5) {
      filesNeedingWork.push({
        file: path.relative(FRONTEND_DIR, file),
        missingKeys,
        hardcodedCount,
        hardcodedStrings: Array.from(hardcodedStrings).slice(0, 10), // First 10
      });
    }
  }
  
  return filesNeedingWork;
}

/**
 * Find pages that might be missing translations
 */
function findPagesNeedingTranslations(filesNeedingWork) {
  const pagePatterns = [
    { pattern: /Staff|staff/, name: 'Staff Management', keys: ['staff'] },
    { pattern: /Attendance|attendance/, name: 'Attendance', keys: ['attendance', 'attendancePage', 'attendanceReports'] },
    { pattern: /Leave|leave/, name: 'Leave Requests', keys: ['leave'] },
    { pattern: /Report|report/, name: 'Reports', keys: ['reports', 'attendanceReports', 'attendanceTotalsReport'] },
  ];
  
  const pagesNeedingWork = [];
  
  for (const { pattern, name, keys } of pagePatterns) {
    const matchingFiles = filesNeedingWork.filter(f => 
      pattern.test(f.file) || keys.some(k => f.file.toLowerCase().includes(k.toLowerCase()))
    );
    
    if (matchingFiles.length > 0) {
      pagesNeedingWork.push({
        name,
        files: matchingFiles,
        totalMissingKeys: matchingFiles.reduce((sum, f) => sum + f.missingKeys.length, 0),
        totalHardcoded: matchingFiles.reduce((sum, f) => sum + f.hardcodedCount, 0),
      });
    }
  }
  
  return pagesNeedingWork;
}

/**
 * Generate report
 */
function generateReport(allKeys, usedKeys, unusedKeys, missingKeys, filesNeedingWork, allKeyUsage = new Map()) {
  const pagesNeedingWork = findPagesNeedingTranslations(filesNeedingWork);
  
  const report = `# Translation Key Usage Analysis Report

Generated: ${new Date().toISOString()}

## Summary

- **Total Translation Keys**: ${allKeys.size}
- **Keys Used**: ${usedKeys.size} (${((usedKeys.size / allKeys.size) * 100).toFixed(1)}%)
- **Unused Keys**: ${unusedKeys.size} (${((unusedKeys.size / allKeys.size) * 100).toFixed(1)}%)
- **Missing Keys**: ${missingKeys.size}
- **Files Needing Translation Work**: ${filesNeedingWork.length}

## 🎯 Priority Pages Needing Translation Work

${pagesNeedingWork.map(page => `### ${page.name}
- **Files**: ${page.files.length}
- **Missing Keys**: ${page.totalMissingKeys}
- **Hardcoded Strings**: ${page.totalHardcoded}
- **Files**:
${page.files.slice(0, 5).map(f => `  - \`${f.file}\` (${f.missingKeys.length} missing keys, ${f.hardcodedCount} hardcoded)`).join('\n')}
${page.files.length > 5 ? `  - ... and ${page.files.length - 5} more files` : ''}
`).join('\n')}

## Unused Translation Keys (${unusedKeys.size})

These keys are defined in the TranslationKeys interface but are not used anywhere in the codebase.

\`\`\`
${Array.from(unusedKeys).sort().slice(0, 100).join('\n')}
${unusedKeys.size > 100 ? `\n... and ${unusedKeys.size - 100} more unused keys` : ''}
\`\`\`

## Missing Translation Keys (${missingKeys.size})

These keys are used in the codebase but are not defined in the TranslationKeys interface.

\`\`\`
${Array.from(missingKeys).sort().join('\n')}
\`\`\`

## Files That Might Need Translation Work

### High Priority (Missing Keys)

${filesNeedingWork
  .filter(f => f.missingKeys.length > 0)
  .map(f => `#### \`${f.file}\`
- **Missing Keys**: ${f.missingKeys.length}
  ${f.missingKeys.map(k => `  - \`${k}\``).join('\n  ')}
- **Hardcoded Strings**: ${f.hardcodedCount}
`)
  .join('\n')}

### Medium Priority (Many Hardcoded Strings)

${filesNeedingWork
  .filter(f => f.missingKeys.length === 0 && f.hardcodedCount > 5)
  .map(f => `#### \`${f.file}\`
- **Hardcoded Strings**: ${f.hardcodedCount}
- **Sample Strings**:
  ${f.hardcodedStrings.map(s => `  - "${s.substring(0, 50)}${s.length > 50 ? '...' : ''}"`).join('\n  ')}
`)
  .join('\n')}

## Usage Statistics by Category

${generateCategoryStats(allKeys, usedKeys)}

## Top Missing Keys (Most Frequently Used)

${Array.from(missingKeys)
  .map(key => {
    const usage = allKeyUsage.get(key) || [];
    return { key, count: usage.length, files: [...new Set(usage.map(u => u.file))] };
  })
  .sort((a, b) => b.count - a.count)
  .slice(0, 20)
  .map(({ key, count, files }) => `- \`${key}\` - Used ${count} time(s) in ${files.length} file(s)`)
  .join('\n')}

## Recommendations

1. **Add missing keys** to \`frontend/src/lib/translations/types.ts\`
2. **Add translations** for missing keys in all language files (en.ts, ps.ts, fa.ts, ar.ts)
3. **Replace hardcoded strings** with translation keys in files listed above
4. **Focus on priority pages** (Staff Management, Attendance, Leave Requests, Reports)
5. **Consider removing unused keys** if they're truly not needed (or mark them for future use)

## Next Steps

1. Review missing keys and add them to TranslationKeys interface
2. Add translations for new keys in all 4 language files
3. Update components to use translation keys instead of hardcoded strings
4. Test translations in all languages (en, ps, fa, ar)
`;

  return report;
}

/**
 * Generate category statistics
 */
function generateCategoryStats(allKeys, usedKeys) {
  const categoryStats = {};
  
  for (const key of allKeys) {
    const category = key.split('.')[0];
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, used: 0 };
    }
    categoryStats[category].total++;
    if (usedKeys.has(key)) {
      categoryStats[category].used++;
    }
  }
  
  return Object.entries(categoryStats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, stats]) => {
      const percentage = ((stats.used / stats.total) * 100).toFixed(1);
      return `- **${category}**: ${stats.used}/${stats.total} (${percentage}% used)`;
    })
    .join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Analyzing translation key usage...\n');
  
  // Step 1: Extract all translation keys
  console.log('📖 Extracting translation keys from types.ts...');
  const allKeys = extractTranslationKeys();
  console.log(`   Found ${allKeys.size} translation keys\n`);
  
  // Step 2: Get all source files
  console.log('📁 Scanning source files...');
  const files = getAllSourceFiles(FRONTEND_DIR);
  console.log(`   Found ${files.length} source files\n`);
  
  // Step 3: Extract used keys
  console.log('🔎 Extracting used translation keys...');
  const usedKeys = new Set();
  const missingKeys = new Set();
  const allKeyUsage = new Map();
  
  for (const file of files) {
    const { usedKeys: fileUsedKeys, keyUsage } = extractUsedKeys(file);
    for (const key of fileUsedKeys) {
      usedKeys.add(key);
      if (!keyExists(key, allKeys)) {
        missingKeys.add(key);
      }
      // Merge key usage info
      if (keyUsage && keyUsage.has(key)) {
        if (!allKeyUsage.has(key)) {
          allKeyUsage.set(key, []);
        }
        allKeyUsage.get(key).push(...keyUsage.get(key));
      }
    }
  }
  
  console.log(`   Found ${usedKeys.size} unique keys in use\n`);
  
  // Step 4: Find unused keys
  console.log('🔍 Finding unused keys...');
  const unusedKeys = new Set();
  for (const key of allKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.add(key);
    }
  }
  console.log(`   Found ${unusedKeys.size} unused keys\n`);
  
  // Step 5: Find files needing translation work
  console.log('📝 Identifying files needing translation work...');
  const filesNeedingWork = findFilesNeedingTranslations(files, allKeys, usedKeys);
  console.log(`   Found ${filesNeedingWork.length} files that might need work\n`);
  
  // Step 6: Generate report
  console.log('📊 Generating report...');
  const report = generateReport(allKeys, usedKeys, unusedKeys, missingKeys, filesNeedingWork, allKeyUsage);
  
  // Write report
  fs.writeFileSync(OUTPUT_FILE, report, 'utf-8');
  console.log(`\n✅ Report generated: ${OUTPUT_FILE}\n`);
  
  // Print summary
  console.log('📈 Summary:');
  console.log(`   Total Keys: ${allKeys.size}`);
  console.log(`   Used Keys: ${usedKeys.size} (${((usedKeys.size / allKeys.size) * 100).toFixed(1)}%)`);
  console.log(`   Unused Keys: ${unusedKeys.size} (${((unusedKeys.size / allKeys.size) * 100).toFixed(1)}%)`);
  console.log(`   Missing Keys: ${missingKeys.size}`);
  console.log(`   Files Needing Work: ${filesNeedingWork.length}`);
}

// Run the script
main();

