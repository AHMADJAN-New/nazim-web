import { supabase } from '@/integrations/supabase/client';
import type { ExpenseCategory, ExpenseCategoryFormData } from '@/types/finance';

const TABLE_NAME = 'financial_expense_categories';

export const expenseCategoriesApi = {
  async getAll(organizationId: string | null, schoolId?: string | null): Promise<ExpenseCategory[]> {
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

    const { data, error} = await query;
    if (error) throw new Error(error.message);
    return (data || []) as ExpenseCategory[];
  },

  async getById(id: string): Promise<ExpenseCategory | null> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw new Error(error.message);
    return data as ExpenseCategory;
  },

  async create(category: ExpenseCategoryFormData & { organization_id: string; school_id?: string | null }): Promise<ExpenseCategory> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .insert(category)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ExpenseCategory;
  },

  async update(id: string, category: Partial<ExpenseCategoryFormData>): Promise<ExpenseCategory> {
    const { data, error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ ...category, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as ExpenseCategory;
  },

  async delete(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from(TABLE_NAME)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};
