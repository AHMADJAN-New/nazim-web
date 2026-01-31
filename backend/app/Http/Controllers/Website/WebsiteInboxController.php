<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Models\WebsiteInbox;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WebsiteInboxController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $query = WebsiteInbox::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $messages = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($messages);
    }

    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $message = WebsiteInbox::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        // Mark as read if new
        if ($message->status === 'new') {
            $message->status = 'read';
            $message->save();
        }

        return response()->json($message);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $message = WebsiteInbox::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $data = $request->validate([
            'status' => 'in:new,read,replied,archived',
        ]);

        // If marking as replied, set replied_at and replied_by
        if (isset($data['status']) && $data['status'] === 'replied' && $message->status !== 'replied') {
            $message->replied_at = now();
            $message->replied_by = $user->id;
        }

        $message->fill($data);
        $message->save();

        return response()->json($message);
    }

    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $message = WebsiteInbox::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->where('id', $id)
            ->firstOrFail();

        $message->delete();

        return response()->json(['status' => 'deleted']);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        $schoolId = $this->getCurrentSchoolId($request);

        $stats = WebsiteInbox::where('organization_id', $profile->organization_id)
            ->where('school_id', $schoolId)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return response()->json([
            'new' => $stats['new'] ?? 0,
            'read' => $stats['read'] ?? 0,
            'replied' => $stats['replied'] ?? 0,
            'archived' => $stats['archived'] ?? 0,
            'total' => array_sum($stats),
        ]);
    }
}
