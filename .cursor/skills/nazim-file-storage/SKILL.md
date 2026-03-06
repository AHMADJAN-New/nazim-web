---
name: nazim-file-storage
description: Centralized file storage for Nazim backend. Use when adding uploads, downloads, or file paths. ALWAYS use FileStorageService; never direct Storage:: or move_uploaded_file. Paths include organization_id and school_id.
---

# Nazim File Storage

All file operations must use **FileStorageService** (`backend/app/Services/Storage/FileStorageService.php`). Never use `Storage::`, `move_uploaded_file()`, or hardcoded paths.

## Path Structure

- **Private:** `private/organizations/{org_id}/schools/{school_id}/resource_type/...`
- **Public:** `public/organizations/{org_id}/schools/{school_id}/...`
- Always include organization_id and school_id when available; handle null school_id for org-level files

## Public vs Private

| Resource | Category | Disk | Reason |
|----------|----------|------|--------|
| Students | Pictures, documents | Private | Sensitive |
| Staff | Pictures | Public | UI display |
| Staff | Documents | Private | Sensitive |
| Courses | Documents | Private | May be sensitive |
| DMS | All | Private | Sensitive |
| Events | Attachments, photos | Private | May be sensitive |
| Events | Banners, thumbnails | Public | Public display |
| Templates | Backgrounds | Private | Internal |
| Reports | All | Private | Sensitive |

## Controller Pattern

```php
use App\Services\Storage\FileStorageService;

public function __construct(
    private FileStorageService $fileStorageService
) {}

public function uploadFile(Request $request, string $id)
{
    $file = $request->file('file');
    $resource = YourResource::findOrFail($id);
    
    $filePath = $this->fileStorageService->storeYourResourceFile(
        $file,
        $resource->organization_id,
        $resource->id,
        $resource->school_id
    );
    
    $resource->update(['file_path' => $filePath]);
    $url = $this->fileStorageService->getPrivateDownloadUrl($filePath);
    // Or getPublicUrl($filePath) for public files
    
    return response()->json(['path' => $filePath, 'url' => $url]);
}

public function downloadFile(Request $request, string $id)
{
    $resource = YourResource::findOrFail($id);
    return $this->fileStorageService->downloadFile(
        $resource->file_path,
        $resource->file_name
    );
}

public function deleteFile(Request $request, string $id)
{
    $resource = YourResource::findOrFail($id);
    if ($resource->file_path) {
        $this->fileStorageService->deleteFile($resource->file_path);
    }
    $resource->delete();
    return response()->noContent();
}
```

## Available Methods

- **Student:** storeStudentPicture, storeStudentDocument (private)
- **Staff:** storeStaffPicturePublic, storeStaffDocument (private)
- **Course:** storeCourseDocument (private)
- **DMS:** storeDmsFile (private)
- **Event:** storeEventAttachment, storeEventPhoto (private); storeEventBannerPublic, storeEventThumbnailPublic (public)
- **Templates:** storeIdCardTemplateBackground, storeCertificateTemplateBackground (private)
- **Report:** storeReport (private)
- **Ops:** deleteFile, fileExists, getFile, getPublicUrl, getPrivateDownloadUrl, downloadFile, getFileSize, getMimeType

Website uploads use methods like storeWebsiteLibraryCover, storeWebsiteLibraryPdf, storeWebsiteMediaItem, etc.

## Checklist

- [ ] Use FileStorageService only (no Storage:: or move_uploaded_file)
- [ ] Paths include organization_id and school_id
- [ ] Public disk for direct-URL files; private for sensitive
- [ ] Validate organization access before any file op

## Additional Resources

- Full folder structure and method list: [reference.md](reference.md)
