const fs = require('fs');
const path = require('path');

const frontendSrc = path.join(__dirname, 'frontend', 'src');
const results = {
  usesTranslations: [],
  noTranslations: [],
  hardcodedStrings: []
};

// Patterns to identify hardcoded user-facing strings
const hardcodedPatterns = [
  /(title|placeholder|label|aria-label|alt)="[^"]{5,}"/gi,
  /(title|placeholder|label|aria-label|alt)='[^']{5,}'/gi,
  />[A-Z][a-zA-Z\s]{10,}</g,
  /toast\.(success|error|info|warning)\(["'][^"']{10,}["']\)/gi,
  /["'][A-Z][a-zA-Z\s]{15,}["']/g,
];

// Check if file uses translations
function usesTranslations(content) {
  return /useLanguage|from ['"]@\/hooks\/useLanguage|from ['"].*useLanguage/.test(content);
}

// Check for hardcoded strings
function hasHardcodedStrings(content) {
  // Skip translation files and test files
  if (content.includes('TranslationKeys') || content.includes('__tests__')) {
    return false;
  }
  
  // Skip if uses translations (might have some hardcoded but should be minimal)
  if (usesTranslations(content)) {
    // Still check for obvious hardcoded strings even in files with translations
    const matches = [];
    hardcodedPatterns.forEach(pattern => {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found.slice(0, 5)); // Limit to 5 examples per pattern
      }
    });
    return matches.length > 0 ? matches : false;
  }
  
  // Check for hardcoded strings in files without translations
  const matches = [];
  hardcodedPatterns.forEach(pattern => {
    const found = content.match(pattern);
    if (found) {
      matches.push(...found.slice(0, 10)); // More examples for files without translations
    }
  });
  return matches.length > 0 ? matches : false;
}

// Recursively find all TSX and TS files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, and other build directories
      if (!['node_modules', 'dist', '.git', '__tests__'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      // Skip test files and type definition files
      if (!file.includes('.test.') && !file.includes('.d.ts') && !file.includes('types.ts')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Analyze all files
const allFiles = findFiles(frontendSrc);

console.log(`Analyzing ${allFiles.length} files...\n`);

allFiles.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(frontendSrc, filePath).replace(/\\/g, '/');
    
    if (usesTranslations(content)) {
      results.usesTranslations.push(relativePath);
      
      // Check for hardcoded strings even in files with translations
      const hardcoded = hasHardcodedStrings(content);
      if (hardcoded) {
        results.hardcodedStrings.push({
          file: relativePath,
          examples: hardcoded.slice(0, 5)
        });
      }
    } else {
      results.noTranslations.push(relativePath);
      
      // Check for hardcoded strings
      const hardcoded = hasHardcodedStrings(content);
      if (hardcoded) {
        results.hardcodedStrings.push({
          file: relativePath,
          examples: hardcoded.slice(0, 10)
        });
      }
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
});

// Generate report
const report = `
# Translation Usage Analysis Report

## Summary
- Total files analyzed: ${allFiles.length}
- Files using translations: ${results.usesTranslations.length}
- Files NOT using translations: ${results.noTranslations.length}
- Files with hardcoded strings: ${results.hardcodedStrings.length}

## Files NOT Using Translations (${results.noTranslations.length} files)

${results.noTranslations.map(f => `- ${f}`).join('\n')}

## Files with Hardcoded Strings (${results.hardcodedStrings.length} files)

${results.hardcodedStrings.map(item => {
  return `### ${item.file}\n\`\`\`\n${item.examples.slice(0, 3).join('\n')}\n\`\`\`\n`;
}).join('\n')}

## Files Using Translations (${results.usesTranslations.length} files)

${results.usesTranslations.slice(0, 20).map(f => `- ${f}`).join('\n')}
${results.usesTranslations.length > 20 ? `\n... and ${results.usesTranslations.length - 20} more files` : ''}
`;

console.log(report);

// Save report to file
fs.writeFileSync('translation-analysis-report.md', report);
console.log('\nReport saved to translation-analysis-report.md');

