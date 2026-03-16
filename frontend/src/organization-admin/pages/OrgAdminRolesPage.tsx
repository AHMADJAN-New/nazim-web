import { Shield } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { RolesManagement } from '@/components/settings/RolesManagement';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrgAdminRolesPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('roles.title') ?? 'Roles'}
        description={t('roles.subtitle') ?? 'Manage organization roles.'}
        icon={<Shield className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('roles.title') ?? 'Roles' },
        ]}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <RolesManagement />
      </Suspense>
    </div>
  );
}
