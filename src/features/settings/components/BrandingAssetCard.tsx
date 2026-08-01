import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import UploadOutlinedIcon from '@mui/icons-material/UploadOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

import { SafeImage } from '@shared/components/common/SafeImage';
import { AppButton } from '@shared/ui/actions';
import type { BrandingAssetType } from '../settings.types';
import { resolveAssetUrl } from '../settings.utils';

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024;

type BrandingAssetCardProps = {
  assetType: BrandingAssetType;
  title: string;
  description: string;
  imageUrl: string | null;
  updatedAt?: string;
  isBusy: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
};

export function BrandingAssetCard({
  title,
  description,
  imageUrl,
  updatedAt,
  isBusy,
  onUpload,
  onDelete,
}: BrandingAssetCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const displayUrl = previewUrl ?? resolveAssetUrl(imageUrl, updatedAt);
  const busyLabel = fileName ? `Uploading ${fileName}...` : 'Updating image...';

  useEffect(() => () => {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function clearInput() {
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    const file = files?.[0];
    setError(null);
    if (files === null || file === undefined) return;
    if (files.length !== 1) {
      setError('Select one image file.');
      clearInput();
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      setError('Use a JPEG, PNG or WebP image.');
      clearInput();
      return;
    }
    if (file.size > maxFileSize) {
      setError('Image must be 5 MB or smaller.');
      clearInput();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current !== null) URL.revokeObjectURL(current);
      return objectUrl;
    });
    setFileName(file.name);

    try {
      await onUpload(file);
      setFileName(null);
      setPreviewUrl((current) => {
        if (current !== null) URL.revokeObjectURL(current);
        return null;
      });
      clearInput();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    }
  }

  async function handleDelete() {
    try {
      await onDelete();
      setConfirmOpen(false);
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed.');
    }
  }

  return (
    <Card variant="outlined" sx={{ height: '100%' }} aria-busy={isBusy}>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h3">{title}</Typography>
            <Typography variant="body2" color="text.secondary">{description}</Typography>
          </Box>
          <Box
            sx={{
              height: 150,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.default',
              display: 'grid',
              placeItems: 'center',
              p: 1.5,
              mb: 1,
              overflow: 'hidden',
            }}
          >
            <SafeImage
              src={displayUrl}
              alt={`${title} preview`}
              fallbackLabel={`${title} image unavailable`}
              imgSx={{ maxWidth: '100%', maxHeight: '100%' }}
              fallback={(
                <Stack spacing={1} alignItems="center" color="text.secondary" role="img" aria-label={`${title} image unavailable`}>
                  <ImageOutlinedIcon />
                  <Typography variant="body2">No image uploaded</Typography>
                </Stack>
              )}
            />
          </Box>
          {fileName ? <Typography variant="body2">Selected: {fileName}</Typography> : null}
          {isBusy ? (
            <Box role="status" aria-live="polite">
              <Typography variant="body2" color="text.secondary" mb={0.5}>{busyLabel}</Typography>
              <LinearProgress aria-label={busyLabel} />
            </Box>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <AppButton component="label" variant="outlined" startIcon={<UploadOutlinedIcon />} disabled={isBusy} isLoading={isBusy && fileName !== null}>
              {isBusy && fileName !== null ? 'Uploading...' : imageUrl ? 'Replace image' : 'Select image'}
              <input
                ref={inputRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void handleFileChange(event)}
              />
            </AppButton>
            <AppButton
              variant="text"
              color="error"
              startIcon={<DeleteOutlineOutlinedIcon />}
              disabled={isBusy || imageUrl === null}
              isLoading={isBusy && fileName === null}
              onClick={() => setConfirmOpen(true)}
            >
              {isBusy && fileName === null ? 'Removing...' : 'Remove image'}
            </AppButton>
          </Stack>
        </Stack>
      </CardContent>
      <Dialog open={confirmOpen} onClose={() => (!isBusy ? setConfirmOpen(false) : undefined)}>
        <DialogTitle>Remove {title.toLowerCase()}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This removes the current branding image. You can upload a replacement later.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton autoFocus onClick={() => setConfirmOpen(false)} disabled={isBusy}>Cancel</AppButton>
          <AppButton color="error" onClick={() => void handleDelete()} isLoading={isBusy}>Remove</AppButton>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
