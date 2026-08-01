import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

import { AppButton } from '@shared/ui/actions';

import type { CompanyListItem } from '../companies.types';

type DeleteCompanyDialogProps = {
  company: Pick<CompanyListItem, 'name' | 'companyCode'> | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteCompanyDialog({ company, isDeleting, onClose, onConfirm }: DeleteCompanyDialogProps) {
  return (
    <Dialog open={company !== null} onClose={() => (!isDeleting ? onClose() : undefined)}>
      <DialogTitle>Delete company?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {company ? `${company.name} (${company.companyCode}) will be soft deleted and hidden from company lists.` : 'This company will be soft deleted.'}
        </DialogContentText>
        <DialogContentText mt={1}>
          Companies linked to quotations cannot be deleted.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <AppButton autoFocus onClick={onClose} disabled={isDeleting}>Cancel</AppButton>
        <AppButton color="error" onClick={() => void onConfirm().catch(() => undefined)} isLoading={isDeleting} loadingPosition="start">
          {isDeleting ? 'Deleting...' : 'Delete company'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}

type StatusDialogProps = {
  company: Pick<CompanyListItem, 'name' | 'companyCode' | 'isActive'> | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function CompanyStatusDialog({ company, isSubmitting, onClose, onConfirm }: StatusDialogProps) {
  const nextActive = company ? !company.isActive : false;
  return (
    <Dialog open={company !== null} onClose={() => (!isSubmitting ? onClose() : undefined)}>
      <DialogTitle>{nextActive ? 'Activate company?' : 'Deactivate company?'}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {company ? `${company.name} (${company.companyCode}) will be marked ${nextActive ? 'active' : 'inactive'}.` : 'The company status will change.'}
        </DialogContentText>
        {!nextActive ? (
          <DialogContentText mt={1}>
            Inactive companies remain in quotation history but cannot be selected for new quotations later.
          </DialogContentText>
        ) : null}
      </DialogContent>
      <DialogActions>
        <AppButton autoFocus onClick={onClose} disabled={isSubmitting}>Cancel</AppButton>
        <AppButton variant="contained" onClick={() => void onConfirm().catch(() => undefined)} isLoading={isSubmitting} loadingPosition="start">
          {isSubmitting ? 'Updating...' : nextActive ? 'Activate' : 'Deactivate'}
        </AppButton>
      </DialogActions>
    </Dialog>
  );
}
