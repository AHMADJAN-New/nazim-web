---
name: nazim-help-center-management
description: Platform admin help center CRUD for categories and articles. Use when working on Help Center Management page, categories, articles, slugs, or ordering. Uses platformApi and usePlatformAdminPermissions; no organization_id.
---

# Nazim Help Center Management

Platform admins manage help center categories and articles via the Platform Admin app. This skill covers the CRUD UI and API patterns. For **generating** article content (EN→PS workflow), use [nazim-help-articles](.cursor/skills/nazim-help-articles/SKILL.md).

## Scope

- **Platform admin only:** Route `/platform/help-center`; uses `platformApi`, `usePlatformAdminPermissions`
- **No organization_id:** Help center data is platform-wide (categories can have organization_id = null for global)
- **Relationship:** This skill = managing categories/articles in DB/UI. nazim-help-articles = writing markdown content for articles

## Hooks

From `frontend/src/platform/hooks/usePlatformAdminComplete.tsx`:

- **Categories:** `usePlatformCreateHelpCenterCategory`, `usePlatformUpdateHelpCenterCategory`, `usePlatformDeleteHelpCenterCategory`
- **Articles:** `usePlatformCreateHelpCenterArticle`, `usePlatformUpdateHelpCenterArticle`, `usePlatformDeleteHelpCenterArticle`

Categories and articles are fetched via `platformApi.helpCenter.categories.list()` and `platformApi.helpCenter.articles.list()` (query keys: `platform-help-center-categories`, `platform-help-center-articles`).

## API (platformApi.helpCenter)

- **Categories:** `categories.list(params?)`, `categories.get(id)`, `categories.create(data)`, `categories.update(id, data)`, `categories.delete(id)`
- **Articles:** `articles.list(params?)`, `articles.get(id)`, `articles.create(data)`, `articles.update(id, data)`, `articles.delete(id)`, `articles.publish(id)`, `articles.unpublish(id)`

All endpoints use `/platform/help-center/*` prefix.

## Category Fields (key)

- `name`, `slug`, `description`, `icon`, `color`, `order`, `is_active`, `parent_id`
- Slug must be unique; used in URLs

## Article Fields (key)

- `category_id`, `title`, `slug`, `excerpt`, `content`, `content_type` ('markdown' | 'html'), `language` ('en' | 'ps' | 'fa' | 'ar')
- `is_published`, `is_featured`, `is_pinned`, `order`
- `meta_title`, `meta_description`, `tags`, `related_article_ids`, `author_id`

Types: [frontend/src/types/api/helpCenter.ts](frontend/src/types/api/helpCenter.ts)

## Page

- [HelpCenterManagement.tsx](frontend/src/platform/pages/admin/HelpCenterManagement.tsx) — Tabs for Categories and Articles; tables with create/edit/delete; forms for category (name, slug, description, icon, color, order, is_active) and article (category, slug, title, content, language, order, is_published, etc.).

## Seeding

After adding or updating articles (e.g. from markdown or API), sync to DB with:

```bash
cd backend && php artisan db:seed --class=HelpCenterArticleSeeder
```

## Checklist

- [ ] Use `platformApi.helpCenter.*` (not main app apiClient)
- [ ] Use `usePlatformAdminPermissions()`; redirect if no `subscription.admin`
- [ ] Invalidate/refetch `platform-help-center-categories` and `platform-help-center-articles` after mutations
- [ ] Slug conventions: lowercase, hyphenated, unique per category for articles

## Additional Resources

- Category/article API shape and slug conventions: [reference.md](reference.md)
