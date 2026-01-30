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

/** Sentinel value for "no category" in Select (Radix disallows empty string for SelectItem). */
const CATEGORY_NONE_VALUE = '__none__';

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
        title={t('websiteAdmin.fatwas.title')}
        description={t('websiteAdmin.fatwas.description')}
        icon={<FileQuestion className="h-5 w-5" />}
        primaryAction={
          activeTab === 'fatwas' ? {
            label: t('websiteAdmin.fatwas.newFatwa'),
            onClick: () => {
              fatwaForm.reset();
              setIsCreateFatwaOpen(true);
            },
            icon: <Plus className="h-4 w-4" />,
          } : activeTab === 'categories' ? {
            label: t('websiteAdmin.fatwas.newCategory'),
            onClick: () => {
              categoryForm.reset();
              setIsCreateCategoryOpen(true);
            },
            icon: <Plus className="h-4 w-4" />,
          } : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fatwas" className="flex items-center gap-2">
            <FileQuestion className="h-4 w-4" />
            <span className="hidden sm:inline">{t('websiteAdmin.fatwas.tabs.fatwas')}</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">{t('websiteAdmin.fatwas.tabs.categories')}</span>
          </TabsTrigger>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t('websiteAdmin.fatwas.tabs.questions')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fatwas" className="space-y-4">
          <FilterPanel title={t('websiteAdmin.common.filters')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('websiteAdmin.fatwas.searchFatwas')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.category')}</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                    <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                    <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                    <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
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
                    <TableHead>{t('websiteAdmin.fatwas.fields.title')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.category')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                    <TableHead>{t('websiteAdmin.fatwas.fields.featured')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.publishedAt')}</TableHead>
                    <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFatwas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t('websiteAdmin.fatwas.noFatwas')}
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
                              <span className="text-yellow-600">{t('websiteAdmin.common.yes')}</span>
                            ) : (
                              <span className="text-muted-foreground">{t('websiteAdmin.common.no')}</span>
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
                    <TableHead>{t('websiteAdmin.fatwas.fields.name')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.slug')}</TableHead>
                    <TableHead>{t('websiteAdmin.fatwas.fields.active')}</TableHead>
                    <TableHead>{t('websiteAdmin.fatwas.fields.sortOrder')}</TableHead>
                    <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {t('websiteAdmin.fatwas.noCategories')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-muted-foreground">/{category.slug}</TableCell>
                        <TableCell>
                          {category.isActive ? (
                            <span className="text-green-600">{t('websiteAdmin.common.yes')}</span>
                          ) : (
                            <span className="text-muted-foreground">{t('websiteAdmin.common.no')}</span>
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
          <FilterPanel title={t('websiteAdmin.common.filters')}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.search')}</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('websiteAdmin.fatwas.searchQuestions')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.category')}</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('websiteAdmin.common.status')}</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                    <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                    <SelectItem value="assigned">{t('websiteAdmin.statuses.assigned')}</SelectItem>
                    <SelectItem value="answered">{t('websiteAdmin.statuses.answered')}</SelectItem>
                    <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
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
                    <TableHead>{t('websiteAdmin.fatwas.fields.question')}</TableHead>
                    <TableHead>{t('websiteAdmin.fatwas.moderation.submittedBy')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.category')}</TableHead>
                    <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                    <TableHead>{t('websiteAdmin.fatwas.fields.assignedTo')}</TableHead>
                    <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {t('websiteAdmin.fatwas.noQuestions')}
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
                            {question.isAnonymous ? t('websiteAdmin.fatwas.anonymous') : (question.name || '-')}
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
            <DialogTitle>{t('websiteAdmin.fatwas.newFatwa')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.fatwas.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={fatwaForm.handleSubmit(handleCreateFatwa)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">{t('websiteAdmin.fatwas.fields.slug')} *</Label>
                <Input id="slug" {...fatwaForm.register('slug')} placeholder={t('websiteAdmin.fatwas.placeholders.slug')} />
                {fatwaForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">{t('websiteAdmin.fatwas.fields.title')} *</Label>
                <Input id="title" {...fatwaForm.register('title')} placeholder={t('websiteAdmin.fatwas.placeholders.title')} />
                {fatwaForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoryId">{t('websiteAdmin.fatwas.fields.category')}</Label>
              <Select
                value={fatwaForm.watch('categoryId') ?? CATEGORY_NONE_VALUE}
                onValueChange={(value) => fatwaForm.setValue('categoryId', value === CATEGORY_NONE_VALUE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.fatwas.placeholders.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_NONE_VALUE}>{t('websiteAdmin.common.none')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionText">{t('websiteAdmin.fatwas.fields.question')}</Label>
              <Textarea
                id="questionText"
                {...fatwaForm.register('questionText')}
                placeholder={t('websiteAdmin.fatwas.placeholders.question')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answerText">{t('websiteAdmin.fatwas.fields.answer')}</Label>
              <Textarea
                id="answerText"
                {...fatwaForm.register('answerText')}
                placeholder={t('websiteAdmin.fatwas.placeholders.answer')}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">{t('websiteAdmin.common.status')}</Label>
                <Select
                  value={fatwaForm.watch('status')}
                  onValueChange={(value) => fatwaForm.setValue('status', value as 'draft' | 'published' | 'archived')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                    <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                    <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="publishedAt">{t('websiteAdmin.fatwas.fields.publishedAt')}</Label>
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
              <Label htmlFor="isFeatured">{t('websiteAdmin.fatwas.fields.featured')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateFatwaOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createFatwa.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Fatwa Dialog */}
      <Dialog open={!!editFatwa} onOpenChange={(open) => !open && setEditFatwa(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.fatwas.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.fatwas.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={fatwaForm.handleSubmit(handleUpdateFatwa)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-slug">{t('websiteAdmin.fatwas.fields.slug')} *</Label>
                <Input id="edit-slug" {...fatwaForm.register('slug')} />
                {fatwaForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.slug.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-title">{t('websiteAdmin.fatwas.fields.title')} *</Label>
                <Input id="edit-title" {...fatwaForm.register('title')} />
                {fatwaForm.formState.errors.title && (
                  <p className="text-sm text-destructive">{fatwaForm.formState.errors.title.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-categoryId">{t('websiteAdmin.fatwas.fields.category')}</Label>
              <Select
                value={fatwaForm.watch('categoryId') ?? CATEGORY_NONE_VALUE}
                onValueChange={(value) => fatwaForm.setValue('categoryId', value === CATEGORY_NONE_VALUE ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.fatwas.placeholders.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CATEGORY_NONE_VALUE}>{t('websiteAdmin.common.none')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-questionText">{t('websiteAdmin.fatwas.fields.question')}</Label>
              <Textarea
                id="edit-questionText"
                {...fatwaForm.register('questionText')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-answerText">{t('websiteAdmin.fatwas.fields.answer')}</Label>
              <Textarea
                id="edit-answerText"
                {...fatwaForm.register('answerText')}
                rows={6}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">{t('websiteAdmin.common.status')}</Label>
                <Select
                  value={fatwaForm.watch('status')}
                  onValueChange={(value) => fatwaForm.setValue('status', value as 'draft' | 'published' | 'archived')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                    <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                    <SelectItem value="archived">{t('websiteAdmin.statuses.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-publishedAt">{t('websiteAdmin.fatwas.fields.publishedAt')}</Label>
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
              <Label htmlFor="edit-isFeatured">{t('websiteAdmin.fatwas.fields.featured')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditFatwa(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateFatwa.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.fatwas.newCategory')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.fatwas.description')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(handleCreateCategory)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">{t('websiteAdmin.fatwas.fields.name')} *</Label>
                <Input id="cat-name" {...categoryForm.register('name')} placeholder={t('websiteAdmin.fatwas.placeholders.categoryName')} />
                {categoryForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">{t('websiteAdmin.common.slug')} *</Label>
                <Input id="cat-slug" {...categoryForm.register('slug')} placeholder={t('websiteAdmin.fatwas.placeholders.categorySlug')} />
                {categoryForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-description">{t('websiteAdmin.fatwas.fields.description')}</Label>
              <Textarea
                id="cat-description"
                {...categoryForm.register('description')}
                placeholder={t('websiteAdmin.fatwas.placeholders.categoryDescription')}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-sortOrder">{t('websiteAdmin.fatwas.fields.sortOrder')}</Label>
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
                <Label htmlFor="cat-isActive">{t('websiteAdmin.fatwas.fields.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createCategory.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.fatwas.editCategoryTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.fatwas.editCategoryDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={categoryForm.handleSubmit(handleUpdateCategory)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-name">{t('websiteAdmin.fatwas.fields.name')} *</Label>
                <Input id="edit-cat-name" {...categoryForm.register('name')} />
                {categoryForm.formState.errors.name && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cat-slug">{t('websiteAdmin.common.slug')} *</Label>
                <Input id="edit-cat-slug" {...categoryForm.register('slug')} />
                {categoryForm.formState.errors.slug && (
                  <p className="text-sm text-destructive">{categoryForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-description">{t('websiteAdmin.fatwas.fields.description')}</Label>
              <Textarea
                id="edit-cat-description"
                {...categoryForm.register('description')}
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cat-sortOrder">{t('websiteAdmin.fatwas.fields.sortOrder')}</Label>
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
                <Label htmlFor="edit-cat-isActive">{t('websiteAdmin.fatwas.fields.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={!!editQuestion} onOpenChange={(open) => !open && setEditQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.fatwas.moderation.title')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.fatwas.moderation.description')}</DialogDescription>
          </DialogHeader>
          {editQuestion && (
            <div className="space-y-4">
              <div className="rounded-md border p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">{t('websiteAdmin.fatwas.moderation.questionLabel')}:</p>
                <p className="text-sm">{editQuestion.questionText}</p>
                {editQuestion.name && !editQuestion.isAnonymous && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('websiteAdmin.fatwas.moderation.submittedBy')}: {editQuestion.name} {editQuestion.email && `(${editQuestion.email})`}
                  </p>
                )}
              </div>
              <form onSubmit={questionForm.handleSubmit(handleUpdateQuestion)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="q-status">{t('websiteAdmin.common.status')}</Label>
                  <Select
                    value={questionForm.watch('status') || ''}
                    onValueChange={(value) => questionForm.setValue('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('websiteAdmin.common.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('websiteAdmin.statuses.pending')}</SelectItem>
                      <SelectItem value="assigned">{t('websiteAdmin.statuses.assigned')}</SelectItem>
                      <SelectItem value="answered">{t('websiteAdmin.statuses.answered')}</SelectItem>
                      <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-assignedTo">{t('websiteAdmin.fatwas.fields.assignedTo')}</Label>
                  <Input
                    id="q-assignedTo"
                    {...questionForm.register('assignedTo')}
                    placeholder={t('websiteAdmin.fatwas.placeholders.assignedTo')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-internalNotes">{t('websiteAdmin.fatwas.fields.internalNotes')}</Label>
                  <Textarea
                    id="q-internalNotes"
                    {...questionForm.register('internalNotes')}
                    placeholder={t('websiteAdmin.fatwas.placeholders.internalNotes')}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-answerDraft">{t('websiteAdmin.fatwas.fields.answerDraft')}</Label>
                  <Textarea
                    id="q-answerDraft"
                    {...questionForm.register('answerDraft')}
                    placeholder={t('websiteAdmin.fatwas.placeholders.answerDraft')}
                    rows={6}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditQuestion(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateQuestion.isPending}>
                    {t('common.update')}
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
            <AlertDialogTitle>
              {deleteType === 'fatwa'
                ? t('websiteAdmin.fatwas.delete.titleFatwa')
                : t('websiteAdmin.fatwas.delete.titleCategory')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'fatwa'
                ? t('websiteAdmin.fatwas.delete.descriptionFatwa')
                : t('websiteAdmin.fatwas.delete.descriptionCategory')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteType === 'fatwa' ? deleteFatwa.isPending : deleteCategory.isPending}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
