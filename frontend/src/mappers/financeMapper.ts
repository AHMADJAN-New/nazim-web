// Finance Mapper - Converts between API (snake_case) and Domain (camelCase) models

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

// Helper to parse decimal strings
const parseDecimal = (value: string | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    return parseFloat(value) || 0;
};

// ============================================
// Finance Account Mappers
// ============================================

export function mapFinanceAccountApiToDomain(api: FinanceApi.FinanceAccount): FinanceAccount {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        currencyId: api.currency_id || null,
        name: api.name,
        code: api.code,
        type: api.type,
        description: api.description,
        openingBalance: parseDecimal(api.opening_balance),
        currentBalance: parseDecimal(api.current_balance),
        isActive: api.is_active,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
    };
}

export function mapFinanceAccountFormToInsert(form: FinanceAccountFormData): FinanceApi.FinanceAccountInsert {
    return {
        name: form.name,
        code: form.code || null,
        type: form.type || 'cash',
        currency_id: form.currencyId || null,
        school_id: form.schoolId || null,
        description: form.description || null,
        opening_balance: form.openingBalance || 0,
        is_active: form.isActive ?? true,
    };
}

// ============================================
// Income Category Mappers
// ============================================

export function mapIncomeCategoryApiToDomain(api: FinanceApi.IncomeCategory): IncomeCategory {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        name: api.name,
        code: api.code,
        description: api.description,
        isRestricted: api.is_restricted,
        isActive: api.is_active,
        displayOrder: api.display_order,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
    };
}

export function mapIncomeCategoryFormToInsert(form: IncomeCategoryFormData): FinanceApi.IncomeCategoryInsert {
    return {
        name: form.name,
        code: form.code || null,
        school_id: form.schoolId || null,
        description: form.description || null,
        is_restricted: form.isRestricted ?? false,
        is_active: form.isActive ?? true,
        display_order: form.displayOrder || 0,
    };
}

// ============================================
// Expense Category Mappers
// ============================================

export function mapExpenseCategoryApiToDomain(api: FinanceApi.ExpenseCategory): ExpenseCategory {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        name: api.name,
        code: api.code,
        description: api.description,
        isActive: api.is_active,
        displayOrder: api.display_order,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
    };
}

export function mapExpenseCategoryFormToInsert(form: ExpenseCategoryFormData): FinanceApi.ExpenseCategoryInsert {
    return {
        name: form.name,
        code: form.code || null,
        school_id: form.schoolId || null,
        description: form.description || null,
        is_active: form.isActive ?? true,
        display_order: form.displayOrder || 0,
    };
}

// ============================================
// Finance Project Mappers
// ============================================

export function mapFinanceProjectApiToDomain(api: FinanceApi.FinanceProject): FinanceProject {
    const totalIncome = parseDecimal(api.total_income);
    const totalExpense = parseDecimal(api.total_expense);
    const budgetAmount = api.budget_amount ? parseDecimal(api.budget_amount) : null;

    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        currencyId: api.currency_id || null,
        name: api.name,
        code: api.code,
        description: api.description,
        budgetAmount,
        totalIncome,
        totalExpense,
        startDate: api.start_date ? new Date(api.start_date) : null,
        endDate: api.end_date ? new Date(api.end_date) : null,
        status: api.status,
        isActive: api.is_active,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
        // Computed
        balance: totalIncome - totalExpense,
        budgetRemaining: budgetAmount !== null ? budgetAmount - totalExpense : null,
    };
}

export function mapFinanceProjectFormToInsert(form: FinanceProjectFormData): FinanceApi.FinanceProjectInsert {
    return {
        name: form.name,
        code: form.code || null,
        currency_id: form.currencyId || null,
        school_id: form.schoolId || null,
        description: form.description || null,
        budget_amount: form.budgetAmount || null,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        status: form.status || 'active',
        is_active: form.isActive ?? true,
    };
}

// ============================================
// Donor Mappers
// ============================================

export function mapDonorApiToDomain(api: FinanceApi.Donor): Donor {
    return {
        id: api.id,
        organizationId: api.organization_id,
        name: api.name,
        phone: api.phone,
        email: api.email,
        address: api.address,
        type: api.type,
        contactPerson: api.contact_person,
        notes: api.notes,
        totalDonated: parseDecimal(api.total_donated),
        isActive: api.is_active,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
    };
}

