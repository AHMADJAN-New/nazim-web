---
name: nazim-i18n
description: Internationalization and RTL for Nazim. Use when adding UI text or layout that depends on language. Covers useLanguage (t, isRTL, language), translation file structure, adding keys, RTL layout and conditional classes.
---

# Nazim i18n

Supported languages: **English (en), Pashto (ps), Farsi/Dari (fa), Arabic (ar)**. RTL: Arabic, Pashto, Farsi. Use **useLanguage** for all translated text and direction.

## Translation Files

- **Types:** `frontend/src/lib/translations/types.ts` — `TranslationKeys` interface
- **Languages:** `en.ts`, `ps.ts`, `fa.ts`, `ar.ts` in same directory
- **Utilities:** `frontend/src/lib/i18n.ts` (t, isRTL, getDirection, etc.)
- **Hook:** `useLanguage()` from `@/hooks/useLanguage` → `{ t, isRTL, language }`

## Using Translations

```typescript
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { t, isRTL, language } = useLanguage();

  return (
    <>
      <h1>{t('students.title')}</h1>
      <p>{t('students.searchPlaceholder')}</p>
      <div className={isRTL ? 'mr-4 border-r' : 'ml-4 border-l'}>
        {/* RTL-aware layout */}
      </div>
    </>
  );
}
```

## Adding New Keys

1. Add the key to **TranslationKeys** in `types.ts` (correct category)
2. Add the same key and translation in **en.ts**, **ps.ts**, **fa.ts**, **ar.ts**
3. Use in components: `t('category.key')`

Key structure: `category.key` (e.g. `students.title`, `nav.dashboard`, `common.save`, `forms.required`).

## RTL

- **Direction:** `document.documentElement.dir` is set by the app (rtl/ltr)
- **Sidebar:** `side={isRTL ? "right" : "left"}`
- **Conditional classes:** Use `isRTL` for margins, borders, alignment (e.g. `isRTL ? 'mr-4 border-r' : 'ml-4 border-l'`)
- **CSS:** RTL rules in `index.css` under `[dir="rtl"]`; `.text-left` / `.ml-auto` etc. reverse automatically

## Navigation and titleKey

Navigation items use `titleKey` for translation:

```typescript
{ title: "All Students", titleKey: "allStudents", url: "/students", icon: Users }
```

## Dari (fa locale)

Dari uses the **fa** locale. For Dari-specific workflow and terminology use the rule: `.cursor/rules/dari-translations-workflow.mdc` and `DARI_MANIFEST.md`.

## Checklist

- [ ] All user-facing strings use t('category.key')
- [ ] New keys added to types.ts and all four language files
- [ ] RTL layout uses isRTL for conditional classes where needed
- [ ] Navigation items use titleKey
