<?php

namespace App\Console\Commands;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Database\Seeders\WebsitePagesAndNavigationSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SeedWebsitePages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'website:seed-pages
                            {organization_id : The UUID of the organization}
                            {school_id : The UUID of the school}
                            {--language=ps : Language code (en, ps, fa, ar)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed website pages and navigation for a specific organization and school';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $organizationId = $this->argument('organization_id');
        $schoolId = $this->argument('school_id');
        $language = $this->option('language') ?? 'ps';

        // Validate organization exists
        $organization = Organization::where('id', $organizationId)
            ->whereNull('deleted_at')
            ->first();

        if (!$organization) {
            $this->error("Organization not found: {$organizationId}");
            return Command::FAILURE;
        }

        // Validate school exists
        $school = SchoolBranding::where('id', $schoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$school) {
            $this->error("School not found: {$schoolId}");
            return Command::FAILURE;
        }

        // Validate school belongs to organization
        if ($school->organization_id !== $organizationId) {
            $this->error("School {$schoolId} does not belong to organization {$organizationId}");
            return Command::FAILURE;
        }

        $this->info("Seeding website pages and navigation...");
        $this->line("  Organization: {$organization->name} ({$organizationId})");
        $this->line("  School: {$school->school_name} ({$schoolId})");
        $this->line("  Language: {$language}");
        $this->newLine();

        try {
            $seeder = new WebsitePagesAndNavigationSeeder();
            $seeder->seedForSchool($organizationId, $schoolId, $language);

            $this->newLine();
            $this->info('✅ Website pages and navigation seeded successfully!');
            $this->newLine();

            // Show summary
            $pageCount = DB::table('website_pages')
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->count();

            $menuCount = DB::table('website_menu_links')
                ->where('organization_id', $organizationId)
                ->where('school_id', $schoolId)
                ->whereNull('deleted_at')
                ->count();

            $this->line("Summary:");
            $this->line("  - Pages created/updated: {$pageCount}");
            $this->line("  - Menu links created/updated: {$menuCount}");

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->newLine();
            $this->error('❌ Failed to seed website pages and navigation');
            $this->error("Error: {$e->getMessage()}");
            $this->error("File: {$e->getFile()}:{$e->getLine()}");
            
            if ($this->option('verbose')) {
                $this->error("Trace: {$e->getTraceAsString()}");
            }

            return Command::FAILURE;
        }
    }
}

