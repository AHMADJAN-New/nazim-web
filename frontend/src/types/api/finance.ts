// Finance API Types - Match Laravel API response (snake_case, DB columns)

// Finance Account (cash locations)
export interface FinanceAccount {
    id: string;
    organization_id: string;
    school_id: string | null;
    name: string;
    code: string | null;
    type: 'cash' | 'fund';
    description: string | null;
    opening_balance: string; // Decimal as string from API
    current_balance: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface FinanceAccountInsert {
    name: string;
    code?: string | null;
    type?: 'cash' | 'fund';
    school_id?: string | null;
    description?: string | null;
    opening_balance?: number;
    is_active?: boolean;
}

export type FinanceAccountUpdate = Partial<FinanceAccountInsert>;

// Income Category
export interface IncomeCategory {
    id: string;
    organization_id: string;
    school_id: string | null;
    name: string;
    code: string | null;
    description: string | null;
    is_restricted: boolean;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface IncomeCategoryInsert {
    name: string;
    code?: string | null;
    school_id?: string | null;
    description?: string | null;
    is_restricted?: boolean;
    is_active?: boolean;
    display_order?: number;
}

export type IncomeCategoryUpdate = Partial<IncomeCategoryInsert>;

// Expense Category
export interface ExpenseCategory {
    id: string;
    organization_id: string;
    school_id: string | null;
    name: string;
    code: string | null;
    description: string | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface ExpenseCategoryInsert {
    name: string;
    code?: string | null;
    school_id?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
}

export type ExpenseCategoryUpdate = Partial<ExpenseCategoryInsert>;

// Finance Project
export interface FinanceProject {
    id: string;
    organization_id: string;
    school_id: string | null;
    name: string;
    code: string | null;
    description: string | null;
    budget_amount: string | null;
    total_income: string;
    total_expense: string;
    start_date: string | null;
    end_date: string | null;
    status: 'planning' | 'active' | 'completed' | 'cancelled';
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface FinanceProjectInsert {
    name: string;
    code?: string | null;
    school_id?: string | null;
    description?: string | null;
    budget_amount?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: 'planning' | 'active' | 'completed' | 'cancelled';
    is_active?: boolean;
}

export type FinanceProjectUpdate = Partial<FinanceProjectInsert>;

// Donor
export interface Donor {
    id: string;
    organization_id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    type: 'individual' | 'organization';
    contact_person: string | null;
    notes: string | null;
    total_donated: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface DonorInsert {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    type?: 'individual' | 'organization';
    contact_person?: string | null;
    notes?: string | null;
    is_active?: boolean;
}

export type DonorUpdate = Partial<DonorInsert>;

// Income Entry
export interface IncomeEntry {
    id: string;
    organization_id: string;
    school_id: string | null;
    account_id: string;
    income_category_id: string;
    project_id: string | null;
    donor_id: string | null;
    amount: string;
    date: string;
    reference_no: string | null;
    description: string | null;
    received_by_user_id: string | null;
    payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Loaded relations
    account?: FinanceAccount;
    income_category?: IncomeCategory;
    project?: FinanceProject;
    donor?: Donor;
    received_by?: { id: string; name: string; email: string };
}

export interface IncomeEntryInsert {
    account_id: string;
    income_category_id: string;
    amount: number;
    date: string;
    school_id?: string | null;
    project_id?: string | null;
    donor_id?: string | null;
    reference_no?: string | null;
    description?: string | null;
    payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'other';
}

export type IncomeEntryUpdate = Partial<IncomeEntryInsert>;

// Expense Entry
export interface ExpenseEntry {
    id: string;
    organization_id: string;
    school_id: string | null;
    account_id: string;
    expense_category_id: string;
    project_id: string | null;
    amount: string;
    date: string;
    reference_no: string | null;
    description: string | null;
    paid_to: string | null;
    payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'other';
    approved_by_user_id: string | null;
    approved_at: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Loaded relations
    account?: FinanceAccount;
    expense_category?: ExpenseCategory;
    project?: FinanceProject;
    approved_by?: { id: string; name: string; email: string };
}

export interface ExpenseEntryInsert {
    account_id: string;
    expense_category_id: string;
    amount: number;
    date: string;
    school_id?: string | null;
    project_id?: string | null;
    reference_no?: string | null;
    description?: string | null;
    paid_to?: string | null;
    payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'other';
}

export type ExpenseEntryUpdate = Partial<ExpenseEntryInsert>;

// Finance Dashboard Response
export interface FinanceDashboard {
    summary: {
        total_balance: string;
        current_month_income: string;
        current_month_expense: string;
        net_this_month: string;
        active_projects: number;
        active_donors: number;
    };
    account_balances: Array<{
        id: string;
        name: string;
        current_balance: string;
        type: string;
    }>;
    income_by_category: Array<{
        id: string;
        name: string;
        total: string;
    }>;
    expense_by_category: Array<{
        id: string;
        name: string;
        total: string;
    }>;
    recent_income: IncomeEntry[];
    recent_expenses: ExpenseEntry[];
}

// Daily Cashbook Response
export interface DailyCashbook {
    date: string;
    cashbook: Array<{
        account: {
            id: string;
            name: string;
            type: string;
        };
        opening_balance: string;
        income: IncomeEntry[];
        total_income: string;
        expenses: ExpenseEntry[];
        total_expense: string;
        closing_balance: string;
    }>;
}

// Income vs Expense Report Response
export interface IncomeVsExpenseReport {
    period: {
        start_date: string;
        end_date: string;
    };
    summary: {
        total_income: string;
        total_expense: string;
        net: string;
    };
    income_by_category: Array<{
        id: string;
        name: string;
        code: string | null;
        total: string;
        count: number;
    }>;
    expense_by_category: Array<{
        id: string;
        name: string;
        code: string | null;
        total: string;
        count: number;
    }>;
}

// Project Summary Report Response
export interface ProjectSummaryReport {
    projects: Array<{
        project: FinanceProject;
        total_income: string;
        total_expense: string;
        balance: string;
        budget_remaining: string | null;
        budget_utilization: number | null;
    }>;
}

// Donor Summary Report Response
export interface DonorSummaryReport {
    period: {
        start_date: string | null;
        end_date: string | null;
    };
    donors: Array<{
        donor: Donor;
        total_donated: string;
        period_total: string;
        donation_count: number;
    }>;
}

// Account Balances Report Response
export interface AccountBalancesReport {
    accounts: Array<{
        account: FinanceAccount;
        opening_balance: string;
        total_income: string;
        total_expense: string;
        current_balance: string;
    }>;
    total_balance: string;
}
