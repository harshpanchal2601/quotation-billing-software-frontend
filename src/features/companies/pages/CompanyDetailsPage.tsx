import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type MouseEvent } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { paths } from '@app/router/routeConfig';
import { getSafeListReturnPath } from '@app/router/returnNavigation';
import { toApiError } from '@shared/api/apiClient';
import { createCompanyAddressRequest, deleteCompanyAddressRequest, setPrimaryCompanyAddressRequest, updateCompanyAddressRequest } from '../api/addresses.api';
import { deleteCompanyRequest, getCompanyRequest, updateCompanyStatusRequest } from '../api/companies.api';
import { createCompanyContactRequest, deleteCompanyContactRequest, setPrimaryCompanyContactRequest, updateCompanyContactRequest } from '../api/contacts.api';
import { companiesQueryKeys } from '../companies.query-keys';
import type { CompanyAddress, CompanyContact } from '../companies.types';
import { AddressDialog } from '../components/AddressDialog';
import { CompanyStatusDialog, DeleteCompanyDialog } from '../components/CompanyConfirmDialogs';
import { AddressesSection, CompanyOverview, ContactsSection } from '../components/CompanyDetailSections';
import { CompanyQuotationHistory } from '../components/CompanyQuotationHistory';
import { CompanyStatusChip } from '../components/CompanyStatusChip';
import { ContactDialog } from '../components/ContactDialog';
import type { AddressSubmitValues } from '../schemas/address.schema';
import type { ContactSubmitValues } from '../schemas/contact.schema';

type CompanyTab = 'overview' | 'contacts' | 'addresses' | 'quotations';
const tabs: CompanyTab[] = ['overview', 'contacts', 'addresses', 'quotations'];

