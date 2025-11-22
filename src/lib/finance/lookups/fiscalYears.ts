import { supabase } from '@/integrations/supabase/client';
import type { FiscalYear, FiscalYearFormData } from '@/types/finance';

const TABLE_NAME = 'financial_fiscal_years';

export const fiscalYearsApi = {
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<FiscalYear[]> {
    let query = (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .is('deleted_at', null)
      .order('start_date', { ascending: false });

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
    return (data || []) as FiscalYear[];
  },

  async getById(id: string): Promise<FiscalYear | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as FiscalYear;
  },

  async create(fiscalYear: FiscalYearFormData & { organization_id: string; school_id?: string | null }): Promise<FiscalYear> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(fiscalYear)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as FiscalYear;
  },

  async update(id: string, fiscalYear: Partial<FiscalYearFormData>): Promise<FiscalYear> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...fiscalYear, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as FiscalYear;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  async closeFiscalYear(id: string, userId: string): Promise<FiscalYear> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({
        is_closed: true,
        closed_at: new Date().toISOString(),
        closed_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as FiscalYear;
  },
};
