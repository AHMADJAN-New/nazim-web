import { Search, UserRound, Eye } from 'lucide-react';
import { useState, useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOrgHrStaff } from '@/hooks/orgHr/useOrgHr';
import type { OrgHrStaff } from '@/types/domain/orgHr';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active': return 'default';
    case 'inactive': return 'secondary';
    case 'on_leave': return 'outline';
    case 'terminated':
    case 'suspended': return 'destructive';
    default: return 'secondary';
  }
};

export default function OrganizationHrStaffPage() {
  const { t, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<OrgHrStaff | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { data: schools } = useSchools();

  const { data, isLoading } = useOrgHrStaff({
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    schoolId: schoolFilter !== 'all' ? schoolFilter : undefined,
  });

  const staffList = useMemo(() => data?.data ?? [], [data]);

  const handleViewStaff = (staff: OrgHrStaff) => {
    setSelectedStaff(staff);
    setDetailOpen(true);
  };

  const schoolName = (schoolId: string | null) => {
    if (!schoolId || !schools) return '—';
    const school = (schools as { id: string; name?: string; school_name?: string }[])
      .find(s => s.id === schoolId);
    return school?.name || school?.school_name || schoolId.slice(0, 8);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.staffMaster')}
        description={t('organizationHr.staffMasterPageDesc')}
        icon={<UserRound className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/org-admin/hr' },
          { label: t('organizationHr.staffMaster') },
        ]}
      />

      <FilterPanel title={t('organizationHr.filters')} defaultOpenDesktop defaultOpenMobile={false}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <div className="relative">
            <Search className={`absolute top-2.5 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('organizationHr.searchStaff')}
              className={isRTL ? 'pr-9' : 'pl-9'}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('organizationHr.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('organizationHr.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('organizationHr.statusActive')}</SelectItem>
              <SelectItem value="inactive">{t('organizationHr.statusInactive')}</SelectItem>
              <SelectItem value="on_leave">{t('organizationHr.statusOnLeave')}</SelectItem>
              <SelectItem value="terminated">{t('organizationHr.statusTerminated')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('organizationHr.allSchools')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('organizationHr.allSchools')}</SelectItem>
              {(schools as { id: string; name?: string; school_name?: string }[] || []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name || s.school_name || s.id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('organizationHr.employeeId')}</TableHead>
                    <TableHead>{t('organizationHr.name')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('organizationHr.position')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('organizationHr.school')}</TableHead>
                    <TableHead>{t('organizationHr.status')}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {t('organizationHr.noStaffFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffList.map((staff) => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono text-xs">{staff.employeeId}</TableCell>
                        <TableCell className="font-medium">{staff.firstName} {staff.fatherName}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{staff.position || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{schoolName(staff.schoolId)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(staff.status)}>{staff.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleViewStaff(staff)} aria-label={t('organizationHr.viewDetails')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.total > 0 && (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground">
              {t('organizationHr.showingResults', { count: String(staffList.length), total: String(data.total) }) ||
                `Showing ${staffList.length} of ${data.total} staff`}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side={isRTL ? 'left' : 'right'} className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedStaff?.firstName} {selectedStaff?.fatherName}</SheetTitle>
            <SheetDescription>{selectedStaff?.employeeId}</SheetDescription>
          </SheetHeader>
          {selectedStaff && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.position')}</p>
                  <p className="font-medium">{selectedStaff.position || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.duty')}</p>
                  <p className="font-medium">{selectedStaff.duty || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.email')}</p>
                  <p className="font-medium">{selectedStaff.email || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.phone')}</p>
                  <p className="font-medium">{selectedStaff.phoneNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.school')}</p>
                  <p className="font-medium">{schoolName(selectedStaff.schoolId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('organizationHr.status')}</p>
                  <Badge variant={statusVariant(selectedStaff.status)}>{selectedStaff.status}</Badge>
                </div>
              </div>
              <div className="border-t pt-3 text-xs text-muted-foreground">
                {t('organizationHr.joinedOn')} {formatDate(selectedStaff.createdAt)}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
