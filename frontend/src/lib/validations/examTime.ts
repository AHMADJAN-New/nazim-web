import { z } from 'zod';

import { validationMessages } from './validationHelpers';

export const examTimeSlotSchema = z
  .object({
    examClassId: z
      .string()
      .min(1, validationMessages.fieldRequired('Class'))
      .uuid(validationMessages.invalidUuid()),
    classSubjectId: z
      .string()
      .min(1, validationMessages.fieldRequired('Subject'))
      .uuid(validationMessages.invalidUuid()),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, validationMessages.fieldRequired('Date')),
    startTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, validationMessages.fieldRequired('Start time')),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/, validationMessages.fieldRequired('End time')),
    roomId: z.string(),
    invigilatorId: z.string(),
    notes: z.string().max(1000).optional().or(z.literal('')),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type ExamTimeSlotFormValues = z.infer<typeof examTimeSlotSchema>;
