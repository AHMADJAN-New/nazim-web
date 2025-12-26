---
name: Certificate Export System
overview: Create a certificate export system that replicates the ID card export functionality, allowing users to export issued certificates as ZIP files (PDF or images) or as a single PDF with multiple certificates per page.
todos:
  - id: backend-service
    content: Create CertificateExportService.php with exportBulkZip() and exportBulkPdf() methods
    status: pending
  - id: backend-controller
    content: Add exportBulk() method to IssuedCertificateController with validation and filters
    status: pending
    dependencies:
      - backend-service
  - id: backend-routes
    content: Add export route to api.php
    status: pending
    dependencies:
      - backend-controller
  - id: frontend-api-client
    content: Add exportBulk() method to issuedCertificatesApi in client.ts
    status: pending
  - id: frontend-hook
    content: Create useExportCertificates() hook in useGraduation.tsx or useIssuedCertificates.tsx
    status: pending
    dependencies:
      - frontend-api-client
  - id: frontend-types
    content: Add CertificateExportRequest and related types
    status: pending
  - id: frontend-page
    content: Create CertificateExport.tsx page with filters, selection, and export options
    status: pending
    dependencies:
      - frontend-hook
      - frontend-types
  - id: frontend-routes
    content: Add /certificates/export route to App.tsx
    status: pending
    dependencies:
      - frontend-page
  - id: translations
    content: Add translation keys for certificate export in all language files
    status: pending
  - id: navigation
    content: Add Certificate Export link to navigation (if needed)
    status: pending
    dependencies:
      - frontend-routes
---

# Certi

ficate Export System Implementation

## Overview

Replicate the ID card export system for certificates, enabling bulk export of issued certificates in multiple formats (ZIP with PDFs, ZIP with images, or single PDF with multiple certificates per page).

## Architecture

The system will follow the same pattern as ID card exports:

```javascript
Frontend (React/TypeScript)
├── CertificateExport.tsx (new page)
├── useIssuedCertificates.tsx (add export hook)
└── api/client.ts (add export endpoints)

Backend (Laravel/PHP)
├── CertificateExportService.php (new service)
├── IssuedCertificateController.php (add exportBulk method)
└── Routes (add export endpoint)
```



## Implementation Steps

### 1. Backend Service Layer

**File: `backend/app/Services/Certificates/CertificateExportService.php`** (NEW)Create a service similar to `IdCardExportService.php` with:

- `exportBulkZip(array $certificateIds, string $format = 'pdf', string $quality = 'standard'): string`
- Format: 'pdf' (ZIP with PDF files) or 'images' (ZIP with PNG/JPEG images)
- Generate certificates using `CertificateRenderService`
- Create ZIP archive with properly named files
- Store in `certificates/exports/` directory
- `exportBulkPdf(array $certificateIds, int $certificatesPerPage = 1, string $quality = 'standard'): string`
- Generate single PDF with multiple certificates per page
- Use `DocumentPdfService` to combine certificates
- Support 1, 2, 4, 6, 9 certificates per page
- `generateCertificateImage(IssuedCertificate $certificate, string $quality = 'standard'): string`
- Convert PDF to image (PNG/JPEG) for image-based ZIP exports
- Use quality settings (96 DPI standard, 300 DPI high)
- Helper methods:
- `prepareCertificateData()` - Load relationships
- `generatePdfHtml()` - HTML for multi-certificate PDF
- `imageToBase64()` - Convert images to base64
- `cleanupDirectory()` - Clean temporary files

**Key differences from ID cards:**

- Certificates are single-sided (no front/back)
- Use `CertificateRenderService::renderSingle()` instead of `IdCardRenderService::render()`
- File naming: `{certificate_no}-{student_name}.pdf` or `{certificate_no}-{student_name}.png`
- Support both PDF and image formats in ZIP

### 2. Backend Controller

**File: `backend/app/Http/Controllers/Certificates/IssuedCertificateController.php`**Add new method `exportBulk()`:

