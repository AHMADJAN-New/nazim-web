// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import StudentReport, { studentCoreExportColumnKeys } from '@/pages/StudentReport';

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

vi.mock('@/hooks/useAcademicYears', () => ({
  useAcademicYears: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useClasses', () => ({
  useClassAcademicYears: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: 'student-1',
        fullName: 'Ahmad',
        fatherName: 'Karim',
        admissionNumber: 'ADM-001',
        cardNumber: 'CARD-001',
        gender: 'male',
        phone: '0700000000',
        applyingGrade: 'Grade 7',
        schoolId: 'school-1',
        admissionYear: '1405',
        status: 'active',
      },
    ],
    isLoading: false,
    pagination: {
      current_page: 1,
      per_page: 25,
      total: 1,
      last_page: 1,
      from: 1,
      to: 1,
    },
    page: 1,
    pageSize: 25,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
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
      data-testid="student-export-buttons"
      data-columns={JSON.stringify(columns)}
      data-disabled={disabled ? 'true' : 'false'}
    />
  ),
}));

const studentAllExportColumnKeys = [
  'admission_no',
  'card_number',
  'status',
  'full_name',
  'father_name',
  'gender',
  'age',
  'birth_date',
  'nationality',
  'address',
  'phone',
  'tazkira_number',
  'guardian',
  'applying_grade',
  'school',
  'admission_year',
  'admission_fee_status',
  'origin_location',
  'current_location',
  'previous_school',
  'orphan',
  'disability',
  'emergency_contact',
  'notes',
];

const getExportColumnKeys = (): string[] => {
  const payload = screen.getByTestId('student-export-buttons').getAttribute('data-columns') ?? '[]';
  return JSON.parse(payload).map((column: string | { key: string }) =>
    typeof column === 'string' ? column : column.key
  );
};

const exportIsDisabled = (): boolean =>
  screen.getByTestId('student-export-buttons').getAttribute('data-disabled') === 'true';

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

describe('StudentReport export columns', () => {
  it('initializes with the curated core columns and supports quick actions', async () => {
    const user = userEvent.setup();

    render(<StudentReport />);

    expect(getExportColumnKeys()).toEqual([...studentCoreExportColumnKeys]);
    expect(exportIsDisabled()).toBe(false);

    await user.click(screen.getByRole('button', { name: /studentReport\.selectColumns/i }));
    await user.click(screen.getByRole('button', { name: 'studentReport.clearAllColumns' }));

    expect(getExportColumnKeys()).toEqual([]);
    expect(exportIsDisabled()).toBe(true);

    await user.click(screen.getByRole('button', { name: 'studentReport.selectAllColumns' }));
    expect(getExportColumnKeys()).toEqual(studentAllExportColumnKeys);
    expect(exportIsDisabled()).toBe(false);

    await user.click(screen.getByRole('button', { name: 'studentReport.coreColumns' }));
    expect(getExportColumnKeys()).toEqual([...studentCoreExportColumnKeys]);
  });
});
