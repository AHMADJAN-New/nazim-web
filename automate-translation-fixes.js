#!/usr/bin/env node

/**
 * Translation Automation Script
 * 
 * This script automates the process of:
 * 1. Replacing hardcoded error messages with existing translation keys
 * 2. Finding missing translation keys that need to be added
 * 3. Generating a detailed migration plan
 * 4. Optionally applying fixes automatically (with --apply flag)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const TYPES_FILE = path.join(FRONTEND_DIR, 'lib', 'translations', 'types.ts');
const EN_FILE = path.join(FRONTEND_DIR, 'lib', 'translations', 'en.ts');
const REPORT_FILE = path.join(__dirname, 'translation-usage-report.md');
const OUTPUT_FILE = path.join(__dirname, 'translation-fixes-report.md');

/**
 * Load unused keys from the report
 */
function loadUnusedKeys() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error('❌ Report file not found. Run analyze-translation-usage.js first.');
    process.exit(1);
  }
  
  const report = fs.readFileSync(REPORT_FILE, 'utf-8');
  
  // Try multiple patterns to match the unused keys section
  let match = report.match(/## Unused Translation Keys.*?```\n([\s\S]*?)```/);
  
  // If that doesn't work, try with code block markers
  if (!match) {
    match = report.match(/## Unused Translation Keys[\s\S]*?```[\s\S]*?\n([\s\S]*?)```/);
  }
  
  // If still no match, try finding the section and extracting manually
  if (!match) {
    const unusedSection = report.match(/## Unused Translation Keys[\s\S]*?```([\s\S]*?)```/);
    if (unusedSection) {
      match = [null, unusedSection[1]];
    }
  }
  
  if (!match || !match[1]) {
    console.warn('   ⚠️  Could not parse unused keys from report');
    return [];
  }
  
  let keys = match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      return line && 
             !line.includes('...') && 
             !line.includes('and') && 
             !line.includes('more') &&
             !line.match(/^\.\.\./) &&
             line.includes('.') && // Must be a valid key with dots
             line.length > 3; // Must be meaningful
    });
  
  // The report might truncate, so also try to extract from the full report
  // Look for the pattern after the code block
  const fullUnusedSection = report.match(/## Unused Translation Keys[\s\S]*?```[\s\S]*?```([\s\S]*?)(?=##|$)/);
  if (fullUnusedSection) {
    // Try to extract more keys from the continuation
    const continuation = fullUnusedSection[1];
    const moreKeys = continuation
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.includes('.') && line.length > 3 && !line.match(/^[#\s]/));
    keys = [...keys, ...moreKeys];
  }
  
  // If we got less than expected, try to get all unused keys from direct analysis
  if (keys.length < 200) {
    console.log('   ⚠️  Report appears truncated, extracting from direct analysis...');
    try {
      // Try to extract all keys from types file and cross-reference
      const allKeys = extractAllKeysFromTypes();
      const usedKeys = extractUsedKeysFromCodebase();
      const trulyUnused = allKeys.filter(key => !usedKeys.has(key));
      if (trulyUnused.length > keys.length) {
        console.log(`   ✅ Found ${trulyUnused.length} unused keys from direct analysis`);
        return trulyUnused;
      }
    } catch (e) {
      console.warn(`   ⚠️  Could not extract all keys: ${e.message}`);
    }
  }
  
  return [...new Set(keys)]; // Remove duplicates
}

/**
 * Extract all keys from types.ts
 */
function extractAllKeysFromTypes() {
  const content = fs.readFileSync(TYPES_FILE, 'utf-8');
  const keys = new Set();
  const lines = content.split('\n');
  const pathStack = [];
  let inInterface = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    line = line.replace(/\/\/.*$/, '').trim();
    
    if (line.includes('interface TranslationKeys')) {
      inInterface = true;
      braceDepth = 0;
      pathStack.length = 0;
      continue;
    }
    
    if (!inInterface) continue;
    
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const prevBraceDepth = braceDepth;
    braceDepth += openBraces - closeBraces;
    
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
      keys.add([...pathStack, keyMatch[1]].join('.'));
      continue;
    }
    
    const quotedKeyMatch = line.match(/^["']([^"']+)["']:\s*string;/);
    if (quotedKeyMatch && pathStack.length > 0) {
      const key = quotedKeyMatch[1];
      if (key.includes('.')) {
        keys.add(key);
      } else {
        keys.add([...pathStack, key].join('.'));
      }
      continue;
    }
    
    if (closeBraces > 0 && pathStack.length > 0 && braceDepth < prevBraceDepth) {
      pathStack.pop();
    }
    
    if (braceDepth < 0) {
      inInterface = false;
      pathStack.length = 0;
    }
  }
  
  return Array.from(keys);
}

/**
 * Extract used keys from codebase
 */
function extractUsedKeysFromCodebase() {
  const usedKeys = new Set();
  const files = getAllSourceFiles(FRONTEND_DIR);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Match t('key') or t("key")
    const tMatches = content.matchAll(/t\(['"]([^'"]+)['"]\)/g);
    for (const match of tMatches) {
      usedKeys.add(match[1]);
    }
    
    // Match showToast.success('key'), etc.
    const toastMatches = content.matchAll(/showToast\.(success|error|info|warning|loading)\(['"]([^'"]+)['"]/g);
    for (const match of toastMatches) {
      usedKeys.add(match[2]);
    }
    
    // Match validationMessages.helper()
    const validationMatches = content.matchAll(/validationMessages\.(\w+)\(/g);
    for (const match of validationMatches) {
      const helperName = match[1];
      const helperMap = {
        invalidUuid: 'validation.invalidUuid',
        invalidEmail: 'validation.invalidEmail',
        fieldRequired: 'validation.fieldRequired',
        fieldMaxLength: 'validation.fieldMaxLength',
        phoneMaxLength: 'validation.phoneMaxLength',
        passwordsDoNotMatch: 'validation.passwordsDoNotMatch',
      };
      if (helperMap[helperName]) {
        usedKeys.add(helperMap[helperName]);
      } else {
        usedKeys.add(`validation.${helperName}`);
      }
    }
    
    // Match titleKey: 'key'
    const titleKeyMatches = content.matchAll(/titleKey:\s*['"]([^'"]+)['"]/g);
    for (const match of titleKeyMatches) {
      usedKeys.add(match[1]);
    }
  }
  
  return usedKeys;
}

/**
 * Check if a key exists in types.ts (checking all sections)
 */
function keyExistsInTypes(key, allKeys) {
  // Exact match
  if (allKeys.includes(key)) return true;
  
  // Check if key exists in a different section
  // e.g., "buildings.buildingCreated" might exist as "buildings.buildingCreated" in buildings section
  // or "academic.teacherSubjectAssignments.title" might exist as "teacherSubjectAssignments.title" in academic section
  const keyParts = key.split('.');
  
  // Try matching with different section prefixes
  // For example, if key is "toast.staff.created", check if "staff.created" exists anywhere
  // Or if key is "buildings.buildingCreated", check if it exists in buildings section
  for (let i = 1; i < keyParts.length; i++) {
    const partialKey = keyParts.slice(i).join('.');
    if (allKeys.includes(partialKey)) {
      return true;
    }
  }
  
  // Check if any defined key is a parent or child of this key
  for (const definedKey of allKeys) {
    // Check if usedKey is a child of definedKey
    if (key.startsWith(definedKey + '.')) return true;
    // Check if definedKey is a child of usedKey
    if (definedKey.startsWith(key + '.')) return true;
  }
  
  return false;
}

/**
 * Load missing keys from the report (filtered) and also extract from codebase
 */
function loadMissingKeys() {
  const missingKeys = new Set();
  
  // First, extract all keys from types.ts to check against
  const allKeys = extractAllKeysFromTypes();
  
  // First, try to get from report
  if (fs.existsSync(REPORT_FILE)) {
    const report = fs.readFileSync(REPORT_FILE, 'utf-8');
    const match = report.match(/## Missing Translation Keys.*?```\n([\s\S]*?)```/);
    
    if (match) {
      const keys = match[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Filter out false positives
          const key = line;
          return key &&
                 !key.match(/^[\/@\[\]\.:;,\-_\d\s]+$/) && // Paths, CSS selectors, single chars
                 !key.startsWith('@/') && // Import paths
                 !key.startsWith('/') && // Routes
                 !key.includes('?url') && // Vite imports (e.g., @/fonts/...?url)
                 !key.match(/^[a-z]$/) && // Single letters
                 key.length > 3 && // Too short
                 !key.match(/^[A-Z][a-z]+$/) && // Single words (likely not keys)
                 (key.includes('.') || key.includes(' ')); // Must have dots or spaces (multi-word)
        });
      
      keys.forEach(k => missingKeys.add(k));
    }
  }
  
  // Also extract from codebase directly
  const usedKeys = extractUsedKeysFromCodebase();
  
  // Find keys used but not defined
  for (const usedKey of usedKeys) {
    // Skip if it's not a valid translation key pattern
    if (!usedKey.includes('.') || usedKey.split('.').length < 2) {
      continue;
    }
    
    // Check if it exists in types.ts
    if (!keyExistsInTypes(usedKey, allKeys)) {
      missingKeys.add(usedKey);
    }
  }
  
  // Final filtering: remove keys that already exist or are not translation keys
  return Array.from(missingKeys).filter(key => {
    // Must have category.key structure
    if (!key.includes('.') || key.split('.').length < 2) return false;
    
    // Must be meaningful length
    if (key.length < 5) return false;
    
    // Filter out non-translation keys
    if (key.match(/^[\/@\[\]\.:;,\-_\d\s]+$/)) return false;
    
    // Filter out font file paths
    if (key.includes('fonts/') || key.includes('Bahij Nassim') || key.includes('.woff') || key.includes('.ttf')) {
      return false;
    }
    
    // Filter out single words that are likely not keys
    if (key.match(/^[A-Z][a-z]+$/)) return false;
    
    // Check again if key exists (double-check)
    if (keyExistsInTypes(key, allKeys)) {
      return false;
    }
    
    return true;
  }).sort(); // Sort alphabetically for easier review
}

/**
 * Parse English translation file to get key -> value mapping
 */
function loadEnglishTranslations() {
  const content = fs.readFileSync(EN_FILE, 'utf-8');
  const translations = new Map();
  
  // Parse the nested structure
  // Match patterns like: key: 'value',
  const lines = content.split('\n');
  const pathStack = [];
  let inTranslationObject = false;
  let braceDepth = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Remove comments
    line = line.replace(/\/\/.*$/, '').trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*')) {
      continue;
    }
    
    // Detect start of translation object
    if (line.includes('export const en: TranslationKeys')) {
      inTranslationObject = true;
      braceDepth = 0;
      pathStack.length = 0;
      continue;
    }
    
    if (!inTranslationObject) continue;
    
    // Count braces
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    const prevBraceDepth = braceDepth;
    braceDepth += openBraces - closeBraces;
    
    // Detect object start: key: {
    const objectStartMatch = line.match(/^(\w+):\s*\{/);
    if (objectStartMatch) {
      pathStack.push(objectStartMatch[1]);
      continue;
    }
    
    // Detect quoted object: "key": {
    const quotedObjectMatch = line.match(/^["']([^"']+)["']:\s*\{/);
    if (quotedObjectMatch) {
      pathStack.push(quotedObjectMatch[1]);
      continue;
    }
    
    // Extract key-value pairs: key: 'value',
    const keyValueMatch = line.match(/^(\w+):\s*['"]([^'"]+)['"],?$/);
    if (keyValueMatch && pathStack.length > 0) {
      const key = keyValueMatch[1];
      const value = keyValueMatch[2];
      const fullKey = [...pathStack, key].join('.');
      translations.set(fullKey, value);
      continue;
    }
    
    // Extract quoted key-value: "key": 'value',
    const quotedKeyValueMatch = line.match(/^["']([^"']+)["']:\s*['"]([^'"]+)['"],?$/);
    if (quotedKeyValueMatch && pathStack.length > 0) {
      const key = quotedKeyValueMatch[1];
      const value = quotedKeyValueMatch[2];
      if (key.includes('.')) {
        translations.set(key, value);
      } else {
        const fullKey = [...pathStack, key].join('.');
        translations.set(fullKey, value);
      }
      continue;
    }
    
    // Pop from stack when closing brace
    if (closeBraces > 0 && pathStack.length > 0 && braceDepth < prevBraceDepth) {
      pathStack.pop();
    }
    
    // Reset if we've closed the main object
    if (braceDepth < 0) {
      inTranslationObject = false;
      pathStack.length = 0;
    }
  }
  
  return translations;
}

/**
 * Get all source files recursively
 */
function getAllSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.next', 'build', '__tests__'].includes(file)) {
        getAllSourceFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!file.includes('.test.') && !file.includes('.spec.') && !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * Normalize string for comparison (lowercase, trim, remove extra spaces)
 */
function normalizeString(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two strings are similar (for fuzzy matching)
 */
function stringsSimilar(str1, str2, threshold = 0.8) {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // One contains the other (for partial matches)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const longer = norm1.length > norm2.length ? norm1 : norm2;
    const shorter = norm1.length > norm2.length ? norm2 : norm1;
    return shorter.length / longer.length >= threshold;
  }
  
  return false;
}

/**
 * Validate file structure - check for common issues
 */
function validateFileStructure(content, filePath) {
  const issues = [];
  
  // Check for duplicate catch blocks (common structural issue)
  const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{/g);
  if (catchBlocks && catchBlocks.length > 1) {
    // Check if there are multiple catch blocks in the same try-catch
    const tryCatchPattern = /try\s*\{[\s\S]*?\}\s*catch/g;
    const matches = content.match(tryCatchPattern);
    if (matches && matches.length > 0) {
      // Count catch blocks per try
      const tryBlocks = content.match(/try\s*\{/g) || [];
      if (catchBlocks.length > tryBlocks.length) {
        issues.push('duplicate-catch-blocks');
      }
    }
  }
  
  // Check for syntax errors (unbalanced braces)
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push('unbalanced-braces');
  }
  
  // Check for duplicate function definitions
  const functionDefs = content.match(/^\s*(export\s+)?(const|function|async\s+function)\s+(\w+)/gm);
  if (functionDefs) {
    const functionNames = functionDefs.map(f => {
      const match = f.match(/(\w+)\s*[=:]/);
      return match ? match[1] : null;
    }).filter(Boolean);
    const duplicates = functionNames.filter((name, index) => functionNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      issues.push('duplicate-functions');
    }
  }
  
  return issues;
}

/**
 * Check if `t` function is available in the scope where the replacement will happen
 */
function isTFunctionAvailable(content, lineNumber) {
  const lines = content.split('\n');
  const targetLine = lines[lineNumber - 1];
  
  // Check if file imports useLanguage or t
  const hasUseLanguageImport = content.includes("from '@/hooks/useLanguage'") || content.includes('from "./useLanguage"');
  const hasTImport = content.includes("import { t }") && (content.includes("from '@/lib/i18n'") || content.includes('from "./i18n"'));
  
  if (hasTImport) {
    return { available: true, type: 'direct-import' };
  }
  
  if (hasUseLanguageImport) {
    // Check if useLanguage is called in the same function scope
    // Find the function containing this line
    let braceDepth = 0;
    let inFunction = false;
    let functionStart = -1;
    
    for (let i = 0; i < lineNumber; i++) {
      const line = lines[i];
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      braceDepth += openBraces - closeBraces;
      
      // Detect function start
      if (!inFunction && (line.match(/^\s*(export\s+)?(const|function|async\s+function)\s+\w+/) || 
                          line.match(/^\s*(\w+)\s*[:=]\s*(async\s+)?\(/))) {
        inFunction = true;
        functionStart = i;
      }
      
      // Check if useLanguage is called in this function
      if (inFunction && line.includes('useLanguage()')) {
        return { available: true, type: 'hook-call', functionStart };
      }
      
      // Reset if we've exited the function
      if (inFunction && braceDepth <= 0 && i > functionStart) {
        inFunction = false;
        functionStart = -1;
      }
    }
    
    // If we have the import but no hook call, we need to add it
    return { available: false, type: 'needs-hook-call', hasImport: true };
  }
  
  return { available: false, type: 'needs-import' };
}

/**
 * Find hardcoded error messages and strings that match unused translation keys
 */
function findErrorReplacements(unusedKeys, translations) {
  const replacements = [];
  const hardcodedStrings = [];
  const files = getAllSourceFiles(FRONTEND_DIR);
  const skippedFiles = [];
  
  console.log(`   Scanning ${files.length} files...`);
  
  // Create a map of normalized translation values to keys for faster lookup
  const translationValueMap = new Map();
  for (const key of unusedKeys) {
    const translation = translations.get(key);
    if (translation) {
      const normalized = normalizeString(translation);
      if (!translationValueMap.has(normalized)) {
        translationValueMap.set(normalized, []);
      }
      translationValueMap.get(normalized).push({ key, original: translation });
    }
  }
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Validate file structure first
    const structureIssues = validateFileStructure(content, file);
    if (structureIssues.length > 0) {
      skippedFiles.push({ file: path.relative(FRONTEND_DIR, file), issues: structureIssues });
      continue; // Skip files with structural issues
    }
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments and already translated lines
      if (line.trim().startsWith('//') || line.includes("t('") || line.includes('t("')) {
        continue;
      }
      
      // Match: throw new Error('message') or throw new Error("message")
      const errorMatch = line.match(/throw\s+new\s+Error\(['"]([^'"]{5,})['"]\)/);
      if (errorMatch) {
        const errorMessage = errorMatch[1];
        const normalized = normalizeString(errorMessage);
        
        // Check if t function is available in this scope
        const tAvailability = isTFunctionAvailable(content, i + 1);
        
        // Only proceed if t is available or we can safely add it
        // Skip if file has structural issues that would prevent safe replacement
        if (!tAvailability.available && tAvailability.type === 'needs-import') {
          // Skip - would require manual intervention
          continue;
        }
        
        // Try exact match first
        if (translationValueMap.has(normalized)) {
          const matches = translationValueMap.get(normalized);
          const match = matches[0]; // Use first match
          
          let newLine;
          if (tAvailability.available) {
            // t is available, safe to replace
            newLine = line.replace(
              /throw\s+new\s+Error\(['"]([^'"]+)['"]\)/,
              `throw new Error(t('${match.key}'))`
            );
          } else if (tAvailability.type === 'needs-hook-call' && tAvailability.hasImport) {
            // Has import but needs hook call - mark for manual review
            newLine = line.replace(
              /throw\s+new\s+Error\(['"]([^'"]+)['"]\)/,
              `throw new Error(t('${match.key}')) // TODO: Add const { t } = useLanguage(); in function scope`
            );
          } else {
            // Skip - too complex to auto-fix
            continue;
          }
          
          replacements.push({
            file: path.relative(FRONTEND_DIR, file),
            line: i + 1,
            original: line.trim(),
            errorMessage,
            translationKey: match.key,
            newLine: newLine.trim(),
            needsImport: !tAvailability.available && tAvailability.type === 'needs-import',
            needsHookCall: tAvailability.type === 'needs-hook-call',
            matchType: 'exact',
            safeToApply: tAvailability.available,
          });
          continue;
        }
        
        // Try fuzzy match (only if t is available)
        if (tAvailability.available) {
          for (const [normValue, keys] of translationValueMap.entries()) {
            if (stringsSimilar(errorMessage, normValue, 0.85)) {
              const match = keys[0];
              replacements.push({
                file: path.relative(FRONTEND_DIR, file),
                line: i + 1,
                original: line.trim(),
                errorMessage,
                translationKey: match.key,
                suggestedTranslation: match.original,
                newLine: line.replace(/throw\s+new\s+Error\(['"]([^'"]+)['"]\)/, `throw new Error(t('${match.key}'))`),
                needsImport: false,
                needsHookCall: false,
                matchType: 'fuzzy',
                safeToApply: true,
              });
              break;
            }
          }
        }
      }
      
      // Match: showToast.error('hardcoded message') or showToast.success('message')
      const toastMatch = line.match(/showToast\.(success|error|info|warning)\(['"]([^'"]{5,})['"]\)/);
      if (toastMatch) {
        const toastMessage = toastMatch[2];
        
        // Skip if it's already a translation key (contains dots)
        if (toastMessage.includes('.')) {
          continue;
        }
        
        const normalized = normalizeString(toastMessage);
        
        // Try exact match
        if (translationValueMap.has(normalized)) {
          const matches = translationValueMap.get(normalized);
          const match = matches[0];
          
          replacements.push({
            file: path.relative(FRONTEND_DIR, file),
            line: i + 1,
            original: line.trim(),
            errorMessage: toastMessage,
            translationKey: match.key,
            newLine: line.replace(
              /showToast\.(success|error|info|warning)\(['"]([^'"]+)['"]\)/,
              `showToast.${toastMatch[1]}('${match.key}')`
            ).trim(),
            needsImport: false, // showToast already handles translations
            matchType: 'exact',
          });
          continue;
        }
      }
      
      // Match hardcoded strings in JSX: "Text" or 'Text' (but not in comments or already translated)
      const jsxStringMatch = line.match(/(?:>|^|\s)['"]([A-Z][^'"]{10,})['"](?:\s|<|,|;|\))/);
      if (jsxStringMatch && !line.includes('//') && !line.includes('t(')) {
        const jsxString = jsxStringMatch[1];
        const normalized = normalizeString(jsxString);
        
        // Check if t function is available
        const tAvailability = isTFunctionAvailable(content, i + 1);
        
        // Try exact match (only if t is available or can be added)
        if (translationValueMap.has(normalized) && tAvailability.available) {
          const matches = translationValueMap.get(normalized);
          const match = matches[0];
          
          hardcodedStrings.push({
            file: path.relative(FRONTEND_DIR, file),
            line: i + 1,
            original: line.trim(),
            hardcodedString: jsxString,
            translationKey: match.key,
            suggested: line.replace(
              new RegExp(`(['"])${jsxString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`),
              `{t('${match.key}')}`
            ),
            needsImport: false,
            needsHookCall: false,
            matchType: 'exact',
            safeToApply: true,
          });
        }
      }
    }
  }
  
  if (skippedFiles.length > 0) {
    console.log(`   ⚠️  Skipped ${skippedFiles.length} files with structural issues`);
  }
  
  return { replacements, hardcodedStrings, skippedFiles };
}

