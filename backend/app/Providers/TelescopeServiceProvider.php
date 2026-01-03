<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class TelescopeServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Telescope disabled on production server
    }

    public function boot(): void
    {
        //
    }
}
