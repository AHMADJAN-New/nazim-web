import { z } from 'zod';

import { requiredStringLength, optionalStringLength } from './common';
import { fileSchema } from './fileUpload';

/**
 * Document upload validation schema
 * Matches backend StoreStudentDocumentRequest validation rules
 */
export const documentUploadSchema = z.object({
  file: fileSchema,
  documentType: requiredStringLength(100, 'Document type'),
  description: optionalStringLength(500, 'Description'),
});

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

