import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { SafeImage } from '@shared/components/common/SafeImage';
import { toApiError } from '@shared/api/apiClient';
import { deleteItemImageRequest, uploadItemImageRequest } from '../api/items.api';
import { itemsQueryKeys } from '../items.query-keys';
import type { ItemDetail } from '../items.types';
import { resolveAssetUrl } from '../items.utils';

type ItemImageSectionProps = {
  item: ItemDetail;
  onSuccess?: (message: string) => void;
};

export function ItemImageSection({ item, onSuccess }: ItemImageSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadItemImageRequest(item.id, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      clearSelectedFile();
      if (onSuccess) onSuccess('Item image uploaded successfully.');
    },
    onError: (error) => {
      setErrorMessage(toApiError(error).message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteItemImageRequest(item.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsQueryKeys.all });
      setDeleteConfirmOpen(false);
      if (onSuccess) onSuccess('Item image removed.');
    },
    onError: (error) => {
      setErrorMessage(toApiError(error).message);
    },
  });

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image file must be 5 MB or smaller.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Unsupported image type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFile(file);
  }

  function clearSelectedFile() {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleConfirmUpload() {
    if (!selectedFile) return;
    setErrorMessage(null);
    try {
      await uploadMutation.mutateAsync(selectedFile);
    } catch {
      // Upload error is shown by mutation onError; keep the local preview for retry.
    }
  }

  const currentDisplayUrl = previewUrl ?? resolveAssetUrl(item.imageUrl);
  const isBusy = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Product Image
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload a clear product image (JPEG, PNG or WebP, max 5 MB).
            </Typography>
          </Box>

          {errorMessage ? <Alert severity="error" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert> : null}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Box
              sx={{
                width: 140,
                height: 140,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <SafeImage
                src={currentDisplayUrl}
                alt={item.name}
                fallbackLabel="No Image"
                imgSx={{ p: 1 }}
                fallback={(
                  <Stack spacing={0.5} alignItems="center" color="text.secondary" role="img" aria-label="No Image">
                    <ImageOutlinedIcon fontSize="large" />
                    <Typography variant="caption">No Image</Typography>
                  </Stack>
                )}
              />
            </Box>

            <Stack spacing={1.5} flex={1}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {selectedFile ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<CloudUploadOutlinedIcon />}
                      onClick={() => void handleConfirmUpload()}
                      loading={uploadMutation.isPending}
                    >
                      Save Image
                    </Button>
                    <Button variant="outlined" onClick={clearSelectedFile} disabled={isBusy}>
                      Cancel Selection
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadOutlinedIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isBusy}
                    >
                      {item.imageUrl ? 'Replace Image' : 'Select Image'}
                    </Button>
                    {item.imageUrl ? (
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineOutlinedIcon />}
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={isBusy}
                      >
                        Remove Image
                      </Button>
                    ) : null}
                  </>
                )}
              </Stack>

              <Typography variant="caption" color="text.secondary">
                {selectedFile
                  ? `Selected file: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                  : 'Supported formats: JPG, PNG, WebP. Maximum file size: 5 MB.'}
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>

      <Dialog open={deleteConfirmOpen} onClose={isBusy ? undefined : () => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Product Image</DialogTitle>
        <DialogContent>
          <DialogContentText pt={1}>
            Are you sure you want to remove the image for <strong>{item.name}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void deleteMutation.mutateAsync().catch(() => undefined)}
            loading={deleteMutation.isPending}
          >
            Remove Image
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
