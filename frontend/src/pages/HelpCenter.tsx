import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useHelpCenterCategories,
  useHelpCenterArticles,
  useFeaturedArticles,
  usePopularArticles,
} from '@/hooks/useHelpCenter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  HelpCircle,
  Star,
  TrendingUp,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Grid3x3,
  List,
  Filter,
  X,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export default function HelpCenter() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch data
  const { data: categories = [], isLoading: categoriesLoading } = useHelpCenterCategories({
    is_active: true,
    parent_id: null, // Root categories only
  });
  
  const { data: articles = [], isLoading: articlesLoading } = useHelpCenterArticles({
    is_published: true,
    category_id: selectedCategoryId || undefined,
    search: searchQuery || undefined,
    order_by: 'recent',
  });

  const { data: featuredArticles = [] } = useFeaturedArticles(3);
  const { data: popularArticles = [] } = usePopularArticles(5);

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.excerpt?.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [articles, searchQuery]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('search', value);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  // Handle category selection
  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    const newParams = new URLSearchParams(searchParams);
    if (categoryId) {
      newParams.set('category', categoryId);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId(null);
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedCategoryId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">
            {t('helpCenter.title') || 'Help Center'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('helpCenter.subtitle') || 'Find answers to your questions and learn how to use Nazim SMS'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('helpCenter.searchPlaceholder') || 'Search for help articles...'}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 h-12 text-lg"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => handleSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filters and View Mode */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={selectedCategoryId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleCategorySelect(null)}
          >
            {t('helpCenter.allCategories') || 'All Categories'}
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategoryId === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategorySelect(category.id)}
            >
              {category.icon && <span className="mr-2">{category.icon}</span>}
              {category.name}
            </Button>
          ))}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              {t('helpCenter.clearFilters') || 'Clear Filters'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Featured Articles (only show when no filters) */}
      {!hasActiveFilters && featuredArticles.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">
              {t('helpCenter.featuredArticles') || 'Featured Articles'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredArticles.map((article) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/help-center/article/${article.id}`)}
              >
                {article.featured_image_url && (
                  <div className="h-32 bg-muted rounded-t-lg overflow-hidden">
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover"
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
                      <span>{article.view_count}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{article.helpful_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Popular Articles (only show when no filters) */}
      {!hasActiveFilters && popularArticles.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {t('helpCenter.popularArticles') || 'Popular Articles'}
            </h2>
          </div>
          <div className="space-y-2">
            {popularArticles.map((article, index) => (
              <Card
                key={article.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/help-center/article/${article.id}`)}
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
                        <span>{article.view_count}</span>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Articles List/Grid */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {selectedCategoryId
              ? categories.find(c => c.id === selectedCategoryId)?.name || t('helpCenter.articles') || 'Articles'
              : t('helpCenter.allArticles') || 'All Articles'}
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredArticles.length} {t('helpCenter.articlesFound') || 'articles found'}
          </span>
        </div>

        {articlesLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredArticles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('helpCenter.noArticlesFound') || 'No articles found'}
              </h3>
              <p className="text-muted-foreground">
                {t('helpCenter.noArticlesDescription') || 'Try adjusting your search or filters'}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} variant="list" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Article Card Component
function ArticleCard({
  article,
  variant = 'grid',
}: {
  article: any;
  variant?: 'grid' | 'list';
}) {
  const navigate = useNavigate();

  if (variant === 'list') {
    return (
      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/help-center/article/${article.id}`)}
      >
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {article.featured_image_url && (
              <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-lg overflow-hidden">
                <img
                  src={article.featured_image_url}
                  alt={article.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-lg font-semibold line-clamp-2">{article.title}</h3>
                {article.is_pinned && (
                  <Badge variant="secondary" className="flex-shrink-0">
                    Pinned
                  </Badge>
                )}
              </div>
              {article.excerpt && (
                <p className="text-muted-foreground line-clamp-2 mb-3">{article.excerpt}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{article.view_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{article.helpful_count}</span>
                </div>
                {article.tags && article.tags.length > 0 && (
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
      onClick={() => navigate(`/help-center/article/${article.id}`)}
    >
      {article.featured_image_url && (
        <div className="h-40 bg-muted rounded-t-lg overflow-hidden">
          <img
            src={article.featured_image_url}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardHeader className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
          {article.is_pinned && (
            <Badge variant="secondary" className="flex-shrink-0">
              Pinned
            </Badge>
          )}
        </div>
        {article.excerpt && (
          <CardDescription className="line-clamp-3">{article.excerpt}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="mt-auto">
        {article.tags && article.tags.length > 0 && (
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
              <span>{article.view_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              <span>{article.helpful_count}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

