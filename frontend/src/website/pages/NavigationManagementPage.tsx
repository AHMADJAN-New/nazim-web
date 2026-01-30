import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ListChecks, Search, GripVertical } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
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
  useWebsiteMenus,
  useCreateWebsiteMenu,
  useUpdateWebsiteMenu,
  useDeleteWebsiteMenu,
  useWebsitePages,
  type WebsiteMenu,
} from '@/website/hooks/useWebsiteManager';
import { buildMenuTree } from '@/mappers/websiteMenuMapper';

const menuSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  url: z.string().min(1, 'URL is required').max(500),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isVisible: z.boolean().default(true),
});

type MenuFormData = z.infer<typeof menuSchema>;

export default function NavigationManagementPage() {
  const { t } = useLanguage();
  const { data: menus = [], isLoading } = useWebsiteMenus();
  const { data: pages = [] } = useWebsitePages();
  const createMenu = useCreateWebsiteMenu();
  const updateMenu = useUpdateWebsiteMenu();
  const deleteMenu = useDeleteWebsiteMenu();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editMenu, setEditMenu] = useState<WebsiteMenu | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<MenuFormData>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      label: '',
      url: '',
      parentId: null,
      sortOrder: 0,
      isVisible: true,
    },
  });

  const menuTree = useMemo(() => buildMenuTree(menus), [menus]);

  const filteredMenus = useMemo(() => {
    return menus.filter((menu) => {
      return menu.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menu.url.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [menus, searchQuery]);

  const handleCreate = async (data: MenuFormData) => {
    await createMenu.mutateAsync({
      label: data.label,
      url: data.url,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
      isVisible: data.isVisible,
    });
    setIsCreateOpen(false);
    form.reset();
  };

  const handleUpdate = async (data: MenuFormData) => {
    if (!editMenu) return;
    await updateMenu.mutateAsync({
      id: editMenu.id,
      label: data.label,
      url: data.url,
      parentId: data.parentId,
      sortOrder: data.sortOrder,
      isVisible: data.isVisible,
    });
    setEditMenu(null);
    form.reset();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMenu.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const openEditDialog = (menu: WebsiteMenu) => {
    setEditMenu(menu);
    form.reset({
      label: menu.label,
      url: menu.url,
      parentId: menu.parentId,
      sortOrder: menu.sortOrder,
      isVisible: menu.isVisible ?? true,
    });
  };

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
        title={t('websiteAdmin.navigation.title')}
        description={t('websiteAdmin.navigation.description')}
        icon={<ListChecks className="h-5 w-5" />}
        primaryAction={{
          label: t('websiteAdmin.navigation.new'),
          onClick: () => {
            form.reset();
            setIsCreateOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="space-y-2">
          <Label>{t('websiteAdmin.common.search')}</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('websiteAdmin.navigation.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </FilterPanel>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t('websiteAdmin.navigation.fields.label')}</TableHead>
                <TableHead>{t('websiteAdmin.common.url')}</TableHead>
                <TableHead>{t('websiteAdmin.common.parent')}</TableHead>
                <TableHead>{t('websiteAdmin.navigation.fields.order')}</TableHead>
                <TableHead>{t('websiteAdmin.common.visible')}</TableHead>
                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMenus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {t('websiteAdmin.navigation.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMenus.map((menu) => {
                  const parent = menus.find(m => m.id === menu.parentId);
                  return (
                    <TableRow key={menu.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{menu.label}</TableCell>
                      <TableCell className="text-muted-foreground">{menu.url}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {parent ? parent.label : '-'}
                      </TableCell>
                      <TableCell>{menu.sortOrder ?? 0}</TableCell>
                      <TableCell>
                        {menu.isVisible ? (
                          <span className="text-green-600">{t('websiteAdmin.common.yes')}</span>
                        ) : (
                          <span className="text-muted-foreground">{t('websiteAdmin.common.no')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(menu)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(menu.id)}
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.navigation.createTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.navigation.createDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('websiteAdmin.navigation.fields.linkToPage')}</Label>
              <Select onValueChange={(pageId) => {
                const page = pages.find(p => p.id === pageId);
                if (page) {
                  form.setValue('url', `/${page.slug}`);
                  if (!form.getValues('label')) {
                    form.setValue('label', page.title);
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.navigation.placeholders.selectPage')} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">{t('websiteAdmin.navigation.fields.label')} *</Label>
              <Input id="label" {...form.register('label')} placeholder={t('websiteAdmin.navigation.placeholders.label')} />
              {form.formState.errors.label && (
                <p className="text-sm text-destructive">{form.formState.errors.label.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">{t('websiteAdmin.common.url')} *</Label>
              <Input id="url" {...form.register('url')} placeholder={t('websiteAdmin.navigation.placeholders.url')} />
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">{t('websiteAdmin.navigation.fields.parentMenu')}</Label>
              <Select
                value={form.watch('parentId') || 'none'}
                onValueChange={(value) => form.setValue('parentId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.navigation.placeholders.parentNone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('websiteAdmin.navigation.placeholders.parentNone')}</SelectItem>
                  {menus.filter(m => !m.parentId).map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">{t('websiteAdmin.navigation.fields.sortOrder')}</Label>
              <Input
                id="sortOrder"
                type="number"
                {...form.register('sortOrder', { valueAsNumber: true })}
                defaultValue={0}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isVisible"
                checked={form.watch('isVisible')}
                onCheckedChange={(checked) => form.setValue('isVisible', checked)}
              />
              <Label htmlFor="isVisible">{t('websiteAdmin.common.visible')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMenu.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMenu} onOpenChange={(open) => !open && setEditMenu(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('websiteAdmin.navigation.editTitle')}</DialogTitle>
            <DialogDescription>{t('websiteAdmin.navigation.editDescription')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('websiteAdmin.navigation.fields.linkToPage')}</Label>
              <Select onValueChange={(pageId) => {
                const page = pages.find(p => p.id === pageId);
                if (page) {
                  form.setValue('url', `/${page.slug}`);
                  if (!form.getValues('label')) {
                    form.setValue('label', page.title);
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.navigation.placeholders.selectPage')} />
                </SelectTrigger>
                <SelectContent>
                  {pages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">{t('websiteAdmin.navigation.fields.label')} *</Label>
              <Input id="edit-label" {...form.register('label')} />
              {form.formState.errors.label && (
                <p className="text-sm text-destructive">{form.formState.errors.label.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url">{t('websiteAdmin.common.url')} *</Label>
              <Input id="edit-url" {...form.register('url')} />
              {form.formState.errors.url && (
                <p className="text-sm text-destructive">{form.formState.errors.url.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parentId">{t('websiteAdmin.navigation.fields.parentMenu')}</Label>
              <Select
                value={form.watch('parentId') || 'none'}
                onValueChange={(value) => form.setValue('parentId', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('websiteAdmin.navigation.placeholders.parentNone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('websiteAdmin.navigation.placeholders.parentNone')}</SelectItem>
                  {menus.filter(m => !m.parentId && m.id !== editMenu?.id).map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sortOrder">{t('websiteAdmin.navigation.fields.sortOrder')}</Label>
              <Input
                id="edit-sortOrder"
                type="number"
                {...form.register('sortOrder', { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isVisible"
                checked={form.watch('isVisible')}
                onCheckedChange={(checked) => form.setValue('isVisible', checked)}
              />
              <Label htmlFor="edit-isVisible">{t('websiteAdmin.common.visible')}</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMenu(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateMenu.isPending}>
                {t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('websiteAdmin.navigation.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('websiteAdmin.navigation.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMenu.isPending}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

