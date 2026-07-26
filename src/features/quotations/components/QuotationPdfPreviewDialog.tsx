import CloseIcon from '@mui/icons-material/Close';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" fullScreen={fullScreen}>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          Quotation PDF Preview — {quotationNumber}
        </Typography>
        <IconButton aria-label="close" onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, height: { xs: 'calc(100vh - 120px)', md: '75vh' }, display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4, gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="text.secondary">
              Generating PDF document for quotation {quotationNumber}...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, flexGrow: 1 }}>
            <Alert severity="error">{error}</Alert>
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
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <Button
          onClick={onDownload}
          variant="contained"
          color="primary"
          startIcon={<DownloadOutlinedIcon />}
          disabled={isLoading || !pdfBlob}
        >
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
