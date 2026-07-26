import { z } from 'zod';

export const sequenceResetRuleOptions = [
  { value: 'FINANCIAL_YEAR', label: 'Financial year' },
  { value: 'CALENDAR_YEAR', label: 'Calendar year' },
  { value: 'NEVER', label: 'Never reset' },
] as const;

export const taxModeOptions = [
  { value: 'CGST_SGST', label: 'CGST + SGST' },
  { value: 'IGST', label: 'IGST' },
  { value: 'NONE', label: 'No tax' },
] as const;

const term = z.string().trim().max(5000);

export const quotationSettingsSchema = z.object({
  quotationPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Quotation prefix is required')
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Use letters, numbers, hyphens or underscores'),
  financialYearFormat: z.literal('YYYY-YY'),
  nextSequenceNumber: z.coerce.number().int().min(1, 'Sequence number must be at least 1'),
  sequenceResetRule: z.enum(['FINANCIAL_YEAR', 'CALENDAR_YEAR', 'NEVER']),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
  defaultTaxMode: z.enum(['CGST_SGST', 'IGST', 'NONE']),
  defaultGstRate: z
    .string()
    .trim()
    .refine((value) => /^(?:100(?:\.00?)?|\d{1,2}(?:\.\d{1,2})?)$/.test(value), 'Use a GST rate from 0 to 100 with up to two decimals'),
  defaultDeliveryTerms: term,
  defaultDispatchTerms: term,
  defaultPaymentTerms: term,
  defaultFreightTerms: term,
  defaultWarrantyTerms: term,
  defaultRemarks: term,
  defaultTermsAndConditions: term,
  showBankDetails: z.boolean(),
  showAmountInWords: z.boolean(),
});

export type QuotationSettingsFormValues = z.input<typeof quotationSettingsSchema>;
export type QuotationSettingsSubmitValues = z.output<typeof quotationSettingsSchema>;

