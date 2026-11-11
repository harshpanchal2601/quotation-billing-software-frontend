import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { DetailActions, DetailFields, DetailSection } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { AppButton } from '@shared/ui/actions';
import { DeleteConfirmDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
import type { CompanyAddress, CompanyContact, CompanyDetail } from '../model/companies.types';
import { addressTypeLabel, formatAddress, formatReadableDate, unavailable } from '../model/companies.utils';

type OverviewProps = {
  company: CompanyDetail;
};

export function CompanyOverview({ company }: OverviewProps) {
  return (
    <Stack spacing={2}>
      <DetailSection title="Company information"><DetailFields fields={[
        { label: 'Company name', value: company.name }, { label: 'Legal name', value: company.legalName },
        { label: 'Company code', value: company.companyCode }, { label: 'Website', value: company.website },
        { label: 'Status', value: company.isActive ? 'Active' : 'Inactive' }, { label: 'Supplier', value: company.isSupplier ? 'Yes' : 'No' },
      ]} /></DetailSection>
      <DetailSection title="Legal and tax information"><DetailFields fields={[
        { label: 'GSTIN', value: company.gstin }, { label: 'PAN', value: company.pan },
      ]} /></DetailSection>
      <DetailSection title="Contact and addresses"><DetailFields columns={3} fields={[
        { label: 'Primary contact', value: company.primaryContact ? [company.primaryContact.name, company.primaryContact.phone, company.primaryContact.email].filter(Boolean).join(' · ') : null },
        { label: 'Billing address', value: formatAddress(company.primaryBillingAddress) },
        { label: 'Shipping address', value: formatAddress(company.primaryShippingAddress) },
      ]} /></DetailSection>
      <DetailSection title="Quotation summary"><DetailFields columns={2} fields={[
        { label: 'Total quotations', value: company.quotationSummary.total }, { label: 'Draft', value: company.quotationSummary.draft },
        { label: 'Pending', value: company.quotationSummary.pending }, { label: 'Completed', value: company.quotationSummary.completed },
      ]} /></DetailSection>
      {company.notes ? <DetailSection title="Notes"><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{company.notes}</Typography></DetailSection> : null}
      <DetailSection title="Record information"><DetailFields fields={[
        { label: 'Created', value: formatReadableDate(company.createdAt) }, { label: 'Last updated', value: formatReadableDate(company.updatedAt) },
      ]} /></DetailSection>
    </Stack>
  );
}

export function ContactsSection({
  contacts,
  canManage,
  disabled,
  errorMessage,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  contacts: CompanyContact[];
  canManage: boolean;
  disabled?: boolean;
  errorMessage: string | null;
  onAdd: () => void;
  onEdit: (contact: CompanyContact) => void;
  onDelete: (contact: CompanyContact) => Promise<void>;
  onSetPrimary: (contact: CompanyContact) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<CompanyContact | null>(null);
  return (
    <Stack spacing={2}>
      <SectionHeader title="Contacts" actionLabel={canManage ? 'Add contact' : undefined} onAction={canManage ? onAdd : undefined} />
      <ServerErrorAlert message={errorMessage} />
      <RecordTable rows={contacts} label="Company contacts" rowKey={(contact) => contact.id} emptyMessage="No contacts yet. Add a contact for quotation communication." columns={[
        { key: 'name', label: 'Name', sortValue: (contact) => contact.name, render: (contact) => <Stack spacing={0.5}><Typography variant="body2" fontWeight={600}>{contact.name}</Typography>{contact.isPrimary ? <Chip size="small" color="primary" label="Primary contact" sx={{ alignSelf: 'flex-start' }} /> : null}</Stack> },
        { key: 'designation', label: 'Designation', sortValue: (contact) => contact.designation, render: (contact) => contact.designation ?? unavailable },
        { key: 'email', label: 'Email', sortValue: (contact) => contact.email, render: (contact) => contact.email ?? unavailable },
        { key: 'phone', label: 'Phone', sortValue: (contact) => contact.phone, render: (contact) => contact.phone ?? unavailable },
        { key: 'alternatePhone', label: 'Alternate phone', render: (contact) => contact.alternatePhone ?? unavailable },
        ...(canManage ? [{ key: 'actions', label: 'Actions', render: (contact: CompanyContact) => <DetailActions label={`Actions for ${contact.name}`}>
          <AppButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(contact)} disabled={disabled}>Edit</AppButton>
          {!contact.isPrimary ? <AppButton size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => void onSetPrimary(contact).catch(() => undefined)} disabled={disabled}>Set primary</AppButton> : null}
          <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setDeleting(contact)} disabled={disabled}>Delete</AppButton>
        </DetailActions> }] : []),
      ]} />
      {canManage ? <DeleteChildDialog
        open={deleting !== null}
        title="Delete contact?"
        description={deleting ? `${deleting.name} will be removed. Another contact may become primary automatically.` : ''}
        isSubmitting={Boolean(disabled)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
          setDeleting(null);
        }}
      /> : null}
    </Stack>
  );
}

