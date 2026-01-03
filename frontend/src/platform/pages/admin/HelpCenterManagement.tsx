import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  FileText,
  Plus,
  Eye,
  Edit,
  Trash2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import {
  usePlatformCreateHelpCenterCategory,
  usePlatformUpdateHelpCenterCategory,
  usePlatformDeleteHelpCenterCategory,
  usePlatformCreateHelpCenterArticle,
  usePlatformUpdateHelpCenterArticle,
  usePlatformDeleteHelpCenterArticle,
} from '@/platform/hooks/usePlatformAdminComplete';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';
import type * as HelpCenterApi from '@/types/api/helpCenter';

// Category form data interface
interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  is_active: boolean;
  parent_id: string | null;
  organization_id: string | null;
}

const initialCategoryFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  icon: '',
  color: '',
  order: 0,
  is_active: true,
  parent_id: null,
  organization_id: null,
};

// Article form data interface
interface ArticleFormData {
  category_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_type: 'markdown' | 'html';
  featured_image_url: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'org_users' | 'staff_only';
  is_featured: boolean;
  is_pinned: boolean;
  meta_title: string;
  meta_description: string;
  tags: string[];
  order: number;
  organization_id: string | null;
}

const initialArticleFormData: ArticleFormData = {
  category_id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  content_type: 'html',
  featured_image_url: '',
  status: 'draft',
  visibility: 'public',
  is_featured: false,
  is_pinned: false,
  meta_title: '',
  meta_description: '',
  tags: [],
  order: 0,
  organization_id: null,
};

