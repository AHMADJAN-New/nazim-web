# Permissions & Subscription Features Integration Fix

## Summary

This document outlines the fixes applied to properly integrate permissions and subscription features access control throughout the application.

## Problem

The application had a permissions system and a subscription features system, but they were not properly integrated. Users could access pages even without the required features enabled in their subscription plan, as long as they had the permission.

## Solution

### Core Principle

Access to any feature-gated functionality now requires **BOTH**:
1. **Permission**: User must have the specific permission assigned
2. **Feature Enabled**: The feature must be enabled in the organization's subscription plan

Formula: `canAccess = hasPermission(permission) AND hasFeature(feature)`

## Changes Made

### 1. Frontend Permission-to-Feature Mapping (`frontend/src/hooks/usePermissions.tsx`)

**Updated the `PERMISSION_TO_FEATURE_MAP`** to include comprehensive mapping for ALL feature-gated modules:

#### Added Mappings:

- **DMS (Document Management System)**: All DMS permissions now require the `dms` feature
- **Exams**: Complete exam-related permissions now require the `exams` feature
- **Graduation & Certificates**: Graduation batches and certificates now require the `graduation` feature
- **ID Cards**: ID card permissions now require the `id_cards` feature
- **Assets Management**: All asset-related permissions now require the `assets` feature
- **Leave Management**: Leave request permissions now require the `leave_management` feature
- **Timetable**: Timetable and scheduling permissions now require the `timetable` feature
- **Subjects**: Subject management permissions now require the `subjects` feature
- **Multi-Currency**: Currency and exchange rate permissions now require the `multi_currency` feature
- **Fees**: Separated fees from general finance, now requires the `fees` feature

#### Already Mapped (verified):

- **Hostel Management**: `hostel` feature
- **Finance & Accounting**: `finance` feature
- **Library Management**: `library` feature
- **Events Management**: `events` feature
- **Short-term Courses**: `short_courses` feature

### 2. Existing Backend Protection (Verified)

The backend routes already have proper feature middleware in place:

```php
Route::middleware(['feature:hostel'])->group(function () { ... });
Route::middleware(['feature:finance'])->group(function () { ... });
Route::middleware(['feature:library'])->group(function () { ... });
Route::middleware(['feature:events'])->group(function () { ... });
Route::middleware(['feature:dms'])->group(function () { ... });
Route::middleware(['feature:exams'])->group(function () { ... });
// ... and so on for all features
```

### 3. Existing Frontend Guards (Verified)

Frontend already uses the correct guards:

- **Sidebar**: Uses `useHasPermissionAndFeature()` hook for all menu items
- **Routes**: Use `PermissionRoute` with `checkFeature=true` (default)
- **Components**: Use `PermissionGuard` with `checkFeature=true` (default)

## How It Works

### Access Check Flow:

1. **User attempts to access a feature**
2. **Frontend checks**:
   - Does user have the required permission? (`useHasPermission`)
   - Does organization's subscription include the feature? (`useHasFeature`)
   - **Returns true only if BOTH are true**
3. **Backend validates**:
   - `EnsureSubscriptionAccess` middleware checks subscription status
   - `EnsureFeatureAccess` middleware checks if feature is enabled
   - **Request proceeds only if all checks pass**

### Example Scenarios:

| Permission | Feature Enabled | Result |
|------------|----------------|--------|
| ✅ Yes     | ✅ Yes         | ✅ **Access Granted** |
| ✅ Yes     | ❌ No          | ❌ **Access Denied** (Feature not in plan) |
| ❌ No      | ✅ Yes         | ❌ **Access Denied** (No permission) |
| ❌ No      | ❌ No          | ❌ **Access Denied** (Neither) |

## Feature Keys Reference

| Feature Key | Description |
|-------------|-------------|
| `hostel` | Hostel management |
| `finance` | Finance & accounting (accounts, income, expenses, projects, donors) |
| `fees` | Fee structures, payments, exceptions |
| `multi_currency` | Multi-currency support and exchange rates |
| `library` | Library books, categories, loans |
| `events` | Events, guests, check-ins |
| `dms` | Document Management System |
| `short_courses` | Short-term courses and certificates |
| `exams` | Exams, marks, reports, roll numbers, question bank, exam papers |
| `graduation` | Graduation batches and certificate issuance |
| `id_cards` | ID card templates and export |
| `assets` | Assets, categories, assignments, maintenance |
| `leave_management` | Leave requests and approvals |
| `timetable` | Timetable generation and scheduling |
| `subjects` | Subject and class-subject management |

## Core Features (Always Available)

The following features are available in all subscription plans:

- **Students** management
- **Staff** management
- **Classes** management
- **Attendance** (basic)
- **Academic Years**
- **Buildings & Rooms**
- **Organizations**
- **Users & Profiles**
- **Permissions & Roles**
- **Schools/Branding**

## Testing the Fix

### To Verify Access Control:

1. **Check subscription features**:
   - Navigate to `/subscription` page
   - View which features are enabled in current plan

2. **Test sidebar visibility**:
   - Menu items should be hidden if feature is not enabled
   - Even if user has permission, menu item won't show without feature

3. **Test route protection**:
   - Try to directly access a URL for a disabled feature
   - Should see "Access Denied" or be redirected

4. **Test API protection**:
   - API calls to disabled features should return 402 error
   - Error message: "The '{feature}' feature is not available on your current plan"

## Migration Notes

- **No database changes required**
- **No breaking changes** - system was designed for this integration
- **Backward compatible** - existing permissions continue to work
- **Immediate effect** - changes take effect on next page load/refresh

## Files Modified

1. `frontend/src/hooks/usePermissions.tsx`
   - Updated `PERMISSION_TO_FEATURE_MAP` with comprehensive feature mappings
   - Added better documentation and organization

## Support

If you encounter issues:

1. Check subscription status at `/subscription`
2. Verify user has required permissions
3. Check browser console for feature access errors
4. Review backend logs for 402 errors with feature details
