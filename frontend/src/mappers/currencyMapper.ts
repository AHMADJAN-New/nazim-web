import type * as CurrencyApi from '@/types/api/currency';
import type { Currency, ExchangeRate } from '@/types/domain/currency';
import { dateToLocalYYYYMMDD } from '@/lib/dateUtils';

/**
 * Convert API Currency model to Domain Currency model
 */
export function mapCurrencyApiToDomain(api: CurrencyApi.Currency): Currency {
    return {
        id: api.id,
        organizationId: api.organization_id,
        code: api.code,
        name: api.name,
        symbol: api.symbol,
        decimalPlaces: api.decimal_places,
        isBase: api.is_base,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    };
}

/**
 * Convert Domain Currency model to API CurrencyInsert payload
 */
export function mapCurrencyDomainToInsert(domain: Partial<Currency>): CurrencyApi.CurrencyInsert {
    return {
        code: domain.code || '',
        name: domain.name || '',
        symbol: domain.symbol ?? null,
        decimal_places: domain.decimalPlaces ?? 2,
        is_base: domain.isBase ?? false,
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain Currency model to API CurrencyUpdate payload
 */
export function mapCurrencyDomainToUpdate(domain: Partial<Currency>): CurrencyApi.CurrencyUpdate {
    return mapCurrencyDomainToInsert(domain);
}

/**
 * Convert API ExchangeRate model to Domain ExchangeRate model
 */
export function mapExchangeRateApiToDomain(api: CurrencyApi.ExchangeRate): ExchangeRate {
    return {
        id: api.id,
        organizationId: api.organization_id,
        fromCurrencyId: api.from_currency_id,
        toCurrencyId: api.to_currency_id,
        rate: parseFloat(api.rate),
        effectiveDate: api.effective_date ? new Date(api.effective_date) : new Date(),
        notes: api.notes,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        fromCurrency: api.from_currency ? mapCurrencyApiToDomain(api.from_currency) : undefined,
        toCurrency: api.to_currency ? mapCurrencyApiToDomain(api.to_currency) : undefined,
    };
}

/**
 * Convert Domain ExchangeRate model to API ExchangeRateInsert payload
 */
export function mapExchangeRateDomainToInsert(domain: Partial<ExchangeRate>): CurrencyApi.ExchangeRateInsert {
    return {
        from_currency_id: domain.fromCurrencyId || '',
        to_currency_id: domain.toCurrencyId || '',
        rate: domain.rate ?? 0,
        effective_date: domain.effectiveDate instanceof Date 
            ? dateToLocalYYYYMMDD(domain.effectiveDate)
            : domain.effectiveDate || dateToLocalYYYYMMDD(new Date()),
        notes: domain.notes ?? null,
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain ExchangeRate model to API ExchangeRateUpdate payload
 */
export function mapExchangeRateDomainToUpdate(domain: Partial<ExchangeRate>): CurrencyApi.ExchangeRateUpdate {
    return mapExchangeRateDomainToInsert(domain);
}

