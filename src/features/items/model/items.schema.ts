import { z } from 'zod';

const decimalRegex = /^\d+(\.\d{1,2})?$/;
const hsnRegex = /^\d{4,8}$/;

export const itemSpecificationSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Label is required')
    .max(100, 'Label must not exceed 100 characters'),
  value: z
    .string()
    .trim()
    .min(1, 'Value is required')
    .max(1000, 'Value must not exceed 1000 characters'),
});

export const itemFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Item name must be at least 2 characters')
      .max(191, 'Item name must not exceed 191 characters'),
    categoryId: z.number().nullable().optional(),
    measurementUnitId: z
      .number({ invalid_type_error: 'Measurement unit is required' })
      .positive('Measurement unit is required'),
    shortDescription: z
      .string()
      .trim()
      .max(500, 'Short description must not exceed 500 characters')
      .optional()
      .or(z.literal('')),
    detailedDescription: z
      .string()
      .max(20000, 'Detailed description must not exceed 20,000 characters')
      .optional()
      .or(z.literal('')),
    defaultRate: z
      .union([z.string(), z.number()])
      .refine(
        (val) => {
          if (val === '' || val === null || val === undefined) return true;
          const str = String(val).trim();
          const num = Number(str);
          return Number.isFinite(num) && num >= 0 && decimalRegex.test(str);
        },
        { message: 'Default rate must be a non-negative number with up to 2 decimal places' },
      )
      .default('0.00'),
    hsnCode: z
      .string()
      .trim()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => {
          if (!val || val.length === 0) return true;
          return hsnRegex.test(val);
        },
        { message: 'HSN code must contain between 4 and 8 numeric digits' },
      ),
    gstRate: z
      .union([z.string(), z.number()])
      .refine(
        (val) => {
          if (val === '' || val === null || val === undefined) return true;
          const str = String(val).trim();
          const num = Number(str);
          return Number.isFinite(num) && num >= 0 && num <= 100 && decimalRegex.test(str);
        },
        { message: 'GST rate must be between 0 and 100 with up to 2 decimal places' },
      )
      .default('18.00'),
    isActive: z.boolean().default(true),
    specifications: z
      .array(itemSpecificationSchema)
      .max(50, 'Cannot exceed 50 specifications')
      .default([]),
  })
  .refine(
    (data) => {
      const labels = data.specifications.map((s) => s.label.trim().toLowerCase());
      const unique = new Set(labels);
      return unique.size === labels.length;
    },
    {
      message: 'Specification labels must be unique',
      path: ['specifications'],
    },
  );

export type ItemFormValues = z.infer<typeof itemFormSchema>;
