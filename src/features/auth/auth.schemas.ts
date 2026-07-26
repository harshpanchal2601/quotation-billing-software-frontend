import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required').max(191),
  password: z.string().min(1, 'Password is required').max(72),
});

export const passwordPolicySchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(72, 'Use at most 72 characters')
  .refine((value) => value === value.trim(), 'Do not use leading or trailing spaces')
  .refine((value) => /[A-Z]/.test(value), 'Include an uppercase letter')
  .refine((value) => /[a-z]/.test(value), 'Include a lowercase letter')
  .refine((value) => /\d/.test(value), 'Include a number')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'Include a special character');

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(72),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
