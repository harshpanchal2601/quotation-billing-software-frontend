import { z } from 'zod';

export const addressTypes = ['BILLING', 'SHIPPING', 'OTHER'] as const;

const optionalText = (max: number) => z.string().trim().max(max);

const emptyToUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const addressSchema = z.object({
  addressType: z.enum(addressTypes),
  addressLine1: z.string().trim().min(2, 'Address line 1 is required').max(191),
  addressLine2: optionalText(191),
  city: optionalText(191),
  state: optionalText(191),
  postalCode: optionalText(20),
  country: z.string().trim().min(1, 'Country is required').max(191),
  isPrimary: z.boolean(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

export type AddressSubmitValues = {
  addressType: (typeof addressTypes)[number];
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  isPrimary: boolean;
};

export function toAddressSubmitValues(values: AddressFormValues): AddressSubmitValues {
  const addressLine2 = emptyToUndefined(values.addressLine2);
  const city = emptyToUndefined(values.city);
  const state = emptyToUndefined(values.state);
  const postalCode = emptyToUndefined(values.postalCode);

  return {
    addressType: values.addressType,
    addressLine1: values.addressLine1.trim(),
    ...(addressLine2 ? { addressLine2 } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(postalCode ? { postalCode } : {}),
    country: values.country.trim(),
    isPrimary: values.isPrimary,
  };
}
