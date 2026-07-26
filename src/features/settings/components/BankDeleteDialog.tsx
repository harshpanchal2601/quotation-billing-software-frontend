import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import type { BankDetail } from '../settings.types';
import { maskAccountNumber } from '../settings.utils';

type BankDeleteDialogProps = {
  bankDetail: BankDetail | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function BankDeleteDialog({ bankDetail, isDeleting, onClose, onConfirm }: BankDeleteDialogProps) {
  return (
    <Dialog open={bankDetail !== null} onClose={() => (!isDeleting ? onClose() : undefined)}>
      <DialogTitle>Delete bank account?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {bankDetail
            ? `This will remove ${bankDetail.bankName} account ${maskAccountNumber(bankDetail.accountNumber)} from future quotations.`
            : 'This bank account will be removed.'}
        </DialogContentText>
        {bankDetail?.isDefault ? (
          <DialogContentText mt={1}>
            This is the default account. Another active account may become default after deletion.
          </DialogContentText>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={onClose} disabled={isDeleting}>Cancel</Button>
        <Button color="error" onClick={() => void onConfirm()} loading={isDeleting} loadingPosition="start">
          {isDeleting ? 'Deleting...' : 'Delete account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
