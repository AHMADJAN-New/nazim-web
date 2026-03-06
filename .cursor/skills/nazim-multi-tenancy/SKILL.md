---
name: nazim-multi-tenancy
description: Enforces organization and school isolation for the Nazim multi-tenant SaaS. Use when adding tables, hooks, API calls, controllers, or storage paths. Covers organization_id, school_id, query keys, getCurrentSchoolId(), and RLS.
---

# Nazim Multi-Tenancy

The Nazim app is a **multi-tenant SaaS**. Every tenant table, hook, API call, and controller must enforce **organization** and **school** isolation.

## Core Rules

- Every tenant table: `organization_id` + `school_id` (for school-scoped)
- Frontend hooks: `queryKey` includes `profile?.organization_id` AND `profile?.default_school_id`
- API calls: pass both `organization_id` and `school_id`
- Backend: use `getCurrentSchoolId($request)` — **never** trust client `school_id`
- Storage paths: include `organization_id` (and `school_id` when applicable)

## Frontend Patterns

### Query Key (REQUIRED)
```typescript
queryKey: ['resource', profile?.organization_id, profile?.default_school_id ?? null, ...otherKeys]
```

### API Call (REQUIRED)
```typescript
await apiClient.resource.list({
  organization_id: profile.organization_id,
  school_id: profile.default_school_id,
});
```

### Hook enabled
```typescript
enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id
```

### Mutations
- Create: use `profile.organization_id` and `profile.default_school_id` (ignore client values)
- Update: validate `organization_id` matches; reject `organization_id` changes
- Delete: backend validates; frontend invalidates + refetches

## Backend Patterns

### Controller
```php
$profile = DB::table('profiles')->where('id', $user->id)->first();
if (!$profile || !$profile->organization_id) {
    return response()->json(['error' => 'User must be assigned to an organization'], 403);
}
$currentSchoolId = $this->getCurrentSchoolId($request);  // From middleware, NOT client

$query = YourModel::whereNull('deleted_at')
    ->where('organization_id', $profile->organization_id)
    ->where('school_id', $currentSchoolId);
```

### getCurrentSchoolId()
- Provided by base Controller
- Reads `current_school_id` from request (injected by `school.context` middleware)
- **Never** use client-provided `school_id` for filtering

## Database

- Tenant tables: `organization_id UUID NOT NULL`, `school_id UUID` (school-scoped)
- Index on `organization_id` and `school_id`
- RLS enabled; policies enforce `organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())`

## Checklist

- [ ] Table has `organization_id` (and `school_id` if school-scoped)
- [ ] Query key includes `default_school_id`
- [ ] API passes `school_id`
- [ ] Controller uses `getCurrentSchoolId()` not client `school_id`
- [ ] Mutations validate organization scope

## Additional Resources

- Full RLS policy pattern and security checklist: [reference.md](reference.md)
