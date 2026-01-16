/**
 * Nazim Web - Translation Count Verification Script
 *
 * Verifies exact translation key counts and finds discrepancies:
 * - Counts keys in each language file
 * - Finds duplicate keys
 * - Compares flattenTranslations() vs syncMissingKeys()
 * - Identifies keys missing in each language
 * - Shows detailed breakdown
 *
 * Usage:
 *   tsx scripts/i18n/verify-translation-counts.ts
 */

/// <reference types="node" />

import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';
import { flattenTranslations, syncMissingKeys } from '../../src/lib/translations/utils';

type Lang = 'en' | 'ps' | 'fa' | 'ar';

interface KeyInfo {
  key: string;
  existsIn: Set<Lang>;
  values: Record<Lang, string>;
}

function getAllKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      
      if (typeof v === 'string') {
        keys.push(fullKey);
      } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        keys.push(...getAllKeys(v, fullKey));
      }
    }
  }
  
  return keys;
}

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  
  return typeof current === 'string' ? current : '';
}

function findDuplicates(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  const duplicates = new Map<string, number>();
  
  for (const key of keys) {
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  
  for (const [key, count] of counts.entries()) {
    if (count > 1) {
      duplicates.set(key, count);
    }
  }
  
  return duplicates;
}

function collectAllKeys(): Map<string, KeyInfo> {
  const translations = { en, ps, fa, ar };
  const allKeysMap = new Map<string, KeyInfo>();
  
  // Collect all keys from all languages
  for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
    const keys = getAllKeys(translations[lang]);
    
    for (const key of keys) {
      if (!allKeysMap.has(key)) {
        allKeysMap.set(key, {
          key,
          existsIn: new Set(),
          values: { en: '', ps: '', fa: '', ar: '' },
        });
      }
      
      const info = allKeysMap.get(key)!;
      info.existsIn.add(lang);
      info.values[lang] = getNestedValue(
        translations[lang] as unknown as Record<string, unknown>,
        key
      );
    }
  }
  
  return allKeysMap;
}

