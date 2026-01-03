import { Shield } from 'lucide-react';
import { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useFeatures } from '@/hooks/useSubscription';

interface HostelPermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

/**
 * Permission guard for hostel routes that requires:
 * (hostel.read OR rooms.read) AND student_admissions.read
 * 
 * This matches the backend permission requirements in HostelController.
 */
export function HostelPermissionGuard({ 
  children, 
  fallback,
  showError = true 
}: HostelPermissionGuardProps) {
  const { t } = useLanguage();
  const { data: permissions, isLoading } = useUserPermissions();
  const { data: features, isLoading: featuresLoading, error: featuresError } = useFeatures();
  const hasHostelRead = useHasPermission('hostel.read');
  const hasRoomsRead = useHasPermission('rooms.read');
  const hasAdmissionsRead = useHasPermission('student_admissions.read');
  const hasHostelFeature = !!features?.find((feature) => feature.featureKey === 'hostel')?.isEnabled;

  // Show loading state while permissions are being fetched
  const isInitialLoad = isLoading && permissions === undefined;
  const hasFeatureData = Array.isArray(features) && features.length > 0;
  const isFeatureLoading = featuresLoading && !hasFeatureData;
  
  if (hasHostelRead === undefined || hasRoomsRead === undefined || hasAdmissionsRead === undefined || isInitialLoad || isFeatureLoading) {
    return <LoadingSpinner size="lg" text={t('guards.checkingPermissions')} />;
  }

  // Check: (hostel.read OR rooms.read) AND student_admissions.read
  const hasHostelOrRooms = hasHostelRead || hasRoomsRead;
  const hasAllRequired = !featuresError && hasHostelFeature && hasHostelOrRooms && hasAdmissionsRead;

  if (hasAllRequired) {
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
          <p>{t('guards.noPermission')}</p>
          <p className="text-sm mt-2">
            {t('guards.requiredPermission')}: <code className="bg-muted px-2 py-1 rounded">(hostel.read OR rooms.read) AND student_admissions.read</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

