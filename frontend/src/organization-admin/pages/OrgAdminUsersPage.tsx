import { Users } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { UserManagement } from '@/components/admin/UserManagement';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrgAdminUsersPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationAdmin.users')}
        description={t('organizationAdmin.usersDesc')}
        icon={<Users className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('organizationAdmin.users') },
        ]}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <UserManagement />
      </Suspense>
    </div>
  );
}
