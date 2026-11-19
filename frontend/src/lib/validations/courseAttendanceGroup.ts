import { z } from 'zod';

import { optionalStringLength, requiredStringLength } from './common';

export function createCourseAttendanceGroupSchema(labels: {
  name: string;
  description: string;
  studentsRequired: string;
}) {
  return z.object({
    name: requiredStringLength(100, labels.name),
    description: optionalStringLength(1000, labels.description),
    student_ids: z.array(z.string().uuid()).min(1, labels.studentsRequired),
  });
}

export type CourseAttendanceGroupFormData = z.infer<ReturnType<typeof createCourseAttendanceGroupSchema>>;
