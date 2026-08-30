import type { AdmissionStatus } from '@/types/domain/studentAdmission';

type TranslateFn = (key: string) => string;

export function getAdmissionEnrollmentStatusLabel(
  status: AdmissionStatus,
  t: TranslateFn
): string {
  switch (status) {
    case 'pending':
      return t('admissions.pending');
    case 'admitted':
      return t('admissions.admitted');
    case 'active':
      return t('admissions.active');
    case 'inactive':
      return t('admissions.inactive');
    case 'suspended':
      return t('students.suspended');
    case 'withdrawn':
      return t('admissions.withdrawn');
    case 'graduated':
      return t('students.graduated');
    default:
      return status;
  }
}
