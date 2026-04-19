// @vitest-environment jsdom
// @ts-nocheck
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { StudentAdmissionsDialog } from '@/components/students/StudentAdmissionsDialog';

const useStudentAdmissionsMock = vi.fn();

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
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

vi.mock('@/hooks/usePermissions', () => ({
  useHasPermission: (permission: string) =>
    permission === 'student_admissions.read' ||
    permission === 'student_admissions.create' ||
    permission === 'student_admissions.update',
}));

vi.mock('@/hooks/useStudentAdmissions', () => ({
  useStudentAdmissions: (...args: unknown[]) => useStudentAdmissionsMock(...args),
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

describe('StudentAdmissionsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStudentAdmissionsMock.mockReturnValue({
      data: [
        {
          id: 'admission-1',
          studentId: 'student-1',
          admissionYear: '1405',
          admissionDate: new Date('2026-03-01'),
          enrollmentStatus: 'active',
          academicYear: { name: '1405' },
          class: { name: 'Grade 7' },
          classAcademicYear: { sectionName: 'A' },
          shift: 'Morning',
          isLatestAdmissionForStudent: true,
        },
      ],
      isLoading: false,
    });
  });

  it('loads admissions for the selected student and forwards the new admission action', async () => {
    const user = userEvent.setup();
    const handleCreateAdmission = vi.fn();

    render(
      <StudentAdmissionsDialog
        open={true}
        onOpenChange={vi.fn()}
        student={{
          id: 'student-1',
          fullName: 'Ahmad',
          admissionNumber: 'ADM-001',
          status: 'active',
          schoolId: 'school-1',
          currentClass: { id: 'class-1', name: 'Grade 7' },
        } as any}
        onCreateAdmission={handleCreateAdmission}
        onEditAdmission={vi.fn()}
      />
    );

    expect(useStudentAdmissionsMock).toHaveBeenCalledWith(
      'org-1',
      false,
      expect.objectContaining({ student_id: 'student-1' }),
      true
    );

    expect(screen.getByText('events.active')).toBeInTheDocument();
    expect(screen.getByText('Grade 7')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /admissions\.newAdmission/i }));

    expect(handleCreateAdmission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'student-1' })
    );
  });
});
