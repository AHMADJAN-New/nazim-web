<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class ContactMessageController extends Controller
{
    /**
     * Submit a new contact message (public endpoint)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'school_name' => 'nullable|string|max:255',
            'student_count' => 'nullable|integer|min:0',
            'message' => 'required|string|min:10',
        ]);

        $message = ContactMessage::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'school_name' => $validated['school_name'] ?? null,
            'student_count' => $validated['student_count'] ?? null,
            'message' => $validated['message'],
            'status' => 'new',
            'source' => 'landing_page',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Thank you for your message. We will get back to you soon.',
            'data' => [
                'id' => $message->id,
            ],
        ], 201);
    }

    /**
     * Get all contact messages (admin endpoint)
     */
    public function adminIndex(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in adminIndex: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $status = $request->query('status');
        $search = $request->query('search');
        $perPage = $request->query('per_page', 20);
        $page = $request->query('page', 1);

        $query = ContactMessage::withTrashed()
            ->orderBy('created_at', 'desc');

        if ($status && in_array($status, ['new', 'read', 'replied', 'archived'])) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'ilike', "%{$search}%")
                  ->orWhere('last_name', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%")
                  ->orWhere('school_name', 'ilike', "%{$search}%")
                  ->orWhere('message', 'ilike', "%{$search}%");
            });
        }

        $messages = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $messages->items(),
            'current_page' => $messages->currentPage(),
            'last_page' => $messages->lastPage(),
            'per_page' => $messages->perPage(),
            'total' => $messages->total(),
        ]);
    }

    /**
     * Get a single contact message
     */
    public function show(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in show: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $message = ContactMessage::withTrashed()->findOrFail($id);

        // Mark as read if it's new
        if ($message->status === 'new') {
            $message->update(['status' => 'read']);
        }

        return response()->json([
            'data' => [
                'id' => $message->id,
                'first_name' => $message->first_name,
                'last_name' => $message->last_name,
                'email' => $message->email,
                'phone' => $message->phone,
                'school_name' => $message->school_name,
                'student_count' => $message->student_count,
                'message' => $message->message,
                'status' => $message->status,
                'admin_notes' => $message->admin_notes,
                'replied_by' => $message->replied_by,
                'replied_at' => $message->replied_at?->toISOString(),
                'reply_subject' => $message->reply_subject,
                'reply_message' => $message->reply_message,
                'source' => $message->source,
                'ip_address' => $message->ip_address,
                'user_agent' => $message->user_agent,
                'created_at' => $message->created_at->toISOString(),
                'updated_at' => $message->updated_at->toISOString(),
                'deleted_at' => $message->deleted_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Update contact message status or add reply
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in update: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $message = ContactMessage::withTrashed()->findOrFail($id);

        $validated = $request->validate([
            'status' => 'sometimes|in:new,read,replied,archived',
            'admin_notes' => 'nullable|string',
            'reply_subject' => 'nullable|string|max:255',
            'reply_message' => 'nullable|string',
        ]);

        $updateData = [];

        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }

        if (isset($validated['admin_notes'])) {
            $updateData['admin_notes'] = $validated['admin_notes'];
        }

        if (isset($validated['reply_subject']) || isset($validated['reply_message'])) {
            $updateData['reply_subject'] = $validated['reply_subject'] ?? $message->reply_subject;
            $updateData['reply_message'] = $validated['reply_message'] ?? $message->reply_message;
            $updateData['replied_by'] = $user->id;
            $updateData['replied_at'] = now();
            $updateData['status'] = 'replied';
        }

        $message->update($updateData);

        return response()->json([
            'data' => [
                'id' => $message->id,
                'first_name' => $message->first_name,
                'last_name' => $message->last_name,
                'email' => $message->email,
                'phone' => $message->phone,
                'school_name' => $message->school_name,
                'student_count' => $message->student_count,
                'message' => $message->message,
                'status' => $message->status,
                'admin_notes' => $message->admin_notes,
                'replied_by' => $message->replied_by,
                'replied_at' => $message->replied_at?->toISOString(),
                'reply_subject' => $message->reply_subject,
                'reply_message' => $message->reply_message,
                'source' => $message->source,
                'created_at' => $message->created_at->toISOString(),
                'updated_at' => $message->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Delete a contact message (soft delete)
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in destroy: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $message = ContactMessage::withTrashed()->findOrFail($id);
        $message->delete();

        return response()->noContent();
    }

    /**
     * Get statistics for contact messages
     */
    public function stats(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        // Check subscription.admin permission (GLOBAL)
        try {
            $platformOrgId = '00000000-0000-0000-0000-000000000000';
            setPermissionsTeamId($platformOrgId);
            if (!$user->hasPermissionTo('subscription.admin')) {
                return response()->json([
                    'error' => 'Access Denied',
                    'message' => 'This endpoint is only accessible to platform administrators.',
                ], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for subscription.admin in stats: " . $e->getMessage());
            return response()->json([
                'error' => 'Access Denied',
                'message' => 'This endpoint is only accessible to platform administrators.',
            ], 403);
        }

        $stats = [
            'total' => ContactMessage::count(),
            'new' => ContactMessage::where('status', 'new')->count(),
            'read' => ContactMessage::where('status', 'read')->count(),
            'replied' => ContactMessage::where('status', 'replied')->count(),
            'archived' => ContactMessage::where('status', 'archived')->count(),
            'today' => ContactMessage::whereDate('created_at', today())->count(),
            'this_week' => ContactMessage::where('created_at', '>=', now()->startOfWeek())->count(),
            'this_month' => ContactMessage::where('created_at', '>=', now()->startOfMonth())->count(),
        ];

        return response()->json(['data' => $stats]);
    }
}
