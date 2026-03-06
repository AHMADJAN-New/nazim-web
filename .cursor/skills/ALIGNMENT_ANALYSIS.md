# Nazim Skills – Alignment with Current App

Summary of the analysis of all `.cursor/skills` against the current codebase. Skills are aligned unless noted.

---

## Aligned skills

| Skill | Verification |
|-------|---------------|
| **nazim-multi-tenancy** | Query keys, API calls, `getCurrentSchoolId()`, RLS patterns match AGENTS.md and backend. |
| **nazim-api-domain-types** | File layout (`types/api`, `types/domain`, `mappers`), naming (snake_case / camelCase), hooks mapping API→Domain match codebase. |
| **nazim-migrations** | UUID PKs, `organization_id`/`school_id`, Laravel migration style, `search_path` for functions align with AGENTS.md. |
| **nazim-class-subjects** | Two-step workflow, `useClassSubjects(classAcademicYearId, organizationId)` from `useSubjects`, usage in ExamEnrollment, QuestionBank, ExamsManagement confirmed. |
| **nazim-help-articles** | MANIFEST path `backend/resources/help-center/MANIFEST.md`, two-phase EN→PS, article paths and seeder match rule and codebase. |
| **nazim-filters** | `FilterPanel` at `@/components/layout/FilterPanel`, props `title`, `defaultOpenDesktop`, `defaultOpenMobile`, `footer` match component. |
| **nazim-responsive** | Page container, FilterPanel, tabs, grids, tables, charts, cards, buttons patterns match AGENTS.md responsive section. |
| **nazim-status-badges** | Badge variants and semantic color usage match `badge.tsx` and usage in SessionReportTable etc. |
| **nazim-help-center-management** | `platformApi.helpCenter.categories.*` / `articles.*`, hooks in `usePlatformAdminComplete`, HelpCenterManagement page and types confirmed. |
| **nazim-finance** | useFinance hooks, domain/api types, financeMapper, fee hooks, multi-tenancy and query keys match structure. |
| **nazim-exams** | useExams hooks, class_subjects usage, permissions (`exams.read` etc.), exam flow and pages match. |
| **nazim-file-storage** | FileStorageService path, store* methods (e.g. storeStudentPicture, storeDmsFile, storeReport), controller pattern match backend. |
| **nazim-reports** | ReportService, ReportConfig, DateConversionService, useServerReport, ReportProgressDialog, API and template selection match. |
| **nazim-forms** | Schemas in `frontend/src/lib/validations/`, `common.ts` (requiredStringLength, optionalUuidSchema, etc.), zodResolver, Controller for Select/file match. |
| **nazim-toast** | `showToast` from `@/lib/toast`, translation keys (toast accepts key or translated string), RTL positioning match `toast.ts`. |
| **nazim-i18n** | useLanguage (`t`, `isRTL`, `language`), translation files under `translations/`, adding keys in all four languages, RTL and titleKey match. |

---

## Updates made

1. **nazim-permissions**  
   - Query key already included `profile?.default_school_id ?? null` (matches `usePermissions.tsx`).  
   - Documented that both hooks live in `@/hooks/usePermissions`.

2. **nazim-platform-admin**  
   - Step 3 already stated that platform routes are in **root** `App.tsx` under `<Route path="/platform">` with LazyComponents + Suspense, and that `platform/App.tsx` is an alternative router. No change needed.

---

## Implementation details (for reference)

- **useUserPermissions**  
  - Query key: `['user-permissions', profile?.organization_id, profile?.default_school_id ?? null, profile?.id, orgIds.join(',')]`  
  - Uses `useAccessibleOrganizations()` for `orgIds`; enabled when `!!profile?.organization_id && !orgsLoading`.

- **Platform routes**  
  - Main app: `frontend/src/App.tsx` defines `/platform` routes with LazyComponents + Suspense.  
  - Alternative: `frontend/src/platform/App.tsx` (PlatformAdminApp) uses direct imports.  
  - New platform pages: add to LazyComponents and add Route in root `App.tsx` (same as existing platform pages).

- **Toast**  
  - Some call sites pass raw keys (e.g. `'toast.roleCreated'`); `toast.ts` treats key-looking strings and translates. Skills recommend `t('toast.*')` for consistency.

- **Validations**  
  - `common.ts` exports `requiredStringLength`, `optionalStringLength`, `uuidSchema`, `optionalUuidSchema`, `emailSchema`, `phoneSchema`; `validationHelpers.ts` provides `validationMessages`. Forms skill correctly points to `common.ts`.

---

## Conclusion

All Nazim skills are aligned with the current app. The only edits were to **nazim-permissions** (hook location and query key documentation). Use this file as a quick reference when adding or changing features so skills stay in sync with the codebase.
