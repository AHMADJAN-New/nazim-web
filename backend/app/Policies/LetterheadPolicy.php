<?php

namespace App\Policies;

use App\Models\Letterhead;
use App\Models\User;

class LetterheadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('dms.letterheads.read') || $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function view(User $user, Letterhead $letterhead): bool
    {
        return $user->hasPermissionTo('dms.letterheads.read') || $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.letterheads.create') || $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function update(User $user, Letterhead $letterhead): bool
    {
        return $user->hasPermissionTo('dms.letterheads.update') || $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function delete(User $user, Letterhead $letterhead): bool
    {
        return $user->hasPermissionTo('dms.letterheads.delete') || $user->hasPermissionTo('dms.letterheads.manage');
    }
}
