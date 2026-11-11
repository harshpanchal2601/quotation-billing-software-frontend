import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PowerSettingsNewOutlinedIcon from '@mui/icons-material/PowerSettingsNewOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';

import { paths } from '@shared/routing/paths';
import { RecordTable, RowActionsMenu, type TableSorting } from '@shared/ui/tables';
import type { CompanyListItem } from '../model/companies.types';
import { formatLocation, formatReadableDate, hasText, unavailable } from '../model/companies.utils';
import { CompanyStatusChip } from './CompanyStatusChip';

type CompanyTableProps = {
  rowNumberStart?: number;
  companies: CompanyListItem[];
  sorting?: TableSorting;
  busyCompanyId?: number | null;
  returnState?: { from: string };
  onStatusChange: (company: CompanyListItem) => void;
  onDelete: (company: CompanyListItem) => void;
  canManage?: boolean;
};

export function CompanyTable({ rowNumberStart = 1, companies, sorting, busyCompanyId, returnState, onStatusChange, onDelete, canManage = false }: CompanyTableProps) {
  return (
    <RecordTable
      rows={companies}
      rowKey={(company) => company.id}
      label="Companies"
      rowNumberStart={rowNumberStart}
      sorting={sorting}
      showSortControls={false}
      columns={[
        { key: 'name', label: 'Company', sortKey: 'name', render: (company) => <Box><Typography variant="body2" fontWeight={700}>{company.name}</Typography>{hasText(company.legalName) && company.legalName !== company.name ? <Typography color="text.secondary" variant="body2">{company.legalName}</Typography> : null}</Box> },
        { key: 'companyCode', label: 'Company code', sortKey: 'companyCode', render: (company) => company.companyCode },
        { key: 'primaryContact', label: 'Primary contact', render: (company) => <PrimaryContactSummary company={company} /> },
        { key: 'location', label: 'Location', render: (company) => formatLocation(company.primaryBillingAddress ?? company.primaryShippingAddress) },
        { key: 'gstin', label: 'GSTIN', render: (company) => company.gstin ?? unavailable },
        { key: 'quotationCount', label: 'Quotations', align: 'right', render: (company) => company.quotationCount },
        { key: 'status', label: 'Status', render: (company) => <CompanyStatusChip isActive={company.isActive} /> },
        { key: 'updatedAt', label: 'Updated', sortKey: 'updatedAt', noWrap: true, render: (company) => formatReadableDate(company.updatedAt) },
        { key: 'actions', label: 'Actions', align: 'right', render: (company) => <CompanyActions company={company} disabled={busyCompanyId === company.id} returnState={returnState} onStatusChange={onStatusChange} onDelete={onDelete} canManage={canManage} /> },
      ]}
    />
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
  canManage,
}: {
  company: CompanyListItem;
  disabled?: boolean;
  returnState?: { from: string };
  onStatusChange: (company: CompanyListItem) => void;
  onDelete: (company: CompanyListItem) => void;
  canManage: boolean;
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
        ...(canManage ? [{
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
        }] : []),
      ]}
    />
  );
}
