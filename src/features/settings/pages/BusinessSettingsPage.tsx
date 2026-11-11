import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useWatch, useForm, type FieldPath } from 'react-hook-form';

import { ErrorState } from '@shared/components/common/ErrorState';
import { toApiError } from '@shared/api/apiClient';
import { FormActions, FormExitGuard } from '@shared/forms';
import { useAuth } from '@features/auth';
import { useFirmId } from '@shared/tenancy/useFirmId';
import { AppDialog } from '@shared/ui/dialogs';
import { ControlledCurrencyField, ControlledTextField } from '@shared/forms/controlled';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar, ServerErrorAlert } from '@shared/ui/feedback';
import { DetailFields, DetailSection, PageContainer, PageHeader } from '@shared/ui/layout';
import {
  businessProfileQueryKey,
  deleteBrandingAssetRequest,
  getBusinessProfileRequest,
  updateBusinessProfileRequest,
  uploadBrandingAssetRequest,
} from '../api/business-profile.api';
import { BrandingAssetCard } from '../components/BrandingAssetCard';
import { ColourField } from '../components/ColourField';
import { SettingsSection } from '../components/SettingsSection';
import { BusinessPolicyPanel } from '../components/BusinessPolicyPanel';
import { businessProfileSchema, type BusinessProfileFormValues, type BusinessProfileSubmitValues } from '../model/business-profile.schema';
import type { BrandingAssetType, BusinessProfile } from '../model/settings.types';
import { getSafeApiErrorMessage } from '../model/settings.utils';

export function BusinessSettingsPage() {
  const firmId = useFirmId(); const { user } = useAuth();
  return <BusinessSettingsWorkspace key={`${firmId}:${user?.id}`} />;
}

