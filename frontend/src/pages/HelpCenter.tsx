import {
  Search,
  HelpCircle,
  Star,
  TrendingUp,
  Eye,
  ThumbsUp,
  ArrowRight,
  Grid3x3,
  List,
  Filter,
  X,
  Clock,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  UserCheck,
  Briefcase,
  DollarSign,
  Library,
  GraduationCap,
  Settings,
  FileText,
  Calendar,
  Building,
  CreditCard,
  Award,
  Phone,
  Home,
  Folder,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  useHelpCenterCategories,
  useHelpCenterArticles,
  useFeaturedArticles,
  usePopularArticles,
} from '@/hooks/useHelpCenter';
import { useLanguage } from '@/hooks/useLanguage';
import { useTour } from '@/onboarding';
import { cn } from '@/lib/utils';

// If your project uses shadcn/ui "sheet" + "select", keep these imports.
// If you don't have them yet, either add them (recommended) or replace with your own components.
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewMode = 'grid' | 'list';
type SortMode = 'recent' | 'popular' | 'az';

const RECENTLY_VIEWED_KEY = 'nazim_help_recently_viewed_v1';

function readRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String);
  } catch {
    return [];
  }
}

function writeRecentlyViewed(ids: string[]) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function pushRecentlyViewed(id: string) {
  const list = readRecentlyViewed();
  const next = [id, ...list.filter((x) => x !== id)].slice(0, 6);
  writeRecentlyViewed(next);
}

function estimateReadingTime(text?: string) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  const minutes = Math.max(1, Math.round(words / 200));
  return minutes;
}

function formatCompactNumber(n: number | string | undefined) {
  const v = typeof n === 'string' ? Number(n) : n ?? 0;
  if (!Number.isFinite(v)) return '0';
  return Intl.NumberFormat(undefined, { notation: 'compact' }).format(v);
}

type HelpCategory = {
  id: string;
  name: string;
  icon?: string | null;
  parent_id?: string | null;
  childrenRecursive?: HelpCategory[];
  article_count?: number;
  article_count_aggregate?: number;
};

function hasChildren(cat: HelpCategory) {
  return Array.isArray(cat.childrenRecursive) && cat.childrenRecursive.length > 0;
}

function countFor(cat: HelpCategory) {
  return (cat.article_count_aggregate ?? cat.article_count ?? 0) as number;
}

function containsSelected(cat: HelpCategory, selectedId: string | null): boolean {
  if (!selectedId) return false;
  if (cat.id === selectedId) return true;
  const kids = cat.childrenRecursive ?? [];
  return kids.some((k) => containsSelected(k, selectedId));
}

/**
 * Get icon component from icon string name
 */
function getCategoryIcon(iconName?: string | null): LucideIcon {
  if (!iconName) return Folder;
  
  // Map common icon names to Lucide icons
  const iconMap: Record<string, LucideIcon> = {
    'book-open': BookOpen,
    'users': Users,
    'user-check': UserCheck,
    'briefcase': Briefcase,
    'dollar-sign': DollarSign,
    'library': Library,
    'graduation-cap': GraduationCap,
    'settings': Settings,
    'file-text': FileText,
    'calendar': Calendar,
    'building': Building,
    'credit-card': CreditCard,
    'award': Award,
    'phone': Phone,
    'home': Home,
    'folder': Folder,
    'help-circle': HelpCircle,
  };
  
  // Try direct match first
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }
  
  // Try to find in LucideIcons dynamically (convert kebab-case to PascalCase)
  const pascalName = iconName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  
  if (pascalName in LucideIcons && typeof (LucideIcons as any)[pascalName] === 'function') {
    return (LucideIcons as any)[pascalName] as LucideIcon;
  }
  
  return Folder; // Default fallback
}

function findCategory(categories: HelpCategory[], id: string): HelpCategory | null {
  for (const cat of categories) {
    if (cat.id === id) return cat;
    const kids = cat.childrenRecursive ?? [];
    const found = findCategory(kids, id);
    if (found) return found;
  }
  return null;
}

