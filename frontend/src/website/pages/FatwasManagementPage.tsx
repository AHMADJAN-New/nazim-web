import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, FileQuestion, Search, BookOpen, MessageSquare } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useWebsiteFatwas,
  useCreateWebsiteFatwa,
  useUpdateWebsiteFatwa,
  useDeleteWebsiteFatwa,
  useWebsiteFatwaCategories,
  useCreateWebsiteFatwaCategory,
  useUpdateWebsiteFatwaCategory,
  useDeleteWebsiteFatwaCategory,
  useWebsiteFatwaQuestions,
  useUpdateWebsiteFatwaQuestion,
  type WebsiteFatwa,
  type WebsiteFatwaCategory,
  type WebsiteFatwaQuestion,
} from '@/website/hooks/useWebsiteManager';
import { StatusBadge } from '@/website/components/StatusBadge';
import { formatDate } from '@/lib/utils';

const fatwaSchema = z.object({
  slug: z.string().min(1, 'Slug is required').max(120),
  title: z.string().min(1, 'Title is required').max(200),
  categoryId: z.string().optional().nullable(),
  questionText: z.string().optional().nullable(),
  answerText: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  isFeatured: z.boolean().default(false),
  publishedAt: z.string().optional().nullable(),
});

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(120),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().optional(),
});

const questionUpdateSchema = z.object({
  status: z.string().optional(),
  assignedTo: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  answerDraft: z.string().optional().nullable(),
});

type FatwaFormData = z.infer<typeof fatwaSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;
type QuestionUpdateFormData = z.infer<typeof questionUpdateSchema>;

