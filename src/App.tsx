import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import ErrorBoundary from "@/components/ErrorBoundary";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PersistentLayout } from "@/components/layout/PersistentLayout";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// Lazy-loaded components with optimized loading
import { 
  Dashboard, 
  PendingApprovalPage, 
  ResetPasswordPage, 
  DashboardSkeleton, 
  PageSkeleton
} from "@/components/LazyComponents";

// Optimized QueryClient with better caching and performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <SidebarProvider>
            <ErrorBoundary>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/redirect" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
            <Route path="/pending-approval" element={<ProtectedRoute><PendingApprovalPage /></ProtectedRoute>} />
            
            {/* Protected routes with persistent layout */}
            <Route element={<ProtectedRoute><PersistentLayout /></ProtectedRoute>}>
              {/* Dashboard with optimized loading */}
              <Route path="/dashboard" element={
                <Suspense fallback={<DashboardSkeleton />}>
                  <Dashboard />
                </Suspense>
              } />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
          </SidebarProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
    {import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    )}
  </QueryClientProvider>
);

export default App;
