import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import { RecordTable, RowActionsMenu, type TableSorting } from '@shared/ui/tables';
import type { QuotationListItem } from '../model/quotations.types';
import { formatCurrency } from '../model/quotations.utils';
import { QuotationStatusChip } from './QuotationStatusChip';

type QuotationTableProps = {
  rowNumberStart?: number;
  quotations: QuotationListItem[];
  sorting?: TableSorting;
  returnState?: { from: string };
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
  canEdit?: boolean;
  canUpdateStatus?: boolean;
  canDelete?: boolean;
};

export function QuotationTable({
  rowNumberStart = 1,
  quotations,
  sorting,
  returnState,
  onOpenStatusDialog,
  onOpenDeleteDialog,
  canEdit = false,
  canUpdateStatus = false,
  canDelete = false,
}: QuotationTableProps) {
  return (
    <RecordTable
      rows={quotations}
      rowKey={(quotation) => quotation.id}
      label="Quotations"
      rowNumberStart={rowNumberStart}
      sorting={sorting}
      showSortControls={false}
      columns={[
        {
          key: 'quotationNumber', label: 'Quotation number', sortKey: 'quotationNumber', minWidth: 240,
          render: (quotation) => (
            <Box>
              <Link component={RouterLink} to={`/quotations/${quotation.id}`} state={returnState} variant="body2" fontWeight={700} color="primary.main" underline="hover">
                {quotation.quotationNumber}
              </Link>
              <Typography variant="caption" color="text.secondary" display="block">Revision #{quotation.revisionNumber}</Typography>
            </Box>
          ),
        },
        {
          key: 'customer', label: 'Customer', minWidth: 200,
          render: (quotation) => (
            <Box>
              <Typography variant="body2" fontWeight={600}>{quotation.companyNameSnapshot}</Typography>
              {quotation.companyGstinSnapshot ? <Typography variant="caption" color="text.secondary">GSTIN: {quotation.companyGstinSnapshot}</Typography> : null}
            </Box>
          ),
        },
        { key: 'quotationDate', label: 'Quote date', sortKey: 'quotationDate', noWrap: true, minWidth: 124, render: (quotation) => new Date(quotation.quotationDate).toLocaleDateString() },
        { key: 'validUntil', label: 'Valid until', sortKey: 'validUntil', noWrap: true, minWidth: 124, render: (quotation) => quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-' },
        { key: 'itemCount', label: 'Items', align: 'center', minWidth: 72, render: (quotation) => quotation.itemCount },
        { key: 'status', label: 'Status', noWrap: true, minWidth: 140, render: (quotation) => <QuotationStatusChip status={quotation.status} /> },
        { key: 'grandTotal', label: 'Grand total', sortKey: 'grandTotal', align: 'right', minWidth: 160, render: (quotation) => <Typography variant="body2" fontWeight={700}>{formatCurrency(quotation.grandTotal, quotation.currency)}</Typography> },
        {
          key: 'actions', label: 'Actions', align: 'right', minWidth: 80,
          render: (quotation) => <QuotationActionsMenu quotation={quotation} returnState={returnState} onOpenStatusDialog={onOpenStatusDialog} onOpenDeleteDialog={onOpenDeleteDialog} canEdit={canEdit} canUpdateStatus={canUpdateStatus} canDelete={canDelete} />,
        },
      ]}
    />
  );
}

type QuotationActionsMenuProps = {
  quotation: QuotationListItem | null;
  returnState?: { from: string };
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
  canEdit: boolean;
  canUpdateStatus: boolean;
  canDelete: boolean;
};

function QuotationActionsMenu({
  quotation,
  returnState,
  onOpenStatusDialog,
  onOpenDeleteDialog,
  canEdit: hasEditPermission,
  canUpdateStatus,
  canDelete,
}: QuotationActionsMenuProps) {
  const navigate = useNavigate();

  if (!quotation) return null;
  const canEdit = quotation.canEdit && hasEditPermission;

  return (
    <RowActionsMenu
      triggerLabel={`Actions for ${quotation.quotationNumber}`}
      stopPropagationOnTrigger
      actions={[
        {
          key: 'view',
          label: <><VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> View Details</>,
          onSelect: () => navigate(`/quotations/${quotation.id}`, { state: returnState }),
        },
        ...(canEdit
          ? [{
              key: 'edit',
              label: <><EditOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Edit Draft</>,
              onSelect: () => navigate(`/quotations/${quotation.id}/edit`, { state: returnState }),
            }]
          : []),
        ...(canUpdateStatus ? [{
          key: 'status',
          label: <><SwapHorizOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Update Status</>,
          onSelect: () => onOpenStatusDialog(quotation),
        }] : []),
        ...(quotation.canEdit && canDelete
          ? [{
              key: 'delete',
              label: <><DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Delete Draft</>,
              destructive: true,
              onSelect: () => onOpenDeleteDialog(quotation),
            }]
          : []),
      ]}
    />
  );
}