export default function HelpCenterManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'articles' | 'categories'>('articles');

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HelpCenterApi.HelpCenterCategory | null>(null);
  const [editingArticle, setEditingArticle] = useState<HelpCenterApi.HelpCenterArticle | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteArticleId, setDeleteArticleId] = useState<string | null>(null);

  // Form data
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(initialCategoryFormData);
  const [articleFormData, setArticleFormData] = useState<ArticleFormData>(initialArticleFormData);

  // Use platform admin permissions directly (like PlansManagement and PlatformSettings)
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  // Mutations
  const createCategory = usePlatformCreateHelpCenterCategory();
  const updateCategory = usePlatformUpdateHelpCenterCategory();
  const deleteCategory = usePlatformDeleteHelpCenterCategory();
  const createArticle = usePlatformCreateHelpCenterArticle();
  const updateArticle = usePlatformUpdateHelpCenterArticle();
  const deleteArticle = usePlatformDeleteHelpCenterArticle();

  // Fetch all categories (platform admin - no organization filter)
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<HelpCenterApi.HelpCenterCategory[]>({
    queryKey: ['platform-help-center-categories'],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      try {
        const response = await platformApi.helpCenter.categories.list({ is_active: true });
        if (Array.isArray(response)) {
          return response as HelpCenterApi.HelpCenterCategory[];
        }
        if (response && typeof response === 'object' && 'data' in response) {
          return (response.data as HelpCenterApi.HelpCenterCategory[]) || [];
        }
        return [];
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[HelpCenterManagement] Error fetching categories:', error);
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch all articles (platform admin - no organization filter)
  const { data: articles = [], isLoading: articlesLoading, error: articlesError } = useQuery<HelpCenterApi.HelpCenterArticle[]>({
    queryKey: ['platform-help-center-articles', searchQuery],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      try {
        const response = await platformApi.helpCenter.articles.list({
          search: searchQuery || undefined,
        });
        if (Array.isArray(response)) {
          return response as HelpCenterApi.HelpCenterArticle[];
        }
        if (response && typeof response === 'object' && 'data' in response) {
          return (response.data as HelpCenterApi.HelpCenterArticle[]) || [];
        }
        return [];
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[HelpCenterManagement] Error fetching articles:', error);
        }
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  // Filter articles by search
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        article.excerpt?.toLowerCase().includes(query) ||
        (Array.isArray(article.tags) && article.tags.some((tag) => tag.toLowerCase().includes(query)))
      );
    });
  }, [articles, searchQuery]);

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData(initialCategoryFormData);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: HelpCenterApi.HelpCenterCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
      order: category.order,
      is_active: category.is_active,
      parent_id: category.parent_id,
      organization_id: category.organization_id,
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const payload: HelpCenterApi.HelpCenterCategoryInsert = {
        name: categoryFormData.name,
        slug: categoryFormData.slug || undefined,
        description: categoryFormData.description || undefined,
        icon: categoryFormData.icon || undefined,
        color: categoryFormData.color || undefined,
        order: categoryFormData.order,
        is_active: categoryFormData.is_active,
        parent_id: categoryFormData.parent_id || undefined,
        organization_id: categoryFormData.organization_id || undefined,
      };

      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, ...payload });
      } else {
        await createCategory.mutateAsync(payload);
      }
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryFormData(initialCategoryFormData);
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await deleteCategory.mutateAsync(deleteCategoryId);
      setDeleteCategoryId(null);
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  // Article handlers
  const handleCreateArticle = () => {
    setEditingArticle(null);
    setArticleFormData(initialArticleFormData);
    setIsArticleDialogOpen(true);
  };

  const handleEditArticle = (article: HelpCenterApi.HelpCenterArticle) => {
    setEditingArticle(article);
    setArticleFormData({
      category_id: article.category_id,
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: article.content,
      content_type: article.content_type,
      featured_image_url: article.featured_image_url || '',
      status: article.status || (article.is_published ? 'published' : 'draft'),
      visibility: article.visibility || 'public',
      is_featured: article.is_featured,
      is_pinned: article.is_pinned,
      meta_title: article.meta_title || '',
      meta_description: article.meta_description || '',
      tags: article.tags || [],
      order: article.order,
      organization_id: article.organization_id,
    });
    setIsArticleDialogOpen(true);
  };

  const handleSaveArticle = async () => {
    try {
      const payload: HelpCenterApi.HelpCenterArticleInsert = {
        category_id: articleFormData.category_id,
        title: articleFormData.title,
        slug: articleFormData.slug || undefined,
        excerpt: articleFormData.excerpt || undefined,
        content: articleFormData.content,
        content_type: articleFormData.content_type,
        featured_image_url: articleFormData.featured_image_url || undefined,
        status: articleFormData.status,
        visibility: articleFormData.visibility,
        is_featured: articleFormData.is_featured,
        is_pinned: articleFormData.is_pinned,
        meta_title: articleFormData.meta_title || undefined,
        meta_description: articleFormData.meta_description || undefined,
        tags: articleFormData.tags,
        order: articleFormData.order,
        organization_id: articleFormData.organization_id || undefined,
        // Note: is_published and author_id are set automatically by backend based on status and authenticated user
      };

      if (editingArticle) {
        await updateArticle.mutateAsync({ id: editingArticle.id, ...payload });
      } else {
        await createArticle.mutateAsync(payload);
      }
      setIsArticleDialogOpen(false);
      setEditingArticle(null);
      setArticleFormData(initialArticleFormData);
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  const handleDeleteArticle = async () => {
    if (!deleteArticleId) return;
    try {
      await deleteArticle.mutateAsync(deleteArticleId);
      setDeleteArticleId(null);
    } catch (error) {
      // Error is handled by mutation hook
    }
  };

  // Show loading while permissions are loading
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access control - redirect if no permission
  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge variant="default" className="bg-green-500">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Badge variant="default">Public</Badge>;
      case 'org_users':
        return <Badge variant="secondary">Org Users</Badge>;
      case 'staff_only':
        return <Badge variant="outline">Staff Only</Badge>;
      default:
        return <Badge variant="secondary">{visibility}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('helpCenter.title.helpCenterManagement') || 'Help Center Management'}
          </h1>
          <p className="text-muted-foreground">
            {t('helpCenter.subtitle') || 'Manage help center articles and categories'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('helpCenter.searchPlaceholder') || 'Search articles and categories...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'articles' | 'categories')}>
        <TabsList>
          <TabsTrigger value="articles">
            <FileText className="h-4 w-4 mr-2" />
            Articles ({filteredArticles.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            <BookOpen className="h-4 w-4 mr-2" />
            Categories ({filteredCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          {articlesLoading ? (
            <div className="flex h-[50vh] items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : articlesError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('helpCenter.errorLoadingArticles') || 'Error loading articles'}
                </h3>
                <p className="text-muted-foreground">
                  {articlesError instanceof Error ? articlesError.message : 'An error occurred'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Articles</CardTitle>
                    <CardDescription>
                      {filteredArticles.length} {t('helpCenter.articlesFound') || 'articles found'}
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateArticle}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Article
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredArticles.length === 0 ? (
                  <div className="py-12 text-center">
                    <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('helpCenter.noArticlesFound') || 'No articles found'}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('helpCenter.noArticlesDescription') || 'Try adjusting your search'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium">{article.title}</TableCell>
                          <TableCell>
                            {categories.find((c) => c.id === article.category_id)?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(
                              article.status || 
                              (article.is_published ? 'published' : 'draft')
                            )}
                          </TableCell>
                          <TableCell>
                            {getVisibilityBadge(article.visibility || 'public')}
                          </TableCell>
                          <TableCell>{article.view_count || 0}</TableCell>
                          <TableCell>
                            {article.created_at ? formatDate(new Date(article.created_at)) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(`/help-center/article/${article.id}`, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditArticle(article)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteArticleId(article.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoriesLoading ? (
            <div className="flex h-[50vh] items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categoriesError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('helpCenter.errorLoadingCategories') || 'Error loading categories'}
                </h3>
                <p className="text-muted-foreground">
                  {categoriesError instanceof Error ? categoriesError.message : 'An error occurred'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categories</CardTitle>
                    <CardDescription>
                      {filteredCategories.length} categories found
                    </CardDescription>
                  </div>
                  <Button onClick={handleCreateCategory}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filteredCategories.length === 0 ? (
                  <div className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No categories found</h3>
                    <p className="text-muted-foreground">Try adjusting your search</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Articles</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.description || 'N/A'}</TableCell>
                          <TableCell>{category.article_count || 0}</TableCell>
                          <TableCell>
                            {category.is_active ? (
                              <Badge variant="default" className="bg-green-500">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {category.created_at ? formatDate(new Date(category.created_at)) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteCategoryId(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Category Create/Edit Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the category details'
                : 'Create a new help center category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="Getting Started"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={categoryFormData.slug}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, slug: e.target.value })}
                placeholder="getting-started"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Category description..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-icon">Icon</Label>
                <Input
                  id="category-icon"
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  placeholder="book-open"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-color">Color</Label>
                <Input
                  id="category-color"
                  type="color"
                  value={categoryFormData.color || '#000000'}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-order">Order</Label>
                <Input
                  id="category-order"
                  type="number"
                  value={categoryFormData.order}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, order: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-parent">Parent Category</Label>
                <Select
                  value={categoryFormData.parent_id || '__none__'}
                  onValueChange={(value) => setCategoryFormData({ ...categoryFormData, parent_id: value === '__none__' ? null : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Root Category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Root Category)</SelectItem>
                    {categories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="category-active"
                checked={categoryFormData.is_active}
                onCheckedChange={(checked) => setCategoryFormData({ ...categoryFormData, is_active: checked })}
              />
              <Label htmlFor="category-active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCategory}
              disabled={!categoryFormData.name || createCategory.isPending || updateCategory.isPending}
            >
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Article Create/Edit Dialog */}
      <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Edit Article' : 'Create Article'}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? 'Update the article details'
                : 'Create a new help center article'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="article-category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={articleFormData.category_id}
                  onValueChange={(value) => setArticleFormData({ ...articleFormData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-status">Status</Label>
                <Select
                  value={articleFormData.status}
                  onValueChange={(value: 'draft' | 'published' | 'archived') => 
                    setArticleFormData({ ...articleFormData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="article-title"
                value={articleFormData.title}
                onChange={(e) => setArticleFormData({ ...articleFormData, title: e.target.value })}
                placeholder="Article title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-slug">Slug</Label>
              <Input
                id="article-slug"
                value={articleFormData.slug}
                onChange={(e) => setArticleFormData({ ...articleFormData, slug: e.target.value })}
                placeholder="article-slug"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate from title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-excerpt">Excerpt</Label>
              <Textarea
                id="article-excerpt"
                value={articleFormData.excerpt}
                onChange={(e) => setArticleFormData({ ...articleFormData, excerpt: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="article-content"
                value={articleFormData.content}
                onChange={(e) => setArticleFormData({ ...articleFormData, content: e.target.value })}
                placeholder="Article content..."
                rows={10}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="article-visibility">Visibility</Label>
                <Select
                  value={articleFormData.visibility}
                  onValueChange={(value: 'public' | 'org_users' | 'staff_only') => 
                    setArticleFormData({ ...articleFormData, visibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="org_users">Organization Users</SelectItem>
                    <SelectItem value="staff_only">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-content-type">Content Type</Label>
                <Select
                  value={articleFormData.content_type}
                  onValueChange={(value: 'markdown' | 'html') => 
                    setArticleFormData({ ...articleFormData, content_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="markdown">Markdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-featured-image">Featured Image URL</Label>
              <Input
                id="article-featured-image"
                value={articleFormData.featured_image_url}
                onChange={(e) => setArticleFormData({ ...articleFormData, featured_image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="article-meta-title">Meta Title</Label>
                <Input
                  id="article-meta-title"
                  value={articleFormData.meta_title}
                  onChange={(e) => setArticleFormData({ ...articleFormData, meta_title: e.target.value })}
                  placeholder="SEO meta title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="article-order">Order</Label>
                <Input
                  id="article-order"
                  type="number"
                  value={articleFormData.order}
                  onChange={(e) => setArticleFormData({ ...articleFormData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="article-meta-description">Meta Description</Label>
              <Textarea
                id="article-meta-description"
                value={articleFormData.meta_description}
                onChange={(e) => setArticleFormData({ ...articleFormData, meta_description: e.target.value })}
                placeholder="SEO meta description"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="article-featured"
                  checked={articleFormData.is_featured}
                  onCheckedChange={(checked) => setArticleFormData({ ...articleFormData, is_featured: checked })}
                />
                <Label htmlFor="article-featured">Featured</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="article-pinned"
                  checked={articleFormData.is_pinned}
                  onCheckedChange={(checked) => setArticleFormData({ ...articleFormData, is_pinned: checked })}
                />
                <Label htmlFor="article-pinned">Pinned</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsArticleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveArticle}
              disabled={!articleFormData.title || !articleFormData.category_id || !articleFormData.content || createArticle.isPending || updateArticle.isPending}
            >
              {editingArticle ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
              {deleteCategoryId && categories.find((c) => c.id === deleteCategoryId)?.article_count 
                ? ` This category has ${categories.find((c) => c.id === deleteCategoryId)?.article_count} articles.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Article Confirmation */}
      <AlertDialog open={!!deleteArticleId} onOpenChange={(open) => !open && setDeleteArticleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
