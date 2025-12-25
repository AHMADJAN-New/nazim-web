import { ReactNode } from 'react';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/loading';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface AnyPermissionRouteProps {
  permissions: string[];
  children: ReactNode;
  showError?: boolean;
}

/**
 * Like PermissionRoute, but allows ANY of the provided permissions.
 * This prevents lazy-loaded route components from rendering before permissions are ready.
 */
export function AnyPermissionRoute({ permissions, children, showError = true }: AnyPermissionRouteProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: userPermissions, isLoading } = useUserPermissions();

  const hasProfile = profile?.role !== undefined && profile !== null;
  const queryCanRun = hasProfile && !isLoading;
  const hasPermissionsData = Array.isArray(userPermissions);
  const permissionsReady = hasProfile && queryCanRun && hasPermissionsData;

  if (!permissionsReady) {
    return <LoadingSpinner size="lg" text="Loading permissions..." />;
  }

  const hasAny = permissions.some((p) => userPermissions.includes(p));
  if (hasAny) {
    return <>{children}</>;
  }

  if (!showError) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center text-muted-foreground">
          <Shield className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('guards.accessDenied')}</h3>
          <p>{t('guards.noPermission')}</p>
          <p className="text-sm mt-2">
            {t('guards.requiredPermission')}{' '}
            <code className="bg-muted px-2 py-1 rounded">{permissions.join(' OR ')}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

