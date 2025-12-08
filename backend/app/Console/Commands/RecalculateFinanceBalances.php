<?php

namespace App\Console\Commands;

use App\Models\FinanceAccount;
use App\Models\FinanceProject;
use App\Models\Donor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculateFinanceBalances extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'nazim:finance-recalc-balances 
                            {--organization= : Recalculate for specific organization ID}
                            {--accounts : Recalculate account balances only}
                            {--projects : Recalculate project totals only}
                            {--donors : Recalculate donor totals only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculate all finance balances from entries (accounts, projects, donors)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizationId = $this->option('organization');
        $accountsOnly = $this->option('accounts');
        $projectsOnly = $this->option('projects');
        $donorsOnly = $this->option('donors');

        // If no specific option is set, recalculate all
        $recalcAll = !$accountsOnly && !$projectsOnly && !$donorsOnly;

        $this->info('Starting finance balance recalculation...');

        try {
            DB::transaction(function () use ($organizationId, $accountsOnly, $projectsOnly, $donorsOnly, $recalcAll) {
                // Recalculate account balances
                if ($recalcAll || $accountsOnly) {
                    $this->recalculateAccountBalances($organizationId);
                }

                // Recalculate project totals
                if ($recalcAll || $projectsOnly) {
                    $this->recalculateProjectTotals($organizationId);
                }

                // Recalculate donor totals
                if ($recalcAll || $donorsOnly) {
                    $this->recalculateDonorTotals($organizationId);
                }
            });

            $this->info('Finance balance recalculation completed successfully!');
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Error during recalculation: ' . $e->getMessage());
            \Log::error('RecalculateFinanceBalances error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    /**
     * Recalculate all account balances
     */
    private function recalculateAccountBalances(?string $organizationId): void
    {
        $query = FinanceAccount::whereNull('deleted_at');
        
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $accounts = $query->get();
        $count = $accounts->count();

        $this->info("Recalculating {$count} account balance(s)...");
        $bar = $this->output->createProgressBar($count);

        foreach ($accounts as $account) {
            $oldBalance = $account->current_balance;
            $newBalance = $account->recalculateBalance();
            
            if ($oldBalance != $newBalance) {
                $this->newLine();
                $this->warn("Account '{$account->name}' (ID: {$account->id}): {$oldBalance} -> {$newBalance}");
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Account balances recalculated: {$count}");
    }

    /**
     * Recalculate all project totals
     */
    private function recalculateProjectTotals(?string $organizationId): void
    {
        $query = FinanceProject::whereNull('deleted_at');
        
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $projects = $query->get();
        $count = $projects->count();

        $this->info("Recalculating {$count} project total(s)...");
        $bar = $this->output->createProgressBar($count);

        foreach ($projects as $project) {
            $oldIncome = $project->total_income;
            $oldExpense = $project->total_expense;
            $project->recalculateTotals();
            
            if ($oldIncome != $project->total_income || $oldExpense != $project->total_expense) {
                $this->newLine();
                $this->warn("Project '{$project->name}' (ID: {$project->id}): Income {$oldIncome} -> {$project->total_income}, Expense {$oldExpense} -> {$project->total_expense}");
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Project totals recalculated: {$count}");
    }

    /**
     * Recalculate all donor totals
     */
    private function recalculateDonorTotals(?string $organizationId): void
    {
        $query = Donor::whereNull('deleted_at');
        
        if ($organizationId) {
            $query->where('organization_id', $organizationId);
        }

        $donors = $query->get();
        $count = $donors->count();

        $this->info("Recalculating {$count} donor total(s)...");
        $bar = $this->output->createProgressBar($count);

        foreach ($donors as $donor) {
            $oldTotal = $donor->total_donated;
            $donor->recalculateTotalDonated();
            
            if ($oldTotal != $donor->total_donated) {
                $this->newLine();
                $this->warn("Donor '{$donor->name}' (ID: {$donor->id}): {$oldTotal} -> {$donor->total_donated}");
            }
            
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Donor totals recalculated: {$count}");
    }
}
