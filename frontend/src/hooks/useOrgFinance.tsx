/**
 * Org Finance Hooks - Data fetching and mutations for org-scoped finance (school_id = null).
 * Do not send school_id on any request; query keys include organization_id and default_school_id for cache isolation.
 */

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOfflineCachedQuery } from './useOfflineCachedQuery';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { orgFinanceApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import {
  mapCurrencyApiToDomain,
  mapCurrencyDomainToInsert,
  mapCurrencyDomainToUpdate,
  mapExchangeRateApiToDomain,
  mapExchangeRateDomainToInsert,
  mapExchangeRateDomainToUpdate,
} from '@/mappers/currencyMapper';
import {
  mapExpenseCategoryApiToDomain,
  mapExpenseCategoryFormToInsert,
  mapExpenseEntryApiToDomain,
  mapExpenseEntryFormToInsert,
  mapFinanceAccountApiToDomain,
  mapFinanceAccountFormToInsert,
  mapIncomeCategoryApiToDomain,
  mapIncomeCategoryFormToInsert,
  mapFinanceProjectApiToDomain,
  mapFinanceProjectFormToInsert,
  mapDonorApiToDomain,
  mapDonorFormToInsert,
  mapIncomeEntryApiToDomain,
  mapIncomeEntryFormToInsert,
  mapFinanceDashboardApiToDomain,
  mapDailyCashbookApiToDomain,
  mapIncomeVsExpenseReportApiToDomain,
  mapProjectSummaryReportApiToDomain,
  mapDonorSummaryReportApiToDomain,
  mapAccountBalancesReportApiToDomain,
} from '@/mappers/financeMapper';
import type * as CurrencyApi from '@/types/api/currency';
import type * as FinanceApi from '@/types/api/finance';
import type {
  FinanceAccount,
  FinanceAccountFormData,
  IncomeCategory,
  IncomeCategoryFormData,
  ExpenseCategory,
  ExpenseCategoryFormData,
  FinanceProject,
  FinanceProjectFormData,
  Donor,
  DonorFormData,
  IncomeEntry,
  IncomeEntryFormData,
  ExpenseEntry,
  ExpenseEntryFormData,
  FinanceDashboard,
  DailyCashbook,
  IncomeVsExpenseReport,
  ProjectSummaryReport,
  DonorSummaryReport,
  AccountBalancesReport,
} from '@/types/domain/finance';

const ORG_FINANCE_KEY = 'org-finance';

export const useOrgFinanceAccounts = (params?: { type?: string; isActive?: boolean }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'accounts', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<FinanceAccount[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.accounts.list({ type: params?.type, is_active: params?.isActive });
      return (Array.isArray(data) ? data : (data as { data?: FinanceApi.FinanceAccount[] })?.data ?? []).map(
        mapFinanceAccountApiToDomain
      );
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceIncomeCategories = (params?: { isActive?: boolean }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'income-categories', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<IncomeCategory[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.incomeCategories.list({ is_active: params?.isActive });
      return (Array.isArray(data) ? data : (data as { data?: FinanceApi.IncomeCategory[] })?.data ?? []).map(
        mapIncomeCategoryApiToDomain
      );
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceExpenseCategories = (params?: { isActive?: boolean }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'expense-categories', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<ExpenseCategory[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.expenseCategories.list({ is_active: params?.isActive });
      return (Array.isArray(data) ? data : (data as { data?: FinanceApi.ExpenseCategory[] })?.data ?? []).map(
        mapExpenseCategoryApiToDomain
      );
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceProjects = (params?: { status?: string; isActive?: boolean }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'projects', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<FinanceProject[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.projects.list({ status: params?.status, is_active: params?.isActive });
      return (Array.isArray(data) ? data : (data as { data?: FinanceApi.FinanceProject[] })?.data ?? []).map(
        mapFinanceProjectApiToDomain
      );
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceDonors = (params?: { type?: string; isActive?: boolean; search?: string }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'donors', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<Donor[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.donors.list(params);
      return (Array.isArray(data) ? data : (data as { data?: FinanceApi.Donor[] })?.data ?? []).map(mapDonorApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceCurrencies = (params?: { isActive?: boolean; isBase?: boolean }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'currencies', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.currencies.list({
        is_active: params?.isActive,
        is_base: params?.isBase,
      });
      const list = Array.isArray(data) ? data : (data as { data?: CurrencyApi.Currency[] })?.data ?? [];
      return (list as CurrencyApi.Currency[]).map(mapCurrencyApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOrgFinanceCurrency = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: import('@/types/domain/currency').CurrencyFormData) => {
      const apiData = mapCurrencyDomainToInsert(data);
      const result = await orgFinanceApi.currencies.create(apiData);
      return mapCurrencyApiToDomain(result as CurrencyApi.Currency);
    },
    onSuccess: () => {
      showToast.success(t('toast.currencyCreated') || 'Currency created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceCurrency = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: import('@/types/domain/currency').CurrencyFormData & { id: string }) => {
      const apiData = mapCurrencyDomainToUpdate(data);
      const result = await orgFinanceApi.currencies.update(id, apiData);
      return mapCurrencyApiToDomain(result as CurrencyApi.Currency);
    },
    onSuccess: () => {
      showToast.success(t('toast.currencyUpdated') || 'Currency updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceCurrency = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.currencies.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.currencyDeleted') || 'Currency deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useOrgFinanceExchangeRates = (params?: {
  fromCurrencyId?: string;
  toCurrencyId?: string;
  effectiveDate?: string;
  isActive?: boolean;
}) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'exchange-rates', profile?.organization_id, params];
  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.exchangeRates.list({
        from_currency_id: params?.fromCurrencyId,
        to_currency_id: params?.toCurrencyId,
        effective_date: params?.effectiveDate,
        is_active: params?.isActive,
      });
      const list = Array.isArray(data) ? data : (data as { data?: CurrencyApi.ExchangeRate[] })?.data ?? [];
      return (list as CurrencyApi.ExchangeRate[]).map(mapExchangeRateApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOrgFinanceExchangeRate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: import('@/types/domain/currency').ExchangeRateFormData) => {
      const apiData = mapExchangeRateDomainToInsert(data);
      const result = await orgFinanceApi.exchangeRates.create(apiData);
      return mapExchangeRateApiToDomain(result as CurrencyApi.ExchangeRate);
    },
    onSuccess: () => {
      showToast.success(t('toast.exchangeRateCreated') || 'Exchange rate created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceExchangeRate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: import('@/types/domain/currency').ExchangeRateFormData & { id: string }) => {
      const apiData = mapExchangeRateDomainToUpdate(data);
      const result = await orgFinanceApi.exchangeRates.update(id, apiData);
      return mapExchangeRateApiToDomain(result as CurrencyApi.ExchangeRate);
    },
    onSuccess: () => {
      showToast.success(t('toast.exchangeRateUpdated') || 'Exchange rate updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceExchangeRate = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.exchangeRates.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.exchangeRateDeleted') || 'Exchange rate deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useOrgFinanceIncomeEntries = (params?: {
  accountId?: string;
  incomeCategoryId?: string;
  projectId?: string;
  facilityId?: string;
  donorId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'income-entries', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<IncomeEntry[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.incomeEntries.list({
        account_id: params?.accountId,
        income_category_id: params?.incomeCategoryId,
        project_id: params?.projectId,
        facility_id: params?.facilityId,
        donor_id: params?.donorId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        search: params?.search,
        page: params?.page,
        per_page: params?.perPage,
      });
      const entries = Array.isArray(data) ? data : (data as { data?: FinanceApi.IncomeEntry[] })?.data ?? [];
      return (entries as FinanceApi.IncomeEntry[]).map(mapIncomeEntryApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFinanceExpenseEntries = (params?: {
  accountId?: string;
  expenseCategoryId?: string;
  projectId?: string;
  facilityId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  perPage?: number;
}) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'expense-entries', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<ExpenseEntry[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.expenseEntries.list({
        account_id: params?.accountId,
        expense_category_id: params?.expenseCategoryId,
        project_id: params?.projectId,
        facility_id: params?.facilityId,
        status: params?.status,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        search: params?.search,
        page: params?.page,
        per_page: params?.perPage,
      });
      const entries = Array.isArray(data) ? data : (data as { data?: FinanceApi.ExpenseEntry[] })?.data ?? [];
      return (entries as FinanceApi.ExpenseEntry[]).map(mapExpenseEntryApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFinanceDashboard = (params?: { targetCurrencyId?: string }) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'dashboard', profile?.organization_id, profile?.default_school_id ?? null, params];
  return useOfflineCachedQuery<FinanceDashboard | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;
      const data = await orgFinanceApi.dashboard(params);
      return mapFinanceDashboardApiToDomain(data as FinanceApi.FinanceDashboard);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  });
};

// Org account transactions (income + expense for one account) for side panel
export interface OrgAccountTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: Date;
  referenceNo: string | null;
  description: string | null;
  category: string;
  paymentMethod: string;
}

export interface OrgAccountTransactionsData {
  latestTransaction: OrgAccountTransaction | null;
  recentTransactions: OrgAccountTransaction[];
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  isLoading: boolean;
}

export const useOrgAccountTransactions = (accountId?: string): OrgAccountTransactionsData => {
  const { data: incomeEntries = [], isLoading: incomeLoading } = useOrgFinanceIncomeEntries(
    accountId ? { accountId, perPage: 50 } : undefined
  );
  const { data: expenseEntries = [], isLoading: expenseLoading } = useOrgFinanceExpenseEntries(
    accountId ? { accountId, perPage: 50 } : undefined
  );

  return useMemo(() => {
    const isLoading = incomeLoading || expenseLoading;
    if (!accountId || isLoading) {
      return {
        latestTransaction: null,
        recentTransactions: [],
        totalIncome: 0,
        totalExpense: 0,
        netBalance: 0,
        transactionCount: 0,
        isLoading,
      };
    }
    const transactions: OrgAccountTransaction[] = [
      ...incomeEntries.map((entry) => ({
        id: entry.id,
        type: 'income' as const,
        amount: entry.amount,
        date: entry.date,
        referenceNo: entry.referenceNo,
        description: entry.description,
        category: entry.incomeCategory?.name ?? '—',
        paymentMethod: entry.paymentMethod ?? 'cash',
      })),
      ...expenseEntries.map((entry) => ({
        id: entry.id,
        type: 'expense' as const,
        amount: entry.amount,
        date: entry.date,
        referenceNo: entry.referenceNo,
        description: entry.description,
        category: entry.expenseCategory?.name ?? '—',
        paymentMethod: entry.paymentMethod ?? 'cash',
      })),
    ];
    transactions.sort((a, b) => (b.date instanceof Date ? b.date.getTime() : 0) - (a.date instanceof Date ? a.date.getTime() : 0));
    const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    return {
      latestTransaction: transactions[0] ?? null,
      recentTransactions: transactions.slice(0, 10),
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      isLoading: false,
    };
  }, [accountId, incomeEntries, expenseEntries, incomeLoading, expenseLoading]);
};

export const useOrgFinanceDailyCashbook = (date: string, accountId?: string) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'daily-cashbook', profile?.organization_id, profile?.default_school_id ?? null, date, accountId];
  return useOfflineCachedQuery<DailyCashbook | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id || !date) return null;
      const data = await orgFinanceApi.reports.dailyCashbook({ date, account_id: accountId });
      return mapDailyCashbookApiToDomain(data as FinanceApi.DailyCashbook);
    },
    enabled: !!user && !!profile?.organization_id && !!date,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFinanceIncomeVsExpenseReport = (dateFrom?: string, dateTo?: string) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'income-vs-expense', profile?.organization_id, profile?.default_school_id ?? null, dateFrom, dateTo];
  return useOfflineCachedQuery<IncomeVsExpenseReport | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;
      const data = await orgFinanceApi.reports.incomeVsExpense({ date_from: dateFrom, date_to: dateTo });
      return mapIncomeVsExpenseReportApiToDomain(data as FinanceApi.IncomeVsExpenseReport);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceProjectSummaryReport = (status?: string) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'project-summary', profile?.organization_id, profile?.default_school_id ?? null, status];
  return useOfflineCachedQuery<ProjectSummaryReport | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;
      const data = await orgFinanceApi.reports.projectSummary({ status });
      return mapProjectSummaryReportApiToDomain(data as FinanceApi.ProjectSummaryReport);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceDonorSummaryReport = (startDate?: string, endDate?: string) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'donor-summary', profile?.organization_id, profile?.default_school_id ?? null, startDate, endDate];
  return useOfflineCachedQuery<DonorSummaryReport | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;
      const data = await orgFinanceApi.reports.donorSummary({ start_date: startDate, end_date: endDate });
      return mapDonorSummaryReportApiToDomain(data as FinanceApi.DonorSummaryReport);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFinanceAccountBalancesReport = () => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'account-balances', profile?.organization_id, profile?.default_school_id ?? null];
  return useOfflineCachedQuery<AccountBalancesReport | null>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return null;
      const data = await orgFinanceApi.reports.accountBalances();
      return mapAccountBalancesReportApiToDomain(data as FinanceApi.AccountBalancesReport);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateOrgFinanceAccount = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: FinanceAccountFormData) => {
      const apiData = mapFinanceAccountFormToInsert(data);
      const { school_id: _, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.accounts.create(payload);
      return mapFinanceAccountApiToDomain(result as FinanceApi.FinanceAccount);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeAccountCreated') || 'Account created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceAccount = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: FinanceAccountFormData & { id: string }) => {
      const apiData = mapFinanceAccountFormToInsert(data);
      const { school_id: __, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.accounts.update(id, payload);
      return mapFinanceAccountApiToDomain(result as FinanceApi.FinanceAccount);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeAccountUpdated') || 'Account updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceAccount = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.accounts.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeAccountDeleted') || 'Account deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceIncomeCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: IncomeCategoryFormData) => {
      const apiData = mapIncomeCategoryFormToInsert(data);
      const { school_id: _s, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.incomeCategories.create(payload);
      return mapIncomeCategoryApiToDomain(result as FinanceApi.IncomeCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeCategoryCreated') || 'Income category created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceIncomeCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: IncomeCategoryFormData & { id: string }) => {
      const apiData = mapIncomeCategoryFormToInsert(data);
      const { school_id: _s2, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.incomeCategories.update(id, payload);
      return mapIncomeCategoryApiToDomain(result as FinanceApi.IncomeCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeCategoryUpdated') || 'Income category updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceIncomeCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.incomeCategories.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeCategoryDeleted') || 'Income category deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: ExpenseCategoryFormData) => {
      const apiData = mapExpenseCategoryFormToInsert(data);
      const { school_id: _s3, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.expenseCategories.create(payload);
      return mapExpenseCategoryApiToDomain(result as FinanceApi.ExpenseCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseCategoryCreated') || 'Expense category created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: ExpenseCategoryFormData & { id: string }) => {
      const apiData = mapExpenseCategoryFormToInsert(data);
      const { school_id: _s4, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.expenseCategories.update(id, payload);
      return mapExpenseCategoryApiToDomain(result as FinanceApi.ExpenseCategory);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseCategoryUpdated') || 'Expense category updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceExpenseCategory = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.expenseCategories.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseCategoryDeleted') || 'Expense category deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceDonor = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: DonorFormData) => {
      const apiData = mapDonorFormToInsert(data);
      const { school_id: _d, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.donors.create(payload);
      return mapDonorApiToDomain(result as FinanceApi.Donor);
    },
    onSuccess: () => {
      showToast.success(t('toast.donorCreated') || 'Donor created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceDonor = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: DonorFormData & { id: string }) => {
      const apiData = mapDonorFormToInsert(data);
      const { school_id: _d2, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.donors.update(id, payload);
      return mapDonorApiToDomain(result as FinanceApi.Donor);
    },
    onSuccess: () => {
      showToast.success(t('toast.donorUpdated') || 'Donor updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceDonor = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.donors.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.donorDeleted') || 'Donor deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceProject = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: FinanceProjectFormData) => {
      const apiData = mapFinanceProjectFormToInsert(data);
      const { school_id: _p, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.projects.create(payload);
      return mapFinanceProjectApiToDomain(result as FinanceApi.FinanceProject);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeProjectCreated') || 'Project created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceProject = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: FinanceProjectFormData & { id: string }) => {
      const apiData = mapFinanceProjectFormToInsert(data);
      const { school_id: _p2, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.projects.update(id, payload);
      return mapFinanceProjectApiToDomain(result as FinanceApi.FinanceProject);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeProjectUpdated') || 'Project updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceProject = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.projects.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.financeProjectDeleted') || 'Project deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceExpenseEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: ExpenseEntryFormData) => {
      const apiData = mapExpenseEntryFormToInsert(data);
      const { school_id: _e, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.expenseEntries.create(payload);
      return mapExpenseEntryApiToDomain(result as FinanceApi.ExpenseEntry);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseEntryCreated') || 'Expense entry created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceExpenseEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: ExpenseEntryFormData & { id: string }) => {
      const apiData = mapExpenseEntryFormToInsert(data);
      const { school_id: _e2, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.expenseEntries.update(id, payload);
      return mapExpenseEntryApiToDomain(result as FinanceApi.ExpenseEntry);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseEntryUpdated') || 'Expense entry updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceExpenseEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.expenseEntries.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.expenseEntryDeleted') || 'Expense entry deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useCreateOrgFinanceIncomeEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: IncomeEntryFormData) => {
      const apiData = mapIncomeEntryFormToInsert(data);
      const { school_id: _i, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.incomeEntries.create(payload);
      return mapIncomeEntryApiToDomain(result as FinanceApi.IncomeEntry);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeEntryCreated') || 'Income entry created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useUpdateOrgFinanceIncomeEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ id, ...data }: IncomeEntryFormData & { id: string }) => {
      const apiData = mapIncomeEntryFormToInsert(data);
      const { school_id: _i2, ...payload } = apiData as Record<string, unknown>;
      const result = await orgFinanceApi.incomeEntries.update(id, payload);
      return mapIncomeEntryApiToDomain(result as FinanceApi.IncomeEntry);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeEntryUpdated') || 'Income entry updated');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useDeleteOrgFinanceIncomeEntry = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.incomeEntries.delete(id);
    },
    onSuccess: () => {
      showToast.success(t('toast.incomeEntryDeleted') || 'Income entry deleted');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

/** Org-to-school transfer (Option B) */
export interface OrgSchoolTransferRow {
  id: string;
  organization_id: string;
  school_id: string;
  org_account_id: string;
  school_account_id: string;
  currency_id: string;
  amount: string | number;
  transfer_date: string;
  reference_no: string | null;
  notes: string | null;
  status: string;
  org_expense_entry_id: string;
  school_income_entry_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  school?: { id: string; name: string };
  org_account?: { id: string; name: string; code: string | null };
  school_account?: { id: string; name: string; code: string | null };
  currency?: { id: string; code: string; symbol: string | null };
}

export const useOrgFinanceTransfers = (params?: {
  schoolId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'transfers', profile?.organization_id, params];
  return useOfflineCachedQuery<OrgSchoolTransferRow[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.transfers.list({
        school_id: params?.schoolId,
        date_from: params?.dateFrom,
        date_to: params?.dateTo,
        page: params?.page,
        per_page: params?.perPage,
      });
      const list = Array.isArray(data) ? data : (data as { data?: OrgSchoolTransferRow[] })?.data ?? [];
      return list as OrgSchoolTransferRow[];
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateOrgFinanceTransfer = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: {
      school_id: string;
      org_account_id: string;
      school_account_id: string;
      amount: number;
      transfer_date: string;
      org_expense_category_id: string;
      school_income_category_id: string;
      reference_no?: string;
      notes?: string;
    }) => {
      const result = await orgFinanceApi.transfers.create(data);
      return result as OrgSchoolTransferRow;
    },
    onSuccess: () => {
      showToast.success(t('toast.saved') || 'Transfer created');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY] });
    },
    onError: (e: Error) => showToast.error(e.message),
  });
};

export const useSchoolFinanceAccounts = (schoolId: string | null) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'school-accounts', profile?.organization_id, schoolId];
  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id || !schoolId) return [];
      return orgFinanceApi.schoolFinanceAccounts(schoolId);
    },
    enabled: !!user && !!profile?.organization_id && !!schoolId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useSchoolIncomeCategories = (schoolId: string | null) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'school-income-categories', profile?.organization_id, schoolId];
  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id || !schoolId) return [];
      return orgFinanceApi.schoolIncomeCategories(schoolId);
    },
    enabled: !!user && !!profile?.organization_id && !!schoolId,
    staleTime: 2 * 60 * 1000,
  });
};

/** Org-scoped finance document (same shape as school; school_id is null). */
export interface OrgFinanceDocument {
  id: string;
  organization_id: string;
  school_id: string | null;
  document_type: string;
  title: string;
  description: string | null;
  amount: string | null;
  reference_number: string | null;
  document_date: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export const useOrgFinanceDocuments = (filters?: {
  documentType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const { user, profile } = useAuth();
  const queryKey = [ORG_FINANCE_KEY, 'finance-documents', profile?.organization_id, filters];
  return useOfflineCachedQuery<OrgFinanceDocument[]>({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'org-finance.list',
    queryKey,

    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const params: Record<string, string> = {};
      if (filters?.documentType && filters.documentType !== 'all') params.document_type = filters.documentType;
      if (filters?.startDate) params.start_date = filters.startDate;
      if (filters?.endDate) params.end_date = filters.endDate;
      if (filters?.search) params.search = filters.search;
      const data = await orgFinanceApi.financeDocuments.list(params);
      return (Array.isArray(data) ? data : []) as OrgFinanceDocument[];
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateOrgFinanceDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const result = await orgFinanceApi.financeDocuments.create(formData);
      return result as OrgFinanceDocument;
    },
    onSuccess: () => {
      showToast.success(t('toast.financeDocumentCreated') || 'Document uploaded');
      void queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY, 'finance-documents'] });
    },
    onError: (e: Error) => showToast.error(e.message || (t('toast.financeDocumentCreateFailed') ?? 'Upload failed')),
  });
};

export const useDeleteOrgFinanceDocument = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      await orgFinanceApi.financeDocuments.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.financeDocumentDeleted') || 'Document deleted');
      await queryClient.invalidateQueries({ queryKey: [ORG_FINANCE_KEY, 'finance-documents'] });
      await queryClient.refetchQueries({ queryKey: [ORG_FINANCE_KEY, 'finance-documents'] });
    },
    onError: (e: Error) => showToast.error(e.message || (t('toast.financeDocumentDeleteFailed') ?? 'Delete failed')),
  });
};

export const useDownloadOrgFinanceDocument = () => {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = `${base}/org-finance/finance-documents/${id}/download`;
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to download document');
      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition');
      const filename = cd ? cd.split('filename=')[1]?.replace(/"/g, '') : 'document';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    },
    onError: (e: Error) => showToast.error(e.message || (t('toast.financeDocumentDownloadFailed') ?? 'Download failed')),
  });
};
