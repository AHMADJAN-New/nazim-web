/**
 * Pagination Integration Example
 * 
 * This file demonstrates how to integrate the centralized pagination system
 * into hooks and components. Use this as a reference when adding pagination
 * to other tables/resources.
 */

import { useQuery } from '@tanstack/react-query';
import { usePagination } from '@/hooks/usePagination';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { studentsApi } from '@/lib/api/client';
import type * as StudentApi from '@/types/api/student';
import type { Student } from '@/types/domain/student';
import { mapStudentApiToDomain } from '@/mappers/studentMapper';
import type { PaginatedResponse } from '@/types/pagination';
import { useAuth } from '@/hooks/useAuth';
import { ColumnDef } from '@tanstack/react-table';
import { useEffect } from 'react';

/**
 * Example: Hook with Pagination Support
 * 
 * This shows how to update an existing hook to support pagination
 */
export function useStudentsPaginated(organizationId?: string) {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<PaginatedResponse<StudentApi.Student>>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null, page, pageSize],
    queryFn: async () => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const effectiveOrgId = organizationId || profile.organization_id;

      // Call API with pagination params
      const response = await studentsApi.list({
        organization_id: effectiveOrgId || undefined,
        page,
        per_page: pageSize,
      });

      // Response will be PaginatedResponse<T> when pagination params are provided
      return response as PaginatedResponse<StudentApi.Student>;
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (data?.meta) {
      updateFromMeta(data.meta);
    }
  }, [data?.meta, updateFromMeta]);

  // Map API data to domain models
  const students: Student[] = data?.data ? data.data.map(mapStudentApiToDomain) : [];

  return {
    students,
    isLoading,
    error,
    pagination: data?.meta ?? null,
    paginationState,
    page,
    pageSize,
    setPage,
    setPageSize,
  };
}

/**
 * Example: Component with Pagination
 * 
 * This shows how to use pagination in a table component
 */
export function StudentsTableExample() {
  const { profile } = useAuth();
  const {
    students,
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useStudentsPaginated(profile?.organization_id);

  // Define columns (simplified example)
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'fullName',
      header: 'Full Name',
    },
    {
      accessorKey: 'admissionNumber',
      header: 'Admission Number',
    },
    // ... more columns
  ];

  // Use DataTable hook with pagination
  const { table } = useDataTable({
    data: students,
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
    initialState: {
      pagination: {
        pageIndex: page - 1, // TanStack Table uses 0-based index
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      // Sync with pagination hook
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <DataTable table={table}>
        <DataTableToolbar table={table} />
      </DataTable>
      
      {/* Pagination component */}
      <DataTablePagination
        table={table}
        paginationMeta={pagination ?? null}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        showPageSizeSelector={true}
        showTotalCount={true}
      />
    </div>
  );
}

/**
 * Migration Guide:
 * 
 * 1. Update your hook:
 *    - Import usePagination
 *    - Add page, pageSize, setPage, setPageSize from usePagination
 *    - Add page and pageSize to queryKey
 *    - Add page and per_page to API call params
 *    - Update return type to handle PaginatedResponse<T>
 *    - Use useEffect to sync pagination meta from API response
 * 
 * 2. Update your component:
 *    - Use pagination state from hook
 *    - Pass paginationMeta to useDataTable
 *    - Pass pageCount (last_page) to useDataTable
 *    - Add DataTablePagination component
 *    - Handle onPaginationChange to sync state
 * 
 * 3. Update backend controller:
 *    - Check for page and per_page in request
 *    - Use ->paginate($perPage) instead of ->get()
 *    - Return paginated response (Laravel handles this automatically)
 * 
 * 4. Update API client:
 *    - Add page?: number and per_page?: number to list method params
 */
