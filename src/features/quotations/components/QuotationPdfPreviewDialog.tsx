import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import { AppButton } from '@shared/ui/actions';
import { AppDialog } from '@shared/ui/dialogs';
import { InlineLoader, ServerErrorAlert } from '@shared/ui/feedback';

type QuotationPdfPreviewDialogProps = {
  open: boolean;
  quotationNumber: string;
  pdfBlob: Blob | null;
  isLoading?: boolean;
  error?: string | null;
  onClose: () => void;
  onDownload: () => void;
};

export function QuotationPdfPreviewDialog({
  open,
  quotationNumber,
  pdfBlob,
  isLoading = false,
  error = null,
  onClose,
  onDownload,
}: QuotationPdfPreviewDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    } else {
      setObjectUrl(null);
    }
  }, [pdfBlob]);

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      preventClose={isLoading}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      aria-busy={isLoading}
      showCloseButton
      closeButtonLabel="Close PDF preview"
      title={
        <Typography variant="h6" fontWeight={700}>
          Quotation PDF Preview — {quotationNumber}
        </Typography>
      }
      titleProps={{ sx: { m: 0, p: 2 } }}
      contentDividers
      contentProps={{ sx: { p: 0, height: { xs: 'calc(100vh - 120px)', md: '75vh' }, display: 'flex', flexDirection: 'column' } }}
      actionsProps={{ sx: { p: 2 } }}
      actions={
        <>
          <AppButton onClick={onClose} color="inherit" disabled={isLoading}>
            Close
          </AppButton>
          <AppButton
            onClick={onDownload}
            variant="contained"
            color="primary"
            startIcon={<DownloadOutlinedIcon />}
            disabled={isLoading || !pdfBlob}
          >
            Download PDF
          </AppButton>
        </>
      }
    >
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4, gap: 2 }}>
            <InlineLoader size={40} label={`Generating PDF document for quotation ${quotationNumber}...`} direction="column" />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, flexGrow: 1 }}>
            <ServerErrorAlert message={error} />
          </Box>
        ) : objectUrl ? (
          <Box sx={{ width: '100%', height: '100%', border: 'none', bgcolor: 'grey.100' }}>
            <iframe
              src={objectUrl}
              title={`PDF Preview for ${quotationNumber}`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', flexGrow: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No PDF content available. Click Download to fetch the PDF document.
            </Typography>
          </Box>
        )}
    </AppDialog>
  );
}
