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
            'position' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:50',
            'whatsapp' => 'required|string|max:50',
            'preferred_contact_method' => 'nullable|in:email,phone,whatsapp',
            'school_name' => 'required|string|max:255',
            'city' => 'nullable|string|max:255',
            'country' => 'nullable|string|max:100',
            'student_count' => 'required|integer|min:0',
            'number_of_schools' => 'nullable|integer|min:0',
            'staff_count' => 'nullable|integer|min:0',
            'message' => 'required|string|min:10',
            'referral_source' => 'nullable|string|max:255',
        ]);

        $message = ContactMessage::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'position' => $validated['position'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'whatsapp' => $validated['whatsapp'],
            'preferred_contact_method' => $validated['preferred_contact_method'] ?? 'email',
            'school_name' => $validated['school_name'],
            'city' => $validated['city'] ?? null,
            'country' => $validated['country'] ?? null,
            'student_count' => $validated['student_count'],
            'number_of_schools' => $validated['number_of_schools'] ?? null,
            'staff_count' => $validated['staff_count'] ?? null,
            'message' => $validated['message'],
            'referral_source' => $validated['referral_source'] ?? null,
            'status' => 'new',
            'urgency' => 'medium',
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
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('school_name', 'ilike', "%{$search}%")
                  ->orWhere('city', 'ilike', "%{$search}%")
                  ->orWhere('country', 'ilike', "%{$search}%")
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
                'position' => $message->position,
                'phone' => $message->phone,
                'whatsapp' => $message->whatsapp,
                'preferred_contact_method' => $message->preferred_contact_method,
                'school_name' => $message->school_name,
                'city' => $message->city,
                'country' => $message->country,
                'student_count' => $message->student_count,
                'number_of_schools' => $message->number_of_schools,
                'staff_count' => $message->staff_count,
                'message' => $message->message,
                'status' => $message->status,
                'urgency' => $message->urgency,
                'admin_notes' => $message->admin_notes,
                'replied_by' => $message->replied_by,
                'replied_at' => $message->replied_at?->toISOString(),
                'follow_up_date' => $message->follow_up_date?->toISOString(),
                'reply_subject' => $message->reply_subject,
                'reply_message' => $message->reply_message,
                'source' => $message->source,
                'referral_source' => $message->referral_source,
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
            'urgency' => 'sometimes|in:low,medium,high',
            'admin_notes' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'reply_subject' => 'nullable|string|max:255',
            'reply_message' => 'nullable|string',
        ]);

        $updateData = [];

        if (isset($validated['status'])) {
            $updateData['status'] = $validated['status'];
        }

        if (isset($validated['urgency'])) {
            $updateData['urgency'] = $validated['urgency'];
        }

        if (isset($validated['admin_notes'])) {
            $updateData['admin_notes'] = $validated['admin_notes'];
        }

        if (isset($validated['follow_up_date'])) {
            $updateData['follow_up_date'] = $validated['follow_up_date'];
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
                'position' => $message->position,
                'phone' => $message->phone,
                'whatsapp' => $message->whatsapp,
                'preferred_contact_method' => $message->preferred_contact_method,
                'school_name' => $message->school_name,
                'city' => $message->city,
                'country' => $message->country,
                'student_count' => $message->student_count,
                'number_of_schools' => $message->number_of_schools,
                'staff_count' => $message->staff_count,
                'message' => $message->message,
                'status' => $message->status,
                'urgency' => $message->urgency,
                'admin_notes' => $message->admin_notes,
                'replied_by' => $message->replied_by,
                'replied_at' => $message->replied_at?->toISOString(),
                'follow_up_date' => $message->follow_up_date?->toISOString(),
                'reply_subject' => $message->reply_subject,
                'reply_message' => $message->reply_message,
                'source' => $message->source,
                'referral_source' => $message->referral_source,
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
