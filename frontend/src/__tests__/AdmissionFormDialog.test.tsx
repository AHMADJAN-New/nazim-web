// @vitest-environment jsdom
// @ts-nocheck
import '@testing-library/jest-dom/vitest';

import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdmissionFormDialog } from '@/components/admissions/AdmissionFormDialog';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    value,
    placeholder,
  }: {
    options: Array<{ value: string; label: string }>;
    value?: string;
    placeholder?: string;
  }) => (
    <div data-testid="student-combobox">
      {options.find((option) => option.value === value)?.label ?? placeholder}
    </div>
  ),
}));

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
    },
  }),
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: 'student-1',
        fullName: 'Ahmad',
        full_name: 'Ahmad',
        admissionNumber: 'ADM-001',
        admission_no: 'ADM-001',
        schoolId: 'school-1',
      },
      {
        id: 'student-2',
        fullName: 'Maryam',
        full_name: 'Maryam',
        admissionNumber: 'ADM-002',
        admission_no: 'ADM-002',
        schoolId: 'school-1',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/hooks/useSchools', () => ({
  useSchools: () => ({
    data: [{ id: 'school-1', schoolName: 'Nazim School' }],
  }),
}));

vi.mock('@/hooks/useAcademicYears', () => ({
  useAcademicYears: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useResidencyTypes', () => ({
  useResidencyTypes: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useRooms', () => ({
  useRooms: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useClasses', () => ({
  useClassAcademicYears: () => ({
    data: [],
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useResourceUsage: () => ({
    isUnlimited: true,
    remaining: 10,
    current: 0,
    limit: null,
  }),
}));

vi.mock('@/hooks/useStudentAdmissions', () => ({
  useCreateStudentAdmission: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useUpdateStudentAdmission: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

describe('AdmissionFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preselects the requested student when creating a new admission', async () => {
    render(
      <AdmissionFormDialog
        open={true}
        onOpenChange={vi.fn()}
        preselectedStudentId="student-2"
        admissions={[
          {
            id: 'admission-1',
            studentId: 'student-2',
          } as any,
        ]}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('student-combobox')).toHaveTextContent('Maryam (ADM-002)');
    });
  });
});
