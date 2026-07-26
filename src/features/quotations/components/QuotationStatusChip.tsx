import Chip from '@mui/material/Chip';

import type { QuotationStatus } from '../quotations.types';
import { formatQuotationStatusLabel, getQuotationStatusChipColor } from '../quotations.utils';

type QuotationStatusChipProps = {
  status: QuotationStatus;
  size?: 'small' | 'medium';
};

export function QuotationStatusChip({ status, size = 'small' }: QuotationStatusChipProps) {
  return (
    <Chip
      label={formatQuotationStatusLabel(status)}
      color={getQuotationStatusChipColor(status)}
      size={size}
      variant="filled"
      sx={{ fontWeight: 600 }}
    />
  );
}
