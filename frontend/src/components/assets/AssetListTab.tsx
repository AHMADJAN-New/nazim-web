import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useHasPermission } from '@/hooks/usePermissions';
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

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  assetTag: z.string().min(1, 'Asset tag is required'),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired', 'lost', 'disposed']).default('available'),
  category: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  purchasePrice: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : Number(val))),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  buildingId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function AssetListTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

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
  const { rooms } = useRooms(undefined, undefined, true);
  const { data: categories } = useAssetCategories();

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: 'available',
      purchasePrice: null,
    },
  });

  const openCreate = () => {
    setEditingAsset(null);
    reset({
      name: '',
      assetTag: '',
      status: 'available',
      category: '',
      categoryId: null,
      purchasePrice: null,
      purchaseDate: null,
      warrantyExpiry: null,
      vendor: '',
      notes: '',
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
      categoryId: asset.categoryId || null,
      serialNumber: asset.serialNumber || '',
      purchasePrice: asset.purchasePrice ?? null,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : null,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
      vendor: asset.vendor || '',
      notes: asset.notes || '',
      schoolId: asset.schoolId || undefined,
      buildingId: asset.buildingId || undefined,
      roomId: asset.roomId || undefined,
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
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : null,
      warrantyExpiry: values.warrantyExpiry ? new Date(values.warrantyExpiry) : null,
      vendor: values.vendor || null,
      notes: values.notes || null,
      schoolId: values.schoolId || null,
      buildingId: values.buildingId || null,
      roomId: values.roomId || null,
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
              {pagination && <DataTablePagination table={table} pagination={pagination} />}
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
                <Label>Purchase Price</Label>
                <Input type="number" step="0.01" {...register('purchasePrice')} />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" {...register('purchaseDate')} />
              </div>
              <div>
                <Label>Warranty Expiry</Label>
                <Input type="date" {...register('warrantyExpiry')} />
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
                  onValueChange={(value) => setValue('buildingId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
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
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
}

