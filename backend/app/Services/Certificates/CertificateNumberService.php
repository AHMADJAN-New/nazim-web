<?php

namespace App\Services\Certificates;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CertificateNumberService
{
    /**
     * Generate a unique certificate number in format NZM-{TYPE}-{YEAR}-{SEQUENCE}
     * 
     * @param string $organizationId
     * @param string $schoolId
     * @param string $type
     * @param \DateTimeInterface $date
     * @param int|null $startingNumber Optional starting number (for schools continuing from existing numbers)
     * @param string|null $prefix Optional custom prefix (default: 'NZM')
     * @param int|null $padding Optional padding length (default: 4)
     * @return string
     */
    public function generate(
        string $organizationId, 
        string $schoolId, 
        string $type, 
        \DateTimeInterface $date,
        ?int $startingNumber = null,
        ?string $prefix = null,
        ?int $padding = null
    ): string {
        $year = $date->format('Y');
        $typePart = Str::upper(Str::slug($type ?? 'GEN', '-'));
        $counterKey = sprintf('certificate_%s_%s_%s', Str::slug($type, '_'), $schoolId, $year);
        $prefix = $prefix ?? 'NZM';
        $padding = $padding ?? 4;

        $sequence = DB::transaction(function () use ($organizationId, $counterKey, $startingNumber) {
            $counter = OrganizationCounter::where('organization_id', $organizationId)
                ->where('counter_type', $counterKey)
                ->lockForUpdate()
                ->first();

            if (!$counter) {
                // If starting number is provided, use it; otherwise start from 0
                $initialValue = $startingNumber !== null ? max(0, $startingNumber - 1) : 0;
                
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => $counterKey,
                    'last_value' => $initialValue,
                ]);
            } elseif ($startingNumber !== null && $counter->last_value < $startingNumber - 1) {
                // If starting number is provided and counter is lower, update it
                $counter->last_value = max($counter->last_value, $startingNumber - 1);
            }

            $counter->last_value = ($counter->last_value ?? 0) + 1;
            $counter->save();

            return $counter->last_value;
        });

        return sprintf('%s-%s-%s-%0' . $padding . 'd', $prefix, $typePart, $year, $sequence);
    }
}
