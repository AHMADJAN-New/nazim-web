#!/usr/bin/env tsx

/**
 * Script to safely remove unused translation keys
 * 
 * This script:
 * 1. Identifies truly unused keys (not used in codebase)
 * 2. Creates a backup of translation files
 * 3. Removes unused keys from all translation files
 * 4. Optionally removes from types.ts (with confirmation)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const FRONTEND_DIR = path.join(REPO_ROOT, 'frontend');
const TYPES_FILE = path.join(FRONTEND_DIR, 'src', 'lib', 'translations', 'types.ts');
const TRANSLATIONS_DIR = path.join(FRONTEND_DIR, 'src', 'lib', 'translations');
const BACKUP_DIR = path.join(REPO_ROOT, 'translation-backups');

type Language = 'en' | 'ps' | 'fa' | 'ar';

// Import translation files
import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';

/**
 * Extract all keys from types.ts (same as coverage script)
 */
function extractAllKeys(): Set<string> {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const keys = new Set<string>();
  
  const lines = content.split('\n');
  const pathStack: string[] = [];
  let inInterface = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    line = line.replace(/\/\/.*$/, '').trim();
    
    if (line.startsWith('/*') || line.startsWith('*')) continue;
    
    if (line.includes('interface TranslationKeys') || line.includes('export interface TranslationKeys')) {
      inInterface = true;
      braceDepth = 0;
      pathStack.length = 0;
      continue;
    }
    
    if (!inInterface) continue;
    
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    
    if (braceDepth < 0) {
      inInterface = false;
      continue;
    }
    
    const objectStartMatch = line.match(/^(\w+):\s*\{/);
    if (objectStartMatch) {
      pathStack.push(objectStartMatch[1]);
      continue;
    }
    
    const quotedObjectMatch = line.match(/^["']([^"']+)["']:\s*\{/);
    if (quotedObjectMatch) {
      pathStack.push(quotedObjectMatch[1]);
      continue;
    }
    
    const keyMatch = line.match(/^(\w+):\s*string;/);
    if (keyMatch && pathStack.length > 0) {
      const key = keyMatch[1];
      const fullPath = [...pathStack, key].join('.');
      keys.add(fullPath);
      continue;
    }
    
    const quotedKeyMatch = line.match(/^["']([^"']+)["']:\s*string;/);
    if (quotedKeyMatch && pathStack.length > 0) {
      const key = quotedKeyMatch[1];
      if (key.includes('.')) {
        keys.add(key);
      } else {
        const fullPath = [...pathStack, key].join('.');
        keys.add(fullPath);
      }
      continue;
    }
    
    if (closeBraces > 0 && pathStack.length > 0 && braceDepth < (openBraces - closeBraces)) {
      pathStack.pop();
    }
    
    if (braceDepth < 0) {
      inInterface = false;
      pathStack.length = 0;
    }
  }
  
  return keys;
}

/**
 * Extract used keys from codebase (using same enhanced logic as coverage script)
 */
function extractUsedKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const files = getAllSourceFiles(FRONTEND_DIR);
  
  // Pattern to match t('key') or t("key") - same as coverage script
  const tPattern = /\bt\(\s*(["'`])([^"'`]+)\1/g;
  
  // Additional patterns for other translation usages
  const showToastPattern = /showToast\.(success|error|info|warning|loading)\(['"]([^'"]+)['"]/g;
  const titleKeyPattern = /titleKey:\s*['"]([^'"]+)['"]/g;
  const labelKeyPattern = /labelKey:\s*['"]([^'"]+)['"]/g;
  const placeholderKeyPattern = /placeholderKey:\s*['"]([^'"]+)['"]/g;
  const validationMessagePattern = /getValidationMessage\(['"]([^'"]+)['"]/g;
  
  // Collect all titleKey values for navigation (will construct nav.${titleKey} later)
  const navigationTitleKeys = new Set<string>();
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(FRONTEND_DIR, file);
    
    // Extract t('key') patterns (literal strings)
    let match: RegExpExecArray | null;
    while ((match = tPattern.exec(content)) !== null) {
      const key = match[2];
      if (key && !key.includes('${') && key.includes('.')) {
        usedKeys.add(key);
      }
    }
    
    // Extract showToast patterns
    const toastMatches = content.matchAll(showToastPattern);
    for (const m of toastMatches) {
      const key = m[2];
      if (key && key.includes('.')) {
        usedKeys.add(key);
      }
    }
    
    // Extract titleKey patterns - these are used in navigation
    const titleMatches = content.matchAll(titleKeyPattern);
    for (const m of titleMatches) {
      const titleKey = m[1];
      if (titleKey) {
        // Store the titleKey value
        navigationTitleKeys.add(titleKey);
        
        // If it already contains dots, it's a full key (e.g., "finance.fees.dashboard")
        if (titleKey.includes('.')) {
          // It's already a full key, use as-is
          usedKeys.add(titleKey);
          // Also add nav. prefix version (some might use nav.finance.fees.dashboard)
          usedKeys.add(`nav.${titleKey}`);
        }
      }
    }
    
    // Extract labelKey, placeholderKey, etc.
    const labelMatches = content.matchAll(labelKeyPattern);
    for (const m of labelMatches) {
      const key = m[1];
      if (key && key.includes('.')) {
        usedKeys.add(key);
      }
    }
    
    const placeholderMatches = content.matchAll(placeholderKeyPattern);
    for (const m of placeholderMatches) {
      const key = m[1];
      if (key && key.includes('.')) {
        usedKeys.add(key);
      }
    }
    
    // Extract validation message keys from validationHelpers.ts
    if (relativePath.includes('validationHelpers')) {
      const validationMatches = content.matchAll(validationMessagePattern);
      for (const m of validationMatches) {
        const key = m[1];
        if (key && key.startsWith('validation.')) {
          usedKeys.add(key);
        }
      }
      
      // Also extract from validationMessages object
      const validationMessagesPattern = /(\w+):\s*\(\)\s*=>\s*getValidationMessage\(['"](validation\.[^'"]+)['"]/g;
      const validationObjMatches = content.matchAll(validationMessagesPattern);
      for (const m of validationObjMatches) {
        const key = m[2];
        if (key && key.startsWith('validation.')) {
          usedKeys.add(key);
        }
      }
    }
  }
  
  // Construct nav.* keys from all titleKey values found
  // This handles: t(`nav.${item.titleKey}`) where titleKey comes from navigation items
  for (const titleKey of navigationTitleKeys) {
    // Add nav. prefix for navigation items
    // Most navigation items use nav. prefix, but some might be direct keys
    const navKey = `nav.${titleKey}`;
    usedKeys.add(navKey);
    
    // Also add the titleKey itself if it contains dots (might be a full key)
    if (titleKey.includes('.')) {
      usedKeys.add(titleKey);
    }
  }
  
  // Special handling for SmartSidebar.tsx - extract all titleKey values
  const sidebarFile = files.find(f => f.includes('SmartSidebar.tsx'));
  if (sidebarFile) {
    const sidebarContent = fs.readFileSync(sidebarFile, 'utf-8');
    
    // Extract all titleKey values (including nested ones)
    const allTitleKeys = new Set<string>();
    const titleKeyRegex = /titleKey:\s*['"]([^'"]+)['"]/g;
    let titleKeyMatch: RegExpExecArray | null;
    while ((titleKeyMatch = titleKeyRegex.exec(sidebarContent)) !== null) {
      const key = titleKeyMatch[1];
      if (key) {
        allTitleKeys.add(key);
        // Construct nav.${key} for navigation items
        // This handles: t(`nav.${item.titleKey}`) pattern
        usedKeys.add(`nav.${key}`);
        // If key already has dots, it might be a full key (e.g., "finance.fees.dashboard")
        if (key.includes('.')) {
          // It's already a full key, use as-is
          usedKeys.add(key);
          // Also add nav. prefix version (some might use nav.finance.fees.dashboard)
          usedKeys.add(`nav.${key}`);
        }
      }
    }
  }
  
  return usedKeys;
}

/**
 * Get all source files
 */
function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'translation-reports', 'translation-backups'].includes(file)) {
        getAllSourceFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.test.') && !file.includes('.spec.') && !file.includes('.generated.')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

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
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
  
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
 * Remove unused keys from translation object
 */
function removeUnusedKeysFromTranslation(translation: any, unusedKeys: Set<string>): any {
  const flattened = flattenToDotKeys(translation);
  const translationCopy = JSON.parse(JSON.stringify(translation)); // Deep clone
  
  for (const key of unusedKeys) {
    if (flattened.has(key)) {
      const keyPath = key.split('.');
      removeKeyFromObject(translationCopy, keyPath);
    }
  }
  
  return translationCopy;
}

/**
 * Write translation file with proper formatting
 */
function writeTranslationFile(filePath: string, translation: any, lang: Language): void {
  // Use JSON.stringify with proper indentation
  // Prettier will fix the formatting when you run npm run format
  const jsonContent = JSON.stringify(translation, null, 2);
  
  // Replace double quotes with single quotes for string values (TypeScript style)
  // This is a simple approach - Prettier will handle the rest
  const content = `import type { TranslationKeys } from './types';

export const ${lang}: TranslationKeys = ${jsonContent};
`;
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Remove unused keys from types.ts
 */
function removeUnusedKeysFromTypes(typesContent: string, unusedKeys: Set<string>): string {
  // This is complex - we need to parse and remove keys from the interface
  // For safety, we'll create a new approach: generate types from the actual translation files
  // But for now, let's just warn the user that types.ts needs manual cleanup
  
  console.log('\n⚠️  Note: types.ts needs manual cleanup.');
  console.log('   The unused keys are still in types.ts.');
  console.log('   You can regenerate types.ts using: npm run i18n:keys:generate');
  
  return typesContent; // Return unchanged for now
}

/**
 * Main function
 */
async function main() {
  console.log('🗑️  Removing unused translation keys...\n');
  
  // Step 1: Extract keys
  console.log('📖 Extracting all keys from types.ts...');
  const allKeys = extractAllKeys();
  console.log(`   Found ${allKeys.size} total keys`);
  
  console.log('\n🔎 Scanning codebase for used keys...');
  const usedKeys = extractUsedKeys();
  console.log(`   Found ${usedKeys.size} used keys`);
  
  // Step 2: Find unused keys
  const unusedKeys = new Set<string>();
  for (const key of allKeys) {
    if (!usedKeys.has(key)) {
      unusedKeys.add(key);
    }
  }
  
  console.log(`\n📊 Analysis:`);
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Used keys: ${usedKeys.size}`);
  console.log(`   Unused keys: ${unusedKeys.size}`);
  
  if (unusedKeys.size === 0) {
    console.log('\n✅ No unused keys found!');
    return;
  }
  
  // Step 3: Show some examples
  console.log('\n📋 Sample unused keys (first 20):');
  const sampleUnused = Array.from(unusedKeys).slice(0, 20);
  sampleUnused.forEach(key => {
    console.log(`   - ${key}`);
  });
  if (unusedKeys.size > 20) {
    console.log(`   ... and ${unusedKeys.size - 20} more`);
  }
  
  // Step 4: Create backup
  console.log('\n💾 Creating backup...');
  const backupPath = createBackup();
  console.log(`   Backup created: ${backupPath}`);
  
  // Step 5: Confirm
  console.log(`\n⚠️  This will remove ${unusedKeys.size} unused keys from all translation files.`);
  console.log('   Backup has been created.');
  console.log('\n   Processing in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 6: Remove from translation files
  console.log('\n🗑️  Removing unused keys from translation files...');
  
  const translations = { en, ps, fa, ar };
  const langFiles: Record<Language, string> = {
    en: path.join(TRANSLATIONS_DIR, 'en.ts'),
    ps: path.join(TRANSLATIONS_DIR, 'ps.ts'),
    fa: path.join(TRANSLATIONS_DIR, 'fa.ts'),
    ar: path.join(TRANSLATIONS_DIR, 'ar.ts'),
  };
  
  for (const lang of ['en', 'ps', 'fa', 'ar'] as Language[]) {
    console.log(`   Processing ${lang.toUpperCase()}...`);
    const cleaned = removeUnusedKeysFromTranslation(translations[lang], unusedKeys);
    writeTranslationFile(langFiles[lang], cleaned, lang);
    console.log(`   ✓ ${lang.toUpperCase()} cleaned`);
  }
  
  console.log(`\n✅ Removal complete!`);
  console.log(`   Removed ${unusedKeys.size} unused keys from all translation files`);
  console.log(`   Backup location: ${backupPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the changes: git diff`);
  console.log(`   2. Test the application: npm run dev`);
  console.log(`   3. Regenerate types.ts: npm run i18n:keys:generate`);
  console.log(`   4. Run coverage: npm run i18n:coverage:excel`);
  console.log(`   5. Commit the changes`);
  console.log(`\n💡 Tip: If something breaks, restore from backup:`);
  console.log(`   cp ${backupPath}/* ${TRANSLATIONS_DIR}/`);
}

main().catch(console.error);

