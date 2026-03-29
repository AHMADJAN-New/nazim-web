import { describe, expect, it } from 'vitest';

import { getPermissionsManagementCatalog } from './index';

describe('getPermissionsManagementCatalog', () => {
  it('returns English seeded role titles and descriptions', () => {
    const en = getPermissionsManagementCatalog('en');
    expect(en.roles.librarian?.title).toBe('Librarian');
    expect(en.roles.librarian?.description.toLowerCase()).toContain('lend');
    expect(en.roles.accountant?.title).toBe('Accountant');
  });

  it('localizes roles for Pashto and Dari', () => {
    const ps = getPermissionsManagementCatalog('ps');
    const fa = getPermissionsManagementCatalog('fa');
    const en = getPermissionsManagementCatalog('en');
    expect(ps.roles.teacher?.title).not.toBe(en.roles.teacher?.title);
    expect(fa.roles.teacher?.title).toBe('معلم');
  });

  it('includes canonical permission keys for all locales', () => {
    const sample = ['student_admissions.create', 'fees.payments.create', 'exams.roll_numbers.read'];
    for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
      const c = getPermissionsManagementCatalog(lang);
      for (const name of sample) {
        expect(c.permissions[name]?.actionLabel).toBeTruthy();
        expect(c.permissions[name]?.description).toBeTruthy();
      }
    }
  });

  it('provides feature section labels', () => {
    const ps = getPermissionsManagementCatalog('ps');
    expect(ps.featureSections.students).toBe('زده‌کوونکي');
    expect(ps.featureSections.library).toBe('کتابتون');
  });
});
