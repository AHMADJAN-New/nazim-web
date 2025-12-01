import { z } from 'zod';
import { fileSchema } from './fileUpload';
import { requiredStringLength, optionalStringLength } from './common';

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

