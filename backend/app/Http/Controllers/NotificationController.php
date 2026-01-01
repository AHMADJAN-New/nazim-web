<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    private function getProfile(Request $request)
    {
        $user = $request->user();
        return DB::table('profiles')->where('id', $user->id)->first();
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

        $query = Notification::with('event')
            ->forUser($user->id)
            ->forOrganization($profile->organization_id)
            ->orderBy('created_at', 'desc');

        if ($request->boolean('unread_only', false)) {
            $query->unread();
        }

        if ($request->has('page')) {
            return $query->paginate($perPage, ['*'], 'page', $page);
        }

        return $query->limit($perPage)->get();
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
}
