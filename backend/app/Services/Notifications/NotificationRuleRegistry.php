<?php

namespace App\Services\Notifications;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationRuleRegistry
{
    /**
     * @var array<string, callable>
     */
    private array $resolvers = [];

    public function __construct()
    {
        $this->registerDefaultRules();
    }

    /**
     * Register a resolver callback for an event type.
     */
    public function register(string $eventType, callable $resolver): void
    {
        $this->resolvers[$eventType] = $resolver;
    }

    /**
     * Resolve recipients for the given event.
     */
    public function resolve(string $eventType, Model $entity, ?User $actor = null): Collection
    {
        if (isset($this->resolvers[$eventType])) {
            try {
                return collect(($this->resolvers[$eventType])($entity, $actor))
                    ->filter()
                    ->unique('id');
            } catch (\Throwable $e) {
                Log::warning('Notification resolver failed', [
                    'event' => $eventType,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Fallback: notify organization admins (keeps scope minimal)
        $organizationId = $entity->organization_id ?? $entity->organizationId ?? null;
        if (!$organizationId) {
            return collect();
        }

        return $this->organizationAdmins($organizationId);
    }

    private function registerDefaultRules(): void
    {
        // Admissions
        $this->register('admission.created', fn (Model $entity) => $this->usersWithPermission($entity, 'student_admissions.read'));
        $this->register('admission.approved', fn (Model $entity) => $this->usersWithPermission($entity, 'student_admissions.read'));
        $this->register('admission.rejected', fn (Model $entity) => $this->usersWithPermission($entity, 'student_admissions.read'));

        // Finance
        $this->register('invoice.created', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_documents.read'));
        $this->register('payment.received', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_documents.read'));
        $this->register('invoice.overdue', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_reports.read'));

        // Attendance
        $this->register('attendance.sync_failed', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('attendance.anomaly', fn (Model $entity) => $this->usersWithPermission($entity, 'attendance_sessions.read'));

        // DMS / Letters
        $this->register('doc.assigned', function (Model $entity) {
            $recipients = collect();
            if (property_exists($entity, 'assigned_to_user_id') || isset($entity->assigned_to_user_id)) {
                $assigned = User::find($entity->assigned_to_user_id);
                if ($assigned) {
                    $recipients->push($assigned);
                }
            }

            // Fall back to DMS users if none explicitly assigned
            if ($recipients->isEmpty()) {
                $recipients = $this->usersWithPermission($entity, 'dms.incoming.read');
            }

            return $recipients;
        });

        $this->register('doc.approved', fn (Model $entity) => $this->usersWithPermission($entity, 'dms.incoming.read'));
        $this->register('doc.returned', fn (Model $entity) => $this->usersWithPermission($entity, 'dms.incoming.read'));

        // System
        $this->register('system.backup_failed', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('system.license_expiring', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));

        // Security - notify the affected user only
        $this->register('security.password_changed', function (Model $entity) {
            // Entity should be the User model whose password changed
            if ($entity instanceof User) {
                return collect([$entity]);
            }
            return collect();
        });

        $this->register('security.new_device_login', function (Model $entity) {
            // Entity should be the User model who logged in from new device
            if ($entity instanceof User) {
                return collect([$entity]);
            }
            return collect();
        });

        // Exams
        $this->register('exam.created', fn (Model $entity) => $this->usersWithPermission($entity, 'exams.read'));
        $this->register('exam.published', fn (Model $entity) => $this->usersWithPermission($entity, 'exams.read'));
        $this->register('exam.marks_published', fn (Model $entity) => $this->usersWithPermission($entity, 'exams.view_reports'));
        $this->register('exam.timetable_updated', fn (Model $entity) => $this->usersWithPermission($entity, 'exams.read'));

        // Library
        $this->register('library.book_overdue', function (Model $entity) {
            // Entity should be LibraryLoan with borrower_user_id
            $recipients = collect();
            if (property_exists($entity, 'borrower_user_id') || isset($entity->borrower_user_id)) {
                $borrower = User::find($entity->borrower_user_id);
                if ($borrower) {
                    $recipients->push($borrower);
                }
            }
            return $recipients;
        });

        $this->register('library.book_due_soon', function (Model $entity) {
            // Entity should be LibraryLoan with borrower_user_id
            $recipients = collect();
            if (property_exists($entity, 'borrower_user_id') || isset($entity->borrower_user_id)) {
                $borrower = User::find($entity->borrower_user_id);
                if ($borrower) {
                    $recipients->push($borrower);
                }
            }
            return $recipients;
        });

        $this->register('library.book_reserved', function (Model $entity) {
            // Entity should be LibraryReservation with user_id
            $recipients = collect();
            if (property_exists($entity, 'user_id') || isset($entity->user_id)) {
                $user = User::find($entity->user_id);
                if ($user) {
                    $recipients->push($user);
                }
            }
            return $recipients;
        });

        // Assets
        $this->register('asset.assigned', function (Model $entity) {
            // Entity should be Asset with assigned_to_user_id
            $recipients = collect();
            if (property_exists($entity, 'assigned_to_user_id') || isset($entity->assigned_to_user_id)) {
                $assignedUser = User::find($entity->assigned_to_user_id);
                if ($assignedUser) {
                    $recipients->push($assignedUser);
                }
            }
            // Also notify asset managers
            return $recipients->merge($this->usersWithPermission($entity, 'assets.read'));
        });

        $this->register('asset.maintenance_due', fn (Model $entity) => $this->usersWithPermission($entity, 'assets.update'));

        $this->register('asset.returned', function (Model $entity) {
            // Notify asset managers
            return $this->usersWithPermission($entity, 'assets.read');
        });

        // Subscription - notify organization admins
        $this->register('subscription.limit_approaching', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('subscription.limit_reached', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('subscription.expiring_soon', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('subscription.expired', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
    }

    private function usersWithPermission(Model $entity, string $permission): Collection
    {
        $organizationId = $entity->organization_id ?? $entity->organizationId ?? null;
        if (!$organizationId) {
            return collect();
        }

        try {
            setPermissionsTeamId($organizationId);
            return User::permission($permission)->get();
        } catch (\Throwable $e) {
            Log::warning('Permission-based recipient resolution failed', [
                'permission' => $permission,
                'organization_id' => $organizationId,
                'error' => $e->getMessage(),
            ]);

            return collect();
        }
    }

    private function organizationAdmins(string $organizationId): Collection
    {
        if (!$organizationId) {
            return collect();
        }

        $userIds = DB::table('profiles')
            ->join('model_has_roles', function ($join) {
                $join->on('profiles.id', '=', 'model_has_roles.model_id')
                    ->where('model_has_roles.model_type', '=', User::class);
            })
            ->join('roles', function ($join) {
                $join->on('model_has_roles.role_id', '=', 'roles.id')
                    ->where('roles.name', '=', 'admin');
            })
            ->where('profiles.organization_id', $organizationId)
            ->where('profiles.is_active', true)
            ->pluck('profiles.id')
            ->toArray();

        return User::whereIn('id', $userIds)->get();
    }
}
