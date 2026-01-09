#!/usr/bin/env tsx

/**
 * Script to replace used translation keys with unused (edited) ones
 * 
 * The user has edited and fixed many unused keys with better grammar/terminology.
 * This script:
 * 1. Finds unused keys that have corresponding used keys (e.g., aboutUs.* vs landing.aboutUs.*)
 * 2. Replaces all usages of the used keys with the unused ones
 * 3. Preserves the edited translations in the unused keys
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

type Language = 'en' | 'ps' | 'fa' | 'ar';

interface KeyMapping {
  unusedKey: string;
  usedKey: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extract all translation keys from types.ts using the same method as coverage script
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
    
    const keyMatch = line.match(/^(\w+):\s*string/);
    if (keyMatch) {
      const keyName = keyMatch[1];
      const fullKey = [...pathStack, keyName].join('.');
      keys.add(fullKey);
    }
    
    if (closeBraces > 0 && pathStack.length > 0) {
      pathStack.pop();
    }
  }
  
  return keys;
}

/**
 * Extract used keys from codebase
 */
function extractUsedKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const files = getAllSourceFiles(FRONTEND_DIR);
  
  const patterns = [
    /\bt\(\s*['"]([^'"]+)['"]/g,
    /showToast\.(success|error|info|warning|loading)\(['"]([^'"]+)['"]/g,
    /titleKey:\s*['"]([^'"]+)['"]/g,
    /labelKey:\s*['"]([^'"]+)['"]/g,
    /placeholderKey:\s*['"]([^'"]+)['"]/g,
    /getValidationMessage\(['"]([^'"]+)['"]/g,
  ];
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1] || match[2];
        if (key && key.includes('.')) {
          usedKeys.add(key);
        }
      }
    }
  }
  
  // Also extract navigation titleKey values and construct nav.* keys
  const sidebarFile = files.find(f => f.includes('SmartSidebar.tsx'));
  if (sidebarFile) {
    const sidebarContent = fs.readFileSync(sidebarFile, 'utf-8');
    const titleKeyRegex = /titleKey:\s*['"]([^'"]+)['"]/g;
    let titleKeyMatch: RegExpExecArray | null;
    while ((titleKeyMatch = titleKeyRegex.exec(sidebarContent)) !== null) {
      const key = titleKeyMatch[1];
      if (key) {
        usedKeys.add(`nav.${key}`);
        if (key.includes('.')) {
          usedKeys.add(key);
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
      if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'translation-reports'].includes(file)) {
        getAllSourceFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !file.includes('.test.') && !file.includes('.spec.') && !file.includes('.generated.')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

/**
 * Find mappings between unused and used keys
 */
function findKeyMappings(allKeys: Set<string>, usedKeys: Set<string>): KeyMapping[] {
  const mappings: KeyMapping[] = [];
  const unusedKeys = Array.from(allKeys).filter(k => !usedKeys.has(k));
  
  console.log(`\n📊 Analysis:`);
  console.log(`   Total keys: ${allKeys.size}`);
  console.log(`   Used keys: ${usedKeys.size}`);
  console.log(`   Unused keys: ${unusedKeys.length}`);
  
  // Strategy 1: Remove common prefixes from used keys to match unused
  // e.g., landing.aboutUs.title -> aboutUs.title
  const commonPrefixes = ['landing.', 'nav.', 'common.', 'toast.', 'validation.'];
  
  for (const usedKey of usedKeys) {
    for (const prefix of commonPrefixes) {
      if (usedKey.startsWith(prefix)) {
        const withoutPrefix = usedKey.slice(prefix.length);
        if (unusedKeys.includes(withoutPrefix)) {
          mappings.push({
            unusedKey: withoutPrefix,
            usedKey: usedKey,
            confidence: 'high',
          });
        }
      }
    }
  }
  
  // Strategy 2: Add common prefixes to unused keys to match used
  // e.g., aboutUs.title -> landing.aboutUs.title
  for (const unusedKey of unusedKeys) {
    for (const prefix of commonPrefixes) {
      const withPrefix = prefix + unusedKey;
      if (usedKeys.has(withPrefix)) {
        // Only add if not already mapped
        if (!mappings.find(m => m.unusedKey === unusedKey && m.usedKey === withPrefix)) {
          mappings.push({
            unusedKey: unusedKey,
            usedKey: withPrefix,
            confidence: 'high',
          });
        }
      }
    }
  }
  
  // Strategy 3: Find keys with same base but different namespace
  // e.g., aboutUs.cta.button vs landing.aboutUs.cta.button
  const usedKeyMap = new Map<string, string[]>();
  for (const usedKey of usedKeys) {
    const parts = usedKey.split('.');
    if (parts.length >= 2) {
      const baseKey = parts.slice(1).join('.');
      if (!usedKeyMap.has(baseKey)) {
        usedKeyMap.set(baseKey, []);
      }
      usedKeyMap.get(baseKey)!.push(usedKey);
    }
  }
  
  for (const unusedKey of unusedKeys) {
    const parts = unusedKey.split('.');
    if (parts.length >= 2) {
      const baseKey = parts.slice(1).join('.');
      const candidates = usedKeyMap.get(baseKey) || [];
      
      for (const candidate of candidates) {
        if (candidate !== unusedKey && !mappings.find(m => m.unusedKey === unusedKey && m.usedKey === candidate)) {
          mappings.push({
            unusedKey: unusedKey,
            usedKey: candidate,
            confidence: parts.length === 2 ? 'high' : 'medium',
          });
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueMappings = new Map<string, KeyMapping>();
  for (const mapping of mappings) {
    const key = `${mapping.unusedKey}->${mapping.usedKey}`;
    if (!uniqueMappings.has(key)) {
      uniqueMappings.set(key, mapping);
    }
  }
  
  return Array.from(uniqueMappings.values());
}

/**
 * Replace keys in a file
 */
function replaceKeysInFile(filePath: string, mappings: KeyMapping[]): { modified: boolean; replacements: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  let replacements = 0;
  
  for (const mapping of mappings) {
    const escapedUsed = escapeRegex(mapping.usedKey);
    const escapedUnused = escapeRegex(mapping.unusedKey);
    
    // Pattern 1: t('usedKey')
    const pattern1 = new RegExp(`\\bt\\((['"])${escapedUsed}\\1`, 'g');
    if (pattern1.test(content)) {
      content = content.replace(pattern1, (match, quote) => {
        return match.replace(mapping.usedKey, mapping.unusedKey);
      });
      modified = true;
      replacements++;
    }
    
    // Pattern 2: showToast.*('usedKey')
    const pattern2 = new RegExp(`showToast\\.(success|error|info|warning|loading)\\((['"])${escapedUsed}\\2`, 'g');
    if (pattern2.test(content)) {
      content = content.replace(pattern2, (match, method, quote) => {
        return match.replace(mapping.usedKey, mapping.unusedKey);
      });
      modified = true;
      replacements++;
    }
    
    // Pattern 3: titleKey: 'usedKey'
    const pattern3 = new RegExp(`titleKey:\\s*(['"])${escapedUsed}\\1`, 'g');
    if (pattern3.test(content)) {
      content = content.replace(pattern3, (match, quote) => {
        return match.replace(mapping.usedKey, mapping.unusedKey);
      });
      modified = true;
      replacements++;
    }
    
    // Pattern 4: labelKey, placeholderKey, etc.
    const pattern4 = new RegExp(`(labelKey|placeholderKey|descriptionKey|helpKey|errorKey|tooltipKey):\\s*(['"])${escapedUsed}\\2`, 'g');
    if (pattern4.test(content)) {
      content = content.replace(pattern4, (match, prop, quote) => {
        return match.replace(mapping.usedKey, mapping.unusedKey);
      });
      modified = true;
      replacements++;
    }
    
    // Pattern 5: getValidationMessage('usedKey')
    const pattern5 = new RegExp(`getValidationMessage\\((['"])${escapedUsed}\\1`, 'g');
    if (pattern5.test(content)) {
      content = content.replace(pattern5, (match, quote) => {
        return match.replace(mapping.usedKey, mapping.unusedKey);
      });
      modified = true;
      replacements++;
    }
    
    // Pattern 6: Template literals t(`nav.${...}`) - handle carefully
    // This is more complex and might need manual review
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
  
  return { modified, replacements };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Replacing used keys with unused (edited) keys...\n');
  
  // Extract keys
  console.log('📖 Extracting all keys from types.ts...');
  const allKeys = extractAllKeys();
  console.log(`   Found ${allKeys.size} total keys`);
  
  console.log('\n🔎 Scanning codebase for used keys...');
  const usedKeys = extractUsedKeys();
  console.log(`   Found ${usedKeys.size} used keys`);
  
  // Find mappings
  console.log('\n🔗 Finding key mappings...');
  const mappings = findKeyMappings(allKeys, usedKeys);
  console.log(`   Found ${mappings.length} mappings`);
  
  if (mappings.length === 0) {
    console.log('\n❌ No mappings found. Exiting.');
    return;
  }
  
  // Group by confidence
  const highConfidence = mappings.filter(m => m.confidence === 'high');
  const mediumConfidence = mappings.filter(m => m.confidence === 'medium');
  const lowConfidence = mappings.filter(m => m.confidence === 'low');
  
  console.log(`\n📊 Mappings by confidence:`);
  console.log(`   High: ${highConfidence.length}`);
  console.log(`   Medium: ${mediumConfidence.length}`);
  console.log(`   Low: ${lowConfidence.length}`);
  
  // Show some examples
  console.log('\n📋 Sample mappings (high confidence):');
  highConfidence.slice(0, 10).forEach(m => {
    console.log(`   ${m.usedKey} → ${m.unusedKey}`);
  });
  if (highConfidence.length > 10) {
    console.log(`   ... and ${highConfidence.length - 10} more`);
  }
  
  // Ask for confirmation
  console.log(`\n⚠️  This will replace ${mappings.length} keys across the codebase.`);
  console.log('   Make sure you have committed your changes!');
  console.log('\n   Processing in 3 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Replace in all files
  console.log('\n🔄 Replacing keys in codebase...');
  const files = getAllSourceFiles(FRONTEND_DIR);
  let replacedFiles = 0;
  let totalReplacements = 0;
  
  for (const file of files) {
    const result = replaceKeysInFile(file, mappings);
    if (result.modified) {
      replacedFiles++;
      totalReplacements += result.replacements;
      console.log(`   ✓ ${path.relative(FRONTEND_DIR, file)} (${result.replacements} replacements)`);
    }
  }
  
  console.log(`\n✅ Replacement complete!`);
  console.log(`   Files modified: ${replacedFiles}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review the changes: git diff`);
  console.log(`   2. Test the application`);
  console.log(`   3. Run: npm run i18n:coverage:excel`);
  console.log(`   4. Commit the changes`);
}

main().catch(console.error);
