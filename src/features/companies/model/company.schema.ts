import { z } from 'zod';

import { addressSchema, toAddressSubmitValues, type AddressSubmitValues } from './address.schema';
import { contactSchema, toContactSubmitValues, type ContactSubmitValues } from './contact.schema';

const optionalText = (max: number) => z.string().trim().max(max);

const emptyToUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => value.length === 0 || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value), 'Enter a valid GSTIN');

const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => value.length === 0 || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value), 'Enter a valid PAN');

const websiteSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || (z.string().url().safeParse(value).success && /^https?:\/\//.test(value)), 'Use an HTTP or HTTPS URL');

export const companyBaseSchema = z.object({
  name: z.string().trim().min(2, 'Company name is required').max(191),
  legalName: optionalText(191),
  website: websiteSchema,
  isActive: z.boolean(),
  gstin: gstinSchema,
  pan: panSchema,
  notes: optionalText(5000),
});

const initialContactSchema = contactSchema.partial({ name: true }).extend({
  name: z.string().trim().max(191),
});

const initialAddressSchema = addressSchema.partial({ addressLine1: true }).extend({
  addressLine1: z.string().trim().max(191),
});

export const companyCreateFormSchema = companyBaseSchema
  .extend({
    contact: initialContactSchema,
    billingAddress: initialAddressSchema,
    useBillingAsShipping: z.boolean(),
    shippingAddress: initialAddressSchema,
  })
  .superRefine((value, ctx) => {
    const contactHasData = Object.entries(value.contact).some(([key, item]) => key !== 'isPrimary' && typeof item === 'string' && item.trim().length > 0);
    if (contactHasData && value.contact.name.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['contact', 'name'], message: 'Contact name is required when contact details are entered' });
    }
    if (value.billingAddress.addressLine1.trim().length > 0 && value.billingAddress.addressLine1.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['billingAddress', 'addressLine1'], message: 'Address line 1 is required' });
    }
    if (!value.useBillingAsShipping && value.shippingAddress.addressLine1.trim().length > 0 && value.shippingAddress.addressLine1.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['shippingAddress', 'addressLine1'], message: 'Address line 1 is required' });
    }
  });

export const companyUpdateSchema = companyBaseSchema;

export type CompanyCreateFormValues = z.infer<typeof companyCreateFormSchema>;
export type CompanyUpdateFormValues = z.infer<typeof companyUpdateSchema>;

export type CompanyUpdateSubmitValues = {
  name: string;
  legalName?: string;
  website?: string;
  isActive: boolean;
  gstin?: string;
  pan?: string;
  notes?: string;
};

export type CompanyCreateSubmitValues = CompanyUpdateSubmitValues & {
  contacts?: ContactSubmitValues[];
  addresses?: AddressSubmitValues[];
};

export function toCompanyUpdateSubmitValues(values: CompanyUpdateFormValues): CompanyUpdateSubmitValues {
  const legalName = emptyToUndefined(values.legalName);
  const website = emptyToUndefined(values.website);
  const gstin = emptyToUndefined(values.gstin)?.toUpperCase();
  const pan = emptyToUndefined(values.pan)?.toUpperCase();
  const notes = emptyToUndefined(values.notes);

  return {
    name: values.name.trim(),
    ...(legalName ? { legalName } : {}),
    ...(website ? { website } : {}),
    isActive: values.isActive,
    ...(gstin ? { gstin } : {}),
    ...(pan ? { pan } : {}),
    ...(notes ? { notes } : {}),
  };
}

export function toCompanyCreateSubmitValues(values: CompanyCreateFormValues): CompanyCreateSubmitValues {
  const contacts: ContactSubmitValues[] | undefined =
    values.contact.name.trim().length > 0
      ? [toContactSubmitValues({ ...values.contact, name: values.contact.name.trim(), isPrimary: true })]
      : undefined;
  const addresses: AddressSubmitValues[] = [];

  if (values.billingAddress.addressLine1.trim().length > 0) {
    addresses.push(toAddressSubmitValues({ ...values.billingAddress, addressType: 'BILLING', country: values.billingAddress.country || 'India', isPrimary: true }));
  }

  if (!values.useBillingAsShipping && values.shippingAddress.addressLine1.trim().length > 0) {
    addresses.push(toAddressSubmitValues({ ...values.shippingAddress, addressType: 'SHIPPING', country: values.shippingAddress.country || 'India', isPrimary: true }));
  }

  return {
    ...toCompanyUpdateSubmitValues(values),
    ...(contacts ? { contacts } : {}),
    ...(addresses.length > 0 ? { addresses } : {}),
  };
}
