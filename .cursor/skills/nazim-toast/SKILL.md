---
name: nazim-toast
description: Toast notifications for Nazim. Use when showing success/error/info messages. ALWAYS use showToast from @/lib/toast with translation keys; never toast from sonner directly. RTL positioning is automatic.
---

# Nazim Toast

Use the **showToast** utility from `@/lib/toast`. Never call `toast` from `sonner` directly. Toasts are translated and RTL-aware.

## Usage

```typescript
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';

const { t } = useLanguage();

// Success / error (use translation keys)
showToast.success(t('toast.yourResourceCreated'));
showToast.error(error.message || t('toast.yourResourceCreateFailed'));

// Info / warning
showToast.info(t('toast.resourceUpdated'));
showToast.warning(t('toast.resourceInUse'));

// Loading (returns id for dismiss)
const id = showToast.loading(t('toast.processing'));
// ... work ...
showToast.dismiss(id);
```

## Translation Keys

- Use **translation keys**, never hardcoded strings
- Prefer `toast.*` for generic messages; use resource-specific keys (e.g. `academic.subjects.subjectCreated`) when they exist
- Add new keys to `TranslationKeys` in `types.ts` and to all four language files: `en.ts`, `ps.ts`, `fa.ts`, `ar.ts`
- Parameters: `showToast.success('toast.subjectsAssigned', { count: 5, skipped: 2 })`

## Mutation Hooks

All mutation hooks should use showToast in onSuccess/onError:

```typescript
onSuccess: () => {
  showToast.success(t('toast.yourResourceCreated'));
  void queryClient.invalidateQueries({ queryKey: ['your-resources'] });
},
onError: (error: Error) => {
  showToast.error(error.message || t('toast.yourResourceCreateFailed'));
},
```

## Rules

- Use **showToast** only (not `toast` from sonner)
- Use **translation keys**; pass `t('key')` or resource-specific key
- **Error fallback:** `error.message || t('toast.key')`
- Do **not** set position manually (RTL/LTR handled by Toaster)
- Ensure keys exist in **all four** language files

## Checklist

- [ ] showToast from @/lib/toast
- [ ] Translation keys (toast.* or resource-specific)
- [ ] t() from useLanguage for dynamic messages
- [ ] Error fallback: error.message || t('...')
- [ ] Keys added in en, ps, fa, ar
