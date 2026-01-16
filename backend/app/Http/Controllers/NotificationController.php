<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Services\Subscription\FeatureGateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
    public function __construct(
        private FeatureGateService $featureGateService
    ) {
    }
    private function getProfile(Request $request)
    {
        $user = $request->user();
        return $user->profile ?? DB::table('profiles')->where('id', $user->id)->first();
    }

    private function ensurePermission($user, string $permission)
    {
        try {
            if (!$user->hasPermissionTo($permission)) {
                return false;
            }
        } catch (\Throwable $e) {
            Log::warning("Permission check failed for {$permission}: " . $e->getMessage());
            return false;
        }

        return true;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['error' => 'User must belong to an organization'], 403);
        }

        if (!$this->ensurePermission($user, 'notifications.read')) {
            return response()->json([
                'error' => 'Access Denied',
                'required_permission' => 'notifications.read',
            ], 403);
        }

        $perPage = (int) $request->input('per_page', 30);
        $perPage = max(1, min($perPage, 50));
        $page = (int) $request->input('page', 1);

        $query = Notification::with(['event' => function ($query) {
            $query->select('id', 'type', 'entity_type', 'entity_id', 'payload_json');
        }])
            ->forUser($user->id)
            ->forOrganization($profile->organization_id)
            ->orderBy('created_at', 'desc');

        if ($request->boolean('unread_only', false)) {
            $query->unread();
        }

        if ($request->has('page')) {
            $paginated = $query->paginate($perPage, ['*'], 'page', $page);
            
            // Transform paginated results to include entity info
            // Filter out notifications for entities the organization no longer has access to
            $filteredCollection = $paginated->getCollection()
                ->map(function ($notification) use ($profile) {
                    return $this->transformNotification($notification, $profile->organization_id);
                })
                ->filter(function ($notification) {
                    return $notification !== null; // Filter out null notifications (subscription denied)
                })
                ->values(); // Re-index the collection after filtering
            
            // Replace the collection with filtered results
            $paginated->setCollection($filteredCollection);
            
            return $paginated;
        }

        $notifications = $query->limit($perPage)->get();
        
        // Transform results to include entity info
        // Filter out notifications for entities the organization no longer has access to
        return $notifications
            ->map(function ($notification) use ($profile) {
                return $this->transformNotification($notification, $profile->organization_id);
            })
            ->filter(function ($notification) {
                return $notification !== null; // Filter out null notifications (subscription denied)
            })
            ->values(); // Re-index the collection after filtering
    }

    /**
     * Transform notification to include entity info in response
     * Returns null if organization no longer has access to the feature
     */
    private function transformNotification($notification, string $organizationId): ?array
    {
        // Check subscription access for the entity type
        if ($notification->event?->entity_type) {
            $featureMap = config('subscription_features.entity_type_feature_map', []);
            $requiredFeature = $featureMap[$notification->event->entity_type] ?? null;

            // If a feature is required, check subscription access
            if ($requiredFeature !== null) {
                if (!$this->featureGateService->hasFeature($organizationId, $requiredFeature)) {
                    // Organization no longer has access to this feature - filter out notification
                    return null;
                }
            }
        }

        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'body' => $notification->body,
            'url' => $notification->url,
            'level' => $notification->level,
            'event_id' => $notification->event_id,
            'event' => $notification->event ? [
                'id' => $notification->event->id,
                'type' => $notification->event->type,
                'entity_type' => $notification->event->entity_type,
                'entity_id' => $notification->event->entity_id,
            ] : null,
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at->toISOString(),
            'updated_at' => $notification->updated_at->toISOString(),
        ];
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['count' => 0]);
        }

        if (!$this->ensurePermission($user, 'notifications.read')) {
            return response()->json(['count' => 0]);
        }

        $count = Notification::forUser($user->id)
            ->forOrganization($profile->organization_id)
            ->unread()
            ->count();

        return response()->json(['count' => $count]);
    }

    public function markAsRead(string $id, Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['error' => 'User must belong to an organization'], 403);
        }

        if (!$this->ensurePermission($user, 'notifications.update')) {
            return response()->json([
                'error' => 'Access Denied',
                'required_permission' => 'notifications.update',
            ], 403);
        }

        $notification = Notification::forUser($user->id)
            ->forOrganization($profile->organization_id)
            ->find($id);

        if (!$notification) {
            return response()->json(['error' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['error' => 'User must belong to an organization'], 403);
        }

        if (!$this->ensurePermission($user, 'notifications.update')) {
            return response()->json([
                'error' => 'Access Denied',
                'required_permission' => 'notifications.update',
            ], 403);
        }

        Notification::forUser($user->id)
            ->forOrganization($profile->organization_id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function getPreferences(Request $request)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['error' => 'User must belong to an organization'], 403);
        }

        if (!$this->ensurePermission($user, 'notifications.manage_preferences')) {
            return response()->json([
                'error' => 'Access Denied',
                'required_permission' => 'notifications.manage_preferences',
            ], 403);
        }

        $preferences = NotificationPreference::where('organization_id', $profile->organization_id)
            ->where('user_id', $user->id)
            ->get();

        return response()->json($preferences);
    }

    public function updatePreference(Request $request, string $type)
    {
        $user = $request->user();
        $profile = $this->getProfile($request);

        if (!$profile?->organization_id) {
            return response()->json(['error' => 'User must belong to an organization'], 403);
        }

        if (!$this->ensurePermission($user, 'notifications.manage_preferences')) {
            return response()->json([
                'error' => 'Access Denied',
                'required_permission' => 'notifications.manage_preferences',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'in_app_enabled' => 'sometimes|boolean',
            'email_enabled' => 'sometimes|boolean',
            'frequency' => 'sometimes|string|in:instant,daily_digest',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $preference = NotificationPreference::updateOrCreate(
            [
                'organization_id' => $profile->organization_id,
                'user_id' => $user->id,
                'type' => $type,
            ],
            $validator->validated()
        );

        return response()->json($preference);
    }
}
