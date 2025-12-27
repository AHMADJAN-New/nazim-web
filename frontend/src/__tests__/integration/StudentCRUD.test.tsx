// @ts-nocheck
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentsPage } from '../../pages/StudentsPage'

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
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

describe('Student CRUD Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays list of students', async () => {
    const mockStudents = [
      {
        id: '1',
        full_name: 'Ahmad Khan',
        student_code: 'STU001',
        gender: 'male',
        student_status: 'active',
      },
      {
        id: '2',
        full_name: 'Fatima Ali',
        student_code: 'STU002',
        gender: 'female',
        student_status: 'active',
      },
    ]

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockResolvedValueOnce({
      data: { data: mockStudents },
    })

    render(<StudentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Ahmad Khan')).toBeInTheDocument()
      expect(screen.getByText('Fatima Ali')).toBeInTheDocument()
    })
  })

  it('handles loading state', () => {
    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<StudentsPage />, { wrapper: createWrapper() })

    // Should show loading indicator
    expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', async () => {
    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockRejectedValueOnce(new Error('Failed to fetch'))

    render(<StudentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument()
    })
  })

  it('opens create student dialog', async () => {
    const user = userEvent.setup()
    const mockStudents = []

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockResolvedValueOnce({
      data: { data: mockStudents },
    })

    render(<StudentsPage />, { wrapper: createWrapper() })

    // Look for add/create button
    const addButton = await screen.findByRole('button', { name: /add|create/i })
    await user.click(addButton)

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('filters students by search', async () => {
    const user = userEvent.setup()
    const mockStudents = [
      {
        id: '1',
        full_name: 'Ahmad Khan',
        student_code: 'STU001',
        gender: 'male',
        student_status: 'active',
      },
    ]

    const { apiClient } = await import('../../lib/api-client')
    ;(apiClient.get as any).mockResolvedValue({
      data: { data: mockStudents },
    })

    render(<StudentsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Ahmad Khan')).toBeInTheDocument()
    })

    // Find search input
    const searchInput = screen.getByPlaceholderText(/search/i)
    await user.type(searchInput, 'Ahmad')

    // API should be called with search parameter
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=Ahmad'),
        expect.any(Object)
      )
    })
  })
})
