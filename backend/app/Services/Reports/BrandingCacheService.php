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
    public function getBranding(string $brandingId, bool $forceRefresh = false): ?array
    {
        $cacheKey = "branding.{$brandingId}";

        // If force refresh, clear cache first
        if ($forceRefresh) {
            Cache::forget($cacheKey);
        }

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($brandingId) {
            $branding = SchoolBranding::find($brandingId);

            if (!$branding) {
                \Log::warning("Branding not found: {$brandingId}");
                return null;
            }

            try {
                return $this->formatBranding($branding);
            } catch (\Exception $e) {
                \Log::error("Error formatting branding {$brandingId}: " . $e->getMessage());
                \Log::error("Stack trace: " . $e->getTraceAsString());
                return null;
            }
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
        
        // Clear notes and watermarks cache patterns
        Cache::forget("branding.{$brandingId}.notes.*");
        Cache::forget("branding.{$brandingId}.watermark.*");

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
        // Get the array first (which will have base64 encoded logos from toArray())
        $data = $branding->toArray();

        // Get raw binary data directly from database for logo URIs
        // Use raw query with encode() function to get base64 directly from PostgreSQL
        // Handle NULL values properly
        try {
            $logoData = \Illuminate\Support\Facades\DB::selectOne(
                "SELECT 
                    CASE 
                        WHEN primary_logo_binary IS NULL THEN NULL 
                        ELSE encode(primary_logo_binary, 'base64') 
                    END as primary_logo_base64,
                    CASE 
                        WHEN secondary_logo_binary IS NULL THEN NULL 
                        ELSE encode(secondary_logo_binary, 'base64') 
                    END as secondary_logo_base64,
                    CASE 
                        WHEN ministry_logo_binary IS NULL THEN NULL 
                        ELSE encode(ministry_logo_binary, 'base64') 
                    END as ministry_logo_base64
                FROM school_branding 
                WHERE id = ?",
                [$branding->id]
            );
            
            if (!$logoData) {
                \Log::warning("No logo data found for branding {$branding->id}");
            } else {
                \Log::debug("Logo data retrieved for branding {$branding->id}: " . 
                    "primary=" . (!empty($logoData->primary_logo_base64) ? strlen($logoData->primary_logo_base64) . " chars" : "NULL") .
                    ", secondary=" . (!empty($logoData->secondary_logo_base64) ? strlen($logoData->secondary_logo_base64) . " chars" : "NULL") .
                    ", ministry=" . (!empty($logoData->ministry_logo_base64) ? strlen($logoData->ministry_logo_base64) . " chars" : "NULL")
                );
            }
        } catch (\Exception $e) {
            \Log::error("Error querying logo data for branding {$branding->id}: " . $e->getMessage());
            \Log::error("Stack trace: " . $e->getTraceAsString());
            $logoData = null;
        }

        // Helper function to get base64 from query result
        $getBase64 = function($base64String) {
            if (empty($base64String)) {
                return null;
            }
            // PostgreSQL encode() returns base64 string, use it directly
            return trim($base64String);
        };

        // Compress logos for reports (reduce file size and improve performance)
        $compressionService = app(\App\Services\Reports\LogoCompressionService::class);

        // Primary logo
        if ($logoData && !empty($logoData->primary_logo_base64)) {
            $base64 = $getBase64($logoData->primary_logo_base64);
            if ($base64) {
                $mime = $branding->primary_logo_mime_type ?? 'image/png';
                
                // Compress logo for reports
                $compressed = $compressionService->compressLogoFromBase64($base64, $mime);
                if ($compressed) {
                    $compressedBase64 = base64_encode($compressed['binary']);
                    $compressedBase64 = preg_replace('/\s+/', '', $compressedBase64);
                    $data['primary_logo_uri'] = "data:{$compressed['mime_type']};base64,{$compressedBase64}";
                    \Log::debug("Primary logo compressed and URI created for branding {$branding->id}, compressed base64 length: " . strlen($compressedBase64));
                } else {
                    // Fallback to original if compression fails
                    $base64 = preg_replace('/\s+/', '', $base64);
                    $data['primary_logo_uri'] = "data:{$mime};base64,{$base64}";
                    \Log::warning("Primary logo compression failed for branding {$branding->id}, using original");
                }
            } else {
                \Log::warning("Primary logo base64 is empty for branding {$branding->id}");
                $data['primary_logo_uri'] = null;
            }
        } else {
            \Log::debug("No primary logo data found for branding {$branding->id}");
            $data['primary_logo_uri'] = null;
        }

        // Secondary logo
        if ($logoData && !empty($logoData->secondary_logo_base64)) {
            $base64 = $getBase64($logoData->secondary_logo_base64);
            if ($base64) {
                $mime = $branding->secondary_logo_mime_type ?? 'image/png';
                
                // Compress logo for reports
                $compressed = $compressionService->compressLogoFromBase64($base64, $mime);
                if ($compressed) {
                    $compressedBase64 = base64_encode($compressed['binary']);
                    $compressedBase64 = preg_replace('/\s+/', '', $compressedBase64);
                    $data['secondary_logo_uri'] = "data:{$compressed['mime_type']};base64,{$compressedBase64}";
                    \Log::debug("Secondary logo compressed and URI created for branding {$branding->id}");
                } else {
                    // Fallback to original if compression fails
                    $base64 = preg_replace('/\s+/', '', $base64);
                    $data['secondary_logo_uri'] = "data:{$mime};base64,{$base64}";
                    \Log::warning("Secondary logo compression failed for branding {$branding->id}, using original");
                }
            } else {
                \Log::warning("Secondary logo base64 is empty for branding {$branding->id}");
                $data['secondary_logo_uri'] = null;
            }
        } else {
            \Log::debug("No secondary logo data found for branding {$branding->id}");
            $data['secondary_logo_uri'] = null;
        }

        // Ministry logo
        if ($logoData && !empty($logoData->ministry_logo_base64)) {
            $base64 = $getBase64($logoData->ministry_logo_base64);
            if ($base64) {
                $mime = $branding->ministry_logo_mime_type ?? 'image/png';
                
                // Compress logo for reports
                $compressed = $compressionService->compressLogoFromBase64($base64, $mime);
                if ($compressed) {
                    $compressedBase64 = base64_encode($compressed['binary']);
                    $compressedBase64 = preg_replace('/\s+/', '', $compressedBase64);
                    $data['ministry_logo_uri'] = "data:{$compressed['mime_type']};base64,{$compressedBase64}";
                    \Log::debug("Ministry logo compressed and URI created for branding {$branding->id}");
                } else {
                    // Fallback to original if compression fails
                    $base64 = preg_replace('/\s+/', '', $base64);
                    $data['ministry_logo_uri'] = "data:{$mime};base64,{$base64}";
                    \Log::warning("Ministry logo compression failed for branding {$branding->id}, using original");
                }
            } else {
                \Log::warning("Ministry logo base64 is empty for branding {$branding->id}");
                $data['ministry_logo_uri'] = null;
            }
        } else {
            \Log::debug("No ministry logo data found for branding {$branding->id}");
            $data['ministry_logo_uri'] = null;
        }

        // Use new logo selection fields (show_primary_logo, show_secondary_logo, show_ministry_logo)
        // These are set by the user in the UI and enforce max 2 logos
        $data['show_primary_logo'] = ($branding->show_primary_logo ?? true) && !empty($data['primary_logo_uri']);
        $data['show_secondary_logo'] = ($branding->show_secondary_logo ?? false) && !empty($data['secondary_logo_uri']);
        $data['show_ministry_logo'] = ($branding->show_ministry_logo ?? false) && !empty($data['ministry_logo_uri']);
        
        // Add logo positioning
        $data['primary_logo_position'] = $branding->primary_logo_position ?? 'left';
        $data['secondary_logo_position'] = $branding->secondary_logo_position ?? 'right';
        $data['ministry_logo_position'] = $branding->ministry_logo_position ?? 'right';
        
        // CRITICAL: Always explicitly set colors and fonts from branding model
        // This ensures they are always present even if toArray() doesn't include them
        $data['primary_color'] = $branding->primary_color ?? ($data['primary_color'] ?? '#0b0b56');
        $data['secondary_color'] = $branding->secondary_color ?? ($data['secondary_color'] ?? '#0056b3');
        $data['accent_color'] = $branding->accent_color ?? ($data['accent_color'] ?? '#ff6b35');
        $data['font_family'] = $branding->font_family ?? ($data['font_family'] ?? 'Bahij Nassim');
        $data['report_font_size'] = $branding->report_font_size ?? ($data['report_font_size'] ?? '12px');
        
        // Also ensure school_name and other branding fields are present
        $data['school_name'] = $branding->school_name ?? ($data['school_name'] ?? '');
        $data['school_name_pashto'] = $branding->school_name_pashto ?? ($data['school_name_pashto'] ?? '');
        $data['school_name_arabic'] = $branding->school_name_arabic ?? ($data['school_name_arabic'] ?? '');
        $data['school_address'] = $branding->school_address ?? ($data['school_address'] ?? '');
        $data['school_phone'] = $branding->school_phone ?? ($data['school_phone'] ?? '');
        $data['school_email'] = $branding->school_email ?? ($data['school_email'] ?? '');
        $data['school_website'] = $branding->school_website ?? ($data['school_website'] ?? '');
        
        \Log::debug("Logo visibility for branding {$branding->id}: show_primary={$data['show_primary_logo']}, show_secondary={$data['show_secondary_logo']}, show_ministry={$data['show_ministry_logo']}");
        \Log::debug("Branding colors and fonts for {$branding->id}: primary_color={$data['primary_color']}, secondary_color={$data['secondary_color']}, accent_color={$data['accent_color']}, font_family={$data['font_family']}, report_font_size={$data['report_font_size']}");
        
        // CRITICAL: Verify colors are explicitly set in the returned array
        if (empty($data['primary_color']) || empty($data['secondary_color']) || empty($data['accent_color'])) {
            \Log::warning("Colors missing in branding data for {$branding->id}: primary={$data['primary_color']}, secondary={$data['secondary_color']}, accent={$data['accent_color']}");
        }

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
