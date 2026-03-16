import { Shield } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { PermissionsManagement } from '@/components/settings/PermissionsManagement';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrgAdminPermissionsPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('permissions.title') ?? 'Permissions'}
        description={t('permissions.subtitle') ?? 'Manage organization permissions and role access.'}
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('permissions.title') ?? 'Permissions' },
        ]}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <PermissionsManagement />
      </Suspense>
    </div>
  );
}
