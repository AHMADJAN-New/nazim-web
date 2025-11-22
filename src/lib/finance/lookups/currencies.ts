import { supabase } from '@/integrations/supabase/client';
import type { Currency, CurrencyFormData } from '@/types/finance';

const TABLE_NAME = 'financial_currencies';

export const currenciesApi = {
  /**
   * Fetch all currencies for an organization (includes global + org-specific)
   */
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<Currency[]> {
    let query = (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (organizationId === null) {
      // Super admin: show all
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
    } else {
      // Regular users: global (organization_id IS NULL) + their org's data
      query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
      if (schoolId) {
        query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
      }
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return (data || []) as Currency[];
  },

  /**
   * Get a single currency by ID
   */
  async getById(id: string): Promise<Currency | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as Currency;
  },

  /**
   * Create a new currency
   */
  async create(currency: CurrencyFormData & { organization_id: string; school_id?: string | null }): Promise<Currency> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(currency)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Currency;
  },

  /**
   * Update an existing currency
   */
  async update(id: string, currency: Partial<CurrencyFormData>): Promise<Currency> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...currency, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Currency;
  },

  /**
   * Soft delete a currency
   */
  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