function main() {
  console.log('🔍 Translation Count Verification\n');
  console.log('=' .repeat(60));
  console.log();
  
  // Step 1: Count keys in each language file
  console.log('📊 Step 1: Raw Key Counts from Files');
  console.log('-'.repeat(60));
  
  const enKeys = getAllKeys(en);
  const psKeys = getAllKeys(ps);
  const faKeys = getAllKeys(fa);
  const arKeys = getAllKeys(ar);
  
  console.log(`EN keys: ${enKeys.length}`);
  console.log(`PS keys: ${psKeys.length}`);
  console.log(`FA keys: ${faKeys.length}`);
  console.log(`AR keys: ${arKeys.length}`);
  console.log();
  
  // Step 2: Find duplicates
  console.log('🔍 Step 2: Checking for Duplicate Keys');
  console.log('-'.repeat(60));
  
  const enDups = findDuplicates(enKeys);
  const psDups = findDuplicates(psKeys);
  const faDups = findDuplicates(faKeys);
  const arDups = findDuplicates(arKeys);
  
  if (enDups.size > 0) {
    console.log(`⚠️  EN has ${enDups.size} duplicate key(s):`);
    for (const [key, count] of Array.from(enDups.entries()).slice(0, 10)) {
      console.log(`   - ${key} (appears ${count} times)`);
    }
    if (enDups.size > 10) {
      console.log(`   ... and ${enDups.size - 10} more`);
    }
  } else {
    console.log('✅ EN: No duplicates');
  }
  
  if (psDups.size > 0) {
    console.log(`⚠️  PS has ${psDups.size} duplicate key(s):`);
    for (const [key, count] of Array.from(psDups.entries()).slice(0, 10)) {
      console.log(`   - ${key} (appears ${count} times)`);
    }
    if (psDups.size > 10) {
      console.log(`   ... and ${psDups.size - 10} more`);
    }
  } else {
    console.log('✅ PS: No duplicates');
  }
  
  if (faDups.size > 0) {
    console.log(`⚠️  FA has ${faDups.size} duplicate key(s):`);
    for (const [key, count] of Array.from(faDups.entries()).slice(0, 10)) {
      console.log(`   - ${key} (appears ${count} times)`);
    }
    if (faDups.size > 10) {
      console.log(`   ... and ${faDups.size - 10} more`);
    }
  } else {
    console.log('✅ FA: No duplicates');
  }
  
  if (arDups.size > 0) {
    console.log(`⚠️  AR has ${arDups.size} duplicate key(s):`);
    for (const [key, count] of Array.from(arDups.entries()).slice(0, 10)) {
      console.log(`   - ${key} (appears ${count} times)`);
    }
    if (arDups.size > 10) {
      console.log(`   ... and ${arDups.size - 10} more`);
    }
  } else {
    console.log('✅ AR: No duplicates');
  }
  console.log();
  
  // Step 3: Count unique keys
  console.log('📈 Step 3: Unique Key Counts');
  console.log('-'.repeat(60));
  
  const uniqueEnKeys = new Set(enKeys);
  const uniquePsKeys = new Set(psKeys);
  const uniqueFaKeys = new Set(faKeys);
  const uniqueArKeys = new Set(arKeys);
  
  console.log(`EN unique keys: ${uniqueEnKeys.size} (${enKeys.length - uniqueEnKeys.size} duplicates)`);
  console.log(`PS unique keys: ${uniquePsKeys.size} (${psKeys.length - uniquePsKeys.size} duplicates)`);
  console.log(`FA unique keys: ${uniqueFaKeys.size} (${faKeys.length - uniqueFaKeys.size} duplicates)`);
  console.log(`AR unique keys: ${uniqueArKeys.size} (${arKeys.length - uniqueArKeys.size} duplicates)`);
  console.log();
  
  // Step 4: Union of all keys
  console.log('🌐 Step 4: Union of All Keys');
  console.log('-'.repeat(60));
  
  const allKeysSet = new Set([...enKeys, ...psKeys, ...faKeys, ...arKeys]);
  console.log(`Total unique keys across all languages: ${allKeysSet.size}`);
  console.log();
  
  // Step 5: Compare with utility functions
  console.log('🔧 Step 5: Comparison with Utility Functions');
  console.log('-'.repeat(60));
  
  const flattened = flattenTranslations();
  const synced = syncMissingKeys();
  
  console.log(`flattenTranslations() returns: ${flattened.length} rows`);
  const flattenedUniqueKeys = new Set(flattened.map(t => t.key));
  console.log(`flattenTranslations() unique keys: ${flattenedUniqueKeys.size}`);
  
  if (flattened.length !== flattenedUniqueKeys.size) {
    console.log(`⚠️  flattenTranslations() has ${flattened.length - flattenedUniqueKeys.size} duplicate rows!`);
  }
  
  console.log();
  console.log(`syncMissingKeys() returns: ${synced.length} rows`);
  const syncedUniqueKeys = new Set(synced.map(t => t.key));
  console.log(`syncMissingKeys() unique keys: ${syncedUniqueKeys.size}`);
  
  if (synced.length !== syncedUniqueKeys.size) {
    console.log(`⚠️  syncMissingKeys() has ${synced.length - syncedUniqueKeys.size} duplicate rows!`);
  }
  console.log();
  
  // Step 6: Find keys in each language
  console.log('🔑 Step 6: Key Distribution Across Languages');
  console.log('-'.repeat(60));
  
  const allKeysMap = collectAllKeys();
  
  const keysOnlyInEn = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('en') && !k.existsIn.has('ps') && !k.existsIn.has('fa') && !k.existsIn.has('ar')
  );
  const keysOnlyInPs = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('ps') && !k.existsIn.has('en') && !k.existsIn.has('fa') && !k.existsIn.has('ar')
  );
  const keysOnlyInFa = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('fa') && !k.existsIn.has('en') && !k.existsIn.has('ps') && !k.existsIn.has('ar')
  );
  const keysOnlyInAr = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('ar') && !k.existsIn.has('en') && !k.existsIn.has('ps') && !k.existsIn.has('fa')
  );
  
  console.log(`Keys only in EN: ${keysOnlyInEn.length}`);
  console.log(`Keys only in PS: ${keysOnlyInPs.length}`);
  console.log(`Keys only in FA: ${keysOnlyInFa.length}`);
  console.log(`Keys only in AR: ${keysOnlyInAr.length}`);
  console.log();
  
  // Step 7: Missing keys analysis
  console.log('❌ Step 7: Missing Keys Analysis');
  console.log('-'.repeat(60));
  
  const missingInPs = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('en') && !k.existsIn.has('ps')
  );
  const missingInFa = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('en') && !k.existsIn.has('fa')
  );
  const missingInAr = Array.from(allKeysMap.values()).filter(k => 
    k.existsIn.has('en') && !k.existsIn.has('ar')
  );
  
  console.log(`Keys in EN but missing in PS: ${missingInPs.length}`);
  console.log(`Keys in EN but missing in FA: ${missingInFa.length}`);
  console.log(`Keys in EN but missing in AR: ${missingInAr.length}`);
  console.log();
  
  // Step 8: Summary and discrepancies
  console.log('📋 Step 8: Summary & Discrepancies');
  console.log('-'.repeat(60));
  
  console.log(`Expected flattenTranslations() count: ${uniqueEnKeys.size} (unique EN keys)`);
  console.log(`Actual flattenTranslations() count: ${flattened.length} rows`);
  if (flattened.length !== uniqueEnKeys.size) {
    const diff = flattened.length - uniqueEnKeys.size;
    console.log(`⚠️  DISCREPANCY: ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} rows than expected`);
  } else {
    console.log('✅ Count matches expected');
  }
  console.log();
  
  console.log(`Expected syncMissingKeys() count: ${allKeysSet.size} (union of all unique keys)`);
  console.log(`Actual syncMissingKeys() count: ${synced.length} rows`);
  if (synced.length !== allKeysSet.size) {
    const diff = synced.length - allKeysSet.size;
    console.log(`⚠️  DISCREPANCY: ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} rows than expected`);
  } else {
    console.log('✅ Count matches expected');
  }
  console.log();
  
  // Step 9: Show sample of keys that might explain the discrepancy
  if (flattened.length !== uniqueEnKeys.size || synced.length !== allKeysSet.size) {
    console.log('🔍 Step 9: Investigating Discrepancies');
    console.log('-'.repeat(60));
    
    // Find keys in flattened that aren't in uniqueEnKeys
    const flattenedKeysNotInEn = flattened
      .map(t => t.key)
      .filter(k => !uniqueEnKeys.has(k));
    
    if (flattenedKeysNotInEn.length > 0) {
      console.log(`Keys in flattenTranslations() but not in EN file (${flattenedKeysNotInEn.length}):`);
      for (const key of flattenedKeysNotInEn.slice(0, 10)) {
        console.log(`   - ${key}`);
      }
      if (flattenedKeysNotInEn.length > 10) {
        console.log(`   ... and ${flattenedKeysNotInEn.length - 10} more`);
      }
      console.log();
    }
    
    // Find keys in synced that aren't in allKeysSet
    const syncedKeysNotInUnion = synced
      .map(t => t.key)
      .filter(k => !allKeysSet.has(k));
    
    if (syncedKeysNotInUnion.length > 0) {
      console.log(`Keys in syncMissingKeys() but not in union (${syncedKeysNotInUnion.length}):`);
      for (const key of syncedKeysNotInUnion.slice(0, 10)) {
        console.log(`   - ${key}`);
      }
      if (syncedKeysNotInUnion.length > 10) {
        console.log(`   ... and ${syncedKeysNotInUnion.length - 10} more`);
      }
      console.log();
    }
  }
  
  console.log('='.repeat(60));
  console.log('✅ Verification complete!');
  
  // Step 10: Calculate what the UI should show
  console.log();
  console.log('💡 Step 10: Expected UI Counts');
  console.log('-'.repeat(60));
  console.log(`Before sync (flattenTranslations): ${flattened.length} rows`);
  console.log(`After sync (syncMissingKeys): ${synced.length} rows`);
  console.log(`Expected difference: ${synced.length - flattened.length} keys`);
  console.log();
  console.log('If you see different counts in the UI, possible causes:');
  console.log('1. Translation files have been modified since this script ran');
  console.log('2. Browser cache showing old data');
  console.log('3. Keys being loaded from database (translation_changes table)');
  console.log('4. Different version of translation files in build');
  console.log();
  console.log('🔧 Recommended Actions:');
  console.log('1. Clear browser cache and hard refresh (Ctrl+Shift+R)');
  console.log('2. Check if translation files have been modified');
  console.log('3. Fix duplicate keys found above');
  console.log('4. Rebuild the frontend if using a build process');
}

// Run the script
try {
  main();
} catch (err) {
  console.error('❌ Unhandled error:', err);
  if (err instanceof Error) {
    console.error('Error message:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(1);
}

