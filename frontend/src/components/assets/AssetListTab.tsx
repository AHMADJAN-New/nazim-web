import { useState, useMemo } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Printer, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAssetStats,
} from '@/hooks/useAssets';
import { useSchools } from '@/hooks/useSchools';
import { useBuildings } from '@/hooks/useBuildings';
import { useRooms } from '@/hooks/useRooms';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { useStaff } from '@/hooks/useStaff';
import { useStudents } from '@/hooks/useStudents';
import { useHasPermission } from '@/hooks/usePermissions';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useCurrencies } from '@/hooks/useCurrencies';
import type { Asset } from '@/types/domain/asset';
import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef, flexRender } from '@tanstack/react-table';
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
import { toast } from 'sonner';
import { format } from 'date-fns';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  assetTag: z.string().min(1, 'Asset tag is required'),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired', 'lost', 'disposed']).default('available'),
  category: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  purchasePrice: z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === '' || val === undefined || val === null) return false;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num > 0;
    }, 'Purchase price is required and must be greater than 0')
    .transform((val) => (val === '' || val === undefined || val === null ? null : Number(val))),
  totalCopies: z
    .union([z.number(), z.string()])
    .optional()
    .default(1)
    .transform((val) => (val === '' || val === undefined ? 1 : Number(val))),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  warrantyExpiry: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  buildingId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  currencyId: z.string().optional().nullable(),
  financeAccountId: z.string().min(1, 'Finance account is required'),
  notes: z.string().optional().nullable(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function AssetListTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewPanelOpen, setIsViewPanelOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);

  const canCreate = useHasPermission('assets.create');
  const canUpdate = useHasPermission('assets.update');
  const canDelete = useHasPermission('assets.delete');

  const {
    assets = [],
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useAssets(
    {
      search,
      status: statusFilter,
    },
    true
  );

  const { data: stats } = useAssetStats();
  const { data: schools } = useSchools();
  const { data: buildings } = useBuildings();
  const { rooms: allRooms } = useRooms(undefined, undefined, true);
  const { data: categories } = useAssetCategories();
  const { data: financeAccounts } = useFinanceAccounts({ isActive: true });
  const { data: currencies } = useCurrencies({ isActive: true });
  
  // Get all assets with assignments for history (like LibraryBooks uses loans)
  const { assets: allAssets = [] } = useAssets(undefined, false);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: 'available',
      purchasePrice: null,
    },
  });

  // Filter rooms by selected building (if building is selected, show only rooms from that building)
  // Must be after useForm hook to access watch
  const selectedBuildingId = watch('buildingId');
  const rooms = useMemo(() => {
    if (!allRooms) return [];
    // If building is selected, filter rooms to that building only
    if (selectedBuildingId) {
      return allRooms.filter((room) => room.buildingId === selectedBuildingId);
    }
    // If no building selected, show all rooms (user can select room without building)
    return allRooms;
  }, [allRooms, selectedBuildingId]);

  const openCreate = () => {
    setEditingAsset(null);
    reset({
      name: '',
      assetTag: '',
      status: 'available',
      category: '',
      categoryId: null,
      purchasePrice: null,
      totalCopies: 1,
      purchaseDate: '',
      warrantyExpiry: null,
      vendor: '',
      notes: '',
      currencyId: null,
      financeAccountId: '',
    });
    setIsDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    reset({
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      category: asset.category || '',
      categoryId: asset.categoryId || null,
      serialNumber: asset.serialNumber || '',
      purchasePrice: asset.purchasePrice ?? null,
      totalCopies: asset.totalCopies ?? 1,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : null,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
      vendor: asset.vendor || '',
      notes: asset.notes || '',
      schoolId: asset.schoolId || undefined,
      buildingId: asset.buildingId || undefined,
      roomId: asset.roomId || undefined,
      currencyId: asset.currencyId || undefined,
      financeAccountId: asset.financeAccountId || undefined,
    });
    setIsDialogOpen(true);
  };

  const openDelete = (asset: Asset) => {
    setAssetToDelete(asset);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitAsset = (values: AssetFormValues) => {
    const payload: Partial<Asset> = {
      name: values.name,
      assetTag: values.assetTag,
      status: values.status,
      category: values.category || null,
      categoryId: values.categoryId || null,
      serialNumber: values.serialNumber || null,
      purchasePrice: values.purchasePrice === null ? null : Number(values.purchasePrice),
      totalCopies: values.totalCopies ?? 1,
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : null,
      warrantyExpiry: values.warrantyExpiry ? new Date(values.warrantyExpiry) : null,
      vendor: values.vendor || null,
      notes: values.notes || null,
      schoolId: values.schoolId || null,
      buildingId: values.buildingId || null,
      roomId: values.roomId || null,
      currencyId: values.currencyId || null,
      financeAccountId: values.financeAccountId || null,
    };

    if (editingAsset) {
      updateAsset.mutate({ id: editingAsset.id, data: payload }, { onSuccess: () => setIsDialogOpen(false) });
    } else {
      createAsset.mutate(payload, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  const handleDelete = () => {
    if (assetToDelete) {
      deleteAsset.mutate(assetToDelete.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setAssetToDelete(null);
        },
      });
    }
  };

  const handlePrintLabel = (asset: Asset) => {
    // Generate auto number (timestamp-based unique identifier)
    const autoNumber = `LBL-${Date.now().toString(36).toUpperCase()}-${asset.id.substring(0, 8).toUpperCase()}`;
    
    // Create QR code data (asset ID and tag for scanning)
    const qrData = JSON.stringify({
      assetId: asset.id,
      assetTag: asset.assetTag,
      autoNumber: autoNumber,
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    
    // Create a hidden iframe in the current page
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    
    document.body.appendChild(iframe);
    
    // Write the label HTML to the iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      toast.error('Failed to create print preview');
      document.body.removeChild(iframe);
      return;
    }
    
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label - ${asset.assetTag}</title>
          <style>
            @media print {
              @page {
                size: 3in 2in;
                margin: 0.1in;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 8px;
              width: 3in;
              height: 2in;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              border: 2px solid #000;
              box-sizing: border-box;
            }
            .header {
              text-align: center;
              width: 100%;
              border-bottom: 1px solid #ccc;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .asset-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            .asset-tag {
              font-size: 12px;
              color: #666;
              margin-bottom: 2px;
            }
            .auto-number {
              font-size: 10px;
              color: #999;
            }
            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin: 4px 0;
            }
            .qr-code {
              width: 120px;
              height: 120px;
              border: 1px solid #ddd;
            }
            .footer {
              text-align: center;
              width: 100%;
              font-size: 9px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 4px;
              margin-top: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="asset-name">${asset.name}</div>
            <div class="asset-tag">Tag: ${asset.assetTag}</div>
            <div class="auto-number">Label #: ${autoNumber}</div>
          </div>
          <div class="qr-container">
            <img src="${qrUrl}" alt="QR Code" class="qr-code" />
          </div>
          <div class="footer">
            Scan QR code for asset details
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    // Wait for iframe content to load, then trigger print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          // Trigger print dialog
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
          
          // Clean up after a delay (user might cancel print)
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error printing label:', error);
          }
          toast.error('Failed to print label');
          // Clean up on error
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }
      }, 500);
    };
    
    // Handle load error
    iframe.onerror = () => {
      toast.error('Failed to load print preview');
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    };
  };

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Asset',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">Tag: {row.original.assetTag}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.status;
          let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
          let className = '';
          
          if (status === 'available') {
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white';
          } else if (status === 'assigned') {
            variant = 'default';
            className = 'bg-blue-500 hover:bg-blue-600 text-white';
          } else if (status === 'maintenance') {
            variant = 'default';
            className = 'bg-yellow-500 hover:bg-yellow-600 text-white';
          } else if (status === 'retired') {
            variant = 'secondary';
          } else if (status === 'lost' || status === 'disposed') {
            variant = 'destructive';
          }
          
          return (
            <Badge variant={variant} className={className}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'purchasePrice',
        header: 'Value',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.purchasePrice ? `$${row.original.purchasePrice.toFixed(2)}` : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'copies',
        header: 'Copies',
        cell: ({ row }) => {
          const asset = row.original;
          const totalCopies = asset.totalCopiesCount ?? asset.totalCopies ?? 1;
          const availableCopies = asset.availableCopiesCount ?? 0;
          const assignedCopies = totalCopies - availableCopies;
          return (
            <div className="flex items-center gap-2">
              <Badge variant={availableCopies === 0 ? "secondary" : "outline"}>
                Available: {availableCopies === 0 ? "No available copies" : availableCopies}
              </Badge>
              <Badge variant="secondary">
                Total: {totalCopies}
              </Badge>
              {assignedCopies > 0 && (
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
                  Assigned: {assignedCopies}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.roomNumber && <div>Room: {row.original.roomNumber}</div>}
            {!row.original.roomNumber && row.original.buildingName && <div>Building: {row.original.buildingName}</div>}
            {!row.original.roomNumber && !row.original.buildingName && row.original.schoolName && (
              <div>School: {row.original.schoolName}</div>
            )}
            {!row.original.roomNumber && !row.original.buildingName && !row.original.schoolName && <div>Unassigned</div>}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setViewAsset(row.original); setIsViewPanelOpen(true); }} title="View Details">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handlePrintLabel(row.original)} title="Print Label">
              <Printer className="h-4 w-4" />
            </Button>
            {canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => openDelete(row.original)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate]
  );

  const { table } = useDataTable({
    data: assets as Asset[],
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-2xl">{stats?.asset_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchase Value</CardDescription>
            <CardTitle className="text-2xl">
              ${((stats?.total_purchase_value ?? 0) as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Maintenance Spend</CardDescription>
            <CardTitle className="text-2xl">
              ${((stats?.maintenance_cost_total ?? 0) as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl">{stats?.status_counts?.available ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          <div className="flex-1 min-w-[240px]">
            <Input
              placeholder="Search assets by name, tag, or serial"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="disposed">Disposed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Asset
          </Button>
        )}
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Manage and track all assets in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                        No assets found
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataTablePagination 
                table={table} 
                paginationMeta={pagination ?? null}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Update Asset' : 'Create Asset'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitAsset)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Name *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Asset Tag *</Label>
                <Input {...register('assetTag')} />
                {errors.assetTag && <p className="text-sm text-destructive">{errors.assetTag.message}</p>}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={watch('status') || 'available'} onValueChange={(value) => setValue('status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={watch('categoryId') || 'none'}
                  onValueChange={(value) => {
                    setValue('categoryId', value === 'none' ? null : value);
                    // Also set category name for backward compatibility
                    const selectedCategory = categories?.find((cat) => cat.id === value);
                    setValue('category', selectedCategory?.name || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories
                      ?.filter((cat) => cat.is_active)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input {...register('serialNumber')} />
              </div>
              <div>
                <Label>
                  Purchase Price <span className="text-destructive">*</span>
                </Label>
                <Input type="number" step="0.01" {...register('purchasePrice')} />
                {errors.purchasePrice && (
                  <p className="text-sm text-destructive mt-1">{errors.purchasePrice.message}</p>
                )}
              </div>
              <div>
                <Label>Number of Copies</Label>
                <Input type="number" min="1" step="1" defaultValue={1} {...register('totalCopies')} />
                <p className="text-xs text-muted-foreground mt-1">Number of identical copies of this asset</p>
              </div>
              <div>
                <Label>
                  Purchase Date <span className="text-destructive">*</span>
                </Label>
                <CalendarFormField control={form.control} name="purchaseDate" label="Number of Copies" />
                {errors.purchaseDate && (
                  <p className="text-sm text-destructive mt-1">{errors.purchaseDate.message}</p>
                )}
              </div>
              <div>
                <Label>Warranty Expiry</Label>
                <CalendarFormField control={form.control} name="warrantyExpiry" label="Warranty Expiry" />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input {...register('vendor')} />
              </div>
              <div>
                <Label>School</Label>
                <Select
                  value={watch('schoolId') || 'none'}
                  onValueChange={(value) => setValue('schoolId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Building</Label>
                <Select
                  value={watch('buildingId') || 'none'}
                  onValueChange={(value) => {
                    const newBuildingId = value === 'none' ? undefined : value;
                    const currentRoomId = watch('roomId');
                    
                    setValue('buildingId', newBuildingId);
                    
                    // If building changed and room is selected, check if room belongs to new building
                    if (currentRoomId && newBuildingId) {
                      const currentRoom = allRooms?.find((r) => r.id === currentRoomId);
                      if (currentRoom && currentRoom.buildingId !== newBuildingId) {
                        // Room doesn't belong to new building, clear it
                        setValue('roomId', undefined);
                      }
                    } else if (newBuildingId === undefined) {
                      // Building cleared, keep room (room can exist without building)
                      // Don't clear room
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {buildings?.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.buildingName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room</Label>
                <Select
                  value={watch('roomId') || 'none'}
                  onValueChange={(value) => setValue('roomId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomNumber} {room.buildingName ? `(${room.buildingName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBuildingId && rooms && rooms.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No rooms available for this building</p>
                )}
                {selectedBuildingId && rooms && rooms.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Showing rooms from selected building</p>
                )}
                {!selectedBuildingId && (
                  <p className="text-xs text-muted-foreground mt-1">Select a building to filter rooms, or select any room</p>
                )}
              </div>
              <div>
                <Label>
                  Finance Account <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="financeAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-select currency from account if account has currency
                        if (value && financeAccounts) {
                          const account = financeAccounts.find((acc) => acc.id === value);
                          if (account?.currencyId) {
                            setValue('currencyId', account.currencyId);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className={errors.financeAccountId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select finance account" />
                      </SelectTrigger>
                      <SelectContent>
                        {financeAccounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} {account.code ? `(${account.code})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.financeAccountId && (
                  <p className="text-sm text-destructive mt-1">{errors.financeAccountId.message}</p>
                )}
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={watch('currencyId') || 'none'}
                  onValueChange={(value) => setValue('currencyId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {currencies?.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Currency for purchase price. Auto-selected from finance account if available.
                </p>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={(editingAsset ? updateAsset.isPending : createAsset.isPending) || !canUpdate}>
                {editingAsset ? 'Update' : 'Create'}
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
              This will permanently delete the asset "{assetToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Asset View Panel */}
      <Sheet open={isViewPanelOpen} onOpenChange={setIsViewPanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {viewAsset && (
            <>
              <SheetHeader>
                <SheetTitle>{viewAsset.name}</SheetTitle>
                <SheetDescription>
                  {viewAsset.assetTag && `Tag: ${viewAsset.assetTag}`}
                  {viewAsset.categoryName && ` • ${viewAsset.categoryName}`}
                </SheetDescription>
              </SheetHeader>
              
              <Tabs defaultValue="info" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Asset Information</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                
                <TabsContent value="info" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Name</Label>
                          <p className="font-medium">{viewAsset.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Asset Tag</Label>
                          <p className="font-medium">{viewAsset.assetTag || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Category</Label>
                          <p className="font-medium">{viewAsset.categoryName || viewAsset.category || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Serial Number</Label>
                          <p className="font-medium">{viewAsset.serialNumber || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <div className="font-medium">
                            <Badge variant={viewAsset.status === 'available' ? 'default' : 'secondary'}>
                              {viewAsset.status}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Condition</Label>
                          <p className="font-medium">{viewAsset.condition || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Purchase Price</Label>
                          <p className="font-medium">
                            {viewAsset.purchasePrice ? `$${viewAsset.purchasePrice.toFixed(2)}` : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Purchase Date</Label>
                          <p className="font-medium">
                            {viewAsset.purchaseDate ? format(viewAsset.purchaseDate, 'MMM dd, yyyy') : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Vendor</Label>
                          <p className="font-medium">{viewAsset.vendor || '—'}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Warranty Expiry</Label>
                          <p className="font-medium">
                            {viewAsset.warrantyExpiry ? format(viewAsset.warrantyExpiry, 'MMM dd, yyyy') : '—'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Total Copies</Label>
                          <p className="font-medium">{viewAsset.totalCopiesCount ?? viewAsset.totalCopies ?? 1}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Available Copies</Label>
                          <p className="font-medium">
                            {viewAsset.availableCopiesCount === 0 ? "No available copies" : (viewAsset.availableCopiesCount ?? 0)}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Location</Label>
                          <p className="font-medium">
                            {viewAsset.roomNumber ? `Room: ${viewAsset.roomNumber}` :
                             viewAsset.buildingName ? `Building: ${viewAsset.buildingName}` :
                             viewAsset.schoolName ? `School: ${viewAsset.schoolName}` : 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      {viewAsset.notes && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground">Notes</Label>
                          <p className="mt-1 text-sm">{viewAsset.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {Array.isArray(viewAsset.copies) && viewAsset.copies.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Copies ({viewAsset.copies.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {viewAsset.copies.map((copy, index) => (
                            <div key={copy.id || `copy-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                              <div>
                                <p className="font-medium">Copy {index + 1}</p>
                                {copy.copyCode && (
                                  <p className="text-sm text-muted-foreground">Code: {copy.copyCode}</p>
                                )}
                              </div>
                              <Badge variant={copy.status === 'available' ? 'default' : 'secondary'}>
                                {copy.status || 'unknown'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="space-y-4 mt-4">
                  <AssetHistoryPanel assetId={viewAsset.id} allAssets={allAssets} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Asset History Panel Component
function AssetHistoryPanel({ assetId, allAssets }: { assetId: string; allAssets: Asset[] }) {
  const { data: staff } = useStaff();
  const { data: students } = useStudents();
  const { rooms } = useRooms(undefined, undefined, true);
  
  const assetAssignments = useMemo(() => {
    const asset = allAssets.find(a => a.id === assetId);
    if (!asset || !asset.assignments || asset.assignments.length === 0) return [];
    
    return asset.assignments
      .sort((a, b) => {
        const dateA = a.assignedOn ? new Date(a.assignedOn).getTime() : 0;
        const dateB = b.assignedOn ? new Date(b.assignedOn).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
  }, [allAssets, assetId]);
  
  if (assetAssignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No assignment history found for this asset.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment History ({assetAssignments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assetAssignments.map((assignment, index) => {
            const assignee = assignment.assignedToType === 'staff'
              ? (Array.isArray(staff) ? staff.find((s) => s.id === assignment.assignedToId) : null)
              : assignment.assignedToType === 'student'
              ? (Array.isArray(students) ? students.find((s) => s.id === assignment.assignedToId) : null)
              : assignment.assignedToType === 'room'
              ? (Array.isArray(rooms) ? rooms.find((r) => r.id === assignment.assignedToId) : null)
              : null;
            
            const assigneeName = assignee
              ? ('fullName' in assignee ? assignee.fullName : 'name' in assignee ? assignee.name : 'roomNumber' in assignee ? `Room ${assignee.roomNumber}` : 'Unknown')
              : 'Unknown';
            
            const isReturned = assignment.status === 'returned';
            const isOverdue = !isReturned && assignment.expectedReturnDate && new Date(assignment.expectedReturnDate) < new Date();
            
            return (
              <div key={assignment.id || `assignment-${index}`} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isReturned ? 'secondary' : isOverdue ? 'destructive' : 'default'}>
                      {isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Active'}
                    </Badge>
                    {assignment.assetCopy && (
                      <Badge variant="outline">
                        {assignment.assetCopy.copyCode || assignment.assetCopy.id || 'N/A'}
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {assignment.assignedOn ? formatDate(assignment.assignedOn) : 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Assigned To</Label>
                    <p className="font-medium">{assigneeName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {assignment.assignedToType}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expected Return</Label>
                    <p className="font-medium">
                      {assignment.expectedReturnDate ? formatDate(assignment.expectedReturnDate) : 'N/A'}
                    </p>
                  </div>
                  {isReturned && assignment.returnedAt && (
                    <div>
                      <Label className="text-muted-foreground">Returned Date</Label>
                      <p className="font-medium">
                        {formatDate(assignment.returnedAt)}
                      </p>
                    </div>
                  )}
                </div>
                {assignment.notes && (
                  <div className="mt-2">
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm">{assignment.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