function BusinessSettingsWorkspace() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const saveLock = useRef(false);
  const firmId = useFirmId(); const { user } = useAuth();
  const queryKey = [...businessProfileQueryKey, firmId, user?.id];
  const query = useQuery({ queryKey, queryFn: getBusinessProfileRequest });
  const form = useForm<BusinessProfileFormValues, unknown, BusinessProfileSubmitValues>({
    resolver: zodResolver(businessProfileSchema),
    mode: 'onChange',
    defaultValues: emptyProfileValues,
  });

  const updateMutation = useMutation({
    mutationFn: updateBusinessProfileRequest,
    onSuccess: (businessProfile) => {
      queryClient.setQueryData(queryKey, businessProfile);
      form.reset(toBusinessProfileFormValues(businessProfile));
      setServerError(null);
      setEditing(false);
      setSuccessMessage('Business profile saved.');
    },
    onError: (error) => setServerError(toApiError(error).message),
    onSettled: () => { saveLock.current = false; },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ assetType, file }: { assetType: BrandingAssetType; file: File }) => uploadBrandingAssetRequest(assetType, file),
    onSuccess: (businessProfile) => {
      queryClient.setQueryData(queryKey, businessProfile);
      setSuccessMessage('Branding image updated.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBrandingAssetRequest,
    onSuccess: (businessProfile) => {
      queryClient.setQueryData(queryKey, businessProfile);
      setSuccessMessage('Branding image removed.');
    },
  });

  const primaryColour = useWatch({ control: form.control, name: 'primaryColour' });
  const secondaryColour = useWatch({ control: form.control, name: 'secondaryColour' });
  const defaultCurrency = useWatch({ control: form.control, name: 'defaultCurrency' });

  async function onSubmit(values: BusinessProfileSubmitValues) {
    if (saveLock.current) return;
    saveLock.current = true;
    setServerError(null);
    try { await updateMutation.mutateAsync(values); } catch { /* The mutation displays the failure and preserves the editor. */ }
  }

  if (query.isPending) {
    return <SettingsSkeleton title="Business Settings" description="Manage company identity, contact details and branding assets." />;
  }

  if (query.isError && !query.data) {
    return (
      <PageContainer maxWidth={1120}>
        <PageHeader title="Business Settings" description="Manage company identity, contact details and branding assets." />
        <ErrorState message={toApiError(query.error).message} />
        <AppButton onClick={() => void query.refetch()} variant="outlined">Retry</AppButton>
      </PageContainer>
    );
  }

  const profile = query.data!;
  const isFormBusy = updateMutation.isPending;
  const brandingBusy = uploadMutation.isPending || deleteMutation.isPending;
  const openEditor = () => {
    if (saveLock.current || brandingBusy) return;
    form.reset(toBusinessProfileFormValues(profile));
    setServerError(null);
    setEditing(true);
  };

  return (
    <PageContainer maxWidth={1120}>
      <PageHeader title="Business Settings" description="Manage company identity, contact details and branding assets." />
      {query.isError ? <ErrorState message={toApiError(query.error).message} onRetry={() => void query.refetch()} /> : null}
      <DetailSection title="Business profile" actions={<AppButton variant="outlined" disabled={editing || brandingBusy} onClick={openEditor}>Edit business profile</AppButton>}>
        <DetailFields fields={[
          { label: 'Legal name', value: profile.legalName }, { label: 'Display name', value: profile.displayName },
          { label: 'Website', value: profile.website || 'Not set' }, { label: 'Quotation currency', value: profile.defaultCurrency },
          { label: 'GSTIN', value: profile.gstin || 'Not set' }, { label: 'PAN', value: profile.pan || 'Not set' }, { label: 'CIN', value: profile.cin || 'Not set' },
          { label: 'Address', value: [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.postalCode, profile.country].filter(Boolean).join(', ') },
          { label: 'Primary phone', value: profile.primaryPhone || 'Not set' }, { label: 'Secondary phone', value: profile.secondaryPhone || 'Not set' },
          { label: 'Primary email', value: profile.primaryEmail || 'Not set' }, { label: 'Secondary email', value: profile.secondaryEmail || 'Not set' },
          { label: 'Primary colour', value: profile.primaryColour }, { label: 'Secondary colour', value: profile.secondaryColour },
        ]} />
      </DetailSection>
        <DetailSection title="Branding assets">
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }} gap={2}>
            <BrandingAssetCard assetType="logo" title="Logo" description="Displayed in quotation branding." imageUrl={profile.logoUrl} updatedAt={profile.updatedAt} isBusy={brandingBusy || editing} onUpload={(file) => uploadMutation.mutateAsync({ assetType: 'logo', file }).then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} onDelete={() => deleteMutation.mutateAsync('logo').then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} />
            <BrandingAssetCard assetType="signature" title="Authorised signature" description="Used for signed quotation output." imageUrl={profile.signatureUrl} updatedAt={profile.updatedAt} isBusy={brandingBusy || editing} onUpload={(file) => uploadMutation.mutateAsync({ assetType: 'signature', file }).then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} onDelete={() => deleteMutation.mutateAsync('signature').then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} />
            <BrandingAssetCard assetType="stamp" title="Company stamp" description="Used for stamped quotation output." imageUrl={profile.stampUrl} updatedAt={profile.updatedAt} isBusy={brandingBusy || editing} onUpload={(file) => uploadMutation.mutateAsync({ assetType: 'stamp', file }).then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} onDelete={() => deleteMutation.mutateAsync('stamp').then(() => undefined).catch((error: unknown) => { throw new Error(getSafeApiErrorMessage(toApiError(error))); })} />
          </Box>
        </DetailSection>

      {editing ? <FormExitGuard dirty={form.formState.isDirty} isSubmitting={isFormBusy} onCancel={() => setEditing(false)}>{(requestClose) => <AppDialog open title="Edit business profile" fullWidth maxWidth="md" preventClose={isFormBusy || saveLock.current} onClose={requestClose} actions={<FormActions submitLabel="Save changes" isSubmitting={isFormBusy} isSubmitDisabled={!form.formState.isDirty} onCancel={requestClose} submitButtonProps={{ form: 'business-profile-form' }} />}>
      <Stack component="form" id="business-profile-form" spacing={2} onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} noValidate aria-busy={isFormBusy}>
        <ServerErrorAlert message={serverError} />
        {form.formState.isDirty ? <Alert severity="info">You have unsaved changes.</Alert> : null}
        <SettingsSection title="Company information">
          <TwoColumnGrid>
            <ProfileTextField form={form} name="legalName" label="Legal name" required autoComplete="organization" disabled={isFormBusy} />
            <ProfileTextField form={form} name="displayName" label="Display name" required autoComplete="organization" disabled={isFormBusy} />
            <ProfileTextField form={form} name="website" label="Website" autoComplete="url" disabled={isFormBusy} />
            <ControlledCurrencyField
              control={form.control}
              name="defaultCurrency"
              label="Default currency"
              currentCurrency={defaultCurrency}
              required
              disabled={isFormBusy}
            />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Legal and tax information">
          <TwoColumnGrid>
            <ProfileTextField form={form} name="gstin" label="GSTIN" disabled={isFormBusy} />
            <ProfileTextField form={form} name="pan" label="PAN" disabled={isFormBusy} />
            <ProfileTextField form={form} name="cin" label="CIN" disabled={isFormBusy} />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Address">
          <TwoColumnGrid>
            <ProfileTextField form={form} name="addressLine1" label="Address line 1" required autoComplete="address-line1" disabled={isFormBusy} />
            <ProfileTextField form={form} name="addressLine2" label="Address line 2" autoComplete="address-line2" disabled={isFormBusy} />
            <ProfileTextField form={form} name="city" label="City" required autoComplete="address-level2" disabled={isFormBusy} />
            <ProfileTextField form={form} name="state" label="State" required autoComplete="address-level1" disabled={isFormBusy} />
            <ProfileTextField form={form} name="postalCode" label="Postal code" required autoComplete="postal-code" disabled={isFormBusy} />
            <ProfileTextField form={form} name="country" label="Country" required autoComplete="country-name" disabled={isFormBusy} />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Contact information">
          <TwoColumnGrid>
            <ProfileTextField form={form} name="primaryPhone" label="Primary phone" autoComplete="tel" disabled={isFormBusy} />
            <ProfileTextField form={form} name="secondaryPhone" label="Secondary phone" autoComplete="tel" disabled={isFormBusy} />
            <ProfileTextField form={form} name="primaryEmail" label="Primary email" autoComplete="email" disabled={isFormBusy} />
            <ProfileTextField form={form} name="secondaryEmail" label="Secondary email" autoComplete="email" disabled={isFormBusy} />
          </TwoColumnGrid>
        </SettingsSection>
        <SettingsSection title="Brand colours" description="Preview only. These colours do not change the admin theme.">
          <TwoColumnGrid>
            <ColourField control={form.control} name="primaryColour" label="Primary colour" disabled={isFormBusy} />
            <ColourField control={form.control} name="secondaryColour" label="Secondary colour" disabled={isFormBusy} />
          </TwoColumnGrid>
          <Box sx={{ mt: 2, border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden', maxWidth: 520 }}>
            <Box sx={{ bgcolor: primaryColour, color: '#fff', px: 2, py: 1.5 }}>
              <Typography fontWeight={700}>Branding preview</Typography>
            </Box>
            <Box sx={{ borderTop: 4, borderColor: secondaryColour, p: 2 }}>
              <Typography color="text.secondary">Saved colours are used in document branding.</Typography>
            </Box>
          </Box>
        </SettingsSection>
      </Stack>
      </AppDialog>}</FormExitGuard> : null}
      <BusinessPolicyPanel />
      <AppSnackbar open={successMessage !== null} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}