- Validate request: `certificate_ids` or `filters` (school_id, batch_id, student_id, type, date_range)
- Check permission: `issued_certificates.read` and `certificates.print`
- Validate organization access
- Support filters similar to ID card export:
- `school_id`, `batch_id`, `student_id`, `type` (certificate type)
- `date_range` (issued_at range)
- `revoked` (include/exclude revoked certificates)
- Call `CertificateExportService` based on format:
- `zip` with `format: 'pdf'` → `exportBulkZip($ids, 'pdf', $quality)`
- `zip` with `format: 'images'` → `exportBulkZip($ids, 'images', $quality)`
- `pdf` → `exportBulkPdf($ids, $certificatesPerPage, $quality)`
- Return file download response

**Request validation:**

```php
$validated = $request->validate([
    'certificate_ids' => 'nullable|array',
    'certificate_ids.*' => 'uuid|exists:issued_certificates,id',
    'filters' => 'nullable|array',
    'filters.school_id' => 'nullable|uuid|exists:school_branding,id',
    'filters.batch_id' => 'nullable|uuid|exists:graduation_batches,id',
    'filters.student_id' => 'nullable|uuid|exists:students,id',
    'filters.type' => 'nullable|string',
    'filters.date_from' => 'nullable|date',
    'filters.date_to' => 'nullable|date',
    'filters.revoked' => 'nullable|boolean',
    'format' => 'required|in:zip,pdf',
    'zip_format' => 'required_if:format,zip|in:pdf,images',
    'certificates_per_page' => 'nullable|integer|in:1,2,4,6,9',
    'quality' => 'nullable|in:standard,high',
]);
```



### 3. Backend Routes

**File: `backend/routes/api.php`**Add route:

```php
Route::post('/certificates/export/bulk', [IssuedCertificateController::class, 'exportBulk'])
    ->middleware(['auth:sanctum', 'ensure.organization.access']);
```



### 4. Frontend API Client

**File: `frontend/src/lib/api/client.ts`**Add to `issuedCertificatesApi`:

- `exportBulk(data: CertificateExportRequest): Promise<BlobResponse>`
- Send POST request to `/api/certificates/export/bulk`
- Handle blob response for file download
- Return `{ blob: Blob, filename: string }`

**Type definition:**

```typescript
export interface CertificateExportRequest {
  certificate_ids?: string[];
  filters?: {
    school_id?: string;
    batch_id?: string;
    student_id?: string;
    type?: string;
    date_from?: string;
    date_to?: string;
    revoked?: boolean;
  };
  format: 'zip' | 'pdf';
  zip_format?: 'pdf' | 'images'; // Required if format is 'zip'
  certificates_per_page?: number; // Required if format is 'pdf'
  quality?: 'standard' | 'high';
}
```



### 5. Frontend Hook

**File: `frontend/src/hooks/useGraduation.tsx`** (or create `useIssuedCertificates.tsx`)Add hook `useExportCertificates()`:

- Use `useMutation` from TanStack Query
- Call `issuedCertificatesApi.exportBulk()`
- Handle blob response and trigger browser download
- Show success/error toasts
- Similar pattern to `useExportIdCards()` in `useStudentIdCards.tsx`

**Implementation pattern:**

