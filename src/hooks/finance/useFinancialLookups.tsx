import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  currenciesApi,
  fiscalYearsApi,
  costCentersApi,
  incomeCategoriesApi,
  expenseCategoriesApi,
  paymentMethodsApi,
  assetCategoriesApi,
  fundTypesApi,
  debtCategoriesApi,
  financialAccountsApi,
} from '@/lib/finance/lookups';
import type {
  Currency,
  FiscalYear,
  CostCenter,
  IncomeCategory,
  ExpenseCategory,
  PaymentMethod,
  AssetCategory,
  FundType,
  DebtCategory,
  FinancialAccount,
  CurrencyFormData,
  FiscalYearFormData,
  CostCenterFormData,
  IncomeCategoryFormData,
  ExpenseCategoryFormData,
  PaymentMethodFormData,
  AssetCategoryFormData,
  FundTypeFormData,
  DebtCategoryFormData,
  FinancialAccountFormData,
} from '@/types/finance';

// =============================================================================
// Currencies
// =============================================================================

export const useCurrencies = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['currencies', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await currenciesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateCurrency = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CurrencyFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');

      const organizationId = profile.role === 'super_admin' ? null : profile.organization_id;
      if (!organizationId && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await currenciesApi.create({
        ...data,
        organization_id: organizationId || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create currency: ${error.message}`);
    },
  });
};

export const useUpdateCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CurrencyFormData> & { id: string }) => {
      return await currenciesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update currency: ${error.message}`);
    },
  });
};

export const useDeleteCurrency = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await currenciesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      toast.success('Currency deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete currency: ${error.message}`);
    },
  });
};

// =============================================================================
// Fiscal Years
// =============================================================================

export const useFiscalYears = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['fiscal-years', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await fiscalYearsApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateFiscalYear = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: FiscalYearFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await fiscalYearsApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create fiscal year: ${error.message}`);
    },
  });
};

export const useUpdateFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FiscalYearFormData> & { id: string }) => {
      return await fiscalYearsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fiscal year: ${error.message}`);
    },
  });
};

export const useDeleteFiscalYear = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await fiscalYearsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete fiscal year: ${error.message}`);
    },
  });
};

export const useCloseFiscalYear = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');
      return await fiscalYearsApi.closeFiscalYear(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal-years'] });
      toast.success('Fiscal year closed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to close fiscal year: ${error.message}`);
    },
  });
};

// =============================================================================
// Cost Centers
// =============================================================================

export const useCostCenters = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['cost-centers', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await costCentersApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateCostCenter = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CostCenterFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await costCentersApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('Cost center created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create cost center: ${error.message}`);
    },
  });
};

export const useUpdateCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CostCenterFormData> & { id: string }) => {
      return await costCentersApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('Cost center updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update cost center: ${error.message}`);
    },
  });
};

export const useDeleteCostCenter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await costCentersApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      toast.success('Cost center deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete cost center: ${error.message}`);
    },
  });
};

// =============================================================================
// Income Categories
// =============================================================================

export const useIncomeCategories = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['income-categories', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await incomeCategoriesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateIncomeCategory = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: IncomeCategoryFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await incomeCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create income category: ${error.message}`);
    },
  });
};

export const useUpdateIncomeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<IncomeCategoryFormData> & { id: string }) => {
      return await incomeCategoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update income category: ${error.message}`);
    },
  });
};

export const useDeleteIncomeCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await incomeCategoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income-categories'] });
      toast.success('Income category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete income category: ${error.message}`);
    },
  });
};

// =============================================================================
// Expense Categories
// =============================================================================

export const useExpenseCategories = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['expense-categories', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await expenseCategoriesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: ExpenseCategoryFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await expenseCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create expense category: ${error.message}`);
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ExpenseCategoryFormData> & { id: string }) => {
      return await expenseCategoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update expense category: ${error.message}`);
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await expenseCategoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      toast.success('Expense category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expense category: ${error.message}`);
    },
  });
};

// =============================================================================
// Payment Methods
// =============================================================================

export const usePaymentMethods = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['payment-methods', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await paymentMethodsApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: PaymentMethodFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await paymentMethodsApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Payment method created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payment method: ${error.message}`);
    },
  });
};

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PaymentMethodFormData> & { id: string }) => {
      return await paymentMethodsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Payment method updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payment method: ${error.message}`);
    },
  });
};

export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await paymentMethodsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Payment method deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete payment method: ${error.message}`);
    },
  });
};

// =============================================================================
// Asset Categories
// =============================================================================

export const useAssetCategories = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['asset-categories', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await assetCategoriesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateAssetCategory = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: AssetCategoryFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await assetCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success('Asset category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create asset category: ${error.message}`);
    },
  });
};

export const useUpdateAssetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<AssetCategoryFormData> & { id: string }) => {
      return await assetCategoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success('Asset category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update asset category: ${error.message}`);
    },
  });
};

export const useDeleteAssetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await assetCategoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      toast.success('Asset category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete asset category: ${error.message}`);
    },
  });
};

// =============================================================================
// Fund Types
// =============================================================================

export const useFundTypes = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['fund-types', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await fundTypesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateFundType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: FundTypeFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await fundTypesApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-types'] });
      toast.success('Fund type created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create fund type: ${error.message}`);
    },
  });
};

export const useUpdateFundType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FundTypeFormData> & { id: string }) => {
      return await fundTypesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-types'] });
      toast.success('Fund type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update fund type: ${error.message}`);
    },
  });
};

export const useDeleteFundType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await fundTypesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fund-types'] });
      toast.success('Fund type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete fund type: ${error.message}`);
    },
  });
};

// =============================================================================
// Debt Categories
// =============================================================================

export const useDebtCategories = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['debt-categories', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await debtCategoriesApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateDebtCategory = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: DebtCategoryFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await debtCategoriesApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-categories'] });
      toast.success('Debt category created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create debt category: ${error.message}`);
    },
  });
};

export const useUpdateDebtCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DebtCategoryFormData> & { id: string }) => {
      return await debtCategoriesApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-categories'] });
      toast.success('Debt category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update debt category: ${error.message}`);
    },
  });
};

export const useDeleteDebtCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await debtCategoriesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debt-categories'] });
      toast.success('Debt category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete debt category: ${error.message}`);
    },
  });
};

// =============================================================================
// Financial Accounts
// =============================================================================

export const useFinancialAccounts = (organizationId?: string, schoolId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['financial-accounts', organizationId || profile?.organization_id, schoolId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const orgId = organizationId !== undefined ? organizationId : profile.organization_id;
      return await financialAccountsApi.getAll(orgId, schoolId);
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateFinancialAccount = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: FinancialAccountFormData & { school_id?: string | null }) => {
      if (!user || !profile) throw new Error('User not authenticated');
      if (!profile.organization_id && profile.role !== 'super_admin') {
        throw new Error('User must be assigned to an organization');
      }

      return await financialAccountsApi.create({
        ...data,
        organization_id: profile.organization_id || '',
        school_id: data.school_id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      toast.success('Financial account created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create financial account: ${error.message}`);
    },
  });
};

export const useUpdateFinancialAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinancialAccountFormData> & { id: string }) => {
      return await financialAccountsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      toast.success('Financial account updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update financial account: ${error.message}`);
    },
  });
};

export const useDeleteFinancialAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await financialAccountsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      toast.success('Financial account deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete financial account: ${error.message}`);
    },
  });
};
