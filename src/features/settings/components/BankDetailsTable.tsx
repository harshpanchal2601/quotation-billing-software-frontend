import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { AppButton, AppIconButton } from '@shared/ui/actions';
import type { BankDetail } from '../settings.types';
import { maskAccountNumber } from '../settings.utils';

type BankDetailsTableProps = {
  bankDetails: BankDetail[];
  onEdit: (bankDetail: BankDetail) => void;
  onDelete: (bankDetail: BankDetail) => void;
  onSetDefault: (bankDetail: BankDetail) => void;
  busyBankDetailId?: number | null;
};

export function BankDetailsTable({ bankDetails, onEdit, onDelete, onSetDefault, busyBankDetailId }: BankDetailsTableProps) {
  return (
    <>
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table aria-label="Bank details">
          <TableHead>
            <TableRow>
              <TableCell>Bank</TableCell>
              <TableCell>Account name</TableCell>
              <TableCell>Account number</TableCell>
              <TableCell>Account type</TableCell>
              <TableCell>IFSC</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bankDetails.map((bankDetail) => (
              <TableRow key={bankDetail.id}>
                <TableCell>{bankDetail.bankName}</TableCell>
                <TableCell>{bankDetail.accountName}</TableCell>
                <TableCell>{maskAccountNumber(bankDetail.accountNumber)}</TableCell>
                <TableCell>{bankDetail.accountType ?? '-'}</TableCell>
                <TableCell>{bankDetail.ifscCode ?? '-'}</TableCell>
                <TableCell>{bankDetail.branchName ?? '-'}</TableCell>
                <TableCell>
                  {bankDetail.isDefault ? (
                    <Chip size="small" icon={<CheckCircleOutlineOutlinedIcon />} color="primary" label="Default account" />
                  ) : (
                    <Chip size="small" label="Active" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <AppIconButton label={`Edit ${bankDetail.bankName}`} onClick={() => onEdit(bankDetail)} disabled={busyBankDetailId === bankDetail.id}>
                      <EditOutlinedIcon fontSize="small" />
                    </AppIconButton>
                    <AppIconButton
                      label={`Set ${bankDetail.bankName} as default`}
                      onClick={() => onSetDefault(bankDetail)}
                      disabled={busyBankDetailId === bankDetail.id || bankDetail.isDefault}
                    >
                      <StarBorderOutlinedIcon fontSize="small" />
                    </AppIconButton>
                    <AppIconButton label={`Delete ${bankDetail.bankName}`} color="error" onClick={() => onDelete(bankDetail)} disabled={busyBankDetailId === bankDetail.id}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </AppIconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {bankDetails.map((bankDetail) => (
          <Paper key={bankDetail.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <Typography variant="h3">{bankDetail.bankName}</Typography>
                  {bankDetail.isDefault ? <Chip size="small" icon={<CheckCircleOutlineOutlinedIcon />} color="primary" label="Default" /> : null}
                </Stack>
                <Typography color="text.secondary">{bankDetail.accountName}</Typography>
              </Box>
              <Typography>Account: {maskAccountNumber(bankDetail.accountNumber)}</Typography>
              <Typography color="text.secondary">IFSC: {bankDetail.ifscCode ?? '-'} · Branch: {bankDetail.branchName ?? '-'}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <AppButton size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(bankDetail)} disabled={busyBankDetailId === bankDetail.id}>Edit</AppButton>
                <AppButton size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => onSetDefault(bankDetail)} disabled={bankDetail.isDefault} isLoading={busyBankDetailId === bankDetail.id}>
                  {busyBankDetailId === bankDetail.id ? 'Updating...' : 'Set default'}
                </AppButton>
                <AppButton size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(bankDetail)} disabled={busyBankDetailId === bankDetail.id}>Delete</AppButton>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
