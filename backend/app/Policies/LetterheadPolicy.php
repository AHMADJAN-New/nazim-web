<?php

namespace App\Policies;

use App\Models\Letterhead;
use App\Models\User;

class LetterheadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function view(User $user, Letterhead $letterhead): bool
    {
        return $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.letterheads.manage');
    }

    public function update(User $user, Letterhead $letterhead): bool
    {
        return $user->hasPermissionTo('dms.letterheads.manage');
    }
}
