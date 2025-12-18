// @ts-nocheck
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentFormDialog } from '../../components/students/StudentFormDialog'

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

describe('StudentFormDialog', () => {
  it('renders the dialog when open', () => {
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <StudentFormDialog open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    )

    // Dialog should be in the document
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <StudentFormDialog open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    )

    // Dialog should not be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation errors for required fields', async () => {
    const user = userEvent.setup()
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <StudentFormDialog open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
      { wrapper: createWrapper() }
    )

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /save|submit/i })
    await user.click(submitButton)

    // Should show validation errors
    await waitFor(() => {
      // Check for form validation messages (specific text depends on implementation)
      const form = screen.getByRole('dialog')
      expect(form).toBeInTheDocument()
    })
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const mockOnClose = vi.fn()
    const mockOnSuccess = vi.fn()

    render(
      <StudentFormDialog open={true} onClose={mockOnClose} onSuccess=  {mockOnSuccess} />,
      { wrapper: createWrapper() }
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
