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
        // For creating files, user needs:
        // 1. dms.files.create permission (checked by controller)
        // 2. Read access to the document type
        // 3. Security clearance to view the document
        return $this->hasOwnerAccess($user, $file, false);
    }

    private function hasOwnerAccess(User $user, DocumentFile $file, bool $forUpdate = false): bool
    {
        if ($file->owner_type === 'incoming') {
            $document = IncomingDocument::find($file->owner_id);
            if (!$document) {
                return false;
            }

            // Allow file operations if user created the document
            $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
            if ($userCreatedDocument) {
                return true;
            }

            // For file operations, check read permission (not update)
            // The controller already checks dms.files.create permission
            $permission = 'dms.incoming.read';
            $hasPermission = $user->hasPermissionTo($permission);
            
            // If document has no security level, only permission check is needed
            if (!$document->security_level_key) {
                return $hasPermission;
            }
            
            // If document has security level, check both permission and clearance
            return $hasPermission
                && app(SecurityGateService::class)->canView($user, (string) $document->security_level_key, $document->organization_id);
        }

        if ($file->owner_type === 'outgoing') {
            $document = OutgoingDocument::find($file->owner_id);
            if (!$document) {
                return false;
            }

            // Allow file operations if user created the document
            $userCreatedDocument = isset($document->created_by) && $document->created_by === $user->id;
            if ($userCreatedDocument) {
                return true;
            }

            // For file operations, check read permission (not update)
            // The controller already checks dms.files.create permission
            $permission = 'dms.outgoing.read';
            $hasPermission = $user->hasPermissionTo($permission);
            
            // If document has no security level, only permission check is needed
            if (!$document->security_level_key) {
                return $hasPermission;
            }
            
            // If document has security level, check both permission and clearance
            return $hasPermission
                && app(SecurityGateService::class)->canView($user, (string) $document->security_level_key, $document->organization_id);
        }

        return false;
    }
}