/**
 * Generate detailed migration plan
 */
function generateMigrationPlan(replacements, hardcodedStrings, missingKeys) {
  // Group replacements by file
  const byFile = {};
  for (const replacement of replacements) {
    if (!byFile[replacement.file]) {
      byFile[replacement.file] = [];
    }
    byFile[replacement.file].push(replacement);
  }
  
  // Group hardcoded strings by file
  const hardcodedByFile = {};
  for (const hc of hardcodedStrings) {
    if (!hardcodedByFile[hc.file]) {
      hardcodedByFile[hc.file] = [];
    }
    hardcodedByFile[hc.file].push(hc);
  }
  
  const plan = `# Translation Fixes Migration Plan

Generated: ${new Date().toISOString()}

## Summary

- **Error Messages to Replace**: ${replacements.length}
- **Hardcoded Strings to Replace**: ${hardcodedStrings.length}
- **Files Affected**: ${Object.keys(byFile).length + Object.keys(hardcodedByFile).length}
- **Missing Keys to Add**: ${missingKeys.length}

## Step 1: Replace Hardcoded Error Messages

### Files Requiring Import Changes

These files need \`useLanguage\` hook or \`t\` function import:

${Object.entries(byFile)
  .filter(([_, reps]) => reps.some(r => r.needsImport))
  .map(([file, reps]) => {
    const needsImport = reps.filter(r => r.needsImport);
    return `- **\`${file}\`** - ${needsImport.length} replacement(s) need import`;
  })
  .join('\n')}

