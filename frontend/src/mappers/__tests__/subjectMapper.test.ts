import { describe, expect, it } from 'vitest';

import {
  mapClassSubjectApiToDomain,
  mapClassSubjectDomainToInsert,
} from '@/mappers/subjectMapper';
import type * as SubjectApi from '@/types/api/subject';

describe('subjectMapper', () => {
  it('maps class subject API subject_id to domain subjectId', () => {
    const api: SubjectApi.ClassSubject = {
      id: 'cs-1',
      class_subject_template_id: null,
      class_academic_year_id: 'cay-1',
      subject_id: 'subject-1',
      organization_id: 'org-1',
      teacher_id: null,
      room_id: null,
      credits: null,
      hours_per_week: 4,
      is_required: true,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    };

    const domain = mapClassSubjectApiToDomain(api);

    expect(domain.subjectId).toBe('subject-1');
    expect((domain as { subject_id?: string }).subject_id).toBeUndefined();
  });

  it('maps domain subjectId to API subject_id for insert payloads', () => {
    const payload = mapClassSubjectDomainToInsert({
      classAcademicYearId: 'cay-1',
      subjectId: 'subject-1',
      organizationId: 'org-1',
      isRequired: true,
    });

    expect(payload.subject_id).toBe('subject-1');
    expect(payload.class_academic_year_id).toBe('cay-1');
  });
});
