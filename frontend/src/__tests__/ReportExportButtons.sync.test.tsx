// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';

const {
  generateReport,
  downloadReport,
  resetReport,
  showToast,
} = vi.hoisted(() => ({
  generateReport: vi.fn(),
  downloadReport: vi.fn(),
  resetReport: vi.fn(),
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'events.exportExcel': 'Export Excel',
        'events.exportPdf': 'Export PDF',
        'events.exportErrorNoData': 'No data to export',
        'events.exportErrorNoSchool': 'School is required for export',
      }[key] ?? key),
  }),
}));

vi.mock('@/hooks/useProfiles', () => ({
  useProfile: () => ({
    data: {
      default_school_id: 'school-1',
    },
  }),
}));

vi.mock('@/contexts/SchoolContext', () => ({
  useSchoolContext: () => ({
    selectedSchoolId: null,
  }),
}));

vi.mock('@/hooks/useSchools', () => ({
  useSchool: () => ({
    data: {
      id: 'school-1',
      schoolName: 'Test School',
    },
  }),
}));

vi.mock('@/hooks/useReportTemplates', () => ({
  useReportTemplates: () => ({
    data: [],
  }),
}));

vi.mock('@/hooks/useSubscription', () => ({
  useHasFeature: () => false,
}));

vi.mock('@/hooks/useServerReport', () => ({
  useServerReport: () => ({
    generateReport,
    status: null,
    progress: 0,
    fileName: null,
    isGenerating: false,
    error: null,
    downloadReport,
    reset: resetReport,
  }),
}));

vi.mock('@/lib/toast', () => ({
  showToast,
}));

vi.mock('@/components/reports/ReportProgressDialog', () => ({
  ReportProgressDialog: () => null,
}));

describe('ReportExportButtons sync generation', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    generateReport.mockReset();
    downloadReport.mockReset();
    resetReport.mockReset();
    showToast.error.mockReset();
    showToast.success.mockReset();
    generateReport.mockResolvedValue(undefined);
  });

  it('requests synchronous PDF generation for shared table exports', async () => {
    render(
      <ReportExportButtons
        data={[{ student_name: 'Ahmad' }]}
        columns={[{ key: 'student_name', label: 'Student Name' }]}
        reportKey="student_admissions"
        title="Student Admissions Report"
        transformData={(rows) => rows}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }));

    expect(generateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reportKey: 'student_admissions',
        reportType: 'pdf',
        async: false,
      })
    );
  });

  it('requests synchronous Excel generation for shared table exports', async () => {
    render(
      <ReportExportButtons
        data={[{ student_name: 'Ahmad' }]}
        columns={[{ key: 'student_name', label: 'Student Name' }]}
        reportKey="student_admissions"
        title="Student Admissions Report"
        transformData={(rows) => rows}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

    expect(generateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        reportKey: 'student_admissions',
        reportType: 'excel',
        async: false,
      })
    );
  });
});
