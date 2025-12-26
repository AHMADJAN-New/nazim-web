/**
 * Currency Hooks - Data fetching and mutations for currency module
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { currenciesApi, exchangeRatesApi } from '@/lib/api/client';
import { useAuth } from './useAuth';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import type * as CurrencyApi from '@/types/api/currency';
import type {
    Currency,
    CurrencyFormData,
    ExchangeRate,
    ExchangeRateFormData,
    CurrencyConversion,
} from '@/types/domain/currency';
import {
    mapCurrencyApiToDomain,
    mapCurrencyDomainToInsert,
    mapCurrencyDomainToUpdate,
    mapExchangeRateApiToDomain,
    mapExchangeRateDomainToInsert,
    mapExchangeRateDomainToUpdate,
} from '@/mappers/currencyMapper';

// Re-export domain types
export type {
    Currency,
    CurrencyFormData,
    ExchangeRate,
    ExchangeRateFormData,
    CurrencyConversion,
};

// ============================================
// Currency Hooks
// ============================================

export const useCurrencies = (params?: { isActive?: boolean; isBase?: boolean }) => {
    const { user, profile } = useAuth();

    return useQuery<Currency[]>({
        queryKey: ['currencies', profile?.organization_id, profile?.default_school_id ?? null, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await currenciesApi.list({
                is_active: params?.isActive,
                is_base: params?.isBase,
            });
            return (data as CurrencyApi.Currency[]).map(mapCurrencyApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateCurrency = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: CurrencyFormData) => {
            const apiData = mapCurrencyDomainToInsert(data);
            const result = await currenciesApi.create(apiData);
            return mapCurrencyApiToDomain(result as CurrencyApi.Currency);
        },
        onSuccess: () => {
            showToast.success(t('toast.currencyCreated') || 'Currency created successfully');
            void queryClient.invalidateQueries({ queryKey: ['currencies'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.currencyCreateFailed') || 'Failed to create currency');
        },
    });
};

export const useUpdateCurrency = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: CurrencyFormData & { id: string }) => {
            const apiData = mapCurrencyDomainToUpdate(data);
            const result = await currenciesApi.update(id, apiData);
            return mapCurrencyApiToDomain(result as CurrencyApi.Currency);
        },
        onSuccess: () => {
            showToast.success(t('toast.currencyUpdated') || 'Currency updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['currencies'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.currencyUpdateFailed') || 'Failed to update currency');
        },
    });
};

export const useDeleteCurrency = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await currenciesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.currencyDeleted') || 'Currency deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['currencies'] });
            await queryClient.refetchQueries({ queryKey: ['currencies'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.currencyDeleteFailed') || 'Failed to delete currency');
        },
    });
};

export const useCurrency = (id: string) => {
    const { user, profile } = useAuth();

    return useQuery<Currency | null>({
        queryKey: ['currency', id, profile?.organization_id, profile?.default_school_id ?? null],
        queryFn: async () => {
            if (!user || !profile?.organization_id || !id) return null;
            const data = await currenciesApi.get(id);
            return mapCurrencyApiToDomain(data as CurrencyApi.Currency);
        },
        enabled: !!user && !!profile?.organization_id && !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// ============================================
// Exchange Rate Hooks
// ============================================

export const useExchangeRates = (params?: {
    fromCurrencyId?: string;
    toCurrencyId?: string;
    effectiveDate?: string;
    isActive?: boolean;
}) => {
    const { user, profile } = useAuth();

    return useQuery<ExchangeRate[]>({
        queryKey: ['exchange-rates', profile?.organization_id, profile?.default_school_id ?? null, params],
        queryFn: async () => {
            if (!user || !profile?.organization_id) return [];
            const data = await exchangeRatesApi.list({
                from_currency_id: params?.fromCurrencyId,
                to_currency_id: params?.toCurrencyId,
                effective_date: params?.effectiveDate,
                is_active: params?.isActive,
            });
            return (data as CurrencyApi.ExchangeRate[]).map(mapExchangeRateApiToDomain);
        },
        enabled: !!user && !!profile?.organization_id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

export const useCreateExchangeRate = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: ExchangeRateFormData) => {
            const apiData = mapExchangeRateDomainToInsert(data);
            const result = await exchangeRatesApi.create(apiData);
            return mapExchangeRateApiToDomain(result as CurrencyApi.ExchangeRate);
        },
        onSuccess: () => {
            showToast.success(t('toast.exchangeRateCreated') || 'Exchange rate created successfully');
            void queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.exchangeRateCreateFailed') || 'Failed to create exchange rate');
        },
    });
};

export const useUpdateExchangeRate = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async ({ id, ...data }: ExchangeRateFormData & { id: string }) => {
            const apiData = mapExchangeRateDomainToUpdate(data);
            const result = await exchangeRatesApi.update(id, apiData);
            return mapExchangeRateApiToDomain(result as CurrencyApi.ExchangeRate);
        },
        onSuccess: () => {
            showToast.success(t('toast.exchangeRateUpdated') || 'Exchange rate updated successfully');
            void queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.exchangeRateUpdateFailed') || 'Failed to update exchange rate');
        },
    });
};

export const useDeleteExchangeRate = () => {
    const queryClient = useQueryClient();
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (id: string) => {
            await exchangeRatesApi.delete(id);
        },
        onSuccess: async () => {
            showToast.success(t('toast.exchangeRateDeleted') || 'Exchange rate deleted successfully');
            await queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
            await queryClient.refetchQueries({ queryKey: ['exchange-rates'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.exchangeRateDeleteFailed') || 'Failed to delete exchange rate');
        },
    });
};

export const useExchangeRate = (id: string) => {
    const { user, profile } = useAuth();

    return useQuery<ExchangeRate | null>({
        queryKey: ['exchange-rate', id, profile?.organization_id, profile?.default_school_id ?? null],
        queryFn: async () => {
            if (!user || !profile?.organization_id || !id) return null;
            const data = await exchangeRatesApi.get(id);
            return mapExchangeRateApiToDomain(data as CurrencyApi.ExchangeRate);
        },
        enabled: !!user && !!profile?.organization_id && !!id,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// ============================================
// Currency Conversion Hook
// ============================================

export const useConvertCurrency = () => {
    const { t } = useLanguage();

    return useMutation({
        mutationFn: async (data: {
            fromCurrencyId: string;
            toCurrencyId: string;
            amount: number;
            date?: string;
        }) => {
            const result = await exchangeRatesApi.convert({
                from_currency_id: data.fromCurrencyId,
                to_currency_id: data.toCurrencyId,
                amount: data.amount,
                date: data.date,
            });
            return result as CurrencyApi.CurrencyConversionResponse;
        },
        onError: (error: Error) => {
            showToast.error(error.message || t('toast.currencyConversionFailed') || 'Failed to convert currency');
        },
    });
};