type ProfileForm = ReturnType<typeof useForm<BusinessProfileFormValues, unknown, BusinessProfileSubmitValues>>;

function ProfileTextField({ form, name, label, required, disabled, autoComplete }: {
  form: ProfileForm;
  name: FieldPath<BusinessProfileFormValues>;
  label: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}) {
  return (
    <ControlledTextField
      name={name}
      control={form.control}
      required={required}
      label={label}
      autoComplete={autoComplete}
      disabled={disabled}
    />
  );
}

function TwoColumnGrid({ children }: React.PropsWithChildren) {
  return <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={2}>{children}</Box>;
}

function SettingsSkeleton({ title, description }: { title: string; description: string }) {
  return (
    <PageContainer maxWidth={1120}>
      <PageHeader title={title} description={description} />
      <Stack spacing={2}>
        {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}
      </Stack>
    </PageContainer>
  );
}

const emptyProfileValues: BusinessProfileFormValues = {
  legalName: '',
  displayName: '',
  gstin: '',
  pan: '',
  cin: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  primaryPhone: '',
  secondaryPhone: '',
  primaryEmail: '',
  secondaryEmail: '',
  website: '',
  primaryColour: '#168A56',
  secondaryColour: '#082B67',
  defaultCurrency: 'INR',
};

function toBusinessProfileFormValues(profile: BusinessProfile): BusinessProfileFormValues {
  return {
    legalName: profile.legalName,
    displayName: profile.displayName,
    gstin: profile.gstin ?? '',
    pan: profile.pan ?? '',
    cin: profile.cin ?? '',
    addressLine1: profile.addressLine1,
    addressLine2: profile.addressLine2 ?? '',
    city: profile.city,
    state: profile.state,
    postalCode: profile.postalCode,
    country: profile.country,
    primaryPhone: profile.primaryPhone ?? '',
    secondaryPhone: profile.secondaryPhone ?? '',
    primaryEmail: profile.primaryEmail ?? '',
    secondaryEmail: profile.secondaryEmail ?? '',
    website: profile.website ?? '',
    primaryColour: profile.primaryColour,
    secondaryColour: profile.secondaryColour,
    defaultCurrency: profile.defaultCurrency,
  };
}
