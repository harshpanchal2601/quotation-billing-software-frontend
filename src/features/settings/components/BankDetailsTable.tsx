import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { BankDetail } from '../settings.types';
import { maskAccountNumber } from '../settings.utils';

type BankDetailsTableProps = {
  bankDetails: BankDetail[];
  onEdit: (bankDetail: BankDetail) => void;
  onDelete: (bankDetail: BankDetail) => void;
  onSetDefault: (bankDetail: BankDetail) => void;
  disabled?: boolean;
};

export function BankDetailsTable({ bankDetails, onEdit, onDelete, onSetDefault, disabled }: BankDetailsTableProps) {
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
                    <IconButton aria-label={`Edit ${bankDetail.bankName}`} onClick={() => onEdit(bankDetail)} disabled={disabled}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label={`Set ${bankDetail.bankName} as default`}
                      onClick={() => onSetDefault(bankDetail)}
                      disabled={disabled || bankDetail.isDefault}
                    >
                      <StarBorderOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label={`Delete ${bankDetail.bankName}`} color="error" onClick={() => onDelete(bankDetail)} disabled={disabled}>
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
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
                <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(bankDetail)} disabled={disabled}>Edit</Button>
                <Button size="small" startIcon={<StarBorderOutlinedIcon />} onClick={() => onSetDefault(bankDetail)} disabled={disabled || bankDetail.isDefault}>
                  Set default
                </Button>
                <Button size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => onDelete(bankDetail)} disabled={disabled}>Delete</Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </>
  );
}

