import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { CompanyContact } from '../companies.types';
import { contactSchema, toContactSubmitValues, type ContactFormValues, type ContactSubmitValues } from '../schemas/contact.schema';

const emptyContactValues: ContactFormValues = {
  name: '',
  designation: '',
  email: '',
  phone: '',
  alternatePhone: '',
  isPrimary: false,
};

type ContactDialogProps = {
  open: boolean;
  contact: CompanyContact | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (values: ContactSubmitValues) => Promise<void>;
};

export function ContactDialog({ open, contact, isSubmitting, errorMessage, onClose, onSubmit }: ContactDialogProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: emptyContactValues,
    mode: 'onChange',
  });
  const handleSubmit = form.handleSubmit(async (values) => onSubmit(toContactSubmitValues(values)));

  useEffect(() => {
    form.reset(contactToFormValues(contact));
  }, [contact, form, open]);

  return (
    <Dialog open={open} onClose={() => (!isSubmitting ? onClose() : undefined)} fullWidth maxWidth="sm">
      <DialogTitle>{contact ? 'Edit contact' : 'Add contact'}</DialogTitle>
      <DialogContent>
        <DialogContentText mb={2}>Primary contacts are shown in company lists and quotation defaults.</DialogContentText>
        <Stack component="form" id="contact-form" spacing={2} onSubmit={(event) => void handleSubmit(event)} noValidate>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          <ContactTextField control={form.control} name="name" label="Contact name" required disabled={isSubmitting} />
          <ContactTextField control={form.control} name="designation" label="Designation" disabled={isSubmitting} />
          <ContactTextField control={form.control} name="email" label="Email" disabled={isSubmitting} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <ContactTextField control={form.control} name="phone" label="Phone" disabled={isSubmitting} />
            <ContactTextField control={form.control} name="alternatePhone" label="Alternate phone" disabled={isSubmitting} />
          </Stack>
          <Controller name="isPrimary" control={form.control} render={({ field }) => <FormControlLabel control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} disabled={isSubmitting} />} label="Make primary contact" />} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" form="contact-form" variant="contained" disabled={isSubmitting || !form.formState.isValid}>{isSubmitting ? 'Saving' : 'Save contact'}</Button>
      </DialogActions>
    </Dialog>
  );
}

type ContactTextFieldName = Exclude<keyof ContactFormValues, 'isPrimary'>;

function ContactTextField({ control, name, label, disabled, required }: { control: ReturnType<typeof useForm<ContactFormValues>>['control']; name: ContactTextFieldName; label: string; disabled: boolean; required?: boolean }) {
  return <Controller name={name} control={control} render={({ field, fieldState }) => <TextField {...field} fullWidth required={required} label={label} disabled={disabled} error={fieldState.invalid} helperText={fieldState.error?.message} />} />;
}

function contactToFormValues(contact: CompanyContact | null): ContactFormValues {
  if (!contact) return emptyContactValues;
  return {
    name: contact.name,
    designation: contact.designation ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    alternatePhone: contact.alternatePhone ?? '',
    isPrimary: contact.isPrimary,
  };
}
