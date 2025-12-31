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