export function mapDonorFormToInsert(form: DonorFormData): FinanceApi.DonorInsert {
    return {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        type: form.type || 'individual',
        contact_person: form.contactPerson || null,
        notes: form.notes || null,
        is_active: form.isActive ?? true,
    };
}

// ============================================
// Income Entry Mappers
// ============================================

export function mapIncomeEntryApiToDomain(api: FinanceApi.IncomeEntry): IncomeEntry {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        currencyId: api.currency_id || null,
        accountId: api.account_id,
        incomeCategoryId: api.income_category_id,
        projectId: api.project_id,
        donorId: api.donor_id,
        amount: parseDecimal(api.amount),
        date: new Date(api.date),
        referenceNo: api.reference_no,
        description: api.description,
        receivedByUserId: api.received_by_user_id,
        paymentMethod: api.payment_method,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
        // Relations
        account: api.account ? mapFinanceAccountApiToDomain(api.account) : undefined,
        incomeCategory: api.income_category ? mapIncomeCategoryApiToDomain(api.income_category) : undefined,
        project: api.project ? mapFinanceProjectApiToDomain(api.project) : null,
        donor: api.donor ? mapDonorApiToDomain(api.donor) : null,
        currency: api.currency ? {
            id: api.currency.id,
            code: api.currency.code,
            name: api.currency.name,
            symbol: api.currency.symbol,
        } : null,
        receivedBy: api.received_by || null,
    };
}

export function mapIncomeEntryFormToInsert(form: IncomeEntryFormData): FinanceApi.IncomeEntryInsert {
    return {
        account_id: form.accountId,
        income_category_id: form.incomeCategoryId,
        currency_id: form.currencyId || null,
        amount: form.amount,
        date: form.date,
        school_id: form.schoolId || null,
        project_id: form.projectId || null,
        donor_id: form.donorId || null,
        reference_no: form.referenceNo || null,
        description: form.description || null,
        payment_method: form.paymentMethod || 'cash',
    };
}

// ============================================
// Expense Entry Mappers
// ============================================

export function mapExpenseEntryApiToDomain(api: FinanceApi.ExpenseEntry): ExpenseEntry {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolId: api.school_id,
        currencyId: api.currency_id || null,
        accountId: api.account_id,
        expenseCategoryId: api.expense_category_id,
        projectId: api.project_id,
        amount: parseDecimal(api.amount),
        date: new Date(api.date),
        referenceNo: api.reference_no,
        description: api.description,
        paidTo: api.paid_to,
        paymentMethod: api.payment_method,
        approvedByUserId: api.approved_by_user_id,
        approvedAt: api.approved_at ? new Date(api.approved_at) : null,
        status: api.status,
        createdAt: new Date(api.created_at),
        updatedAt: new Date(api.updated_at),
        // Relations
        account: api.account ? mapFinanceAccountApiToDomain(api.account) : undefined,
        expenseCategory: api.expense_category ? mapExpenseCategoryApiToDomain(api.expense_category) : undefined,
        project: api.project ? mapFinanceProjectApiToDomain(api.project) : null,
        approvedBy: api.approved_by || null,
    };
}

export function mapExpenseEntryFormToInsert(form: ExpenseEntryFormData): FinanceApi.ExpenseEntryInsert {
    return {
        account_id: form.accountId,
        expense_category_id: form.expenseCategoryId,
        currency_id: form.currencyId || null,
        amount: form.amount,
        date: form.date,
        school_id: form.schoolId || null,
        project_id: form.projectId || null,
        reference_no: form.referenceNo || null,
        description: form.description || null,
        paid_to: form.paidTo || null,
        payment_method: form.paymentMethod || 'cash',
    };
}

// ============================================
// Report Mappers
// ============================================

