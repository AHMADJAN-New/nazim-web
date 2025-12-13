/**
 * Finance Hooks - Data fetching and mutations for finance module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    financeAccountsApi,
    incomeCategoriesApi,
    expenseCategoriesApi,
    financeProjectsApi,
    donorsApi,
    incomeEntriesApi,
    expenseEntriesApi,
    financeReportsApi,
} from '@/lib/api/client';
import { useAuth } from './useAuth';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
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
import {
    mapFinanceAccountApiToDomain,
    mapFinanceAccountFormToInsert,
    mapIncomeCategoryApiToDomain,
    mapIncomeCategoryFormToInsert,
    mapExpenseCategoryApiToDomain,
    mapExpenseCategoryFormToInsert,
    mapFinanceProjectApiToDomain,
    mapFinanceProjectFormToInsert,
    mapDonorApiToDomain,
    mapDonorFormToInsert,
    mapIncomeEntryApiToDomain,
    mapIncomeEntryFormToInsert,
    mapExpenseEntryApiToDomain,
    mapExpenseEntryFormToInsert,
    mapFinanceDashboardApiToDomain,
    mapDailyCashbookApiToDomain,
    mapIncomeVsExpenseReportApiToDomain,
    mapProjectSummaryReportApiToDomain,
    mapDonorSummaryReportApiToDomain,
    mapAccountBalancesReportApiToDomain,
} from '@/mappers/financeMapper';

// Re-export domain types
export type {
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
};

// ============================================
// Finance Account Hooks
// ============================================

export const useFinanceAccounts = (params?: { schoolId?: string; type?: string; isActive?: boolean }) => {
    const { user, profile } = useAuth();

    return useQuery<FinanceAccount[]>({
        queryKey: ['finance-accounts', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await financeAccountsApi.list({
                school_id: params?.schoolId,
                type: params?.type,
                is_active: params?.isActive,
            });
            return (data as FinanceApi.FinanceAccount[]).map(mapFinanceAccountApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateFinanceAccount = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: FinanceAccountFormData) => {
            const apiData = mapFinanceAccountFormToInsert(data);
            const result = await financeAccountsApi.create(apiData);
            return mapFinanceAccountApiToDomain(result as FinanceApi.FinanceAccount);
        },
        onSuccess: () => {
            showToast.success(t('toast.financeAccountCreated') || 'Account created successfully');
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.financeAccountCreateFailed') || 'Failed to create account');
        },
    });
};

export const useUpdateFinanceAccount = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: FinanceAccountFormData & { id: string }) => {
            const apiData = mapFinanceAccountFormToInsert(data);
            const result = await financeAccountsApi.update(id, apiData);
            return mapFinanceAccountApiToDomain(result as FinanceApi.FinanceAccount);
        },
        onSuccess: () => {
            showToast.success(t('toast.financeAccountUpdated') || 'Account updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.financeAccountUpdateFailed') || 'Failed to update account');
        },
    });
};

export const useDeleteFinanceAccount = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await financeAccountsApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.financeAccountDeleted') || 'Account deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            await queryClient.refetchQueries({ queryKey: ['finance-accounts'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.financeAccountDeleteFailed') || 'Failed to delete account');
        },
    });
};

// ============================================
// Income Category Hooks
// ============================================

export const useIncomeCategories = (params?: { schoolId?: string; isActive?: boolean }) => {
    const { user, profile } = useAuth();

    return useQuery<IncomeCategory[]>({
        queryKey: ['income-categories', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await incomeCategoriesApi.list({
                school_id: params?.schoolId,
                is_active: params?.isActive,
            });
            return (data as FinanceApi.IncomeCategory[]).map(mapIncomeCategoryApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateIncomeCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: IncomeCategoryFormData) => {
            const apiData = mapIncomeCategoryFormToInsert(data);
            const result = await incomeCategoriesApi.create(apiData);
            return mapIncomeCategoryApiToDomain(result as FinanceApi.IncomeCategory);
        },
        onSuccess: () => {
            showToast.success(t('toast.incomeCategoryCreated') || 'Income category created successfully');
            void queryClient.invalidateQueries({ queryKey: ['income-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create income category');
        },
    });
};

export const useUpdateIncomeCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: IncomeCategoryFormData & { id: string }) => {
            const apiData = mapIncomeCategoryFormToInsert(data);
            const result = await incomeCategoriesApi.update(id, apiData);
            return mapIncomeCategoryApiToDomain(result as FinanceApi.IncomeCategory);
        },
        onSuccess: () => {
            showToast.success(t('toast.incomeCategoryUpdated') || 'Income category updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['income-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update income category');
        },
    });
};

export const useDeleteIncomeCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await incomeCategoriesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.incomeCategoryDeleted') || 'Income category deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['income-categories'] });
            await queryClient.refetchQueries({ queryKey: ['income-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete income category');
        },
    });
};

// ============================================
// Expense Category Hooks
// ============================================

export const useExpenseCategories = (params?: { schoolId?: string; isActive?: boolean }) => {
    const { user, profile } = useAuth();

    return useQuery<ExpenseCategory[]>({
        queryKey: ['expense-categories', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await expenseCategoriesApi.list({
                school_id: params?.schoolId,
                is_active: params?.isActive,
            });
            return (data as FinanceApi.ExpenseCategory[]).map(mapExpenseCategoryApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateExpenseCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: ExpenseCategoryFormData) => {
            const apiData = mapExpenseCategoryFormToInsert(data);
            const result = await expenseCategoriesApi.create(apiData);
            return mapExpenseCategoryApiToDomain(result as FinanceApi.ExpenseCategory);
        },
        onSuccess: () => {
            showToast.success(t('toast.expenseCategoryCreated') || 'Expense category created successfully');
            void queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create expense category');
        },
    });
};

export const useUpdateExpenseCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: ExpenseCategoryFormData & { id: string }) => {
            const apiData = mapExpenseCategoryFormToInsert(data);
            const result = await expenseCategoriesApi.update(id, apiData);
            return mapExpenseCategoryApiToDomain(result as FinanceApi.ExpenseCategory);
        },
        onSuccess: () => {
            showToast.success(t('toast.expenseCategoryUpdated') || 'Expense category updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update expense category');
        },
    });
};

export const useDeleteExpenseCategory = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await expenseCategoriesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.expenseCategoryDeleted') || 'Expense category deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
            await queryClient.refetchQueries({ queryKey: ['expense-categories'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete expense category');
        },
    });
};

// ============================================
// Finance Project Hooks
// ============================================

export const useFinanceProjects = (params?: { schoolId?: string; status?: string; isActive?: boolean }) => {
    const { user, profile } = useAuth();

    return useQuery<FinanceProject[]>({
        queryKey: ['finance-projects', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await financeProjectsApi.list({
                school_id: params?.schoolId,
                status: params?.status,
                is_active: params?.isActive,
            });
            return (data as FinanceApi.FinanceProject[]).map(mapFinanceProjectApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateFinanceProject = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: FinanceProjectFormData) => {
            const apiData = mapFinanceProjectFormToInsert(data);
            const result = await financeProjectsApi.create(apiData);
            return mapFinanceProjectApiToDomain(result as FinanceApi.FinanceProject);
        },
        onSuccess: () => {
            showToast.success(t('toast.financeProjectCreated') || 'Project created successfully');
            void queryClient.invalidateQueries({ queryKey: ['finance-projects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create project');
        },
    });
};

export const useUpdateFinanceProject = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: FinanceProjectFormData & { id: string }) => {
            const apiData = mapFinanceProjectFormToInsert(data);
            const result = await financeProjectsApi.update(id, apiData);
            return mapFinanceProjectApiToDomain(result as FinanceApi.FinanceProject);
        },
        onSuccess: () => {
            showToast.success(t('toast.financeProjectUpdated') || 'Project updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['finance-projects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update project');
        },
    });
};

export const useDeleteFinanceProject = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await financeProjectsApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.financeProjectDeleted') || 'Project deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['finance-projects'] });
            await queryClient.refetchQueries({ queryKey: ['finance-projects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete project');
        },
    });
};

// ============================================
// Donor Hooks
// ============================================

export const useDonors = (params?: { type?: string; isActive?: boolean; search?: string }) => {
    const { user, profile } = useAuth();

    return useQuery<Donor[]>({
        queryKey: ['donors', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await donorsApi.list({
                type: params?.type,
                is_active: params?.isActive,
                search: params?.search,
            });
            return (data as FinanceApi.Donor[]).map(mapDonorApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateDonor = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: DonorFormData) => {
            const apiData = mapDonorFormToInsert(data);
            const result = await donorsApi.create(apiData);
            return mapDonorApiToDomain(result as FinanceApi.Donor);
        },
        onSuccess: () => {
            showToast.success(t('toast.donorCreated') || 'Donor created successfully');
            void queryClient.invalidateQueries({ queryKey: ['donors'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create donor');
        },
    });
};

export const useUpdateDonor = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: DonorFormData & { id: string }) => {
            const apiData = mapDonorFormToInsert(data);
            const result = await donorsApi.update(id, apiData);
            return mapDonorApiToDomain(result as FinanceApi.Donor);
        },
        onSuccess: () => {
            showToast.success(t('toast.donorUpdated') || 'Donor updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['donors'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update donor');
        },
    });
};

export const useDeleteDonor = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await donorsApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.donorDeleted') || 'Donor deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['donors'] });
            await queryClient.refetchQueries({ queryKey: ['donors'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete donor');
        },
    });
};

// ============================================
// Income Entry Hooks
// ============================================

export const useIncomeEntries = (params?: {
    schoolId?: string;
    accountId?: string;
    incomeCategoryId?: string;
    projectId?: string;
    donorId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    perPage?: number;
}) => {
    const { user, profile } = useAuth();

    return useQuery<IncomeEntry[]>({
        queryKey: ['income-entries', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await incomeEntriesApi.list({
                school_id: params?.schoolId,
                account_id: params?.accountId,
                income_category_id: params?.incomeCategoryId,
                project_id: params?.projectId,
                donor_id: params?.donorId,
                date_from: params?.dateFrom,
                date_to: params?.dateTo,
                search: params?.search,
                page: params?.page,
                per_page: params?.perPage,
            });
            // Handle both array and paginated response
            const entries = Array.isArray(data) ? data : (data as any).data || [];
            return (entries as FinanceApi.IncomeEntry[]).map(mapIncomeEntryApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateIncomeEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: IncomeEntryFormData) => {
            const apiData = mapIncomeEntryFormToInsert(data);
            const result = await incomeEntriesApi.create(apiData);
            return mapIncomeEntryApiToDomain(result as FinanceApi.IncomeEntry);
        },
        onSuccess: () => {
            showToast.success(t('toast.incomeEntryCreated') || 'Income entry created successfully');
            void queryClient.invalidateQueries({ queryKey: ['income-entries'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create income entry');
        },
    });
};

export const useUpdateIncomeEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: IncomeEntryFormData & { id: string }) => {
            const apiData = mapIncomeEntryFormToInsert(data);
            const result = await incomeEntriesApi.update(id, apiData);
            return mapIncomeEntryApiToDomain(result as FinanceApi.IncomeEntry);
        },
        onSuccess: () => {
            showToast.success(t('toast.incomeEntryUpdated') || 'Income entry updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['income-entries'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update income entry');
        },
    });
};

export const useDeleteIncomeEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await incomeEntriesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.incomeEntryDeleted') || 'Income entry deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['income-entries'] });
            await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
            await queryClient.refetchQueries({ queryKey: ['income-entries'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete income entry');
        },
    });
};

// ============================================
// Expense Entry Hooks
// ============================================

export const useExpenseEntries = (params?: {
    schoolId?: string;
    accountId?: string;
    expenseCategoryId?: string;
    projectId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    perPage?: number;
}) => {
    const { user, profile } = useAuth();

    return useQuery<ExpenseEntry[]>({
        queryKey: ['expense-entries', profile?.organization_id, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await expenseEntriesApi.list({
                school_id: params?.schoolId,
                account_id: params?.accountId,
                expense_category_id: params?.expenseCategoryId,
                project_id: params?.projectId,
                status: params?.status,
                date_from: params?.dateFrom,
                date_to: params?.dateTo,
                search: params?.search,
                page: params?.page,
                per_page: params?.perPage,
            });
            // Handle both array and paginated response
            const entries = Array.isArray(data) ? data : (data as any).data || [];
            return (entries as FinanceApi.ExpenseEntry[]).map(mapExpenseEntryApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateExpenseEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: ExpenseEntryFormData) => {
            const apiData = mapExpenseEntryFormToInsert(data);
            const result = await expenseEntriesApi.create(apiData);
            return mapExpenseEntryApiToDomain(result as FinanceApi.ExpenseEntry);
        },
        onSuccess: () => {
            showToast.success(t('toast.expenseEntryCreated') || 'Expense entry created successfully');
            void queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to create expense entry');
        },
    });
};

export const useUpdateExpenseEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: ExpenseEntryFormData & { id: string }) => {
            const apiData = mapExpenseEntryFormToInsert(data);
            const result = await expenseEntriesApi.update(id, apiData);
            return mapExpenseEntryApiToDomain(result as FinanceApi.ExpenseEntry);
        },
        onSuccess: () => {
            showToast.success(t('toast.expenseEntryUpdated') || 'Expense entry updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            void queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to update expense entry');
        },
    });
};

export const useDeleteExpenseEntry = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await expenseEntriesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.expenseEntryDeleted') || 'Expense entry deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['expense-entries'] });
            await queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
            await queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
            await queryClient.refetchQueries({ queryKey: ['expense-entries'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'Failed to delete expense entry');
        },
    });
};

// ============================================
// Finance Report Hooks
// ============================================

export const useFinanceDashboard = () => {
    const { user, profile } = useAuth();

    return useQuery<FinanceDashboard | null>({
        queryKey: ['finance-dashboard', profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return null;
            const data = await financeReportsApi.dashboard();
            return mapFinanceDashboardApiToDomain(data as FinanceApi.FinanceDashboard);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useDailyCashbook = (date: string, accountId?: string) => {
    const { user, profile } = useAuth();

    return useQuery<DailyCashbook | null>({
        queryKey: ['daily-cashbook', profile?.organization_id, date, accountId],
        queryFn: async () => {
            if (!user || !profile?.organization_id || !date) return null;
            const data = await financeReportsApi.dailyCashbook({ date, account_id: accountId });
            return mapDailyCashbookApiToDomain(data as FinanceApi.DailyCashbook);
        },
        enabled: !!user && !!profile?.organization_id && !!date,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useIncomeVsExpenseReport = (startDate: string, endDate: string, schoolId?: string) => {
    const { user, profile } = useAuth();

    return useQuery<IncomeVsExpenseReport | null>({
        queryKey: ['income-vs-expense-report', profile?.organization_id, startDate, endDate, schoolId],
        queryFn: async () => {
            if (!user || !profile?.organization_id || !startDate || !endDate) return null;
            const data = await financeReportsApi.incomeVsExpense({
                start_date: startDate,
                end_date: endDate,
                school_id: schoolId,
            });
            return mapIncomeVsExpenseReportApiToDomain(data as FinanceApi.IncomeVsExpenseReport);
        },
        enabled: !!user && !!profile?.organization_id && !!startDate && !!endDate,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useProjectSummaryReport = (status?: string) => {
    const { user, profile } = useAuth();

    return useQuery<ProjectSummaryReport | null>({
        queryKey: ['project-summary-report', profile?.organization_id, status],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return null;
            const data = await financeReportsApi.projectSummary({ status });
            return mapProjectSummaryReportApiToDomain(data as FinanceApi.ProjectSummaryReport);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useDonorSummaryReport = (startDate?: string, endDate?: string) => {
    const { user, profile } = useAuth();

    return useQuery<DonorSummaryReport | null>({
        queryKey: ['donor-summary-report', profile?.organization_id, startDate, endDate],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return null;
            const data = await financeReportsApi.donorSummary({
                start_date: startDate,
                end_date: endDate,
            });
            return mapDonorSummaryReportApiToDomain(data as FinanceApi.DonorSummaryReport);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useAccountBalancesReport = () => {
    const { user, profile } = useAuth();

    return useQuery<AccountBalancesReport | null>({
        queryKey: ['account-balances-report', profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return null;
            const data = await financeReportsApi.accountBalances();
            return mapAccountBalancesReportApiToDomain(data as FinanceApi.AccountBalancesReport);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};
