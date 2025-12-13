// Currency Domain Types - UI-friendly structure (camelCase, proper types)

export interface Currency {
    id: string;
    organizationId: string;
    code: string; // ISO 4217 code (USD, AFN, PKR, etc.)
    name: string; // Full name (US Dollar, Afghan Afghani, etc.)
    symbol: string | null; // Symbol ($, ؋, Rs, etc.)
    decimalPlaces: number;
    isBase: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CurrencyFormData = {
    code: string;
    name: string;
    symbol?: string | null;
    decimalPlaces?: number;
    isBase?: boolean;
    isActive?: boolean;
};

// Exchange Rate Domain Types
export interface ExchangeRate {
    id: string;
    organizationId: string;
    fromCurrencyId: string;
    toCurrencyId: string;
    rate: number;
    effectiveDate: Date;
    notes: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Relations (when loaded with relations)
    fromCurrency?: Currency;
    toCurrency?: Currency;
}

export type ExchangeRateFormData = {
    fromCurrencyId: string;
    toCurrencyId: string;
    rate: number;
    effectiveDate: string; // ISO date string for form
    notes?: string | null;
    isActive?: boolean;
};

// Currency Conversion
export interface CurrencyConversion {
    fromCurrencyId: string;
    toCurrencyId: string;
    amount: number;
    rate: number;
    convertedAmount: number;
}

