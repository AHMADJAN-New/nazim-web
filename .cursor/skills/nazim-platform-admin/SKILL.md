---
name: nazim-platform-admin
description: Enforces patterns for creating and maintaining platform admin pages in Nazim. Use when adding new platform management pages, routes, or API endpoints. Covers 5-step checklist, platformApi, usePlatformAdminPermissions, no organization_id.
---

# Nazim Platform Admin

The Platform Admin app is separate from the main Nazim app. Platform admins manage the entire platform (all organizations). Use this skill when creating new platform management pages or API endpoints.

## Core Rules

- **Permission:** `subscription.admin` (global, organization_id = NULL)
- **No organization_id:** Platform admins see all data; do NOT filter by organization
- **API client:** Use `platformApi` from `@/platform/lib/platformApi` (not `apiClient`)
- **Permission hook:** Use `usePlatformAdminPermissions()` (not `useHasPermission()`)

## 5-Step Checklist for New Platform Pages

### Step 1: Create Component

Location: `frontend/src/platform/pages/admin/YourManagementPage.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';
import { RefreshCw } from 'lucide-react';

export default function YourManagementPage() {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['platform-your-resource'],
    enabled: !permissionsLoading && hasAdminPermission,
    queryFn: async () => {
      const response = await platformApi.yourResource.list();
      return Array.isArray(response) ? response : (response?.data || []);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  return <div className="space-y-6 p-6">{/* content */}</div>;
}
```

### Step 2: Add to LazyComponents.tsx

In `frontend/src/components/LazyComponents.tsx`:

```typescript
export const YourManagementPage = lazy(() =>
  import('@/platform/pages/admin/YourManagementPage').then(module => ({ default: module.default }))
);
```

Place in "Subscription admin pages" section.

### Step 3: Add Route

**Where routes live:** Platform routes are defined in **root** `frontend/src/App.tsx` under `<Route path="/platform">`, using components from LazyComponents (with Suspense). The file `frontend/src/platform/App.tsx` is an alternative router (PlatformAdminApp); follow the same pattern as existing platform pages.

In `frontend/src/App.tsx` (under the `/platform` route block):

```typescript
// Ensure YourManagementPage is in LazyComponents (Step 2), then:
<Route path="your-resource" element={
  <Suspense fallback={<PageSkeleton />}>
    <YourManagementPage />
  </Suspense>
} />
```

Use kebab-case for path. Place specific routes before wildcards.

### Step 4: Add platformApi Endpoints

In `frontend/src/platform/lib/platformApi.ts`:

```typescript
yourResource: {
  list: async (params?) => apiClient.get('/platform/your-resource', params),
  get: async (id: string) => apiClient.get(`/platform/your-resource/${id}`),
  create: async (data) => apiClient.post('/platform/your-resource', data),
  update: async (id: string, data) => apiClient.put(`/platform/your-resource/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/platform/your-resource/${id}`),
},
```

All endpoints must use `/platform/*` prefix. Handle both array and `{ data: [] }` responses.

### Step 5: Add Backend Routes

In `backend/routes/api.php`:

```php
Route::middleware(['auth:sanctum', 'platform.admin'])->prefix('platform')->group(function () {
    Route::get('/your-resource', [YourResourceController::class, 'index']);
    Route::get('/your-resource/{id}', [YourResourceController::class, 'show']);
    Route::post('/your-resource', [YourResourceController::class, 'store']);
    Route::put('/your-resource/{id}', [YourResourceController::class, 'update']);
    Route::delete('/your-resource/{id}', [YourResourceController::class, 'destroy']);
});
```

Backend controller must use `platform.admin` middleware and check `subscription.admin`; do not filter by organization_id.

## Checklist

- [ ] Component in `platform/pages/admin/`
- [ ] Uses `usePlatformAdminPermissions()`, not `useHasPermission()`
- [ ] Queries have `enabled: !permissionsLoading && hasAdminPermission`
- [ ] Redirect to `/platform/dashboard` if no permission
- [ ] In LazyComponents.tsx with lazy()
- [ ] Route in platform/App.tsx (kebab-case)
- [ ] Endpoints in platformApi with `/platform/*`
- [ ] Backend routes with `platform.admin` middleware
- [ ] No organization_id in queries or API

## Common Mistakes

- Using `apiClient` instead of `platformApi`
- Forgetting LazyComponents or route (page won't render)
- Filtering by organization_id
- Using `useHasPermission()` (main-app hook)

## Additional Resources

- Full component template and backend pattern: [reference.md](reference.md)
