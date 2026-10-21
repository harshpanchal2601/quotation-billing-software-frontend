import { z } from 'zod';

const optionalText = (max: number) => z.string().trim().max(max);

const emptyToUndefined = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .refine((value) => value.length === 0 || /^[+\d][+\d\s()/-]{5,29}$/.test(value), 'Enter a valid phone number');

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Contact name is required').max(191),
  designation: optionalText(191),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value.length === 0 || z.string().email().safeParse(value).success, 'Enter a valid email'),
  phone: phoneSchema,
  alternatePhone: phoneSchema,
  isPrimary: z.boolean(),
});

export type ContactFormValues = z.infer<typeof contactSchema>;

export type ContactSubmitValues = {
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  isPrimary: boolean;
};

export function toContactSubmitValues(values: ContactFormValues): ContactSubmitValues {
  const designation = emptyToUndefined(values.designation);
  const email = emptyToUndefined(values.email)?.toLowerCase();
  const phone = emptyToUndefined(values.phone);
  const alternatePhone = emptyToUndefined(values.alternatePhone);

  return {
    name: values.name.trim(),
    ...(designation ? { designation } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(alternatePhone ? { alternatePhone } : {}),
    isPrimary: values.isPrimary,
  };
}