function findAncestorIds(categories: HelpCategory[], selectedId: string): string[] {
  const walk = (cats: HelpCategory[], target: string, ancestors: string[]): string[] | null => {
    for (const c of cats) {
      if (c.id === target) return ancestors;
      const kids = c.childrenRecursive ?? [];
      const res = walk(kids, target, [...ancestors, c.id]);
      if (res) return res;
    }
    return null;
  };
  return walk(categories, selectedId, []) ?? [];
}

function CategoryTree({
  categories,
  selectedId,
  expanded,
  toggleExpanded,
  onSelect,
  level = 0,
}: {
  categories: HelpCategory[];
  selectedId: string | null;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  onSelect: (id: string | null) => void;
  level?: number;
}) {
  return (
    <div className={cn('space-y-0.5', level > 0 && 'pl-2')}>
      {categories.map((cat) => {
        const kids = cat.childrenRecursive ?? [];
        const expandable = kids.length > 0;
        const isExpanded = expanded.has(cat.id);
        const isSelected = selectedId === cat.id;
        const inPath = containsSelected(cat, selectedId);
        const IconComponent = getCategoryIcon(cat.icon);
        const count = countFor(cat);

        return (
          <div key={cat.id} className="group">
            <div className="flex items-center gap-1.5">
              {expandable ? (
                <button
                  type="button"
                  className={cn(
                    'p-1 rounded hover:bg-muted transition-colors flex-shrink-0',
                    'opacity-60 group-hover:opacity-100',
                    level > 0 && 'ml-1'
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpanded(cat.id);
                  }}
                  aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
                >
                  {isExpanded ? (
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', level > 0 && 'h-3 w-3')} />
                  ) : (
                    <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', level > 0 && 'h-3 w-3')} />
                  )}
                </button>
              ) : (
                <div className={cn('w-6 flex-shrink-0', level > 0 && 'w-5')} />
              )}

              <Button
                variant={isSelected || inPath ? 'default' : level === 0 ? 'outline' : 'ghost'}
                size="sm"
                className={cn(
                  'flex-1 justify-start gap-2 h-9 transition-all',
                  level === 0 ? 'font-medium' : 'text-sm font-normal',
                  level > 0 && 'pl-2',
                  (isSelected || inPath) && 'shadow-sm',
                  !(isSelected || inPath) && 'hover:bg-muted/80'
                )}
                style={{ marginLeft: level > 0 ? level * 8 : 0 }}
                onClick={() => onSelect(cat.id)}
              >
                <IconComponent className={cn(
                  'h-4 w-4 flex-shrink-0',
                  level > 0 && 'h-3.5 w-3.5',
                  (isSelected || inPath) ? 'opacity-100' : 'opacity-70'
                )} />
                <span className="truncate flex-1 text-left">{cat.name}</span>
                {count > 0 && (
                  <Badge
                    variant={isSelected || inPath ? 'secondary' : 'outline'}
                    className={cn(
                      'ml-auto text-xs px-1.5 py-0 h-5 flex-shrink-0',
                      (isSelected || inPath) ? 'bg-background/50' : ''
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            </div>

            {expandable && isExpanded && (
              <div className={cn('mt-0.5 ml-2 border-l border-border/50 pl-2', level > 0 && 'ml-1')}>
                <CategoryTree
                  categories={kids}
                  selectedId={selectedId}
                  expanded={expanded}
                  toggleExpanded={toggleExpanded}
                  onSelect={onSelect}
                  level={level + 1}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function HelpCenter() {
  const { t, tUnsafe } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const inputRef = useRef<HTMLInputElement | null>(null);

  // URL -> initial state
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || null;
  const initialView = (searchParams.get('view') as ViewMode) || 'grid';
  const initialSort = (searchParams.get('sort') as SortMode) || 'recent';
  const initialPage = Number(searchParams.get('page') || 1) || 1;

  // State
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch); // debounced value used for fetching
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategory);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [sortMode, setSortMode] = useState<SortMode>(initialSort);
  const [page, setPage] = useState<number>(Math.max(1, initialPage));
  const perPage = 30; // Increased from 18 to show more articles per page

  // Suggestion dropdown state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(0);

  // Debounce search input -> searchQuery
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Update URL when filters change (but not on every keystroke — only debounced query)
  useEffect(() => {
    const newParams = new URLSearchParams();

    if (searchQuery) newParams.set('search', searchQuery);
    if (selectedCategoryId) newParams.set('category', selectedCategoryId);
    if (viewMode) newParams.set('view', viewMode);
    if (sortMode) newParams.set('sort', sortMode);
    if (page > 1) newParams.set('page', String(page));

    // Prevent unnecessary history spam
    setSearchParams(newParams, { replace: true });
  }, [searchQuery, selectedCategoryId, viewMode, sortMode, page, setSearchParams]);

  // Keyboard shortcut: "/" focuses search (unless typing in another input/textarea)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing =
        tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable;

      if (!typing && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setSuggestOpen(true);
      }

      // ESC clears suggestions / search if focused
      if (e.key === 'Escape') {
        setSuggestOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Fetch data - get root categories with children
  const { data: categories = [], isLoading: categoriesLoading } = useHelpCenterCategories({
    is_active: true,
    parent_id: null, // Root categories only (children are loaded via relation)
  });

  // State for expanded category groups
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Map sortMode to API order_by values
  // Hook expects: 'order' | 'views' | 'recent'
  // We map: 'popular' -> 'views', 'az' -> 'order', 'recent' -> 'recent'
  const order_by: 'order' | 'views' | 'recent' = sortMode === 'popular' ? 'views' : sortMode === 'az' ? 'order' : 'recent';
  const order_dir: 'asc' | 'desc' = sortMode === 'az' ? 'asc' : 'desc';

  const {
    data: articlesResponse,
    isLoading: articlesLoading,
    // If your hook exposes isFetching/isRefetching (react-query), it will be used.
    // If not, it will just be undefined and UX still works.
    isFetching,
  }: any = useHelpCenterArticles({
    is_published: true,
    category_id: selectedCategoryId || undefined,
    search: searchQuery || undefined,
    order_by,
    order_dir,
    page,
    per_page: perPage,
  });

  // Handle paginated response (data.data) or direct array response
  const articles = useMemo(() => {
    if (!articlesResponse) return [];
    // If response has data property (paginated), use it
    if (Array.isArray(articlesResponse)) {
      return articlesResponse;
    }
    // If response is an object with data property
    if (articlesResponse && typeof articlesResponse === 'object' && 'data' in articlesResponse) {
      return Array.isArray(articlesResponse.data) ? articlesResponse.data : [];
    }
    return [];
  }, [articlesResponse]);

  // Extract pagination metadata if available
  const paginationMeta = useMemo(() => {
    if (!articlesResponse) return null;
    
    // Laravel paginated response structure: { data: [], current_page, last_page, total, per_page, ... }
    if (Array.isArray(articlesResponse)) {
      // If it's an array, no pagination metadata
      return null;
    }
    
    if (typeof articlesResponse === 'object') {
      // Check if it has Laravel pagination structure (direct properties)
      if ('current_page' in articlesResponse && 'last_page' in articlesResponse) {
        return {
          current_page: articlesResponse.current_page,
          last_page: articlesResponse.last_page,
          total: articlesResponse.total,
          per_page: articlesResponse.per_page,
        };
      }
      
      // Check if it has meta property
      if ('meta' in articlesResponse && articlesResponse.meta) {
        return articlesResponse.meta;
      }
    }
    
    return null;
  }, [articlesResponse]);

  const totalPages = paginationMeta?.last_page || (articles.length > perPage ? Math.ceil(articles.length / perPage) : 1);
  const currentPage = paginationMeta?.current_page || page;
  const totalArticles = paginationMeta?.total || articles.length;

  // Sync page state with pagination metadata if available
  useEffect(() => {
    if (paginationMeta?.current_page && paginationMeta.current_page !== page) {
      setPage(paginationMeta.current_page);
    }
  }, [paginationMeta?.current_page, page]);

  const { data: featuredArticles = [], isLoading: featuredLoading } = useFeaturedArticles(3);
  const { data: popularArticles = [], isLoading: popularLoading } = usePopularArticles(5);

  const helpCategories = categories as unknown as HelpCategory[];

  // Auto-expand roots so users immediately see grouping (keep user toggles once set)
  useEffect(() => {
    if (!helpCategories || helpCategories.length === 0) return;
    setExpandedCategories((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set<string>();
      for (const c of helpCategories) {
        if (hasChildren(c)) next.add(c.id);
      }
      return next;
    });
  }, [helpCategories]);

  // Auto-expand selected chain so the selected child is visible
  useEffect(() => {
    if (!selectedCategoryId) return;
    const ancestors = findAncestorIds(helpCategories, selectedCategoryId);
    if (ancestors.length === 0) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      for (const id of ancestors) next.add(id);
      return next;
    });
  }, [helpCategories, selectedCategoryId]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return findCategory(helpCategories, selectedCategoryId);
  }, [helpCategories, selectedCategoryId]);

  // Ensure filteredArticles is always an array
  // If your backend already searches, DO NOT filter again client-side.
  // But we still do a "safe local filter" only for tags/excerpt edge cases if backend search is weak.
  // IMPORTANT: If your backend search is good, remove this filter block entirely.
  const filteredArticles = useMemo(() => {
    // Ensure articles is always an array
    const articlesArray = Array.isArray(articles) ? articles : [];
    
    if (!searchQuery) return articlesArray;

    const query = searchQuery.toLowerCase();
    return articlesArray.filter((article: any) => {
      if (!article || typeof article !== 'object') return false;
      const title = String(article.title || '').toLowerCase();
      const excerpt = String(article.excerpt || '').toLowerCase();
      const tags: string[] = Array.isArray(article.tags) ? article.tags : [];
      return (
        title.includes(query) ||
        excerpt.includes(query) ||
        tags.some((tag) => String(tag).toLowerCase().includes(query))
      );
    });
  }, [articles, searchQuery]);

  // Show pagination if we have more articles than perPage OR if backend says we have multiple pages
  const shouldShowPagination = useMemo(() => {
    return !articlesLoading && filteredArticles.length > 0 && (
      totalPages > 1 || 
      (totalArticles > perPage) || 
      (articles.length > perPage && !paginationMeta)
    );
  }, [articlesLoading, filteredArticles.length, totalPages, totalArticles, perPage, articles.length, paginationMeta]);

  // Suggestions: top matches while typing
  const suggestions = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    const pool = (articles || []).slice(0, 100); // avoid heavy work
    const scored = pool
      .map((a: any) => {
        const title = String(a.title || '');
        const excerpt = String(a.excerpt || '');
        const hay = (title + ' ' + excerpt).toLowerCase();
        const score =
          (title.toLowerCase().startsWith(q) ? 50 : 0) +
          (title.toLowerCase().includes(q) ? 25 : 0) +
          (hay.includes(q) ? 10 : 0) +
          (Array.isArray(a.tags) && a.tags.some((t: string) => String(t).toLowerCase().includes(q))
            ? 5
            : 0);
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
      .map((x) => x.a);

    return scored;
  }, [articles, searchInput]);

  useEffect(() => {
    if (!suggestOpen) return;
    setSuggestIndex(0);
  }, [suggestOpen, searchQuery]);

  const hasActiveFilters = Boolean(searchQuery || selectedCategoryId);

  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategoryId(null);
    setPage(1);
    setSuggestOpen(false);
  };

  const onSelectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
    setSuggestOpen(false);
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Get category display name (with breadcrumb if child)
  const getCategoryDisplayName = (category: any): string => {
    if (!category) return '';
    if (category.parent) {
      return `${category.parent.name} > ${category.name}`;
    }
    return category.name;
  };

  const onCardOpen = (id: string) => {
    pushRecentlyViewed(String(id));
    navigate(`/help-center/article/${id}`);
  };

  const recentlyViewedIds = useMemo(() => readRecentlyViewed(), []);
  const recentlyViewedArticles = useMemo(() => {
    if (!recentlyViewedIds.length) return [];
    const map = new Map<string, any>();
    for (const a of [...featuredArticles, ...popularArticles, ...articles]) {
      if (a?.id) map.set(String(a.id), a);
    }
    return recentlyViewedIds.map((id) => map.get(String(id))).filter(Boolean).slice(0, 3);
  }, [recentlyViewedIds, featuredArticles, popularArticles, articles]);

  // Suggestion keyboard navigation
  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestOpen(true);
      setSuggestIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (suggestOpen && suggestions[suggestIndex]) {
        e.preventDefault();
        onCardOpen(String(suggestions[suggestIndex].id));
        setSuggestOpen(false);
      }
    } else if (e.key === 'Escape') {
      setSuggestOpen(false);
    }
  };

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return t('helpCenter.allArticles') || 'All Articles';
    if (!selectedCategory) return t('helpCenter.articles') || 'Articles';
    return selectedCategory.name;
  }, [selectedCategoryId, selectedCategory, t]);

  const showUpdatingHint = Boolean(isFetching) && !articlesLoading;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="min-w-0 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {t('nav.helpCenter') || 'Help Center'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('helpCenter.subtitle') || 'Find answers to your questions and learn how to use Nazim SMS'}
          </p>
        </div>

        {/* Search Bar + Suggestions */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={t('assets.searchPlaceholder') || 'Search for help articles...'}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => {
              // Small delay so clicks on suggestions register
              window.setTimeout(() => setSuggestOpen(false), 120);
            }}
            onKeyDown={onSearchKeyDown}
            className="pl-10 pr-20 h-12 text-base sm:text-lg"
          />

          {/* Right side controls */}
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {showUpdatingHint && (
              <span className="text-xs text-muted-foreground hidden sm:inline mr-2">
                {t('common.updating') || 'Updating…'}
              </span>
            )}
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearchInput('');
                  setSuggestOpen(false);
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {suggestOpen && suggestions.length > 0 && (
            <div className="absolute z-50 mt-2 w-full rounded-lg border bg-background shadow-lg overflow-hidden">
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
                <span>{tUnsafe('helpCenter.topMatches') || 'Top matches'}</span>
                <span className="hidden sm:inline">{tUnsafe('helpCenter.tipEnter') || 'Enter to open • ↑↓ to navigate'}</span>
              </div>
              <div className="max-h-72 overflow-auto">
                {suggestions.map((a: any, idx: number) => (
                  <button
                    key={a.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-3 hover:bg-muted/60 transition-colors',
                      idx === suggestIndex && 'bg-muted'
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onCardOpen(String(a.id));
                      setSuggestOpen(false);
                    }}
                  >
                    <div className="font-medium line-clamp-1">{a.title}</div>
                    {a.excerpt && (
                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">{a.excerpt}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {(searchQuery || selectedCategoryId) && (
          <div className="flex items-center gap-2 flex-wrap mt-4">
            <span className="text-sm text-muted-foreground">
              {tUnsafe('helpCenter.activeFilters') || 'Active filters:'}
            </span>

            {selectedCategoryId && (
              <Badge variant="secondary" className="gap-1">
                {tUnsafe('helpCenter.category') || 'Category'}: {selectedCategory?.name ?? ''}
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => onSelectCategory(null)}
                  aria-label="Remove category filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            )}

            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                {tUnsafe('helpCenter.search') || 'Search'}: “{searchQuery}”
                <button
                  type="button"
                  className="ml-1"
                  onClick={() => {
                    setSearchInput('');
                    setSearchQuery('');
                  }}
                  aria-label="Remove search filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            )}

            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              {t('events.clearFilters') || 'Clear Filters'}
            </Button>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Left: Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />

          {/* Mobile filter drawer */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  {tUnsafe('helpCenter.filters') || 'Filters'}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[380px]">
                <SheetHeader>
                  <SheetTitle>{tUnsafe('helpCenter.browseCategories') || 'Browse Categories'}</SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
                  <Button
                    variant={selectedCategoryId === null ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start gap-2 h-9 font-medium"
                    onClick={() => onSelectCategory(null)}
                  >
                    <Home className="h-4 w-4" />
                    {t('helpCenter.allCategories') || 'All Categories'}
                  </Button>

                  {categoriesLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="pt-1">
                      <CategoryTree
                        categories={helpCategories}
                        selectedId={selectedCategoryId}
                        expanded={expandedCategories}
                        toggleExpanded={toggleCategoryExpanded}
                        onSelect={onSelectCategory}
                      />
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop quick category buttons (optional) */}
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedCategoryId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelectCategory(null)}
            >
              {t('helpCenter.allCategories') || 'All Categories'}
            </Button>
          </div>
        </div>

        {/* Right: Sort + View */}
        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select
            value={sortMode}
            onValueChange={(v) => {
              setSortMode(v as SortMode);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[170px] h-9">
              <SelectValue placeholder={tUnsafe('helpCenter.sortBy') || 'Sort by'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{tUnsafe('helpCenter.sortRecent') || 'Most recent'}</SelectItem>
              <SelectItem value="popular">{tUnsafe('helpCenter.sortPopular') || 'Most popular'}</SelectItem>
              <SelectItem value="az">{tUnsafe('helpCenter.sortAZ') || 'A → Z'}</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layout: Sidebar (desktop) + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">
                {tUnsafe('helpCenter.browseCategories') || 'Browse Categories'}
              </CardTitle>
              <CardDescription>
                {tUnsafe('helpCenter.categoryHint') || 'Pick a category to narrow results.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {categoriesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-9 rounded-md bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(85vh-120px)] overflow-y-auto pr-1">
                  <Button
                    variant={selectedCategoryId === null ? 'default' : 'outline'}
                    size="sm"
                    className="w-full justify-start gap-2 h-9 font-medium"
                    onClick={() => onSelectCategory(null)}
                  >
                    <Home className="h-4 w-4" />
                    {t('helpCenter.allCategories') || 'All Categories'}
                  </Button>
                  <div className="pt-1">
                    <CategoryTree
                      categories={helpCategories}
                      selectedId={selectedCategoryId}
                      expanded={expandedCategories}
                      toggleExpanded={toggleCategoryExpanded}
                      onSelect={onSelectCategory}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <main>
          {/* School Setup Tour Button */}
          {!hasActiveFilters && (
            <div className="mb-8">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {t('helpCenter.startSchoolSetupTour') || 'School Setup Tour'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {t('helpCenter.schoolSetupTourDescription') || 'Complete guide to setting up your school: school details, academic years, classes, and subjects'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        const isCompleted = isTourCompleted('schoolSetup');
                        if (isCompleted) {
                          // Reset and restart if already completed
                          await startTour('schoolSetup');
                        } else {
                          // Try to resume, or start if never started
                          try {
                            await resumeTour('schoolSetup');
                          } catch {
                            await startTour('schoolSetup');
                          }
                        }
                      }}
                      className="flex-shrink-0"
                      size="lg"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {t('helpCenter.startSchoolSetupTour') || 'Start School Setup Tour'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recently Viewed */}
          {!hasActiveFilters && recentlyViewedArticles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">
                  {tUnsafe('helpCenter.continueReading') || 'Continue reading'}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentlyViewedArticles.map((a: any) => (
                  <ArticleCard key={a.id} article={a} onOpen={onCardOpen} />
                ))}
              </div>
            </div>
          )}

          {/* Featured Articles */}
          {!hasActiveFilters && featuredArticles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold">
                  {t('helpCenter.featuredArticles') || 'Featured Articles'}
                </h2>
              </div>

              {featuredLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ArticleCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {featuredArticles.map((article: any) => (
                    <Card
                      key={article.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => onCardOpen(String(article.id))}
                    >
                      {article.featured_image_url && (
                        <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                          <img
                            src={article.featured_image_url}
                            alt={article.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
                          <Star className="h-5 w-5 text-yellow-500 flex-shrink-0 ml-2" />
                        </div>
                        {article.excerpt && (
                          <CardDescription className="line-clamp-2">{article.excerpt}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{formatCompactNumber(article.view_count)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{formatCompactNumber(article.helpful_count)}</span>
                          </div>
                          {article.excerpt && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Clock className="h-4 w-4" />
                              <span>
                                {estimateReadingTime(article.excerpt) ?? 1}{' '}
                                {tUnsafe('helpCenter.minRead') || 'min'}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Popular Articles */}
          {!hasActiveFilters && popularArticles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  {t('helpCenter.popularArticles') || 'Popular Articles'}
                </h2>
              </div>

              {popularLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="h-5 w-3/5 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-4/5 bg-muted rounded animate-pulse mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {popularArticles.map((article: any, index: number) => (
                    <Card
                      key={article.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onCardOpen(String(article.id))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold line-clamp-1">{article.title}</h3>
                            {article.excerpt && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {article.excerpt}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span>{formatCompactNumber(article.view_count)}</span>
                            </div>
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Articles List/Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold truncate">{selectedCategoryName}</h2>
                <p className="text-sm text-muted-foreground">
                  {tUnsafe('helpCenter.scanHint') || 'Browse articles, or search to jump straight to an answer.'}
                </p>
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {totalArticles} {t('helpCenter.articlesFound') || 'articles found'}
              </span>
            </div>

            {articlesLoading ? (
              <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4')}>
                {Array.from({ length: viewMode === 'grid' ? 9 : 6 }).map((_, i) => (
                  <ArticleCardSkeleton key={i} variant={viewMode} />
                ))}
              </div>
            ) : filteredArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {t('helpCenter.noArticlesFound') || 'No articles found'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('helpCenter.noArticlesDescription') || 'Try adjusting your search or filters'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={clearFilters}>
                      {t('events.clearFilters') || 'Clear Filters'}
                    </Button>
                    <Button onClick={() => onSelectCategory(null)}>
                      {tUnsafe('helpCenter.browseAll') || 'Browse all'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((article: any) => (
                  <ArticleCard key={article.id} article={article} onOpen={onCardOpen} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredArticles.map((article: any) => (
                  <ArticleCard key={article.id} article={article} variant="list" onOpen={onCardOpen} />
                ))}
              </div>
            )}

            {/* Pagination controls */}
            {shouldShowPagination && (
              <div className="flex flex-col items-center justify-center gap-4 mt-8 pt-6 border-t">
                <div className="text-sm text-muted-foreground">
                  {tUnsafe('helpCenter.showingPage') || 'Showing page'} {currentPage} {tUnsafe('helpCenter.of') || 'of'} {totalPages} 
                  {' '}({totalArticles} {tUnsafe('helpCenter.totalArticles') || 'total articles'})
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setPage(currentPage - 1);
                          }
                        }}
                        className={cn(
                          currentPage <= 1 && 'pointer-events-none opacity-50',
                          'cursor-pointer'
                        )}
                        aria-disabled={currentPage <= 1}
                        href="#"
                      />
                    </PaginationItem>

                    {(() => {
                      const pages: (number | 'ellipsis')[] = [];
                      const maxVisible = 7;

                      if (totalPages <= maxVisible) {
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        pages.push(1);

                        let start = Math.max(2, currentPage - 1);
                        let end = Math.min(totalPages - 1, currentPage + 1);

                        if (currentPage <= 3) {
                          start = 2;
                          end = 4;
                        }

                        if (currentPage >= totalPages - 2) {
                          start = totalPages - 3;
                          end = totalPages - 1;
                        }

                        if (start > 2) {
                          pages.push('ellipsis');
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (end < totalPages - 1) {
                          pages.push('ellipsis');
                        }

                        pages.push(totalPages);
                      }

                      return pages.map((pageNum, idx) => {
                        if (pageNum === 'ellipsis') {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                              href="#"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      });
                    })()}

                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            setPage(currentPage + 1);
                          }
                        }}
                        className={cn(
                          currentPage >= totalPages && 'pointer-events-none opacity-50',
                          'cursor-pointer'
                        )}
                        aria-disabled={currentPage >= totalPages}
                        href="#"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>

          {/* Optional: “Need more help?” CTA */}
          <Card>
            <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{tUnsafe('helpCenter.needMoreHelp') || 'Need more help?'}</h3>
                <p className="text-sm text-muted-foreground">
                  {tUnsafe('helpCenter.needMoreHelpDesc') || 'If you can’t find what you need, contact support or ask your admin.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  {tUnsafe('helpCenter.resetSearch') || 'Reset search'}
                </Button>
                <Button onClick={() => navigate('/support')}>
                  {tUnsafe('helpCenter.contactSupport') || 'Contact support'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

// Article Card Component
function ArticleCard({
  article,
  variant = 'grid',
  onOpen,
}: {
  article: any;
  variant?: 'grid' | 'list';
  onOpen: (id: string) => void;
}) {
  const readingTime = estimateReadingTime(article?.excerpt || article?.content || article?.title);

  if (variant === 'list') {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpen(String(article.id))}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {article.featured_image_url && (
              <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden">
                <img
                  src={article.featured_image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold line-clamp-2">{article.title}</h3>
                {article.is_pinned && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    {article.pinned_label || 'Pinned'}
                  </Badge>
                )}
              </div>

              {article.excerpt && (
                <p className="text-muted-foreground line-clamp-2 mb-3">{article.excerpt}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatCompactNumber(article.view_count)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{formatCompactNumber(article.helpful_count)}</span>
                </div>
                {readingTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{readingTime} min</span>
                  </div>
                )}
                {Array.isArray(article.tags) && article.tags.length > 0 && (
                  <div className="flex items-center gap-2">
                    {article.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col"
      onClick={() => onOpen(String(article.id))}
    >
      {article.featured_image_url && (
        <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
          {article.is_pinned && (
            <Badge variant="secondary" className="flex-shrink-0">
              {article.pinned_label || 'Pinned'}
            </Badge>
          )}
        </div>
        {article.excerpt && <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>}
      </CardHeader>

      <CardContent className="mt-auto">
        {Array.isArray(article.tags) && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {article.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{formatCompactNumber(article.view_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{formatCompactNumber(article.helpful_count)}</span>
            </div>
            {readingTime && (
              <div className="hidden sm:flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min</span>
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function ArticleCardSkeleton({ variant = 'grid' }: { variant?: 'grid' | 'list' }) {
  if (variant === 'list') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 bg-muted rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-5 w-3/5 bg-muted rounded animate-pulse" />
              <div className="h-4 w-4/5 bg-muted rounded animate-pulse mt-3" />
              <div className="h-4 w-2/3 bg-muted rounded animate-pulse mt-2" />
              <div className="flex gap-2 mt-4">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="h-40 bg-muted rounded-t-lg animate-pulse" />
      <CardHeader className="flex-1">
        <div className="h-5 w-4/5 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse mt-3" />
        <div className="h-4 w-5/6 bg-muted rounded animate-pulse mt-2" />
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="flex gap-2 mb-3">
          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
          <div className="h-5 w-12 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          <div className="h-4 w-6 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
