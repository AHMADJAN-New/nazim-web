# Router Configuration Guide - Financial Pages

## Quick Start

All 10 financial CRUD pages are ready. Just add them to your router!

## 📝 Step 1: Import Pages

Add this import to your router configuration file (e.g., `App.tsx`, `routes.tsx`, or wherever you define routes):

```typescript
import {
  CurrenciesPage,
  FiscalYearsPage,
  CostCentersPage,
  IncomeCategoriesPage,
  ExpenseCategoriesPage,
  PaymentMethodsPage,
  AssetCategoriesPage,
  FundTypesPage,
  DebtCategoriesPage,
  FinancialAccountsPage,
} from '@/pages/settings/finance';
```

## 🛣️ Step 2: Add Routes

### Option A: React Router v6 (Standard)

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistentLayout />, // Your layout component
    children: [
      // ... other routes (dashboard, students, etc.)
      
      // Financial Settings Routes
      {
        path: '/settings/finance/currencies',
        element: <CurrenciesPage />,
      },
      {
        path: '/settings/finance/fiscal-years',
        element: <FiscalYearsPage />,
      },
      {
        path: '/settings/finance/cost-centers',
        element: <CostCentersPage />,
      },
      {
        path: '/settings/finance/income-categories',
        element: <IncomeCategoriesPage />,
      },
      {
        path: '/settings/finance/expense-categories',
        element: <ExpenseCategoriesPage />,
      },
      {
        path: '/settings/finance/payment-methods',
        element: <PaymentMethodsPage />,
      },
      {
        path: '/settings/finance/asset-categories',
        element: <AssetCategoriesPage />,
      },
      {
        path: '/settings/finance/fund-types',
        element: <FundTypesPage />,
      },
      {
        path: '/settings/finance/debt-categories',
        element: <DebtCategoriesPage />,
      },
      {
        path: '/settings/finance/accounts',
        element: <FinancialAccountsPage />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

### Option B: React Router v6 (Nested Routes)

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistentLayout />,
    children: [
      // ... other routes
      
      // Nested financial routes
      {
        path: 'settings/finance',
        children: [
          {
            path: 'currencies',
            element: <CurrenciesPage />,
          },
          {
            path: 'fiscal-years',
            element: <FiscalYearsPage />,
          },
          {
            path: 'cost-centers',
            element: <CostCentersPage />,
          },
          {
            path: 'income-categories',
            element: <IncomeCategoriesPage />,
          },
          {
            path: 'expense-categories',
            element: <ExpenseCategoriesPage />,
          },
          {
            path: 'payment-methods',
            element: <PaymentMethodsPage />,
          },
          {
            path: 'asset-categories',
            element: <AssetCategoriesPage />,
          },
          {
            path: 'fund-types',
            element: <FundTypesPage />,
          },
          {
            path: 'debt-categories',
            element: <DebtCategoriesPage />,
          },
          {
            path: 'accounts',
            element: <FinancialAccountsPage />,
          },
        ],
      },
    ],
  },
]);
```

### Option C: With Lazy Loading (Recommended for Performance)

```typescript
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/loading';

// Lazy load all financial pages
const CurrenciesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.CurrenciesPage }))
);
const FiscalYearsPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.FiscalYearsPage }))
);
const CostCentersPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.CostCentersPage }))
);
const IncomeCategoriesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.IncomeCategoriesPage }))
);
const ExpenseCategoriesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.ExpenseCategoriesPage }))
);
const PaymentMethodsPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.PaymentMethodsPage }))
);
const AssetCategoriesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.AssetCategoriesPage }))
);
const FundTypesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.FundTypesPage }))
);
const DebtCategoriesPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.DebtCategoriesPage }))
);
const FinancialAccountsPage = lazy(() => 
  import('@/pages/settings/finance').then(m => ({ default: m.FinancialAccountsPage }))
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistentLayout />,
    children: [
      // ... other routes
      
      {
        path: 'settings/finance/currencies',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <CurrenciesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/fiscal-years',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <FiscalYearsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/cost-centers',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <CostCentersPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/income-categories',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <IncomeCategoriesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/expense-categories',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <ExpenseCategoriesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/payment-methods',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <PaymentMethodsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/asset-categories',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <AssetCategoriesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/fund-types',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <FundTypesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/debt-categories',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <DebtCategoriesPage />
          </Suspense>
        ),
      },
      {
        path: 'settings/finance/accounts',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <FinancialAccountsPage />
          </Suspense>
        ),
      },
    ],
  },
]);
```

### Option D: Routes Object Pattern (Cleaner)

```typescript
// Create a separate routes file: src/routes/financeRoutes.tsx
import {
  CurrenciesPage,
  FiscalYearsPage,
  CostCentersPage,
  IncomeCategoriesPage,
  ExpenseCategoriesPage,
  PaymentMethodsPage,
  AssetCategoriesPage,
  FundTypesPage,
  DebtCategoriesPage,
  FinancialAccountsPage,
} from '@/pages/settings/finance';

