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
        if (!$user->hasPermissionTo('dms.incoming.update')) {
            \Log::warning("IncomingDocumentPolicy::update failed - missing permission", [
                'user_id' => $user->id,
                'document_id' => $document->id,
                'permission' => 'dms.incoming.update',
            ]);
            return false;
        }

        // Allow document creators to update their own documents regardless of security level
        $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
        if ($userCreatedDocument) {
            return true;
        }

        // For other users, check security clearance
        $hasClearance = $this->hasClearance($user, $document->security_level_key, $document->organization_id);
        
        if (!$hasClearance) {
            \Log::warning("IncomingDocumentPolicy::update failed - insufficient clearance", [
                'user_id' => $user->id,
                'document_id' => $document->id,
                'document_security_level' => $document->security_level_key,
                'user_clearance' => $user->profile->clearance_level_key ?? null,
            ]);
        }
        
        return $hasClearance;
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
