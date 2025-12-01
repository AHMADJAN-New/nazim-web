import { z } from 'zod';

/**
 * Allowed MIME types for document uploads
 * Matches backend StoreStudentDocumentRequest validation (max 10MB, jpeg,jpg,png,gif,webp,pdf)
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * File validation schema
 */
export const fileSchema = z
  .instanceof(File, { message: 'File is required' })
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
  )
  .refine(
    (file) => ALLOWED_MIME_TYPES.includes(file.type),
    `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`
  );

/**
 * File upload validation helper
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  return { valid: true };
};

