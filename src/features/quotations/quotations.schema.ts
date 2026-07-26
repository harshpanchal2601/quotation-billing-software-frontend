import { z } from 'zod';

const decimalNumberInputSchema = z
  .union([z.number(), z.string()])
  .refine(
    (val) => {
      if (val === '' || val === null || val === undefined) return true;
      const num = Number(val);
      return Number.isFinite(num);
    },
    { message: 'Must be a valid numeric value' },
  );

export const quotationItemFormSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  lineNumber: z.number().int().positive().optional(),
  itemName: z.string().trim().max(191).optional(),
  description: z.string().max(20000).optional().nullable(),
  measurementUnit: z.string().trim().max(50).optional(),
  quantity: decimalNumberInputSchema
    .refine((val) => Number(val) > 0, { message: 'Quantity must be greater than zero' }),
  unitRate: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0, { message: 'Unit rate cannot be negative' }),
  discountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  discountValue: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0, { message: 'Discount cannot be negative' }),
  gstRate: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0 && Number(val) <= 100, {
      message: 'GST rate must be between 0 and 100',
    }),
  sortOrder: z.number().int().min(0).default(0),
});

export const quotationFormSchema = z.object({
  companyId: z.number({ required_error: 'Please select a company' }).int().positive('Company is required'),
  companyContactId: z.number().int().positive().optional().nullable(),
  billingAddressId: z.number().int().positive().optional().nullable(),
  shippingAddressId: z.number().int().positive().optional().nullable(),
  quotationDate: z.string().min(1, 'Quotation date is required'),
  validUntil: z.string().optional().nullable(),
  customerReference: z.string().trim().max(191).optional().nullable(),
  internalReference: z.string().trim().max(191).optional().nullable(),
  currency: z.string().trim().length(3).toUpperCase().default('INR'),
  taxMode: z.enum(['CGST_SGST', 'IGST', 'NONE']).default('CGST_SGST'),
  quotationDiscountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  quotationDiscountValue: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0, { message: 'Discount value cannot be negative' }),
  freightAmount: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0, { message: 'Freight amount cannot be negative' }),
  otherCharges: decimalNumberInputSchema
    .refine((val) => Number(val) >= 0, { message: 'Other charges cannot be negative' }),
  bankDetailId: z.number().int().positive().optional().nullable(),
  deliveryTerms: z.string().optional().nullable(),
  dispatchTerms: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  taxTerms: z.string().optional().nullable(),
  freightTerms: z.string().optional().nullable(),
  warrantyTerms: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  termsAndConditions: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  items: z
    .array(quotationItemFormSchema)
    .min(1, 'At least 1 quotation line item is required')
    .max(100, 'Quotation cannot exceed 100 items'),
});

export type QuotationFormSubmitValues = z.infer<typeof quotationFormSchema>;
export type QuotationItemFormSubmitValues = z.infer<typeof quotationItemFormSchema>;
