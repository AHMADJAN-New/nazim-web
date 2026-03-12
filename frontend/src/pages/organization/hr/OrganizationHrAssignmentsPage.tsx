import { ClipboardList, Search, CheckCircle2 } from 'lucide-react';
import { useState, useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useOrgHrAssignments } from '@/hooks/orgHr/useOrgHr';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

const assignmentStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active': return 'default';
    case 'ended': return 'secondary';
    case 'suspended': return 'destructive';
    default: return 'outline';
  }
};

export default function OrganizationHrAssignmentsPage() {
  const { t, isRTL } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const { data: schools } = useSchools();

  const { data, isLoading } = useOrgHrAssignments({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    schoolId: schoolFilter !== 'all' ? schoolFilter : undefined,
  });

  const assignments = useMemo(() => data?.data ?? [], [data]);

  const schoolName = (schoolId: string) => {
    if (!schools) return schoolId.slice(0, 8);
    const school = (schools as { id: string; name?: string; school_name?: string }[])
      .find(s => s.id === schoolId);
    return school?.name || school?.school_name || schoolId.slice(0, 8);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.assignmentsTitle')}
        description={t('organizationHr.assignmentsPageDesc')}
        icon={<ClipboardList className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/organization/hr' },
          { label: t('organizationHr.assignments') },
        ]}
      />

      <FilterPanel title={t('organizationHr.filters')} defaultOpenDesktop defaultOpenMobile={false}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('organizationHr.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('organizationHr.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('organizationHr.statusActive')}</SelectItem>
              <SelectItem value="ended">{t('organizationHr.statusEnded')}</SelectItem>
              <SelectItem value="suspended">{t('organizationHr.statusSuspended')}</SelectItem>
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
                    <TableHead>{t('organizationHr.staffId')}</TableHead>
                    <TableHead>{t('organizationHr.school')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('organizationHr.roleTitle')}</TableHead>
                    <TableHead>{t('organizationHr.allocation')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('organizationHr.primary')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('organizationHr.startDate')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('organizationHr.endDate')}</TableHead>
                    <TableHead>{t('organizationHr.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        {t('organizationHr.noAssignmentsFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-mono text-xs">{assignment.staffId.slice(0, 8)}...</TableCell>
                        <TableCell>{schoolName(assignment.schoolId)}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{assignment.roleTitle || '—'}</TableCell>
                        <TableCell className="font-medium">{assignment.allocationPercent}%</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {assignment.isPrimary && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(assignment.startDate)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{assignment.endDate ? formatDate(assignment.endDate) : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={assignmentStatusVariant(assignment.status)}>{assignment.status}</Badge>
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
              {t('organizationHr.showingResults', { count: String(assignments.length), total: String(data.total) }) ||
                `Showing ${assignments.length} of ${data.total} assignments`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