export default function FatwasManagementPage() {
  const { t } = useLanguage();
  const { data: fatwas = [], isLoading: fatwasLoading } = useWebsiteFatwas();
  const { data: categories = [], isLoading: categoriesLoading } = useWebsiteFatwaCategories();
  const { data: questions = [], isLoading: questionsLoading } = useWebsiteFatwaQuestions();
  const createFatwa = useCreateWebsiteFatwa();
  const updateFatwa = useUpdateWebsiteFatwa();
  const deleteFatwa = useDeleteWebsiteFatwa();
  const createCategory = useCreateWebsiteFatwaCategory();
  const updateCategory = useUpdateWebsiteFatwaCategory();
  const deleteCategory = useDeleteWebsiteFatwaCategory();
  const updateQuestion = useUpdateWebsiteFatwaQuestion();

  const [activeTab, setActiveTab] = useState('fatwas');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateFatwaOpen, setIsCreateFatwaOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editFatwa, setEditFatwa] = useState<WebsiteFatwa | null>(null);
  const [editCategory, setEditCategory] = useState<WebsiteFatwaCategory | null>(null);
  const [editQuestion, setEditQuestion] = useState<WebsiteFatwaQuestion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'fatwa' | 'category' | null>(null);

  const fatwaForm = useForm<FatwaFormData>({
    resolver: zodResolver(fatwaSchema),
    defaultValues: {
      slug: '',
      title: '',
      categoryId: null,
      questionText: null,
      answerText: null,
      status: 'draft',
      isFeatured: false,
      publishedAt: null,
    },
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: null,
      isActive: true,
      sortOrder: 0,
    },
  });

  const questionForm = useForm<QuestionUpdateFormData>({
    resolver: zodResolver(questionUpdateSchema),
    defaultValues: {
      status: '',
      assignedTo: null,
      internalNotes: null,
      answerDraft: null,
    },
  });

  const filteredFatwas = useMemo(() => {
    return fatwas.filter((fatwa) => {
      const matchesSearch = fatwa.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fatwa.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || fatwa.categoryId === categoryFilter;
      const matchesStatus = statusFilter === 'all' || fatwa.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [fatwas, searchQuery, categoryFilter, statusFilter]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((question) => {
      const matchesSearch = question.questionText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || question.categoryId === categoryFilter;
      const matchesStatus = statusFilter === 'all' || question.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [questions, searchQuery, categoryFilter, statusFilter]);

  const handleCreateFatwa = async (data: FatwaFormData) => {
    await createFatwa.mutateAsync({
      slug: data.slug,
      title: data.title,
      categoryId: data.categoryId,
      questionText: data.questionText,
      answerText: data.answerText,
      status: data.status,
      isFeatured: data.isFeatured,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setIsCreateFatwaOpen(false);
    fatwaForm.reset();
  };

  const handleUpdateFatwa = async (data: FatwaFormData) => {
    if (!editFatwa) return;
    await updateFatwa.mutateAsync({
      id: editFatwa.id,
      slug: data.slug,
      title: data.title,
      categoryId: data.categoryId,
      questionText: data.questionText,
      answerText: data.answerText,
      status: data.status,
      isFeatured: data.isFeatured,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    });
    setEditFatwa(null);
    fatwaForm.reset();
  };

  const handleCreateCategory = async (data: CategoryFormData) => {
    await createCategory.mutateAsync({
      name: data.name,
      slug: data.slug,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    setIsCreateCategoryOpen(false);
    categoryForm.reset();
  };

  const handleUpdateCategory = async (data: CategoryFormData) => {
    if (!editCategory) return;
    await updateCategory.mutateAsync({
      id: editCategory.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });
    setEditCategory(null);
    categoryForm.reset();
  };

  const handleUpdateQuestion = async (data: QuestionUpdateFormData) => {
    if (!editQuestion) return;
    await updateQuestion.mutateAsync({
      id: editQuestion.id,
      status: data.status,
      assignedTo: data.assignedTo,
      internalNotes: data.internalNotes,
      answerDraft: data.answerDraft,
    });
    setEditQuestion(null);
    questionForm.reset();
  };

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return;
    if (deleteType === 'fatwa') {
      await deleteFatwa.mutateAsync(deleteId);
    } else if (deleteType === 'category') {
      await deleteCategory.mutateAsync(deleteId);
    }
    setDeleteId(null);
    setDeleteType(null);
  };

  const openEditFatwaDialog = (fatwa: WebsiteFatwa) => {
    setEditFatwa(fatwa);
    fatwaForm.reset({
      slug: fatwa.slug,
      title: fatwa.title,
      categoryId: fatwa.categoryId,
      questionText: fatwa.questionText,
      answerText: fatwa.answerText,
      status: fatwa.status as 'draft' | 'published' | 'archived',
      isFeatured: fatwa.isFeatured ?? false,
      publishedAt: fatwa.publishedAt ? fatwa.publishedAt.toISOString().slice(0, 16) : null,
    });
  };

  const openEditCategoryDialog = (category: WebsiteFatwaCategory) => {
    setEditCategory(category);
    categoryForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.isActive ?? true,
      sortOrder: category.sortOrder,
    });
  };

  const openEditQuestionDialog = (question: WebsiteFatwaQuestion) => {
    setEditQuestion(question);
    questionForm.reset({
      status: question.status,
      assignedTo: question.assignedTo,
      internalNotes: question.internalNotes,
      answerDraft: question.answerDraft,
    });
  };

  const isLoading = fatwasLoading || categoriesLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Questions & Fatwas"
        description="Manage fatwas, categories, and questions"
        icon={<FileQuestion className="h-5 w-5" />}
        primaryAction={
          activeTab === 'fatwas' ? {
            label: 'New Fatwa',
            onClick: () => {
              fatwaForm.reset();
              setIsCreateFatwaOpen(true);
            },
            icon: <Plus className="h-4 w-4" />,
          } : activeTab === 'categories' ? {
            label: 'New Category',
            onClick: () => {
              categoryForm.reset();
              setIsCreateCategoryOpen(true);
            },
            icon: <Plus className="h-4 w-4" />,
          },
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fatwas" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">Fatwas</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Questions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fatwas" className="space-y-4">
          <FilterPanel title="Filters">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fatwas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPanel>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFatwas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No fatwas found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFatwas.map((fatwa) => {
                      const category = categories.find(c => c.id === fatwa.categoryId);
                      return (
                        <TableRow key={fatwa.id}>
                          <TableCell className="font-medium">{fatwa.title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category ? category.name : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={fatwa.status} />
                          </TableCell>
                          <TableCell>
                            {fatwa.isFeatured ? (
                              <span className="text-yellow-600">Yes</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {fatwa.publishedAt ? formatDate(fatwa.publishedAt) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditFatwaDialog(fatwa)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteId(fatwa.id);
                                  setDeleteType('fatwa');
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                        <TableCell>
                          {category.isActive ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>{category.sortOrder ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditCategoryDialog(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeleteId(category.id);
                                setDeleteType('category');
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <FilterPanel title="Filters">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPanel>

          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No questions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuestions.map((question) => {
                      const category = categories.find(c => c.id === question.categoryId);
                      return (
                        <TableRow key={question.id}>
                          <TableCell className="font-medium max-w-md truncate">
                            {question.questionText}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {question.isAnonymous ? 'Anonymous' : (question.name || '-')}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {category ? category.name : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={question.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {question.assignedTo || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditQuestionDialog(question)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Fatwa Dialog */}
      <Dialog open={isCreateFatwaOpen} onOpenChange={setIsCreateFatwaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Fatwa</DialogTitle>
            <DialogDescription>Create a new fatwa</DialogDescription>
          </DialogHeader>
          <form onSubmit={fatwaForm.handleSubmit(handleCreateFatwa)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" {...fatwaForm.register('slug')} placeholder="fatwa-slug" />
                {fatwaForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" {...fatwaForm.register('title')} placeholder="Fatwa Title" />
                {fatwaForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={fatwaForm.watch('categoryId') || ''}
                onValueChange={(value) => fatwaForm.setValue('categoryId', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionText">Question</Label>
              <Textarea
                id="questionText"
                {...fatwaForm.register('questionText')}
                placeholder="The question text..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answerText">Answer</Label>
              <Textarea
                id="answerText"
                {...fatwaForm.register('answerText')}
                placeholder="The fatwa answer..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={fatwaForm.watch('status')}
                  onValueChange={(value) => fatwaForm.setValue('status', value as 'draft' | 'published' | 'archived')}
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
              <div className="space-y-2">
                <Label htmlFor="publishedAt">Published At</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  {...fatwaForm.register('publishedAt')}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isFeatured"
                checked={fatwaForm.watch('isFeatured')}
                onCheckedChange={(checked) => fatwaForm.setValue('isFeatured', checked)}
              />
              <Label htmlFor="isFeatured">Featured</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateFatwaOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFatwa.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Fatwa Dialog */}
      <Dialog open={!!editFatwa} onOpenChange={(open) => !open && setEditFatwa(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Fatwa</DialogTitle>
            <DialogDescription>Update fatwa details</DialogDescription>
          </DialogHeader>
          <form onSubmit={fatwaForm.handleSubmit(handleUpdateFatwa)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug *</Label>
                <Input id="edit-slug" {...fatwaForm.register('slug')} />
                {fatwaForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input id="edit-title" {...fatwaForm.register('title')} />
                {fatwaForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">Category</Label>
              <Select
                value={fatwaForm.watch('categoryId') || ''}
                onValueChange={(value) => fatwaForm.setValue('categoryId', value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-questionText">Question</Label>
              <Textarea
                id="edit-questionText"
                {...fatwaForm.register('questionText')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-answerText">Answer</Label>
              <Textarea
                id="edit-answerText"
                {...fatwaForm.register('answerText')}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={fatwaForm.watch('status')}
                  onValueChange={(value) => fatwaForm.setValue('status', value as 'draft' | 'published' | 'archived')}
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
              <div className="space-y-2">
                <Label htmlFor="edit-publishedAt">Published At</Label>
                <Input
                  id="edit-publishedAt"
                  type="datetime-local"
                  {...fatwaForm.register('publishedAt')}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isFeatured"
                checked={fatwaForm.watch('isFeatured')}
                onCheckedChange={(checked) => fatwaForm.setValue('isFeatured', checked)}
              />
              <Label htmlFor="edit-isFeatured">Featured</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditFatwa(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFatwa.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Create a new fatwa category</DialogDescription>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Name *</Label>
                <Input id="cat-name" {...categoryForm.register('name')} placeholder="Category Name" />
                {categoryForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">Slug *</Label>
                <Input id="cat-slug" {...categoryForm.register('slug')} placeholder="category-slug" />
                {categoryForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">Description</Label>
              <Textarea
                id="cat-description"
                {...categoryForm.register('description')}
                placeholder="Category description..."
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-sortOrder">Sort Order</Label>
                <Input
                  id="cat-sortOrder"
                  type="number"
                  {...categoryForm.register('sortOrder', { valueAsNumber: true })}
                  defaultValue={0}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="cat-isActive"
                  checked={categoryForm.watch('isActive')}
                  onCheckedChange={(checked) => categoryForm.setValue('isActive', checked)}
                />
                <Label htmlFor="cat-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category details</DialogDescription>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(handleUpdateCategory)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-name">Name *</Label>
                <Input id="edit-cat-name" {...categoryForm.register('name')} />
                {categoryForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cat-slug">Slug *</Label>
                <Input id="edit-cat-slug" {...categoryForm.register('slug')} />
                {categoryForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-description">Description</Label>
              <Textarea
                id="edit-cat-description"
                {...categoryForm.register('description')}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-sortOrder">Sort Order</Label>
                <Input
                  id="edit-cat-sortOrder"
                  type="number"
                  {...categoryForm.register('sortOrder', { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="edit-cat-isActive"
                  checked={categoryForm.watch('isActive')}
                  onCheckedChange={(checked) => categoryForm.setValue('isActive', checked)}
                />
                <Label htmlFor="edit-cat-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                Update
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editQuestion} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Moderate Question</DialogTitle>
            <DialogDescription>Update question status and assignment</DialogDescription>
          </DialogHeader>
          {editQuestion && (
            <div className="space-y-4">
              <div className="rounded-md border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Question:</p>
                <p className="text-sm">{editQuestion.questionText}</p>
                {editQuestion.name && !editQuestion.isAnonymous && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Submitted by: {editQuestion.name} {editQuestion.email && `(${editQuestion.email})`}
                  </p>
                )}
              </div>
              <form onSubmit={questionForm.handleSubmit(handleUpdateQuestion)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="q-status">Status</Label>
                  <Select
                    value={questionForm.watch('status') || ''}
                    onValueChange={(value) => questionForm.setValue('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="answered">Answered</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-assignedTo">Assigned To</Label>
                  <Input
                    id="q-assignedTo"
                    {...questionForm.register('assignedTo')}
                    placeholder="User ID or email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-internalNotes">Internal Notes</Label>
                  <Textarea
                    id="q-internalNotes"
                    {...questionForm.register('internalNotes')}
                    placeholder="Internal notes for moderation..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-answerDraft">Answer Draft</Label>
                  <Textarea
                    id="q-answerDraft"
                    {...questionForm.register('answerDraft')}
                    placeholder="Draft answer..."
                    rows={6}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditQuestion(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateQuestion.isPending}>
                    Update
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && (setDeleteId(null), setDeleteType(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteType === 'fatwa' ? 'Fatwa' : 'Category'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteType === 'fatwa' ? deleteFatwa.isPending : deleteCategory.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

