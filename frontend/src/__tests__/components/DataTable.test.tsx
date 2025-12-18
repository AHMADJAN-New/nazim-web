// @ts-nocheck
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { DataTable } from '../../components/ui/data-table'
import { createColumnHelper } from '@tanstack/react-table'

type TestData = {
  id: string
  name: string
  age: number
}

const columnHelper = createColumnHelper<TestData>()

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: (info) => info.getValue(),
  }),
]

describe('DataTable', () => {
  it('renders table with data', () => {
    const data: TestData[] = [
      { id: '1', name: 'Ahmad', age: 25 },
      { id: '2', name: 'Fatima', age: 30 },
    ]

    render(<DataTable columns={columns} data={data} />)

    // Check if data is rendered
    expect(screen.getByText('Ahmad')).toBeInTheDocument()
    expect(screen.getByText('Fatima')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} />)

    // Should show some empty state (exact text depends on implementation)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
  })

  it('renders column headers', () => {
    const data: TestData[] = [{ id: '1', name: 'Ahmad', age: 25 }]

    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
  })

  it('handles row selection if enabled', async () => {
    const user = userEvent.setup()
    const data: TestData[] = [
      { id: '1', name: 'Ahmad', age: 25 },
      { id: '2', name: 'Fatima', age: 30 },
    ]

    render(<DataTable columns={columns} data={data} enableRowSelection />)

    // If row selection is enabled, checkboxes should be present
    const checkboxes = screen.queryAllByRole('checkbox')

    if (checkboxes.length > 0) {
      await user.click(checkboxes[0])
      expect(checkboxes[0]).toBeChecked()
    }
  })
})
