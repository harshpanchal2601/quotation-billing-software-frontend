import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ConfirmDialog, DeleteConfirmDialog } from '@shared/ui/dialogs';

import type { CompanyListItem } from '../model/companies.types';

type DeleteCompanyDialogProps = {
  company: Pick<CompanyListItem, 'name' | 'companyCode'> | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function DeleteCompanyDialog({ company, isDeleting, onClose, onConfirm }: DeleteCompanyDialogProps) {
  return (
    <DeleteConfirmDialog
      open={company !== null}
      title="Delete company?"
      confirmLabel={isDeleting ? 'Deleting...' : 'Delete company'}
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={() => void onConfirm().catch(() => undefined)}
    >
      <Stack spacing={1}>
        <Typography color="text.secondary">
          {company ? `${company.name} (${company.companyCode}) will be soft deleted and hidden from company lists.` : 'This company will be soft deleted.'}
        </Typography>
        <Typography color="text.secondary">
          Companies linked to quotations cannot be deleted.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
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
    <ConfirmDialog
      open={company !== null}
      title={nextActive ? 'Activate company?' : 'Deactivate company?'}
      confirmLabel={isSubmitting ? 'Updating...' : nextActive ? 'Activate' : 'Deactivate'}
      isConfirming={isSubmitting}
      onClose={onClose}
      onConfirm={() => void onConfirm().catch(() => undefined)}
    >
      <Stack spacing={1}>
        <Typography color="text.secondary">
          {company ? `${company.name} (${company.companyCode}) will be marked ${nextActive ? 'active' : 'inactive'}.` : 'The company status will change.'}
        </Typography>
        {!nextActive ? (
          <Typography color="text.secondary">
            Inactive companies remain in quotation history but cannot be selected for new quotations later.
          </Typography>
        ) : null}
      </Stack>
    </ConfirmDialog>
  );
}
