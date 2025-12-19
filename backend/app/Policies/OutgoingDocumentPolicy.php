<?php

namespace App\Policies;

use App\Models\OutgoingDocument;
use App\Models\User;
use App\Services\SecurityGateService;

class OutgoingDocumentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('dms.outgoing.read');
    }

    public function view(User $user, OutgoingDocument $document): bool
    {
        // Users can view documents in their organization
        // Permission and clearance checks are handled in the controller
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.outgoing.create');
    }

    public function update(User $user, OutgoingDocument $document): bool
    {
        return $user->hasPermissionTo('dms.outgoing.update')
            && $this->hasClearance($user, $document->security_level_key, $document->organization_id);
    }

    public function delete(User $user, OutgoingDocument $document): bool
    {
        return $user->hasPermissionTo('dms.outgoing.delete')
            && $this->hasClearance($user, $document->security_level_key, $document->organization_id);
    }

    private function hasClearance(User $user, ?string $levelKey, ?string $organizationId): bool
    {
        if (!$levelKey) {
            return true;
        }

        return app(SecurityGateService::class)->canView($user, $levelKey, $organizationId);
    }
}
