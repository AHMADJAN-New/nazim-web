// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useCreateStudent, useUpdateStudent, useDeleteStudent } from '@/hooks/useStudents';

const createMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
  }),
}));

vi.mock('@/lib/api/client', () => ({
  studentsApi: {
    create: (...args: any[]) => createMock(...args),
    update: (...args: any[]) => updateMock(...args),
    delete: (...args: any[]) => deleteMock(...args),
  },
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
  },
}));

const apiStudent = {
  id: 'student-1',
  organization_id: 'org-1',
  school_id: null,
  student_code: null,
  card_number: 'C-1',
  admission_no: 'ADM-1',
  full_name: 'Test Student',
  father_name: 'Test Father',
  grandfather_name: null,
  mother_name: null,
  gender: 'male',
  birth_year: '1387',
  birth_date: null,
  age: 15,
  admission_year: '2024',
  orig_province: 'Kabul',
  orig_district: 'District',
  orig_village: 'Village',
  curr_province: 'Kabul',
  curr_district: 'District',
  curr_village: 'Village',
  nationality: 'Afghan',
  preferred_language: 'Dari',
  previous_school: null,
  guardian_name: 'Guardian',
  guardian_relation: 'Father',
  guardian_phone: '0700',
  guardian_tazkira: null,
  guardian_picture_path: null,
  home_address: null,
  zamin_name: null,
  zamin_phone: null,
  zamin_tazkira: null,
  zamin_address: null,
  applying_grade: '7',
  is_orphan: false,
  admission_fee_status: 'pending',
  student_status: 'active',
  disability_status: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  family_income: null,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  deleted_at: null,
  organization: null,
  school: null,
  current_class: null,
  picture_path: null,
};

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('student mutations', () => {
  beforeEach(() => {
    createMock.mockReset();
    updateMock.mockReset();
    deleteMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it('creates a student and returns mapped domain data', async () => {
    createMock.mockResolvedValueOnce(apiStudent);
    const wrapper = createWrapper();

    const { result } = renderHook(() => useCreateStudent(), { wrapper });

    let createdStudent: any;
    await act(async () => {
      createdStudent = await result.current.mutateAsync({
        admissionNumber: 'ADM-1',
        fullName: 'Test Student',
        fatherName: 'Test Father',
      });
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: 'org-1',
        admission_no: 'ADM-1',
        full_name: 'Test Student',
        father_name: 'Test Father',
      })
    );
    expect(createdStudent.fullName).toBe('Test Student');
    expect(toastSuccess).toHaveBeenCalledWith('toast.studentRegistered');
  });

  it('updates a student and returns mapped domain data', async () => {
    updateMock.mockResolvedValueOnce({ ...apiStudent, full_name: 'Updated Student' });
    const wrapper = createWrapper();

    const { result } = renderHook(() => useUpdateStudent(), { wrapper });

    let updatedStudent: any;
    await act(async () => {
      updatedStudent = await result.current.mutateAsync({
        id: 'student-1',
        data: {
          admissionNumber: 'ADM-1',
          fullName: 'Updated Student',
          fatherName: 'Updated Father',
        },
      });
    });

    expect(updateMock).toHaveBeenCalledWith(
      'student-1',
      expect.objectContaining({
        admission_no: 'ADM-1',
        full_name: 'Updated Student',
        father_name: 'Updated Father',
      })
    );
    expect(updatedStudent.fullName).toBe('Updated Student');
    expect(toastSuccess).toHaveBeenCalledWith('toast.studentInformationUpdated');
  });

  it('deletes a student and triggers success toast', async () => {
    deleteMock.mockResolvedValueOnce(undefined);
    const wrapper = createWrapper();

    const { result } = renderHook(() => useDeleteStudent(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('student-1');
    });

    expect(deleteMock).toHaveBeenCalledWith('student-1');
    expect(toastSuccess).toHaveBeenCalledWith('toast.studentRemoved');
  });
});
