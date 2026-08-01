import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';

import { DataTableShell, RowActionsMenu } from '@shared/ui/tables';
import type { QuotationListItem } from '../quotations.types';
import { formatCurrency } from '../quotations.utils';
import { QuotationStatusChip } from './QuotationStatusChip';

type QuotationTableProps = {
  quotations: QuotationListItem[];
  returnState?: { from: string };
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
};

export function QuotationTable({
  quotations,
  returnState,
  onOpenStatusDialog,
  onOpenDeleteDialog,
}: QuotationTableProps) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  if (isCompact) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {quotations.map((quo) => (
          <Card
            key={quo.id}
            variant="outlined"
            onClick={() => navigate(`/quotations/${quo.id}`, { state: returnState })}
            sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1, gap: 1 }}>
                <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ wordBreak: 'break-word' }}>
                    {quo.quotationNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Revision #{quo.revisionNumber}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ wordBreak: 'break-word' }}>
                    {quo.companyNameSnapshot}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <QuotationStatusChip status={quo.status} />
                  <QuotationActionsMenu
                    quotation={quo}
                    returnState={returnState}
                    onOpenStatusDialog={onOpenStatusDialog}
                    onOpenDeleteDialog={onOpenDeleteDialog}
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 2, gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
                  {new Date(quo.quotationDate).toLocaleDateString()} • {quo.itemCount} items
                </Typography>
                <Typography variant="subtitle2" fontWeight={700} sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
                  {formatCurrency(quo.grandTotal, quo.currency)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <DataTableShell
      isLoading={false}
      isError={false}
      isEmpty={false}
      loadingContent={null}
      errorContent={null}
      emptyContent={null}
      tableContainerProps={{ component: Box, sx: { border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}
    >
      <Table size="medium" sx={{ minWidth: 920 }}>
        <TableHead sx={{ bgcolor: 'grey.50' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Quotation Number</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Quote Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Valid Until</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700 }}>Items</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Grand Total</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {quotations.map((quo) => (
            <TableRow
              key={quo.id}
              hover
              onClick={() => navigate(`/quotations/${quo.id}`, { state: returnState })}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontWeight: 600, color: 'primary.main', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ wordBreak: 'break-word' }}>
                  {quo.quotationNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Revision #{quo.revisionNumber}
                </Typography>
              </TableCell>
              <TableCell sx={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                  {quo.companyNameSnapshot}
                </Typography>
                {quo.companyGstinSnapshot ? (
                  <Typography variant="caption" color="text.secondary">
                    GSTIN: {quo.companyGstinSnapshot}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>{new Date(quo.quotationDate).toLocaleDateString()}</TableCell>
              <TableCell>
                {quo.validUntil ? new Date(quo.validUntil).toLocaleDateString() : '-'}
              </TableCell>
              <TableCell align="center">{quo.itemCount}</TableCell>
              <TableCell>
                <QuotationStatusChip status={quo.status} />
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {formatCurrency(quo.grandTotal, quo.currency)}
              </TableCell>
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <QuotationActionsMenu
                  quotation={quo}
                  returnState={returnState}
                  onOpenStatusDialog={onOpenStatusDialog}
                  onOpenDeleteDialog={onOpenDeleteDialog}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

type QuotationActionsMenuProps = {
  quotation: QuotationListItem | null;
  returnState?: { from: string };
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
};

function QuotationActionsMenu({
  quotation,
  returnState,
  onOpenStatusDialog,
  onOpenDeleteDialog,
}: QuotationActionsMenuProps) {
  const navigate = useNavigate();

  if (!quotation) return null;
  const canEdit = quotation.canEdit;

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
        {
          key: 'status',
          label: <><SwapHorizOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} /> Update Status</>,
          onSelect: () => onOpenStatusDialog(quotation),
        },
        ...(canEdit
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
