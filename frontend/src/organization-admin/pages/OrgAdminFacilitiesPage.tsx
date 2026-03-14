/**
 * Org Admin Facilities – list of managed buildings (mosques, etc.)
 * Create, edit, and detail are shown in dialogs on this page.
 */

import {
  Building2,
  Plus,
  Pencil,
  MoreHorizontal,
  Search,
  MapPin,
  Users,
  Wrench,
  FileText,
  DollarSign,
  LayoutDashboard,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  FacilityDetailDialog,
  type FacilityDetailTab,
} from '@/organization-admin/components/FacilityDetailDialog';
import { FacilityFormDialog } from '@/organization-admin/components/FacilityFormDialog';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useOrgFacilities,
  useOrgFacilityTypes,
} from '@/hooks/useOrgFacilities';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import type { OrgFacility } from '@/types/domain/facility';

export default function OrgAdminFacilitiesPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailFacilityId, setDetailFacilityId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<FacilityDetailTab | null>(null);
  const [editFacilityId, setEditFacilityId] = useState<string | null>(null);

  const openDetail = (id: string, tab: FacilityDetailTab | null = null) => {
    setDetailFacilityId(id);
    setDetailTab(tab);
  };

  const { data: types = [] } = useOrgFacilityTypes();
  const { data: facilities = [], isLoading } = useOrgFacilities({
    facilityTypeId: typeFilter === 'all' ? undefined : typeFilter,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return facilities;
    const q = search.trim().toLowerCase();
    return facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.address?.toLowerCase().includes(q) ?? false) ||
        (f.facilityType?.name.toLowerCase().includes(q) ?? false)
    );
  }, [facilities, search]);

  if (isLoading) {
    return (
      <div className="container mx-auto flex max-w-7xl items-center justify-center overflow-x-hidden p-4 md:p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('organizationAdmin.facilities')}
        description={t('organizationAdmin.facilitiesDesc')}
        icon={<Building2 className="h-5 w-5" />}
        primaryAction={{
          label: t('organizationAdmin.addFacility'),
          onClick: () => setCreateDialogOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      <FilterPanel
        title={t('organizationAdmin.filters')}
        defaultOpenDesktop
        defaultOpenMobile={false}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {t('organizationAdmin.facilityType')}
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('common.status')}</Label>
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('organizationAdmin.searchFacilities')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <CardTitle>{t('organizationAdmin.facilitiesList')}</CardTitle>
          <CardDescription>{t('organizationAdmin.facilitiesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 text-center">
                <p className="font-medium">{t('organizationAdmin.noFacilities')}</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t('organizationAdmin.facilitiesEmptyDesc')}
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="ml-2">{t('organizationAdmin.addFacility')}</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('organizationAdmin.facilityName')}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t('organizationAdmin.facilityType')}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t('organizationAdmin.linkedAccount')}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      {t('organizationAdmin.staffCount')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('organizationAdmin.balance')}
                    </TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f: OrgFacility) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(f.id)}
                    >
                      <TableCell className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            className="text-left font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded px-1 -mx-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetail(f.id);
                            }}
                          >
                            {f.name}
                          </button>
                          {f.city && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {f.city}
                              {f.district ? `, ${f.district}` : ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-3 md:table-cell">
                        {f.facilityType?.name ? (
                          <Badge variant="secondary" className="font-normal">
                            {f.facilityType.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-3 lg:table-cell">
                        <span className="text-sm">
                          {f.financeAccount?.name ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-3 lg:table-cell tabular-nums">
                        {f.facilityStaffCount ?? 0}
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        {f.financeAccount?.currentBalance != null ? (
                          <span
                            className={
                              Number(f.financeAccount.currentBalance) >= 0
                                ? 'text-foreground'
                                : 'text-destructive'
                            }
                          >
                            {formatCurrency(f.financeAccount.currentBalance)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={f.isActive ? 'default' : 'secondary'}
                            className="hidden text-xs sm:inline-flex"
                          >
                            {f.isActive ? t('common.active') : t('common.inactive')}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                aria-label={t('common.actions')}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem onClick={() => openDetail(f.id, 'overview')}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                {t('organizationAdmin.overview')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(f.id, 'staff')}>
                                <Users className="mr-2 h-4 w-4" />
                                {t('organizationAdmin.facilityStaff')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(f.id, 'maintenance')}>
                                <Wrench className="mr-2 h-4 w-4" />
                                {t('organizationAdmin.maintenance')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(f.id, 'documents')}>
                                <FileText className="mr-2 h-4 w-4" />
                                {t('organizationAdmin.documents')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDetail(f.id, 'finance')}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                {t('organizationAdmin.facilityFinance')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditFacilityId(f.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <FacilityFormDialog
        open={createDialogOpen || !!editFacilityId}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditFacilityId(null);
          }
        }}
        facilityId={editFacilityId ?? undefined}
        onSuccess={(facility) => {
          void queryClient.invalidateQueries({ queryKey: ['org-facilities'] });
          setCreateDialogOpen(false);
          setEditFacilityId(null);
          openDetail(facility.id);
        }}
      />

      <FacilityDetailDialog
        open={!!detailFacilityId}
        onOpenChange={(open) => {
          if (!open) {
            setDetailFacilityId(null);
            setDetailTab(null);
          }
        }}
        facilityId={detailFacilityId}
        initialTab={detailTab}
        onEdit={(id) => setEditFacilityId(id)}
      />
    </div>
  );
}
