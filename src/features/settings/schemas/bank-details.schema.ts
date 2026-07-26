import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => (value.length === 0 ? undefined : value));

const ifscMessage = 'Enter a valid 11-character IFSC code, for example BARB0AHMEDA.';

export const bankDetailsSchema = z.object({
  bankName: z.string().trim().min(2, 'Bank name is required').max(191),
  accountName: z.string().trim().min(2, 'Account name is required').max(191),
  accountNumber: z
    .string()
    .trim()
    .min(3, 'Account number is required')
    .max(50)
    .regex(/^[A-Za-z0-9 -]+$/, 'Use only letters, numbers, spaces or hyphens'),
  accountType: optionalText(50),
  ifscCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 0 || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value), ifscMessage)
    .transform((value) => (value.length === 0 ? undefined : value)),
  branchName: optionalText(191),
  swiftCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value.length === 0 || /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value), 'Enter a valid SWIFT/BIC code')
    .transform((value) => (value.length === 0 ? undefined : value)),
  upiId: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value.length === 0 || /^[a-z0-9.\-_]{2,}@[a-z][a-z0-9.\-_]{2,}$/.test(value), 'Enter a valid UPI ID')
    .transform((value) => (value.length === 0 ? undefined : value)),
  isDefault: z.boolean(),
});

export type BankDetailsFormValues = z.input<typeof bankDetailsSchema>;
export type BankDetailsSubmitValues = z.output<typeof bankDetailsSchema>;
