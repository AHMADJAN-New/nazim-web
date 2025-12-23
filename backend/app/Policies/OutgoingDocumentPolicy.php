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
        // Allow if user has either read OR create permission
        $hasReadPermission = $user->hasPermissionTo('dms.outgoing.read');
        $hasCreatePermission = $user->hasPermissionTo('dms.outgoing.create');
        
        if (!$hasReadPermission && !$hasCreatePermission) {
            return false;
        }

        // Allow document creators to view their own documents regardless of security level
        $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
        if ($userCreatedDocument) {
            return true;
        }

        // Users with create permission can view any document (they can issue letters)
        if ($hasCreatePermission) {
            return true;
        }

        // For users with only read permission, check security clearance
        return $this->hasClearance($user, $document->security_level_key, $document->organization_id);
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.outgoing.create');
    }

    public function update(User $user, OutgoingDocument $document): bool
    {
        if (!$user->hasPermissionTo('dms.outgoing.update')) {
            return false;
        }

        // Allow document creators to update their own documents regardless of security level
        $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
        if ($userCreatedDocument) {
            return true;
        }

        // For other users, check security clearance
        return $this->hasClearance($user, $document->security_level_key, $document->organization_id);
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
