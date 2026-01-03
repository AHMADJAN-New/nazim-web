import { z } from 'zod';

import { validationMessages } from './validationHelpers';

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, validationMessages.currentPasswordRequired()),
    new_password: z
      .string()
      .min(8, validationMessages.passwordMinLength())
      .regex(/[A-Z]/, validationMessages.passwordUppercase())
      .regex(/[a-z]/, validationMessages.passwordLowercase())
      .regex(/\d/, validationMessages.passwordNumber())
      .regex(/[!@#$%^&*(),.?":{}|<>]/, validationMessages.passwordSpecial()),
    new_password_confirmation: z.string().min(1, validationMessages.passwordConfirmationRequired()),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: validationMessages.passwordsDoNotMatch(),
    path: ['new_password_confirmation'],
  });

export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

