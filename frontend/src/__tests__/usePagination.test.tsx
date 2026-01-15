// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePagination } from '@/hooks/usePagination';

describe('usePagination', () => {
  it('defaults to page 1 and updates page', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);
  });

  it('ignores invalid page size changes', () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 25 }));

    act(() => {
      result.current.setPageSize(999);
    });

    expect(result.current.pageSize).toBe(25);
  });

  it('syncs pagination state from meta', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.updateFromMeta({
        current_page: 2,
        from: 26,
        last_page: 4,
        per_page: 25,
        to: 50,
        total: 100,
        path: '',
        first_page_url: '',
        last_page_url: '',
        next_page_url: '',
        prev_page_url: '',
      });
    });

    expect(result.current.page).toBe(2);
    expect(result.current.paginationState).toMatchObject({
      page: 2,
      pageSize: 25,
      total: 100,
      totalPages: 4,
      from: 26,
      to: 50,
    });
  });
});
