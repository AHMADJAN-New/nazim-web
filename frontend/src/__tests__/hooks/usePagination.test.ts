// @ts-nocheck
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { usePagination } from '../../hooks/usePagination'

describe('usePagination', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => usePagination())

    expect(result.current.currentPage).toBe(1)
    expect(result.current.pageSize).toBe(10)
  })

  it('initializes with custom page size', () => {
    const { result } = renderHook(() => usePagination({ defaultPageSize: 20 }))

    expect(result.current.pageSize).toBe(20)
  })

  it('navigates to next page', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.nextPage()
    })

    expect(result.current.currentPage).toBe(2)
  })

  it('navigates to previous page', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 3 }))

    act(() => {
      result.current.previousPage()
    })

    expect(result.current.currentPage).toBe(2)
  })

  it('does not go below page 1', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.previousPage()
    })

    expect(result.current.currentPage).toBe(1)
  })

  it('goes to specific page', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.goToPage(5)
    })

    expect(result.current.currentPage).toBe(5)
  })

  it('changes page size', () => {
    const { result } = renderHook(() => usePagination())

    act(() => {
      result.current.setPageSize(25)
    })

    expect(result.current.pageSize).toBe(25)
    expect(result.current.currentPage).toBe(1) // Should reset to page 1
  })

  it('calculates total pages correctly', () => {
    const { result } = renderHook(() => usePagination({ totalItems: 100, defaultPageSize: 10 }))

    expect(result.current.totalPages).toBe(10)
  })

  it('calculates offset correctly', () => {
    const { result } = renderHook(() => usePagination({ defaultPage: 3, defaultPageSize: 10 }))

    expect(result.current.offset).toBe(20) // (page 3 - 1) * 10
  })
})
