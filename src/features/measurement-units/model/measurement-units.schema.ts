import { z } from 'zod';

export const measurementUnitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Unit name must be at least 2 characters')
    .max(191, 'Unit name must not exceed 191 characters'),
  symbol: z
    .string()
    .trim()
    .min(1, 'Symbol is required')
    .max(50, 'Symbol must not exceed 50 characters'),
  allowDecimal: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type MeasurementUnitFormValues = z.infer<typeof measurementUnitFormSchema>;
