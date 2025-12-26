<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\EventGuest;
use App\Models\EventGuestFieldValue;
use App\Models\EventTypeField;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class EventGuestController extends Controller
{
    /**
     * Display a listing of guests for an event (optimized for 10k+)
     */
    public function index(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for events.read: " . $e->getMessage());
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Verify event belongs to user's organization
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        // Lightweight query - only return essential fields for list view
        $query = EventGuest::select([
                'id', 'guest_code', 'guest_type', 'full_name', 'phone',
                'invite_count', 'arrived_count', 'status', 'photo_path', 'qr_token', 'created_at'
            ])
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at');

        // Search by name, phone, or guest_code
        if ($request->has('q') && $request->q) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('guest_code', 'ilike', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by guest_type
        if ($request->has('guest_type') && $request->guest_type) {
            $query->where('guest_type', $request->guest_type);
        }

        // Pagination (required for 10k+ guests)
        $perPage = $request->input('per_page', 50);
        $allowedPerPage = [25, 50, 100, 200];
        if (!in_array((int)$perPage, $allowedPerPage)) {
            $perPage = 50;
        }

        $sortBy = $request->input('sort_by', 'full_name');
        $sortDir = $request->input('sort_dir', 'asc');
        $allowedSorts = ['full_name', 'guest_code', 'created_at', 'status', 'arrived_count'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'full_name';
        }

        $guests = $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc')
            ->paginate((int)$perPage);

        // Transform photo_path to URL
        $guests->getCollection()->transform(function ($guest) {
            $guest->photo_thumb_url = $guest->photo_path
                ? Storage::url($guest->photo_path)
                : null;
            unset($guest->photo_path);
            return $guest;
        });

        return response()->json($guests);
    }

    /**
     * Fast lookup endpoint for search (returns top 20)
     */
    public function lookup(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Check if user is event-specific (locked to one event)
        $isEventUser = $profile->is_event_user ?? false;
        $userEventId = $profile->event_id ?? null;
        
        // Event-specific users can only access their assigned event
        if ($isEventUser && $userEventId && $eventId !== $userEventId) {
            return response()->json(['error' => 'Access denied. You can only access your assigned event.'], 403);
        }
        
        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $search = $request->input('q', '');
        if (strlen($search) < 2) {
            return response()->json([]);
        }

        $guests = EventGuest::select([
                'id', 'guest_code', 'full_name', 'phone',
                'invite_count', 'arrived_count', 'status', 'photo_path'
            ])
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $this->getCurrentSchoolId($request))
            ->whereNull('deleted_at')
            ->where(function ($q) use ($search) {
                $q->where('full_name', 'ilike', "%{$search}%")
                  ->orWhere('phone', 'ilike', "%{$search}%")
                  ->orWhere('guest_code', 'ilike', "%{$search}%");
            })
            ->orderBy('full_name')
            ->limit(20)
            ->get();

        // Transform photo_path to URL
        $guests->transform(function ($guest) {
            $guest->photo_thumb_url = $guest->photo_path
                ? Storage::url($guest->photo_path)
                : null;
            unset($guest->photo_path);
            return $guest;
        });

        return response()->json($guests);
    }

    /**
     * Store a newly created guest
     */
    public function store(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile) {
            return response()->json(['error' => 'Profile not found'], 404);
        }

        if (!$profile->organization_id) {
            return response()->json(['error' => 'User must be assigned to an organization'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        // Check if user is event-specific (locked to one event)
        $isEventUser = $profile->is_event_user ?? false;
        $userEventId = $profile->event_id ?? null;
        
        // Event-specific users can only access their assigned event
        if ($isEventUser && $userEventId && $eventId !== $userEventId) {
            return response()->json(['error' => 'Access denied. You can only access your assigned event.'], 403);
        }
        
        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:200',
            'phone' => 'nullable|string|max:20',
            'guest_type' => 'required|in:student,parent,teacher,staff,vip,external',
            'invite_count' => 'integer|min:1|max:100',
            'status' => 'in:invited,checked_in,blocked',
            'field_values' => 'array',
            'field_values.*.field_id' => 'required|uuid|exists:event_type_fields,id',
            'field_values.*.value' => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            $guest = EventGuest::create([
                'event_id' => $eventId,
                'organization_id' => $profile->organization_id,
                'school_id' => $event->school_id,
                'full_name' => $validated['full_name'],
                'phone' => $validated['phone'] ?? null,
                'guest_type' => $validated['guest_type'],
                'invite_count' => $validated['invite_count'] ?? 1,
                'status' => $validated['status'] ?? 'invited',
            ]);

            // Save dynamic field values
            if (!empty($validated['field_values'])) {
                foreach ($validated['field_values'] as $fieldValue) {
                    $value = $fieldValue['value'];
                    EventGuestFieldValue::create([
                        'guest_id' => $guest->id,
                        'field_id' => $fieldValue['field_id'],
                        'value_text' => is_array($value) ? null : $value,
                        'value_json' => is_array($value) ? $value : null,
                    ]);
                }
            }

            DB::commit();

            Log::info("Guest created", ['id' => $guest->id, 'event_id' => $eventId]);

            // Return guest with generated codes and photo URL
            return response()->json([
                'id' => $guest->id,
                'event_id' => $guest->event_id,
                'organization_id' => $guest->organization_id,
                'school_id' => $guest->school_id,
                'guest_code' => $guest->guest_code,
                'qr_token' => $guest->qr_token,
                'full_name' => $guest->full_name,
                'phone' => $guest->phone,
                'guest_type' => $guest->guest_type,
                'invite_count' => $guest->invite_count,
                'arrived_count' => $guest->arrived_count,
                'status' => $guest->status,
                'photo_path' => $guest->photo_path,
                'photo_url' => $guest->photo_path ? Storage::url($guest->photo_path) : null,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to create guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to create guest: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified guest with field values
     */
    public function show(Request $request, string $eventId, string $guestId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.read')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $guest = EventGuest::with(['fieldValues.field', 'checkins' => function($q) {
                $q->orderBy('scanned_at', 'desc')->limit(10);
            }, 'checkins.user:id,email'])
            ->where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        // Transform for response
        $guest->photo_url = $guest->photo_path
            ? Storage::url($guest->photo_path)
            : null;

        // Group field values by field group
        $fieldValues = $guest->fieldValues->map(function ($fv) {
            return [
                'field_id' => $fv->field_id,
                'field_key' => $fv->field->key ?? null,
                'field_label' => $fv->field->label ?? null,
                'field_type' => $fv->field->field_type ?? null,
                'field_group_id' => $fv->field->field_group_id ?? null,
                'value' => $fv->value_json ?? $fv->value_text,
            ];
        });

        return response()->json([
            'id' => $guest->id,
            'guest_code' => $guest->guest_code,
            'qr_token' => $guest->qr_token,
            'full_name' => $guest->full_name,
            'phone' => $guest->phone,
            'guest_type' => $guest->guest_type,
            'invite_count' => $guest->invite_count,
            'arrived_count' => $guest->arrived_count,
            'remaining_invites' => $guest->remaining_invites,
            'status' => $guest->status,
            'photo_url' => $guest->photo_url,
            'field_values' => $fieldValues,
            'checkins' => $guest->checkins,
            'created_at' => $guest->created_at,
            'updated_at' => $guest->updated_at,
        ]);
    }

    /**
     * Update the specified guest
     */
    public function update(Request $request, string $eventId, string $guestId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.update')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $guest = EventGuest::where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        $validated = $request->validate([
            'full_name' => 'sometimes|required|string|max:200',
            'phone' => 'nullable|string|max:20',
            'guest_type' => 'sometimes|required|in:student,parent,teacher,staff,vip,external',
            'invite_count' => 'sometimes|integer|min:1|max:100',
            'status' => 'in:invited,checked_in,blocked',
            'field_values' => 'array',
            'field_values.*.field_id' => 'required|uuid|exists:event_type_fields,id',
            'field_values.*.value' => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            // Update core fields
            $guest->update([
                'full_name' => $validated['full_name'] ?? $guest->full_name,
                'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $guest->phone,
                'guest_type' => $validated['guest_type'] ?? $guest->guest_type,
                'invite_count' => $validated['invite_count'] ?? $guest->invite_count,
                'status' => $validated['status'] ?? $guest->status,
            ]);

            // Update dynamic field values
            if (isset($validated['field_values'])) {
                foreach ($validated['field_values'] as $fieldValue) {
                    $value = $fieldValue['value'];
                    EventGuestFieldValue::updateOrCreate(
                        [
                            'guest_id' => $guest->id,
                            'field_id' => $fieldValue['field_id'],
                        ],
                        [
                            'value_text' => is_array($value) ? null : $value,
                            'value_json' => is_array($value) ? $value : null,
                        ]
                    );
                }
            }

            DB::commit();

            Log::info("Guest updated", ['id' => $guest->id]);

            return response()->json($guest);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Failed to update guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to update guest'], 500);
        }
    }

    /**
     * Remove the specified guest
     */
    public function destroy(Request $request, string $eventId, string $guestId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.delete')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $guest = EventGuest::where('id', $guestId)
            ->where('event_id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            return response()->json(['error' => 'Guest not found'], 404);
        }

        try {
            $guest->delete();
            Log::info("Guest deleted", ['id' => $guestId]);
            return response()->noContent();
        } catch (\Exception $e) {
            Log::error("Failed to delete guest: " . $e->getMessage());
            return response()->json(['error' => 'Failed to delete guest'], 500);
        }
    }

    /**
     * Upload guest photo
     */
    public function uploadPhoto(Request $request, string $guestId)
    {
        Log::info("Photo upload request received", [
            'guest_id' => $guestId,
            'has_file' => $request->hasFile('photo'),
            'content_type' => $request->header('Content-Type'),
            'content_length' => $request->header('Content-Length'),
        ]);

        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            Log::warning("Unauthorized photo upload attempt", ['guest_id' => $guestId]);
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.update')) {
                Log::warning("Permission denied for photo upload", ['guest_id' => $guestId]);
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            Log::warning("Permission check failed for photo upload", [
                'guest_id' => $guestId,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        $currentSchoolId = $this->getCurrentSchoolId($request);

        $guest = EventGuest::where('id', $guestId)
            ->where('organization_id', $profile->organization_id)
            ->where('school_id', $currentSchoolId)
            ->whereNull('deleted_at')
            ->first();

        if (!$guest) {
            Log::warning("Guest not found for photo upload", ['guest_id' => $guestId]);
            return response()->json(['error' => 'Guest not found'], 404);
        }

        // Check if file exists - try multiple methods for compatibility
        $file = null;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
        } else {
            // Fallback: Check allFiles() directly (works when hasFile() fails)
            $allFiles = $request->allFiles();
            if (isset($allFiles['photo']) && $allFiles['photo'] instanceof \Illuminate\Http\UploadedFile) {
                $file = $allFiles['photo'];
                Log::info("File found via allFiles() fallback", [
                    'guest_id' => $guestId,
                    'has_file' => $request->hasFile('photo'),
                    'all_files_keys' => array_keys($allFiles),
                ]);
            } elseif (count($allFiles) > 0) {
                // Last resort: Get first file if available
                $file = reset($allFiles);
                Log::info("File found via allFiles() first file", [
                    'guest_id' => $guestId,
                    'file_key' => array_key_first($allFiles),
                ]);
            }
        }
        
        if (!$file) {
            Log::error("No file in upload request", [
                'guest_id' => $guestId,
                'request_keys' => array_keys($request->all()),
                'files' => array_keys($request->allFiles()),
                'content_type' => $request->header('Content-Type'),
                'content_length' => $request->header('Content-Length'),
                'has_file_photo' => $request->hasFile('photo'),
                'all_files_count' => count($request->allFiles()),
            ]);
            return response()->json(['error' => 'No file provided'], 422);
        }
        
        // Ensure we have an UploadedFile instance
        if (!($file instanceof \Illuminate\Http\UploadedFile)) {
            Log::error("File is not an UploadedFile instance", [
                'guest_id' => $guestId,
                'file_type' => gettype($file),
                'file_class' => is_object($file) ? get_class($file) : 'not an object',
            ]);
            return response()->json(['error' => 'Invalid file format'], 422);
        }

        // More lenient validation for Android Chrome compatibility
        // Some browsers may not send proper MIME types
        // Note: We already have $file, so we validate it directly
        try {
            // Validate file size (5MB max)
            $maxSize = 5120 * 1024; // 5MB in bytes
            if ($file->getSize() > $maxSize) {
                Log::error("File too large", [
                    'guest_id' => $guestId,
                    'file_size' => $file->getSize(),
                    'max_size' => $maxSize,
                ]);
                return response()->json([
                    'error' => 'File size exceeds maximum allowed size of 5MB',
                ], 422);
            }
        } catch (\Exception $e) {
            Log::error("File validation failed", [
                'guest_id' => $guestId,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'error' => 'File validation failed: ' . $e->getMessage(),
            ], 422);
        }

        Log::info("File received for upload", [
            'guest_id' => $guestId,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'extension' => $file->getClientOriginalExtension(),
            'is_valid' => $file->isValid(),
            'error_code' => $file->getError(),
            'error_message' => $file->getErrorMessage(),
        ]);
        
        // Check if it's actually an image by reading the file
        $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());
        
        // Check MIME type and extension
        $isValidImage = in_array($mimeType, $allowedMimes) || 
                       in_array($extension, $allowedExtensions);
        
        // If MIME type check fails, try to detect from file content
        if (!$isValidImage) {
            try {
                $fileContent = file_get_contents($file->getPathname());
                $imageInfo = @getimagesizefromstring($fileContent);
                if ($imageInfo !== false) {
                    $detectedMime = $imageInfo['mime'] ?? null;
                    $isValidImage = in_array($detectedMime, $allowedMimes);
                    if ($isValidImage && empty($extension)) {
                        // Update extension based on detected MIME type
                        $mimeToExt = [
                            'image/jpeg' => 'jpg',
                            'image/png' => 'png',
                            'image/webp' => 'webp',
                        ];
                        $extension = $mimeToExt[$detectedMime] ?? 'jpg';
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Failed to detect image type from content", [
                    'guest_id' => $guestId,
                    'error' => $e->getMessage(),
                ]);
            }
        }
        
        if (!$isValidImage) {
            return response()->json([
                'error' => 'Invalid image file. Please upload a JPG, PNG, or WEBP image.'
            ], 422);
        }

        try {
            // Additional validation for Android Chrome compatibility
            if (!$file || !$file->isValid()) {
                Log::warning("Invalid file upload", [
                    'guest_id' => $guestId,
                    'has_file' => $request->hasFile('photo'),
                    'file_valid' => $file ? $file->isValid() : false,
                ]);
                return response()->json(['error' => 'Invalid file upload. Please try again.'], 422);
            }
            
            $eventId = $guest->event_id;
            
            // Use extension from validation above, or get from file
            if (empty($extension)) {
                $extension = $file->getClientOriginalExtension();
                if (empty($extension)) {
                    // Fallback: use detected MIME type or default to jpg
                    $extension = 'jpg';
                }
            }
            
            $filename = Str::uuid() . '.' . strtolower($extension);
            
            // Store original - use getRealPath() for better Android Chrome compatibility
            $path = "events/{$eventId}/guests/{$filename}";
            
            // Get file content - try multiple methods for Android Chrome compatibility
            $fileContent = null;
            $filePath = null;
            
            // Try getRealPath first (works for uploaded files)
            if (method_exists($file, 'getRealPath')) {
                $realPath = $file->getRealPath();
                if ($realPath && file_exists($realPath)) {
                    $filePath = $realPath;
                }
            }
            
            // Fallback to getPathname
            if (!$filePath) {
                $pathname = $file->getPathname();
                if (file_exists($pathname)) {
                    $filePath = $pathname;
                }
            }
            
            // If still no valid path, try to get content directly from UploadedFile
            if (!$filePath) {
                try {
                    // Laravel's UploadedFile has a getContent() method in newer versions
                    if (method_exists($file, 'getContent')) {
                        $fileContent = $file->getContent();
                    } else {
                        // Fallback: read from stream
                        $fileContent = file_get_contents($file->getPathname());
                    }
                } catch (\Exception $e) {
                    Log::error("Failed to get file path or content", [
                        'guest_id' => $guestId,
                        'error' => $e->getMessage(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                    ]);
                    return response()->json(['error' => 'Failed to read file. Please try again.'], 500);
                }
            } else {
                // Read from file path
                $fileContent = file_get_contents($filePath);
            }
            
            if ($fileContent === false || empty($fileContent)) {
                Log::error("Failed to read file content", [
                    'guest_id' => $guestId,
                    'file_path' => $filePath ?? $file->getPathname(),
                    'real_path' => method_exists($file, 'getRealPath') ? $file->getRealPath() : 'N/A',
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'is_valid' => $file->isValid(),
                ]);
                return response()->json(['error' => 'Failed to read file. Please try again.'], 500);
            }
            
            // Compress and resize image before storing
            $processedContent = $fileContent;
            $originalSize = strlen($fileContent);
            
            try {
                // Try to use Intervention Image if available
                if (class_exists(ImageManager::class)) {
                    $manager = new ImageManager(new Driver());
                    $image = $manager->read($fileContent);
                    
                    // Get original dimensions
                    $originalWidth = $image->width();
                    $originalHeight = $image->height();
                    
                    // Resize if image is too large (max 1920x1920, maintain aspect ratio)
                    $maxWidth = 1920;
                    $maxHeight = 1920;
                    
                    if ($originalWidth > $maxWidth || $originalHeight > $maxHeight) {
                        $image->scaleDown($maxWidth, $maxHeight);
                        Log::info("Image resized", [
                            'guest_id' => $guestId,
                            'original' => "{$originalWidth}x{$originalHeight}",
                            'new' => "{$image->width()}x{$image->height()}",
                        ]);
                    }
                    
                    // Convert to JPEG with quality 85 for better compression
                    // This reduces file size significantly
                    $processedContent = $image->toJpeg(85);
                    $newSize = strlen($processedContent);
                    
                    Log::info("Image compressed", [
                        'guest_id' => $guestId,
                        'original_size' => $originalSize,
                        'compressed_size' => $newSize,
                        'reduction' => round((($originalSize - $newSize) / $originalSize) * 100, 1) . '%',
                    ]);
                    
                    // Update extension to jpg since we're converting to JPEG
                    $extension = 'jpg';
                    $filename = Str::uuid() . '.jpg';
                    $path = "events/{$eventId}/guests/{$filename}";
                } else {
                    // Fallback: Use GD library if available
                    if (extension_loaded('gd')) {
                        $imageInfo = @getimagesizefromstring($fileContent);
                        if ($imageInfo !== false) {
                            $sourceImage = null;
                            $mimeType = $imageInfo['mime'];
                            
                            // Create image resource
                            switch ($mimeType) {
                                case 'image/jpeg':
                                    $sourceImage = @imagecreatefromstring($fileContent);
                                    break;
                                case 'image/png':
                                    $sourceImage = @imagecreatefromstring($fileContent);
                                    break;
                                case 'image/webp':
                                    if (function_exists('imagecreatefromwebp')) {
                                        $sourceImage = @imagecreatefromstring($fileContent);
                                    }
                                    break;
                            }
                            
                            if ($sourceImage) {
                                $originalWidth = $imageInfo[0];
                                $originalHeight = $imageInfo[1];
                                $maxWidth = 1920;
                                $maxHeight = 1920;
                                
                                // Calculate new dimensions
                                if ($originalWidth > $maxWidth || $originalHeight > $maxHeight) {
                                    $ratio = min($maxWidth / $originalWidth, $maxHeight / $originalHeight);
                                    $newWidth = (int)($originalWidth * $ratio);
                                    $newHeight = (int)($originalHeight * $ratio);
                                    
                                    // Create resized image
                                    $resized = imagecreatetruecolor($newWidth, $newHeight);
                                    
                                    // Preserve transparency for PNG
                                    if ($mimeType === 'image/png') {
                                        imagealphablending($resized, false);
                                        imagesavealpha($resized, true);
                                    }
                                    
                                    // Resize
                                    imagecopyresampled($resized, $sourceImage, 0, 0, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);
                                    
                                    // Output as JPEG
                                    ob_start();
                                    imagejpeg($resized, null, 85);
                                    $processedContent = ob_get_clean();
                                    
                                    // Clean up
                                    imagedestroy($sourceImage);
                                    imagedestroy($resized);
                                    
                                    // Update extension
                                    $extension = 'jpg';
                                    $filename = Str::uuid() . '.jpg';
                                    $path = "events/{$eventId}/guests/{$filename}";
                                    
                                    $newSize = strlen($processedContent);
                                    Log::info("Image compressed with GD", [
                                        'guest_id' => $guestId,
                                        'original_size' => $originalSize,
                                        'compressed_size' => $newSize,
                                        'reduction' => round((($originalSize - $newSize) / $originalSize) * 100, 1) . '%',
                                    ]);
                                }
                            }
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Image compression failed, using original", [
                    'guest_id' => $guestId,
                    'error' => $e->getMessage(),
                ]);
                // Continue with original file if compression fails
                $processedContent = $fileContent;
            }
            
            // Store the processed file
            $stored = Storage::disk('public')->put($path, $processedContent);
            
            if (!$stored) {
                Log::error("Failed to store file", [
                    'guest_id' => $guestId,
                    'path' => $path,
                    'file_size' => strlen($processedContent),
                ]);
                return response()->json(['error' => 'Failed to store file. Please try again.'], 500);
            }
            
            Log::info("File stored successfully", [
                'guest_id' => $guestId,
                'path' => $path,
                'original_size' => $originalSize,
                'stored_size' => strlen($processedContent),
            ]);

            // Create thumbnail from processed content
            $thumbPath = null;
            try {
                if (class_exists(ImageManager::class)) {
                    $manager = new ImageManager(new Driver());
                    $thumbImage = $manager->read($processedContent);
                    $thumbImage->cover(200, 200);

                    $thumbPath = "events/{$eventId}/guests/thumbs/{$filename}";
                    Storage::disk('public')->put($thumbPath, $thumbImage->toJpeg(80));
                } elseif (extension_loaded('gd')) {
                    // Fallback: Use GD library
                    $thumbImage = @imagecreatefromstring($processedContent);
                    if ($thumbImage) {
                        $thumbWidth = 200;
                        $thumbHeight = 200;
                        $thumbResized = imagecreatetruecolor($thumbWidth, $thumbHeight);
                        
                        $sourceWidth = imagesx($thumbImage);
                        $sourceHeight = imagesy($thumbImage);
                        
                        // Calculate crop dimensions (center crop)
                        $ratio = max($sourceWidth / $thumbWidth, $sourceHeight / $thumbHeight);
                        $cropWidth = (int)($thumbWidth * $ratio);
                        $cropHeight = (int)($thumbHeight * $ratio);
                        $cropX = (int)(($sourceWidth - $cropWidth) / 2);
                        $cropY = (int)(($sourceHeight - $cropHeight) / 2);
                        
                        imagecopyresampled($thumbResized, $thumbImage, 0, 0, $cropX, $cropY, $thumbWidth, $thumbHeight, $cropWidth, $cropHeight);
                        
                        ob_start();
                        imagejpeg($thumbResized, null, 80);
                        $thumbContent = ob_get_clean();
                        
                        $thumbPath = "events/{$eventId}/guests/thumbs/{$filename}";
                        Storage::disk('public')->put($thumbPath, $thumbContent);
                        
                        imagedestroy($thumbImage);
                        imagedestroy($thumbResized);
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Failed to create thumbnail: " . $e->getMessage());
                // Continue without thumbnail - use original image as fallback
                $thumbPath = null;
            }

            // Delete old photo if exists (before updating database)
            if ($guest->photo_path) {
                try {
                    Storage::disk('public')->delete($guest->photo_path);
                    $oldThumb = str_replace('/guests/', '/guests/thumbs/', $guest->photo_path);
                    Storage::disk('public')->delete($oldThumb);
                } catch (\Exception $e) {
                    Log::warning("Failed to delete old photo", [
                        'guest_id' => $guestId,
                        'old_path' => $guest->photo_path,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue - don't fail the upload if old photo deletion fails
                }
            }

            // Update database with new photo path
            try {
                $updated = $guest->update(['photo_path' => $path]);
                
                if (!$updated) {
                    Log::error("Failed to update photo_path in database", [
                        'guest_id' => $guestId,
                        'path' => $path,
                        'guest_exists' => $guest->exists,
                    ]);
                    // Try to delete the stored file since DB update failed
                    Storage::disk('public')->delete($path);
                    if ($thumbPath) {
                        Storage::disk('public')->delete($thumbPath);
                    }
                    return response()->json(['error' => 'Failed to save photo information. Please try again.'], 500);
                }

                // Verify the update was saved
                $guest->refresh();
                if ($guest->photo_path !== $path) {
                    Log::error("Photo path mismatch after update", [
                        'guest_id' => $guestId,
                        'expected_path' => $path,
                        'actual_path' => $guest->photo_path,
                    ]);
                    // Try to delete the stored file
                    Storage::disk('public')->delete($path);
                    if ($thumbPath) {
                        Storage::disk('public')->delete($thumbPath);
                    }
                    return response()->json(['error' => 'Failed to save photo information. Please try again.'], 500);
                }

                Log::info("Guest photo uploaded successfully", [
                    'guest_id' => $guestId,
                    'photo_path' => $path,
                    'thumb_path' => $thumbPath,
                    'file_size' => strlen($fileContent),
                ]);
            } catch (\Exception $e) {
                Log::error("Exception while updating photo_path", [
                    'guest_id' => $guestId,
                    'path' => $path,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                // Try to delete the stored file
                Storage::disk('public')->delete($path);
                if ($thumbPath) {
                    Storage::disk('public')->delete($thumbPath);
                }
                return response()->json(['error' => 'Failed to save photo information: ' . $e->getMessage()], 500);
            }

            return response()->json([
                'photo_url' => Storage::url($path),
                'photo_thumb_url' => isset($thumbPath) ? Storage::url($thumbPath) : Storage::url($path),
            ]);
        } catch (\Exception $e) {
            Log::error("Failed to upload photo", [
                'guest_id' => $guestId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return response()->json([
                'error' => 'Failed to upload photo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get guest photo
     */
    public function getPhoto(Request $request, string $guestId)
    {
        try {
            $user = $request->user();
            if (!$user) {
                abort(401, 'Unauthorized');
            }

            $profile = DB::table('profiles')->where('id', $user->id)->first();

            if (!$profile) {
                abort(404, 'Profile not found');
            }

            if (!$profile->organization_id) {
                abort(403, 'User must be assigned to an organization');
            }

            try {
                if (!$user->hasPermissionTo('event_guests.read')) {
                    abort(403, 'This action is unauthorized');
                }
            } catch (\Exception $e) {
                abort(403, 'This action is unauthorized');
            }

            $currentSchoolId = $this->getCurrentSchoolId($request);

            $guest = EventGuest::where('id', $guestId)
                ->where('organization_id', $profile->organization_id)
                ->where('school_id', $currentSchoolId)
                ->whereNull('deleted_at')
                ->first();

            if (!$guest) {
                abort(404, 'Guest not found');
            }

            // If no photo_path, return 404 (not an error, just missing photo)
            if (!$guest->photo_path) {
                Log::info('Guest photo requested but no photo_path', ['guest_id' => $guestId]);
                return response('', 404);
            }

            // Normalize path separators for Windows compatibility
            $normalizedPath = str_replace('/', DIRECTORY_SEPARATOR, $guest->photo_path);
            $fullPath = storage_path('app' . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . $normalizedPath);

            // Check if file exists
            if (!file_exists($fullPath)) {
                Log::warning('Guest photo file not found on disk', [
                    'guest_id' => $guestId,
                    'photo_path' => $guest->photo_path,
                    'normalized_path' => $normalizedPath,
                    'full_path' => $fullPath,
                ]);
                return response('', 404);
            }

            // Get file content
            try {
                $file = file_get_contents($fullPath);
                if ($file === false) {
                    throw new \Exception('Failed to read file contents');
                }
            } catch (\Exception $e) {
                Log::error('Error reading guest photo file', [
                    'guest_id' => $guestId,
                    'photo_path' => $guest->photo_path,
                    'full_path' => $fullPath,
                    'error' => $e->getMessage(),
                ]);
                return response('', 500);
            }
            
            if (!$file || empty($file)) {
                Log::warning('Guest photo file is empty', [
                    'guest_id' => $guestId,
                    'photo_path' => $guest->photo_path,
                    'full_path' => $fullPath,
                ]);
                return response('', 404);
            }
            
            // Determine MIME type from file extension
            $extension = pathinfo($guest->photo_path, PATHINFO_EXTENSION);
            $mimeTypes = [
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'gif' => 'image/gif',
                'webp' => 'image/webp',
            ];
            $mimeType = $mimeTypes[strtolower($extension)] ?? 'image/jpeg';

            return response($file, 200)
                ->header('Content-Type', $mimeType)
                ->header('Content-Disposition', 'inline; filename="' . basename($guest->photo_path) . '"')
                ->header('Cache-Control', 'public, max-age=3600');
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Error getting guest photo', [
                'guest_id' => $guestId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response('', 500);
        }
    }

    /**
     * Bulk import guests (stub for CSV import)
     */
    public function import(Request $request, string $eventId)
    {
        $user = $request->user();
        $profile = DB::table('profiles')->where('id', $user->id)->first();

        if (!$profile || !$profile->organization_id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        try {
            if (!$user->hasPermissionTo('events.create')) {
                return response()->json(['error' => 'This action is unauthorized'], 403);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'This action is unauthorized'], 403);
        }

        // Check if user is event-specific (locked to one event)
        $isEventUser = $profile->is_event_user ?? false;
        $userEventId = $profile->event_id ?? null;
        
        // Event-specific users can only access their assigned event
        if ($isEventUser && $userEventId && $eventId !== $userEventId) {
            return response()->json(['error' => 'Access denied. You can only access your assigned event.'], 403);
        }
        
        // Verify event
        $event = Event::where('id', $eventId)
            ->where('organization_id', $profile->organization_id)
            ->whereNull('deleted_at')
            ->first();

        if (!$event) {
            return response()->json(['error' => 'Event not found'], 404);
        }

        // TODO: Implement CSV import
        return response()->json([
            'message' => 'Import endpoint ready. CSV import coming soon.',
            'supported_columns' => ['full_name', 'phone', 'guest_type', 'invite_count'],
        ]);
    }
}
