<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\NotificationPreference;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class NotificationController extends Controller
{
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
            $paginated->getCollection()->transform(function ($notification) {
                return $this->transformNotification($notification);
            });
            
            return $paginated;
        }

        $notifications = $query->limit($perPage)->get();
        
        // Transform results to include entity info
        return $notifications->map(function ($notification) {
            return $this->transformNotification($notification);
        });
    }

    /**
     * Transform notification to include entity info in response
     */
    private function transformNotification($notification)
    {
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