export function AddressesSection({
  addresses,
  canManage,
  disabled,
  errorMessage,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  addresses: CompanyAddress[];
  canManage: boolean;
  disabled?: boolean;
  errorMessage: string | null;
  onAdd: () => void;
  onEdit: (address: CompanyAddress) => void;
  onDelete: (address: CompanyAddress) => Promise<void>;
  onSetPrimary: (address: CompanyAddress) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState<CompanyAddress | null>(null);
  return (
    <Stack spacing={2}>
      <SectionHeader title="Addresses" actionLabel={canManage ? 'Add address' : undefined} onAction={canManage ? onAdd : undefined} />
      <ServerErrorAlert message={errorMessage} />
      <RecordTable rows={addresses} label="Company addresses" rowKey={(address) => address.id} emptyMessage="No addresses yet. Add billing and shipping addresses for your documents." columns={[
        { key: 'type', label: 'Address type', sortValue: (address) => address.addressType, render: (address) => <Stack spacing={0.5}><Typography variant="body2" fontWeight={600}>{addressTypeLabel(address.addressType)}</Typography>{address.isPrimary ? <Chip size="small" color="primary" label="Primary address" sx={{ alignSelf: 'flex-start' }} /> : null}</Stack> },
        { key: 'address', label: 'Address', sortValue: (address) => formatAddress(address), render: (address) => formatAddress(address) },
        { key: 'city', label: 'City', sortValue: (address) => address.city, render: (address) => address.city },
        { key: 'state', label: 'State', sortValue: (address) => address.state, render: (address) => address.state },
        ...(canManage ? [{ key: 'actions', label: 'Actions', render: (address: CompanyAddress) => <DetailActions label={`Actions for ${addressTypeLabel(address.addressType)} address`}>
          <AppButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(address)} disabled={disabled}>Edit</AppButton>
          {!address.isPrimary ? <AppButton size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => void onSetPrimary(address).catch(() => undefined)} disabled={disabled}>Set primary</AppButton> : null}
          <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setDeleting(address)} disabled={disabled}>Delete</AppButton>
        </DetailActions> }] : []),
      ]} />
      {canManage ? <DeleteChildDialog
        open={deleting !== null}
        title="Delete address?"
        description={deleting ? `${addressTypeLabel(deleting.addressType)} address will be removed. Another address of the same type may become primary automatically.` : ''}
        isSubmitting={Boolean(disabled)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
          setDeleting(null);
        }}
      /> : null}
    </Stack>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
      <Typography component="h2" variant="subtitle1" fontWeight={700} color="primary.main">{title}</Typography>
      {actionLabel && onAction ? <AppButton variant="contained" startIcon={<AddOutlinedIcon />} onClick={onAction}>{actionLabel}</AppButton> : null}
    </Stack>
  );
}

function DeleteChildDialog({ open, title, description, isSubmitting, onClose, onConfirm }: { open: boolean; title: string; description: string; isSubmitting: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  return (
    <DeleteConfirmDialog
      open={open}
      title={title}
      confirmLabel="Delete"
      isDeleting={isSubmitting}
      onClose={onClose}
      onConfirm={() => void onConfirm().catch(() => undefined)}
    >
      <Typography color="text.secondary">{description}</Typography>
    </DeleteConfirmDialog>
  );
}
