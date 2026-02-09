<?php

namespace App\Services;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Contracts\Activity as ActivityContract;

class ActivityLogService
{
    /**
     * Log an activity with automatic context capture
     *
     * @param string $description Description of the activity
     * @param string|null $logName Log name (default: 'default')
     * @param mixed $subject The model/entity being acted upon
     * @param string|null $event Event name (created, updated, deleted, etc.)
     * @param array|null $properties Additional properties to log
     * @param Request|null $request Request object for context
     * @return ActivityContract
     */
    public function log(
        string $description,
        ?string $logName = null,
        $subject = null,
        ?string $event = null,
        ?array $properties = null,
        ?Request $request = null
    ): ActivityContract {
        $request = $request ?? request();
        $user = Auth::user();

        // Get organization and school from profile
        $profile = null;
        $organizationId = null;
        $schoolId = null;

        if ($user) {
            $profile = DB::table('profiles')->where('id', $user->id)->first();
            if ($profile) {
                $organizationId = $profile->organization_id ?? null;
                $schoolId = $profile->default_school_id ?? null;
            }
        }

        // Build activity logger chain
        $logger = activity($logName ?? 'default')
            ->causedBy($user)
            ->withProperties($properties ?? []);

        // Set subject if provided
        if ($subject) {
            $logger->performedOn($subject);
        }

        // Set event if provided
        if ($event) {
            $logger->event($event);
        }

        // Log the activity (this creates and saves the Activity model)
        $activity = $logger->log($description);

        // Add multi-tenant and request context after log is created
        // The activity is already saved, so we need to update it
        if ($activity instanceof Activity) {
            $activity->organization_id = $organizationId;
            $activity->school_id = $schoolId;
            $activity->ip_address = $request->ip();
            $activity->user_agent = $request->userAgent();
            $activity->request_method = $request->method();
            $activity->route = $request->route()?->getName() ?? $request->path();
            $activity->session_id = $request->session()?->getId();
            $activity->request_id = (string) \Illuminate\Support\Str::uuid();
            $activity->save();
        }

        return $activity;
    }

    /**
     * Log a create action
     *
     * @param mixed $subject The model being created
     * @param string|null $description Custom description
     * @param array|null $properties Additional properties
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logCreate($subject, ?string $description = null, ?array $properties = null, ?Request $request = null): ActivityContract
    {
        $entityType = class_basename($subject);
        $description = $description ?? "Created {$entityType}";
        
        return $this->log(
            description: $description,
            subject: $subject,
            event: 'created',
            properties: $properties,
            request: $request
        );
    }

    /**
     * Log an update action
     *
     * @param mixed $subject The model being updated
     * @param string|null $description Custom description
     * @param array|null $properties Additional properties (e.g., changed attributes)
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logUpdate($subject, ?string $description = null, ?array $properties = null, ?Request $request = null): ActivityContract
    {
        $entityType = class_basename($subject);
        $description = $description ?? "Updated {$entityType}";
        
        return $this->log(
            description: $description,
            subject: $subject,
            event: 'updated',
            properties: $properties,
            request: $request
        );
    }

    /**
     * Log a delete action
     *
     * @param mixed $subject The model being deleted
     * @param string|null $description Custom description
     * @param array|null $properties Additional properties
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logDelete($subject, ?string $description = null, ?array $properties = null, ?Request $request = null): ActivityContract
    {
        $entityType = class_basename($subject);
        $description = $description ?? "Deleted {$entityType}";
        
        return $this->log(
            description: $description,
            subject: $subject,
            event: 'deleted',
            properties: $properties,
            request: $request
        );
    }

    /**
     * Log a view action
     *
     * @param mixed $subject The model being viewed
     * @param string|null $description Custom description
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logView($subject, ?string $description = null, ?Request $request = null): ActivityContract
    {
        $entityType = class_basename($subject);
        $description = $description ?? "Viewed {$entityType}";
        
        return $this->log(
            description: $description,
            subject: $subject,
            event: 'viewed',
            request: $request
        );
    }

    /**
     * Log a custom action
     *
     * @param string $action Action name (e.g., 'approved', 'rejected', 'exported')
     * @param mixed $subject The model being acted upon
     * @param string|null $description Custom description
     * @param array|null $properties Additional properties
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logAction(
        string $action,
        $subject,
        ?string $description = null,
        ?array $properties = null,
        ?Request $request = null
    ): ActivityContract {
        $entityType = class_basename($subject);
        $description = $description ?? ucfirst($action) . " {$entityType}";
        
        return $this->log(
            description: $description,
            subject: $subject,
            event: $action,
            properties: $properties,
            request: $request
        );
    }

    /**
     * Log an activity without a subject (e.g., login, logout, system events)
     *
     * @param string $description Description of the activity
     * @param string|null $logName Log name
     * @param string|null $event Event name
     * @param array|null $properties Additional properties
     * @param Request|null $request Request object
     * @return ActivityContract
     */
    public function logEvent(
        string $description,
        ?string $logName = null,
        ?string $event = null,
        ?array $properties = null,
        ?Request $request = null
    ): ActivityContract {
        return $this->log(
            description: $description,
            logName: $logName,
            event: $event,
            properties: $properties,
            request: $request
        );
    }

    /**
     * Update activity log with response status code
     * Call this after the response is generated
     *
     * @param ActivityContract $activity The activity log to update
     * @param int $statusCode HTTP status code
     * @return void
     */
    public function updateStatusCode(ActivityContract $activity, int $statusCode): void
    {
        if ($activity instanceof Activity) {
            $activity->status_code = $statusCode;
            $activity->save();
        }
    }
}
