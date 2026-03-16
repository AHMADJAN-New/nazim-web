// Currency API Types - Match Laravel API response (snake_case, DB columns)

export interface Currency {
    id: string;
    organization_id: string;
    code: string; // ISO 4217 code (USD, AFN, PKR, etc.)
    name: string; // Full name (US Dollar, Afghan Afghani, etc.)
    symbol: string | null; // Symbol ($, ؋, Rs, etc.)
    decimal_places: number;
    is_base: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface CurrencyInsert {
    code: string;
    name: string;
    symbol?: string | null;
    decimal_places?: number;
    is_base?: boolean;
    is_active?: boolean;
}

export type CurrencyUpdate = Partial<CurrencyInsert>;

// Exchange Rate API Types
export interface ExchangeRate {
    id: string;
    organization_id: string;
    from_currency_id: string;
    to_currency_id: string;
    rate: string; // Decimal as string from API
    effective_date: string;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Relations (when loaded with relations)
    from_currency?: Currency;
    to_currency?: Currency;
}

export interface ExchangeRateInsert {
    from_currency_id: string;
    to_currency_id: string;
    rate: number;
    effective_date: string;
    notes?: string | null;
    is_active?: boolean;
}

export type ExchangeRateUpdate = Partial<ExchangeRateInsert>;

// Currency Conversion Request/Response
export interface CurrencyConversionRequest {
    from_currency_id: string;
    to_currency_id: string;
    amount: number;
    date?: string;
}

export interface CurrencyConversionResponse {
    from_currency_id: string;
    to_currency_id: string;
    amount: number;
    rate: number | null;
    converted_amount: number;
    /** When false, no rate was found and amount is shown in original currency. */
    converted?: boolean;
    message?: string;
}

