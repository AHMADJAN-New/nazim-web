/**
 * Fix Translation Key Mappings
 * 
 * This script finds and fixes incorrect translation key usages in the codebase.
 * Instead of adding new keys to translation files, it corrects the key references
 * in the source code to use the correct existing keys.
 */

/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../..');

// Key mappings: incorrect key -> correct key
const KEY_MAPPINGS: Record<string, string> = {
  // Events namespace -> Common namespace
  'events.loading': 'common.loading',
  'events.selectLanguage': 'common.selectLanguage',
  'events.selectSchool': 'common.selectSchool',
  'events.schoolManagement': 'common.schoolManagement',
  'events.toggleSidebar': 'common.toggleSidebar',
  
  // Navigation fixes - nested keys to flat keys
  'nav.nav.reports': 'nav.reports',
  'nav.students.management': 'nav.studentManagement',
};

// File patterns to search
const FILE_PATTERNS = [
  'src/**/*.tsx',
  'src/**/*.ts',
];

// Patterns to match translation function calls
const TRANSLATION_PATTERNS = [
  // t('key') or t("key")
  /t\(['"]([^'"]+)['"]\)/g,
  // t(`key`) with template literals
  /t\(`([^`]+)`\)/g,
];

// titleKey value mappings for SmartSidebar (these are the actual titleKey values, not full translation keys)
// These are used in titleKey: "value" properties in navigation items
const TITLE_KEY_MAPPINGS: Record<string, string> = {
  // Fix incorrect titleKey values in navigation items
  // Note: We need to handle these carefully - they appear in different contexts
  // 'events.title' is used for both teacherSubjectAssignments and timetable
  // We'll need to fix these manually or use context-aware replacement
};

interface Replacement {
  file: string;
  line: number;
  oldKey: string;
  newKey: string;
  oldLine: string;
  newLine: string;
}

/**
 * Find all files matching the patterns
 */
function findFiles(): string[] {
  const files: string[] = [];
  
  for (const pattern of FILE_PATTERNS) {
    const matches = globSync(pattern, {
      cwd: FRONTEND_DIR,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/scripts/**',
      ],
    });
    files.push(...matches);
  }
  
  return [...new Set(files)];
}

/**
 * Find all translation key usages in a file
 */
function findKeyUsages(content: string, filePath: string): Replacement[] {
  const replacements: Replacement[] = [];
  const lines = content.split('\n');
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    
    // Check each key mapping for t() calls
    for (const [oldKey, newKey] of Object.entries(KEY_MAPPINGS)) {
      // Escape special regex characters
      const escapedKey = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match t('key'), t("key"), or t(`key`)
      const pattern = new RegExp(`t\\((['"\`])${escapedKey}\\1\\)`, 'g');
      
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const quote = match[1];
        const newLine = line.replace(
          new RegExp(`(t\\(${quote})${escapedKey}(${quote}\\))`, 'g'),
          `$1${newKey}$2`
        );
        
        replacements.push({
          file: filePath,
          line: lineIndex + 1,
          oldKey: oldKey,
          newKey: newKey,
          oldLine: line,
          newLine: newLine,
        });
      }
    }
    
    // Check titleKey mappings (for SmartSidebar navigation items)
    for (const [oldTitleKey, newTitleKey] of Object.entries(TITLE_KEY_MAPPINGS)) {
      // Match titleKey: "oldKey" or titleKey: 'oldKey'
      const pattern = new RegExp(`titleKey:\\s*['"]${oldTitleKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
      
      if (pattern.test(line)) {
        const newLine = line.replace(
          new RegExp(`(titleKey:\\s*['"])${oldTitleKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(['"])`, 'g'),
          `$1${newTitleKey}$2`
        );
        
        replacements.push({
          file: filePath,
          line: lineIndex + 1,
          oldKey: `titleKey: "${oldTitleKey}"`,
          newKey: `titleKey: "${newTitleKey}"`,
          oldLine: line,
          newLine: newLine,
        });
      }
    }
  }
  
  return replacements;
}

/**
 * Apply replacements to a file
 */
function applyReplacements(filePath: string, replacements: Replacement[]): void {
  if (replacements.length === 0) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Apply each replacement (process in reverse order to avoid affecting line numbers)
  const uniqueReplacements = Array.from(
    new Map(replacements.map(r => [`${r.oldKey}→${r.newKey}`, r])).values()
  );
  
  for (const replacement of uniqueReplacements) {
    // Check if this is a titleKey replacement or a t() call replacement
    if (replacement.oldKey.startsWith('titleKey:')) {
      // Handle titleKey replacements
      const oldTitleKey = replacement.oldKey.match(/titleKey:\s*['"]([^'"]+)['"]/)?.[1];
      const newTitleKey = replacement.newKey.match(/titleKey:\s*['"]([^'"]+)['"]/)?.[1];
      
      if (oldTitleKey && newTitleKey) {
        const escapedOld = oldTitleKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        content = content.replace(
          new RegExp(`(titleKey:\\s*['"])${escapedOld}(['"])`, 'g'),
          `$1${newTitleKey}$2`
        );
      }
    } else {
      // Handle t() call replacements
      const escapedKey = replacement.oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace all occurrences: t('key'), t("key"), or t(`key`)
      content = content.replace(
        new RegExp(`(t\\(['"\`])${escapedKey}(['"\`]\\))`, 'g'),
        `$1${replacement.newKey}$2`
      );
    }
  }
  
  // Write updated content
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Finding translation key mapping issues...\n');
  
  const files = findFiles();
  console.log(`📁 Found ${files.length} files to check\n`);
  
  const allReplacements: Replacement[] = [];
  const fileReplacements = new Map<string, Replacement[]>();
  
  // Find all replacements
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const replacements = findKeyUsages(content, file);
      
      if (replacements.length > 0) {
        fileReplacements.set(file, replacements);
        allReplacements.push(...replacements);
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }
  
  if (allReplacements.length === 0) {
    console.log('✅ No incorrect translation key mappings found!');
    return;
  }
  
  // Group by key mapping
  const byMapping = new Map<string, Replacement[]>();
  for (const replacement of allReplacements) {
    const mappingKey = `${replacement.oldKey} → ${replacement.newKey}`;
    if (!byMapping.has(mappingKey)) {
      byMapping.set(mappingKey, []);
    }
    byMapping.get(mappingKey)!.push(replacement);
  }
  
  // Display summary
  console.log('📊 Summary of incorrect key mappings:\n');
  for (const [mapping, replacements] of byMapping.entries()) {
    console.log(`  ${mapping}: ${replacements.length} occurrence(s)`);
  }
  
  console.log(`\n📝 Found ${allReplacements.length} total replacement(s) in ${fileReplacements.size} file(s)\n`);
  
  // Show detailed replacements
  console.log('📋 Detailed replacements:\n');
  for (const [file, replacements] of fileReplacements.entries()) {
    const relativePath = path.relative(FRONTEND_DIR, file);
    console.log(`  ${relativePath}:`);
    for (const replacement of replacements) {
      console.log(`    Line ${replacement.line}: ${replacement.oldKey} → ${replacement.newKey}`);
    }
    console.log('');
  }
  
  // Apply replacements
  console.log('🔧 Applying fixes...\n');
  for (const [file, replacements] of fileReplacements.entries()) {
    applyReplacements(file, replacements);
    const relativePath = path.relative(FRONTEND_DIR, file);
    console.log(`  ✅ Fixed ${replacements.length} issue(s) in ${relativePath}`);
  }
  
  console.log(`\n✨ Done! Fixed ${allReplacements.length} translation key mapping(s) in ${fileReplacements.size} file(s)`);
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

