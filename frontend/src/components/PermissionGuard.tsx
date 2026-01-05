import { Shield } from 'lucide-react';
import { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useHasPermissionAndFeature, useHasPermission } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
  /**
   * If true, checks both permission AND feature access (default: true)
   * If false, only checks permission (legacy behavior)
   */
  checkFeature?: boolean;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback,
  showError = true,
  checkFeature = true,
}: PermissionGuardProps) {
  const { t } = useLanguage();
  const { data: permissions, isLoading } = useUserPermissions();
  
  // CRITICAL: Always call both hooks (Rules of Hooks - hooks must be called unconditionally)
  // Then use the result based on checkFeature flag
  const hasPermissionAndFeature = useHasPermissionAndFeature(permission);
  const hasPermissionOnly = useHasPermission(permission);
  
  // Use combined check by default (permission + feature), fallback to permission-only if checkFeature is false
  const hasAccess = checkFeature ? hasPermissionAndFeature : hasPermissionOnly;

  // Show loading state while permissions are being fetched
  // hasAccess === undefined means we're loading and have no cached data
  // Also check if we're loading and don't have permissions yet
  const isInitialLoad = isLoading && permissions === undefined;
  
  if (hasAccess === undefined || isInitialLoad) {
    return <LoadingSpinner size="lg" text={t('guards.checkingPermissions')} />;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showError) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('guards.accessDenied')}</h3>
          <p>{t('events.noPermission')}</p>
          <p className="text-sm mt-2">{t('guards.requiredPermission')} <code className="bg-muted px-2 py-1 rounded">{permission}</code></p>
        </div>
      </CardContent>
    </Card>
  );
}

