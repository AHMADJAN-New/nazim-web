import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { useOrgHrStaff } from '@/hooks/orgHr/useOrgHr';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrStaffPage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useOrgHrStaff(search);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t('organizationHr.staffMaster') || 'Organization HR / Staff Master'}</h1>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('organizationHr.searchStaff') || 'Search staff'}
      />
      {isLoading ? <div>{t('organizationHr.loading') || 'Loading...'}</div> : (
        <div className="rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">{t('organizationHr.employeeId') || 'Employee ID'}</th>
                <th className="p-2">{t('organizationHr.name') || 'Name'}</th>
                <th className="p-2">{t('organizationHr.status') || 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((staff) => (
                <tr key={staff.id} className="border-b">
                  <td className="p-2">{staff.employee_id}</td>
                  <td className="p-2">{staff.first_name} {staff.father_name}</td>
                  <td className="p-2">{staff.status}</td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-center text-muted-foreground" colSpan={3}>
                    {t('organizationHr.noStaffFound') || 'No staff found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
