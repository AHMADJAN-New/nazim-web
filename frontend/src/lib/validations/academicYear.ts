import * as z from 'zod';

export const createAcademicYearSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(1, t('forms.required')).max(20, t('academic.academicYears.nameMaxLength')),
      start_date: z.string().min(1, t('academic.academicYears.startDateRequired')),
      end_date: z.string().min(1, t('academic.academicYears.endDateRequired')),
      description: z.string().max(500).optional().nullable(),
      status: z.enum(['active', 'archived', 'planned']).default('active'),
      is_current: z.boolean().default(false),
    })
    .refine(
      (data) => {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.end_date);
        return endDate > startDate;
      },
      {
        message: t('academic.academicYears.dateRangeError'),
        path: ['end_date'],
      }
    );

export type AcademicYearFormData = z.infer<ReturnType<typeof createAcademicYearSchema>>;
