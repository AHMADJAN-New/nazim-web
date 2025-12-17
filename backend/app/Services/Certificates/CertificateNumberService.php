<?php

namespace App\Services\Certificates;

use App\Models\OrganizationCounter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CertificateNumberService
{
    /**
     * Generate a unique certificate number in format NZM-{TYPE}-{YEAR}-{SEQUENCE}
     */
    public function generate(string $organizationId, string $schoolId, string $type, \DateTimeInterface $date): string
    {
        $year = $date->format('Y');
        $typePart = Str::upper(Str::slug($type ?? 'GEN', '-'));
        $counterKey = sprintf('certificate_%s_%s_%s', Str::slug($type, '_'), $schoolId, $year);

        $sequence = DB::transaction(function () use ($organizationId, $counterKey) {
            $counter = OrganizationCounter::where('organization_id', $organizationId)
                ->where('counter_type', $counterKey)
                ->lockForUpdate()
                ->first();

            if (!$counter) {
                $counter = OrganizationCounter::create([
                    'organization_id' => $organizationId,
                    'counter_type' => $counterKey,
                    'last_value' => 0,
                ]);
            }

            $counter->last_value = ($counter->last_value ?? 0) + 1;
            $counter->save();

            return $counter->last_value;
        });

        return sprintf('NZM-%s-%s-%04d', $typePart, $year, $sequence);
    }
}