### Detailed Replacements by File

${Object.entries(byFile)
  .map(([file, reps]) => {
    return `#### \`${file}\`

${reps.map((r, i) => {
  return `**${i + 1}. Line ${r.line}**

Original:
\`\`\`typescript
${r.original}
\`\`\`

Replace with:
\`\`\`typescript
${r.newLine}
\`\`\`

Translation Key: \`${r.translationKey}\`
English: "${r.errorMessage}"
${r.needsImport ? '\n⚠️ **Note:** This file needs to import `useLanguage` hook:\n```typescript\nimport { useLanguage } from \'@/hooks/useLanguage\';\n// Then in component:\nconst { t } = useLanguage();\n```' : ''}
`;
}).join('\n---\n\n')}
`;
  })
  .join('\n\n---\n\n')}

## Step 2: Replace Hardcoded Strings in JSX

### Files with Hardcoded Strings (${hardcodedStrings.length} total)

${Object.entries(hardcodedByFile)
  .slice(0, 20) // Limit to first 20 files
  .map(([file, strings]) => {
    return `#### \`${file}\`

${strings.slice(0, 10).map((s, i) => {
  return `**${i + 1}. Line ${s.line}**

Original:
\`\`\`typescript
${s.original}
\`\`\`

Replace with:
\`\`\`typescript
${s.suggested}
\`\`\`

Translation Key: \`${s.translationKey}\`
Hardcoded: "${s.hardcodedString}"
${s.needsImport ? '\n⚠️ **Note:** This file needs to import `useLanguage` hook' : ''}
`;
}).join('\n---\n\n')}
${strings.length > 10 ? `\n... and ${strings.length - 10} more hardcoded strings in this file` : ''}
`;
  })
  .join('\n\n---\n\n')}

## Step 3: Add Missing Translation Keys

These keys are used in the codebase but not defined in \`TranslationKeys\` interface.

**Total Missing Keys**: ${missingKeys.length}

### Top Priority Missing Keys

**Note**: Keys that already exist in types.ts or are not translation keys (like font file paths) have been filtered out.

${missingKeys.slice(0, 50).map((key, i) => `${i + 1}. \`${key}\``).join('\n')}
${missingKeys.length > 50 ? `\n... and ${missingKeys.length - 50} more keys` : ''}

