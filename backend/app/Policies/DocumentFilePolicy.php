<?php

namespace App\Policies;

use App\Models\DocumentFile;
use App\Models\IncomingDocument;
use App\Models\OutgoingDocument;
use App\Models\User;
use App\Services\SecurityGateService;

class DocumentFilePolicy
{
    public function view(User $user, DocumentFile $file): bool
    {
        return $this->hasOwnerAccess($user, $file);
    }

    public function create(User $user, DocumentFile $file): bool
    {
        return $this->hasOwnerAccess($user, $file, true);
    }

    private function hasOwnerAccess(User $user, DocumentFile $file, bool $forUpdate = false): bool
    {
        if ($file->owner_type === 'incoming') {
            $document = IncomingDocument::find($file->owner_id);
            if (!$document) {
                return false;
            }

            $permission = $forUpdate ? 'dms.incoming.update' : 'dms.incoming.read';
            return $user->hasPermissionTo($permission)
                && app(SecurityGateService::class)->canView($user, (string) $document->security_level_key, $document->organization_id);
        }

        if ($file->owner_type === 'outgoing') {
            $document = OutgoingDocument::find($file->owner_id);
            if (!$document) {
                return false;
            }

            $permission = $forUpdate ? 'dms.outgoing.update' : 'dms.outgoing.read';
            return $user->hasPermissionTo($permission)
                && app(SecurityGateService::class)->canView($user, (string) $document->security_level_key, $document->organization_id);
        }

        return false;
    }
}
