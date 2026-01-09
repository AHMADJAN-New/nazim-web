#!/usr/bin/env tsx

/**
 * Enhanced Translation Coverage Analyzer with Excel Export
 * 
 * This script:
 * 1. Extracts all translation keys from TranslationKeys interface (single source of truth)
 * 2. Reads all translation files (en, ps, fa, ar)
 * 3. Checks which keys are used in the codebase
 * 4. Generates a comprehensive Excel report showing:
 *    - Every key exists in which languages
 *    - Which keys are empty
 *    - Which keys are used vs unused
 *    - Priority for translation work
 */

/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

// Import translation files directly (like the existing coverage script)
import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

const FRONTEND_DIR = path.join(REPO_ROOT, 'src');
const TYPES_FILE = path.join(FRONTEND_DIR, 'lib', 'translations', 'types.ts');
const OUTPUT_DIR = path.join(REPO_ROOT, '..', 'translation-reports');
const EXCEL_OUTPUT = path.join(OUTPUT_DIR, `translation-coverage-${new Date().toISOString().split('T')[0]}.xlsx`);

const LANGUAGES = ['en', 'ps', 'fa', 'ar'] as const;
type Language = typeof LANGUAGES[number];

interface KeyStatus {
  key: string;
  exists: Record<Language, boolean>;
  empty: Record<Language, boolean>;
  values: Record<Language, string>;
  used: boolean;
  priority: 'high' | 'medium' | 'low' | 'unused';
  missingIn: Language[];
  emptyIn: Language[];
  namespace: string;
}

/**
 * Extract all translation keys from TranslationKeys interface
 * This is our single source of truth
 */
