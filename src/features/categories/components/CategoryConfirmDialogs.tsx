import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
    <Dialog open={Boolean(category)} onClose={isSubmitting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isDeactivating ? 'Deactivate Category' : 'Activate Category'}</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={isDeactivating ? 'warning' : 'primary'}
          loading={isSubmitting}
          disabled={isProtected && isDeactivating}
        >
          {isDeactivating ? 'Deactivate' : 'Activate'}
        </Button>
      </DialogActions>
    </Dialog>
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
    <Dialog open={Boolean(category)} onClose={isDeleting ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Category</DialogTitle>
      <DialogContent>
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
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          loading={isDeleting}
          disabled={isProtected || hasLinkedItems}
        >
          Delete Category
        </Button>
      </DialogActions>
    </Dialog>
  );
}
