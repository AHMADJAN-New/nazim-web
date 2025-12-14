<?php

namespace App\Policies;

use App\Models\IncomingDocument;
use App\Models\User;
use App\Services\SecurityGateService;

class IncomingDocumentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('dms.incoming.read');
    }

    public function view(User $user, IncomingDocument $document): bool
    {
        return $user->hasPermissionTo('dms.incoming.read')
            && $this->hasClearance($user, $document->security_level_key, $document->organization_id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.incoming.create');
    }

    public function update(User $user, IncomingDocument $document): bool
    {
        return $user->hasPermissionTo('dms.incoming.update')
            && $this->hasClearance($user, $document->security_level_key, $document->organization_id);
    }

    public function delete(User $user, IncomingDocument $document): bool
    {
        return $user->hasPermissionTo('dms.incoming.delete')
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
