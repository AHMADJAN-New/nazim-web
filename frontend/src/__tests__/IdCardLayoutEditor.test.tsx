// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IdCardLayoutEditor } from '@/components/id-cards/IdCardLayoutEditor';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en-US',
    isRTL: false,
  }),
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: 'student-latest',
        fullName: 'Latest Student',
        fatherName: 'Latest Father',
        studentCode: 'STD-LATEST',
        admissionNumber: 'ADM-LATEST',
        cardNumber: null,
        roomNumber: 'Room 11',
        createdAt: new Date('2026-04-13T00:00:00.000Z'),
        currentClass: { id: 'class-1', name: 'Grade 9' },
        school: { id: 'school-1', schoolName: 'Nazim School' },
      },
      {
        id: 'student-old',
        fullName: 'Old Student',
        fatherName: 'Old Father',
        studentCode: 'STD-OLD',
        admissionNumber: 'ADM-OLD',
        cardNumber: null,
        roomNumber: 'Room 2',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        currentClass: { id: 'class-2', name: 'Grade 5' },
        school: { id: 'school-1', schoolName: 'Nazim School' },
      },
    ],
  }),
}));

vi.mock('@/lib/idCards/idCardQr', () => ({
  generateLocalQrCodeDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr'),
}));

vi.mock('@/lib/api/client', () => ({
  idCardTemplatesApi: {
    getBackgroundImage: vi.fn(),
  },
  apiClient: {
    getToken: vi.fn().mockReturnValue(null),
  },
}));

describe('IdCardLayoutEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      })
    );
  });

  it('uses the latest student record for live preview values', async () => {
    render(
      <IdCardLayoutEditor
        templateId="template-1"
        backgroundImageUrlFront={null}
        backgroundImageUrlBack={null}
        layoutConfigFront={{
          enabledFields: [
            'studentName',
            'fatherName',
            'studentCode',
            'admissionNumber',
            'class',
            'room',
          ],
          studentNamePosition: { x: 30, y: 30 },
          fatherNamePosition: { x: 30, y: 40 },
          studentCodePosition: { x: 30, y: 50 },
          admissionNumberPosition: { x: 30, y: 60 },
          classPosition: { x: 30, y: 70 },
          roomPosition: { x: 30, y: 80 },
          fontSize: 12,
          fontFamily: 'Arial',
          textColor: '#000000',
          rtl: false,
        }}
        layoutConfigBack={{ enabledFields: [] }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(await screen.findByText('Latest Student')).toBeInTheDocument();
    expect(screen.getByText('Latest Father')).toBeInTheDocument();
    expect(screen.getByText('STD-LATEST')).toBeInTheDocument();
    expect(screen.getByText('ADM-LATEST')).toBeInTheDocument();
    expect(screen.getByText('Grade 9')).toBeInTheDocument();
    expect(screen.getByText('Room 11')).toBeInTheDocument();

    expect(screen.queryByText('Old Student')).not.toBeInTheDocument();
    expect(screen.queryByText('Old Father')).not.toBeInTheDocument();
    expect(screen.queryByText('STD-OLD')).not.toBeInTheDocument();
  });
});
