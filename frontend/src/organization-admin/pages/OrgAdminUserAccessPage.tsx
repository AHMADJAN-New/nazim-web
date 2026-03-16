import { KeyRound } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { UserPermissionsManagement } from '@/components/settings/UserPermissionsManagement';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrgAdminUserAccessPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('userPermissions.title') ?? 'User Access'}
        description={t('userPermissions.subtitle') ?? 'Assign roles and direct permissions for organization users.'}
        icon={<KeyRound className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('userPermissions.title') ?? 'User Access' },
        ]}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <UserPermissionsManagement />
      </Suspense>
    </div>
  );
}
