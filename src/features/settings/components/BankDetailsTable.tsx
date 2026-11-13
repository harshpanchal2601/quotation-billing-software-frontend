import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import Chip from '@mui/material/Chip';

import { RecordTable, RowActionsMenu } from '@shared/ui/tables';
import type { BankDetail } from '../model/settings.types';
import { maskAccountNumber } from '../model/settings.utils';

type BankDetailsTableProps = {
  bankDetails: BankDetail[];
  onEdit: (bankDetail: BankDetail) => void;
  onDelete: (bankDetail: BankDetail) => void;
  onSetDefault: (bankDetail: BankDetail) => void;
  busyBankDetailId?: number | null;
  isBusy?: boolean;
};

export function BankDetailsTable({ bankDetails, onEdit, onDelete, onSetDefault, busyBankDetailId, isBusy = false }: BankDetailsTableProps) {
  return <RecordTable rows={bankDetails} label="Bank details" rowKey={(bankDetail) => bankDetail.id} emptyMessage="No bank accounts yet. Add a bank account to include payment details on your documents." columns={[
    { key: 'bank', label: 'Bank', sortValue: (bankDetail) => bankDetail.bankName, render: (bankDetail) => bankDetail.bankName },
    { key: 'accountName', label: 'Account name', sortValue: (bankDetail) => bankDetail.accountName, render: (bankDetail) => bankDetail.accountName },
    { key: 'accountNumber', label: 'Account number', noWrap: true, sortValue: (bankDetail) => maskAccountNumber(bankDetail.accountNumber), render: (bankDetail) => maskAccountNumber(bankDetail.accountNumber) },
    { key: 'accountType', label: 'Account type', minWidth: 112, sortValue: (bankDetail) => bankDetail.accountType, render: (bankDetail) => bankDetail.accountType ?? '—' },
    { key: 'ifsc', label: 'IFSC', minWidth: 96, sortValue: (bankDetail) => bankDetail.ifscCode, render: (bankDetail) => bankDetail.ifscCode ?? '—' },
    { key: 'branch', label: 'Branch', sortValue: (bankDetail) => bankDetail.branchName, render: (bankDetail) => bankDetail.branchName ?? '—' },
    { key: 'status', label: 'Status', minWidth: 96, sortValue: (bankDetail) => bankDetail.isDefault ? 'Default account' : 'Active', render: (bankDetail) => bankDetail.isDefault ? <Chip size="small" icon={<CheckCircleOutlineOutlinedIcon />} color="primary" label="Default account" /> : <Chip size="small" label="Active" /> },
    { key: 'actions', label: 'Actions', align: 'right', minWidth: 72, render: (bankDetail) => <RowActionsMenu triggerLabel={`Actions for ${bankDetail.bankName}`} disabled={isBusy || busyBankDetailId === bankDetail.id} actions={[
      { key: 'edit', label: 'Edit account', onSelect: () => onEdit(bankDetail) },
      { key: 'default', label: 'Set as default', disabled: bankDetail.isDefault, onSelect: () => onSetDefault(bankDetail) },
      { key: 'delete', label: 'Delete account', destructive: true, onSelect: () => onDelete(bankDetail) },
    ]} /> },
  ]} />;
}
