import Alert from '@mui/material/Alert';
import DialogContentText from '@mui/material/DialogContentText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { ConfirmDialog, DeleteConfirmDialog } from '@shared/ui/dialogs';
import type { CategoryListItem } from '../model/categories.types';
import { isProtectedCategory } from '../model/categories.utils';

type StatusDialogProps = {
  category: CategoryListItem | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CategoryStatusDialog({ category, isSubmitting, onClose, onConfirm }: StatusDialogProps) {
  if (!category) return null;
  const isDeactivating = category.isActive;
  const isProtected = isProtectedCategory(category.slug);

  return (
    <ConfirmDialog
      open={Boolean(category)}
      title={isDeactivating ? 'Deactivate Category' : 'Activate Category'}
      confirmLabel={isDeactivating ? 'Deactivate' : 'Activate'}
      confirmColor={isDeactivating ? 'warning' : 'primary'}
      confirmDisabled={isProtected && isDeactivating}
      isConfirming={isSubmitting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        {isProtected && isDeactivating ? (
          <Alert severity="error">
            The default Uncategorised category cannot be deactivated.
          </Alert>
        ) : null}

        <DialogContentText>
          {isDeactivating ? (
            <>
              Are you sure you want to deactivate <strong>{category.name}</strong>?
              <br />
              <br />
              Existing items will retain this category, but inactive categories will not be available for future item creation or updates.
            </>
          ) : (
            <>
              Are you sure you want to activate <strong>{category.name}</strong>? It will become available for item assignment.
            </>
          )}
        </DialogContentText>
      </Stack>
    </ConfirmDialog>
  );
}

type DeleteDialogProps = {
  category: CategoryListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function CategoryDeleteDialog({ category, isDeleting, onClose, onConfirm }: DeleteDialogProps) {
  if (!category) return null;
  const isProtected = isProtectedCategory(category.slug);
  const hasLinkedItems = category.linkedItemCount > 0;

  return (
    <DeleteConfirmDialog
      open={Boolean(category)}
      title="Delete Category"
      confirmLabel="Delete Category"
      confirmDisabled={isProtected || hasLinkedItems}
      isDeleting={isDeleting}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <Stack spacing={2} pt={1}>
        {isProtected ? (
          <Alert severity="error">
            The default Uncategorised category cannot be deleted.
          </Alert>
        ) : null}

        {!isProtected && hasLinkedItems ? (
          <Alert severity="warning">
            This category cannot be deleted because <strong>{category.linkedItemCount}</strong> item(s) are linked to it.
          </Alert>
        ) : null}

        <DialogContentText>
          Are you sure you want to delete <strong>{category.name}</strong> (slug: {category.slug})?
        </DialogContentText>

        <Typography variant="body2" color="text.secondary">
          Note: Deletion is a soft deletion. Deleted categories will no longer appear in normal category lists.
        </Typography>
      </Stack>
    </DeleteConfirmDialog>
  );
}
