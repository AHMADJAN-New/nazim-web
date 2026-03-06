---
name: nazim-help-articles
description: Generates help center workflow articles for the Nazim School Management System. Use when user asks to generate help articles, write help center content for a folder, or translate articles to Pashto. Follows two-phase EN→PS process with MANIFEST and full article template.
---

# Nazim Help Center Article Generation

Produces comprehensive workflow articles that explain every feature of a page to school administrators. Triggered by: "Generate help articles for {folder}", "Write help center content for {folder}", "Translate help articles to Pashto".

## Two-Phase Process

**Phase 1 — English (source of truth):**
1. Read `backend/resources/help-center/MANIFEST.md` for target folder and articles
2. For each article: read frontend page from MANIFEST "Frontend Page Reference"
3. Read hooks (`use{Resource}*.tsx`), forms, dialogs, tables
4. Write EN article using FULL ARTICLE TEMPLATE
5. Save to `backend/resources/help-center/articles/{folder}/en/{slug}.md`

**Phase 2 — Pashto (translation):**
1. Translate EN article to Pashto using terminology dictionary
2. Preserve exact markdown structure
3. Save to `backend/resources/help-center/articles/{folder}/ps/{slug}.md`

**After both:** Update MANIFEST.md; run `php artisan db:seed --class=HelpCenterArticleSeeder`

## What to Extract (REQUIRED)

### From Page Component
- Stats cards (count, label, meaning)
- Filters (search, dropdowns, date pickers)
- Tabs and tab content
- Table columns (name, description, mobile visibility)
- Row actions (View, Edit, Delete, custom)
- Bulk actions
- Page-level buttons

### From Create/Edit Form
- Form tabs
- Every field: label, type, required/optional, validation
- Auto-calculated and conditional fields
- File uploads and limits
- Submit behavior

### From Hooks
- API endpoints, transformations, toast messages

## Article Structure (Do NOT Skip)

1. **Page Title** + overview paragraph
2. **Page Overview** — Summary cards, Filters & Search
3. **Data Table** — Columns table, Row actions, Bulk actions
4. **Creating a New {Resource}** — Form tabs with field table, post-submit behavior
5. **Editing** — Step-by-step
6. **Deleting** — Confirmation, warnings
7. **Additional Features** — Documents, History, Export, etc.
8. **Export Options**
9. **Tips & Best Practices**
10. **Related Pages**
11. Metadata footer: `*Category: {slug} | Language: en|ps*`

## Pashto Rules

- Use terminology dictionary (e.g., زده کوونکي, حاضري, مالي)
- Preserve structure exactly
- UI names in parentheses on first mention: **"ثبت نام (Register Student)"**
- Formal Pashto (وکړئ), second person plural (تاسو)

## Key Rule

**Read the actual code** — Do NOT guess. Extract every stats card, filter, column, field, and action from the frontend.

## Reference

Full template, Pashto dictionary, and quality checklist: `.cursor/rules/help-center-workflow-generation.mdc`
