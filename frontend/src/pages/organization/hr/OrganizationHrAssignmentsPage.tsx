import { useOrgHrAssignments } from '@/hooks/orgHr/useOrgHr';
import { useLanguage } from '@/hooks/useLanguage';

export default function OrganizationHrAssignmentsPage() {
  const { t } = useLanguage();
  const { data, isLoading } = useOrgHrAssignments();

  return (
    <div className="space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">{t('organizationHr.assignmentsTitle') || 'Organization HR / Assignments'}</h1>
      {isLoading ? <div>{t('organizationHr.loading') || 'Loading...'}</div> : (
        <div className="rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">{t('organizationHr.staffId') || 'Staff ID'}</th>
                <th className="p-2">{t('organizationHr.schoolId') || 'School ID'}</th>
                <th className="p-2">{t('organizationHr.allocation') || 'Allocation %'}</th>
                <th className="p-2">{t('organizationHr.status') || 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((assignment) => (
                <tr key={assignment.id} className="border-b">
                  <td className="p-2">{assignment.staff_id}</td>
                  <td className="p-2">{assignment.school_id}</td>
                  <td className="p-2">{assignment.allocation_percent}%</td>
                  <td className="p-2">{assignment.status}</td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-center text-muted-foreground" colSpan={4}>
                    {t('organizationHr.noAssignmentsFound') || 'No assignments found'}
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
