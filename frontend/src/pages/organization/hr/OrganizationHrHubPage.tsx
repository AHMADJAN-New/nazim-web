import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrHubPage() {
  const { t } = useLanguage();

  const cards = [
    { title: t('organizationHr.staffMaster') || 'Staff Master', path: '/organization/hr/staff' },
    { title: t('organizationHr.assignments') || 'Assignments', path: '/organization/hr/assignments' },
    { title: t('organizationHr.payroll') || 'Payroll', path: '/organization/hr/payroll' },
    { title: t('organizationHr.reports') || 'Reports', path: '/organization/hr/reports' },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t('organizationHr.hubTitle') || 'Organization HR Hub'}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.path} to={card.path}>
            <Card>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
              </CardHeader>
              <CardContent>{t('organizationHr.openModule') || 'Open module'}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
