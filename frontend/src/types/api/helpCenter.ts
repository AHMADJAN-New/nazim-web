// Help Center API Types - Match Laravel API response (snake_case, DB columns)

// Help Center Category types
export interface HelpCenterCategory {
  id: string;
  organization_id: string | null; // Can be null for global categories
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  order: number;
  is_active: boolean;
  parent_id: string | null;
  article_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (when loaded)
  parent?: HelpCenterCategory | null;
  children?: HelpCenterCategory[];
  articles?: HelpCenterArticle[];
  published_articles?: HelpCenterArticle[];
}

export type HelpCenterCategoryInsert = Omit<HelpCenterCategory, 'id' | 'article_count' | 'created_at' | 'updated_at' | 'deleted_at' | 'parent' | 'children' | 'articles' | 'published_articles'>;
export type HelpCenterCategoryUpdate = Partial<HelpCenterCategoryInsert>;

// Help Center Article types
export interface HelpCenterArticle {
  id: string;
  organization_id: string | null; // Can be null for global articles
  category_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  content_type: 'markdown' | 'html';
  language: 'en' | 'ps' | 'fa' | 'ar'; // Article language
  featured_image_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  is_pinned: boolean;
  status?: 'draft' | 'published' | 'archived'; // Optional for backward compatibility
  visibility?: 'public' | 'org_users' | 'staff_only'; // Optional for backward compatibility
  meta_title: string | null;
  meta_description: string | null;
  tags: string[] | null; // Can be null
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  order: number;
  author_id: string | null;
  related_article_ids: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations (when loaded)
  category?: HelpCenterCategory;
  author?: {
    id: string;
    full_name: string;
    email: string | null;
  } | null;
  related_articles?: HelpCenterArticle[];
}

export type HelpCenterArticleInsert = Omit<HelpCenterArticle, 'id' | 'view_count' | 'helpful_count' | 'not_helpful_count' | 'published_at' | 'created_at' | 'updated_at' | 'deleted_at' | 'category' | 'author' | 'related_articles'> & Partial<Pick<HelpCenterArticle, 'is_published' | 'author_id' | 'related_article_ids'>>;
export type HelpCenterArticleUpdate = Partial<HelpCenterArticleInsert>;

