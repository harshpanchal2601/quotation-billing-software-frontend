import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => (value.length === 0 ? undefined : value));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, 'Enter a valid email address')
  .transform((value) => (value.length === 0 ? undefined : value));

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^[+\d][+\d\s-]{5,29}$/.test(value), 'Enter a valid phone number')
  .transform((value) => (value.length === 0 ? undefined : value));

const optionalUppercase = (regex: RegExp, message: string, max = 30) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .max(max)
    .refine((value) => value.length === 0 || regex.test(value), message)
    .transform((value) => (value.length === 0 ? undefined : value));

export const businessProfileSchema = z.object({
  legalName: z.string().trim().min(2, 'Legal name is required').max(191),
  displayName: z.string().trim().min(2, 'Display name is required').max(191),
  gstin: optionalUppercase(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN', 20),
  pan: optionalUppercase(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN', 20),
  cin: z.string().trim().toUpperCase().max(30).transform((value) => (value.length === 0 ? undefined : value)),
  addressLine1: z.string().trim().min(1, 'Address line 1 is required').max(191),
  addressLine2: optionalText(191),
  city: z.string().trim().min(1, 'City is required').max(191),
  state: z.string().trim().min(1, 'State is required').max(191),
  postalCode: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(1, 'Country is required').max(191),
  primaryPhone: optionalPhone,
  secondaryPhone: optionalPhone,
  primaryEmail: optionalEmail,
  secondaryEmail: optionalEmail,
  website: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || /^https?:\/\//.test(value), 'Website must use http or https')
    .refine((value) => value.length === 0 || z.string().url().safeParse(value).success, 'Enter a valid website URL')
    .transform((value) => (value.length === 0 ? undefined : value)),
  primaryColour: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a six-digit hex colour').transform((value) => value.toUpperCase()),
  secondaryColour: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a six-digit hex colour').transform((value) => value.toUpperCase()),
  defaultCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code'),
});

export type BusinessProfileFormValues = z.input<typeof businessProfileSchema>;
export type BusinessProfileSubmitValues = z.output<typeof businessProfileSchema>;
