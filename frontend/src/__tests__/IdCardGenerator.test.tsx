import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdCardGenerator } from '@/components/id-cards/IdCardGenerator';

// Mock dependencies
vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    isRTL: false,
    language: 'en',
  }),
}));

vi.mock('@/hooks/useStudents', () => ({
  useStudents: () => ({
    data: [
      {
        id: '1',
        fullName: 'John Doe',
        admissionNumber: 'ADM001',
        studentCode: 'STU001',
        fatherName: 'Jane Doe',
        picturePath: null,
        currentClass: { name: 'Grade 1' },
        school: { schoolName: 'Test School' },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('IdCardGenerator', () => {
  const mockTemplates = [
    {
      id: 'template-1',
      name: 'Default Template',
      description: 'Default ID card template',
      layout_config_front: {
        enabledFields: ['studentName', 'studentCode', 'studentPhoto'],
        studentNamePosition: { x: 50, y: 30 },
        studentCodePosition: { x: 50, y: 50 },
        studentPhotoPosition: { x: 20, y: 50, width: 15, height: 20 },
        fontSize: 12,
        textColor: '#000000',
      },
      layout_config_back: null,
      background_image_path_front: null,
      background_image_path_back: null,
      card_size: 'CR80',
      is_default: true,
      is_active: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <IdCardGenerator
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
        organizationId="org-1"
      />
    );

    expect(screen.getByText('idCards.generateIdCards')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <IdCardGenerator
        isOpen={false}
        onClose={vi.fn()}
        templates={mockTemplates}
        organizationId="org-1"
      />
    );

    expect(screen.queryByText('idCards.generateIdCards')).not.toBeInTheDocument();
  });

  it('should display template selection', () => {
    render(
      <IdCardGenerator
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
        organizationId="org-1"
      />
    );

    expect(screen.getByText('idCards.selectTemplate')).toBeInTheDocument();
  });

  it('should display student selection', () => {
    render(
      <IdCardGenerator
        isOpen={true}
        onClose={vi.fn()}
        templates={mockTemplates}
        organizationId="org-1"
      />
    );

    expect(screen.getByText('idCards.selectStudents')).toBeInTheDocument();
  });
});



