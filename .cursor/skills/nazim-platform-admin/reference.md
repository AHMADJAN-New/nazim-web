# Platform Admin Reference

## Frontend Routes (existing)

- `/platform/login` - Platform admin login
- `/platform/dashboard` - Dashboard
- `/platform/plans` - Subscription plans
- `/platform/subscriptions` - Subscriptions
- `/platform/pending` - Pending actions
- `/platform/renewals/:renewalId` - Renewal review
- `/platform/discount-codes` - Discount codes
- `/platform/settings` - Platform settings
- `/platform/help-center` - Help center management
- `/platform/maintenance-history` - Maintenance history
- `/platform/license-fees` - License fees
- `/platform/maintenance-fees` - Maintenance fees
- `/platform/desktop-license-generation` - Desktop licenses
- `/platform/desktop-releases` - Desktop releases
- `/platform/contact-messages` - Contact messages
- `/platform/login-audit` - Login audit
- `/platform/website` - Website management
- `/platform/landing-offers` - Landing offers
- `/platform/permission-groups` - Permission groups
- `/platform/plan-requests` - Plan requests
- `/platform/organizations/:organizationId` - Organization subscription detail
- `/platform/organizations/:organizationId/revenue-history` - Revenue history
- `/platform/translations` - Translations
- `/platform/organization-revenue-history` - Organization revenue history
- `/platform/payment-review` - Payment review

## platformApi Pattern

```typescript
// List: handle array or { data: [] }
list: async (params?) => {
  const res = await apiClient.get<YourType[] | { data: YourType[] }>('/platform/your-resource', params);
  return Array.isArray(res) ? res : (res?.data ?? []);
},

// Get one: usually { data: T }
get: async (id: string) => {
  return apiClient.get<{ data: YourType }>(`/platform/your-resource/${id}`);
},

// Create/Update: return { data: T }
create: async (data: InsertType) => apiClient.post<{ data: YourType }>('/platform/your-resource', data),
update: async (id: string, data: UpdateType) => apiClient.put<{ data: YourType }>(`/platform/your-resource/${id}`, data),
delete: async (id: string) => apiClient.delete(`/platform/your-resource/${id}`),
```

## Backend Controller

- Use `platform.admin` middleware (already applied via route group).
- Check permission: user must have `subscription.admin` (global).
- Clear team context if using Spatie: `setPermissionsTeamId(null)` before permission check.
- Do NOT filter by organization_id; platform admins see all data.
