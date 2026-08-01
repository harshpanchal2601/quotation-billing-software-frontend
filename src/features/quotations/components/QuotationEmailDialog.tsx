import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { ServerErrorAlert } from '@shared/ui/feedback';
import { getQuotationAttachmentsRequest } from '../api/quotation-attachments.api';
import { sendQuotationEmailRequest } from '../api/quotation-documents.api';
import { toApiError } from '@shared/api/apiClient';
import type { GeneratedDocumentHistoryItem } from '../quotation-documents.types';
import type { QuotationDetail } from '../quotations.types';
import { quotationAttachmentsQueryKeys } from '../quotation-attachments.query-keys';
import { formatFileSize } from '../quotation-attachments.utils';

interface QuotationEmailDialogProps {
  open: boolean;
  quotation: QuotationDetail;
  document: GeneratedDocumentHistoryItem | null;
  businessName?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

function parseEmailList(input: string): string[] {
  return input
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function QuotationEmailDialog({
  open,
  quotation,
  document: selectedDocument,
  businessName = 'Buminex Pharmtech Solutions',
  onClose,
  onSuccess,
}: QuotationEmailDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [toInput, setToInput] = useState<string>('');
  const [ccInput, setCcInput] = useState<string>('');
  const [bccInput, setBccInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch supporting attachments
  const { data: attachmentsData } = useQuery({
    queryKey: quotationAttachmentsQueryKeys.list(quotation.id),
    queryFn: () => getQuotationAttachmentsRequest(quotation.id),
    enabled: open && Boolean(quotation.id),
  });

  const attachments = attachmentsData?.attachments || [];

  useEffect(() => {
    if (open) {
      const contactEmail = quotation.contactEmailSnapshot || '';
      const contactName = quotation.contactNameSnapshot || 'Valued Customer';

      setToInput(contactEmail);
      setCcInput('');
      setBccInput('');
      setSubject(`Quotation ${quotation.quotationNumber} from ${businessName}`);
      setMessage(
        `Dear ${contactName},\n\nPlease find attached quotation ${quotation.quotationNumber} for your review.\n\nPlease contact us if you require any clarification.\n\nRegards,\n${businessName}`,
      );
      setSelectedAttachmentIds([]);
      setError(null);
    }
  }, [open, quotation, businessName]);

  // Calculate cumulative size of selected attachments
  const selectedAttachments = attachments.filter((att) => selectedAttachmentIds.includes(att.id));
  const cumulativeAttachmentsSize = selectedAttachments.reduce((sum, att) => sum + att.fileSize, 0);
  const isSizeOverLimit = cumulativeAttachmentsSize > MAX_TOTAL_SIZE_BYTES;

  const emailMutation = useMutation({
    mutationFn: () => {
      if (!selectedDocument) {
        throw new Error('No generated PDF document selected');
      }

      const to = parseEmailList(toInput);
      const cc = parseEmailList(ccInput);
      const bcc = parseEmailList(bccInput);

      if (to.length === 0) {
        throw new Error('At least one primary recipient (To) email address is required');
      }

      return sendQuotationEmailRequest(quotation.id, {
        generatedDocumentId: selectedDocument.id,
        to,
        cc,
        bcc,
        subject,
        message,
        attachmentIds: selectedAttachmentIds,
      });
    },
    onSuccess: (res) => {
      onSuccess(res.message);
      handleClose();
    },
    onError: (error) => {
      const apiError = toApiError(error);
      if (!apiError.cancelled) setError(apiError.message);
    },
  });

  const handleToggleAttachment = (id: number) => {
    setSelectedAttachmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleClose = () => {
    if (emailMutation.isPending) return;
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailMutation.isPending && !isSizeOverLimit) {
      emailMutation.mutate();
    }
  };

  if (!selectedDocument) return null;

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      preventClose={emailMutation.isPending}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      title={
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmailOutlinedIcon color="primary" />
          <Typography variant="h6" component="span" fontWeight={600}>
            Send Quotation Email
          </Typography>
        </Stack>
      }
      titleProps={{ sx: { pb: 1 } }}
      contentDividers
      actionsProps={{ sx: { p: 2, justifyContent: 'space-between' } }}
      actions={
        <>
          <Typography variant="caption" color="text.secondary">
            SMTP acceptance does not confirm recipient inbox delivery.
          </Typography>
          <Stack direction="row" spacing={1}>
            <AppButton onClick={handleClose} disabled={emailMutation.isPending}>
              Cancel
            </AppButton>
            <AppButton
              type="submit"
              form="quotation-email-form"
              variant="contained"
              disabled={!toInput.trim() || !subject.trim() || !message.trim() || isSizeOverLimit}
              isLoading={emailMutation.isPending}
              loadingPosition="start"
              startIcon={<EmailOutlinedIcon />}
            >
              {emailMutation.isPending ? 'Sending email...' : 'Send Email'}
            </AppButton>
          </Stack>
        </>
      }
    >
      <Box component="form" id="quotation-email-form" onSubmit={handleSubmit} aria-busy={emailMutation.isPending}>
          <Stack spacing={2.5}>
            <ServerErrorAlert message={error} />

            {/* Document summary card */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.50', borderColor: 'primary.200' }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <PictureAsPdfOutlinedIcon color="primary" />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} color="primary.dark">
                    Attached Quotation PDF: {selectedDocument.displayFilename}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Version {selectedDocument.versionNumber} • Generated on {new Date(selectedDocument.generatedAt).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            {/* Recipients */}
            <Stack spacing={2}>
              <TextField
                label="To (Recipients)"
                placeholder="customer@example.com (separated by commas)"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                required
                fullWidth
                size="small"
                disabled={emailMutation.isPending}
                helperText="At least one valid recipient email is required"
              />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="CC (Optional)"
                  placeholder="manager@example.com"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={emailMutation.isPending}
                />
                <TextField
                  label="BCC (Optional)"
                  placeholder="audit@example.com"
                  value={bccInput}
                  onChange={(e) => setBccInput(e.target.value)}
                  fullWidth
                  size="small"
                  disabled={emailMutation.isPending}
                />
              </Stack>
            </Stack>

            {/* Subject */}
            <TextField
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              fullWidth
              size="small"
              disabled={emailMutation.isPending}
              inputProps={{ maxLength: 200 }}
            />

            {/* Message Body */}
            <TextField
              label="Message Body"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              fullWidth
              multiline
              rows={5}
              disabled={emailMutation.isPending}
              helperText="Internal notes are strictly excluded from customer emails."
            />

            {/* Optional Supporting Attachments */}
            {attachments.length > 0 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Select Optional Supporting Attachments ({selectedAttachmentIds.length} selected)
                </Typography>

                <Paper variant="outlined" sx={{ p: 1.5, maxHeight: 180, overflowY: 'auto' }}>
                  <Stack spacing={1}>
                    {attachments.map((att) => (
                      <FormControlLabel
                        key={att.id}
                        control={
                          <Checkbox
                            checked={selectedAttachmentIds.includes(att.id)}
                            onChange={() => handleToggleAttachment(att.id)}
                            disabled={emailMutation.isPending}
                            size="small"
                          />
                        }
                        label={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <AttachFileOutlinedIcon fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight={500}>
                              {att.originalFilename}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({att.fileCategory}, {formatFileSize(att.fileSize)})
                            </Typography>
                          </Stack>
                        }
                      />
                    ))}
                  </Stack>
                </Paper>

                {cumulativeAttachmentsSize > 0 && (
                  <Typography
                    variant="caption"
                    color={isSizeOverLimit ? 'error.main' : 'text.secondary'}
                    display="block"
                    sx={{ mt: 0.5, fontWeight: isSizeOverLimit ? 600 : 400 }}
                  >
                    Supporting attachments size: {formatFileSize(cumulativeAttachmentsSize)} / 20 MB limit
                  </Typography>
                )}
              </Box>
            )}

            {isSizeOverLimit && (
              <Alert severity="error">
                Total email attachment size exceeds 20 MB limit. Please uncheck some supporting attachments before sending.
              </Alert>
            )}
          </Stack>
      </Box>
    </AppDialog>
  );
}
