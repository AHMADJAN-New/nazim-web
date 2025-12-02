// @ts-nocheck
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi } from 'vitest';
import { useStudents } from '../hooks/useStudents';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1', role: 'admin' },
  })
}));

vi.mock('@/lib/api/client', () => {
  const sampleStudent = {
    id: '1',
    organization_id: 'org-1',
    school_id: null,
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
    updated_at: '2024-01-01'
  };

  return {
    studentsApi: {
      list: vi.fn(() => Promise.resolve([sampleStudent]))
    }
  };
});

describe('useStudents', () => {
  it('fetches students', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useStudents(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]).toMatchObject({ admission_no: 'ADM-1', full_name: 'Test Student' });
  });
});
