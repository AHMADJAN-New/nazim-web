<?php

namespace App\Services;

use App\Models\DocumentSequence;
use App\Models\DocumentSetting;
use Illuminate\Support\Facades\DB;

class DocumentNumberingService
{
    public function generateIncomingNumber(string $organizationId, ?string $schoolId = null, ?string $prefix = null, ?string $yearKey = null): array
    {
        return $this->generateNumber('incoming', $organizationId, $schoolId, $prefix, $yearKey);
    }

    public function generateOutgoingNumber(string $organizationId, ?string $schoolId = null, ?string $prefix = null, ?string $yearKey = null): array
    {
        return $this->generateNumber('outgoing', $organizationId, $schoolId, $prefix, $yearKey);
    }

    private function generateNumber(string $docType, string $organizationId, ?string $schoolId, ?string $prefix, ?string $yearKey): array
    {
        $yearKey = $yearKey ?? now()->format('Y');
        $prefix = $prefix ?? $this->defaultPrefix($docType, $organizationId, $schoolId);

        return DB::transaction(function () use ($docType, $organizationId, $schoolId, $prefix, $yearKey) {
            $sequence = DocumentSequence::where([
                'organization_id' => $organizationId,
                'school_id' => $schoolId,
                'doc_type' => $docType,
                'prefix' => $prefix,
                'year_key' => $yearKey,
            ])->lockForUpdate()->first();

            if (!$sequence) {
                $sequence = new DocumentSequence([
                    'organization_id' => $organizationId,
                    'school_id' => $schoolId,
                    'doc_type' => $docType,
                    'prefix' => $prefix,
                    'year_key' => $yearKey,
                    'last_number' => 0,
                ]);
            }

            $sequence->last_number = ($sequence->last_number ?? 0) + 1;
            $sequence->save();

            $paddedNumber = str_pad((string) $sequence->last_number, 5, '0', STR_PAD_LEFT);
            $full = trim(sprintf('%s/%s/%s', $prefix, $yearKey, $paddedNumber), '/');

            return [
                'sequence' => $sequence,
                'number' => $sequence->last_number,
                'prefix' => $prefix,
                'year_key' => $yearKey,
                'full_number' => $full,
            ];
        });
    }

    /**
     * Get year key based on year mode (gregorian, hijri, shamsi)
     * @param string $yearMode - 'gregorian', 'hijri', 'shamsi', or 'qamari' (same as hijri)
     * @param \App\Models\AcademicYear|null $academicYear - Optional academic year to get year from
     * @return string
     */
    public function getYearKey(string $yearMode = 'gregorian', ?\App\Models\AcademicYear $academicYear = null): string
    {
        // If academic year is provided, use its start date
        $date = $academicYear && $academicYear->start_date 
            ? \Carbon\Carbon::parse($academicYear->start_date)
            : now();

        switch (strtolower($yearMode)) {
            case 'hijri':
            case 'qamari':
                // Convert to Hijri (Islamic lunar calendar)
                // Using Carbon's built-in Hijri support or a library
                // For now, using a simple approximation - you may want to use a proper Hijri library
                $hijriYear = $this->convertToHijri($date);
                return (string) $hijriYear;

            case 'shamsi':
            case 'solar':
                // Convert to Shamsi (Persian solar calendar)
                $shamsiYear = $this->convertToShamsi($date);
                return (string) $shamsiYear;

            case 'gregorian':
            default:
                return $date->format('Y');
        }
    }

    /**
     * Convert Gregorian date to Hijri year (approximation)
     * Note: This is a simplified conversion. For production, consider using a proper Hijri library
     */
    private function convertToHijri(\Carbon\Carbon $date): int
    {
        // Hijri year = Gregorian year - 579 (approximate)
        // More accurate: (Gregorian year - 622) * 365 / 354
        $gregorianYear = (int) $date->format('Y');
        $hijriYear = (int) round(($gregorianYear - 622) * 365 / 354);
        return max(1, $hijriYear); // Ensure positive year
    }

    /**
     * Convert Gregorian date to Shamsi year (Persian solar calendar)
     * Note: This is a simplified conversion. For production, consider using a proper Shamsi library
     */
    private function convertToShamsi(\Carbon\Carbon $date): int
    {
        // Shamsi year = Gregorian year - 621 (approximate)
        // More accurate calculation would use proper Persian calendar conversion
        $gregorianYear = (int) $date->format('Y');
        $month = (int) $date->format('m');
        $day = (int) $date->format('d');

        // Persian New Year (Nowruz) is around March 21
        // If date is before March 21, the Shamsi year is one less
        $shamsiYear = $gregorianYear - 621;
        if ($month < 3 || ($month === 3 && $day < 21)) {
            $shamsiYear--;
        }

        return max(1, $shamsiYear);
    }

    private function defaultPrefix(string $docType, string $organizationId, ?string $schoolId): string
    {
        if (!$schoolId) {
            return $docType === 'incoming' ? 'IN' : 'OUT';
        }

        // Strict school scoping: document settings are always school-scoped
        $settings = DocumentSetting::where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->first();

        if ($settings) {
            return $docType === 'incoming'
                ? ($settings->incoming_prefix ?? 'IN')
                : ($settings->outgoing_prefix ?? 'OUT');
        }

        return $docType === 'incoming' ? 'IN' : 'OUT';
    }
}
