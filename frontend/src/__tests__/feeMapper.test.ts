import { describe, expect, it } from 'vitest';

import { mapFeeStructureApiToDomain } from '@/mappers/feeMapper';

describe('mapFeeStructureApiToDomain', () => {
  it('maps fee structure values into domain shape', () => {
    const feeStructure = mapFeeStructureApiToDomain({
      id: 'fs-1',
      organization_id: 'org-1',
      school_id: null,
      academic_year_id: 'ay-1',
      class_id: null,
      class_academic_year_id: null,
      name: 'Grade 1 Monthly Fee',
      code: 'G1_MONTHLY',
      description: null,
      fee_type: 'monthly',
      amount: 500,
      currency_id: null,
      due_date: '2024-01-31',
      start_date: '2024-01-01',
      end_date: null,
      is_active: true,
      is_required: true,
      display_order: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      deleted_at: null,
    });

    expect(feeStructure.name).toBe('Grade 1 Monthly Fee');
    expect(feeStructure.feeType).toBe('monthly');
    expect(feeStructure.amount).toBe(500);
    expect(feeStructure.dueDate?.toISOString()).toContain('2024-01-31');
  });
});