export function mapFinanceDashboardApiToDomain(api: FinanceApi.FinanceDashboard): FinanceDashboard {
    return {
        summary: {
            totalBalance: parseDecimal(api.summary.total_balance),
            currentMonthIncome: parseDecimal(api.summary.current_month_income),
            currentMonthExpense: parseDecimal(api.summary.current_month_expense),
            netThisMonth: parseDecimal(api.summary.net_this_month),
            activeProjects: api.summary.active_projects,
            activeDonors: api.summary.active_donors,
        },
        accountBalances: Array.isArray(api.account_balances) 
            ? api.account_balances.map(ab => ({
                id: ab.id,
                name: ab.name,
                currentBalance: parseDecimal(ab.current_balance),
                type: ab.type,
            }))
            : [],
        incomeByCategory: Array.isArray(api.income_by_category)
            ? api.income_by_category.map(ic => ({
                id: ic.id,
                name: ic.name,
                total: parseDecimal(ic.total),
            }))
            : [],
        expenseByCategory: Array.isArray(api.expense_by_category)
            ? api.expense_by_category.map(ec => ({
                id: ec.id,
                name: ec.name,
                total: parseDecimal(ec.total),
            }))
            : [],
        recentIncome: Array.isArray(api.recent_income)
            ? api.recent_income.map(mapIncomeEntryApiToDomain)
            : [],
        recentExpenses: Array.isArray(api.recent_expenses)
            ? api.recent_expenses.map(mapExpenseEntryApiToDomain)
            : [],
    };
}

export function mapDailyCashbookApiToDomain(api: FinanceApi.DailyCashbook): DailyCashbook {
    return {
        date: new Date(api.date),
        cashbook: api.cashbook.map(cb => ({
            account: {
                id: cb.account.id,
                name: cb.account.name,
                type: cb.account.type,
            },
            openingBalance: parseDecimal(cb.opening_balance),
            income: cb.income.map(mapIncomeEntryApiToDomain),
            totalIncome: parseDecimal(cb.total_income),
            expenses: cb.expenses.map(mapExpenseEntryApiToDomain),
            totalExpense: parseDecimal(cb.total_expense),
            closingBalance: parseDecimal(cb.closing_balance),
        })),
    };
}

export function mapIncomeVsExpenseReportApiToDomain(api: FinanceApi.IncomeVsExpenseReport): IncomeVsExpenseReport {
    return {
        period: {
            startDate: new Date(api.period.start_date),
            endDate: new Date(api.period.end_date),
        },
        summary: {
            totalIncome: parseDecimal(api.summary.total_income),
            totalExpense: parseDecimal(api.summary.total_expense),
            net: parseDecimal(api.summary.net),
        },
        incomeByCategory: api.income_by_category.map(ic => ({
            id: ic.id,
            name: ic.name,
            code: ic.code,
            total: parseDecimal(ic.total),
            count: ic.count,
        })),
        expenseByCategory: api.expense_by_category.map(ec => ({
            id: ec.id,
            name: ec.name,
            code: ec.code,
            total: parseDecimal(ec.total),
            count: ec.count,
        })),
    };
}

export function mapProjectSummaryReportApiToDomain(api: FinanceApi.ProjectSummaryReport): ProjectSummaryReport {
    return {
        projects: api.projects.map(p => ({
            project: mapFinanceProjectApiToDomain(p.project),
            totalIncome: parseDecimal(p.total_income),
            totalExpense: parseDecimal(p.total_expense),
            balance: parseDecimal(p.balance),
            budgetRemaining: p.budget_remaining ? parseDecimal(p.budget_remaining) : null,
            budgetUtilization: p.budget_utilization,
        })),
    };
}

export function mapDonorSummaryReportApiToDomain(api: FinanceApi.DonorSummaryReport): DonorSummaryReport {
    return {
        period: {
            startDate: api.period.start_date ? new Date(api.period.start_date) : null,
            endDate: api.period.end_date ? new Date(api.period.end_date) : null,
        },
        donors: api.donors.map(d => ({
            donor: mapDonorApiToDomain(d.donor),
            totalDonated: parseDecimal(d.total_donated),
            periodTotal: parseDecimal(d.period_total),
            donationCount: d.donation_count,
        })),
    };
}

export function mapAccountBalancesReportApiToDomain(api: FinanceApi.AccountBalancesReport): AccountBalancesReport {
    return {
        accounts: api.accounts.map(a => ({
            account: mapFinanceAccountApiToDomain(a.account),
            openingBalance: parseDecimal(a.opening_balance),
            totalIncome: parseDecimal(a.total_income),
            totalExpense: parseDecimal(a.total_expense),
            currentBalance: parseDecimal(a.current_balance),
        })),
        totalBalance: parseDecimal(api.total_balance),
    };
}
