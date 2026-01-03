/**
 * Finance Settings - Centralized settings page for finance module
 * Contains: Currencies, Income Categories, Expense Categories, Exchange Rates
 */

import { Coins, Tag, Tags, ArrowRightLeft, Settings } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import Currencies from './Currencies';
import ExchangeRates from './ExchangeRates';
import ExpenseCategories from './ExpenseCategories';
import IncomeCategories from './IncomeCategories';

import { PageHeader } from '@/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';


export default function FinanceSettings() {
    const { t } = useLanguage();
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
            <PageHeader
                title={t('finance.settings') || 'Finance Settings'}
                description={t('finance.settingsDescription') || 'Manage currencies, categories, and exchange rates'}
                icon={<Settings className="h-5 w-5" />}
            />

            {/* Settings Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-full overflow-x-auto">
                    {hasCurrenciesPermission && (
                        <TabsTrigger value="currencies" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                            <Coins className="h-4 w-4" />
                            <span>{t('finance.currencies') || 'Currencies'}</span>
                        </TabsTrigger>
                    )}
                    {hasIncomeCategoriesPermission && (
                        <TabsTrigger value="income-categories" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                            <Tag className="h-4 w-4" />
                            <span>{t('finance.incomeCategories') || 'Income Categories'}</span>
                        </TabsTrigger>
                    )}
                    {hasExpenseCategoriesPermission && (
                        <TabsTrigger value="expense-categories" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                            <Tags className="h-4 w-4" />
                            <span>{t('finance.expenseCategories') || 'Expense Categories'}</span>
                        </TabsTrigger>
                    )}
                    {hasExchangeRatesPermission && (
                        <TabsTrigger value="exchange-rates" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                            <ArrowRightLeft className="h-4 w-4" />
                            <span>{t('finance.exchangeRates') || 'Exchange Rates'}</span>
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

