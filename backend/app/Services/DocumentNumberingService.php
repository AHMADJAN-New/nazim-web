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

    private function defaultPrefix(string $docType, string $organizationId, ?string $schoolId): string
    {
        $settings = DocumentSetting::where('organization_id', $organizationId)
            ->where(function ($q) use ($schoolId) {
                $q->whereNull('school_id');
                if ($schoolId) {
                    $q->orWhere('school_id', $schoolId);
                }
            })
            ->orderByRaw('CASE WHEN school_id IS NULL THEN 1 ELSE 0 END')
            ->first();

        if ($settings) {
            return $docType === 'incoming'
                ? ($settings->incoming_prefix ?? 'IN')
                : ($settings->outgoing_prefix ?? 'OUT');
        }

        return $docType === 'incoming' ? 'IN' : 'OUT';
    }
}
