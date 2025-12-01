import { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/usePermissions';
import { useUserPermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback,
  showError = true 
}: PermissionGuardProps) {
  const { data: permissions, isLoading } = useUserPermissions();
  const hasPermission = useHasPermission(permission);

  // Show loading state while permissions are being fetched
  // hasPermission === undefined means we're loading and have no cached data
  // Also check if we're loading and don't have permissions yet
  const isInitialLoad = isLoading && permissions === undefined;
  
  if (hasPermission === undefined || isInitialLoad) {
    return <LoadingSpinner size="lg" text="Checking permissions..." />;
  }

  if (hasPermission) {
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
          <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
          <p>You do not have permission to access this resource.</p>
          <p className="text-sm mt-2">Required permission: <code className="bg-muted px-2 py-1 rounded">{permission}</code></p>
        </div>
      </CardContent>
    </Card>
  );
}

