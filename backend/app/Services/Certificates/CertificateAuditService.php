<?php

namespace App\Services\Certificates;

use App\Models\CertificateAuditLog;

class CertificateAuditService
{
    public function log(
        string $organizationId,
        string $schoolId,
        string $entityType,
        string $entityId,
        string $action,
        ?array $metadata = null,
        ?string $performedBy = null
    ): void {
        $actor = $performedBy ?? ($metadata['user_id'] ?? auth()->id());
        if (!$actor) {
            // Fallback to a sentinel to avoid null constraint; should rarely be used
            $actor = '00000000-0000-0000-0000-000000000000';
        }

        CertificateAuditLog::create([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'action' => $action,
            'metadata_json' => $metadata,
            'performed_by' => $actor,
            'performed_at' => now(),
        ]);
    }
}
