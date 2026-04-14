// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import StaffReport, { staffCoreExportColumnKeys } from '@/pages/StaffReport';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    isRTL: false,
  }),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfile: () => ({
    data: {
      organization_id: 'org-1',
      default_school_id: 'school-1',
    },
  }),
}));

vi.mock('@/contexts/SchoolContext', () => ({
  useSchoolContext: () => ({
    selectedSchoolId: 'school-1',
  }),
}));

vi.mock('@/hooks/useSchools', () => ({
  useSchools: () => ({
    data: [
      { id: 'school-1', schoolName: 'Nazim School' },
    ],
  }),
}));

vi.mock('@/hooks/useStaff', () => ({
  useStaff: () => ({
    data: [
      {
        id: 'staff-1',
        staffCode: 'STF-001',
        employeeId: 'EMP-001',
        status: 'active',
        firstName: 'Abdul',
        fatherName: 'Karim',
        grandfatherName: 'Rahim',
        fullName: 'Abdul Karim',
        phoneNumber: '0700000000',
        staffType: 'Teacher',
        position: 'Teacher',
        duty: 'Teaching',
        schoolId: 'school-1',
        school: { schoolName: 'Nazim School' },
      },
    ],
    isLoading: false,
  }),
  useStaffTypes: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/use-data-table', () => ({
  useDataTable: () => ({
    table: {
      getHeaderGroups: () => [],
      getRowModel: () => ({ rows: [] }),
    },
  }),
}));

vi.mock('@/components/layout/PageHeader', () => ({
  PageHeader: ({ rightSlot }: { rightSlot?: ReactNode }) => (
    <div>
      <div data-testid="page-header-right-slot">{rightSlot}</div>
    </div>
  ),
}));

vi.mock('@/components/reports/ReportExportButtons', () => ({
  ReportExportButtons: ({
    columns,
    disabled,
  }: {
    columns: Array<{ key?: string } | string>;
    disabled?: boolean;
  }) => (
    <div
      data-testid="staff-export-buttons"
      data-columns={JSON.stringify(columns)}
      data-disabled={disabled ? 'true' : 'false'}
    />
  ),
}));

const staffAllExportColumnKeys = [
  'staff_code',
  'employee_id',
  'status',
  'full_name',
  'first_name',
  'father_name',
  'grandfather_name',
  'tazkira_number',
  'birth_date',
  'birth_year',
  'phone_number',
  'email',
  'home_address',
  'staff_type',
  'position',
  'duty',
  'salary',
  'teaching_section',
  'school',
  'organization',
  'origin_location',
  'current_location',
  'religious_education',
  'religious_institution',
  'religious_graduation_year',
  'religious_department',
  'modern_education',
  'modern_institution',
  'modern_graduation_year',
  'modern_department',
  'notes',
];

const getExportColumnKeys = (): string[] => {
  const payload = screen.getByTestId('staff-export-buttons').getAttribute('data-columns') ?? '[]';
  return JSON.parse(payload).map((column: string | { key: string }) =>
    typeof column === 'string' ? column : column.key
  );
};

const exportIsDisabled = (): boolean =>
  screen.getByTestId('staff-export-buttons').getAttribute('data-disabled') === 'true';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
});

describe('StaffReport export columns', () => {
  it('initializes with the curated core columns and supports quick actions', async () => {
    const user = userEvent.setup();

    render(<StaffReport />);

    expect(getExportColumnKeys()).toEqual([...staffCoreExportColumnKeys]);
    expect(exportIsDisabled()).toBe(false);

    await user.click(screen.getByRole('button', { name: /staff\.selectColumns/i }));
    await user.click(screen.getByRole('button', { name: 'staff.clearAllColumns' }));

    expect(getExportColumnKeys()).toEqual([]);
    expect(exportIsDisabled()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'staff.selectAllColumns' }));
    expect(getExportColumnKeys()).toEqual(staffAllExportColumnKeys);
    expect(exportIsDisabled()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'staff.coreColumns' }));
    expect(getExportColumnKeys()).toEqual([...staffCoreExportColumnKeys]);
  });
});