function extractAllKeys(): Set<string> {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const keys = new Set<string>();
  
  // Parse TypeScript interface using a stack-based approach
  const lines = content.split('\n');
  const pathStack: string[] = [];
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
 * Flatten translation object to dot-notation keys
 * Similar to the existing coverage script's flattenToDotKeys
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
 * Get all TypeScript/TSX files recursively
 */
function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', '.git', '.next', 'build', '.vite'].includes(file)) {
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
 * Extract translation keys used in codebase
 * Enhanced to detect all usage patterns including dynamic key construction
 */
function extractUsedKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const files = getAllSourceFiles(FRONTEND_DIR);
  
  // Pattern to match t('key') or t("key") - same as existing coverage script
  const tPattern = /\bt\(\s*(["'`])([^"'`]+)\1/g;
  
  // Additional patterns for other translation usages
  const showToastPattern = /showToast\.(success|error|info|warning|loading)\(['"]([^'"]+)['"]/g;
  const titleKeyPattern = /titleKey:\s*['"]([^'"]+)['"]/g;
  
  // Pattern for template literals: t(`nav.${...}`)
  const templateLiteralPattern = /t\(`([^`]+)`\)/g;
  
  // Pattern for validation messages in validationHelpers.ts
  const validationMessagePattern = /getValidationMessage\(['"](validation\.[^'"]+)['"]/g;
  
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
          // Check if it's used with nav. prefix
          // Look for: t(`nav.${titleKey}`) or t('nav.' + titleKey)
          const navKey = `nav.${titleKey}`;
          usedKeys.add(navKey);
        }
      }
    }
    
    // Extract template literals: t(`nav.${item.titleKey}`)
    const templateMatches = content.matchAll(templateLiteralPattern);
    for (const m of templateMatches) {
      const template = m[1];
      // Check if it's a nav. prefix pattern
      if (template.startsWith('nav.${') || template.startsWith("nav.${")) {
        // This is a dynamic nav key - we'll handle it by extracting titleKey values
        // The titleKey extraction above already handles this
      }
      // Check for other known patterns
      if (template.includes('${') && template.includes('.')) {
        // Try to extract the key pattern
        // For patterns like: `common.${action}` where action is a variable
        // We can't detect these statically, but we can note them
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
  
  // Extract validation message keys from validationHelpers.ts
  const validationHelpersFile = files.find(f => f.includes('validationHelpers.ts'));
  if (validationHelpersFile) {
    const validationContent = fs.readFileSync(validationHelpersFile, 'utf-8');
    
    // Extract from getValidationMessage('validation.key') calls
    const validationPattern = /getValidationMessage\(['"](validation\.[^'"]+)['"]/g;
    let validationMatch: RegExpExecArray | null;
    while ((validationMatch = validationPattern.exec(validationContent)) !== null) {
      const key = validationMatch[1];
      if (key && key.startsWith('validation.')) {
        usedKeys.add(key);
      }
    }
  }
  
  // Extract keys from common patterns in all files
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Pattern: labelKey, placeholderKey, descriptionKey, helpKey
    const keyPropertyPattern = /(labelKey|placeholderKey|descriptionKey|helpKey|errorKey|tooltipKey):\s*['"]([^'"]+)['"]/g;
    let keyPropMatch: RegExpExecArray | null;
    while ((keyPropMatch = keyPropertyPattern.exec(content)) !== null) {
      const key = keyPropMatch[2];
      if (key && key.includes('.')) {
        usedKeys.add(key);
      }
    }
    
    // Pattern: Keys in arrays/objects that might be used later
    // Look for: ['key1', 'key2'] or { key: 'translation.key' }
    const arrayKeyPattern = /['"]([a-z]+\.[a-z]+(?:\.[a-z]+)*)['"]/g;
    // Only in contexts that look like translation key arrays
    if (content.includes('titleKey') || content.includes('translation') || content.includes('i18n')) {
      let arrayMatch: RegExpExecArray | null;
      while ((arrayMatch = arrayKeyPattern.exec(content)) !== null) {
        const key = arrayMatch[1];
        // Filter out obvious non-translation strings (URLs, CSS classes, etc.)
        if (key && 
            key.includes('.') && 
            !key.startsWith('http') && 
            !key.startsWith('//') &&
            !key.includes('@') &&
            key.length > 3 &&
            /^[a-z]+\.[a-z]/.test(key)) {
          usedKeys.add(key);
        }
      }
    }
  }
  
  return usedKeys;
}

/**
 * Calculate priority for a key
 */
function calculatePriority(keyStatus: KeyStatus): 'high' | 'medium' | 'low' | 'unused' {
  if (!keyStatus.used) {
    return 'unused';
  }
  
  // High priority: used and missing in any language
  if (keyStatus.missingIn.length > 0) {
    return 'high';
  }
  
  // Medium priority: used but empty in any language
  if (keyStatus.emptyIn.length > 0) {
    return 'medium';
  }
  
  // Low priority: used and complete
  return 'low';
}

/**
 * Generate Excel report
 */
function generateExcelReport(allKeys: Set<string>, translations: Record<Language, Map<string, string>>, usedKeys: Set<string>): void {
  console.log('📊 Generating Excel report...');
  
  const keyStatuses: KeyStatus[] = [];
  
  // Process each key
  for (const key of Array.from(allKeys).sort()) {
    const namespace = key.split('.')[0];
    const status: KeyStatus = {
      key,
      exists: { en: false, ps: false, fa: false, ar: false },
      empty: { en: false, ps: false, fa: false, ar: false },
      values: { en: '', ps: '', fa: '', ar: '' },
      used: usedKeys.has(key),
      priority: 'low',
      missingIn: [],
      emptyIn: [],
      namespace,
    };
    
    // Check each language
    for (const lang of LANGUAGES) {
      const value = translations[lang].get(key);
      if (value !== undefined) {
        status.exists[lang] = true;
        status.values[lang] = value;
        if (value.trim() === '') {
          status.empty[lang] = true;
          status.emptyIn.push(lang);
        }
      } else {
        status.missingIn.push(lang);
      }
    }
    
    status.priority = calculatePriority(status);
    keyStatuses.push(status);
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Complete Coverage Report
  const coverageData = [
    [
      'Key',
      'Namespace',
      'Used',
      'Priority',
      'EN Exists',
      'EN Empty',
      'EN Value',
      'PS Exists',
      'PS Empty',
      'PS Value',
      'FA Exists',
      'FA Empty',
      'FA Value',
      'AR Exists',
      'AR Empty',
      'AR Value',
      'Missing In',
      'Empty In',
    ],
  ];
  
  for (const status of keyStatuses) {
    coverageData.push([
      status.key,
      status.namespace,
      status.used ? 'Yes' : 'No',
      status.priority,
      status.exists.en ? 'Yes' : 'No',
      status.empty.en ? 'Yes' : 'No',
      status.values.en.substring(0, 100), // Truncate long values
      status.exists.ps ? 'Yes' : 'No',
      status.empty.ps ? 'Yes' : 'No',
      status.values.ps.substring(0, 100),
      status.exists.fa ? 'Yes' : 'No',
      status.empty.fa ? 'Yes' : 'No',
      status.values.fa.substring(0, 100),
      status.exists.ar ? 'Yes' : 'No',
      status.empty.ar ? 'Yes' : 'No',
      status.values.ar.substring(0, 100),
      status.missingIn.join(', ') || 'None',
      status.emptyIn.join(', ') || 'None',
    ]);
  }
  
  const coverageSheet = XLSX.utils.aoa_to_sheet(coverageData);
  XLSX.utils.book_append_sheet(workbook, coverageSheet, 'Complete Coverage');
  
  // Sheet 2: High Priority (Used + Missing)
  const highPriorityData = [
    [
      'Key',
      'Namespace',
      'Missing In',
      'Empty In',
      'EN Value',
      'PS Value',
      'FA Value',
      'AR Value',
    ],
  ];
  
  for (const status of keyStatuses.filter(s => s.priority === 'high')) {
    highPriorityData.push([
      status.key,
      status.namespace,
      status.missingIn.join(', ') || 'None',
      status.emptyIn.join(', ') || 'None',
      status.values.en.substring(0, 100),
      status.values.ps.substring(0, 100),
      status.values.fa.substring(0, 100),
      status.values.ar.substring(0, 100),
    ]);
  }
  
  const highPrioritySheet = XLSX.utils.aoa_to_sheet(highPriorityData);
  XLSX.utils.book_append_sheet(workbook, highPrioritySheet, 'High Priority');
  
  // Sheet 3: Summary Statistics
  const summaryData = [
    ['Metric', 'Value'],
    ['Total Keys', allKeys.size.toString()],
    ['Used Keys', usedKeys.size.toString()],
    ['Unused Keys', (allKeys.size - usedKeys.size).toString()],
    ['High Priority Keys', keyStatuses.filter(s => s.priority === 'high').length.toString()],
    ['Medium Priority Keys', keyStatuses.filter(s => s.priority === 'medium').length.toString()],
    ['Low Priority Keys', keyStatuses.filter(s => s.priority === 'low').length.toString()],
    ['Unused Keys', keyStatuses.filter(s => s.priority === 'unused').length.toString()],
    ['', ''],
    ['Language Coverage', ''],
    ['EN Total', keyStatuses.filter(s => s.exists.en).length.toString()],
    ['EN Missing', keyStatuses.filter(s => !s.exists.en).length.toString()],
    ['EN Empty', keyStatuses.filter(s => s.empty.en).length.toString()],
    ['PS Total', keyStatuses.filter(s => s.exists.ps).length.toString()],
    ['PS Missing', keyStatuses.filter(s => !s.exists.ps).length.toString()],
    ['PS Empty', keyStatuses.filter(s => s.empty.ps).length.toString()],
    ['FA Total', keyStatuses.filter(s => s.exists.fa).length.toString()],
    ['FA Missing', keyStatuses.filter(s => !s.exists.fa).length.toString()],
    ['FA Empty', keyStatuses.filter(s => s.empty.fa).length.toString()],
    ['AR Total', keyStatuses.filter(s => s.exists.ar).length.toString()],
    ['AR Missing', keyStatuses.filter(s => !s.exists.ar).length.toString()],
    ['AR Empty', keyStatuses.filter(s => s.empty.ar).length.toString()],
    ['', ''],
    ['Missing Translations by Language', ''],
    ['Missing in PS (Used)', keyStatuses.filter(s => s.used && !s.exists.ps).length.toString()],
    ['Missing in FA (Used)', keyStatuses.filter(s => s.used && !s.exists.fa).length.toString()],
    ['Missing in AR (Used)', keyStatuses.filter(s => s.used && !s.exists.ar).length.toString()],
    ['', ''],
    ['Generated At', new Date().toISOString()],
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Sheet 4: By Namespace
  const namespaceStats = new Map<string, { total: number; used: number; missing: Record<Language, number>; empty: Record<Language, number> }>();
  
  for (const status of keyStatuses) {
    if (!namespaceStats.has(status.namespace)) {
      namespaceStats.set(status.namespace, {
        total: 0,
        used: 0,
        missing: { en: 0, ps: 0, fa: 0, ar: 0 },
        empty: { en: 0, ps: 0, fa: 0, ar: 0 },
      });
    }
    
    const stats = namespaceStats.get(status.namespace)!;
    stats.total++;
    if (status.used) stats.used++;
    
    for (const lang of LANGUAGES) {
      if (!status.exists[lang]) stats.missing[lang]++;
      if (status.empty[lang]) stats.empty[lang]++;
    }
  }
  
  const namespaceData = [
    [
      'Namespace',
      'Total Keys',
      'Used Keys',
      'EN Missing',
      'EN Empty',
      'PS Missing',
      'PS Empty',
      'FA Missing',
      'FA Empty',
      'AR Missing',
      'AR Empty',
    ],
  ];
  
  for (const [namespace, stats] of Array.from(namespaceStats.entries()).sort((a, b) => b[1].total - a[1].total)) {
    namespaceData.push([
      namespace,
      stats.total.toString(),
      stats.used.toString(),
      stats.missing.en.toString(),
      stats.empty.en.toString(),
      stats.missing.ps.toString(),
      stats.empty.ps.toString(),
      stats.missing.fa.toString(),
      stats.empty.fa.toString(),
      stats.missing.ar.toString(),
      stats.empty.ar.toString(),
    ]);
  }
  
  const namespaceSheet = XLSX.utils.aoa_to_sheet(namespaceData);
  XLSX.utils.book_append_sheet(workbook, namespaceSheet, 'By Namespace');
  
  // Write file
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  XLSX.writeFile(workbook, EXCEL_OUTPUT);
  console.log(`✅ Excel report generated: ${EXCEL_OUTPUT}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Enhanced Translation Coverage Analyzer\n');
  
  // Step 1: Extract all keys (single source of truth)
  console.log('📖 Extracting translation keys from types.ts (single source of truth)...');
  const allKeys = extractAllKeys();
  console.log(`   Found ${allKeys.size} translation keys\n`);
  
  // Step 2: Load all translation files (already imported at top)
  console.log('📚 Loading translation files...');
  const translations: Record<Language, Map<string, string>> = {
    en: flattenToDotKeys(en),
    ps: flattenToDotKeys(ps),
    fa: flattenToDotKeys(fa),
    ar: flattenToDotKeys(ar),
  };
  
  for (const lang of LANGUAGES) {
    console.log(`   ${lang.toUpperCase()}: ${translations[lang].size} keys loaded`);
  }
  console.log();
  
  // Step 3: Extract used keys from codebase
  console.log('🔎 Scanning codebase for used translation keys...');
  const usedKeys = extractUsedKeys();
  console.log(`   Found ${usedKeys.size} unique keys in use\n`);
  
  // Step 4: Generate Excel report
  generateExcelReport(allKeys, translations, usedKeys);
  
  // Print summary
  console.log('\n📈 Summary:');
  console.log(`   Total Keys: ${allKeys.size}`);
  console.log(`   Used Keys: ${usedKeys.size} (${((usedKeys.size / allKeys.size) * 100).toFixed(1)}%)`);
  console.log(`   Unused Keys: ${allKeys.size - usedKeys.size} (${(((allKeys.size - usedKeys.size) / allKeys.size) * 100).toFixed(1)}%)`);
  
  const missingCounts = {
    ps: Array.from(allKeys).filter(k => !translations.ps.has(k)).length,
    fa: Array.from(allKeys).filter(k => !translations.fa.has(k)).length,
    ar: Array.from(allKeys).filter(k => !translations.ar.has(k)).length,
  };
  
  console.log(`\n   Missing Translations:`);
  console.log(`     PS: ${missingCounts.ps}`);
  console.log(`     FA: ${missingCounts.fa}`);
  console.log(`     AR: ${missingCounts.ar}`);
  
  console.log(`\n✅ Analysis complete! Check the Excel file for detailed coverage.`);
}

// Run the script
main();