export function CompanyDetailsPage() {
  const companyId = Number(useParams().id);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as CompanyTab | null;
  const selectedTab = tabParam !== null && tabs.includes(tabParam) ? tabParam : 'overview';
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<CompanyContact | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CompanyAddress | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: companiesQueryKeys.detail(companyId), queryFn: () => getCompanyRequest(companyId), enabled: Number.isFinite(companyId) });

  const invalidateDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.detail(companyId) });
    await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() });
  };

  const statusMutation = useMutation({
    mutationFn: () => updateCompanyStatusRequest(companyId, !query.data?.isActive),
    onSuccess: async () => {
      await invalidateDetail();
      setStatusOpen(false);
      setSuccessMessage('Company status updated.');
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompanyRequest(companyId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: companiesQueryKeys.detail(companyId) });
      await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() });
      navigate(returnPath);
    },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const createContactMutation = useMutation({
    mutationFn: (values: ContactSubmitValues) => createCompanyContactRequest(companyId, values),
    onSuccess: async () => { await invalidateDetail(); closeContactDialog(); setSuccessMessage('Contact saved.'); },
    onError: (error) => setDialogError(toApiError(error).message),
  });
  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, values }: { contactId: number; values: ContactSubmitValues }) => updateCompanyContactRequest(companyId, contactId, values),
    onSuccess: async () => { await invalidateDetail(); closeContactDialog(); setSuccessMessage('Contact saved.'); },
    onError: (error) => setDialogError(toApiError(error).message),
  });
  const contactActionMutation = useMutation({
    mutationFn: async ({ contactId, action }: { contactId: number; action: 'primary' | 'delete' }) => {
      if (action === 'primary') await setPrimaryCompanyContactRequest(companyId, contactId);
      else await deleteCompanyContactRequest(companyId, contactId);
    },
    onSuccess: async () => { await invalidateDetail(); setSuccessMessage('Contact updated.'); },
    onError: (error) => setPageError(toApiError(error).message),
  });

  const createAddressMutation = useMutation({
    mutationFn: (values: AddressSubmitValues) => createCompanyAddressRequest(companyId, values),
    onSuccess: async () => { await invalidateDetail(); closeAddressDialog(); setSuccessMessage('Address saved.'); },
    onError: (error) => setDialogError(toApiError(error).message),
  });
  const updateAddressMutation = useMutation({
    mutationFn: ({ addressId, values }: { addressId: number; values: AddressSubmitValues }) => updateCompanyAddressRequest(companyId, addressId, values),
    onSuccess: async () => { await invalidateDetail(); closeAddressDialog(); setSuccessMessage('Address saved.'); },
    onError: (error) => setDialogError(toApiError(error).message),
  });
  const addressActionMutation = useMutation({
    mutationFn: async ({ addressId, action }: { addressId: number; action: 'primary' | 'delete' }) => {
      if (action === 'primary') await setPrimaryCompanyAddressRequest(companyId, addressId);
      else await deleteCompanyAddressRequest(companyId, addressId);
    },
    onSuccess: async () => { await invalidateDetail(); setSuccessMessage('Address updated.'); },
    onError: (error) => setPageError(toApiError(error).message),
  });

  if (!Number.isFinite(companyId)) return <ErrorState message="Company not found" />;
  if (query.isPending) return <Stack spacing={1}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}</Stack>;
  if (query.isError) return <Stack spacing={1}><ErrorState message={toApiError(query.error).message} /><Button onClick={() => void query.refetch()}>Retry</Button></Stack>;

  const company = query.data;
  const isMutating = statusMutation.isPending || deleteMutation.isPending || contactActionMutation.isPending || addressActionMutation.isPending;
  const returnPath = getSafeListReturnPath(location, paths.companies);

  function openMenu(event: MouseEvent<HTMLElement>) {
    setMenuAnchor(event.currentTarget);
  }

  function closeContactDialog() {
    setContactDialogOpen(false);
    setEditingContact(null);
    setDialogError(null);
  }

  function closeAddressDialog() {
    setAddressDialogOpen(false);
    setEditingAddress(null);
    setDialogError(null);
  }

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography component="h1" variant="h1">{company.name}</Typography>
            <CompanyStatusChip isActive={company.isActive} />
          </Stack>
          <Typography color="text.secondary">{company.companyCode}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button component={RouterLink} to={returnPath} variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
            Back to Companies
          </Button>
          <Button component={RouterLink} to={`${paths.companies}/${company.id}/edit`} state={{ from: returnPath }} variant="contained" startIcon={<EditOutlinedIcon />}>Edit</Button>
          <IconButton aria-label="Open company actions" onClick={openMenu}><MoreVertOutlinedIcon /></IconButton>
          <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { setMenuAnchor(null); setStatusOpen(true); }}><PowerSettingsNewOutlinedIcon fontSize="small" sx={{ mr: 1 }} />{company.isActive ? 'Deactivate' : 'Activate'}</MenuItem>
            <MenuItem onClick={() => { setMenuAnchor(null); setDeleteOpen(true); }} sx={{ color: 'error.main' }}><DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />Delete</MenuItem>
          </Menu>
        </Stack>
      </Stack>
      {pageError ? <Alert severity="error" onClose={() => setPageError(null)}>{pageError}</Alert> : null}
      <Tabs value={selectedTab} onChange={(_event, value: CompanyTab) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('tab', value); return next; })} variant="scrollable" allowScrollButtonsMobile>
        <Tab label="Overview" value="overview" />
        <Tab label="Contacts" value="contacts" />
        <Tab label="Addresses" value="addresses" />
        <Tab label="Quotations" value="quotations" />
      </Tabs>
      {selectedTab === 'overview' ? <CompanyOverview company={company} /> : null}
      {selectedTab === 'contacts' ? (
        <ContactsSection
          contacts={company.contacts}
          disabled={isMutating}
          errorMessage={pageError}
          onAdd={() => { setEditingContact(null); setDialogError(null); setContactDialogOpen(true); }}
          onEdit={(contact) => { setEditingContact(contact); setDialogError(null); setContactDialogOpen(true); }}
          onDelete={(contact) => contactActionMutation.mutateAsync({ contactId: contact.id, action: 'delete' })}
          onSetPrimary={(contact) => contactActionMutation.mutateAsync({ contactId: contact.id, action: 'primary' })}
        />
      ) : null}
      {selectedTab === 'addresses' ? (
        <AddressesSection
          addresses={company.addresses}
          disabled={isMutating}
          errorMessage={pageError}
          onAdd={() => { setEditingAddress(null); setDialogError(null); setAddressDialogOpen(true); }}
          onEdit={(address) => { setEditingAddress(address); setDialogError(null); setAddressDialogOpen(true); }}
          onDelete={(address) => addressActionMutation.mutateAsync({ addressId: address.id, action: 'delete' })}
          onSetPrimary={(address) => addressActionMutation.mutateAsync({ addressId: address.id, action: 'primary' })}
        />
      ) : null}
      {selectedTab === 'quotations' ? <CompanyQuotationHistory companyId={company.id} /> : null}
      <ContactDialog
        open={contactDialogOpen}
        contact={editingContact}
        isSubmitting={createContactMutation.isPending || updateContactMutation.isPending}
        errorMessage={dialogError}
        onClose={closeContactDialog}
        onSubmit={async (values) => {
          if (editingContact) await updateContactMutation.mutateAsync({ contactId: editingContact.id, values });
          else await createContactMutation.mutateAsync(values);
        }}
      />
      <AddressDialog
        open={addressDialogOpen}
        address={editingAddress}
        isSubmitting={createAddressMutation.isPending || updateAddressMutation.isPending}
        errorMessage={dialogError}
        onClose={closeAddressDialog}
        onSubmit={async (values) => {
          if (editingAddress) await updateAddressMutation.mutateAsync({ addressId: editingAddress.id, values });
          else await createAddressMutation.mutateAsync(values);
        }}
      />
      <CompanyStatusDialog company={statusOpen ? company : null} isSubmitting={statusMutation.isPending} onClose={() => setStatusOpen(false)} onConfirm={async () => { await statusMutation.mutateAsync(); }} />
      <DeleteCompanyDialog company={deleteOpen ? company : null} isDeleting={deleteMutation.isPending} onClose={() => setDeleteOpen(false)} onConfirm={() => deleteMutation.mutateAsync()} />
      <Snackbar open={successMessage !== null} autoHideDuration={5000} onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled" onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
