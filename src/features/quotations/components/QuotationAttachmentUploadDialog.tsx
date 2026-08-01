import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';

import { toApiError } from '@shared/api/apiClient';
import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { uploadQuotationAttachmentRequest } from '../api/quotation-attachments.api';
import { quotationAttachmentsQueryKeys } from '../quotation-attachments.query-keys';
import { formatFileSize } from '../quotation-attachments.utils';

interface QuotationAttachmentUploadDialogProps {
  open: boolean;
  quotationId: number;
  remainingCapacity: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.csv', '.docx', '.xlsx', '.pptx'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

export function QuotationAttachmentUploadDialog({
  open,
  quotationId,
  remainingCapacity,
  onClose,
  onSuccess,
}: QuotationAttachmentUploadDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadQuotationAttachmentRequest(quotationId, file, (evt) => {
        if (evt.total && evt.total > 0) {
          const percent = Math.round((evt.loaded * 100) / evt.total);
          setUploadProgress(percent);
        }
      }),
    onSuccess: (att) => {
      queryClient.invalidateQueries({ queryKey: quotationAttachmentsQueryKeys.list(quotationId) });
      onSuccess(`Uploaded "${att.originalFilename}" successfully`);
      handleClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setUploadProgress(null);
      if (!apiError.cancelled) setValidationError(apiError.message);
    },
  });

  const validateFile = (file: File): boolean => {
    setValidationError(null);

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setValidationError(
        `Unsupported file type "${ext}". Allowed types: PDF, JPG, PNG, WEBP, TXT, CSV, DOCX, XLSX, PPTX.`,
      );
      return false;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(`File size (${formatFileSize(file.size)}) exceeds maximum allowed limit of 20 MB.`);
      return false;
    }

    if (remainingCapacity <= 0) {
      setValidationError('Maximum limit of 20 attachments reached for this quotation.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile && validateFile(selectedFile)) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    if (uploadMutation.isPending) return;
    setSelectedFile(null);
    setValidationError(null);
    setUploadProgress(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      preventClose={uploadMutation.isPending}
      maxWidth="sm"
      fullWidth
      title="Upload Quotation Attachment"
      contentDividers
      actions={
        <>
          <AppButton onClick={handleClose} disabled={uploadMutation.isPending}>
            Cancel
          </AppButton>
          <AppButton
            type="submit"
            form="quotation-attachment-upload-form"
            variant="contained"
            disabled={!selectedFile || remainingCapacity <= 0}
            isLoading={uploadMutation.isPending}
            loadingPosition="start"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Attachment'}
          </AppButton>
        </>
      }
    >
      <Box component="form" id="quotation-attachment-upload-form" onSubmit={handleSubmit} aria-busy={uploadMutation.isPending}>
          <Stack spacing={2.5}>
            <ServerErrorAlert message={validationError} />

            <Typography variant="body2" color="text.secondary">
              Attach supporting documents (technical specifications, layouts, drawings, terms). Attachments are stored securely and separate from generated quotation PDFs.
            </Typography>

            {/* Drag & Drop Dropzone */}
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: '2px dashed',
                borderColor: isDragOver ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                bgcolor: isDragOver ? 'action.hover' : 'background.paper',
                cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={ALLOWED_EXTENSIONS.join(',')}
                style={{ display: 'none' }}
                disabled={uploadMutation.isPending}
                id="attachment-file-input"
              />

              <CloudUploadOutlinedIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {selectedFile ? selectedFile.name : 'Click to select or drag & drop a file'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Supported formats: PDF, JPG, PNG, WEBP, TXT, CSV, DOCX, XLSX, PPTX (Max 20 MB)
              </Typography>
              <Typography variant="caption" color="primary.main" fontWeight={600} display="block" sx={{ mt: 0.5 }}>
                {remainingCapacity} attachment slot{remainingCapacity === 1 ? '' : 's'} remaining
              </Typography>
            </Box>

            {selectedFile && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle2" noWrap fontWeight={600}>
                      {selectedFile.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Size: {formatFileSize(selectedFile.size)}
                    </Typography>
                  </Box>
                  <AppButton
                    size="small"
                    color="error"
                    disabled={uploadMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    Remove
                  </AppButton>
                </Stack>
              </Paper>
            )}

            {uploadMutation.isPending && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Uploading attachment... {uploadProgress !== null ? `${uploadProgress}%` : ''}
                </Typography>
                <LinearProgress variant={uploadProgress !== null ? 'determinate' : 'indeterminate'} value={uploadProgress || 0} />
              </Box>
            )}
          </Stack>
      </Box>
    </AppDialog>
  );
}