```typescript
export const useExportCertificates = () => {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: CertificateExportRequest) => {
      const result = await issuedCertificatesApi.exportBulk(data);
      // Trigger file download
      if (result && result.blob) {
        const url = window.URL.createObjectURL(result.blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || `certificates-export-${Date.now()}.${data.format === 'zip' ? 'zip' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      return result;
    },
    onSuccess: () => {
      showToast.success(t('toast.certificatesExported'));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.certificateExportFailed'));
    },
  });
};
```



### 6. Frontend Export Page

**File: `frontend/src/pages/CertificateExport.tsx`** (NEW)Create page similar to `IdCardExport.tsx` with:**Features:**

- Statistics dashboard (total certificates, by status, by batch, etc.)
- Filter section:
- School, Batch, Student, Certificate Type
- Date range (issued_at)
- Revoked status filter
- Search by student name/certificate number
- Export options panel:
- Format: ZIP or PDF
- If ZIP: Format option (PDF files or Images)
- If PDF: Certificates per page (1, 2, 4, 6, 9)
- Quality: Standard (96 DPI) or High (300 DPI)
- Include/exclude revoked certificates toggle
- Certificate selection table:
- Checkbox selection
- Columns: Certificate No, Student, Batch, Type, Issued At, Status
- Select all, Select by status, Select by batch
- Export actions:
- "Export Selected" button
- "Export All Filtered" button
- Loading states during export

**Component structure:**

```typescript
export default function CertificateExport() {
  // State management
  // Filters, selection, export options
  // Data hooks (useIssuedCertificates, useExportCertificates)
  // Statistics calculation
  // Export handlers
  // UI rendering
}
```



### 7. Frontend Types

**File: `frontend/src/types/domain/issuedCertificate.ts`** (if not exists)Add export-related types:

```typescript
export interface CertificateExportRequest {
  certificate_ids?: string[];
  filters?: CertificateExportFilters;
  format: 'zip' | 'pdf';
  zip_format?: 'pdf' | 'images';
  certificates_per_page?: number;
  quality?: 'standard' | 'high';
}

export interface CertificateExportFilters {
  school_id?: string;
  batch_id?: string;
  student_id?: string;
  type?: string;
  date_from?: string;
  date_to?: string;
  revoked?: boolean;
}
```



### 8. Frontend Routes

**File: `frontend/src/App.tsx`**Add route:

```typescript
<Route path="/certificates/export" element={
  <PermissionRoute permission="issued_certificates.read">
    <Suspense fallback={<PageSkeleton />}>
      <CertificateExport />
    </Suspense>
  </PermissionRoute>
} />
```



### 9. Navigation

**File: `frontend/src/components/layout/SmartSidebar.tsx`**Add navigation item for Certificate Export (if not exists):

- Link to `/certificates/export`
- Permission: `issued_certificates.read`
- Icon: `FileArchive` or `Download`

### 10. Translations

**Files: `frontend/src/lib/translations/*.ts`**Add translation keys:

- `certificates.export.title`
- `certificates.export.description`
- `certificates.export.format`
- `certificates.export.zipFormat`
- `certificates.export.certificatesPerPage`
- `certificates.export.quality`
- `certificates.export.includeRevoked`
- `certificates.export.exportSelected`
- `certificates.export.exportAll`
- `toast.certificatesExported`
- `toast.certificateExportFailed`

## Key Implementation Details

### Certificate Image Generation

For image-based ZIP exports, convert PDF to image:

- Use `imagick` PHP extension or `spatie/pdf-to-image` package
- Or generate image directly from HTML using `Browsershot` (if available)
- Quality settings: 96 DPI (standard) or 300 DPI (high)

### File Naming

- PDF: `{certificate_no}-{student_name_slug}.pdf`
- Image: `{certificate_no}-{student_name_slug}.png`
- Use `Str::slug()` for student name sanitization

### Error Handling

- Validate certificates exist and belong to organization
- Handle missing templates gracefully
- Log errors for debugging
- Return user-friendly error messages

### Performance

- Process certificates in batches for large exports
- Use queue jobs for very large exports (future enhancement)
- Clean up temporary files after export

## Testing Checklist

- [ ] Export selected certificates as ZIP (PDF)
- [ ] Export selected certificates as ZIP (Images)
- [ ] Export all filtered certificates as single PDF
- [ ] Filter by school, batch, student, date range
- [ ] Include/exclude revoked certificates
- [ ] Quality settings (standard vs high)
- [ ] Certificates per page (1, 2, 4, 6, 9)
- [ ] File naming is correct
- [ ] Organization isolation (users can only export their org's certificates)
- [ ] Permission checks work correctly
- [ ] Error handling for missing templates/data
- [ ] Large batch exports (100+ certificates)

## Files to Create/Modify

**New Files:**

1. `backend/app/Services/Certificates/CertificateExportService.php`
2. `frontend/src/pages/CertificateExport.tsx`
3. `frontend/src/types/domain/certificateExport.ts` (if needed)

**Modified Files:**

1. `backend/app/Http/Controllers/Certificates/IssuedCertificateController.php`
2. `backend/routes/api.php`