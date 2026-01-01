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
        $this->register('admission.deleted', fn (Model $entity) => $this->usersWithPermission($entity, 'student_admissions.read'));

        // Finance
        $this->register('invoice.created', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_documents.read'));
        $this->register('payment.received', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_documents.read'));
        $this->register('invoice.overdue', fn (Model $entity) => $this->usersWithPermission($entity, 'finance_reports.read'));

        // Fees
        $this->register('fee.assignment.created', fn (Model $entity) => $this->usersWithPermission($entity, 'fees.read'));
        $this->register('fee.payment.received', fn (Model $entity) => $this->usersWithPermission($entity, 'fees.read'));
        $this->register('fee.assignment.overdue', fn (Model $entity) => $this->usersWithPermission($entity, 'fees.read'));
        $this->register('fee.assignment.paid', fn (Model $entity) => $this->usersWithPermission($entity, 'fees.read'));
        $this->register('fee.assignment.status_changed', fn (Model $entity) => $this->usersWithPermission($entity, 'fees.read'));

        // Attendance
        $this->register('attendance.sync_failed', fn (Model $entity) => $this->organizationAdmins($entity->organization_id ?? ''));
        $this->register('attendance.anomaly', fn (Model $entity) => $this->usersWithPermission($entity, 'attendance_sessions.read'));
        $this->register('attendance.session.created', fn (Model $entity) => $this->usersWithPermission($entity, 'attendance_sessions.read'));
        $this->register('attendance.session.closed', fn (Model $entity) => $this->usersWithPermission($entity, 'attendance_sessions.read'));

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
        $this->register('exam.marks_updated', fn (Model $entity) => $this->usersWithPermission($entity, 'exams.read'));
        
        // Students
        $this->register('student.created', fn (Model $entity) => $this->usersWithPermission($entity, 'students.read'));
        $this->register('student.updated', fn (Model $entity) => $this->usersWithPermission($entity, 'students.read'));
        $this->register('student.deleted', fn (Model $entity) => $this->usersWithPermission($entity, 'students.read'));

        // Library
        $this->register('library.book_overdue', function (Model $entity) {
            // Entity should be LibraryLoan with student_id or staff_id
            $recipients = collect();
            
            // Check for staff_id (staff have profile_id which links to users)
            if (property_exists($entity, 'staff_id') && $entity->staff_id) {
                $staff = DB::table('staff')->where('id', $entity->staff_id)->first();
                if ($staff && $staff->profile_id) {
                    $user = User::find($staff->profile_id);
                    if ($user) {
                        $recipients->push($user);
                    }
                }
            }
            
            // Note: Students don't have direct user links, so we skip student_id for now
            // In the future, we could notify parents or guardians
            
            return $recipients;
        });

        $this->register('library.book_due_soon', function (Model $entity) {
            // Entity should be LibraryLoan with student_id or staff_id
            $recipients = collect();
            
            // Check for staff_id (staff have profile_id which links to users)
            if (property_exists($entity, 'staff_id') && $entity->staff_id) {
                $staff = DB::table('staff')->where('id', $entity->staff_id)->first();
                if ($staff && $staff->profile_id) {
                    $user = User::find($staff->profile_id);
                    if ($user) {
                        $recipients->push($user);
                    }
                }
            }
            
            // Note: Students don't have direct user links, so we skip student_id for now
            // In the future, we could notify parents or guardians
            
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
            // Entity should be AssetAssignment with assigned_to_type and assigned_to_id
            $recipients = collect();
            
            // Check if assigned to staff (staff have profile_id which links to users)
            if (property_exists($entity, 'assigned_to_type') && $entity->assigned_to_type === 'staff' 
                && property_exists($entity, 'assigned_to_id') && $entity->assigned_to_id) {
                $staff = DB::table('staff')->where('id', $entity->assigned_to_id)->first();
                if ($staff && $staff->profile_id) {
                    $user = User::find($staff->profile_id);
                    if ($user) {
                        $recipients->push($user);
                    }
                }
            }
            
            // Also notify asset managers (get asset from assignment)
            if (property_exists($entity, 'asset_id') && $entity->asset_id) {
                $asset = DB::table('assets')->where('id', $entity->asset_id)->first();
                if ($asset) {
                    $assetModel = new \App\Models\Asset();
                    $assetModel->setRawAttributes((array) $asset);
                    $recipients = $recipients->merge($this->usersWithPermission($assetModel, 'assets.read'));
                }
            }
            
            return $recipients;
        });

        $this->register('asset.maintenance_due', fn (Model $entity) => $this->usersWithPermission($entity, 'assets.update'));

        $this->register('asset.returned', function (Model $entity) {
            // Entity should be AssetAssignment, notify asset managers
            if (property_exists($entity, 'asset_id') && $entity->asset_id) {
                $asset = DB::table('assets')->where('id', $entity->asset_id)->first();
                if ($asset) {
                    $assetModel = new \App\Models\Asset();
                    $assetModel->setRawAttributes((array) $asset);
                    return $this->usersWithPermission($assetModel, 'assets.read');
                }
            }
            return collect();
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
            Log::warning('usersWithPermission: No organization_id found', [
                'entity_type' => get_class($entity),
                'permission' => $permission,
            ]);
            return collect();
        }

        try {
            // CRITICAL: Set team context for Spatie permission checks
            setPermissionsTeamId($organizationId);
            
            // Get permission ID
            $permissionModel = \App\Models\Permission::where('name', $permission)
                ->where('organization_id', $organizationId)
                ->first();
            
            if (!$permissionModel) {
                Log::warning('usersWithPermission: Permission not found', [
                    'permission' => $permission,
                    'organization_id' => $organizationId,
                ]);
                return collect();
            }
            
            // Get users with this permission via roles
            $userIds = DB::table('model_has_roles')
                ->join('role_has_permissions', function($join) use ($permissionModel, $organizationId) {
                    $join->on('model_has_roles.role_id', '=', 'role_has_permissions.role_id')
                         ->where('role_has_permissions.permission_id', $permissionModel->id)
                         ->where('role_has_permissions.organization_id', $organizationId);
                })
                ->where('model_has_roles.model_type', User::class)
                ->where('model_has_roles.organization_id', $organizationId)
                ->distinct()
                ->pluck('model_has_roles.model_id')
                ->toArray();
            
            // Also get users with direct permission assignment
            // Note: model_has_permissions doesn't have deleted_at column
            $directUserIds = DB::table('model_has_permissions')
                ->where('permission_id', $permissionModel->id)
                ->where('model_type', User::class)
                ->distinct()
                ->pluck('model_id')
                ->toArray();
            
            // Combine and get unique user IDs
            $allUserIds = array_unique(array_merge($userIds, $directUserIds));
            
            if (empty($allUserIds)) {
                Log::info('usersWithPermission: No users found', [
                    'permission' => $permission,
                    'organization_id' => $organizationId,
                ]);
                return collect();
            }
            
            $users = User::whereIn('id', $allUserIds)->get();
            
            Log::info('usersWithPermission: Found users', [
                'permission' => $permission,
                'organization_id' => $organizationId,
                'user_count' => $users->count(),
                'user_ids' => $users->pluck('id')->toArray(),
            ]);
            
            return $users;
        } catch (\Throwable $e) {
            Log::warning('Permission-based recipient resolution failed', [
                'permission' => $permission,
                'organization_id' => $organizationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
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
