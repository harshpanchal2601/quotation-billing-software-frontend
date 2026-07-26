import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Popover from '@mui/material/Popover';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { QuotationListItem } from '../quotations.types';
import { formatCurrency } from '../quotations.utils';
import { QuotationStatusChip } from './QuotationStatusChip';

type QuotationTableProps = {
  quotations: QuotationListItem[];
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
};

export function QuotationTable({
  quotations,
  onOpenStatusDialog,
  onOpenDeleteDialog,
}: QuotationTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<QuotationListItem | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, quotation: QuotationListItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedQuotation(quotation);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setSelectedQuotation(null);
  };

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {quotations.map((quo) => (
          <Card
            key={quo.id}
            variant="outlined"
            onClick={() => navigate(`/quotations/${quo.id}`)}
            sx={{ cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <QuotationStatusChip status={quo.status} />
                  <IconButton
                    size="small"
                    onClick={(e) => handleOpenMenu(e, quo)}
                    aria-label={`Actions for ${quo.quotationNumber}`}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(quo.quotationDate).toLocaleDateString()} • {quo.itemCount} items
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {formatCurrency(quo.grandTotal, quo.currency)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}

        <ActionPopover
          anchorEl={anchorEl}
          quotation={selectedQuotation}
          onClose={handleCloseMenu}
          onOpenStatusDialog={onOpenStatusDialog}
          onOpenDeleteDialog={onOpenDeleteDialog}
        />
      </Box>
    );
  }

  return (
    <TableContainer component={Box} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="medium">
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
              onClick={() => navigate(`/quotations/${quo.id}`)}
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
                <IconButton
                  size="small"
                  onClick={(e) => handleOpenMenu(e, quo)}
                  aria-label={`Actions for ${quo.quotationNumber}`}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ActionPopover
        anchorEl={anchorEl}
        quotation={selectedQuotation}
        onClose={handleCloseMenu}
        onOpenStatusDialog={onOpenStatusDialog}
        onOpenDeleteDialog={onOpenDeleteDialog}
      />
    </TableContainer>
  );
}

type ActionPopoverProps = {
  anchorEl: HTMLElement | null;
  quotation: QuotationListItem | null;
  onClose: () => void;
  onOpenStatusDialog: (quotation: QuotationListItem) => void;
  onOpenDeleteDialog: (quotation: QuotationListItem) => void;
};

function ActionPopover({
  anchorEl,
  quotation,
  onClose,
  onOpenStatusDialog,
  onOpenDeleteDialog,
}: ActionPopoverProps) {
  const navigate = useNavigate();

  if (!quotation) return null;
  const canEdit = quotation.canEdit;

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MenuList sx={{ minWidth: 160 }}>
        <MenuItem
          onClick={() => {
            onClose();
            navigate(`/quotations/${quotation.id}`);
          }}
        >
          <VisibilityOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          View Details
        </MenuItem>

        {canEdit ? (
          <MenuItem
            onClick={() => {
              onClose();
              navigate(`/quotations/${quotation.id}/edit`);
            }}
          >
            <EditOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            Edit Draft
          </MenuItem>
        ) : null}

        <MenuItem
          onClick={() => {
            onClose();
            onOpenStatusDialog(quotation);
          }}
        >
          <SwapHorizOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          Update Status
        </MenuItem>

        {canEdit ? (
          <MenuItem
            onClick={() => {
              onClose();
              onOpenDeleteDialog(quotation);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
            Delete Draft
          </MenuItem>
        ) : null}
      </MenuList>
    </Popover>
  );
}
