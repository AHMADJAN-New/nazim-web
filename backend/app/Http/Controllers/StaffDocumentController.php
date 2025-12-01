<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\StaffDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StaffDocumentController extends Controller
{
    /**
     * Display a listing of documents for a staff member
     */
    public function index(string $staffId)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Get accessible organization IDs
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

        // Check organization access
        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        $documents = StaffDocument::where('staff_id', $staffId)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($documents);
    }

    /**
     * Store a newly created document
     */
    public function store(Request $request, string $staffId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $staff = Staff::whereNull('deleted_at')->find($staffId);

        if (!$staff) {
            return response()->json(['error' => 'Staff member not found'], 404);
        }

        // Get accessible organization IDs
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

        // Check organization access
        if (!in_array($staff->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot upload document for staff from different organization'], 403);
        }

        $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'document_type' => 'required|string|max:100',
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $fileExt = $file->getClientOriginalExtension();
        $fileName = time() . '.' . $fileExt;
        
        // Build path: {organization_id}/{school_id}/{staff_id}/documents/{document_type}/{filename}
        $schoolPath = $staff->school_id ? "{$staff->school_id}/" : '';
        $filePath = "{$staff->organization_id}/{$schoolPath}{$staff->id}/documents/{$request->document_type}/{$fileName}";

        // Store file
        $storedPath = $file->storeAs('staff-files', $filePath, 'public');

        // Create document record
        $document = StaffDocument::create([
            'staff_id' => $staff->id,
            'organization_id' => $staff->organization_id,
            'school_id' => $staff->school_id,
            'document_type' => $request->document_type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'description' => $request->description ?? null,
            'uploaded_by' => $user->id,
        ]);

        // Return public URL
        $publicUrl = Storage::disk('public')->url($storedPath);

        return response()->json([
            'document' => $document,
            'url' => $publicUrl,
        ], 201);
    }

    /**
     * Remove the specified document
     */
    public function destroy(string $id)
    {
        $user = request()->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        $document = StaffDocument::whereNull('deleted_at')->find($id);

        if (!$document) {
            return response()->json(['error' => 'Document not found'], 404);
        }

        // Get accessible organization IDs
        $orgIds = [];
        if ($profile->role === 'super_admin' && $profile->organization_id === null) {
            $orgIds = DB::table('organizations')
                ->whereNull('deleted_at')
                ->pluck('id')
                ->toArray();
        } else {
            if ($profile->organization_id) {
                $orgIds = [$profile->organization_id];
            }
        }

        // Check organization access
        if (!in_array($document->organization_id, $orgIds)) {
            return response()->json(['error' => 'Cannot delete document from different organization'], 403);
        }

        // Soft delete
        $document->update(['deleted_at' => now()]);

        // Optionally delete the file from storage
        // Storage::disk('public')->delete($document->file_path);

        return response()->json(['message' => 'Document deleted successfully']);
    }
}

