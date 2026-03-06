---
name: nazim-permissions
description: Spatie permission patterns for Nazim main app. Use when adding permissions, menu visibility, or backend permission checks. Covers permission name format, useHasPermission, useUserPermissions, no role fallbacks.
---

# Nazim Permissions

The app uses Spatie Laravel Permission with organization scoping. Use **permission checks only** — not `profiles.role` or role-based fallbacks.

## Permission Name Format

- **Pattern:** `{resource}.{action}` — no prefixes
- **Correct:** `classes.read`, `subjects.create`, `timetables.read`, `schedule_slots.update`, `exams.read`
- **Wrong:** `academic.classes.read`, `academic.subjects.create`
- **Resource:** Matches resource name (e.g. `resource='classes'` for `name='classes.read'`)

## Frontend

### useUserPermissions

- Query permissions via Laravel API; backend returns roles + direct permissions
- **Enabled:** `!!profile?.organization_id && !orgsLoading` — use organization_id, NOT role
- Query key: `['user-permissions', profile?.organization_id, profile?.default_school_id ?? null, profile?.id, orgIds.join(',')]`
- `profiles.role` is deprecated; roles come from Spatie `model_has_roles`
- Both hooks are in `@/hooks/usePermissions` (useUserPermissions, useHasPermission)

### useHasPermission

Use for menu and feature visibility:

```typescript
const hasBuildingsPermission = useHasPermission('buildings.read');
// Only show if user has permission
...(hasBuildingsPermission ? [{ title: "Buildings Management", url: "/settings/buildings", icon: Building2 }] : []),
```

### Navigation Rules

1. **Permission-only:** Use `useHasPermission('resource.action')` for all visibility
2. **No role fallbacks:** Remove `isSuperAdmin || role === 'admin'` checks
3. **Hide empty menus:** Hide parent if no children are visible
4. **Show parent if any child visible:** Show menu if at least one child has permission

## Backend

- Check with `$user->hasPermissionTo('resource.action')`; organization context is set by `EnsureOrganizationAccess` middleware (`setPermissionsTeamId`).
- Create global permissions with `organization_id = NULL`; organization-specific with `organization_id = UUID`.
- Assign to roles via `role_has_permissions`; per-user overrides via `model_has_permissions` (Spatie checks direct first, then role).

## Checklist

- [ ] Permission names use `resource.action` (no prefix)
- [ ] Menu visibility uses `useHasPermission()`, not role
- [ ] useUserPermissions enabled by `organization_id`, not role
- [ ] Backend uses `hasPermissionTo('resource.action')`

## Additional Resources

- Permission assignment SQL and common permission names: [reference.md](reference.md)
