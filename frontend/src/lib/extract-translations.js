const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'i18n.ts'), 'utf8');

// Extract TranslationKeys interface
const typesMatch = content.match(/export interface TranslationKeys \{[\s\S]*?\n\}/);
if (typesMatch) {
  fs.writeFileSync(
    path.join(__dirname, 'translations', 'types.ts'),
    'export interface TranslationKeys ' + typesMatch[0].replace('export interface TranslationKeys ', '')
  );
}

// Extract English translations
const enMatch = content.match(/const en: TranslationKeys = \{[\s\S]*?\n\};/);
if (enMatch) {
  fs.writeFileSync(
    path.join(__dirname, 'translations', 'en.ts'),
    `import type { TranslationKeys } from './types';\n\nexport const en: TranslationKeys = ${enMatch[0].replace(/const en: TranslationKeys = /, '')}`
  );
}

// Extract Pashto translations
const psMatch = content.match(/const ps: TranslationKeys = \{[\s\S]*?\n\};/);
if (psMatch) {
  fs.writeFileSync(
    path.join(__dirname, 'translations', 'ps.ts'),
    `import type { TranslationKeys } from './types';\n\nexport const ps: TranslationKeys = ${psMatch[0].replace(/const ps: TranslationKeys = /, '')}`
  );
}

// Extract Farsi translations
const faMatch = content.match(/const fa: TranslationKeys = \{[\s\S]*?\n\};/);
if (faMatch) {
  fs.writeFileSync(
    path.join(__dirname, 'translations', 'fa.ts'),
    `import type { TranslationKeys } from './types';\n\nexport const fa: TranslationKeys = ${faMatch[0].replace(/const fa: TranslationKeys = /, '')}`
  );
}

// Extract Arabic translations
const arMatch = content.match(/const ar: TranslationKeys = \{[\s\S]*?\n\};/);
if (arMatch) {
  fs.writeFileSync(
    path.join(__dirname, 'translations', 'ar.ts'),
    `import type { TranslationKeys } from './types';\n\nexport const ar: TranslationKeys = ${arMatch[0].replace(/const ar: TranslationKeys = /, '')}`
  );
}

console.log('Translation files extracted successfully!');

