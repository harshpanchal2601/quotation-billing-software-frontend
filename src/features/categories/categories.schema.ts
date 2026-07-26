import { z } from 'zod';

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(191, 'Category name must not exceed 191 characters'),
  description: z
    .string()
    .trim()
    .max(5000, 'Description must not exceed 5000 characters')
    .optional(),
  isActive: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
