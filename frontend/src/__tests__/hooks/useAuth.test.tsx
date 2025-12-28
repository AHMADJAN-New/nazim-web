// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '../../hooks/useAuth'

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should return user when authenticated', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
    }

    const mockProfile = {
      id: '1',
      full_name: 'Test User',
      role: 'admin',
    }

    localStorage.setItem('token', 'test-token')

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockResolvedValueOnce({
      data: { user: mockUser, profile: mockProfile },
    })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  it('should return null when not authenticated', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should handle login mutation', async () => {
    const mockResponse = {
      data: {
        user: { id: '1', email: 'test@example.com' },
        profile: { id: '1', full_name: 'Test User' },
        token: 'new-token',
      },
    }

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.post as any).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.login).toBeDefined()
    })
  })

  it('should handle logout', async () => {
    localStorage.setItem('token', 'test-token')

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.post as any).mockResolvedValueOnce({ data: {} })

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.logout).toBeDefined()
    })

    // After logout, user should be null
    result.current.logout?.()

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})
