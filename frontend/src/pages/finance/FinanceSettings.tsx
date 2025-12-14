/**
 * Finance Settings - Centralized settings page for finance module
 * Contains: Currencies, Income Categories, Expense Categories, Exchange Rates
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { Coins, Tag, Tags, ArrowRightLeft, Settings } from 'lucide-react';
import Currencies from './Currencies';
import IncomeCategories from './IncomeCategories';
import ExpenseCategories from './ExpenseCategories';
import ExchangeRates from './ExchangeRates';

export default function FinanceSettings() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Check permissions
    const hasCurrenciesPermission = useHasPermission('currencies.read');
    const hasIncomeCategoriesPermission = useHasPermission('income_categories.read');
    const hasExpenseCategoriesPermission = useHasPermission('expense_categories.read');
    const hasExchangeRatesPermission = useHasPermission('exchange_rates.read');

    // Determine active tab from URL hash or default to first available
    const getDefaultTab = () => {
        const hash = location.hash.replace('#', '');
        if (hash === 'currencies' && hasCurrenciesPermission) return 'currencies';
        if (hash === 'income-categories' && hasIncomeCategoriesPermission) return 'income-categories';
        if (hash === 'expense-categories' && hasExpenseCategoriesPermission) return 'expense-categories';
        if (hash === 'exchange-rates' && hasExchangeRatesPermission) return 'exchange-rates';
        
        // Default to first available tab
        if (hasCurrenciesPermission) return 'currencies';
        if (hasIncomeCategoriesPermission) return 'income-categories';
        if (hasExpenseCategoriesPermission) return 'expense-categories';
        if (hasExchangeRatesPermission) return 'exchange-rates';
        return 'currencies';
    };

    const [activeTab, setActiveTab] = useState(getDefaultTab());

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Update URL hash without navigation
        window.history.replaceState(null, '', `#${value}`);
    };

    // If user has no permissions, show message
    if (!hasCurrenciesPermission && !hasIncomeCategoriesPermission && 
        !hasExpenseCategoriesPermission && !hasExchangeRatesPermission) {
        return (
            <div className="container mx-auto p-4 md:p-6 max-w-7xl">
                <div className="text-center py-8 text-muted-foreground">
                    {t('common.noPermission') || 'You do not have permission to access finance settings'}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Settings className="h-8 w-8" />
                        {t('finance.settings') || 'Finance Settings'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('finance.settingsDescription') || 'Manage currencies, categories, and exchange rates'}
                    </p>
                </div>
            </div>

            {/* Settings Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${
                    [hasCurrenciesPermission, hasIncomeCategoriesPermission, hasExpenseCategoriesPermission, hasExchangeRatesPermission].filter(Boolean).length
                }, 1fr)` }}>
                    {hasCurrenciesPermission && (
                        <TabsTrigger value="currencies" className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            {t('finance.currencies') || 'Currencies'}
                        </TabsTrigger>
                    )}
                    {hasIncomeCategoriesPermission && (
                        <TabsTrigger value="income-categories" className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('finance.incomeCategories') || 'Income Categories'}
                        </TabsTrigger>
                    )}
                    {hasExpenseCategoriesPermission && (
                        <TabsTrigger value="expense-categories" className="flex items-center gap-2">
                            <Tags className="h-4 w-4" />
                            {t('finance.expenseCategories') || 'Expense Categories'}
                        </TabsTrigger>
                    )}
                    {hasExchangeRatesPermission && (
                        <TabsTrigger value="exchange-rates" className="flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" />
                            {t('finance.exchangeRates') || 'Exchange Rates'}
                        </TabsTrigger>
                    )}
                </TabsList>

                {hasCurrenciesPermission && (
                    <TabsContent value="currencies" className="mt-6">
                        <Currencies />
                    </TabsContent>
                )}

                {hasIncomeCategoriesPermission && (
                    <TabsContent value="income-categories" className="mt-6">
                        <IncomeCategories />
                    </TabsContent>
                )}

                {hasExpenseCategoriesPermission && (
                    <TabsContent value="expense-categories" className="mt-6">
                        <ExpenseCategories />
                    </TabsContent>
                )}

                {hasExchangeRatesPermission && (
                    <TabsContent value="exchange-rates" className="mt-6">
                        <ExchangeRates />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