export const financeRoutes = {
  path: 'settings/finance',
  children: [
    { path: 'currencies', element: <CurrenciesPage /> },
    { path: 'fiscal-years', element: <FiscalYearsPage /> },
    { path: 'cost-centers', element: <CostCentersPage /> },
    { path: 'income-categories', element: <IncomeCategoriesPage /> },
    { path: 'expense-categories', element: <ExpenseCategoriesPage /> },
    { path: 'payment-methods', element: <PaymentMethodsPage /> },
    { path: 'asset-categories', element: <AssetCategoriesPage /> },
    { path: 'fund-types', element: <FundTypesPage /> },
    { path: 'debt-categories', element: <DebtCategoriesPage /> },
    { path: 'accounts', element: <FinancialAccountsPage /> },
  ],
};

// Then in your main router file:
import { financeRoutes } from './routes/financeRoutes';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PersistentLayout />,
    children: [
      // ... other routes
      financeRoutes, // Add financial routes
    ],
  },
]);
```

## 🔗 Sidebar Navigation

The sidebar already has links configured in `SmartSidebar.tsx`:

- `/settings/finance/currencies`
- `/settings/finance/fiscal-years`
- `/settings/finance/cost-centers`
- `/settings/finance/income-categories`
- `/settings/finance/expense-categories`
- `/settings/finance/payment-methods`
- `/settings/finance/asset-categories`
- `/settings/finance/fund-types`
- `/settings/finance/debt-categories`
- `/settings/finance/accounts`

**These URLs match the routes you need to configure above!**

## ✅ Verification

After adding routes, verify:

1. **Navigate from sidebar:**
   - Click "Financial Settings" → "Currencies" in sidebar
   - Should load `CurrenciesPage` at `/settings/finance/currencies`

2. **Direct URL access:**
   - Type `/settings/finance/currencies` in browser
   - Should load the page directly

3. **All 10 pages work:**
   - Test each link from the sidebar
   - Verify page loads without errors
   - Check that data is displayed

## 🚨 Common Issues

### Issue 1: 404 Not Found
**Problem:** Navigating to `/settings/finance/currencies` shows 404

**Solution:** Make sure:
- Routes are added inside your layout component's `children` array
- Path matches exactly (e.g., `settings/finance/currencies` not `/settings/finance/currencies` in nested routes)
- Router provider is wrapping your app

### Issue 2: Blank Page
**Problem:** Page navigation works but shows blank screen

**Solution:** Check:
- Import path is correct: `@/pages/settings/finance`
- Component name is correct (PascalCase)
- No console errors (open DevTools)
- Page component is exported in `/src/pages/settings/finance/index.ts`

### Issue 3: Permissions Not Working
**Problem:** Buttons not showing even with permissions

**Solution:** Verify:
- Permissions are in database: `SELECT * FROM permissions WHERE name LIKE 'finance.%'`
- Permissions assigned to role: `SELECT * FROM role_permissions WHERE permission_id IN (...)`
- `useHasPermission` hook is working
- User has the correct role

## 🎯 Next Steps

1. **Copy one of the router configurations above**
2. **Paste into your router file** (App.tsx or routes.tsx)
3. **Adjust import paths if needed** (`@/` or relative paths)
4. **Test all 10 pages** by clicking sidebar links
5. **Verify CRUD operations work** (create, edit, delete)

## 📚 Additional Resources

- [React Router Documentation](https://reactrouter.com/en/main)
- [Code Splitting Guide](https://react.dev/reference/react/lazy)
- Existing pages in your app for reference patterns

---

**That's it! Your financial management system is ready to go!** 🚀

Just add the routes and you can start managing:
- Currencies
- Fiscal Years
- Cost Centers
- Income & Expense Categories
- Payment Methods
- Assets
- Funds
- Debts
- Chart of Accounts

All with full CRUD functionality, permissions, and multi-language support! 🎉
