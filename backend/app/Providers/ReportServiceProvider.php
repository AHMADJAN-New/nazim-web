<?php

namespace App\Providers;

use App\Services\Reports\BrandingCacheService;
use App\Services\Reports\DateConversionService;
use App\Services\Reports\ExcelReportService;
use App\Services\Reports\PdfReportService;
use App\Services\Reports\ReportService;
use App\Services\Storage\FileStorageService;
use Illuminate\Support\ServiceProvider;

class ReportServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register BrandingCacheService as singleton
        $this->app->singleton(BrandingCacheService::class, function ($app) {
            return new BrandingCacheService();
        });

        // Register PdfReportService
        $this->app->bind(PdfReportService::class, function ($app) {
            return new PdfReportService(
                $app->make(FileStorageService::class)
            );
        });

        // Register ExcelReportService
        $this->app->bind(ExcelReportService::class, function ($app) {
            return new ExcelReportService(
                $app->make(FileStorageService::class)
            );
        });

        // Register DateConversionService
        $this->app->bind(DateConversionService::class, function ($app) {
            return new DateConversionService();
        });

        // Register ReportService
        $this->app->bind(ReportService::class, function ($app) {
            return new ReportService(
                $app->make(BrandingCacheService::class),
                $app->make(PdfReportService::class),
                $app->make(ExcelReportService::class),
                $app->make(DateConversionService::class)
            );
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Preload branding cache on boot if needed
        // $this->app->make(BrandingCacheService::class)->preload();
    }
}
