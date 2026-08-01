import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { paths } from '@app/router/routeConfig';
import { AppButton } from '@shared/ui/actions';
import { DataTableShell, RowActionsMenu } from '@shared/ui/tables';
import type { CompanyListItem } from '../companies.types';
import { formatLocation, formatReadableDate, hasText, unavailable } from '../companies.utils';
import { CompanyStatusChip } from './CompanyStatusChip';

type CompanyTableProps = {
  companies: CompanyListItem[];
  busyCompanyId?: number | null;
  returnState?: { from: string };
  onStatusChange: (company: CompanyListItem) => void;
  onDelete: (company: CompanyListItem) => void;
};

export function CompanyTable({ companies, busyCompanyId, returnState, onStatusChange, onDelete }: CompanyTableProps) {
  return (
    <>
      <DataTableShell
        isLoading={false}
        isError={false}
        isEmpty={false}
        loadingContent={null}
        errorContent={null}
        emptyContent={null}
        tableContainerProps={{ component: Paper, variant: 'outlined', sx: { display: { xs: 'none', lg: 'block' } } }}
      >
        <Table aria-label="Companies">
          <TableHead>
            <TableRow>
              <TableCell>Company</TableCell>
              <TableCell>Company code</TableCell>
              <TableCell>Primary contact</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>GSTIN</TableCell>
              <TableCell>Quotations</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id} hover>
                <TableCell>
                  <Typography fontWeight={700}>{company.name}</Typography>
                  {hasText(company.legalName) && company.legalName !== company.name ? (
                    <Typography color="text.secondary" variant="body2">{company.legalName}</Typography>
                  ) : null}
                </TableCell>
                <TableCell>{company.companyCode}</TableCell>
                <TableCell><PrimaryContactSummary company={company} /></TableCell>
                <TableCell>{formatLocation(company.primaryBillingAddress ?? company.primaryShippingAddress)}</TableCell>
                <TableCell>{company.gstin ?? unavailable}</TableCell>
                <TableCell>{company.quotationCount}</TableCell>
                <TableCell><CompanyStatusChip isActive={company.isActive} /></TableCell>
                <TableCell>{formatReadableDate(company.updatedAt)}</TableCell>
                <TableCell align="right"><CompanyActions company={company} disabled={busyCompanyId === company.id} returnState={returnState} onStatusChange={onStatusChange} onDelete={onDelete} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DataTableShell>
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', lg: 'none' } }}>
        {companies.map((company) => (
          <Paper key={company.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start">
                <Box minWidth={0}>
                  <Typography variant="h3">{company.name}</Typography>
                  <Typography color="text.secondary">{company.companyCode}</Typography>
                </Box>
                <CompanyStatusChip isActive={company.isActive} />
              </Stack>
              <PrimaryContactSummary company={company} />
              <Typography color="text.secondary">Quotations: {company.quotationCount}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <AppButton component={RouterLink} to={`${paths.companies}/${company.id}`} state={returnState} size="small" startIcon={<VisibilityOutlinedIcon />}>View</AppButton>
                <AppButton component={RouterLink} to={`${paths.companies}/${company.id}/edit`} state={returnState} size="small" startIcon={<EditOutlinedIcon />}>Edit</AppButton>
                <AppButton size="small" startIcon={<PowerSettingsNewOutlinedIcon />} onClick={() => onStatusChange(company)} isLoading={busyCompanyId === company.id}>{company.isActive ? 'Deactivate' : 'Activate'}</AppButton>
                <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(company)} isLoading={busyCompanyId === company.id}>Delete</AppButton>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}

function PrimaryContactSummary({ company }: { company: CompanyListItem }) {
  const contact = company.primaryContact;
  if (!contact) return <Typography color="text.secondary">No primary contact</Typography>;
  return (
    <Box>
      <Typography>{contact.name}</Typography>
      <Typography color="text.secondary" variant="body2">{contact.phone ?? contact.email ?? unavailable}</Typography>
    </Box>
  );
}

function CompanyActions({
  company,
  disabled,
  returnState,
  onStatusChange,
  onDelete,
}: {
  company: CompanyListItem;
  disabled?: boolean;
  returnState?: { from: string };
  onStatusChange: (company: CompanyListItem) => void;
  onDelete: (company: CompanyListItem) => void;
}) {
  const navigate = useNavigate();

  return (
    <RowActionsMenu
      triggerLabel={`Open actions for ${company.name}`}
      disabled={disabled}
      actions={[
        {
          key: 'view',
          label: <><VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> View</>,
          onSelect: () => navigate(`${paths.companies}/${company.id}`, { state: returnState }),
        },
        {
          key: 'edit',
          label: <><EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Edit</>,
          onSelect: () => navigate(`${paths.companies}/${company.id}/edit`, { state: returnState }),
        },
        {
          key: 'status',
          label: <><PowerSettingsNewOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> {company.isActive ? 'Deactivate' : 'Activate'}</>,
          onSelect: () => onStatusChange(company),
        },
        {
          key: 'delete',
          label: <><DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Delete</>,
          destructive: true,
          onSelect: () => onDelete(company),
        },
      ]}
    />
  );
}
