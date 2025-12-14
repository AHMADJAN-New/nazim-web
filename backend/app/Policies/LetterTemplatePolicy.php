<?php

namespace App\Policies;

use App\Models\LetterTemplate;
use App\Models\User;

class LetterTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('dms.templates.read');
    }

    public function view(User $user, LetterTemplate $template): bool
    {
        return $user->hasPermissionTo('dms.templates.read');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('dms.templates.create');
    }

    public function update(User $user, LetterTemplate $template): bool
    {
        return $user->hasPermissionTo('dms.templates.update');
    }

    public function delete(User $user, LetterTemplate $template): bool
    {
        return $user->hasPermissionTo('dms.templates.delete');
    }
}
