---
name: Global Help Center System
overview: Convert the help center system from organization-specific to global, where all categories and articles are global (organization_id = NULL) and access is controlled purely by user permissions matching article context_key values.
todos: []
---

# Global Hel

p Center System Migration

## Overview

Convert the help center system to use global categories and articles (organization_id = NULL) with permission-based access control. All users across all organizations will see the same articles based on their permissions to access specific pages/features.

## Architecture Changes

### Current State

- Categories and articles are created per organization
- Access control: organization_id filtering + permission-based filtering
- Seeders create separate data for each organization

### Target State

- All categories: `organization_id = NULL` (global)
- All articles: `organization_id = NULL` (global)
- Access control: Permission-based only (context_key matching user permissions)
- Seeders create global data only

## Implementation Steps

### 1. Database Migration - Delete Organization-Specific Data

**File**: Create new migration or use Tinker command

- Delete all categories where `organization_id IS NOT NULL`
- Delete all articles where `organization_id IS NOT NULL`
- Keep only global categories/articles (organization_id = NULL)

### 2. Update HelpCenterCategorySeeder

**File**: `backend/database/seeders/HelpCenterCategorySeeder.php`**Changes**:

- Remove organization loop - create categories only once
- Remove `createOrganizationCategories()` method
- Update `createGlobalCategories()` to create all route-based categories (currently in organization section)
- All categories should have `organization_id = NULL`
- Remove organization_id parameter from category creation

**Key Changes**:

```php
// Remove this:
foreach ($organizations as $organization) {
    $this->createOrganizationCategories($organization);
}

// Keep only:
$this->createGlobalCategories(); // But rename to createCategories() and include all route-based categories
```



### 3. Update HelpCenterArticleSeeder

**File**: `backend/database/seeders/HelpCenterArticleSeeder.php`**Changes**:

- Remove organization loop
- Get only global categories (`whereNull('organization_id')`)
- Create articles with `organization_id = NULL`
- Remove organization_id from article creation

### 4. Update HelpCenterArticleController

**File**: `backend/app/Http/Controllers/HelpCenterArticleController.php`**Changes**:

- Remove all `forOrganization()` calls
- Remove all `where('organization_id', ...)` filters
- Keep only `whereNull('organization_id')` to ensure only global articles
- Update `applyPermissionFilter()` to work without organization context (permissions are already global)
- Remove organization_id validation from create/update methods
- Update `getByContext()` to only query global articles

**Key Methods to Update**:

- `index()` - Remove organization filtering
- `show()` - Remove organization filtering
- `showBySlug()` - Remove organization filtering
- `showCategoryBySlug()` - Remove organization filtering
- `getByContext()` - Remove organization filtering
- `store()` - Set organization_id = NULL always
- `update()` - Remove organization_id updates
- All other methods that use `forOrganization()` scope

### 5. Update HelpCenterCategoryController (if exists)

**File**: Check if `backend/app/Http/Controllers/HelpCenterCategoryController.php` exists**Changes**:

- Remove organization filtering
- Ensure all categories are global
- Update create/update to set organization_id = NULL

### 6. Update Model Scopes

**File**: `backend/app/Models/HelpCenterArticle.php`**Changes**:

- Update `scopeForOrganization()` to always return global only:
```php
public function scopeForOrganization($query, $organizationId = null)
{
    // Always return global articles only
    return $query->whereNull('organization_id');
}
```


**File**: `backend/app/Models/HelpCenterCategory.php`**Changes**:

- Update `scopeForOrganization()` similarly:
```php
public function scopeForOrganization($query, $organizationId = null)
{
    // Always return global categories only
    return $query->whereNull('organization_id');
}
```




### 7. Update Permission Filtering Logic

**File**: `backend/app/Http/Controllers/HelpCenterArticleController.php`**Changes**:

- Update `applyPermissionFilter()` to work without organization context
- Remove `setPermissionsTeamId()` calls (permissions are global)
- Keep permission matching logic (context_key matching user permissions)

### 8. Update Frontend (if needed)

**Files**: Check frontend hooks/components that pass organization_id**Changes**:

- Remove organization_id from API calls
- Ensure permission-based filtering works correctly
- Update any UI that shows organization-specific information

### 9. Update Validation Rules

**File**: `backend/app/Http/Controllers/HelpCenterArticleController.php`**Changes**:

- Remove `organization_id` from validation rules (or set to nullable, always NULL)
- Remove organization_id checks in create/update methods

## Data Flow After Changes

```javascript
User Request → Controller
    ↓
Query Global Articles (organization_id = NULL)
    ↓
Apply Permission Filter (context_key matching user permissions)
    ↓
Return Filtered Articles
```



## Testing Checklist

- [ ] All categories are global (organization_id = NULL)
- [ ] All articles are global (organization_id = NULL)
- [ ] Users see articles based on permissions only
- [ ] Contextual help (help icon on pages) works correctly
- [ ] Help center main page shows articles based on permissions
- [ ] Article creation sets organization_id = NULL
- [ ] Article updates don't change organization_id
- [ ] Seeders create global data only
- [ ] No organization-specific data remains

## Rollback Plan

If issues occur: