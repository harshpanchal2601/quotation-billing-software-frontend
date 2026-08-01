import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { DeleteConfirmDialog } from '@shared/ui/dialogs';
import type { BankDetail } from '../model/settings.types';
import { maskAccountNumber } from '../model/settings.utils';

type BankDeleteDialogProps = {
  bankDetail: BankDetail | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function BankDeleteDialog({ bankDetail, isDeleting, onClose, onConfirm }: BankDeleteDialogProps) {
  return (
    <DeleteConfirmDialog
      open={bankDetail !== null}
      title="Delete bank account?"
      confirmLabel={isDeleting ? 'Deleting...' : 'Delete account'}
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={() => void onConfirm()}
    >
      <Stack spacing={1}>
        <Typography color="text.secondary">
          {bankDetail
            ? `This will remove ${bankDetail.bankName} account ${maskAccountNumber(bankDetail.accountNumber)} from future quotations.`
            : 'This bank account will be removed.'}
        </Typography>
        {bankDetail?.isDefault ? (
          <Typography color="text.secondary">
            This is the default account. Another active account may become default after deletion.
          </Typography>
        ) : null}
      </Stack>
    </DeleteConfirmDialog>
  );
}
