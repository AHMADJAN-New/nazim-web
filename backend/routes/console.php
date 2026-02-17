<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule subscription processing commands
Schedule::command('subscription:process-transitions')
    ->daily()
    ->at('06:00')
    ->appendOutputTo(storage_path('logs/subscription-transitions.log'))
    ->description('Process subscription status transitions and send notifications');

Schedule::command('subscription:create-snapshots')
    ->monthly()
    ->appendOutputTo(storage_path('logs/subscription-snapshots.log'))
    ->description('Create monthly usage snapshots for all organizations');

// Schedule help center analytics pruning
Schedule::command('help-center:prune-analytics')
    ->daily()
    ->at('02:00')
    ->appendOutputTo(storage_path('logs/help-center-analytics-pruning.log'))
    ->description('Prune old help center analytics data (views and votes)');

// Schedule login audit pruning
Schedule::command('login-audit:prune')
    ->daily()
    ->at('03:00')
    ->appendOutputTo(storage_path('logs/login-audit-pruning.log'))
    ->description('Prune old login attempts and resolved lockouts');

// Schedule usage count recalculation for accuracy
// Runs every 15 minutes to catch any drift from concurrent operations
Schedule::command('usage:recalculate')
    ->everyFifteenMinutes()
    ->appendOutputTo(storage_path('logs/usage-recalculation.log'))
    ->description('Recalculate usage counts from database to ensure accuracy');
