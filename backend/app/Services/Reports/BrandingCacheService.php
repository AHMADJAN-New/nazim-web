<?php

namespace App\Services\Reports;

use App\Models\SchoolBranding;
use App\Models\BrandingLayout;
use App\Models\BrandingNote;
use App\Models\BrandingWatermark;
use Illuminate\Support\Facades\Cache;

/**
 * Caching service for branding data
 */
class BrandingCacheService
{
    private const CACHE_TTL = 3600; // 1 hour

    /**
     * Get branding data with binary logos
     */
    public function getBranding(string $brandingId): ?array
    {
        $cacheKey = "branding.{$brandingId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($brandingId) {
            $branding = SchoolBranding::find($brandingId);

            if (!$branding) {
                return null;
            }

            return $this->formatBranding($branding);
        });
    }

    /**
     * Get default layout for branding
     */
    public function getDefaultLayout(string $brandingId): ?array
    {
        $cacheKey = "branding.{$brandingId}.layout.default";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($brandingId) {
            $layout = BrandingLayout::where('branding_id', $brandingId)
                ->where('is_active', true)
                ->where('is_default', true)
                ->first();

            if (!$layout) {
                // Try to get any active layout
                $layout = BrandingLayout::where('branding_id', $brandingId)
                    ->where('is_active', true)
                    ->first();
            }

            if (!$layout) {
                // Return default layout settings
                return $this->getDefaultLayoutSettings();
            }

            return $layout->toArray();
        });
    }

    /**
     * Get layout by ID
     */
    public function getLayout(string $layoutId): ?array
    {
        $cacheKey = "layout.{$layoutId}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($layoutId) {
            $layout = BrandingLayout::find($layoutId);
            return $layout ? $layout->toArray() : null;
        });
    }

    /**
     * Get notes for a report
     */
    public function getNotes(string $brandingId, string $reportKey, string $format = 'pdf'): array
    {
        $cacheKey = "branding.{$brandingId}.notes.{$reportKey}.{$format}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($brandingId, $reportKey, $format) {
            $notes = BrandingNote::where('branding_id', $brandingId)
                ->where('is_active', true)
                ->where(function ($q) use ($reportKey) {
                    $q->where('report_key', $reportKey)
                      ->orWhereNull('report_key');
                })
                ->where(function ($q) use ($format) {
                    $q->where('show_on', $format)
                      ->orWhere('show_on', 'all');
                })
                ->orderBy('location')
                ->orderBy('sort_order')
                ->get();

            // Group by location
            $grouped = [
                'header' => [],
                'body' => [],
                'footer' => [],
            ];

            foreach ($notes as $note) {
                $grouped[$note->location][] = $note->toArray();
            }

            return $grouped;
        });
    }

    /**
     * Get watermark for a report
     */
    public function getWatermark(string $brandingId, string $reportKey): ?array
    {
        $cacheKey = "branding.{$brandingId}.watermark.{$reportKey}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($brandingId, $reportKey) {
            $watermark = BrandingWatermark::where('branding_id', $brandingId)
                ->where('is_active', true)
                ->where(function ($q) use ($reportKey) {
                    $q->where('report_key', $reportKey)
                      ->orWhereNull('report_key');
                })
                ->orderBy('sort_order')
                ->first();

            if (!$watermark) {
                return null;
            }

            $data = $watermark->toArray();

            // Add image data URI if it's an image watermark
            if ($watermark->isImage()) {
                $data['image_data_uri'] = $watermark->getImageDataUri();
            }

            return $data;
        });
    }

    /**
     * Clear branding cache
     */
    public function clearBrandingCache(string $brandingId): void
    {
        Cache::forget("branding.{$brandingId}");
        Cache::forget("branding.{$brandingId}.layout.default");

        // Clear all notes and watermarks for this branding
        // Note: In production, you might want to use cache tags for more efficient clearing
    }

    /**
     * Clear layout cache
     */
    public function clearLayoutCache(string $layoutId): void
    {
        Cache::forget("layout.{$layoutId}");
    }

    /**
     * Clear all report-related cache
     */
    public function clearAllCache(): void
    {
        // Use cache tags in production for more efficient clearing
        Cache::flush();
    }

    /**
     * Format branding model to array with logo data URIs
     */
    private function formatBranding(SchoolBranding $branding): array
    {
        $data = $branding->toArray();

        // Convert logo binaries to data URIs
        if (!empty($branding->primary_logo_binary)) {
            $mime = $branding->primary_logo_mime_type ?? 'image/png';
            $base64 = base64_encode($branding->primary_logo_binary);
            $data['primary_logo_uri'] = "data:{$mime};base64,{$base64}";
        }

        if (!empty($branding->secondary_logo_binary)) {
            $mime = $branding->secondary_logo_mime_type ?? 'image/png';
            $base64 = base64_encode($branding->secondary_logo_binary);
            $data['secondary_logo_uri'] = "data:{$mime};base64,{$base64}";
        }

        if (!empty($branding->ministry_logo_binary)) {
            $mime = $branding->ministry_logo_mime_type ?? 'image/png';
            $base64 = base64_encode($branding->ministry_logo_binary);
            $data['ministry_logo_uri'] = "data:{$mime};base64,{$base64}";
        }

        // Parse report_logo_selection
        $logoSelection = $branding->report_logo_selection ?? 'primary,secondary';
        $logos = array_map('trim', explode(',', $logoSelection));
        $data['show_primary_logo'] = in_array('primary', $logos);
        $data['show_secondary_logo'] = in_array('secondary', $logos);
        $data['show_ministry_logo'] = in_array('ministry', $logos);

        return $data;
    }

    /**
     * Get default layout settings
     */
    private function getDefaultLayoutSettings(): array
    {
        return [
            'id' => null,
            'layout_name' => 'Default',
            'page_size' => 'A4',
            'orientation' => 'portrait',
            'margins' => '15mm 12mm 18mm 12mm',
            'rtl' => true,
            'header_html' => null,
            'footer_html' => null,
            'extra_css' => null,
            'show_primary_logo' => true,
            'show_secondary_logo' => true,
            'show_ministry_logo' => false,
            'logo_height_px' => 60,
            'header_height_px' => 100,
            'header_layout_style' => 'three-column',
            'is_active' => true,
            'is_default' => true,
        ];
    }
}
