import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { EmptyState } from '@shared/components/common/EmptyState';
import { formatExactDecimal } from '@shared/localization/presentation';
import { paths } from '@shared/routing/paths';
import { AppButton, AppIconButton } from '@shared/ui/actions';
import { DetailSection } from '@shared/ui/layout';
import { RecordTable } from '@shared/ui/tables';
import { QuotationStatusChip } from '@features/quotations';
import type { RecentQuotationDto } from '../model/dashboard.types';

type RecentQuotationsSectionProps = {
  recentQuotations: RecentQuotationDto[];
  currency?: string;
};

export function RecentQuotationsSection({ recentQuotations, currency = 'INR' }: RecentQuotationsSectionProps) {
  return <DetailSection
    title="Recent quotations"
    description="Up to 8 newest quotations created in the selected period. Sorting changes only the recent quotations shown here; amounts retain their original currency."
    actions={<AppButton component={RouterLink} to={paths.quotations} size="small" color="primary">View all quotations</AppButton>}
  >
    {recentQuotations.length === 0 ? <EmptyState title="No recent quotations" description="There are no quotations created in the selected period." /> : <RecordTable rows={recentQuotations} label="Recent quotations in the selected period" rowKey={(quotation) => quotation.id} columns={[
      { key: 'number', label: 'Quotation number', minWidth: 240, sortValue: (quotation) => quotation.quotationNumber, render: (quotation) => <Typography variant="body2" fontWeight={700} component={RouterLink} to={`${paths.quotations}/${quotation.id}`} sx={{ color: 'primary.main', textDecoration: 'none', overflowWrap: 'anywhere' }}>{quotation.quotationNumber}</Typography> },
      { key: 'customer', label: 'Customer', sortValue: (quotation) => quotation.companySnapshotName, render: (quotation) => quotation.companySnapshotName },
      { key: 'date', label: 'Quotation date', sortValue: (quotation) => quotation.quotationDate, render: (quotation) => new Date(quotation.quotationDate).toLocaleDateString() },
      { key: 'status', label: 'Status', sortValue: (quotation) => quotation.status, render: (quotation) => <QuotationStatusChip status={quotation.status} size="small" /> },
      { key: 'total', label: 'Grand total', minWidth: 180, align: 'right', sortValue: (quotation) => quotation.grandTotal, render: (quotation) => <Typography variant="body2" fontWeight={700}>{quotation.currency || currency} {formatExactDecimal(quotation.grandTotal, 'en-IN')}</Typography> },
      { key: 'actions', label: 'Actions', align: 'center', render: (quotation) => <AppIconButton component={RouterLink} to={`${paths.quotations}/${quotation.id}`} size="small" color="primary" label={`View ${quotation.quotationNumber}`}><VisibilityOutlinedIcon fontSize="small" /></AppIconButton> },
    ]} />}
  </DetailSection>;
}
