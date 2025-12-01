# Transition Schools and Academic Years to Laravel API

## Overview

Complete the migration of schools (school_branding) and academic years functionality to Laravel API. Both features are already partially migrated with Laravel controllers and models, but need Form Requests for proper validation, missing methods, and final cleanup.

## Current State Analysis

### Schools (School Branding)
- ✅ Laravel Controller exists: `SchoolBrandingController`
- ✅ Laravel Model exists: `SchoolBranding`
- ✅ Frontend hooks use Laravel API (`useSchools.tsx`)
- ✅ API client methods exist (`schoolsApi`)
- ❌ Controller uses inline validation (should use Form Requests)
- ❌ Missing Form Requests for validation
- ⚠️ Some components reference schools via Supabase in nested queries (acceptable for now - will be migrated when those features migrate)

### Academic Years
- ✅ Laravel Controller exists: `AcademicYearController`
- ✅ Laravel Model exists: `AcademicYear`
- ✅ Frontend hooks use Laravel API (`useAcademicYears.tsx`)
- ✅ API client methods exist (`academicYearsApi`)
- ❌ Controller uses inline validation (should use Form Requests)
- ❌ Missing Form Requests for validation
- ❌ Missing `setCurrent` method in controller (frontend calls it but route doesn't exist)
- ⚠️ Some components reference academic years via Supabase in nested queries (acceptable for now - will be migrated when those features migrate)

## Database Schema

### Schools Table (school_branding)
- `id` (UUID, primary key)
- `organization_id` (UUID, foreign key to `organizations.id`)
- `school_name` (VARCHAR 255, NOT NULL)
- `school_name_arabic`, `school_name_pashto` (VARCHAR 255, nullable)
- `school_address`, `school_phone`, `school_email`, `school_website` (nullable)
- `logo_path`, `header_image_path`, `footer_text` (nullable)
- `primary_color`, `secondary_color`, `accent_color` (VARCHAR 7, nullable)
- `font_family` (VARCHAR 100, nullable)
- `report_font_size` (VARCHAR 10, nullable)
- `primary_logo_usage`, `secondary_logo_usage`, `ministry_logo_usage` (VARCHAR 100, nullable)
- `header_text` (nullable)
- `table_alternating_colors`, `show_page_numbers`, `show_generation_date` (boolean, nullable)
- `report_logo_selection` (VARCHAR 50, nullable)
- `calendar_preference` (VARCHAR 20, nullable)
- `is_active` (boolean, default true)
- `primary_logo_binary`, `secondary_logo_binary`, `ministry_logo_binary` (BYTEA, nullable)
- `primary_logo_mime_type`, `secondary_logo_mime_type`, `ministry_logo_mime_type` (VARCHAR 100, nullable)
- `primary_logo_filename`, `secondary_logo_filename`, `ministry_logo_filename` (VARCHAR 255, nullable)
- `primary_logo_size`, `secondary_logo_size`, `ministry_logo_size` (integer, nullable)
- `created_at`, `updated_at`, `deleted_at` (timestamps)

### Academic Years Table
- `id` (UUID, primary key)
- `organization_id` (UUID, nullable, foreign key to `organizations.id`)
- `name` (VARCHAR 100, NOT NULL)
- `start_date` (DATE, NOT NULL)
- `end_date` (DATE, NOT NULL)
- `is_current` (boolean, default false)
- `description` (TEXT, nullable)
- `status` (VARCHAR 50, default 'active')
- `created_at`, `updated_at`, `deleted_at` (timestamps)
- Unique constraint: `(name, organization_id)` where `deleted_at IS NULL`

## Backend (Laravel)

### 1. Create Form Requests for Schools

**File**: `backend/app/Http/Requests/StoreSchoolRequest.php`
- Validation: `organization_id` (required, uuid, exists:organizations,id)
- Validation: `school_name` (required, string, max:255)
- Validation: All other fields with appropriate rules (nullable, string, email, url, boolean, etc.)
- Custom validation: Verify organization access (user can only create schools for their organization unless super admin)

**File**: `backend/app/Http/Requests/UpdateSchoolRequest.php`
- Same validation as StoreSchoolRequest, but all fields are `sometimes` (optional)
- Exclude `organization_id` from updates (prevent organization changes)
- Custom validation: Verify organization access

### 2. Create Form Requests for Academic Years

**File**: `backend/app/Http/Requests/StoreAcademicYearRequest.php`
- Validation: `name` (required, string, max:100, unique per organization)
- Validation: `start_date` (required, date)
- Validation: `end_date` (required, date, after:start_date)
- Validation: `is_current` (nullable, boolean)
- Validation: `description` (nullable, string, max:500)
- Validation: `status` (nullable, string, max:50)
- Validation: `organization_id` (nullable, uuid, exists:organizations,id)
- Custom validation: Verify organization access
- Custom validation: If `is_current` is true, unset other current years for same organization

**File**: `backend/app/Http/Requests/UpdateAcademicYearRequest.php`
- Same validation as StoreAcademicYearRequest, but all fields are `sometimes` (optional)
- Unique check for `name` excludes current academic year
- Exclude `organization_id` from updates (prevent organization changes unless super admin)
- Custom validation: Verify organization access
- Custom validation: If `is_current` is true, unset other current years for same organization

### 3. Update SchoolBrandingController

**File**: `backend/app/Http/Controllers/SchoolBrandingController.php`
- Replace inline validation in `store()` with `StoreSchoolRequest`
- Replace inline validation in `update()` with `UpdateSchoolRequest`
- Keep all existing permission checks and organization filtering logic
- Ensure proper error handling

### 4. Update AcademicYearController

**File**: `backend/app/Http/Controllers/AcademicYearController.php`
- Replace inline validation in `store()` with `StoreAcademicYearRequest`
- Replace inline validation in `update()` with `UpdateAcademicYearRequest`
- Add `setCurrent()` method:
  - Permission check: `academic_years.update` (or allow all authenticated users)
  - Validate organization access
  - Set the specified academic year as current
  - Unset other current years for the same organization
  - Return updated academic year
- Keep all existing permission checks and organization filtering logic
- Ensure proper error handling

### 5. Update API Routes

**File**: `backend/routes/api.php`
- Verify `Route::apiResource('schools', SchoolBrandingController::class);` exists
- Verify `Route::apiResource('academic-years', AcademicYearController::class);` exists
- Add route for `setCurrent` method:
  - `Route::post('/academic-years/{id}/set-current', [AcademicYearController::class, 'setCurrent']);`
  - OR: `Route::put('/academic-years/{id}/set-current', [AcademicYearController::class, 'setCurrent']);`

### 6. Verify Permission Checks

- Schools: `branding.read`, `branding.create`, `branding.update`, `branding.delete`
- Academic Years: Currently no specific permission checks for reading (all authenticated users can read), but should check `academic_years.create`, `academic_years.update`, `academic_years.delete` for mutations
- Ensure super admin can manage all schools and academic years
- Ensure organization isolation is enforced

## Frontend

### 7. Verify API Client Methods

**File**: `frontend/src/lib/api/client.ts`
- Verify `schoolsApi` methods are complete:
  - `list()`, `get()`, `create()`, `update()`, `delete()`
- Verify `academicYearsApi` methods are complete:
  - `list()`, `get()`, `create()`, `update()`, `delete()`, `setCurrent()`
- Ensure `setCurrent()` method calls the correct endpoint

### 8. Verify Hooks

**File**: `frontend/src/hooks/useSchools.tsx`
- Verify all methods use Laravel API (already done)
- Ensure error handling matches Laravel error format
- Remove any remaining Supabase imports or references

**File**: `frontend/src/hooks/useAcademicYears.tsx`
- Verify all methods use Laravel API (already done)
- Ensure `useSetCurrentAcademicYear()` calls `academicYearsApi.setCurrent()`
- Ensure error handling matches Laravel error format
- Remove any remaining Supabase imports or references

### 9. Update Components (if needed)

**Files to check**:
- `frontend/src/components/settings/SchoolsManagement.tsx`
- `frontend/src/components/settings/AcademicYearsManagement.tsx`

- Verify components work with updated hooks (should work as-is since hooks maintain same interface)
- Update any direct Supabase calls if present
- Ensure permission checks use correct format (`branding.*` for schools, `academic_years.*` for academic years)

## Testing & Validation

### 10. Test All Operations

**Schools:**
- Create, read, update, delete schools
- Organization isolation (users only see their org's schools)
- Permission checks (users without permissions cannot perform operations)
- Soft delete behavior (deleted_at filtering)
- Validation errors (duplicate names, invalid data)

**Academic Years:**
- Create, read, update, delete academic years
- Set current academic year (unset others for same organization)
- Organization isolation (users see their org's years + global years)
- Permission checks (users without permissions cannot perform operations)
- Soft delete behavior (deleted_at filtering)
- Validation errors (duplicate names, invalid date ranges, cannot delete current year)
- Global academic years (organization_id = NULL) - only super admin can create/delete

### 11. Verify Multi-Tenancy

- Users can only create/update/delete schools/academic years for their organization
- Super admin can manage all schools/academic years
- Organization filtering works correctly
- Organization_id cannot be changed by non-super-admin users
- Global academic years are accessible to all users but only manageable by super admin

## Files to Create/Modify

**Backend:**
- `backend/app/Http/Requests/StoreSchoolRequest.php` (new)
- `backend/app/Http/Requests/UpdateSchoolRequest.php` (new)
- `backend/app/Http/Requests/StoreAcademicYearRequest.php` (new)
- `backend/app/Http/Requests/UpdateAcademicYearRequest.php` (new)
- `backend/app/Http/Controllers/SchoolBrandingController.php` (modify - use Form Requests)
- `backend/app/Http/Controllers/AcademicYearController.php` (modify - use Form Requests, add setCurrent method)
- `backend/routes/api.php` (modify - add setCurrent route)

**Frontend:**
- `frontend/src/lib/api/client.ts` (verify - ensure setCurrent method exists)
- `frontend/src/hooks/useSchools.tsx` (verify - ensure no Supabase references)
- `frontend/src/hooks/useAcademicYears.tsx` (verify - ensure no Supabase references)

## Notes

- Some components (e.g., `useScheduleSlots`, `useStudentAdmissions`) still reference schools and academic years via Supabase in nested queries. This is acceptable for now as these will be migrated when those features are migrated to Laravel.
- The focus of this migration is to ensure the direct CRUD operations for schools and academic years are fully migrated to Laravel with proper validation and error handling.
- Permission names: `branding.*` for schools, `academic_years.*` for academic years (note: academic_years uses underscore, not hyphen).

