import { supabase } from '@/integrations/supabase/client';
import type { CostCenter, CostCenterFormData } from '@/types/finance';

const TABLE_NAME = 'financial_cost_centers';

export const costCentersApi = {
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<CostCenter[]> {
    let query = (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (organizationId === null) {
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
    } else {
      query = query.eq('organization_id', organizationId);
      if (schoolId) {
        query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as CostCenter[];
  },

  async getById(id: string): Promise<CostCenter | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as CostCenter;
  },

  async create(costCenter: CostCenterFormData & { organization_id: string; school_id?: string | null }): Promise<CostCenter> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(costCenter)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CostCenter;
  },

  async update(id: string, costCenter: Partial<CostCenterFormData>): Promise<CostCenter> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...costCenter, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CostCenter;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
