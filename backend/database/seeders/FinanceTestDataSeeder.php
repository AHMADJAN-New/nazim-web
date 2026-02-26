<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class FinanceTestDataSeeder extends Seeder
{
    public function run(): void
    {
        $orgId = DB::table('organizations')
            ->where('name', 'LIKE', '%Platform Administrator%')
            ->value('id');

        if (! $orgId) {
            $this->command->warn('Platform admin organization not found. Skipping.');
            return;
        }

        $schoolId = DB::table('school_branding')
            ->where('organization_id', $orgId)
            ->value('id');

        if (! $schoolId) {
            $this->command->warn('No school found for platform admin org. Skipping.');
            return;
        }

        $currencyId = DB::table('currencies')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->value('id');

        $accounts = DB::table('finance_accounts')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $incomeCategories = DB::table('income_categories')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $expenseCategories = DB::table('expense_categories')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $projects = DB::table('finance_projects')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        $donors = DB::table('donors')
            ->where('organization_id', $orgId)
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->get();

        if ($accounts->isEmpty() || $incomeCategories->isEmpty() || $expenseCategories->isEmpty()) {
            $this->command->warn('Missing finance accounts or categories. Skipping.');
            return;
        }

        $mainCash = $accounts->firstWhere('code', 'MAIN_CASH');
        $bankAcc = $accounts->firstWhere('code', 'BANK_ACC');
        $feeAcc = $accounts->firstWhere('code', 'FEE_ACCOUNT');
        $zakatFund = $accounts->firstWhere('code', 'ZAKAT_FUND');
        $waqfFund = $accounts->firstWhere('code', 'WAQF_FUND');

        $now = Carbon::now();

        $incomeEntries = [];
        $expenseEntries = [];

        $incCatFee = $incomeCategories->first(fn ($c) => str_contains($c->name, 'فیس') && str_contains($c->name, 'زده'));
        $incCatDonation = $incomeCategories->firstWhere('name', 'عطیات');
        $incCatSadaqa = $incomeCategories->firstWhere('name', 'صدقه');
        $incCatWaqf = $incomeCategories->firstWhere('name', 'وقف');
        $incCatProject = $incomeCategories->first(fn ($c) => str_contains($c->name, 'پروژو'));
        $incCatExam = $incomeCategories->first(fn ($c) => str_contains($c->name, 'ازموینې'));
        $incCatReg = $incomeCategories->first(fn ($c) => str_contains($c->name, 'ثبتولو'));

        $expCatElec = $expenseCategories->first(fn ($c) => str_contains($c->name, 'بریښنا'));
        $expCatFood = $expenseCategories->first(fn ($c) => str_contains($c->name, 'خوړو'));
        $expCatClean = $expenseCategories->first(fn ($c) => str_contains($c->name, 'پاکولو'));
        $expCatFurn = $expenseCategories->first(fn ($c) => str_contains($c->name, 'فرنیچر'));
        $expCatMaint = $expenseCategories->first(fn ($c) => str_contains($c->name, 'ساتنې'));
        $expCatHealth = $expenseCategories->first(fn ($c) => str_contains($c->name, 'روغتیا'));
        $expCatBooks = $expenseCategories->first(fn ($c) => str_contains($c->name, 'کتابونو'));
        $expCatInternet = $expenseCategories->first(fn ($c) => str_contains($c->name, 'انټرنټ'));

        $donor1 = $donors->firstWhere('type', 'individual');
        $donor2 = $donors->where('type', 'individual')->skip(1)->first() ?? $donor1;
        $donorOrg1 = $donors->firstWhere('type', 'organization');
        $donorOrg2 = $donors->where('type', 'organization')->skip(1)->first() ?? $donorOrg1;

        $project1 = $projects->first();
        $project2 = $projects->skip(1)->first();

        $userId = DB::table('profiles')
            ->where('organization_id', $orgId)
            ->value('id');

        // --- INCOME ENTRIES (spread over the last 3 months) ---
        $baseDate = Carbon::now()->startOfMonth();

        for ($monthOffset = 2; $monthOffset >= 0; $monthOffset--) {
            $month = $baseDate->copy()->subMonths($monthOffset);

            // Student fees - multiple entries per month
            for ($day = 1; $day <= 3; $day++) {
                $date = $month->copy()->addDays($day * 5);
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 5));
                }

                $incomeEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $feeAcc?->id ?? $mainCash->id,
                    'income_category_id' => $incCatFee?->id ?? $incomeCategories->first()->id,
                    'project_id' => null,
                    'donor_id' => null,
                    'amount' => rand(5000, 15000),
                    'date' => $date->toDateString(),
                    'reference_no' => 'FEE-' . $date->format('Ymd') . '-' . $day,
                    'description' => 'د زده کړیالانو میاشتنی فیس',
                    'received_by_user_id' => $userId,
                    'payment_method' => 'cash',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Donations from donors
            if ($donor1) {
                $date = $month->copy()->addDays(rand(7, 15));
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 3));
                }

                $incomeEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $mainCash->id,
                    'income_category_id' => $incCatDonation?->id ?? $incomeCategories->first()->id,
                    'project_id' => null,
                    'donor_id' => $donor1->id,
                    'amount' => rand(20000, 50000),
                    'date' => $date->toDateString(),
                    'reference_no' => 'DON-' . $date->format('Ymd'),
                    'description' => 'د ' . $donor1->name . ' عطیه',
                    'received_by_user_id' => $userId,
                    'payment_method' => 'cash',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if ($donorOrg1) {
                $date = $month->copy()->addDays(rand(10, 20));
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 3));
                }

                $incomeEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $bankAcc?->id ?? $mainCash->id,
                    'income_category_id' => $incCatDonation?->id ?? $incomeCategories->first()->id,
                    'project_id' => $project1?->id,
                    'donor_id' => $donorOrg1->id,
                    'amount' => rand(50000, 150000),
                    'date' => $date->toDateString(),
                    'reference_no' => 'DORG-' . $date->format('Ymd'),
                    'description' => 'د ' . $donorOrg1->name . ' عطیه - د پروژې لپاره',
                    'received_by_user_id' => $userId,
                    'payment_method' => 'bank_transfer',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Zakat income
            if ($incCatSadaqa && $zakatFund) {
                $date = $month->copy()->addDays(rand(5, 25));
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 3));
                }

                $incomeEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $zakatFund->id,
                    'income_category_id' => $incCatSadaqa->id,
                    'project_id' => null,
                    'donor_id' => $donor2?->id,
                    'amount' => rand(10000, 30000),
                    'date' => $date->toDateString(),
                    'reference_no' => 'ZKT-' . $date->format('Ymd'),
                    'description' => 'صدقه / زکات',
                    'received_by_user_id' => $userId,
                    'payment_method' => 'cash',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // Project income
            if ($project2 && $donorOrg2) {
                $date = $month->copy()->addDays(rand(12, 22));
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 3));
                }

                $incomeEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $bankAcc?->id ?? $mainCash->id,
                    'income_category_id' => $incCatProject?->id ?? $incomeCategories->first()->id,
                    'project_id' => $project2->id,
                    'donor_id' => $donorOrg2->id,
                    'amount' => rand(80000, 200000),
                    'date' => $date->toDateString(),
                    'reference_no' => 'PROJ-' . $date->format('Ymd'),
                    'description' => 'د ' . $project2->name . ' لپاره مرسته',
                    'received_by_user_id' => $userId,
                    'payment_method' => 'bank_transfer',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        // --- EXPENSE ENTRIES (spread over the last 3 months) ---
        $expenseDefs = [
            ['cat' => $expCatElec, 'min' => 3000, 'max' => 8000, 'desc' => 'د بریښنا بل', 'to' => 'د بریښنا شرکت', 'acct' => $mainCash],
            ['cat' => $expCatFood, 'min' => 8000, 'max' => 20000, 'desc' => 'د زده کړیالانو خوراک', 'to' => 'د خوراکي توکو پلورنځی', 'acct' => $mainCash],
            ['cat' => $expCatClean, 'min' => 2000, 'max' => 5000, 'desc' => 'د پاکولو توکي', 'to' => 'د پاکولو توکو پلورنځی', 'acct' => $mainCash],
            ['cat' => $expCatMaint, 'min' => 5000, 'max' => 15000, 'desc' => 'د ودانۍ ساتنه', 'to' => 'د ساتنې شرکت', 'acct' => $mainCash],
            ['cat' => $expCatBooks, 'min' => 3000, 'max' => 10000, 'desc' => 'د کتابونو پیرود', 'to' => 'د کتابونو پلورنځی', 'acct' => $bankAcc ?? $mainCash],
            ['cat' => $expCatInternet, 'min' => 2000, 'max' => 4000, 'desc' => 'د انټرنټ بل', 'to' => 'د انټرنټ شرکت', 'acct' => $mainCash],
            ['cat' => $expCatHealth, 'min' => 1500, 'max' => 5000, 'desc' => 'د روغتیا لګښتونه', 'to' => 'درملتون', 'acct' => $mainCash],
            ['cat' => $expCatFurn, 'min' => 10000, 'max' => 30000, 'desc' => 'د فرنیچر پیرود', 'to' => 'د فرنیچر فابریکه', 'acct' => $bankAcc ?? $mainCash],
        ];

        for ($monthOffset = 2; $monthOffset >= 0; $monthOffset--) {
            $month = $baseDate->copy()->subMonths($monthOffset);

            foreach ($expenseDefs as $idx => $def) {
                if (! $def['cat']) {
                    continue;
                }

                $date = $month->copy()->addDays(rand(2, 25));
                if ($date->isFuture()) {
                    $date = Carbon::now()->subDays(rand(1, 5));
                }

                $projectId = null;
                if ($idx >= 3 && $idx <= 4 && $project1) {
                    $projectId = $project1->id;
                }

                $expenseEntries[] = [
                    'id' => Str::uuid()->toString(),
                    'organization_id' => $orgId,
                    'school_id' => $schoolId,
                    'account_id' => $def['acct']->id,
                    'expense_category_id' => $def['cat']->id,
                    'project_id' => $projectId,
                    'amount' => rand($def['min'], $def['max']),
                    'date' => $date->toDateString(),
                    'reference_no' => 'EXP-' . $date->format('Ymd') . '-' . ($idx + 1),
                    'description' => $def['desc'],
                    'paid_to' => $def['to'],
                    'payment_method' => $idx % 3 === 0 ? 'bank_transfer' : 'cash',
                    'approved_by_user_id' => $userId,
                    'approved_at' => $now,
                    'status' => 'approved',
                    'currency_id' => $currencyId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('income_entries')->insert($incomeEntries);
        DB::table('expense_entries')->insert($expenseEntries);

        $this->command->info('  → Inserted ' . count($incomeEntries) . ' income entries');
        $this->command->info('  → Inserted ' . count($expenseEntries) . ' expense entries');

        // Update account balances
        foreach ($accounts as $account) {
            $totalIncome = DB::table('income_entries')
                ->where('account_id', $account->id)
                ->whereNull('deleted_at')
                ->sum('amount');

            $totalExpense = DB::table('expense_entries')
                ->where('account_id', $account->id)
                ->where('status', 'approved')
                ->whereNull('deleted_at')
                ->sum('amount');

            $currentBalance = (float) $account->opening_balance + $totalIncome - $totalExpense;

            DB::table('finance_accounts')
                ->where('id', $account->id)
                ->update([
                    'current_balance' => $currentBalance,
                    'updated_at' => $now,
                ]);
        }

        // Update donor totals
        foreach ($donors as $donor) {
            $total = DB::table('income_entries')
                ->where('donor_id', $donor->id)
                ->whereNull('deleted_at')
                ->sum('amount');

            DB::table('donors')
                ->where('id', $donor->id)
                ->update([
                    'total_donated' => $total,
                    'updated_at' => $now,
                ]);
        }

        // Update project totals
        foreach ($projects as $project) {
            $totalIncome = DB::table('income_entries')
                ->where('project_id', $project->id)
                ->whereNull('deleted_at')
                ->sum('amount');

            $totalExpense = DB::table('expense_entries')
                ->where('project_id', $project->id)
                ->where('status', 'approved')
                ->whereNull('deleted_at')
                ->sum('amount');

            DB::table('finance_projects')
                ->where('id', $project->id)
                ->update([
                    'total_income' => $totalIncome,
                    'total_expense' => $totalExpense,
                    'updated_at' => $now,
                ]);
        }

        $this->command->info('✅ Finance test data seeded successfully!');
    }
}
