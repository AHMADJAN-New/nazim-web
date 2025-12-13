// Finance Domain Types - UI-friendly structure (camelCase, proper types)

// Finance Account (cash locations)
export interface FinanceAccount {
    id: string;
    organizationId: string;
    schoolId: string | null;
    currencyId: string | null;
    name: string;
    code: string | null;
    type: 'cash' | 'fund';
    description: string | null;
    openingBalance: number;
    currentBalance: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type FinanceAccountFormData = {
    name: string;
    code?: string | null;
    type?: 'cash' | 'fund';
    currencyId?: string | null;
    schoolId?: string | null;
    description?: string | null;
    openingBalance?: number;
    isActive?: boolean;
};

// Income Category
export interface IncomeCategory {
    id: string;
    organizationId: string;
    schoolId: string | null;
    name: string;
    code: string | null;
    description: string | null;
    isRestricted: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export type IncomeCategoryFormData = {
    name: string;
    code?: string | null;
    schoolId?: string | null;
    description?: string | null;
    isRestricted?: boolean;
    isActive?: boolean;
    displayOrder?: number;
};

// Expense Category
export interface ExpenseCategory {
    id: string;
    organizationId: string;
    schoolId: string | null;
    name: string;
    code: string | null;
    description: string | null;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

export type ExpenseCategoryFormData = {
    name: string;
    code?: string | null;
    schoolId?: string | null;
    description?: string | null;
    isActive?: boolean;
    displayOrder?: number;
};

// Finance Project
export type ProjectStatus = 'planning' | 'active' | 'completed' | 'cancelled';

export interface FinanceProject {
    id: string;
    organizationId: string;
    schoolId: string | null;
    currencyId: string | null;
    name: string;
    code: string | null;
    description: string | null;
    budgetAmount: number | null;
    totalIncome: number;
    totalExpense: number;
    startDate: Date | null;
    endDate: Date | null;
    status: ProjectStatus;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Computed
    balance: number;
    budgetRemaining: number | null;
}

export type FinanceProjectFormData = {
    name: string;
    code?: string | null;
    currencyId?: string | null;
    schoolId?: string | null;
    description?: string | null;
    budgetAmount?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    status?: ProjectStatus;
    isActive?: boolean;
};

// Donor
export type DonorType = 'individual' | 'organization';

export interface Donor {
    id: string;
    organizationId: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    type: DonorType;
    contactPerson: string | null;
    notes: string | null;
    totalDonated: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type DonorFormData = {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    type?: DonorType;
    contactPerson?: string | null;
    notes?: string | null;
    isActive?: boolean;
};

// Payment Method
export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'other';

// Income Entry
export interface IncomeEntry {
    id: string;
    organizationId: string;
    schoolId: string | null;
    currencyId: string | null;
    accountId: string;
    incomeCategoryId: string;
    projectId: string | null;
    donorId: string | null;
    amount: number;
    date: Date;
    referenceNo: string | null;
    description: string | null;
    receivedByUserId: string | null;
    paymentMethod: PaymentMethod;
    createdAt: Date;
    updatedAt: Date;
    // Loaded relations
    account?: FinanceAccount;
    incomeCategory?: IncomeCategory;
    project?: FinanceProject | null;
    donor?: Donor | null;
    receivedBy?: { id: string; name: string; email: string } | null;
}

export type IncomeEntryFormData = {
    accountId: string;
    incomeCategoryId: string;
    currencyId?: string | null;
    amount: number;
    date: string;
    schoolId?: string | null;
    projectId?: string | null;
    donorId?: string | null;
    referenceNo?: string | null;
    description?: string | null;
    paymentMethod?: PaymentMethod;
};

// Expense Entry
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

export interface ExpenseEntry {
    id: string;
    organizationId: string;
    schoolId: string | null;
    currencyId: string | null;
    accountId: string;
    expenseCategoryId: string;
    projectId: string | null;
    amount: number;
    date: Date;
    referenceNo: string | null;
    description: string | null;
    paidTo: string | null;
    paymentMethod: PaymentMethod;
    approvedByUserId: string | null;
    approvedAt: Date | null;
    status: ExpenseStatus;
    createdAt: Date;
    updatedAt: Date;
    // Loaded relations
    account?: FinanceAccount;
    expenseCategory?: ExpenseCategory;
    project?: FinanceProject | null;
    approvedBy?: { id: string; name: string; email: string } | null;
}

export type ExpenseEntryFormData = {
    accountId: string;
    expenseCategoryId: string;
    currencyId?: string | null;
    amount: number;
    date: string;
    schoolId?: string | null;
    projectId?: string | null;
    referenceNo?: string | null;
    description?: string | null;
    paidTo?: string | null;
    paymentMethod?: PaymentMethod;
    status?: ExpenseStatus;
};

// Finance Dashboard
export interface FinanceDashboard {
    summary: {
        totalBalance: number;
        currentMonthIncome: number;
        currentMonthExpense: number;
        netThisMonth: number;
        activeProjects: number;
        activeDonors: number;
    };
    accountBalances: Array<{
        id: string;
        name: string;
        currentBalance: number;
        type: string;
    }>;
    incomeByCategory: Array<{
        id: string;
        name: string;
        total: number;
    }>;
    expenseByCategory: Array<{
        id: string;
        name: string;
        total: number;
    }>;
    recentIncome: IncomeEntry[];
    recentExpenses: ExpenseEntry[];
}

// Daily Cashbook
export interface DailyCashbook {
    date: Date;
    cashbook: Array<{
        account: {
            id: string;
            name: string;
            type: string;
        };
        openingBalance: number;
        income: IncomeEntry[];
        totalIncome: number;
        expenses: ExpenseEntry[];
        totalExpense: number;
        closingBalance: number;
    }>;
}

// Income vs Expense Report
export interface IncomeVsExpenseReport {
    period: {
        startDate: Date;
        endDate: Date;
    };
    summary: {
        totalIncome: number;
        totalExpense: number;
        net: number;
    };
    incomeByCategory: Array<{
        id: string;
        name: string;
        code: string | null;
        total: number;
        count: number;
    }>;
    expenseByCategory: Array<{
        id: string;
        name: string;
        code: string | null;
        total: number;
        count: number;
    }>;
}

// Project Summary Report
export interface ProjectSummaryReport {
    projects: Array<{
        project: FinanceProject;
        totalIncome: number;
        totalExpense: number;
        balance: number;
        budgetRemaining: number | null;
        budgetUtilization: number | null;
    }>;
}

// Donor Summary Report
export interface DonorSummaryReport {
    period: {
        startDate: Date | null;
        endDate: Date | null;
    };
    donors: Array<{
        donor: Donor;
        totalDonated: number;
        periodTotal: number;
        donationCount: number;
    }>;
}

// Account Balances Report
export interface AccountBalancesReport {
    accounts: Array<{
        account: FinanceAccount;
        openingBalance: number;
        totalIncome: number;
        totalExpense: number;
        currentBalance: number;
    }>;
    totalBalance: number;
}
