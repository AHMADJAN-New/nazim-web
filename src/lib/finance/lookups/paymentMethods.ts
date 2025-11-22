import { supabase } from '@/integrations/supabase/client';
import type { PaymentMethod, PaymentMethodFormData } from '@/types/finance';

const TABLE_NAME = 'financial_payment_methods';

export const paymentMethodsApi = {
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<PaymentMethod[]> {
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
      query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
      if (schoolId) {
        query = query.or(`school_id.is.null,school_id.eq.${schoolId}`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []) as PaymentMethod[];
  },

  async getById(id: string): Promise<PaymentMethod | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as PaymentMethod;
  },

  async create(method: PaymentMethodFormData & { organization_id: string; school_id?: string | null }): Promise<PaymentMethod> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(method)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PaymentMethod;
  },

  async update(id: string, method: Partial<PaymentMethodFormData>): Promise<PaymentMethod> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...method, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PaymentMethod;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
