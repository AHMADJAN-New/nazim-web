import { ColumnDef } from '@tanstack/react-table';
import { Phone, Search, Download, FileText, Users, UserCheck, Building2, Gift, UserCircle } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { LoadingSpinner } from '@/components/ui/loading';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataTable } from '@/hooks/use-data-table';
import { useLanguage } from '@/hooks/useLanguage';
import { usePagination } from '@/hooks/usePagination';
import { useHasPermission } from '@/hooks/usePermissions';
import { usePhoneBook } from '@/hooks/usePhoneBook';
import type { PhoneBookEntry } from '@/types/domain/phoneBook';

type PhoneBookCategory = 'all' | 'students' | 'staff' | 'donors' | 'guests' | 'others';

export function PhoneBook() {
  const { t, isRTL } = useLanguage();
  const { selectedSchoolId } = useSchoolContext();
  const [activeTab, setActiveTab] = useState<PhoneBookCategory>('all');
  const [search, setSearch] = useState('');
  const { page, pageSize, setPage, setPageSize, paginationState } = usePagination();

  // Check permissions for each tab
  const hasStudentsPermission = useHasPermission('students.read');
  const hasStaffPermission = useHasPermission('staff.read');
  const hasDonorsPermission = useHasPermission('donors.read');
  const hasGuestsPermission = useHasPermission('event_guests.read');

  // Determine available tabs based on permissions
  const availableTabs = useMemo(() => {
    const tabs: PhoneBookCategory[] = [];
    if (hasStudentsPermission) tabs.push('students');
    if (hasStaffPermission) tabs.push('staff');
    if (hasDonorsPermission) tabs.push('donors');
    if (hasGuestsPermission) tabs.push('guests');
    // Always show 'all' if user has at least one permission
    if (tabs.length > 0) tabs.unshift('all');
    return tabs;
  }, [hasStudentsPermission, hasStaffPermission, hasDonorsPermission, hasGuestsPermission]);

  // Determine the active tab - use first available if current is not available
  const effectiveActiveTab = useMemo(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      return availableTabs[0];
    }
    return activeTab;
  }, [availableTabs, activeTab]);

  // If no permissions, show message
  if (availableTabs.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('guards.accessDenied') || 'Access Denied'}</h3>
                <p>{t('events.noPermission') || 'You do not have permission to view any phone book entries.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fetch phone book entries
  const { entries, isLoading, pagination, refetch } = usePhoneBook({
    category: effectiveActiveTab,
    search,
    page,
    perPage: pageSize,
  });

  // Define columns
  const columns: ColumnDef<PhoneBookEntry>[] = useMemo(() => [
    {
      accessorKey: 'name',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('events.name') || 'Name'}</div>,
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <div className="font-medium">{entry.name}</div>
            {entry.relation && (
              <div className="text-sm text-muted-foreground">{entry.relation}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('events.phone') || 'Phone'}</div>,
      cell: ({ row }) => {
        const phone = row.original.phone;
        return (
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <a
              href={`tel:${phone}`}
              className="text-primary hover:underline flex items-center gap-2 whitespace-nowrap"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="min-w-[120px]">{phone}</span>
            </a>
          </div>
        );
      },
      size: 150,
      minSize: 120,
    },
    {
      accessorKey: 'email',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('events.email') || 'Email'}</div>,
      cell: ({ row }) => {
        const email = row.original.email;
        if (!email) return <span className="text-muted-foreground">-</span>;
        return (
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <a
              href={`mailto:${email}`}
              className="text-primary hover:underline"
            >
              {email}
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: 'category',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('assets.category') || 'Category'}</div>,
      cell: ({ row }) => {
        const category = row.original.category;
        const categoryLabels: Record<string, string> = {
          student_guardian: t('phoneBook.studentGuardian') || 'Student Guardian',
          student_emergency: t('phoneBook.studentEmergency') || 'Student Emergency',
          student_zamin: t('phoneBook.studentZamin') || 'Student Zamin',
          staff: t('settings.staff') || 'Staff',
          donor: t('phoneBook.donor') || 'Donor',
          guest: t('phoneBook.guest') || 'Guest',
          other: t('events.other') || 'Other',
        };
        // Color-coded badges for better visual distinction
        const getBadgeStyle = () => {
          if (category === 'staff') {
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700';
          }
          if (category === 'student_guardian') {
            return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-700';
          }
          if (category === 'student_emergency') {
            return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
          }
          if (category === 'student_zamin') {
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 border-purple-200 dark:border-purple-700';
          }
          if (category === 'donor') {
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700';
          }
          if (category === 'guest') {
            return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700';
          }
          return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
        };
        
        return (
          <Badge variant="outline" className={`${getBadgeStyle()} font-medium`}>
            {categoryLabels[category] || category}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'details',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('library.details') || 'Details'}</div>,
      cell: ({ row }) => {
        const entry = row.original;
        const details: string[] = [];
        
        if (entry.student_name) {
          details.push(`${t('phoneBook.student') || 'Student'}: ${entry.student_name}`);
        }
        if (entry.admission_no) {
          details.push(`${t('examReports.admissionNo') || 'Admission No'}: ${entry.admission_no}`);
        }
        if (entry.employee_id) {
          details.push(`${t('search.employeeId') || 'Employee ID'}: ${entry.employee_id}`);
        }
        if (entry.guest_code) {
          details.push(`${t('phoneBook.guestCode') || 'Guest Code'}: ${entry.guest_code}`);
        }
        if (entry.contact_person) {
          details.push(`${t('phoneBook.contactPerson') || 'Contact Person'}: ${entry.contact_person}`);
        }
        
        if (details.length === 0) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div className={isRTL ? 'text-right' : 'text-left'}>
            {details.map((detail, idx) => (
              <div key={idx} className="text-sm text-muted-foreground">
                {detail}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'address',
      header: () => <div className={isRTL ? 'text-right' : 'text-left'}>{t('events.address') || 'Address'}</div>,
      cell: ({ row }) => {
        const address = row.original.address;
        if (!address) return <span className="text-muted-foreground">-</span>;
        return (
          <div className={`${isRTL ? 'text-right' : 'text-left'} max-w-[200px] truncate`}>
            {address}
          </div>
        );
      },
    },
  ], [t, isRTL]);

  // Use DataTable hook
  const { table } = useDataTable({
    data: entries,
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

  // Transform data for export
  const transformDataForExport = (data: PhoneBookEntry[]) => {
    return data.map((entry) => ({
      [t('events.name') || 'Name']: entry.name,
      [t('events.phone') || 'Phone']: entry.phone,
      [t('events.email') || 'Email']: entry.email || '',
      [t('assets.category') || 'Category']: entry.category,
      [t('phoneBook.relation') || 'Relation']: entry.relation,
      [t('phoneBook.student') || 'Student']: entry.student_name || '',
      [t('examReports.admissionNo') || 'Admission No']: entry.admission_no || '',
      [t('search.employeeId') || 'Employee ID']: entry.employee_id || '',
      [t('events.address') || 'Address']: entry.address || '',
    }));
  };

  // Build filters summary
  const buildFiltersSummary = () => {
    const parts: string[] = [];
    if (effectiveActiveTab !== 'all') {
      parts.push(`${t('assets.category') || 'Category'}: ${t(`phoneBook.${effectiveActiveTab}`) || effectiveActiveTab}`);
    }
    if (search) {
      parts.push(`${t('events.search') || 'Search'}: ${search}`);
    }
    return parts.join(' | ');
  };

  // Export columns
  const exportColumns = useMemo(() => [
    { key: 'name', label: t('events.name') || 'Name', width: 30 },
    { key: 'phone', label: t('events.phone') || 'Phone', width: 20 },
    { key: 'email', label: t('events.email') || 'Email', width: 30 },
    { key: 'category', label: t('assets.category') || 'Category', width: 20 },
    { key: 'relation', label: t('phoneBook.relation') || 'Relation', width: 20 },
    { key: 'student_name', label: t('phoneBook.student') || 'Student', width: 25 },
    { key: 'admission_no', label: t('examReports.admissionNo') || 'Admission No', width: 20 },
    { key: 'employee_id', label: t('search.employeeId') || 'Employee ID', width: 20 },
    { key: 'address', label: t('events.address') || 'Address', width: 40 },
  ], [t]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <PageHeader
        title={t('events.title') || 'Phone Book'}
        description={t('hostel.subtitle') || 'View and search all phone numbers from students, staff, donors, and guests'}
        icon={<Phone className="h-5 w-5" />}
        rightSlot={
          <ReportExportButtons
            data={entries}
            columns={exportColumns}
            reportKey="phonebook"
            title={t('events.title') || 'Phone Book'}
            transformData={transformDataForExport}
            buildFiltersSummary={buildFiltersSummary}
            schoolId={selectedSchoolId}
            templateType="phonebook"
            disabled={entries.length === 0}
            errorNoData={t('events.noDataToExport') || 'No data to export'}
          />
        }
      />

      {/* Tabs */}
      <Tabs value={effectiveActiveTab} onValueChange={(value) => {
        setActiveTab(value as PhoneBookCategory);
        setPage(1); // Reset to first page when changing tabs
        setSearch(''); // Clear search when changing tabs
      }} className="w-full">
        <TabsList className="flex w-full gap-1 h-auto flex-shrink-0 overflow-x-auto pb-1">
          {availableTabs.includes('all') && (
            <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('subjects.all') || 'All'}</span>
              {pagination && effectiveActiveTab === 'all' && (
                <Badge variant="outline" className="ml-1 bg-primary/10 text-primary border-primary/20 font-semibold text-xs flex-shrink-0">
                  {pagination.total}
                </Badge>
              )}
            </TabsTrigger>
          )}
          {hasStudentsPermission && (
            <TabsTrigger value="students" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
              <UserCheck className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('table.students') || 'Students'}</span>
            </TabsTrigger>
          )}
          {hasStaffPermission && (
            <TabsTrigger value="staff" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('settings.staff') || 'Staff'}</span>
            </TabsTrigger>
          )}
          {hasDonorsPermission && (
            <TabsTrigger value="donors" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
              <Gift className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('phoneBook.donors') || 'Donors'}</span>
            </TabsTrigger>
          )}
          {hasGuestsPermission && (
            <TabsTrigger value="guests" className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0">
              <UserCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{t('phoneBook.guests') || 'Guests'}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* All Tab Content */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('phoneBook.allEntries') || 'All Phone Book Entries'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('phoneBook.allEntriesDescription') || 'View all phone numbers from students, staff, donors, and guests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('assets.searchPlaceholder') || 'Search by name, phone, email...'}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1); // Reset to first page when searching
                      }}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <DataTable table={table}>
                  <DataTableToolbar table={table} />
                </DataTable>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab Content */}
        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('phoneBook.studentContacts') || 'Student Contacts'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('phoneBook.studentContactsDescription') || 'Phone numbers from student guardians, emergency contacts, and zamin'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('assets.searchPlaceholder') || 'Search by name, phone, email...'}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <DataTable table={table}>
                  <DataTableToolbar table={table} />
                </DataTable>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab Content */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('phoneBook.staffContacts') || 'Staff Contacts'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('phoneBook.staffContactsDescription') || 'Phone numbers from all staff members'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('assets.searchPlaceholder') || 'Search by name, phone, email...'}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <DataTable table={table}>
                  <DataTableToolbar table={table} />
                </DataTable>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Donors Tab Content */}
        <TabsContent value="donors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('phoneBook.donorContacts') || 'Donor Contacts'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('phoneBook.donorContactsDescription') || 'Phone numbers from all donors'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('assets.searchPlaceholder') || 'Search by name, phone, email...'}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <DataTable table={table}>
                  <DataTableToolbar table={table} />
                </DataTable>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guests Tab Content */}
        <TabsContent value="guests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('phoneBook.guestContacts') || 'Guest Contacts'}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('phoneBook.guestContactsDescription') || 'Phone numbers from event guests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('assets.searchPlaceholder') || 'Search by name, phone, email...'}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className={isRTL ? 'pr-10' : 'pl-10'}
                    />
                  </div>
                </div>

                {/* Data Table */}
                <DataTable table={table}>
                  <DataTableToolbar table={table} />
                </DataTable>

                {/* Pagination */}
                <DataTablePagination
                  table={table}
                  paginationMeta={pagination ?? null}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PhoneBook;

