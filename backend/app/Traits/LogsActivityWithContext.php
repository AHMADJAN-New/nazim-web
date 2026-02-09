<?php

namespace App\Traits;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Trait to add activity logging with multi-tenant context
 * Extends Spatie's LogsActivity trait to automatically capture organization_id and school_id
 */
trait LogsActivityWithContext
{
    use LogsActivity;

    /**
     * Get the activity log options for the model.
     * Override this in your model to customize what attributes are logged.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnlyDirty()
            ->logFillable()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Hook into the activity logging to add organization_id and school_id
     */
    public function tapActivity(\Spatie\Activitylog\Contracts\Activity $activity, string $eventName)
    {
        // Get organization_id and school_id from the model if available
        $organizationId = $this->organization_id ?? null;
        $schoolId = $this->school_id ?? null;

        // Fall back to authenticated user's profile
        if (!$organizationId) {
            $user = Auth::user();
            if ($user) {
                $profile = DB::table('profiles')->where('id', $user->id)->first();
                if ($profile) {
                    $organizationId = $profile->organization_id ?? null;
                    $schoolId = $schoolId ?? ($profile->default_school_id ?? null);
                }
            }
        }

        // Set multi-tenant context
        $activity->organization_id = $organizationId;
        $activity->school_id = $schoolId;

        // Set request context if available
        $request = request();
        if ($request) {
            $activity->ip_address = $request->ip();
            $activity->user_agent = $request->userAgent();
            $activity->request_method = $request->method();
            $activity->route = $request->route()?->getName() ?? $request->path();
            // Only access session if it exists (avoid exception in console context)
            $activity->session_id = $request->hasSession() ? $request->session()->getId() : null;
            $activity->request_id = (string) \Illuminate\Support\Str::uuid();
        }
    }
}
