import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFundTypes, useCreateFundType, useUpdateFundType, useDeleteFundType } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { fundTypeSchema } from '@/lib/finance/schemas';
import type { FundType } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, HandCoins } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FundTypeFormData = z.infer<typeof fundTypeSchema>;

export function FundTypesPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.fund_types.create');
  const hasUpdatePermission = useHasPermission('finance.fund_types.update');
  const hasDeletePermission = useHasPermission('finance.fund_types.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFundType, setSelectedFundType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: fundTypes, isLoading } = useFundTypes();
  const createFundType = useCreateFundType();
  const updateFundType = useUpdateFundType();
  const deleteFundType = useDeleteFundType();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FundTypeFormData>({
    resolver: zodResolver(fundTypeSchema),
    defaultValues: {
      is_restricted: false,
      is_islamic_fund: false,
      is_zakat_eligible: false,
      is_sadaqah: false,
      is_waqf: false,
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');
  const isRestrictedValue = watch('is_restricted');
  const isIslamicFundValue = watch('is_islamic_fund');
  const isZakatEligibleValue = watch('is_zakat_eligible');
  const isSadaqahValue = watch('is_sadaqah');
  const isWaqfValue = watch('is_waqf');

  const filteredFundTypes = useMemo(() => {
    if (!fundTypes) return [];
    return fundTypes.filter((ft) =>
      ft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ft.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [fundTypes, searchQuery]);

  const handleOpenDialog = (fundTypeId?: string) => {
    if (fundTypeId) {
      const ft = fundTypes?.find((f) => f.id === fundTypeId);
      if (ft) {
        reset({
          code: ft.code,
          name: ft.name,
          name_arabic: ft.name_arabic || '',
          name_pashto: ft.name_pashto || '',
          description: ft.description || '',
          is_restricted: ft.is_restricted,
          is_islamic_fund: ft.is_islamic_fund,
          is_zakat_eligible: ft.is_zakat_eligible,
          is_sadaqah: ft.is_sadaqah,
          is_waqf: ft.is_waqf,
          restrictions_description: ft.restrictions_description || '',
          is_active: ft.is_active,
          sort_order: ft.sort_order,
        });
        setSelectedFundType(fundTypeId);
      }
    } else {
      reset({
        code: '',
        name: '',
        name_arabic: '',
        name_pashto: '',
        description: '',
        is_restricted: false,
        is_islamic_fund: false,
        is_zakat_eligible: false,
        is_sadaqah: false,
        is_waqf: false,
        restrictions_description: '',
        is_active: true,
        sort_order: 100,
      });
      setSelectedFundType(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedFundType(null);
    reset();
  };

  const onSubmit = (data: FundTypeFormData) => {
    if (selectedFundType) {
      updateFundType.mutate(
        { id: selectedFundType, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createFundType.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedFundType) {
      deleteFundType.mutate(selectedFundType, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedFundType(null);
        },
      });
    }
  };

  const isGlobal = (ft: FundType) => ft.organization_id === null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HandCoins className="h-5 w-5" />
                Fund Types
              </CardTitle>
              <CardDescription>
                Manage fund types including Islamic funds (Zakat, Sadaqah, Waqf)
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fund Type
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fund types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredFundTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No fund types found matching your search.' : 'No fund types found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFundTypes.map((ft) => (
                    <TableRow key={ft.id}>
                      <TableCell className="font-mono font-medium">{ft.code}</TableCell>
                      <TableCell>{ft.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {ft.is_restricted && <Badge variant="secondary">Restricted</Badge>}
                          {ft.is_islamic_fund && <Badge variant="default">Islamic</Badge>}
                          {ft.is_zakat_eligible && <Badge className="bg-green-600">Zakat</Badge>}
                          {ft.is_sadaqah && <Badge className="bg-blue-600">Sadaqah</Badge>}
                          {ft.is_waqf && <Badge className="bg-purple-600">Waqf</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {ft.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobal(ft) ? (
                          <Badge variant="outline">Global</Badge>
                        ) : (
                          <Badge>Organization</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasUpdatePermission && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(ft.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !isGlobal(ft) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedFundType(ft.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFundType ? 'Edit Fund Type' : 'Add Fund Type'}
            </DialogTitle>
            <DialogDescription>
              {selectedFundType
                ? 'Update the fund type details below.'
                : 'Fill in the details to create a new fund type.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="islamic">Islamic Fund</TabsTrigger>
                <TabsTrigger value="translations">Translations</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      {...register('code')}
                      placeholder="FUND-ZAKAT"
                      maxLength={50}
                    />
                    {errors.code && (
                      <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Zakat Fund"
                      maxLength={150}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Optional description"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restrictions_description">Restrictions (if any)</Label>
                  <Textarea
                    id="restrictions_description"
                    {...register('restrictions_description')}
                    placeholder="Describe fund usage restrictions..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    {...register('sort_order', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_restricted"
                      checked={isRestrictedValue}
                      onCheckedChange={(checked) => setValue('is_restricted', checked)}
                    />
                    <Label htmlFor="is_restricted">Restricted Fund</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={isActiveValue}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="islamic" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_islamic_fund"
                      checked={isIslamicFundValue}
                      onCheckedChange={(checked) => setValue('is_islamic_fund', checked)}
                    />
                    <Label htmlFor="is_islamic_fund">Islamic Fund</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_zakat_eligible"
                      checked={isZakatEligibleValue}
                      onCheckedChange={(checked) => setValue('is_zakat_eligible', checked)}
                    />
                    <Label htmlFor="is_zakat_eligible">Zakat Eligible</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_sadaqah"
                      checked={isSadaqahValue}
                      onCheckedChange={(checked) => setValue('is_sadaqah', checked)}
                    />
                    <Label htmlFor="is_sadaqah">Sadaqah (Voluntary Charity)</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_waqf"
                      checked={isWaqfValue}
                      onCheckedChange={(checked) => setValue('is_waqf', checked)}
                    />
                    <Label htmlFor="is_waqf">Waqf (Endowment)</Label>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Islamic Fund Types:</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Zakat:</strong> Obligatory charity (2.5% of wealth)</li>
                    <li><strong>Sadaqah:</strong> Voluntary charity</li>
                    <li><strong>Waqf:</strong> Permanent endowment (principal preserved)</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="translations" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name_arabic">Name (Arabic)</Label>
                  <Input
                    id="name_arabic"
                    {...register('name_arabic')}
                    placeholder="الاسم بالعربية"
                    maxLength={150}
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_pashto">Name (Pashto)</Label>
                  <Input
                    id="name_pashto"
                    {...register('name_pashto')}
                    placeholder="په پښتو نوم"
                    maxLength={150}
                    dir="rtl"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFundType.isPending || updateFundType.isPending}
              >
                {selectedFundType ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the fund type. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFundType(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
