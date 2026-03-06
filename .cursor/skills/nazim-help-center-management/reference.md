# Help Center Management Reference

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /platform/help-center/categories | List categories (params: is_active, parent_id) |
| GET | /platform/help-center/categories/:id | Get category |
| POST | /platform/help-center/categories | Create category |
| PUT | /platform/help-center/categories/:id | Update category |
| DELETE | /platform/help-center/categories/:id | Delete category |
| GET | /platform/help-center/articles | List articles (params: category_id, language, is_published) |
| GET | /platform/help-center/articles/:id | Get article |
| POST | /platform/help-center/articles | Create article |
| PUT | /platform/help-center/articles/:id | Update article |
| DELETE | /platform/help-center/articles/:id | Delete article |
| POST | /platform/help-center/articles/:id/publish | Publish article |
| POST | /platform/help-center/articles/:id/unpublish | Unpublish article |

## Slug Conventions

- **Categories:** Unique slug (e.g. `students`, `finance`, `exams`). Used in URLs and MANIFEST folder names.
- **Articles:** Unique slug within category (e.g. `students.md` → slug `students`). Match markdown filename without extension when syncing from markdown.

## Query Keys

- `platform-help-center-categories` — categories list
- `platform-help-center-articles` — articles list (filter by category_id, language as needed)

## Relationship to Markdown Articles

- Markdown files live in `backend/resources/help-center/articles/{folder}/en|ps/{slug}.md`.
- [nazim-help-articles](.cursor/skills/nazim-help-articles/SKILL.md) generates/translates those files.
- HelpCenterArticleSeeder can sync markdown content into the database for the in-app help center.
