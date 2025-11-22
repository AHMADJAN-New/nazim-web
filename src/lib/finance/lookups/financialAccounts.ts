import { supabase } from '@/integrations/supabase/client';
import type { FinancialAccount, FinancialAccountFormData } from '@/types/finance';

const TABLE_NAME = 'financial_accounts';

export const financialAccountsApi = {
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<FinancialAccount[]> {
    let query = (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .is('deleted_at', null)
      .order('code', { ascending: true });

    if (organizationId === null) {
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
    } else {
      query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
      if (schoolId) {
        query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as FinancialAccount[];
  },

  async getById(id: string): Promise<FinancialAccount | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as FinancialAccount;
  },

  async create(account: FinancialAccountFormData & { organization_id: string; school_id?: string | null }): Promise<FinancialAccount> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(account)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as FinancialAccount;
  },

  async update(id: string, account: Partial<FinancialAccountFormData>): Promise<FinancialAccount> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...account, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as FinancialAccount;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