### How to Add Missing Keys

1. **Add to \`frontend/src/lib/translations/types.ts\`**:
   \`\`\`typescript
   export interface TranslationKeys {
     // ... existing keys ...
     yourCategory: {
       yourKey: string;
     };
   }
   \`\`\`

2. **Add translations to all language files**:
   - \`frontend/src/lib/translations/en.ts\`
   - \`frontend/src/lib/translations/ps.ts\`
   - \`frontend/src/lib/translations/fa.ts\`
   - \`frontend/src/lib/translations/ar.ts\`

## Step 4: Apply Changes

### Manual Application

1. Review each replacement in the files listed above
2. Apply changes one file at a time
3. Test after each file to ensure nothing breaks
4. Add missing imports where needed

### Automated Application (Coming Soon)

Run with \`--apply\` flag to automatically apply changes (with backups).

## Notes

- All replacements preserve the original code structure
- Translation keys are already translated in all 4 languages
- Some replacements may need manual review for context
- Test translations in all languages after applying changes
`;

  return plan;
}

/**
 * Apply replacements automatically (with backup)
 * Only applies safe replacements (where t function is available)
 */
function applyReplacements(replacements, dryRun = true) {
  const changes = [];
  const skipped = [];
  
  // Filter to only safe replacements
  const safeReplacements = replacements.filter(r => r.safeToApply !== false);
  const unsafeReplacements = replacements.filter(r => r.safeToApply === false);
  
  if (unsafeReplacements.length > 0) {
    console.log(`   ⚠️  Skipping ${unsafeReplacements.length} unsafe replacements (require manual review)`);
  }
  
  // Group by file
  const fileGroups = {};
  for (const replacement of safeReplacements) {
    if (!fileGroups[replacement.file]) {
      fileGroups[replacement.file] = [];
    }
    fileGroups[replacement.file].push(replacement);
  }
  
  for (const [filePath, fileReplacements] of Object.entries(fileGroups)) {
    const fullPath = path.join(FRONTEND_DIR, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.warn(`   ⚠️  File not found: ${fullPath}`);
      continue;
    }
    
    // Re-validate file structure before applying
    const content = fs.readFileSync(fullPath, 'utf-8');
    const structureIssues = validateFileStructure(content, fullPath);
    if (structureIssues.length > 0) {
      console.warn(`   ⚠️  Skipping ${filePath} - has structural issues: ${structureIssues.join(', ')}`);
      skipped.push({ file: filePath, issues: structureIssues });
      continue;
    }
    
    const lines = content.split('\n');
    let modified = false;
    
    // Sort by line number (descending) to avoid line number shifts
    fileReplacements.sort((a, b) => b.line - a.line);
    
    for (const replacement of fileReplacements) {
      const lineIndex = replacement.line - 1;
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const originalLine = lines[lineIndex];
        
        // Verify the line still matches (file might have changed)
        if (originalLine.includes(replacement.errorMessage) || originalLine.trim() === replacement.original.trim()) {
          // Double-check t is available at this point
          const tAvailability = isTFunctionAvailable(content, replacement.line);
          if (!tAvailability.available && replacement.needsImport) {
            // Skip - would break the code
            skipped.push({ file: filePath, line: replacement.line, reason: 't function not available' });
            continue;
          }
          
          lines[lineIndex] = replacement.newLine;
          modified = true;
          changes.push({
            file: filePath,
            line: replacement.line,
            action: 'replaced',
          });
        }
      }
    }
    
    if (modified && !dryRun) {
      // Create backup
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, content);
      
      // Write changes
      fs.writeFileSync(fullPath, lines.join('\n'));
      
      console.log(`   ✅ ${filePath} (backup: ${path.basename(backupPath)})`);
    } else if (modified) {
      console.log(`   📝 ${filePath} (would be modified)`);
    }
  }
  
  return { changes, skipped };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const applyFixes = args.includes('--apply');
  
  console.log('🤖 Translation Automation Script\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - Generating plan only\n');
  } else {
    console.log('⚠️  APPLY MODE - Changes will be applied with backups\n');
  }
  
  // Step 1: Load unused keys
  console.log('📖 Loading unused translation keys...');
  const unusedKeys = loadUnusedKeys();
  console.log(`   Found ${unusedKeys.length} unused keys\n`);
  
  // Step 2: Load English translations
  console.log('📚 Loading English translations...');
  const translations = loadEnglishTranslations();
  console.log(`   Loaded ${translations.size} translation key-value pairs\n`);
  
  // Step 3: Load missing keys
  console.log('🔎 Loading missing keys...');
  const missingKeys = loadMissingKeys();
  console.log(`   Found ${missingKeys.length} missing keys (filtered - removed keys that already exist in types.ts and non-translation keys)\n`);
  
  // Step 4: Find error messages and hardcoded strings to replace
  console.log('🔍 Finding hardcoded error messages and strings to replace...');
  const { replacements, hardcodedStrings, skippedFiles } = findErrorReplacements(unusedKeys, translations);
  const safeReplacements = replacements.filter(r => r.safeToApply !== false);
  console.log(`   Found ${replacements.length} error messages (${safeReplacements.length} safe to auto-apply)`);
  console.log(`   Found ${hardcodedStrings.length} hardcoded strings that can be replaced`);
  if (skippedFiles && skippedFiles.length > 0) {
    console.log(`   ⚠️  Skipped ${skippedFiles.length} files with structural issues\n`);
  } else {
    console.log();
  }
  
  // Step 5: Generate migration plan
  console.log('📋 Generating migration plan...');
  const plan = generateMigrationPlan(replacements, hardcodedStrings, missingKeys);
  fs.writeFileSync(OUTPUT_FILE, plan, 'utf-8');
  console.log(`   ✅ Plan generated: ${OUTPUT_FILE}\n`);
  
  // Step 6: Apply changes (if requested)
  if (applyFixes) {
    console.log('🔧 Applying replacements...');
    const { changes, skipped } = applyReplacements(replacements, false);
    console.log(`\n   ✅ Applied ${changes.length} safe error message replacements`);
    if (skipped && skipped.length > 0) {
      console.log(`   ⚠️  Skipped ${skipped.length} unsafe replacements (see report for details)`);
    }
    console.log(`   ⚠️  ${hardcodedStrings.length} hardcoded strings need manual review (see report)`);
    console.log('   📝 Backup files created with .backup timestamp\n');
  } else {
    console.log('💡 To apply error message fixes automatically, run:');
    console.log('   node automate-translation-fixes.js --apply\n');
    console.log('   ⚠️  Note: Hardcoded strings in JSX need manual review');
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Unused Keys Available: ${unusedKeys.length}`);
  console.log(`   Error Messages to Replace: ${replacements.length}`);
  console.log(`   Hardcoded Strings to Replace: ${hardcodedStrings.length}`);
  console.log(`   Missing Keys to Add: ${missingKeys.length}`);
  console.log(`   Files Affected: ${new Set([...replacements.map(r => r.file), ...hardcodedStrings.map(h => h.file)]).size}`);
  console.log(`\n   📄 Detailed plan: ${OUTPUT_FILE}`);
}

// Run the script
main();

