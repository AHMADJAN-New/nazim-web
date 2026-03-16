import { School } from 'lucide-react';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { SchoolsManagement } from '@/components/settings/SchoolsManagement';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrgAdminSchoolsPage() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationAdmin.schools')}
        description={t('organizationAdmin.schoolsDesc')}
        icon={<School className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationAdmin.title'), href: '/org-admin' },
          { label: t('organizationAdmin.schools') },
        ]}
      />
      <Suspense fallback={<LoadingSpinner />}>
        <SchoolsManagement />
      </Suspense>
    </div>
  );
}
