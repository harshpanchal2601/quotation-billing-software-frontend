import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState, type PropsWithChildren } from 'react';

import { EmptyState } from '@shared/components/common/EmptyState';
import { AppButton } from '@shared/ui/actions';
import { DeleteConfirmDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
import type { CompanyAddress, CompanyContact, CompanyDetail } from '../companies.types';
import { addressTypeLabel, formatAddress, formatReadableDate, unavailable } from '../companies.utils';

type OverviewProps = {
  company: CompanyDetail;
};

export function CompanyOverview({ company }: OverviewProps) {
  return (
    <Stack spacing={2}>
      <InfoPanel title="Company information">
        <InfoRow label="Company name" value={company.name} />
        <InfoRow label="Legal name" value={company.legalName} />
        <InfoRow label="Company code" value={company.companyCode} />
        <InfoRow label="Website" value={company.website} />
        <InfoRow label="Status" value={company.isActive ? 'Active' : 'Inactive'} />
      </InfoPanel>
      <InfoPanel title="Legal and tax information">
        <InfoRow label="GSTIN" value={company.gstin} />
        <InfoRow label="PAN" value={company.pan} />
      </InfoPanel>
      <InfoPanel title="Primary summaries">
        <InfoRow label="Primary contact" value={company.primaryContact ? `${company.primaryContact.name} ${company.primaryContact.phone ?? company.primaryContact.email ?? ''}` : null} />
        <InfoRow label="Billing address" value={formatAddress(company.primaryBillingAddress)} />
        <InfoRow label="Shipping address" value={formatAddress(company.primaryShippingAddress)} />
      </InfoPanel>
      <InfoPanel title="Quotation summary">
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip label={`Total ${company.quotationSummary.total}`} />
          <Chip label={`Draft ${company.quotationSummary.draft}`} />
          <Chip label={`Pending ${company.quotationSummary.pending}`} />
          <Chip label={`Completed ${company.quotationSummary.completed}`} />
        </Stack>
      </InfoPanel>
      <InfoPanel title="Notes">
        <Typography whiteSpace="pre-line">{company.notes ?? unavailable}</Typography>
      </InfoPanel>
      <InfoPanel title="Timeline">
        <InfoRow label="Created" value={formatReadableDate(company.createdAt)} />
        <InfoRow label="Updated" value={formatReadableDate(company.updatedAt)} />
      </InfoPanel>
    </Stack>
  );
}

export function ContactsSection({
  contacts,
  disabled,
  errorMessage,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  contacts: CompanyContact[];
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
      <SectionHeader title="Contacts" actionLabel="Add contact" onAction={onAdd} />
      <ServerErrorAlert message={errorMessage} />
      {contacts.length === 0 ? <EmptyState title="No contacts yet" description="Add contacts for quotation communication." /> : (
        <Stack spacing={1.5}>
          {contacts.map((contact) => (
            <Paper key={contact.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h3">{contact.name}</Typography>
                    {contact.isPrimary ? <Chip size="small" icon={<CheckCircleOutlineOutlinedIcon />} color="primary" label="Primary contact" /> : null}
                  </Stack>
                  <Typography color="text.secondary">{contact.designation ?? unavailable}</Typography>
                  <Typography>{contact.email ?? unavailable}</Typography>
                  <Typography color="text.secondary">Phone: {contact.phone ?? unavailable} · Alternate: {contact.alternatePhone ?? unavailable}</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <AppButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(contact)} disabled={disabled}>Edit</AppButton>
                  {!contact.isPrimary ? <AppButton size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => void onSetPrimary(contact)} disabled={disabled}>Set primary</AppButton> : null}
                  <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setDeleting(contact)} disabled={disabled}>Delete</AppButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <DeleteChildDialog
        open={deleting !== null}
        title="Delete contact?"
        description={deleting ? `${deleting.name} will be removed. Another contact may become primary automatically.` : ''}
        isSubmitting={Boolean(disabled)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
          setDeleting(null);
        }}
      />
    </Stack>
  );
}

export function AddressesSection({
  addresses,
  disabled,
  errorMessage,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
}: {
  addresses: CompanyAddress[];
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
      <SectionHeader title="Addresses" actionLabel="Add address" onAction={onAdd} />
      <ServerErrorAlert message={errorMessage} />
      {addresses.length === 0 ? <EmptyState title="No addresses yet" description="Add billing and shipping addresses for quotation snapshots." /> : (
        <Stack spacing={1.5}>
          {addresses.map((address) => (
            <Paper key={address.id} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5} direction={{ xs: 'column', md: 'row' }} justifyContent="space-between">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h3">{addressTypeLabel(address.addressType)}</Typography>
                    {address.isPrimary ? <Chip size="small" icon={<CheckCircleOutlineOutlinedIcon />} color="primary" label="Primary address" /> : null}
                  </Stack>
                  <Typography color="text.secondary">{formatAddress(address)}</Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <AppButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(address)} disabled={disabled}>Edit</AppButton>
                  {!address.isPrimary ? <AppButton size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => void onSetPrimary(address)} disabled={disabled}>Set primary</AppButton> : null}
                  <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => setDeleting(address)} disabled={disabled}>Delete</AppButton>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
      <DeleteChildDialog
        open={deleting !== null}
        title="Delete address?"
        description={deleting ? `${addressTypeLabel(deleting.addressType)} address will be removed. Another address of the same type may become primary automatically.` : ''}
        isSubmitting={Boolean(disabled)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await onDelete(deleting);
          setDeleting(null);
        }}
      />
    </Stack>
  );
}

function InfoPanel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography variant="h3">{title}</Typography>
        <Divider />
        {children}
      </Stack>
    </Paper>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
      <Typography color="text.secondary">{label}</Typography>
      <Typography textAlign={{ sm: 'right' }}>{value && value.trim().length > 0 ? value : unavailable}</Typography>
    </Stack>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
      <Typography component="h2" variant="h2">{title}</Typography>
      <AppButton variant="contained" startIcon={<AddOutlinedIcon />} onClick={onAction}>{actionLabel}</AppButton>
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
